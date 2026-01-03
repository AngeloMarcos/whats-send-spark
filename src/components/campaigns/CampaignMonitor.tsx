import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Pause,
  Play,
  RefreshCw,
  Radio,
  FlaskConical,
  Loader2
} from 'lucide-react';
import { useCampaignMonitor } from '@/hooks/useCampaignMonitor';
import { useCampaignControl } from '@/hooks/useCampaignControl';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignMonitorProps {
  campaignId: string;
}

export function CampaignMonitor({ campaignId }: CampaignMonitorProps) {
  const { logs, chartData, stats, isLive, campaign, toggleLive, refresh } = useCampaignMonitor(campaignId);
  const { pause, resume, isLoading: controlLoading } = useCampaignControl(campaignId);

  // Derive isPaused from campaign status
  const isPaused = campaign?.status === 'paused';

  const statusConfig = useMemo(() => ({
    sending: { label: 'Enviando', color: 'bg-blue-500', icon: Activity },
    paused: { label: 'Pausada', color: 'bg-yellow-500', icon: Pause },
    completed: { label: 'Concluída', color: 'bg-green-500', icon: CheckCircle },
    error: { label: 'Erro', color: 'bg-destructive', icon: AlertCircle },
    draft: { label: 'Rascunho', color: 'bg-muted', icon: Clock },
    scheduled: { label: 'Agendada', color: 'bg-purple-500', icon: Clock },
  }), []);

  const currentStatus = campaign?.status as keyof typeof statusConfig || 'draft';
  const StatusIcon = statusConfig[currentStatus]?.icon || Clock;

  if (!campaign) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Monitor de Campanha</CardTitle>
              {campaign.is_test_mode && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  <FlaskConical className="h-3 w-3 mr-1" />
                  MODO TESTE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLive}
                className={isLive ? 'text-green-600' : 'text-muted-foreground'}
              >
                <Radio className={`h-4 w-4 mr-1 ${isLive ? 'animate-pulse' : ''}`} />
                {isLive ? 'Ao Vivo' : 'Pausado'}
              </Button>
              <Button variant="ghost" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="font-medium text-foreground">{campaign.name}</span>
            <Badge className={statusConfig[currentStatus]?.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig[currentStatus]?.label}
            </Badge>
            <span>Intervalo: {campaign.send_interval_minutes}min</span>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviados</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalSent}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{campaign.contacts_total}
                  </span>
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Na Fila</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalPending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-destructive">{stats.totalErrors}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-primary">{stats.successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mensagens Enviadas ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  name="Total Enviado"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="errors" 
                  name="Erros"
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              Aguardando dados de envio...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Log */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Log de Envio Ao Vivo</CardTitle>
            <Badge variant="outline" className="text-xs">
              {logs.length} registros
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            {logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm"
                  >
                    <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {log.sent_at 
                        ? format(new Date(log.sent_at), 'HH:mm:ss', { locale: ptBR })
                        : '--:--:--'
                      }
                    </span>
                    {log.status === 'sent' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="font-medium truncate">
                      {log.contact_name || 'Sem nome'}
                    </span>
                    <span className="text-muted-foreground truncate">
                      ({log.contact_phone})
                    </span>
                    {log.is_test && (
                      <Badge variant="outline" className="text-xs shrink-0">Teste</Badge>
                    )}
                    {log.status === 'sent' ? (
                      <Badge variant="outline" className="text-green-600 border-green-300 shrink-0">
                        Enviado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive border-destructive/30 shrink-0">
                        {log.error_message || 'Erro'}
                      </Badge>
                    )}
                    {log.processing_time_ms && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {log.processing_time_ms}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum envio registrado ainda...
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      {(campaign?.status === 'sending' || campaign?.status === 'paused') && (
        <div className="flex justify-center gap-3">
          {isPaused ? (
            <Button onClick={resume} disabled={controlLoading} className="gap-2">
              {controlLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Retomar Campanha
            </Button>
          ) : (
            <Button variant="outline" onClick={pause} disabled={controlLoading} className="gap-2">
              {controlLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Pausar Campanha
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
