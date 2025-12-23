import { useState, useEffect, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Trash2, Edit, Upload, Users, Eye, CheckCircle2, Search, X, CheckCircle, AlertCircle, ArrowUpDown } from 'lucide-react';
import { ListUpload, ParsedContact } from '@/components/lists/ListUpload';

export default function Lists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Upload state
  const [uploadedContacts, setUploadedContacts] = useState<ParsedContact[]>([]);
  const [hasUploadedFile, setHasUploadedFile] = useState(false);
  
  // Contacts viewer state
  const [viewingList, setViewingList] = useState<List | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'invalid'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'phone' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtered and sorted contacts
  const filteredContacts = useMemo(() => {
    return contacts
      .filter(contact => {
        // Text search filter
        const matchesSearch = 
          !searchTerm ||
          contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.phone.includes(searchTerm);
        
        // Status filter
        const matchesStatus = 
          filterStatus === 'all' ||
          (filterStatus === 'valid' && contact.is_valid !== false) ||
          (filterStatus === 'invalid' && contact.is_valid === false);
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = (a.name || '').localeCompare(b.name || '');
        } else if (sortBy === 'phone') {
          comparison = a.phone.localeCompare(b.phone);
        } else {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [contacts, searchTerm, filterStatus, sortBy, sortOrder]);

  const validCount = contacts.filter(c => c.is_valid !== false).length;
  const invalidCount = contacts.filter(c => c.is_valid === false).length;
  const hasActiveFilters = searchTerm || filterStatus !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setSortBy('name');
    setSortOrder('asc');
  };
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
    resetFilters();
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
        await fetchLists();
      }
    }
  };

  const handleDataReady = (data: { contacts: ParsedContact[] }) => {
    setUploadedContacts(data.contacts);
    setHasUploadedFile(true);
  };

  const handleClearUpload = () => {
    setUploadedContacts([]);
    setHasUploadedFile(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      if (editingList) {
        // Editing existing list - only update name/description
        const { error } = await supabase
          .from('lists')
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq('id', editingList.id);

        if (error) throw error;
        toast({ title: 'Lista atualizada com sucesso!' });
      } else {
        // Creating new list with uploaded contacts
        if (!hasUploadedFile || uploadedContacts.length === 0) {
          toast({ 
            title: 'Arquivo necessário', 
            description: 'Faça upload de uma planilha com contatos',
            variant: 'destructive' 
          });
          setIsSaving(false);
          return;
        }

        // 1. Create the list
        const { data: newList, error: listError } = await supabase
          .from('lists')
          .insert({
            user_id: user.id,
            name: formData.name,
            list_type: 'local',
            description: formData.description || null,
            contact_count: 0, // Will be updated by trigger
          })
          .select()
          .single();

        if (listError) throw listError;

        // 2. Insert contacts in batches
        const BATCH_SIZE = 100;
        let insertedCount = 0;

        for (let i = 0; i < uploadedContacts.length; i += BATCH_SIZE) {
          const batch = uploadedContacts.slice(i, i + BATCH_SIZE).map(c => ({
            user_id: user.id,
            list_id: newList.id,
            phone: c.phone,
            name: c.name || null,
            extra_data: c.extra_data as unknown as Record<string, never>,
            is_valid: c.is_valid,
          }));

          const { error: contactsError } = await supabase
            .from('contacts')
            .insert(batch);

          if (contactsError) {
            console.error('Batch insert error:', contactsError);
            // Continue with other batches
          } else {
            insertedCount += batch.length;
          }
        }

        toast({ 
          title: 'Lista criada com sucesso!',
          description: `${insertedCount} contatos importados`
        });
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
    // First delete all contacts in the list
    await supabase.from('contacts').delete().eq('list_id', id);
    
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
      description: list.description || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingList(null);
    setFormData({ name: '', description: '' });
    setUploadedContacts([]);
    setHasUploadedFile(false);
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Listas de Contatos" 
        description="Gerencie suas listas de contatos importadas"
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingList ? 'Editar Lista' : 'Nova Lista de Contatos'}</DialogTitle>
                <DialogDescription>
                  {editingList 
                    ? 'Edite os dados da sua lista de contatos'
                    : 'Importe uma planilha Excel ou CSV com seus contatos'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Lista *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Clientes VIP"
                    required
                  />
                </div>

                {/* File upload - only for new lists */}
                {!editingList && (
                  <div className="space-y-2">
                    <Label>Arquivo de Contatos *</Label>
                    <ListUpload 
                      onDataReady={handleDataReady}
                      onClear={handleClearUpload}
                    />
                  </div>
                )}

                {/* Show upload confirmation */}
                {hasUploadedFile && uploadedContacts.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      {uploadedContacts.length} contatos prontos para importar
                    </span>
                  </div>
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

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSaving || (!editingList && !hasUploadedFile)}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingList ? 'Salvando...' : 'Importando...'}
                    </>
                  ) : editingList ? (
                    'Atualizar Lista'
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Criar Lista ({uploadedContacts.length} contatos)
                    </>
                  )}
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
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma lista cadastrada</p>
              <p className="text-sm text-muted-foreground">Importe uma planilha para criar sua primeira lista</p>
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
                        <Badge variant="secondary" className="gap-1">
                          <Upload className="h-3 w-3" />
                          Local
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleViewContacts(list)}
                        title="Ver contatos"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
                  <div className="text-xs text-muted-foreground">
                    {list.description && <p>{list.description}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contacts Viewer Sheet */}
      <Sheet open={!!viewingList} onOpenChange={(open) => !open && setViewingList(null)}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {viewingList?.name}
            </SheetTitle>
            <SheetDescription className="flex items-center gap-3">
              <span>{contacts.length} contatos</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                {validCount} válidos
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-3 w-3" />
                {invalidCount} inválidos
              </span>
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-4 space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Filter Row */}
              <div className="flex flex-wrap gap-2">
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="valid">✓ Válidos</SelectItem>
                    <SelectItem value="invalid">⚠ Inválidos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[140px]">
                    <ArrowUpDown className="h-3 w-3 mr-2" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="created_at">Data</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">A-Z ↑</SelectItem>
                    <SelectItem value="desc">Z-A ↓</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Results Counter */}
              {hasActiveFilters && (
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredContacts.length} de {contacts.length} contatos
                </p>
              )}
            </div>

            {/* Contacts Table */}
            {isLoadingContacts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum contato encontrado</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum contato corresponde aos filtros</p>
                <Button variant="link" onClick={resetFilters} className="mt-2">
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-320px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="w-16 text-center">Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.name || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {contact.phone}
                        </TableCell>
                        <TableCell className="text-center">
                          {contact.is_valid !== false ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600 mx-auto" />
                          )}
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
