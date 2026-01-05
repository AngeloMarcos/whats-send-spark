import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SpeedAdjustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentInterval: number;
  randomize: boolean;
  onApply: (newInterval: number, randomize: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function SpeedAdjustModal({
  open,
  onOpenChange,
  currentInterval,
  randomize,
  onApply,
  isLoading = false,
}: SpeedAdjustModalProps) {
  const [newInterval, setNewInterval] = useState(currentInterval);
  const [newRandomize, setNewRandomize] = useState(randomize);

  const handleApply = async () => {
    await onApply(newInterval, newRandomize);
    onOpenChange(false);
  };

  const getSpeedLabel = (interval: number): { label: string; color: string } => {
    if (interval <= 15) return { label: 'Muito Rápido', color: 'text-red-500' };
    if (interval <= 30) return { label: 'Rápido', color: 'text-amber-500' };
    if (interval <= 60) return { label: 'Moderado', color: 'text-green-500' };
    return { label: 'Lento', color: 'text-blue-500' };
  };

  const speedInfo = getSpeedLabel(newInterval);
  const randomizedRange = newRandomize
    ? { min: Math.round(newInterval * 0.8), max: Math.round(newInterval * 1.2) }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ajustar Velocidade de Envio
          </DialogTitle>
          <DialogDescription>
            Altere o intervalo entre mensagens em tempo real
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Slider de intervalo */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Intervalo entre mensagens</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-lg px-3">
                  {newInterval}s
                </Badge>
                <span className={`text-sm font-medium ${speedInfo.color}`}>
                  {speedInfo.label}
                </span>
              </div>
            </div>

            <Slider
              value={[newInterval]}
              onValueChange={([value]) => setNewInterval(value)}
              min={10}
              max={300}
              step={5}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10s (rápido)</span>
              <span>150s</span>
              <span>300s (lento)</span>
            </div>
          </div>

          {/* Toggle de randomização */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Randomização ±20%</Label>
              {randomizedRange && (
                <p className="text-sm text-muted-foreground">
                  Variação: {randomizedRange.min}s a {randomizedRange.max}s
                </p>
              )}
            </div>
            <Switch
              checked={newRandomize}
              onCheckedChange={setNewRandomize}
            />
          </div>

          {/* Alerta para velocidade alta */}
          {newInterval < 20 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Intervalos muito curtos aumentam o risco de bloqueio pelo WhatsApp.
                Recomendamos pelo menos 30 segundos.
              </AlertDescription>
            </Alert>
          )}

          {/* Comparação */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Atual:</span>
              <span className="font-medium">{currentInterval}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Novo:</span>
              <span className="font-medium">{newInterval}s</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t">
              <span className="text-muted-foreground">Msgs/hora estimadas:</span>
              <span className="font-medium">
                ~{Math.floor(3600 / newInterval)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              'Aplicar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
