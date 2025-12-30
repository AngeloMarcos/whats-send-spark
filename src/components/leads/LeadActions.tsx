import { useState } from 'react';
import { Download, ListPlus, Send, Loader2 } from 'lucide-react';
import { Lead } from '@/hooks/useGooglePlaces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx';

interface LeadActionsProps {
  leads: Lead[];
  selectedLeads: Set<string>;
}

export function LeadActions({ leads, selectedLeads }: LeadActionsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [listName, setListName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const selectedItems = leads.filter(lead => selectedLeads.has(lead.place_id));
  const hasSelection = selectedItems.length > 0;

  const handleExportExcel = () => {
    if (!hasSelection) return;

    const data = selectedItems.map(lead => ({
      Nome: lead.name,
      Telefone: lead.phone,
      Endereço: lead.address,
      Categoria: lead.category,
      Avaliação: lead.rating || '',
      'Nº Avaliações': lead.reviews_count || '',
      Website: lead.website || '',
      Latitude: lead.latitude || '',
      Longitude: lead.longitude || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `leads_google_maps_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Exportado!',
      description: `${selectedItems.length} leads exportados para Excel`,
    });
  };

  const handleSaveAsList = async () => {
    if (!hasSelection || !listName.trim() || !user) return;

    setIsSaving(true);
    try {
      // Create list
      const { data: list, error: listError } = await supabase
        .from('lists')
        .insert({
          name: listName.trim(),
          description: `Leads do Google Maps - ${selectedItems.length} contatos`,
          user_id: user.id,
          list_type: 'google_maps',
          contact_count: 0,
        })
        .select()
        .single();

      if (listError) throw listError;

      // Insert contacts
      const contacts = selectedItems.map(lead => ({
        list_id: list.id,
        user_id: user.id,
        name: lead.name,
        phone: lead.phone,
        extra_data: {
          address: lead.address,
          category: lead.category,
          rating: lead.rating,
          reviews_count: lead.reviews_count,
          website: lead.website,
          latitude: lead.latitude,
          longitude: lead.longitude,
          place_id: lead.place_id,
        },
        is_valid: true,
      }));

      const { error: contactsError } = await supabase
        .from('contacts')
        .insert(contacts);

      if (contactsError) throw contactsError;

      toast({
        title: 'Lista criada!',
        description: `"${listName}" com ${selectedItems.length} contatos`,
      });

      setShowSaveDialog(false);
      setListName('');
    } catch (error) {
      console.error('Error saving list:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível criar a lista',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={handleExportExcel}
          disabled={!hasSelection}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
          {hasSelection && ` (${selectedItems.length})`}
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowSaveDialog(true)}
          disabled={!hasSelection}
        >
          <ListPlus className="mr-2 h-4 w-4" />
          Salvar como Lista
        </Button>

        <Button
          onClick={() => {
            toast({
              title: 'Em breve',
              description: 'Funcionalidade de criar campanha diretamente será implementada',
            });
          }}
          disabled={!hasSelection}
        >
          <Send className="mr-2 h-4 w-4" />
          Criar Campanha
        </Button>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como Lista</DialogTitle>
            <DialogDescription>
              Salve os {selectedItems.length} leads selecionados em uma nova lista de contatos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="listName">Nome da Lista</Label>
              <Input
                id="listName"
                placeholder="Ex: Restaurantes São Paulo"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAsList} disabled={!listName.trim() || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Lista'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
