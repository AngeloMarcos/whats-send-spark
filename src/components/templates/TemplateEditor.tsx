import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { VariableButton } from './VariableButton';
import { 
  standardVariables, 
  templateCategories, 
  extractVariables, 
  processMessage,
  getCharacterStatus,
  WHATSAPP_CHAR_LIMIT,
  IDEAL_CHAR_LIMIT,
  realisticSampleData,
  senderSampleData
} from '@/lib/templateVariables';
import { Loader2, Save, Star, Plus, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Template {
  id?: string;
  name: string;
  content: string;
  description: string;
  category: string;
  is_favorite: boolean;
  variables: string[];
}

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onSave: (template: Omit<Template, 'id'>) => Promise<void>;
  isSaving: boolean;
}

export function TemplateEditor({ open, onOpenChange, template, onSave, isSaving }: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState<Omit<Template, 'id'>>({
    name: '',
    content: '',
    description: '',
    category: 'geral',
    is_favorite: false,
    variables: [],
  });
  const [customVariable, setCustomVariable] = useState('');
  const [showAddVariable, setShowAddVariable] = useState(false);

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        content: template.content,
        description: template.description || '',
        category: template.category || 'geral',
        is_favorite: template.is_favorite || false,
        variables: template.variables || [],
      });
    } else {
      setFormData({
        name: '',
        content: '',
        description: '',
        category: 'geral',
        is_favorite: false,
        variables: [],
      });
    }
  }, [template, open]);

  // Extract variables from content
  const detectedVariables = extractVariables(formData.content);
  
  // Character counter status
  const characterStatus = getCharacterStatus(formData.content.length);
  const progressPercent = Math.min((formData.content.length / WHATSAPP_CHAR_LIMIT) * 100, 100);
  
  // Process message for preview with realistic data
  const previewMessage = processMessage(
    formData.content, 
    realisticSampleData,
    senderSampleData
  );

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const variableText = `{{${variable}}}`;

    const newText = text.slice(0, start) + variableText + text.slice(end);
    setFormData({ ...formData, content: newText });

    // Reposition cursor after variable
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variableText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Add custom variable
  const handleAddCustomVariable = () => {
    if (customVariable.trim()) {
      insertVariable(customVariable.trim().toLowerCase().replace(/\s+/g, '_'));
      setCustomVariable('');
      setShowAddVariable(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      variables: detectedVariables,
    });
  };

  // Highlight variables in content for display
  const renderHighlightedContent = () => {
    const parts = formData.content.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, i) => 
      part.match(/\{\{[^}]+\}\}/) ? (
        <span key={i} className="bg-primary/20 text-primary px-0.5 rounded">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template ? 'Editar Template' : 'Novo Template'}
            {formData.is_favorite && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
          </DialogTitle>
          <DialogDescription>
            Use {"{{variavel}}"} para inserir campos dinâmicos na mensagem
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name and Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Boas-vindas Clientes"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {templateCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="favorite"
              checked={formData.is_favorite}
              onCheckedChange={(checked) => setFormData({ ...formData, is_favorite: checked })}
            />
            <Label htmlFor="favorite" className="flex items-center gap-1 cursor-pointer">
              <Star className={`h-4 w-4 ${formData.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              Marcar como favorito
            </Label>
          </div>

          {/* Quick Variables */}
          <div className="space-y-2">
            <Label>Variáveis Rápidas</Label>
            <div className="flex flex-wrap gap-2">
              {standardVariables.map((v) => (
                <VariableButton key={v.key} variable={v} onClick={insertVariable} />
              ))}
              
              {showAddVariable ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={customVariable}
                    onChange={(e) => setCustomVariable(e.target.value)}
                    placeholder="nome_variavel"
                    className="h-8 w-32 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomVariable();
                      }
                      if (e.key === 'Escape') {
                        setShowAddVariable(false);
                        setCustomVariable('');
                      }
                    }}
                    autoFocus
                  />
                  <Button type="button" size="sm" className="h-8" onClick={handleAddCustomVariable}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddVariable(true)}
                      className="h-8 text-xs border-dashed"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Customizada
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Adicionar variável personalizada
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Editor */}
            <div className="space-y-2">
              <Label htmlFor="content">Mensagem</Label>
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Olá {{primeiro_nome}}, tudo bem?"
                  rows={10}
                  className="font-mono text-sm resize-none"
                  required
                />
              </div>
              
              {/* Smart Character Counter */}
              <div className="space-y-2">
                {/* Progress Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${characterStatus.bgColor}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${characterStatus.color}`}>
                    {formData.content.length}/{WHATSAPP_CHAR_LIMIT}
                  </span>
                </div>
                
                {/* Status Message */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {characterStatus.status === 'error' ? (
                      <span className="flex items-center gap-1 text-red-500 font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {characterStatus.message}
                      </span>
                    ) : characterStatus.status === 'warning' ? (
                      <span className="flex items-center gap-1 text-amber-500">
                        <AlertCircle className="h-3 w-3" />
                        {characterStatus.message}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="h-3 w-3" />
                        {characterStatus.message}
                      </span>
                    )}
                  </div>
                  {detectedVariables.length > 0 && (
                    <span className="flex items-center gap-1 text-primary">
                      <CheckCircle className="h-3 w-3" />
                      {detectedVariables.length} variáve{detectedVariables.length > 1 ? 'is' : 'l'}
                    </span>
                  )}
                </div>
                
                {/* Ideal limit indicator */}
                {formData.content.length > 0 && formData.content.length <= IDEAL_CHAR_LIMIT && (
                  <p className="text-xs text-muted-foreground">
                    💡 Até {IDEAL_CHAR_LIMIT} caracteres é ideal para mensagens frias
                  </p>
                )}
              </div>

              {/* Detected Variables */}
              {detectedVariables.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {detectedVariables.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview WhatsApp</Label>
              <Card className="bg-[#e5ddd5] dark:bg-[#0b141a]">
                <CardContent className="p-4 min-h-[260px]">
                  {/* WhatsApp bubble */}
                  <div className="flex justify-end">
                    <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-tl-xl rounded-tr-xl rounded-bl-xl max-w-[85%] p-3 shadow-sm relative">
                      <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-[#303030] dark:text-[#e9edef]">
                        {previewMessage || 'Digite sua mensagem...'}
                      </div>
                      <div className="text-[11px] text-[#667781] dark:text-[#8696a0] text-right mt-1 flex items-center justify-end gap-1">
                        {format(new Date(), 'HH:mm')}
                        <span className="text-[#53bdeb]">✓✓</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sample data indicator */}
                  <div className="mt-4 p-2 rounded-lg bg-white/50 dark:bg-black/20">
                    <p className="text-xs text-center text-muted-foreground mb-2">
                      📱 Dados de exemplo:
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center text-[10px]">
                      <Badge variant="outline" className="bg-white/80 dark:bg-black/30">
                        {realisticSampleData.name}
                      </Badge>
                      <Badge variant="outline" className="bg-white/80 dark:bg-black/30">
                        {realisticSampleData.cidade}
                      </Badge>
                      <Badge variant="outline" className="bg-white/80 dark:bg-black/30">
                        {realisticSampleData.segmento}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Original with highlighted variables */}
              {detectedVariables.length > 0 && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <Label className="text-xs text-muted-foreground mb-2 block">Template Original</Label>
                  <div className="whitespace-pre-wrap font-mono text-xs">
                    {renderHighlightedContent()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição breve do template..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || formData.content.length > WHATSAPP_CHAR_LIMIT}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {template ? 'Atualizar' : 'Criar Template'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
