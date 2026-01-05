import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Zap, 
  Timer, 
  Calendar, 
  Shield, 
  Save,
  Loader2,
  Info
} from 'lucide-react';
import { 
  SendingConfig, 
  SEND_PROFILES, 
  WEEKDAYS, 
  SendProfile,
  DEFAULT_SENDING_CONFIG 
} from '@/types/sendingConfig';
import { useSendingConfig } from '@/hooks/useSendingConfig';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SendingConfigSection() {
  const { config, setConfig, isLoading, isSaving, saveConfig, applyProfile } = useSendingConfig();
  const [localConfig, setLocalConfig] = useState<SendingConfig>(DEFAULT_SENDING_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setLocalConfig(config);
    }
  }, [config, isLoading]);

  const handleChange = (key: keyof SendingConfig, value: unknown) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleProfileSelect = (profile: SendProfile) => {
    const profileConfig = SEND_PROFILES[profile];
    setLocalConfig(prev => ({
      ...prev,
      send_interval_seconds: profileConfig.interval,
      max_messages_per_hour: profileConfig.hourly,
      max_messages_per_day: profileConfig.daily,
      send_profile: profile,
    }));
    setHasChanges(true);
  };

  const handleDayToggle = (day: string, checked: boolean) => {
    const newDays = checked 
      ? [...localConfig.allowed_days, day]
      : localConfig.allowed_days.filter(d => d !== day);
    handleChange('allowed_days', newDays);
  };

  const handleSave = async () => {
    const success = await saveConfig(localConfig);
    if (success) {
      setHasChanges(false);
    }
  };

  const getRandomizedRange = () => {
    if (!localConfig.randomize_interval) return null;
    const variation = localConfig.send_interval_seconds * 0.2;
    const min = Math.round(localConfig.send_interval_seconds - variation);
    const max = Math.round(localConfig.send_interval_seconds + variation);
    return { min, max };
  };

  const randomizedRange = getRandomizedRange();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Perfis Pré-Configurados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Perfis de Envio
          </CardTitle>
          <CardDescription>
            Escolha um perfil pré-configurado ou personalize as configurações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(SEND_PROFILES) as [SendProfile, typeof SEND_PROFILES[SendProfile]][]).map(([key, profile]) => (
              <Button
                key={key}
                variant={localConfig.send_profile === key ? 'default' : 'outline'}
                className="flex flex-col h-auto py-4 gap-1"
                onClick={() => handleProfileSelect(key)}
              >
                <span className="text-2xl">{profile.emoji}</span>
                <span className="font-medium">{profile.label}</span>
                <span className="text-xs text-muted-foreground">
                  {profile.interval}s • {profile.hourly}/h • {profile.daily}/dia
                </span>
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {SEND_PROFILES[localConfig.send_profile].description}
          </p>
        </CardContent>
      </Card>

      {/* Intervalos Entre Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Intervalos Entre Mensagens
          </CardTitle>
          <CardDescription>
            Configure o tempo de espera entre cada mensagem enviada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Intervalo base</Label>
              <Badge variant="secondary" className="font-mono">
                {localConfig.send_interval_seconds}s
              </Badge>
            </div>
            <Slider
              value={[localConfig.send_interval_seconds]}
              onValueChange={([value]) => handleChange('send_interval_seconds', value)}
              min={10}
              max={300}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10s (rápido)</span>
              <span>300s (lento)</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                Randomização ±20%
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Adiciona variação aleatória no intervalo para parecer mais natural</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              {randomizedRange && (
                <p className="text-sm text-muted-foreground">
                  Intervalo real: entre {randomizedRange.min}s e {randomizedRange.max}s
                </p>
              )}
            </div>
            <Switch
              checked={localConfig.randomize_interval}
              onCheckedChange={(checked) => handleChange('randomize_interval', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Limites de Envio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Limites de Envio
          </CardTitle>
          <CardDescription>
            Defina limites para evitar bloqueios do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max-per-hour">Máximo por hora</Label>
              <Input
                id="max-per-hour"
                type="number"
                min={1}
                max={100}
                value={localConfig.max_messages_per_hour}
                onChange={(e) => handleChange('max_messages_per_hour', parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 20-40 mensagens/hora
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-per-day">Máximo por dia</Label>
              <Input
                id="max-per-day"
                type="number"
                min={1}
                max={500}
                value={localConfig.max_messages_per_day}
                onChange={(e) => handleChange('max_messages_per_day', parseInt(e.target.value) || 200)}
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 100-200 mensagens/dia
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pausar automaticamente ao atingir limites</Label>
              <p className="text-sm text-muted-foreground">
                A campanha será pausada e retomada automaticamente
              </p>
            </div>
            <Switch
              checked={localConfig.auto_pause_on_limit}
              onCheckedChange={(checked) => handleChange('auto_pause_on_limit', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Horários Permitidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horários Permitidos
          </CardTitle>
          <CardDescription>
            Defina quando as mensagens podem ser enviadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start-time">Horário de início</Label>
              <Input
                id="start-time"
                type="time"
                value={localConfig.allowed_start_time}
                onChange={(e) => handleChange('allowed_start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Horário de término</Label>
              <Input
                id="end-time"
                type="time"
                value={localConfig.allowed_end_time}
                onChange={(e) => handleChange('allowed_end_time', e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dias da semana permitidos
            </Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={day.value}
                    checked={localConfig.allowed_days.includes(day.value)}
                    onCheckedChange={(checked) => handleDayToggle(day.value, !!checked)}
                  />
                  <label
                    htmlFor={day.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Fora do horário permitido, a campanha será pausada automaticamente e retomará no próximo horário válido.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
