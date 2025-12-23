import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ContactRow } from '@/services/bulkSender';
import { useQueueDispatcher } from '@/hooks/useQueueDispatcher';
import { QueueDispatcher } from './QueueDispatcher';
import { 
  validateContacts, 
  applyAutoCorrection, 
  PhoneValidationResult,
  formatToInternational
} from '@/lib/phoneValidation';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, 
  FileSpreadsheet, 
  Send, 
  Loader2, 
  X, 
  Sparkles, 
  Wand2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Save,
  RotateCcw
} from 'lucide-react';
import { Campaign } from '@/types/database';

type SendStatus = 'idle' | 'loading' | 'success' | 'error';

interface SendResult {
  contactsSent: number;
  campaignName: string;
  n8nResponse?: {
    sent?: number;
    campaignName?: string;
    [key: string]: unknown;
  };
  error?: string;
}

interface FileUploadProps {
  onCampaignCreated: (campaign: Campaign) => void;
}

export function FileUpload({ onCampaignCreated }: FileUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [phoneColumn, setPhoneColumn] = useState<string>('');
  const [nameColumn, setNameColumn] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationResult, setValidationResult] = useState<PhoneValidationResult | null>(null);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  
  // Queue dispatcher hook
  const queueDispatcher = useQueueDispatcher();

  const [formData, setFormData] = useState({
    campaignName: '',
    message: '',
    sendNow: true,
    scheduledAt: '',
    sendLimit: '',
    useAi: false,
    aiPrompt: '',
    saveAsList: false,
    listName: '',
    useQueueMode: true, // Default to queue mode
  });

  // Validate phones whenever rows or phoneColumn changes
  useEffect(() => {
    if (rows.length > 0 && phoneColumn) {
      const result = validateContacts(rows, phoneColumn);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [rows, phoneColumn]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      try {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: ContactRow[] = XLSX.utils.sheet_to_json(sheet);

        setRows(json);
        const cols = json.length > 0 ? Object.keys(json[0]) : [];
        setHeaders(cols);
        
        if (cols.length) {
          const phoneCol = cols.find((c) => 
            c.toLowerCase().includes('phone') || 
            c.toLowerCase().includes('telefone') ||
            c.toLowerCase().includes('whatsapp') ||
            c.toLowerCase().includes('celular')
          ) || cols[0];
          
          const nameCol = cols.find((c) => 
            c.toLowerCase().includes('nome') || 
            c.toLowerCase().includes('name')
          ) || '';
          
          setPhoneColumn(phoneCol);
          setNameColumn(nameCol);
        }

        toast({
          title: 'Arquivo importado',
          description: `${json.length} contatos encontrados`,
        });
      } catch (error) {
        toast({
          title: 'Erro ao ler arquivo',
          description: 'Verifique se o arquivo é um Excel ou CSV válido',
          variant: 'destructive',
        });
      }
    };

    reader.readAsBinaryString(file);
  }, [toast]);

  const clearFile = () => {
    setRows([]);
    setHeaders([]);
    setPhoneColumn('');
    setNameColumn('');
    setFileName('');
    setValidationResult(null);
  };

  const resetForm = () => {
    clearFile();
    setFormData({
      campaignName: '',
      message: '',
      sendNow: true,
      scheduledAt: '',
      sendLimit: '',
      useAi: false,
      aiPrompt: '',
      saveAsList: false,
      listName: '',
      useQueueMode: true,
    });
    setSendStatus('idle');
    setSendResult(null);
    queueDispatcher.reset();
  };

  const handleAutoCorrect = () => {
    if (!phoneColumn || rows.length === 0) return;
    
    const correctedRows = applyAutoCorrection(rows, phoneColumn) as ContactRow[];
    setRows(correctedRows);
    
    toast({
      title: 'Números corrigidos',
      description: 'Os números foram formatados para o padrão WhatsApp Brasil',
    });
  };

  const handleRemoveInvalid = () => {
    if (!validationResult) return;
    
    const validRows = validationResult.validContacts as ContactRow[];
    setRows(validRows);
    
    toast({
      title: 'Contatos inválidos removidos',
      description: `${validationResult.summary.invalidCount} contatos foram removidos`,
    });
  };

  const generateAIMessage = async () => {
    if (!formData.aiPrompt.trim()) {
      toast({
        title: 'Descreva a mensagem',
        description: 'Digite o que você quer que a IA escreva',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-message', {
        body: { prompt: formData.aiPrompt },
      });

      if (error) throw error;

      if (data?.message) {
        setFormData({ ...formData, message: data.message, useAi: false });
        toast({ title: 'Mensagem gerada com sucesso!' });
      } else {
        toast({
          title: 'Erro ao gerar mensagem',
          description: 'Resposta inválida do servidor. Tente novamente.',
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao gerar mensagem',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartQueueDispatch = async (intervalMinutes: number) => {
    if (!user) return;

    setIsSubmitting(true);
    setSendStatus('loading');

    try {
      // Get only valid contacts
      const contactsToSend = validationResult 
        ? validationResult.validContacts 
        : rows;

      // Normalize contacts with formatted phone numbers
      const normalizedContacts: ContactRow[] = contactsToSend.map((row) => {
        const phone = String(row[phoneColumn] ?? '');
        const formattedPhone = formatToInternational(phone);
        
        return {
          name: nameColumn ? String(row[nameColumn] ?? '') : '',
          phone: formattedPhone,
          ...row,
          [phoneColumn]: formattedPhone,
        };
      });

      const sendLimit = formData.sendLimit ? parseInt(formData.sendLimit) : null;
      const contactsToProcess = sendLimit 
        ? normalizedContacts.slice(0, sendLimit) 
        : normalizedContacts;

      let listId: string | null = null;

      // Save contacts as a new list if requested
      if (formData.saveAsList && formData.listName.trim()) {
        const { data: newList, error: listError } = await supabase
          .from('lists')
          .insert({
            user_id: user.id,
            name: formData.listName.trim(),
            list_type: 'local',
            sheet_id: null,
            contact_count: 0,
          })
          .select()
          .single();

        if (listError) throw listError;
        listId = newList.id;

        const contactsToInsert = normalizedContacts.map((contact) => ({
          user_id: user.id,
          list_id: newList.id,
          name: contact.name || null,
          phone: String(contact.phone),
          email: null,
          extra_data: contact,
          is_valid: true,
        }));

        const chunkSize = 100;
        for (let i = 0; i < contactsToInsert.length; i += chunkSize) {
          const chunk = contactsToInsert.slice(i, i + chunkSize);
          const { error: contactsError } = await supabase
            .from('contacts')
            .insert(chunk);
          if (contactsError) throw contactsError;
        }

        toast({
          title: 'Lista salva!',
          description: `${contactsToInsert.length} contatos salvos na lista "${formData.listName}"`,
        });
      }

      // Create campaign in database
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: formData.campaignName,
          message: formData.message,
          list_id: listId,
          status: 'sending',
          send_now: true,
          scheduled_at: null,
          send_limit: sendLimit,
          contacts_total: contactsToProcess.length,
          send_interval_minutes: intervalMinutes,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Initialize queue dispatcher
      const success = await queueDispatcher.initializeQueue(
        campaign.id,
        contactsToProcess,
        intervalMinutes
      );

      if (success) {
        setSendStatus('success');
        onCampaignCreated(campaign as Campaign);
      } else {
        throw new Error('Falha ao inicializar fila');
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setSendStatus('error');
      setSendResult({
        contactsSent: 0,
        campaignName: formData.campaignName,
        error: errorMessage,
      });
      toast({
        title: 'Erro ao iniciar disparo',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to check if a row index is invalid
  const isRowInvalid = (index: number): boolean => {
    if (!validationResult) return false;
    const info = validationResult.validationMap.get(index);
    return info ? !info.isValid : false;
  };

  const getRowValidationInfo = (index: number) => {
    if (!validationResult) return null;
    return validationResult.validationMap.get(index);
  };

  const validCount = validationResult?.summary.validCount ?? 0;
  const invalidCount = validationResult?.summary.invalidCount ?? 0;
  const fixableCount = validationResult?.summary.fixableCount ?? 0;

  // Check if queue is active
  const isQueueActive = queueDispatcher.isRunning || queueDispatcher.sentCount > 0 || queueDispatcher.failedCount > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Column */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload de Lista
          </CardTitle>
          <CardDescription>
            Importe um arquivo Excel ou CSV com sua lista de contatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Queue Dispatcher UI - Show when queue is active */}
          {isQueueActive && (
            <div className="mb-6">
              <QueueDispatcher
                state={queueDispatcher}
                progress={queueDispatcher.progress}
                secondsUntilNext={queueDispatcher.secondsUntilNext}
                remainingCount={queueDispatcher.remainingCount}
                onStart={handleStartQueueDispatch}
                onPause={queueDispatcher.pause}
                onResume={queueDispatcher.resume}
                onCancel={queueDispatcher.cancel}
                onExcludeContact={queueDispatcher.excludeContact}
                totalContacts={validCount > 0 ? validCount : rows.length}
              />
              
              {!queueDispatcher.isRunning && (queueDispatcher.sentCount > 0 || queueDispatcher.failedCount > 0) && (
                <Button 
                  onClick={resetForm} 
                  variant="outline" 
                  className="w-full mt-4"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Novo Disparo
                </Button>
              )}
            </div>
          )}

          {/* Send Result Feedback */}
          {sendStatus === 'error' && sendResult && !isQueueActive && (
            <Alert className="border-red-500/50 bg-red-500/10 mb-6">
              <XCircle className="h-5 w-5 text-red-500" />
              <AlertTitle className="text-red-700 dark:text-red-400">
                Erro no disparo
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{sendResult.error || 'Erro desconhecido ao enviar para o n8n'}</p>
                <Button 
                  onClick={() => setSendStatus('idle')} 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Hide form when queue is active */}
          {!isQueueActive && (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Arquivo de Contatos *</Label>
                {fileName ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <span className="flex-1 truncate text-sm">{fileName}</span>
                    <span className="text-xs text-muted-foreground">{rows.length} contatos</span>
                    <Button type="button" variant="ghost" size="icon" onClick={clearFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Clique ou arraste um arquivo .xlsx, .xls ou .csv
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Column Selection */}
              {headers.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Coluna de Telefone *</Label>
                    <Select value={phoneColumn} onValueChange={setPhoneColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Coluna de Nome</Label>
                    <Select value={nameColumn || "none"} onValueChange={(v) => setNameColumn(v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="(opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">(nenhuma)</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Validation Summary */}
              {validationResult && rows.length > 0 && (
                <Alert className={invalidCount > 0 ? 'border-amber-500/50 bg-amber-500/10' : 'border-emerald-500/50 bg-emerald-500/10'}>
                  <div className="flex items-start gap-3">
                    {invalidCount > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <AlertTitle className="mb-2">
                        Validação de Telefones
                      </AlertTitle>
                      <AlertDescription className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {validCount} válidos
                          </Badge>
                          {invalidCount > 0 && (
                            <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
                              <XCircle className="h-3 w-3 mr-1" />
                              {invalidCount} inválidos
                            </Badge>
                          )}
                          {fixableCount > 0 && (
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                              <Wrench className="h-3 w-3 mr-1" />
                              {fixableCount} corrigíveis
                            </Badge>
                          )}
                        </div>
                        
                        {invalidCount > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {fixableCount > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAutoCorrect}
                                className="h-7 text-xs"
                              >
                                <Wrench className="h-3 w-3 mr-1" />
                                Corrigir automaticamente
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveInvalid}
                              className="h-7 text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remover inválidos
                            </Button>
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              {/* Campaign Name */}
              <div className="space-y-2">
                <Label htmlFor="campaignName">Nome da Campanha *</Label>
                <Input
                  id="campaignName"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  placeholder="Ex: Promoção Dezembro"
                />
              </div>

              {/* AI Generation Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <Label>Gerar mensagem com IA</Label>
                    <p className="text-xs text-muted-foreground">Use IA para criar a mensagem</p>
                  </div>
                </div>
                <Switch
                  checked={formData.useAi}
                  onCheckedChange={(checked) => setFormData({ ...formData, useAi: checked })}
                />
              </div>

              {/* AI Prompt */}
              {formData.useAi && (
                <div className="space-y-2">
                  <Label htmlFor="aiPrompt">Descreva a mensagem que você quer</Label>
                  <Textarea
                    id="aiPrompt"
                    value={formData.aiPrompt}
                    onChange={(e) => setFormData({ ...formData, aiPrompt: e.target.value })}
                    placeholder="Ex: Uma mensagem de promoção de Natal para clientes"
                    rows={3}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateAIMessage}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Gerar Mensagem
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Digite a mensagem. Use {{nome}} para personalizar."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Placeholders: {"{{nome}}"}, {"{{telefone}}"}
                </p>
              </div>

              {/* Save as List Option */}
              {rows.length > 0 && (
                <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="saveAsList"
                      checked={formData.saveAsList}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, saveAsList: checked === true })
                      }
                    />
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4 text-primary" />
                      <Label htmlFor="saveAsList" className="cursor-pointer">
                        Salvar contatos como nova lista
                      </Label>
                    </div>
                  </div>
                  {formData.saveAsList && (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor="listName">Nome da Lista *</Label>
                      <Input
                        id="listName"
                        value={formData.listName}
                        onChange={(e) => setFormData({ ...formData, listName: e.target.value })}
                        placeholder="Ex: Leads Dezembro 2024"
                      />
                      <p className="text-xs text-muted-foreground">
                        Salve para reutilizar em futuras campanhas
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Send Limit */}
              <div className="space-y-2">
                <Label htmlFor="sendLimit">Limite de Envios</Label>
                <Input
                  id="sendLimit"
                  type="number"
                  value={formData.sendLimit}
                  onChange={(e) => setFormData({ ...formData, sendLimit: e.target.value })}
                  placeholder="Sem limite"
                />
              </div>

              {/* Queue Dispatcher - Configuration UI */}
              {rows.length > 0 && formData.campaignName && formData.message && (
                <QueueDispatcher
                  state={queueDispatcher}
                  progress={queueDispatcher.progress}
                  secondsUntilNext={queueDispatcher.secondsUntilNext}
                  remainingCount={queueDispatcher.remainingCount}
                  onStart={handleStartQueueDispatch}
                  onPause={queueDispatcher.pause}
                  onResume={queueDispatcher.resume}
                  onCancel={queueDispatcher.cancel}
                  totalContacts={validCount > 0 ? validCount : rows.length}
                  disabled={isSubmitting || !formData.campaignName || !formData.message}
                />
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {/* Preview Column */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Preview da Lista
          </CardTitle>
          <CardDescription>
            Primeiras 30 linhas do arquivo importado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mb-4 opacity-50" />
              <p>Importe um arquivo para ver o preview</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    {headers.map((h) => (
                      <TableHead key={h} className={
                        h === phoneColumn ? 'bg-primary/10 text-primary' :
                        h === nameColumn ? 'bg-secondary/50' : ''
                      }>
                        {h}
                        {h === phoneColumn && ' (telefone)'}
                        {h === nameColumn && ' (nome)'}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 30).map((row, idx) => {
                    const isInvalid = isRowInvalid(idx);
                    const validationInfo = getRowValidationInfo(idx);
                    
                    return (
                      <TableRow 
                        key={idx} 
                        className={isInvalid ? 'bg-red-500/10 hover:bg-red-500/20' : ''}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {isInvalid ? (
                            <div className="flex items-center justify-center" title={validationInfo?.reason}>
                              <XCircle className="h-4 w-4 text-red-500" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                          )}
                        </TableCell>
                        {headers.map((h) => (
                          <TableCell 
                            key={h} 
                            className={`text-sm ${h === phoneColumn && isInvalid ? 'text-red-500 font-medium' : ''}`}
                          >
                            {String(row[h] ?? '')}
                            {h === phoneColumn && validationInfo?.canFix && validationInfo.correctedPhone && (
                              <span className="block text-xs text-amber-600 dark:text-amber-400">
                                → {validationInfo.correctedPhone}
                              </span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
