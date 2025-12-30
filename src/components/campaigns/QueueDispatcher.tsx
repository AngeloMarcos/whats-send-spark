import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Timer,
  Users,
  AlertTriangle,
  X,
  Ban,
  RefreshCcw,
  SkipForward,
} from 'lucide-react';
import { DispatcherState, QueueItem } from '@/hooks/useQueueDispatcher';

interface QueueDispatcherProps {
  state: DispatcherState;
  progress: number;
  secondsUntilNext: number;
  remainingCount: number;
  onStart: (intervalMinutes: number) => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onExcludeContact?: (queueItemId: string) => void;
  onRetryFailed?: () => void;
  totalContacts: number;
  disabled?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function QueueDispatcher({
  state,
  progress,
  secondsUntilNext,
  remainingCount,
  onStart,
  onPause,
  onResume,
  onCancel,
  onExcludeContact,
  onRetryFailed,
  totalContacts,
  disabled = false,
}: QueueDispatcherProps) {
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [displaySeconds, setDisplaySeconds] = useState(secondsUntilNext);
  const [showPendingList, setShowPendingList] = useState(false);

  // Update countdown display
  useEffect(() => {
    setDisplaySeconds(secondsUntilNext);
    
    if (secondsUntilNext > 0) {
      const timer = setInterval(() => {
        setDisplaySeconds(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [secondsUntilNext]);

  // Not started yet - show configuration
  if (!state.isRunning && state.sentCount === 0 && state.failedCount === 0) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="h-5 w-5 text-primary" />
            Configurar Intervalo de Envio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Intervalo entre envios</Label>
              <Badge variant="outline" className="font-mono">
                {intervalMinutes} min
              </Badge>
            </div>
            <Slider
              value={[intervalMinutes]}
              onValueChange={(v) => setIntervalMinutes(v[0])}
              min={1}
              max={60}
              step={1}
              className="w-full"
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 min</span>
              <span>30 min</span>
              <span>60 min</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Tempo estimado: ~{Math.ceil((totalContacts - 1) * intervalMinutes)} minutos
            </span>
          </div>

          <Button
            onClick={() => onStart(intervalMinutes)}
            className="w-full"
            disabled={disabled || totalContacts === 0}
          >
            <Play className="mr-2 h-4 w-4" />
            Iniciar Disparo com Intervalo
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Running or completed - show status
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" />
            Fila de Disparo
          </div>
          {state.isRunning && !state.isPaused && (
            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Enviando
            </Badge>
          )}
          {state.isPaused && (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/30">
              <Pause className="h-3 w-3 mr-1" />
              Pausado
            </Badge>
          )}
          {!state.isRunning && (state.sentCount > 0 || state.failedCount > 0) && (
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Concluído
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">{state.totalContacts}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/10">
            <div className="text-xl font-bold text-emerald-600">{state.sentCount}</div>
            <div className="text-xs text-muted-foreground">Enviados</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10">
            <div className="text-xl font-bold text-red-600">{state.failedCount}</div>
            <div className="text-xs text-muted-foreground">Erros</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/10">
            <div className="text-xl font-bold text-amber-600">{state.excludedCount}</div>
            <div className="text-xs text-muted-foreground">Excluídos</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/10">
            <div className="text-xl font-bold text-blue-600">{state.skippedCount || 0}</div>
            <div className="text-xs text-muted-foreground">Ignorados</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/10">
            <div className="text-xl font-bold text-primary">{remainingCount}</div>
            <div className="text-xs text-muted-foreground">Na Fila</div>
          </div>
        </div>

        {/* Skipped warning */}
        {(state.skippedCount || 0) > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
            <SkipForward className="h-4 w-4 text-blue-500" />
            <span className="text-blue-700 dark:text-blue-400">
              {state.skippedCount} contato{state.skippedCount > 1 ? 's' : ''} ignorado{state.skippedCount > 1 ? 's' : ''} (duplicados)
            </span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Current Contact */}
        {state.currentContact && state.isRunning && !state.isPaused && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <div className="flex-1">
              <div className="font-medium text-sm">Enviando agora:</div>
              <div className="text-sm text-muted-foreground">
                {state.currentContact.contact_name || 'Sem nome'} ({state.currentContact.contact_phone})
              </div>
            </div>
          </div>
        )}

        {/* Next Send Countdown */}
        {state.isRunning && !state.isPaused && displaySeconds > 0 && remainingCount > 0 && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted/50">
            <Timer className="h-5 w-5 text-primary" />
            <span className="text-lg font-mono font-bold">
              {formatTime(displaySeconds)}
            </span>
            <span className="text-sm text-muted-foreground">até o próximo envio</span>
          </div>
        )}

        {/* Control Buttons */}
        {state.isRunning && (
          <div className="flex gap-2">
            {state.isPaused ? (
              <Button onClick={onResume} className="flex-1" variant="default">
                <Play className="mr-2 h-4 w-4" />
                Retomar
              </Button>
            ) : (
              <Button onClick={onPause} className="flex-1" variant="secondary">
                <Pause className="mr-2 h-4 w-4" />
                Pausar
              </Button>
            )}
            <Button onClick={onCancel} variant="destructive">
              <Square className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        )}

        {/* Pending Contacts List with Exclude Option */}
        {state.isRunning && remainingCount > 0 && onExcludeContact && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Contatos pendentes ({remainingCount})
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPendingList(!showPendingList)}
              >
                {showPendingList ? 'Ocultar' : 'Ver lista'}
              </Button>
            </div>
            {showPendingList && (
              <ScrollArea className="h-40 rounded-md border">
                <div className="p-2 space-y-1">
                  {state.queue.slice(0, 20).map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/50 hover:bg-muted"
                    >
                      <span className="truncate flex-1">
                        {item.contact_name || 'Sem nome'} - {item.contact_phone}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                        onClick={() => onExcludeContact(item.id)}
                        title="Excluir da fila"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {remainingCount > 20 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      +{remainingCount - 20} contatos não exibidos
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Recent Sent Log */}
        {state.recentlySent.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Últimos enviados
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {state.recentlySent.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  className="flex items-center gap-2 text-xs p-2 rounded bg-emerald-500/10"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="truncate">
                    {item.contact_name || 'Sem nome'} - {item.contact_phone}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Errors Log */}
        {state.recentErrors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Erros recentes
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {state.recentErrors.map((item, idx) => (
                <div 
                  key={item.contact.id || idx}
                  className="flex items-center gap-2 text-xs p-2 rounded bg-red-500/10"
                >
                  <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                  <span className="truncate">
                    {item.contact.contact_name || 'Sem nome'} - {item.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retry Failed Button */}
        {!state.isRunning && state.failedCount > 0 && onRetryFailed && (
          <Button
            onClick={onRetryFailed}
            variant="outline"
            className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retentar {state.failedCount} Contato{state.failedCount > 1 ? 's' : ''} com Erro
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
