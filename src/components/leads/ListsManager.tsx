import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Trash2, Download, Eye, Users, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ListaCaptura } from '@/types/leadCapture';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ListsManagerProps {
  onSelectList?: (list: ListaCaptura) => void;
}

export function ListsManager({ onSelectList }: ListsManagerProps) {
  const { user } = useAuth();
  const [lists, setLists] = useState<ListaCaptura[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchLists = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('listas_captura')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists((data || []) as ListaCaptura[]);
    } catch (error) {
      console.error('Error fetching lists:', error);
      toast.error('Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [user]);

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) {
      toast.error('Nome da lista é obrigatório');
      return;
    }

    try {
      setCreating(true);
      const { data, error } = await supabase
        .from('listas_captura')
        .insert({
          user_id: user.id,
          nome: newListName.trim(),
          descricao: newListDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setLists(prev => [data as ListaCaptura, ...prev]);
      setNewListName('');
      setNewListDescription('');
      setCreateDialogOpen(false);
      toast.success('Lista criada com sucesso!');
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Erro ao criar lista');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('listas_captura')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      setLists(prev => prev.filter(l => l.id !== listId));
      toast.success('Lista excluída');
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Erro ao excluir lista');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Minhas Listas de Captura</h3>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Lista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Lista</DialogTitle>
              <DialogDescription>
                Crie uma lista para organizar seus leads capturados
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="list-name">Nome da Lista *</Label>
                <Input
                  id="list-name"
                  placeholder="Ex: Restaurantes SP"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="list-description">Descrição</Label>
                <Textarea
                  id="list-description"
                  placeholder="Descrição opcional..."
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateList} disabled={creating}>
                {creating ? 'Criando...' : 'Criar Lista'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {lists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma lista criada</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Crie sua primeira lista para organizar os leads capturados
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Lista
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map(list => (
            <Card key={list.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  {list.nome}
                </CardTitle>
                {list.descricao && (
                  <CardDescription className="line-clamp-2">
                    {list.descricao}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {list.total_leads} leads
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {list.total_telefones} telefones
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Criada em {format(new Date(list.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onSelectList?.(list)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Lista</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a lista "{list.nome}"? 
                          Os leads associados não serão excluídos, apenas desvinculados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteList(list.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
