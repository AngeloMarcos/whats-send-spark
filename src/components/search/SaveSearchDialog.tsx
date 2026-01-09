import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SaveSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (nome: string, descricao?: string) => Promise<void>;
  totalResults: number;
}

export function SaveSearchDialog({
  open,
  onOpenChange,
  onSave,
  totalResults,
}: SaveSearchDialogProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(nome.trim(), descricao.trim() || undefined);
      setNome('');
      setDescricao('');
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Salvar Pesquisa
          </DialogTitle>
          <DialogDescription>
            Salve os filtros atuais para usar novamente depois.
            {totalResults > 0 && (
              <span className="block mt-1">
                Esta pesquisa retornou {totalResults.toLocaleString('pt-BR')} resultados.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-name">Nome da pesquisa *</Label>
            <Input
              id="search-name"
              placeholder="Ex: Restaurantes em São Paulo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="search-description">Descrição (opcional)</Label>
            <Textarea
              id="search-description"
              placeholder="Adicione uma descrição para lembrar dos critérios..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!nome.trim() || isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Pesquisa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
