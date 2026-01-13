import { useState, useEffect } from 'react';
import { Download, ListPlus, Send, Loader2, Plus, FolderOpen, AlertCircle } from 'lucide-react';
import { Lead } from '@/hooks/useGooglePlaces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx';
import { CreateCampaignModal } from './CreateCampaignModal';

interface LeadActionsProps {
  leads: Lead[];
  selectedLeads: Set<string>;
}

interface ExistingList {
  id: string;
  name: string;
  contact_count: number | null;
}

interface DuplicateAnalysis {
  newCount: number;
  duplicateCount: number;
  duplicatePhones: string[];
}

export function LeadActions({ leads, selectedLeads }: LeadActionsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [listName, setListName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
  const [existingLists, setExistingLists] = useState<ExistingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<DuplicateAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const selectedItems = leads.filter(lead => selectedLeads.has(lead.place_id));
  const hasSelection = selectedItems.length > 0;

  // Load existing lists when dialog opens
  useEffect(() => {
    if (showSaveDialog && user) {
      loadExistingLists();
    }
  }, [showSaveDialog, user]);

  // Analyze duplicates when list selection changes
  useEffect(() => {
    if (saveMode === 'existing' && selectedListId && selectedItems.length > 0) {
      analyzeDuplicates(selectedListId);
    } else {
      setDuplicateAnalysis(null);
    }
  }, [saveMode, selectedListId, selectedItems.length]);

  const loadExistingLists = async () => {
    if (!user) return;
    setIsLoadingLists(true);
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('id, name, contact_count')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setExistingLists(data || []);
    } catch (error) {
      console.error('Error loading lists:', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const analyzeDuplicates = async (listId: string) => {
    if (!user) return;
    setIsAnalyzing(true);
    try {
      const selectedPhones = selectedItems.map(lead => lead.phone);
      
      const { data: existingContacts, error } = await supabase
        .from('contacts')
        .select('phone')
        .eq('list_id', listId)
        .in('phone', selectedPhones);

      if (error) throw error;

      const existingPhones = new Set(existingContacts?.map(c => c.phone) || []);
      const duplicatePhones = selectedPhones.filter(phone => existingPhones.has(phone));
      
      setDuplicateAnalysis({
        newCount: selectedPhones.length - duplicatePhones.length,
        duplicateCount: duplicatePhones.length,
        duplicatePhones,
      });
    } catch (error) {
      console.error('Error analyzing duplicates:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  };

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
      // CNPJ enrichment data
      CNPJ: lead.cnpj ? formatCNPJ(lead.cnpj) : '',
      'Razão Social': lead.razaoSocial || '',
      'Nome Fantasia': lead.nomeFantasia || '',
      'Email Oficial': lead.email_oficial || '',
      'Telefones Oficiais': lead.telefones_oficiais?.join(' | ') || '',
      'Situação Cadastral': lead.situacao_cadastral || '',
      'Porte Empresa': lead.porte || '',
      'Capital Social': lead.capital_social ? `R$ ${lead.capital_social.toLocaleString('pt-BR')}` : '',
      'Qtd Sócios': lead.socios?.length || 0,
      'Nomes Sócios': lead.socios?.map(s => s.nome).join(' | ') || '',
      'Qualificações Sócios': lead.socios?.map(s => s.qualificacao).join(' | ') || '',
      // Partner phones found via Google Search
      'Telefones Sócios': lead.socios?.flatMap(s => s.telefonesEncontrados || []).join(' | ') || '',
      'Fontes Telefones Sócios': lead.socios?.flatMap(s => s.fontesTelefones || []).join(' | ') || '',
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

  const handleExportCSV = () => {
    if (!hasSelection) return;

    const data = selectedItems.map(lead => ({
      Nome: lead.name,
      Telefone: lead.phone,
      Endereço: lead.address,
      Categoria: lead.category,
      Avaliação: lead.rating || '',
      'Nº Avaliações': lead.reviews_count || '',
      Website: lead.website || '',
      // CNPJ enrichment data
      CNPJ: lead.cnpj ? formatCNPJ(lead.cnpj) : '',
      'Razão Social': lead.razaoSocial || '',
      'Email Oficial': lead.email_oficial || '',
      'Telefones Oficiais': lead.telefones_oficiais?.join(' | ') || '',
      'Situação Cadastral': lead.situacao_cadastral || '',
      'Qtd Sócios': lead.socios?.length || 0,
      'Nomes Sócios': lead.socios?.map(s => s.nome).join(' | ') || '',
      // Partner phones found via Google Search
      'Telefones Sócios': lead.socios?.flatMap(s => s.telefonesEncontrados || []).join(' | ') || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_google_maps_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Exportado!',
      description: `${selectedItems.length} leads exportados para CSV`,
    });
  };

  const handleSaveAsList = async () => {
    if (!hasSelection) {
      toast({ title: 'Nenhum lead selecionado', variant: 'destructive' });
      return;
    }
    
    if (!user) {
      toast({ title: 'Você precisa estar logado', variant: 'destructive' });
      return;
    }
    
    if (saveMode === 'new' && !listName.trim()) {
      toast({ title: 'Digite um nome para a lista', variant: 'destructive' });
      return;
    }
    
    if (saveMode === 'existing' && !selectedListId) {
      toast({ title: 'Selecione uma lista', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      let listId: string;
      let finalListName: string;

      if (saveMode === 'new') {
        console.log('Creating new list:', { name: listName.trim(), user_id: user.id });
        
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

        if (listError) {
          console.error('Error creating list:', listError);
          throw new Error(`Erro ao criar lista: ${listError.message}`);
        }
        
        console.log('List created:', list);
        listId = list.id;
        finalListName = listName.trim();
      } else {
        listId = selectedListId;
        finalListName = existingLists.find(l => l.id === selectedListId)?.name || 'Lista';
      }

      // Filter out duplicates if adding to existing list
      let leadsToInsert = selectedItems;
      if (saveMode === 'existing' && duplicateAnalysis) {
        const duplicateSet = new Set(duplicateAnalysis.duplicatePhones);
        leadsToInsert = selectedItems.filter(lead => !duplicateSet.has(lead.phone));
      }

      if (leadsToInsert.length === 0) {
        toast({
          title: 'Nenhum lead novo',
          description: 'Todos os leads selecionados já existem na lista',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      // Insert contacts
      const contacts = leadsToInsert.map(lead => ({
        list_id: listId,
        user_id: user.id,
        name: lead.name,
        phone: lead.phone,
        extra_data: {
          source: 'google_maps',
          address: lead.address,
          category: lead.category,
          rating: lead.rating,
          reviews_count: lead.reviews_count,
          website: lead.website,
          latitude: lead.latitude,
          longitude: lead.longitude,
          place_id: lead.place_id,
          captured_at: new Date().toISOString(),
        },
        is_valid: true,
      }));

      console.log('Inserting contacts:', contacts.length);
      
      const { error: contactsError } = await supabase
        .from('contacts')
        .insert(contacts);

      if (contactsError) {
        console.error('Error inserting contacts:', contactsError);
        throw new Error(`Erro ao inserir contatos: ${contactsError.message}`);
      }

      console.log('Contacts inserted successfully');

      const skippedText = duplicateAnalysis?.duplicateCount 
        ? ` (${duplicateAnalysis.duplicateCount} duplicados ignorados)` 
        : '';

      toast({
        title: saveMode === 'new' ? 'Lista criada!' : 'Contatos adicionados!',
        description: `"${finalListName}" com ${leadsToInsert.length} contatos${skippedText}`,
      });

      setShowSaveDialog(false);
      setListName('');
      setSelectedListId('');
      setSaveMode('new');
      setDuplicateAnalysis(null);
    } catch (error) {
      console.error('Error saving list:', error);
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível salvar os contatos';
      toast({
        title: 'Erro ao salvar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseDialog = () => {
    setShowSaveDialog(false);
    setListName('');
    setSelectedListId('');
    setSaveMode('new');
    setDuplicateAnalysis(null);
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
          Excel
          {hasSelection && ` (${selectedItems.length})`}
        </Button>

        <Button
          variant="outline"
          onClick={handleExportCSV}
          disabled={!hasSelection}
        >
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowSaveDialog(true)}
          disabled={!hasSelection}
        >
          <ListPlus className="mr-2 h-4 w-4" />
          Adicionar à Lista
        </Button>

        <Button
          onClick={() => setShowCampaignModal(true)}
          disabled={!hasSelection}
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="mr-2 h-4 w-4" />
          Criar Campanha
          {hasSelection && ` (${selectedItems.length})`}
        </Button>
      </div>

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        open={showCampaignModal}
        onOpenChange={setShowCampaignModal}
        leads={selectedItems.filter(l => l.phone)}
        onCampaignCreated={(campaign) => {
          toast({
            title: '🚀 Campanha criada!',
            description: `Você pode acompanhar o progresso na página de Campanhas`,
          });
        }}
      />

      <Dialog open={showSaveDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>💾 Salvar {selectedItems.length} leads selecionados</DialogTitle>
            <DialogDescription>
              Escolha onde deseja salvar os contatos capturados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={saveMode} onValueChange={(v) => setSaveMode(v as 'new' | 'existing')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  Nova lista
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="flex items-center gap-2 cursor-pointer">
                  <FolderOpen className="h-4 w-4" />
                  Lista existente
                </Label>
              </div>
            </RadioGroup>

            {saveMode === 'new' ? (
              <div className="space-y-2">
                <Label htmlFor="listName">Nome da Lista</Label>
                <Input
                  id="listName"
                  placeholder="Ex: Restaurantes São Paulo"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="existingList">Selecione a Lista</Label>
                <Select 
                  value={selectedListId} 
                  onValueChange={setSelectedListId}
                  disabled={isLoadingLists}
                >
                  <SelectTrigger id="existingList">
                    <SelectValue placeholder={isLoadingLists ? 'Carregando...' : 'Selecione uma lista'} />
                  </SelectTrigger>
                  <SelectContent>
                    {existingLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.contact_count || 0} contatos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Duplicate Analysis */}
            {saveMode === 'existing' && selectedListId && (
              <div className="pt-2">
                {isAnalyzing ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando duplicatas...
                  </div>
                ) : duplicateAnalysis && (
                  <Alert variant={duplicateAnalysis.duplicateCount > 0 ? 'default' : 'default'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      📊 <strong>{duplicateAnalysis.newCount}</strong> novos contatos
                      {duplicateAnalysis.duplicateCount > 0 && (
                        <> • <strong>{duplicateAnalysis.duplicateCount}</strong> duplicados (serão ignorados)</>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAsList} 
              disabled={
                isSaving || 
                (saveMode === 'new' && !listName.trim()) || 
                (saveMode === 'existing' && !selectedListId) ||
                isAnalyzing
              }
            >
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
