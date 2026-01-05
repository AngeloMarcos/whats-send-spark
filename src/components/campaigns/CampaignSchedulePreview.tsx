import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  MessageSquare, 
  Timer, 
  Calendar, 
  TrendingUp,
  Shuffle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SendingConfig } from '@/types/sendingConfig';
import { generateSchedulePreview } from '@/services/messageQueue';
import { SkeletonSchedulePreview } from '@/components/ui/loading-skeletons';

interface CampaignSchedulePreviewProps {
  totalContacts: number;
  config: SendingConfig;
  isLoading?: boolean;
}

export function CampaignSchedulePreview({ totalContacts, config, isLoading }: CampaignSchedulePreviewProps) {
  if (isLoading) {
    return <SkeletonSchedulePreview />;
  }
  const preview = useMemo(() => {
    return generateSchedulePreview(totalContacts, config);
  }, [totalContacts, config]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} minutos`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours < 24) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours} horas`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} dias`;
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Preview do Cronograma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col items-center p-3 bg-background rounded-lg border">
            <MessageSquare className="h-5 w-5 text-primary mb-1" />
            <span className="text-2xl font-bold">{preview.totalMessages}</span>
            <span className="text-xs text-muted-foreground">mensagens</span>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-background rounded-lg border">
            <Timer className="h-5 w-5 text-amber-500 mb-1" />
            <span className="text-2xl font-bold">{preview.intervalSeconds}s</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              intervalo
              {preview.isRandomized && <Shuffle className="h-3 w-3" />}
            </span>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-background rounded-lg border">
            <TrendingUp className="h-5 w-5 text-green-500 mb-1" />
            <span className="text-2xl font-bold">{preview.msgsPerHour}</span>
            <span className="text-xs text-muted-foreground">msgs/hora</span>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-background rounded-lg border">
            <Clock className="h-5 w-5 text-blue-500 mb-1" />
            <span className="text-2xl font-bold">{preview.estimatedDays}</span>
            <span className="text-xs text-muted-foreground">
              {preview.estimatedDays === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        </div>

        {/* Detalhes */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Duração estimada:</span>
            <Badge variant="secondary">
              {formatDuration(preview.estimatedDurationMinutes)}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Previsão de término:</span>
            <Badge variant="outline">
              {format(preview.estimatedEndTime, "dd/MM 'às' HH:mm", { locale: ptBR })}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Horário de envio:</span>
            <span className="font-medium">
              {preview.allowedStartTime} às {preview.allowedEndTime}
            </span>
          </div>
          
          {preview.isRandomized && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Variação de intervalo:</span>
              <span className="font-medium">
                ±20% ({Math.round(preview.intervalSeconds * 0.8)}s - {Math.round(preview.intervalSeconds * 1.2)}s)
              </span>
            </div>
          )}
        </div>

        {/* Barra de progresso visual */}
        <div className="pt-2">
          <Progress value={0} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0/{preview.totalMessages} enviadas</span>
            <span>
              Término: {formatDistanceToNow(preview.estimatedEndTime, { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
