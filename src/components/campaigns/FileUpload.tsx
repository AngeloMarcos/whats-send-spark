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
import { DuplicateReportModal, DuplicateReport } from './DuplicateReportModal';
import { ContactHistoryDialog } from './ContactHistoryDialog';
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
  RotateCcw,
  History,
  Users,
  FlaskConical,
  Eye,
  Clock,
  CalendarClock,
} from 'lucide-react';
import { Campaign, TestContact } from '@/types/database';
import { processMessage } from '@/lib/templateVariables';

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
  
  // Duplicate detection state
  const [duplicateReport, setDuplicateReport] = useState<DuplicateReport | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(false);
  
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
    useQueueMode: true,
    testMode: false,
    testContactId: '',
  });

  // Test contacts state
  const [testContacts, setTestContacts] = useState<TestContact[]>([]);
  const [loadingTestContacts, setLoadingTestContacts] = useState(false);

  // Fetch test contacts when user changes
  useEffect(() => {
    if (user) {
      fetchTestContacts();
    }
  }, [user]);

  const fetchTestContacts = async () => {
    if (!user) return;
    setLoadingTestContacts(true);
    try {
      const { data, error } = await supabase
        .from('test_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      const contacts = (data || []) as TestContact[];
      setTestContacts(contacts);
      
      // Auto-select default contact
      const defaultContact = contacts.find(c => c.is_default);
      if (defaultContact && !formData.testContactId) {
        setFormData(prev => ({ ...prev, testContactId: defaultContact.id }));
      }
    } catch (error) {
      console.error('Error fetching test contacts:', error);
    } finally {
      setLoadingTestContacts(false);
    }
  };

  // Get selected test contact
  const selectedTestContact = testContacts.find(c => c.id === formData.testContactId);

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
        const json: ContactRow[] = XLSX.utils.sheet_to_json(sheet, { 
          raw: false  // Força todos os valores serem strings, evitando perda de precisão em números grandes
        });

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

  // Check for duplicates in file and database
  const checkAllDuplicates = useCallback(async (contactsToCheck: ContactRow[]) => {
    if (!phoneColumn || contactsToCheck.length === 0) return null;

    setIsCheckingDuplicates(true);

    try {
      // Get formatted phones
      const phones = contactsToCheck.map(c => formatToInternational(String(c[phoneColumn] ?? '')));
      
      // 1. Find duplicates within the file itself
      const phoneCounts = new Map<string, number>();
      phones.forEach(phone => {
        phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1);
      });
      const duplicatesInFile = [...phoneCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([phone]) => phone);

      // 2. Check database for already sent contacts
      const uniquePhones = [...new Set(phones)];
      const { data: sentData, error } = await supabase
        .from('campaign_queue')
        .select('contact_phone, campaigns!inner(name, created_at)')
        .in('contact_phone', uniquePhones)
        .eq('status', 'sent');

      if (error) throw error;

      // Group by phone with campaign details
      const alreadySentMap = new Map<string, Array<{ name: string; sentAt: string }>>();
      (sentData || []).forEach((item: { contact_phone: string; campaigns: { name: string; created_at: string } }) => {
        const existing = alreadySentMap.get(item.contact_phone) || [];
        existing.push({
          name: item.campaigns.name,
          sentAt: item.campaigns.created_at,
        });
        alreadySentMap.set(item.contact_phone, existing);
      });

      const alreadySentContacts = [...alreadySentMap.entries()].map(([phone, campaigns]) => ({
        phone,
        campaigns,
      }));

      // Calculate new contacts
      const duplicatePhones = new Set([...duplicatesInFile, ...alreadySentMap.keys()]);
      const newContacts = uniquePhones.filter(p => !alreadySentMap.has(p)).length;

      const report: DuplicateReport = {
        duplicatesInFile,
        alreadySentContacts,
        newContacts,
        totalContacts: contactsToCheck.length,
      };

      setDuplicateReport(report);
      
      // Auto-open modal if significant duplicates found
      if (alreadySentContacts.length > 0 || duplicatesInFile.length > 5) {
        setShowDuplicateModal(true);
      }

      return report;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      toast({
        title: 'Erro ao verificar duplicatas',
        description: 'Não foi possível verificar duplicatas no banco de dados.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [phoneColumn, toast]);

  // Trigger duplicate check when file is loaded and phone column selected
  useEffect(() => {
    if (rows.length > 0 && phoneColumn && !duplicatesRemoved) {
      checkAllDuplicates(rows);
    }
  }, [rows, phoneColumn, checkAllDuplicates, duplicatesRemoved]);

  const clearFile = () => {
    setRows([]);
    setHeaders([]);
    setPhoneColumn('');
    setNameColumn('');
    setFileName('');
    setValidationResult(null);
    setDuplicateReport(null);
    setDuplicatesRemoved(false);
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
      testMode: false,
      testContactId: '',
    });
    setSendStatus('idle');
    setSendResult(null);
    setDuplicateReport(null);
    setDuplicatesRemoved(false);
    queueDispatcher.reset();
  };

  // Handle removing duplicates from the list
  const handleRemoveDuplicates = useCallback(() => {
    if (!duplicateReport || !phoneColumn) return;

    const duplicatePhones = new Set([
      ...duplicateReport.duplicatesInFile,
      ...duplicateReport.alreadySentContacts.map(c => c.phone),
    ]);

    // Keep only first occurrence of each phone and exclude already sent
    const seenPhones = new Set<string>();
    const filteredRows = rows.filter(row => {
      const phone = formatToInternational(String(row[phoneColumn] ?? ''));
      if (seenPhones.has(phone) || duplicateReport.alreadySentContacts.some(c => c.phone === phone)) {
        return false;
      }
      seenPhones.add(phone);
      return true;
    });

    setRows(filteredRows);
    setShowDuplicateModal(false);
    setDuplicatesRemoved(true);

    const removed = rows.length - filteredRows.length;
    toast({
      title: 'Duplicatas removidas',
      description: `${removed} contato${removed > 1 ? 's foram removidos' : ' foi removido'} da lista.`,
    });
  }, [duplicateReport, phoneColumn, rows, toast]);

  const handleKeepAll = useCallback(() => {
    setShowDuplicateModal(false);
    toast({
      title: 'Lista mantida',
      description: 'Todos os contatos serão mantidos. Duplicatas podem ser ignoradas automaticamente durante o envio.',
    });
  }, [toast]);

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

  const handleStartQueueDispatch = async (intervalMinutes: number, scheduledAt?: string) => {
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

        const leadsToInsert = normalizedContacts.map((contact) => ({
          user_id: user.id,
          list_id: newList.id,
          telefones: String(contact.phone),
          nome: contact.name || null,
          status: 'pending',
          extra_data: contact,
        }));

        const chunkSize = 100;
        for (let i = 0; i < leadsToInsert.length; i += chunkSize) {
          const chunk = leadsToInsert.slice(i, i + chunkSize);
          const { error: leadsError } = await supabase
            .from('leads')
            .insert(chunk);
          if (leadsError) throw leadsError;
        }

        toast({
          title: 'Lista salva!',
          description: `${leadsToInsert.length} contatos salvos na lista "${formData.listName}"`,
        });
      }

      // Determine initial status based on scheduling
      const isScheduled = !!scheduledAt;
      const initialStatus = isScheduled ? 'scheduled' : 'sending';

      // Create campaign in database
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: formData.campaignName,
          message: formData.message,
          list_id: listId,
          status: initialStatus,
          send_now: !isScheduled,
          scheduled_at: scheduledAt || null,
          send_limit: formData.testMode ? Math.min(sendLimit || 10, 10) : sendLimit,
          contacts_total: contactsToProcess.length,
          send_interval_minutes: intervalMinutes,
          is_test_mode: formData.testMode,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Get test contact phone if in test mode
      let testContactPhone: string | undefined;
      if (formData.testMode && selectedTestContact) {
        testContactPhone = selectedTestContact.phone;
      }

      // Initialize queue dispatcher
      const success = await queueDispatcher.initializeQueue(
        campaign.id,
        contactsToProcess,
        intervalMinutes,
        true, // skipDuplicates
        scheduledAt || null
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

  // Handler for scheduled dispatch
  const handleStartScheduledDispatch = (intervalMinutes: number, scheduledAt: string) => {
    handleStartQueueDispatch(intervalMinutes, scheduledAt);
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
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Duplicate Report Alert */}
              {duplicateReport && (duplicateReport.duplicatesInFile.length > 0 || duplicateReport.alreadySentContacts.length > 0) && !duplicatesRemoved && (
                <Alert className="border-blue-500/50 bg-blue-500/10">
                  <div className="flex items-start gap-3">
                    <History className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <AlertTitle className="mb-2">
                        Duplicatas Detectadas
                      </AlertTitle>
                      <AlertDescription className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                            <Users className="h-3 w-3 mr-1" />
                            {duplicateReport.newContacts} novos
                          </Badge>
                          {duplicateReport.duplicatesInFile.length > 0 && (
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                              {duplicateReport.duplicatesInFile.length} duplicados no arquivo
                            </Badge>
                          )}
                          {duplicateReport.alreadySentContacts.length > 0 && (
                            <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
                              {duplicateReport.alreadySentContacts.length} já enviados
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDuplicateModal(true)}
                            className="h-7 text-xs"
                          >
                            Ver Detalhes
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={handleRemoveDuplicates}
                            className="h-7 text-xs"
                          >
                            Remover Duplicados
                          </Button>
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
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
                  placeholder={formData.testMode ? "10 (máx em modo teste)" : "Sem limite"}
                  max={formData.testMode ? 10 : undefined}
                />
              </div>

              {/* Scheduling Section */}
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <Label>Enviar agora</Label>
                      <p className="text-xs text-muted-foreground">
                        {formData.sendNow ? 'O disparo iniciará imediatamente' : 'Agende para uma data e hora específica'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.sendNow}
                    onCheckedChange={(checked) => setFormData({ ...formData, sendNow: checked })}
                  />
                </div>

                {!formData.sendNow && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Data</Label>
                        <Input
                          id="scheduledDate"
                          type="date"
                          value={formData.scheduledAt ? formData.scheduledAt.split('T')[0] : ''}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const time = formData.scheduledAt?.split('T')[1] || '09:00';
                            setFormData({ ...formData, scheduledAt: `${e.target.value}T${time}` });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scheduledTime">Hora</Label>
                        <Input
                          id="scheduledTime"
                          type="time"
                          value={formData.scheduledAt ? formData.scheduledAt.split('T')[1] || '09:00' : '09:00'}
                          onChange={(e) => {
                            const date = formData.scheduledAt?.split('T')[0] || new Date().toISOString().split('T')[0];
                            setFormData({ ...formData, scheduledAt: `${date}T${e.target.value}` });
                          }}
                        />
                      </div>
                    </div>
                    
                    {formData.scheduledAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        <CalendarClock className="h-4 w-4" />
                        Agendado para: {new Date(formData.scheduledAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Test Mode Section */}
              <div className={`space-y-4 rounded-lg border p-4 ${formData.testMode ? 'border-yellow-500/50 bg-yellow-500/10' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FlaskConical className={`h-5 w-5 ${formData.testMode ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                    <div>
                      <Label>Modo de Teste</Label>
                      <p className="text-xs text-muted-foreground">Testar sem enviar para a lista real</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.testMode}
                    onCheckedChange={(checked) => {
                      setFormData({ 
                        ...formData, 
                        testMode: checked,
                        // Auto-limit to 10 in test mode
                        sendLimit: checked && (!formData.sendLimit || parseInt(formData.sendLimit) > 10) ? '10' : formData.sendLimit,
                      });
                    }}
                  />
                </div>

                {formData.testMode && (
                  <div className="space-y-4 pt-2">
                    {/* Warning */}
                    <Alert className="border-yellow-500/50 bg-yellow-500/10">
                      <FlaskConical className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-800 dark:text-yellow-400">
                        Modo de Teste Ativo
                      </AlertTitle>
                      <AlertDescription className="text-sm text-yellow-700 dark:text-yellow-300">
                        • Máximo de 10 mensagens por execução<br />
                        • Todas as mensagens serão enviadas para o número de teste selecionado<br />
                        • Dados dos contatos reais serão usados para substituir variáveis
                      </AlertDescription>
                    </Alert>

                    {/* Test Contact Selection */}
                    <div className="space-y-2">
                      <Label>Número de Teste</Label>
                      {testContacts.length === 0 ? (
                        <Alert className="border-destructive/50 bg-destructive/10">
                          <AlertDescription className="text-sm">
                            Nenhum contato de teste configurado. Vá em <strong>Configurações</strong> para adicionar números de teste.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Select 
                          value={formData.testContactId} 
                          onValueChange={(v) => setFormData({ ...formData, testContactId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um número de teste" />
                          </SelectTrigger>
                          <SelectContent>
                            {testContacts.map((tc) => (
                              <SelectItem key={tc.id} value={tc.id}>
                                {tc.name} ({tc.phone}) {tc.is_default && '★'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Message Preview */}
                    {selectedTestContact && formData.message && rows.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <Label>Preview da Mensagem (1º contato)</Label>
                        </div>
                        <div className="rounded-md bg-muted/50 p-3 text-sm border">
                          <p className="text-xs text-muted-foreground mb-2">
                            Para: <strong>{selectedTestContact.name}</strong> ({selectedTestContact.phone})
                          </p>
                          <p className="whitespace-pre-wrap">
                            {processMessage(formData.message, {
                              name: nameColumn ? String(rows[0][nameColumn] ?? '') : undefined,
                              phone: phoneColumn ? String(rows[0][phoneColumn] ?? '') : undefined,
                              ...rows[0],
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  onExcludeContact={queueDispatcher.excludeContact}
                  onRetryFailed={queueDispatcher.retryFailed}
                  totalContacts={validCount > 0 ? validCount : rows.length}
                  disabled={isSubmitting || !formData.campaignName || !formData.message}
                  scheduledAt={formData.sendNow ? null : formData.scheduledAt || null}
                  onStartScheduled={handleStartScheduledDispatch}
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

      {/* Duplicate Report Modal */}
      {duplicateReport && (
        <DuplicateReportModal
          open={showDuplicateModal}
          onOpenChange={setShowDuplicateModal}
          report={duplicateReport}
          onRemoveDuplicates={handleRemoveDuplicates}
          onKeepAll={handleKeepAll}
        />
      )}
    </>
  );
}
