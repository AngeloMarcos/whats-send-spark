import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { 
  SendingConfig, 
  DEFAULT_SENDING_CONFIG, 
  SEND_PROFILES, 
  SendProfile 
} from '@/types/sendingConfig';

export function useSendingConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<SendingConfig>(DEFAULT_SENDING_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('send_interval_seconds, randomize_interval, max_messages_per_hour, max_messages_per_day, allowed_start_time, allowed_end_time, allowed_days, auto_pause_on_limit, send_profile')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          send_interval_seconds: data.send_interval_seconds ?? DEFAULT_SENDING_CONFIG.send_interval_seconds,
          randomize_interval: data.randomize_interval ?? DEFAULT_SENDING_CONFIG.randomize_interval,
          max_messages_per_hour: data.max_messages_per_hour ?? DEFAULT_SENDING_CONFIG.max_messages_per_hour,
          max_messages_per_day: data.max_messages_per_day ?? DEFAULT_SENDING_CONFIG.max_messages_per_day,
          allowed_start_time: data.allowed_start_time?.slice(0, 5) ?? DEFAULT_SENDING_CONFIG.allowed_start_time,
          allowed_end_time: data.allowed_end_time?.slice(0, 5) ?? DEFAULT_SENDING_CONFIG.allowed_end_time,
          allowed_days: data.allowed_days ?? DEFAULT_SENDING_CONFIG.allowed_days,
          auto_pause_on_limit: data.auto_pause_on_limit ?? DEFAULT_SENDING_CONFIG.auto_pause_on_limit,
          send_profile: (data.send_profile as SendProfile) ?? DEFAULT_SENDING_CONFIG.send_profile,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de envio:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = useCallback(async (newConfig: Partial<SendingConfig>) => {
    if (!user) return false;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          send_interval_seconds: newConfig.send_interval_seconds,
          randomize_interval: newConfig.randomize_interval,
          max_messages_per_hour: newConfig.max_messages_per_hour,
          max_messages_per_day: newConfig.max_messages_per_day,
          allowed_start_time: newConfig.allowed_start_time,
          allowed_end_time: newConfig.allowed_end_time,
          allowed_days: newConfig.allowed_days,
          auto_pause_on_limit: newConfig.auto_pause_on_limit,
          send_profile: newConfig.send_profile,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setConfig(prev => ({ ...prev, ...newConfig }));
      toast.success('Configurações de envio salvas!');
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const applyProfile = useCallback((profile: SendProfile) => {
    const profileConfig = SEND_PROFILES[profile];
    const newConfig: Partial<SendingConfig> = {
      send_interval_seconds: profileConfig.interval,
      max_messages_per_hour: profileConfig.hourly,
      max_messages_per_day: profileConfig.daily,
      send_profile: profile,
    };
    setConfig(prev => ({ ...prev, ...newConfig }));
    return newConfig;
  }, []);

  const calculateRandomizedInterval = useCallback((baseInterval: number, randomize: boolean): number => {
    if (!randomize) return baseInterval;
    const variation = baseInterval * 0.2;
    const min = baseInterval - variation;
    const max = baseInterval + variation;
    return Math.round(min + Math.random() * (max - min));
  }, []);

  const isWithinAllowedHours = useCallback((): boolean => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];

    if (!config.allowed_days.includes(currentDay)) {
      return false;
    }

    return currentTime >= config.allowed_start_time && currentTime <= config.allowed_end_time;
  }, [config.allowed_days, config.allowed_start_time, config.allowed_end_time]);

  return {
    config,
    setConfig,
    isLoading,
    isSaving,
    saveConfig,
    applyProfile,
    calculateRandomizedInterval,
    isWithinAllowedHours,
    refresh: fetchConfig,
  };
}
