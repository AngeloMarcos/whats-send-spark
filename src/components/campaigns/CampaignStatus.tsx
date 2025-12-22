import { Campaign } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, CheckCircle, XCircle, Clock } from 'lucide-react';

interface CampaignStatusProps {
  campaign: Campaign | null;
}

const statusConfig = {
  draft: { label: 'Rascunho', variant: 'secondary' as const, icon: Clock },
  scheduled: { label: 'Agendada', variant: 'outline' as const, icon: Clock },
  sending: { label: 'Enviando', variant: 'default' as const, icon: Activity },
  completed: { label: 'Concluída', variant: 'default' as const, icon: CheckCircle },
  error: { label: 'Erro', variant: 'destructive' as const, icon: XCircle },
  paused: { label: 'Pausada', variant: 'secondary' as const, icon: Clock },
};

export function CampaignStatus({ campaign }: CampaignStatusProps) {
  if (!campaign) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status da Campanha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            Nenhuma campanha ativa
          </p>
        </CardContent>
      </Card>
    );
  }

  const status = statusConfig[campaign.status];
  const StatusIcon = status.icon;
  const progress = campaign.contacts_total > 0 
    ? Math.round((campaign.contacts_sent / campaign.contacts_total) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status da Campanha
          </CardTitle>
          <Badge variant={status.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">{campaign.name}</p>
          {campaign.list && (
            <p className="text-xs text-muted-foreground">Lista: {campaign.list.name}</p>
          )}
        </div>

        {/* Progress Bar */}
        {campaign.status === 'sending' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 animate-pulse-glow"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted rounded-lg p-2">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{campaign.contacts_total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="bg-muted rounded-lg p-2">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{campaign.contacts_sent}</p>
            <p className="text-xs text-muted-foreground">Enviados</p>
          </div>
          <div className="bg-muted rounded-lg p-2">
            <XCircle className="h-4 w-4 mx-auto mb-1 text-destructive" />
            <p className="text-lg font-bold">{campaign.contacts_failed}</p>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </div>
        </div>

        {/* Execution ID */}
        {campaign.execution_id && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Execution ID:</span> {campaign.execution_id}
          </div>
        )}

        {/* Error Message */}
        {campaign.error_message && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">
            {campaign.error_message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}