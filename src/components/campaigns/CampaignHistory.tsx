import React, { useState, useMemo } from 'react';
import { Campaign } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { SkeletonTableRows } from '@/components/ui/loading-skeletons';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, Loader2, History, StopCircle, Trash2, Search, Download, ChevronDown, ChevronUp, MessageSquare, CheckCircle, XCircle, Clock, Activity, Play } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface CampaignHistoryProps {
  campaigns: Campaign[];
  onRefresh: () => void;
  isLoading: boolean;
  onOpenMonitor?: (campaignId: string) => void;
}

type CampaignStatus = 'all' | 'draft' | 'scheduled' | 'sending' | 'completed' | 'error' | 'paused';
type DateFilter = 'all' | 'today' | 'week' | 'month';

const statusConfig = {
  draft: { label: 'Rascunho', variant: 'secondary' as const },
  scheduled: { label: 'Agendada', variant: 'outline' as const },
  sending: { label: 'Enviando', variant: 'default' as const },
  completed: { label: 'Concluída', variant: 'default' as const },
  error: { label: 'Erro', variant: 'destructive' as const },
  paused: { label: 'Pausada', variant: 'secondary' as const },
};

export function CampaignHistory({ campaigns, onRefresh, isLoading, onOpenMonitor }: CampaignHistoryProps) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Filtered campaigns - null-safe
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      // Null-safe search filter
      const campaignName = String(campaign.name ?? '').toLowerCase();
      const listName = String(campaign.list?.name ?? '').toLowerCase();
      const searchLower = (searchQuery ?? '').toLowerCase();
      
      const matchesSearch = !searchQuery || 
        campaignName.includes(searchLower) ||
        listName.includes(searchLower);
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const campaignDate = new Date(campaign.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = isWithinInterval(campaignDate, {
              start: startOfDay(now),
              end: endOfDay(now),
            });
            break;
          case 'week':
            matchesDate = isWithinInterval(campaignDate, {
              start: subDays(now, 7),
              end: now,
            });
            break;
          case 'month':
            matchesDate = isWithinInterval(campaignDate, {
              start: subDays(now, 30),
              end: now,
            });
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [campaigns, searchQuery, statusFilter, dateFilter]);

  const handleStopCampaign = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: 'Campanha pausada',
        description: 'A campanha foi pausada com sucesso.',
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Erro ao pausar',
        description: 'Não foi possível pausar a campanha.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: 'Campanha excluída',
        description: 'A campanha foi excluída com sucesso.',
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a campanha.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      // 1. Buscar dados da campanha
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*, list:lists(*)')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) throw new Error('Campanha não encontrada');
      if (!campaign.list_id) throw new Error('Lista não encontrada');

      // 2. Buscar contatos da lista
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, phone, email, extra_data')
        .eq('list_id', campaign.list_id)
        .eq('is_valid', true)
        .limit(campaign.send_limit || 1000);

      if (contactsError) throw contactsError;
      if (!contacts?.length) throw new Error('Nenhum contato encontrado na lista');

      // 3. Buscar telefones já enviados nesta campanha
      const phones = contacts.map(c => c.phone);
      const { data: alreadySent } = await supabase
        .from('campaign_queue')
        .select('contact_phone')
        .eq('campaign_id', campaignId)
        .eq('status', 'sent');

      const sentPhones = new Set(alreadySent?.map(s => s.contact_phone) || []);

      // 4. Filtrar contatos não enviados
      const contactsToSend = contacts.filter(c => !sentPhones.has(c.phone));

      if (contactsToSend.length === 0) {
        toast({
          title: 'Campanha já concluída',
          description: 'Todos os contatos já foram enviados.',
        });
        setActionLoading(null);
        return;
      }

      // 5. Limpar itens pendentes antigos da fila
      await supabase
        .from('campaign_queue')
        .delete()
        .eq('campaign_id', campaignId)
        .in('status', ['pending', 'error']);

      // 6. Inserir novos contatos na fila
      const queueItems = contactsToSend.map(c => ({
        campaign_id: campaignId,
        contact_name: c.name,
        contact_phone: c.phone,
        contact_data: { ...((c.extra_data as Record<string, unknown>) || {}), email: c.email },
        status: 'pending',
      }));

      const { error: insertError } = await supabase
        .from('campaign_queue')
        .insert(queueItems);

      if (insertError) throw insertError;

      // 7. Atualizar status da campanha
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ 
          status: 'sending',
          contacts_total: (campaign.contacts_sent || 0) + contactsToSend.length,
        })
        .eq('id', campaignId);

      if (updateError) throw updateError;

      toast({
        title: 'Campanha retomada!',
        description: `${contactsToSend.length} contatos na fila. ${sentPhones.size} já enviados (ignorados).`,
      });

      onRefresh();
      
      // Abrir monitor
      if (onOpenMonitor) {
        onOpenMonitor(campaignId);
      }
    } catch (error) {
      toast({
        title: 'Erro ao retomar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportToExcel = async () => {
    setIsExporting(true);
    try {
      const data = filteredCampaigns.map(c => ({
        'Nome': c.name,
        'Lista': c.list?.name || '-',
        'Status': statusConfig[c.status]?.label || c.status,
        'Enviados': c.contacts_sent || 0,
        'Falhas': c.contacts_failed || 0,
        'Total': c.contacts_total || 0,
        'Taxa de Sucesso': c.contacts_total && c.contacts_total > 0 
          ? `${Math.round(((c.contacts_sent || 0) / c.contacts_total) * 100)}%` 
          : '-',
        'Intervalo (min)': c.send_interval_minutes || '-',
        'Criada em': format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Concluída em': c.completed_at 
          ? format(new Date(c.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) 
          : '-',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Campanhas');
      
      // Auto-size columns
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `campanhas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast({
        title: 'Exportação concluída',
        description: `${data.length} campanha(s) exportada(s) com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar os dados.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExpanded = (campaignId: string) => {
    setExpandedCampaign(prev => prev === campaignId ? null : campaignId);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Campanhas
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportToExcel} 
                  disabled={isExporting || filteredCampaigns.length === 0}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">Exportar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Baixar relatório em Excel</p>
              </TooltipContent>
            </Tooltip>

            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou lista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CampaignStatus)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sending">Enviando</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          {!isLoading && (
            <div className="text-sm text-muted-foreground">
              {filteredCampaigns.length} de {campaigns.length} campanhas
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Lista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Progresso</TableHead>
                  <TableHead className="hidden sm:table-cell">Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              {isLoading ? (
                <SkeletonTableRows rows={3} />
              ) : filteredCampaigns.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {campaigns.length === 0 
                        ? 'Nenhuma campanha encontrada' 
                        : 'Nenhuma campanha corresponde aos filtros'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const status = statusConfig[campaign.status];
                    const isSending = campaign.status === 'sending';
                    const canDelete = ['draft', 'paused', 'completed', 'error'].includes(campaign.status);
                    const isActionLoading = actionLoading === campaign.id;
                    const isExpanded = expandedCampaign === campaign.id;
                    const progressPercent = campaign.contacts_total && campaign.contacts_total > 0
                      ? Math.round(((campaign.contacts_sent || 0) / campaign.contacts_total) * 100)
                      : 0;

                    return (
                      <React.Fragment key={campaign.id}>
                        <TableRow className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleExpanded(campaign.id)}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(campaign.id);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {campaign.list?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="transition-transform hover:scale-105">
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-sm font-medium">{campaign.contacts_sent || 0}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-sm">{campaign.contacts_total || 0}</span>
                              <span className="text-xs text-muted-foreground">({progressPercent}%)</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {/* Monitor button for sending campaigns */}
                              {isSending && onOpenMonitor && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => onOpenMonitor(campaign.id)}
                                      className="text-primary hover:text-primary hover:bg-primary/10"
                                    >
                                      <Activity className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver Monitor</TooltipContent>
                                </Tooltip>
                              )}
                              {isSending && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleStopCampaign(campaign.id)}
                                      disabled={isActionLoading}
                                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    >
                                      {isActionLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <StopCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Pausar campanha</TooltipContent>
                                </Tooltip>
                              )}
                              {campaign.status === 'paused' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleResumeCampaign(campaign.id)}
                                      disabled={isActionLoading}
                                      className="text-primary hover:text-primary hover:bg-primary/10"
                                    >
                                      {isActionLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Play className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Retomar campanha</TooltipContent>
                                </Tooltip>
                              )}
                              {canDelete && (
                                <AlertDialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={isActionLoading}
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          {isActionLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Excluir campanha</TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. A campanha "{campaign.name}" será excluída permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteCampaign(campaign.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={7} className="p-4">
                              <div className="space-y-4 animate-fade-in">
                                {/* Campaign Details */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Stats */}
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-primary" />
                                      Estatísticas
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Enviados:</span>
                                        <span className="font-medium text-primary">{campaign.contacts_sent || 0}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Falhas:</span>
                                        <span className="font-medium text-destructive">{campaign.contacts_failed || 0}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Total:</span>
                                        <span className="font-medium">{campaign.contacts_total || 0}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Intervalo:</span>
                                        <span className="font-medium">{campaign.send_interval_minutes || 5} min</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Dates */}
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-primary" />
                                      Datas
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Criada:</span>
                                        <span>{format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                      </div>
                                      {campaign.completed_at && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Concluída:</span>
                                          <span>{format(new Date(campaign.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Message Preview */}
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium flex items-center gap-2">
                                      <MessageSquare className="h-4 w-4 text-primary" />
                                      Mensagem
                                    </h4>
                                    <div className="bg-background rounded-lg p-3 text-sm max-h-24 overflow-y-auto">
                                      <p className="whitespace-pre-wrap text-muted-foreground line-clamp-3">
                                        {campaign.message || 'Sem mensagem'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Error Message */}
                                {campaign.error_message && (
                                  <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                                    <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-destructive">Erro</p>
                                      <p className="text-sm text-muted-foreground">{campaign.error_message}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
