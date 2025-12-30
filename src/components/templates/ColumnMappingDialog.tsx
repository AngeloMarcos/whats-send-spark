import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { suggestMapping, processMessage } from '@/lib/templateVariables';
import { CheckCircle, AlertTriangle, ArrowRight, Link2 } from 'lucide-react';

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateContent: string;
  templateVariables: string[];
  columns: string[];
  contacts: Array<Record<string, unknown>>;
  onApplyMapping: (mapping: Record<string, string>) => void;
}

export function ColumnMappingDialog({
  open,
  onOpenChange,
  templateContent,
  templateVariables,
  columns,
  contacts,
  onApplyMapping,
}: ColumnMappingDialogProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Auto-suggest mappings on open
  useEffect(() => {
    if (open && templateVariables.length > 0) {
      const suggestedMapping: Record<string, string> = {};
      templateVariables.forEach((variable) => {
        const suggested = suggestMapping(variable, columns);
        if (suggested) {
          suggestedMapping[variable] = suggested;
        }
      });
      setMapping(suggestedMapping);
    }
  }, [open, templateVariables, columns]);

  // Count mapped/unmapped variables
  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const unmappedCount = templateVariables.length - mappedCount;

  // Generate previews with first 3 contacts
  const previews = useMemo(() => {
    return contacts.slice(0, 3).map((contact, index) => {
      // Build contact object with mapped columns
      const mappedContact: Record<string, unknown> = {};
      Object.entries(mapping).forEach(([variable, column]) => {
        if (column && contact[column] !== undefined) {
          mappedContact[variable] = contact[column];
        }
      });
      // Add unmapped values as fallback
      Object.entries(contact).forEach(([key, value]) => {
        if (!mappedContact[key.toLowerCase()]) {
          mappedContact[key.toLowerCase()] = value;
        }
      });
      
      return {
        index: index + 1,
        preview: processMessage(templateContent, mappedContact as { name?: string; phone?: string }),
        contact,
      };
    });
  }, [contacts, mapping, templateContent]);

  const handleApply = () => {
    onApplyMapping(mapping);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Mapeamento de Variáveis
          </DialogTitle>
          <DialogDescription>
            Conecte as variáveis do template com as colunas do seu arquivo Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Alert */}
          {unmappedCount > 0 ? (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {unmappedCount} variáve{unmappedCount > 1 ? 'is não mapeadas' : 'l não mapeada'}. 
                Selecione as colunas correspondentes abaixo.
              </AlertDescription>
            </Alert>
          ) : templateVariables.length > 0 ? (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Todas as variáveis foram mapeadas automaticamente!
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Mapping Table */}
          <div className="space-y-3">
            {templateVariables.map((variable) => (
              <div 
                key={variable} 
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <Badge variant="secondary" className="font-mono text-sm">
                  {`{{${variable}}}`}
                </Badge>
                
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                
                <Select
                  value={mapping[variable] || ''}
                  onValueChange={(value) => setMapping({ ...mapping, [variable]: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar coluna..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não mapear</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {mapping[variable] ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Preview Section */}
          {previews.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="text-sm font-medium mb-3">
                  Preview com primeiros {previews.length} contatos:
                </h4>
                <div className="space-y-2">
                  {previews.map((item) => (
                    <div 
                      key={item.index} 
                      className="p-3 rounded-md bg-muted/50 text-sm"
                    >
                      <span className="font-medium text-muted-foreground mr-2">
                        {item.index}.
                      </span>
                      <span className="whitespace-pre-wrap line-clamp-2">
                        "{item.preview}"
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            Aplicar Mapeamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
