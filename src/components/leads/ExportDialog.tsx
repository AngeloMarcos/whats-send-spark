import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { LeadCapturado, ExportOptions } from '@/types/leadCapture';
import { EXPORT_FIELDS } from '@/types/leadCapture';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadCapturado[];
}

export function ExportDialog({ open, onOpenChange, leads }: ExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [separator, setSeparator] = useState(';');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'cnpj', 'razao_social', 'telefone', 'whatsapp_link', 'email', 'municipio', 'uf'
  ]);
  const [massFormat, setMassFormat] = useState(false);
  const [onlyCelulares, setOnlyCelulares] = useState(false);
  const [includeHeader, setIncludeHeader] = useState(true);

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const generateCSV = (): string => {
    const rows: string[][] = [];
    
    if (massFormat) {
      // Formato simplificado para disparo em massa
      if (includeHeader) {
        rows.push(['telefone', 'nome_empresa', 'whatsapp_link']);
      }
      
      leads.forEach(lead => {
        const phones = onlyCelulares 
          ? lead.telefones.filter(p => p.type === 'celular')
          : lead.telefones;
          
        phones.forEach(phone => {
          if (phone.isValid) {
            rows.push([
              phone.international,
              lead.razao_social,
              phone.whatsappApiLink,
            ]);
          }
        });
      });
    } else {
      // Formato completo
      if (includeHeader) {
        rows.push(selectedFields.map(f => 
          EXPORT_FIELDS.find(ef => ef.key === f)?.label || f
        ));
      }
      
      leads.forEach(lead => {
        const phones = onlyCelulares 
          ? lead.telefones.filter(p => p.type === 'celular')
          : lead.telefones;
        
        // One row per phone
        if (phones.length > 0) {
          phones.forEach(phone => {
            const row = selectedFields.map(field => {
              switch (field) {
                case 'telefone': return phone.formatted;
                case 'tipo_telefone': return phone.type;
                case 'whatsapp_link': return phone.whatsappApiLink;
                case 'endereco': return lead.endereco || '';
                default: return String((lead as unknown as Record<string, unknown>)[field] || '');
              }
            });
            rows.push(row);
          });
        } else {
          // Include lead even without phones
          const row = selectedFields.map(field => {
            if (['telefone', 'tipo_telefone', 'whatsapp_link'].includes(field)) {
              return '';
            }
            if (field === 'endereco') return lead.endereco || '';
            return String((lead as unknown as Record<string, unknown>)[field] || '');
          });
          rows.push(row);
        }
      });
    }
    
    return rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(separator)
    ).join('\n');
  };

  const handleExport = () => {
    try {
      const csv = generateCSV();
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`${leads.length} leads exportados com sucesso!`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const totalPhones = leads.reduce((acc, lead) => {
    const phones = onlyCelulares 
      ? lead.telefones.filter(p => p.type === 'celular')
      : lead.telefones;
    return acc + phones.filter(p => p.isValid).length;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Leads
          </DialogTitle>
          <DialogDescription>
            {leads.length} leads selecionados • {totalPhones} telefones
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'csv' | 'excel')}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex items-center gap-1.5 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    CSV
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="excel" disabled />
                  <Label htmlFor="excel" className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (em breve)
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Quick Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="mass-format" className="cursor-pointer">
                Formato Disparo em Massa
              </Label>
              <Switch
                id="mass-format"
                checked={massFormat}
                onCheckedChange={setMassFormat}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {massFormat 
                ? 'Exporta: telefone | nome_empresa | whatsapp_link'
                : 'Exporta campos selecionados abaixo'}
            </p>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="only-celulares" className="cursor-pointer">
                Apenas Celulares (WhatsApp)
              </Label>
              <Switch
                id="only-celulares"
                checked={onlyCelulares}
                onCheckedChange={setOnlyCelulares}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="include-header" className="cursor-pointer">
                Incluir Cabeçalho
              </Label>
              <Switch
                id="include-header"
                checked={includeHeader}
                onCheckedChange={setIncludeHeader}
              />
            </div>
          </div>

          {/* Field Selection (only when not mass format) */}
          {!massFormat && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Campos a Exportar</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {EXPORT_FIELDS.map(field => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.key}
                        checked={selectedFields.includes(field.key)}
                        onCheckedChange={() => toggleField(field.key)}
                      />
                      <Label htmlFor={field.key} className="text-sm cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Separator Selection */}
          <div className="space-y-2">
            <Label>Separador CSV</Label>
            <RadioGroup value={separator} onValueChange={setSeparator} className="flex gap-4">
              {[
                { value: ';', label: 'Ponto-vírgula (;)' },
                { value: ',', label: 'Vírgula (,)' },
                { value: '\t', label: 'Tab' },
              ].map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`sep-${opt.value}`} />
                  <Label htmlFor={`sep-${opt.value}`} className="text-sm cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
