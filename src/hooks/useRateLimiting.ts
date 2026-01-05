import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';
import { RateLimitStatus } from '@/types/sendingConfig';

export function useRateLimiting() {
  const { user } = useAuth();
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getHourKey = (date: Date = new Date()): string => {
    return format(date, 'yyyy-MM-dd-HH');
  };

  const getDayKey = (date: Date = new Date()): string => {
    return format(date, 'yyyy-MM-dd');
  };

  const checkLimits = useCallback(async (hourlyLimit: number, dailyLimit: number): Promise<RateLimitStatus | null> => {
    if (!user) return null;
    
    setIsLoading(true);
    try {
      const now = new Date();
      const hourKey = getHourKey(now);
      const dayKey = getDayKey(now);

      // Buscar contagem atual
      const { data, error } = await supabase
        .from('send_rate_tracking')
        .select('hourly_count, daily_count')
        .eq('user_id', user.id)
        .eq('hour_key', hourKey)
        .single();

      let hourlyCount = 0;
      let dailyCount = 0;

      if (!error && data) {
        hourlyCount = data.hourly_count;
        dailyCount = data.daily_count;
      } else {
        // Buscar contagem diária de outras horas
        const { data: dailyData } = await supabase
          .from('send_rate_tracking')
          .select('daily_count')
          .eq('user_id', user.id)
          .eq('day_key', dayKey)
          .order('created_at', { ascending: false })
          .limit(1);

        if (dailyData && dailyData.length > 0) {
          dailyCount = dailyData[0].daily_count;
        }
      }

      const result: RateLimitStatus = {
        hourlyCount,
        dailyCount,
        hourlyLimit,
        dailyLimit,
        hourlyRemaining: Math.max(0, hourlyLimit - hourlyCount),
        dailyRemaining: Math.max(0, dailyLimit - dailyCount),
        isHourlyLimitReached: hourlyCount >= hourlyLimit,
        isDailyLimitReached: dailyCount >= dailyLimit,
      };

      setStatus(result);
      return result;
    } catch (error) {
      console.error('Erro ao verificar limites:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const incrementCount = useCallback(async (campaignId?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const now = new Date();
      const hourKey = getHourKey(now);
      const dayKey = getDayKey(now);

      // Tentar atualizar registro existente
      const { data: existing } = await supabase
        .from('send_rate_tracking')
        .select('id, hourly_count, daily_count')
        .eq('user_id', user.id)
        .eq('hour_key', hourKey)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('send_rate_tracking')
          .update({
            hourly_count: existing.hourly_count + 1,
            daily_count: existing.daily_count + 1,
            updated_at: now.toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Buscar contagem diária atual
        const { data: dailyData } = await supabase
          .from('send_rate_tracking')
          .select('daily_count')
          .eq('user_id', user.id)
          .eq('day_key', dayKey)
          .order('created_at', { ascending: false })
          .limit(1);

        const currentDailyCount = dailyData?.[0]?.daily_count ?? 0;

        const { error } = await supabase
          .from('send_rate_tracking')
          .insert({
            user_id: user.id,
            campaign_id: campaignId,
            hour_key: hourKey,
            day_key: dayKey,
            hourly_count: 1,
            daily_count: currentDailyCount + 1,
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao incrementar contagem:', error);
      return false;
    }
  }, [user]);

  const resetHourlyCount = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const hourKey = getHourKey();
      
      const { error } = await supabase
        .from('send_rate_tracking')
        .update({ hourly_count: 0, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('hour_key', hourKey);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao resetar contagem horária:', error);
      return false;
    }
  }, [user]);

  return {
    status,
    isLoading,
    checkLimits,
    incrementCount,
    resetHourlyCount,
    getHourKey,
    getDayKey,
  };
}
