import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Zap, 
  Moon, 
  TrendingDown,
  Clock,
  Pause
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignAlertsProps {
  errorRate: number;
  isAboveRecommendedSpeed: boolean;
  currentInterval: number;
  isWithinAllowedHours: boolean;
  nextAllowedTime?: Date;
  isHourlyLimitReached: boolean;
  isDailyLimitReached: boolean;
  hourlyRemaining?: number;
  dailyRemaining?: number;
  onPause?: () => void;
  onAdjustSpeed?: () => void;
}

export function CampaignAlerts({
  errorRate,
  isAboveRecommendedSpeed,
  currentInterval,
  isWithinAllowedHours,
  nextAllowedTime,
  isHourlyLimitReached,
  isDailyLimitReached,
  hourlyRemaining,
  dailyRemaining,
  onPause,
  onAdjustSpeed,
}: CampaignAlertsProps) {
  return (
    <div className="space-y-3">
      {/* Alerta de taxa de erro alta */}
      {errorRate > 20 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alta taxa de erro detectada</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Taxa de erro: {errorRate.toFixed(1)}%. Isso pode indicar problemas com o webhook ou bloqueio.
            </span>
            {onPause && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onPause}
                className="ml-4"
              >
                <Pause className="mr-2 h-4 w-4" />
                Pausar
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de velocidade alta */}
      {isAboveRecommendedSpeed && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Zap className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600">Velocidade acima do recomendado</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-amber-600/80">
            <span>
              Intervalo atual: {currentInterval}s. Recomendado: pelo menos 30s para evitar bloqueios.
            </span>
            {onAdjustSpeed && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onAdjustSpeed}
                className="ml-4 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
              >
                Ajustar
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de fora do horário */}
      {!isWithinAllowedHours && nextAllowedTime && (
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Moon className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-600">Campanha pausada</AlertTitle>
          <AlertDescription className="text-blue-600/80">
            Fora do horário permitido. Retoma automaticamente às{' '}
            <span className="font-medium">
              {format(nextAllowedTime, "HH:mm 'de' EEEE", { locale: ptBR })}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de limite horário */}
      {isHourlyLimitReached && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <Clock className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-600">Limite por hora atingido</AlertTitle>
          <AlertDescription className="text-orange-600/80">
            A campanha será retomada automaticamente na próxima hora.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de limite diário */}
      {isDailyLimitReached && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-600">Limite diário atingido</AlertTitle>
          <AlertDescription className="text-red-600/80">
            A campanha será retomada automaticamente amanhã no horário configurado.
          </AlertDescription>
        </Alert>
      )}

      {/* Info de limites restantes */}
      {!isHourlyLimitReached && !isDailyLimitReached && (hourlyRemaining || dailyRemaining) && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          {hourlyRemaining !== undefined && (
            <span>Restante nesta hora: {hourlyRemaining}</span>
          )}
          {dailyRemaining !== undefined && (
            <span>Restante hoje: {dailyRemaining}</span>
          )}
        </div>
      )}
    </div>
  );
}
