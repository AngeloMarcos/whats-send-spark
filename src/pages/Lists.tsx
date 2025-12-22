import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { List, Contact } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Trash2, Edit, FileSpreadsheet, Upload, Users, Eye } from 'lucide-react';

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
  
  // Contacts viewer state
  const [viewingList, setViewingList] = useState<List | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

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

  const fetchContacts = async (listId: string) => {
    setIsLoadingContacts(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    if (data) setContacts(data as Contact[]);
    setIsLoadingContacts(false);
  };

  const handleViewContacts = async (list: List) => {
    if (list.list_type !== 'local') {
      toast({
        title: 'Lista do Google Sheets',
        description: 'Esta lista é gerenciada pelo Google Sheets',
      });
      return;
    }
    setViewingList(list);
    await fetchContacts(list.id);
  };

  const handleDeleteContact = async (contactId: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) {
      toast({ title: 'Erro ao excluir contato', variant: 'destructive' });
    } else {
      toast({ title: 'Contato excluído!' });
      if (viewingList) {
        await fetchContacts(viewingList.id);
        await fetchLists(); // Refresh contact count
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      if (editingList) {
        const updateData: Record<string, unknown> = {
          name: formData.name,
          description: formData.description || null,
        };
        
        // Only update sheet fields for google_sheets type
        if (editingList.list_type === 'google_sheets') {
          updateData.sheet_id = formData.sheet_id;
          updateData.sheet_tab_id = formData.sheet_tab_id || null;
          updateData.contact_count = formData.contact_count;
        }

        const { error } = await supabase
          .from('lists')
          .update(updateData)
          .eq('id', editingList.id);

        if (error) throw error;
        toast({ title: 'Lista atualizada com sucesso!' });
      } else {
        const { error } = await supabase.from('lists').insert({
          user_id: user.id,
          name: formData.name,
          list_type: 'google_sheets',
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao salvar lista',
        description: errorMessage,
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
      sheet_id: list.sheet_id || '',
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

  const getListTypeBadge = (list: List) => {
    if (list.list_type === 'local') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Upload className="h-3 w-3" />
          Upload Local
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <FileSpreadsheet className="h-3 w-3" />
        Google Sheets
      </Badge>
    );
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Listas de Contatos" 
        description="Gerencie suas listas de contatos do Google Sheets ou importadas"
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
                Nova Lista (Sheets)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingList ? 'Editar Lista' : 'Nova Lista'}</DialogTitle>
                <DialogDescription>
                  {editingList?.list_type === 'local' 
                    ? 'Edite os dados da sua lista de contatos'
                    : 'Configure os dados da sua planilha do Google Sheets'
                  }
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
                
                {/* Only show Sheet fields for google_sheets type or new lists */}
                {(!editingList || editingList.list_type === 'google_sheets') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="sheet_id">Sheet ID</Label>
                      <Input
                        id="sheet_id"
                        value={formData.sheet_id}
                        onChange={(e) => setFormData({ ...formData, sheet_id: e.target.value })}
                        placeholder="ID da planilha do Google Sheets"
                        required={!editingList || editingList.list_type === 'google_sheets'}
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
                  </>
                )}

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
              <p className="text-sm text-muted-foreground">Crie uma lista via Google Sheets ou importe contatos em Campanhas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <Card key={list.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <CardDescription className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {list.contact_count} contatos
                        </CardDescription>
                        {getListTypeBadge(list)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {list.list_type === 'local' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleViewContacts(list)}
                          title="Ver contatos"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
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
                    {list.list_type === 'google_sheets' && list.sheet_id && (
                      <>
                        <p><span className="font-medium">Sheet ID:</span> {list.sheet_id.slice(0, 20)}...</p>
                        {list.sheet_tab_id && <p><span className="font-medium">Aba:</span> {list.sheet_tab_id}</p>}
                      </>
                    )}
                    {list.description && <p className="mt-2">{list.description}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contacts Viewer Sheet */}
      <Sheet open={!!viewingList} onOpenChange={(open) => !open && setViewingList(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {viewingList?.name}
            </SheetTitle>
            <SheetDescription>
              {viewingList?.contact_count} contatos salvos
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            {isLoadingContacts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum contato encontrado</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-200px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.name || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {contact.phone}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteContact(contact.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
