import { useState, useEffect, useMemo } from 'react';
import { useLeadsMonitor, isWorkflowInactiveError } from '@/hooks/useLeadsMonitor';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  AlertTriangle,
  Loader2,
  Webhook,
  Activity,
  Calendar,
  Save,
  Zap,
  RotateCcw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LeadsMonitor() {
  const { toast } = useToast();
  const { 
    stats, 
    pendingLeads, 
    recentLogs,
    webhookStatus, 
    loading, 
    resendLead, 
    resendAllPending,
    saveWebhookUrl,
    testWebhook,
    refetch 
  } = useLeadsMonitor(30000); // 30 segundos auto-refresh

  const [resending, setResending] = useState<string | null>(null);
  const [resendingAll, setResendingAll] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Sync input with webhook status when it loads
  useEffect(() => {
    if (webhookStatus.url && webhookUrlInput === '') {
      setWebhookUrlInput(webhookStatus.url);
    }
  }, [webhookStatus.url, webhookUrlInput]);

  // Validação visual da URL
  const urlValidation = useMemo(() => {
    if (!webhookUrlInput || webhookUrlInput.trim() === '') {
      return { valid: true, message: null };
    }
    if (!webhookUrlInput.startsWith('https://')) {
      return { valid: false, message: 'A URL deve começar com https://' };
    }
    try {
      const url = new URL(webhookUrlInput);
      const hostname = url.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return { valid: false, message: 'URLs locais não são permitidas' };
      }
      if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        return { valid: false, message: 'URLs de redes privadas não são permitidas' };
      }
      return { valid: true, message: null };
    } catch {
      return { valid: false, message: 'URL inválida' };
    }
  }, [webhookUrlInput]);

  // Detectar se o último erro indica workflow inativo
  const showWorkflowInactiveAlert = useMemo(() => {
    return isWorkflowInactiveError(webhookStatus.lastCallError) || 
           isWorkflowInactiveError(webhookStatus.lastSettingsError);
  }, [webhookStatus.lastCallError, webhookStatus.lastSettingsError]);

  const handleSaveUrl = async () => {
    if (!urlValidation.valid) {
      toast({
        title: 'URL inválida',
        description: urlValidation.message || 'Verifique o formato da URL.',
        variant: 'destructive',
      });
      return;
    }

    setSavingUrl(true);
    setUrlError(null);
    const result = await saveWebhookUrl(webhookUrlInput);
    setSavingUrl(false);

    if (result.success) {
      toast({
        title: 'URL salva!',
        description: 'A URL do webhook n8n foi atualizada com sucesso.',
      });
    } else {
      setUrlError(result.error || 'Erro desconhecido');
      toast({
        title: 'Erro ao salvar',
        description: result.error || 'Não foi possível salvar a URL.',
        variant: 'destructive',
      });
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookStatus.isConfigured) {
      toast({
        title: 'URL não configurada',
        description: 'Configure e salve a URL do webhook primeiro.',
        variant: 'destructive',
      });
      return;
    }

    setTestingWebhook(true);
    const result = await testWebhook();
    setTestingWebhook(false);
    
    // Recarregar status após teste
    await refetch();

    if (result.success) {
      toast({
        title: 'Teste enviado!',
        description: 'O webhook recebeu o payload de teste. Verifique o n8n.',
      });
    } else {
      toast({
        title: 'Falha no teste',
        description: result.error || 'O webhook não respondeu corretamente.',
        variant: 'destructive',
      });
    }
  };

  const handleResendLead = async (leadId: string) => {
    setResending(leadId);
    const result = await resendLead(leadId);
    
    if (result.success) {
      toast({
        title: 'Lead reenviado!',
        description: 'Notificação enviada para o n8n com sucesso.',
      });
    } else {
      toast({
        title: 'Erro ao reenviar',
        description: result.error || 'Não foi possível reenviar o lead.',
        variant: 'destructive',
      });
    }
    
    setResending(null);
  };

  const handleResendAll = async () => {
    setResendingAll(true);
    const result = await resendAllPending();
    
    if (result.success) {
      toast({
        title: 'Leads reenviados!',
        description: `${result.sent} leads enviados, ${result.failed} falhas.`,
      });
    } else {
      toast({
        title: 'Erro ao reenviar',
        description: 'Ocorreu um erro ao reenviar os leads.',
        variant: 'destructive',
      });
    }
    
    setResendingAll(false);
  };

  const formatPhone = (telefones: string) => {
    if (!telefones) return '-';
    const phones = telefones.split(',').map(t => t.trim()).filter(Boolean);
    return phones.length > 0 ? `${phones.length} tel.` : '-';
  };

  // Formatar erro para exibição resumida
  const formatErrorMessage = (error: string | null) => {
    if (!error) return '-';
    if (error.includes('workflow') && (error.includes('ativo') || error.includes('active'))) {
      return 'Workflow não ativo';
    }
    if (error.includes('not registered') || error.includes('not found')) {
      return 'Webhook não encontrado';
    }
    if (error.includes('timeout') || error.includes('Timeout')) {
      return 'Timeout';
    }
    if (error.includes('conexão') || error.includes('network')) {
      return 'Erro de rede';
    }
    return error.length > 40 ? error.substring(0, 40) + '...' : error;
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Monitor de Leads" 
        description="Acompanhe a notificação automática de leads para o n8n em tempo real"
      />
      
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* Action Bar */}
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Atualiza a cada 30 segundos</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
            <Button 
              size="sm"
              onClick={handleResendAll}
              disabled={resendingAll || stats.pending === 0 || !webhookStatus.isConfigured}
            >
              {resendingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Reenviar Todos ({stats.pending})
            </Button>
          </div>
        </div>

        {/* Alerta de Workflow Inativo */}
        {showWorkflowInactiveAlert && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Workflow do n8n não está ativo</AlertTitle>
            <AlertDescription className="mt-2">
              O webhook retornou erro 404, indicando que o workflow não está ativo no n8n. 
              Para resolver:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Abra o editor do n8n</li>
                <li>Localize o workflow que contém o webhook</li>
                <li>Clique no botão <strong>"Active"</strong> no canto superior direito para ativá-lo</li>
                <li>Copie a <strong>Production URL</strong> (não a Test URL)</li>
                <li>Cole a URL aqui e teste novamente</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.contacted}</p>
                  <p className="text-xs text-muted-foreground">Contatados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-xs text-muted-foreground">Falhas (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.todayCount}</p>
                  <p className="text-xs text-muted-foreground">Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Webhook Configuration Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Configuração do Webhook n8n</CardTitle>
              </div>
              {webhookStatus.isConfigured ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configurado
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Não configurado
                </Badge>
              )}
            </div>
            <CardDescription>
              Configure a URL do webhook do n8n para receber os leads automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  value={webhookUrlInput}
                  onChange={(e) => {
                    setWebhookUrlInput(e.target.value);
                    setUrlError(null);
                  }}
                  placeholder="https://seu-n8n.com/webhook/disparo-massa"
                  className={`${
                    webhookUrlInput && !urlValidation.valid 
                      ? 'border-red-500 focus-visible:ring-red-500' 
                      : webhookUrlInput && urlValidation.valid
                        ? 'border-green-500 focus-visible:ring-green-500'
                        : ''
                  }`}
                />
                {webhookUrlInput && !urlValidation.valid && (
                  <p className="text-xs text-red-500">{urlValidation.message}</p>
                )}
                {urlError && (
                  <p className="text-xs text-red-500">{urlError}</p>
                )}
              </div>
              <Button 
                onClick={handleSaveUrl} 
                disabled={savingUrl || (webhookUrlInput && !urlValidation.valid)}
              >
                {savingUrl ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Salvar</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTestWebhook} 
                disabled={testingWebhook || !webhookStatus.isConfigured}
              >
                {testingWebhook ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Testar</span>
              </Button>
            </div>

            {/* Status da última chamada */}
            {(webhookStatus.lastCallAt || webhookStatus.lastSettingsCallAt) && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Última chamada:</span>
                <span>
                  {formatDistanceToNow(
                    new Date(webhookStatus.lastSettingsCallAt || webhookStatus.lastCallAt || ''), 
                    { addSuffix: true, locale: ptBR }
                  )}
                </span>
                {webhookStatus.lastCallSuccess !== null && (
                  <Badge variant={webhookStatus.lastCallSuccess ? 'default' : 'destructive'}>
                    {webhookStatus.lastCallSuccess ? 'Sucesso' : 'Falhou'}
                    {webhookStatus.lastCallStatusCode && ` (${webhookStatus.lastCallStatusCode})`}
                    {webhookStatus.lastCallDuration && ` - ${webhookStatus.lastCallDuration}ms`}
                  </Badge>
                )}
              </div>
            )}

            {/* Exibir último erro (se houver) */}
            {(webhookStatus.lastCallError || webhookStatus.lastSettingsError) && 
             webhookStatus.lastCallSuccess === false && (
              <div className="p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                <strong>Último erro:</strong> {
                  (webhookStatus.lastSettingsError || webhookStatus.lastCallError || '').substring(0, 300)
                }
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs: Pending Leads & Logs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Leads Pendentes ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="logs">
              Logs de Webhook ({recentLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads Aguardando Envio</CardTitle>
                <CardDescription>
                  Leads com status "pending" que serão notificados ao n8n (máx. 3 tentativas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>Nenhum lead pendente!</p>
                    <p className="text-sm">Todos os leads foram notificados ao n8n.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CNPJ</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Cidade/UF</TableHead>
                          <TableHead>Telefones</TableHead>
                          <TableHead>Tentativas</TableHead>
                          <TableHead>Criado</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-mono text-xs">
                              {lead.cnpj || '-'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {lead.nome_fantasia || lead.razao_social || '-'}
                            </TableCell>
                            <TableCell>
                              {lead.municipio && lead.uf 
                                ? `${lead.municipio}/${lead.uf}` 
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {formatPhone(lead.telefones)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  (lead.retry_count || 0) >= 3 
                                    ? 'destructive' 
                                    : (lead.retry_count || 0) > 0 
                                      ? 'secondary' 
                                      : 'outline'
                                }
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                {lead.retry_count || 0}/3
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(lead.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResendLead(lead.id)}
                                disabled={
                                  resending === lead.id || 
                                  !webhookStatus.isConfigured ||
                                  (lead.retry_count || 0) >= 3
                                }
                                title={(lead.retry_count || 0) >= 3 ? 'Máximo de tentativas atingido' : 'Reenviar'}
                              >
                                {resending === lead.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Chamadas</CardTitle>
                <CardDescription>
                  Últimas 20 chamadas ao webhook n8n
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum log de webhook ainda.</p>
                    <p className="text-sm">As chamadas aparecerão aqui após o envio de leads.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Lead ID</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Duração</TableHead>
                          <TableHead>Erro</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              {log.success ? (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  OK
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Erro
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {log.lead_id?.substring(0, 8) || '-'}...
                            </TableCell>
                            <TableCell>
                              {log.status_code ? (
                                <Badge 
                                  variant={
                                    log.status_code >= 200 && log.status_code < 300 
                                      ? 'default' 
                                      : 'destructive'
                                  }
                                >
                                  {log.status_code}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                            </TableCell>
                            <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                              {formatErrorMessage(log.error_message)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
