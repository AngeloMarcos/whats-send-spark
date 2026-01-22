import { useState, useEffect } from 'react';
import { useLeadsMonitor } from '@/hooks/useLeadsMonitor';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Webhook,
  Activity,
  Calendar,
  Save,
  Zap
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

  // Sync input with webhook status when it loads
  useEffect(() => {
    if (webhookStatus.url && webhookUrlInput === '') {
      setWebhookUrlInput(webhookStatus.url);
    }
  }, [webhookStatus.url, webhookUrlInput]);

  const handleSaveUrl = async () => {
    setSavingUrl(true);
    const result = await saveWebhookUrl(webhookUrlInput);
    setSavingUrl(false);

    if (result.success) {
      toast({
        title: 'URL salva!',
        description: 'A URL do webhook n8n foi atualizada com sucesso.',
      });
    } else {
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
              <Input
                value={webhookUrlInput}
                onChange={(e) => setWebhookUrlInput(e.target.value)}
                placeholder="https://seu-n8n.com/webhook/disparo-massa"
                className="flex-1"
              />
              <Button onClick={handleSaveUrl} disabled={savingUrl}>
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

            {webhookStatus.lastCallAt && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Última chamada:</span>
                <span>
                  {formatDistanceToNow(new Date(webhookStatus.lastCallAt), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
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

            {webhookStatus.lastCallError && !webhookStatus.lastCallSuccess && (
              <div className="p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                <strong>Último erro:</strong> {webhookStatus.lastCallError.substring(0, 200)}
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
                  Leads com status "pending" que serão notificados ao n8n
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
                                disabled={resending === lead.id || !webhookStatus.isConfigured}
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
                              {log.status_code || '-'}
                            </TableCell>
                            <TableCell>
                              {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                              {log.error_message || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {log.created_at && formatDistanceToNow(new Date(log.created_at), { 
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
