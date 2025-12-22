import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { sendBulkToBackend, ContactRow } from '@/services/bulkSender';
import { Upload, FileSpreadsheet, Send, Loader2, X, Sparkles, Wand2 } from 'lucide-react';
import { Campaign } from '@/types/database';

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
  
  const [formData, setFormData] = useState({
    campaignName: '',
    message: '',
    sendNow: true,
    scheduledAt: '',
    sendLimit: '',
    useAi: false,
    aiPrompt: '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.campaignName || !formData.message || rows.length === 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome da campanha, importe um arquivo e escreva a mensagem',
        variant: 'destructive',
      });
      return;
    }

    if (!phoneColumn) {
      toast({
        title: 'Selecione a coluna de telefone',
        description: 'Indique qual coluna contém os números de WhatsApp',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get settings for webhook URL
      const { data: settings } = await supabase
        .from('settings')
        .select('n8n_webhook_url')
        .eq('user_id', user.id)
        .single();

      if (!settings?.n8n_webhook_url) {
        toast({
          title: 'Configure o webhook',
          description: 'Acesse Configurações e adicione a URL do webhook do n8n',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Normalize contacts
      const normalizedContacts: ContactRow[] = rows.map((row) => ({
        name: nameColumn ? String(row[nameColumn] ?? '') : '',
        phone: String(row[phoneColumn] ?? ''),
        ...row,
      }));

      const sendLimit = formData.sendLimit ? parseInt(formData.sendLimit) : null;
      const contactsCount = sendLimit ? Math.min(sendLimit, normalizedContacts.length) : normalizedContacts.length;

      // Create campaign in database
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: formData.campaignName,
          message: formData.message,
          status: formData.sendNow ? 'sending' : 'scheduled',
          send_now: formData.sendNow,
          scheduled_at: formData.scheduledAt || null,
          send_limit: sendLimit,
          contacts_total: contactsCount,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Send to webhook via edge function
      const result = await sendBulkToBackend({
        campaignId: campaign.id,
        contacts: normalizedContacts,
        message: formData.message,
        webhookUrl: settings.n8n_webhook_url,
        sendNow: formData.sendNow,
        scheduledAt: formData.scheduledAt || null,
        sendLimit,
      });

      // Update campaign with execution info if returned
      if (result?.executionId) {
        await supabase
          .from('campaigns')
          .update({ execution_id: result.executionId })
          .eq('id', campaign.id);
      }

      toast({ 
        title: 'Campanha iniciada!',
        description: `${contactsCount} contatos serão enviados para o n8n`,
      });
      
      onCampaignCreated(campaign as Campaign);

      // Reset form
      clearFile();
      setFormData({
        campaignName: '',
        message: '',
        sendNow: true,
        scheduledAt: '',
        sendLimit: '',
        useAi: false,
        aiPrompt: '',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao criar campanha',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Select value={nameColumn} onValueChange={setNameColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="(opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">(nenhuma)</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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

            {/* Scheduling */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Enviar agora</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.sendNow ? 'Envio imediato' : 'Agendar envio'}
                </p>
              </div>
              <Switch
                checked={formData.sendNow}
                onCheckedChange={(checked) => setFormData({ ...formData, sendNow: checked })}
              />
            </div>

            {!formData.sendNow && (
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Data e Hora</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
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

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isSubmitting || rows.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Iniciar Disparo ({rows.length} contatos)
                </>
              )}
            </Button>
          </form>
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
                  {rows.slice(0, 30).map((row, idx) => (
                    <TableRow key={idx}>
                      {headers.map((h) => (
                        <TableCell key={h} className="text-sm">
                          {String(row[h] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
