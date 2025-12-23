import { useState } from 'react';
import { Campaign } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SkeletonTableRows } from '@/components/ui/loading-skeletons';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, Loader2, History, StopCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CampaignHistoryProps {
  campaigns: Campaign[];
  onRefresh: () => void;
  isLoading: boolean;
}

const statusConfig = {
  draft: { label: 'Rascunho', variant: 'secondary' as const },
  scheduled: { label: 'Agendada', variant: 'outline' as const },
  sending: { label: 'Enviando', variant: 'default' as const },
  completed: { label: 'Concluída', variant: 'default' as const },
  error: { label: 'Erro', variant: 'destructive' as const },
  paused: { label: 'Pausada', variant: 'secondary' as const },
};

export function CampaignHistory({ campaigns, onRefresh, isLoading }: CampaignHistoryProps) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Histórico de Campanhas
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Lista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Enviados</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            {isLoading ? (
              <SkeletonTableRows rows={3} />
            ) : campaigns.length === 0 ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma campanha encontrada
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {campaigns.map((campaign) => {
                  const status = statusConfig[campaign.status];
                  const isSending = campaign.status === 'sending';
                  const canDelete = ['draft', 'paused', 'completed', 'error'].includes(campaign.status);
                  const isActionLoading = actionLoading === campaign.id;

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{campaign.list?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{campaign.contacts_sent}</TableCell>
                      <TableCell className="text-center">{campaign.contacts_total}</TableCell>
                      <TableCell>
                        {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isSending && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStopCampaign(campaign.id)}
                              disabled={isActionLoading}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <StopCircle className="h-4 w-4" />
                              )}
                              <span className="ml-1 hidden sm:inline">Parar</span>
                            </Button>
                          )}
                          {canDelete && (
                            <AlertDialog>
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
                                  <span className="ml-1 hidden sm:inline">Excluir</span>
                                </Button>
                              </AlertDialogTrigger>
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
                  );
                })}
              </TableBody>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}