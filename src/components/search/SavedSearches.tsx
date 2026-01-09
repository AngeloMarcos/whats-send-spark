import { useState } from 'react';
import { ChevronDown, Folder, Trash2, Play, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PesquisaSalva } from '@/hooks/useSavedSearches';

interface SavedSearchesProps {
  searches: PesquisaSalva[];
  isLoading: boolean;
  onLoad: (search: PesquisaSalva) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function SavedSearches({ searches, isLoading, onLoad, onDelete }: SavedSearchesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    await onDelete(deleteId);
    setIsDeleting(false);
    setDeleteId(null);
  };

  if (searches.length === 0 && !isLoading) {
    return null;
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Minhas pesquisas salvas
              <Badge variant="secondary" className="ml-2">
                {searches.length}
              </Badge>
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="border rounded-md divide-y">
            {searches.map(search => (
              <div
                key={search.id}
                className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <h4 className="font-medium text-sm truncate">{search.nome}</h4>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(search.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                    {search.total_resultados > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {search.total_resultados} resultados
                      </Badge>
                    )}
                  </div>
                  {search.descricao && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {search.descricao}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLoad(search)}
                    title="Carregar pesquisa"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(search.id)}
                    title="Excluir pesquisa"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pesquisa salva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A pesquisa será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
