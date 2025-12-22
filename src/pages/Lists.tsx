import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { List } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Trash2, Edit, FileSpreadsheet } from 'lucide-react';

export default function Lists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sheet_id: '',
    sheet_tab_id: '',
    description: '',
    contact_count: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) fetchLists();
  }, [user]);

  const fetchLists = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setLists(data as List[]);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      if (editingList) {
        const { error } = await supabase
          .from('lists')
          .update({
            name: formData.name,
            sheet_id: formData.sheet_id,
            sheet_tab_id: formData.sheet_tab_id || null,
            description: formData.description || null,
            contact_count: formData.contact_count,
          })
          .eq('id', editingList.id);

        if (error) throw error;
        toast({ title: 'Lista atualizada com sucesso!' });
      } else {
        const { error } = await supabase.from('lists').insert({
          user_id: user.id,
          name: formData.name,
          sheet_id: formData.sheet_id,
          sheet_tab_id: formData.sheet_tab_id || null,
          description: formData.description || null,
          contact_count: formData.contact_count,
        });

        if (error) throw error;
        toast({ title: 'Lista criada com sucesso!' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchLists();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar lista',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('lists').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir lista', variant: 'destructive' });
    } else {
      toast({ title: 'Lista excluída com sucesso!' });
      fetchLists();
    }
  };

  const handleEdit = (list: List) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      sheet_id: list.sheet_id,
      sheet_tab_id: list.sheet_tab_id || '',
      description: list.description || '',
      contact_count: list.contact_count,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingList(null);
    setFormData({ name: '', sheet_id: '', sheet_tab_id: '', description: '', contact_count: 0 });
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Listas de Contatos" 
        description="Gerencie suas listas de contatos do Google Sheets"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Suas Listas</h2>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Lista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingList ? 'Editar Lista' : 'Nova Lista'}</DialogTitle>
                <DialogDescription>
                  Configure os dados da sua planilha do Google Sheets
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Lista</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Clientes VIP"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sheet_id">Sheet ID</Label>
                  <Input
                    id="sheet_id"
                    value={formData.sheet_id}
                    onChange={(e) => setFormData({ ...formData, sheet_id: e.target.value })}
                    placeholder="ID da planilha do Google Sheets"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sheet_tab_id">Nome da Aba (opcional)</Label>
                  <Input
                    id="sheet_tab_id"
                    value={formData.sheet_tab_id}
                    onChange={(e) => setFormData({ ...formData, sheet_tab_id: e.target.value })}
                    placeholder="Ex: Sheet1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_count">Quantidade de Contatos</Label>
                  <Input
                    id="contact_count"
                    type="number"
                    value={formData.contact_count}
                    onChange={(e) => setFormData({ ...formData, contact_count: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da lista..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : editingList ? 'Atualizar' : 'Criar Lista'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : lists.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma lista cadastrada</p>
              <p className="text-sm text-muted-foreground">Crie sua primeira lista de contatos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <Card key={list.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      <CardDescription>{list.contact_count} contatos</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(list)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(list.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium">Sheet ID:</span> {list.sheet_id.slice(0, 20)}...</p>
                    {list.sheet_tab_id && <p><span className="font-medium">Aba:</span> {list.sheet_tab_id}</p>}
                    {list.description && <p className="mt-2">{list.description}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}