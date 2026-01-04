import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Wrench, X, Loader2 } from 'lucide-react';
import { 
  validateContacts, 
  applyAutoCorrection, 
  formatToInternational,
  PhoneValidationResult 
} from '@/lib/phoneValidation';

interface ListUploadProps {
  onDataReady: (data: {
    contacts: ParsedContact[];
    phoneColumn: string;
    nameColumn: string;
  }) => void;
  onClear: () => void;
}

export interface ParsedContact {
  phone: string;
  name?: string;
  extra_data: Record<string, unknown>;
  is_valid: boolean;
}

export function ListUpload({ onDataReady, onClear }: ListUploadProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [phoneColumn, setPhoneColumn] = useState('');
  const [nameColumn, setNameColumn] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [validationResult, setValidationResult] = useState<PhoneValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback((file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          setIsProcessing(false);
          return;
        }

        const extractedHeaders = Object.keys(jsonData[0] as object);
        setHeaders(extractedHeaders);
        setRows(jsonData as Record<string, unknown>[]);
        setFileName(file.name);

        // Auto-detect phone column
        const phoneKeywords = ['phone', 'telefone', 'whatsapp', 'celular', 'numero', 'número', 'fone', 'tel'];
        const detectedPhone = extractedHeaders.find(h => 
          phoneKeywords.some(k => h.toLowerCase().includes(k))
        );
        if (detectedPhone) setPhoneColumn(detectedPhone);

        // Auto-detect name column
        const nameKeywords = ['name', 'nome', 'cliente', 'contato', 'razao', 'razão'];
        const detectedName = extractedHeaders.find(h => 
          nameKeywords.some(k => h.toLowerCase().includes(k))
        );
        if (detectedName) setNameColumn(detectedName);
      } catch (error) {
        console.error('Error parsing file:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // Validate when phone column changes
  const handlePhoneColumnChange = (value: string) => {
    setPhoneColumn(value);
    if (value && rows.length > 0) {
      const result = validateContacts(rows, value);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  };

  const handleAutoCorrect = () => {
    if (!phoneColumn) return;
    const corrected = applyAutoCorrection(rows, phoneColumn);
    setRows(corrected);
    const result = validateContacts(corrected, phoneColumn);
    setValidationResult(result);
  };

  const handleRemoveInvalid = () => {
    if (!validationResult) return;
    setRows(validationResult.validContacts);
    const result = validateContacts(validationResult.validContacts, phoneColumn);
    setValidationResult(result);
  };

  const handleClear = () => {
    setRows([]);
    setHeaders([]);
    setPhoneColumn('');
    setNameColumn('');
    setFileName('');
    setValidationResult(null);
    onClear();
  };

  // Auto-sync data when phone column is selected
  useEffect(() => {
    if (!phoneColumn || rows.length === 0) return;
    
    const contacts: ParsedContact[] = rows.map((row, index) => {
      const phone = formatToInternational(String(row[phoneColumn] ?? ''));
      const name = nameColumn ? String(row[nameColumn] ?? '') : undefined;
      
      const extra_data: Record<string, unknown> = {};
      headers.forEach(h => {
        if (h !== phoneColumn && h !== nameColumn) {
          extra_data[h] = row[h];
        }
      });

      return {
        phone,
        name: name || undefined,
        extra_data,
        is_valid: validationResult?.validContacts.some(
          vc => String(vc[phoneColumn]) === String(row[phoneColumn])
        ) ?? true,
      };
    });

    const validContacts = contacts.filter(c => c.is_valid);
    onDataReady({ contacts: validContacts, phoneColumn, nameColumn });
  }, [rows, phoneColumn, nameColumn, headers, validationResult, onDataReady]);

  const validCount = validationResult?.summary.validCount ?? rows.length;
  const invalidCount = validationResult?.summary.invalidCount ?? 0;
  const fixableCount = validationResult?.summary.fixableCount ?? 0;


  if (rows.length === 0) {
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Processando arquivo...</p>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              Arraste um arquivo Excel ou CSV aqui
            </p>
            <p className="text-xs text-muted-foreground mb-4">ou</p>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button type="button" variant="outline" asChild>
                <span>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Selecionar Arquivo
                </span>
              </Button>
            </Label>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* File info */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <span className="font-medium">{fileName}</span>
          <Badge variant="secondary">{rows.length} contatos</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Column mapping */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Coluna do Telefone *</Label>
          <Select value={phoneColumn} onValueChange={handlePhoneColumnChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {headers.map(h => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Coluna do Nome</Label>
          <Select value={nameColumn || "none"} onValueChange={(v) => setNameColumn(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {headers.map(h => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Validation summary */}
      {validationResult && phoneColumn && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            {validCount} válidos
          </Badge>
          {fixableCount > 0 && (
            <Badge variant="secondary" className="gap-1 bg-yellow-600 text-white">
              <Wrench className="h-3 w-3" />
              {fixableCount} corrigíveis
            </Badge>
          )}
          {invalidCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {invalidCount - fixableCount} inválidos
            </Badge>
          )}
          
          <div className="flex-1" />
          
          {fixableCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleAutoCorrect}>
              <Wrench className="mr-1 h-3 w-3" />
              Corrigir
            </Button>
          )}
          {invalidCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleRemoveInvalid}>
              <X className="mr-1 h-3 w-3" />
              Remover Inválidos
            </Button>
          )}
        </div>
      )}

      {/* Preview table */}
      <div className="border rounded-lg">
        <ScrollArea className="h-48">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.slice(0, 4).map(h => (
                  <TableHead 
                    key={h} 
                    className={
                      h === phoneColumn ? 'bg-primary/10' : 
                      h === nameColumn ? 'bg-blue-500/10' : ''
                    }
                  >
                    {h}
                    {h === phoneColumn && <span className="ml-1 text-xs">(Tel)</span>}
                    {h === nameColumn && <span className="ml-1 text-xs">(Nome)</span>}
                  </TableHead>
                ))}
                {headers.length > 4 && <TableHead>+{headers.length - 4} cols</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 5).map((row, rowIndex) => (
                <TableRow key={`row-${rowIndex}-${String(row[phoneColumn] ?? rowIndex)}`}>
                  {headers.slice(0, 4).map((h, colIndex) => (
                    <TableCell 
                      key={`cell-${rowIndex}-${colIndex}`} 
                      className={
                        h === phoneColumn ? 'bg-primary/5 font-mono text-sm' : 
                        h === nameColumn ? 'bg-blue-500/5' : ''
                      }
                    >
                      {String(row[h] ?? '')}
                    </TableCell>
                  ))}
                  {headers.length > 4 && <TableCell>...</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        {rows.length > 5 && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t">
            Mostrando 5 de {rows.length} contatos
          </div>
        )}
      </div>

      {/* Info about extra fields */}
      {headers.length > 2 && (
        <Alert>
          <AlertDescription className="text-sm">
            Todos os campos extras ({headers.length - 2} colunas) serão salvos junto com cada contato.
          </AlertDescription>
        </Alert>
      )}

    </div>
  );
}
