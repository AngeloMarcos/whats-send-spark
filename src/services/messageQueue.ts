import { supabase } from '@/integrations/supabase/client';
import { SendingConfig, QueueSchedulePreview } from '@/types/sendingConfig';
import { format, addSeconds, addMinutes, addDays, setHours, setMinutes, isAfter, isBefore } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

export interface QueueContact {
  id?: string;
  name?: string;
  phone: string;
  [key: string]: unknown;
}

export interface QueueCreationResult {
  success: boolean;
  totalItems: number;
  scheduledItems: number;
  error?: string;
}

export interface ProcessResult {
  success: boolean;
  status: 'sent' | 'failed' | 'paused' | 'completed' | 'skipped';
  message?: string;
  pauseReason?: 'hourly_limit' | 'daily_limit' | 'outside_hours' | 'error' | 'manual';
  resumeAt?: Date;
  nextItem?: unknown;
}

// Calcula intervalo com randomização ±20%
export function calculateRandomizedInterval(baseInterval: number, randomize: boolean): number {
  if (!randomize) return baseInterval;
  const variation = baseInterval * 0.2;
  const min = Math.round(baseInterval - variation);
  const max = Math.round(baseInterval + variation);
  return Math.round(min + Math.random() * (max - min));
}

// Verifica se está dentro do horário permitido
export function isWithinAllowedHours(config: SendingConfig): boolean {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];

  if (!config.allowed_days.includes(currentDay)) {
    return false;
  }

  return currentTime >= config.allowed_start_time && currentTime <= config.allowed_end_time;
}

// Calcula próximo horário permitido
export function getNextAllowedTime(config: SendingConfig): Date {
  const now = new Date();
  const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
  const currentDayIndex = now.getDay();
  
  // Parse horário de início
  const [startHour, startMinute] = config.allowed_start_time.split(':').map(Number);
  const [endHour, endMinute] = config.allowed_end_time.split(':').map(Number);

  // Verificar se ainda pode enviar hoje
  const todayEnd = setMinutes(setHours(now, endHour), endMinute);
  
  if (config.allowed_days.includes(currentDay) && isBefore(now, todayEnd)) {
    // Se antes do início hoje, retorna início de hoje
    const todayStart = setMinutes(setHours(now, startHour), startMinute);
    if (isBefore(now, todayStart)) {
      return todayStart;
    }
  }

  // Encontrar próximo dia permitido
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][nextDayIndex];
    
    if (config.allowed_days.includes(nextDayKey)) {
      const nextDay = addDays(now, i);
      return setMinutes(setHours(nextDay, startHour), startMinute);
    }
  }

  // Fallback: amanhã no horário de início
  const tomorrow = addDays(now, 1);
  return setMinutes(setHours(tomorrow, startHour), startMinute);
}

// Gera preview do cronograma
export function generateSchedulePreview(
  totalContacts: number,
  config: SendingConfig
): QueueSchedulePreview {
  const avgInterval = config.send_interval_seconds;
  const msgsPerHour = Math.min(
    Math.floor(3600 / avgInterval),
    config.max_messages_per_hour
  );
  
  // Horas de trabalho por dia
  const [startH, startM] = config.allowed_start_time.split(':').map(Number);
  const [endH, endM] = config.allowed_end_time.split(':').map(Number);
  const hoursPerDay = (endH + endM/60) - (startH + startM/60);
  const msgsPerDay = Math.min(msgsPerHour * hoursPerDay, config.max_messages_per_day);
  
  const estimatedDays = Math.ceil(totalContacts / msgsPerDay);
  const estimatedDurationMinutes = (totalContacts * avgInterval) / 60;
  
  // Estimar horário de término
  const now = new Date();
  let estimatedEndTime = now;
  
  if (isWithinAllowedHours(config)) {
    estimatedEndTime = addSeconds(now, totalContacts * avgInterval);
  } else {
    estimatedEndTime = getNextAllowedTime(config);
    estimatedEndTime = addSeconds(estimatedEndTime, totalContacts * avgInterval);
  }

  return {
    totalMessages: totalContacts,
    intervalSeconds: avgInterval,
    isRandomized: config.randomize_interval,
    estimatedDurationMinutes,
    estimatedEndTime,
    msgsPerHour,
    estimatedDays,
    allowedStartTime: config.allowed_start_time,
    allowedEndTime: config.allowed_end_time,
  };
}

// Criar fila de mensagens
export async function createMessageQueue(
  campaignId: string,
  contacts: QueueContact[],
  config: SendingConfig,
  message: string
): Promise<QueueCreationResult> {
  try {
    const now = new Date();
    let scheduledTime = isWithinAllowedHours(config) ? now : getNextAllowedTime(config);
    
    const queueItems = contacts.map((contact, index) => {
      const interval = calculateRandomizedInterval(config.send_interval_seconds, config.randomize_interval);
      const scheduled = index === 0 ? scheduledTime : addSeconds(scheduledTime, interval);
      scheduledTime = scheduled;

      return {
        campaign_id: campaignId,
        contact_phone: contact.phone,
        contact_name: contact.name || null,
        contact_data: JSON.parse(JSON.stringify(contact)) as Json,
        status: 'pending' as const,
        scheduled_for: scheduled.toISOString(),
        retry_count: 0,
      };
    });

    // Inserir em batches de 100
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < queueItems.length; i += batchSize) {
      const batch = queueItems.slice(i, i + batchSize);
      const { error } = await supabase
        .from('campaign_queue')
        .insert(batch);

      if (error) {
        console.error('Erro ao inserir batch:', error);
        throw error;
      }
      insertedCount += batch.length;
    }

    return {
      success: true,
      totalItems: contacts.length,
      scheduledItems: insertedCount,
    };
  } catch (error) {
    console.error('Erro ao criar fila:', error);
    return {
      success: false,
      totalItems: contacts.length,
      scheduledItems: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Pausar campanha
export async function pauseCampaign(campaignId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('campaigns')
      .update({ 
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (error) throw error;

    // Pausar itens pendentes na fila
    await supabase
      .from('campaign_queue')
      .update({ status: 'paused' })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    return true;
  } catch (error) {
    console.error('Erro ao pausar campanha:', error);
    return false;
  }
}

// Retomar campanha
export async function resumeCampaign(campaignId: string, config: SendingConfig): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('campaigns')
      .update({ 
        status: 'sending',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (error) throw error;

    // Reagendar itens pausados
    const now = new Date();
    let scheduledTime = isWithinAllowedHours(config) ? now : getNextAllowedTime(config);

    const { data: pausedItems } = await supabase
      .from('campaign_queue')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('status', 'paused')
      .order('created_at', { ascending: true });

    if (pausedItems) {
      for (const item of pausedItems) {
        const interval = calculateRandomizedInterval(config.send_interval_seconds, config.randomize_interval);
        scheduledTime = addSeconds(scheduledTime, interval);

        await supabase
          .from('campaign_queue')
          .update({ 
            status: 'pending',
            scheduled_for: scheduledTime.toISOString()
          })
          .eq('id', item.id);
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao retomar campanha:', error);
    return false;
  }
}

// Atualizar velocidade da campanha
export async function updateCampaignSpeed(
  campaignId: string, 
  newIntervalSeconds: number,
  randomize: boolean
): Promise<boolean> {
  try {
    // Buscar itens pendentes
    const { data: pendingItems } = await supabase
      .from('campaign_queue')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true });

    if (!pendingItems || pendingItems.length === 0) return true;

    // Reagendar com novo intervalo
    let scheduledTime = new Date();
    
    for (const item of pendingItems) {
      const interval = calculateRandomizedInterval(newIntervalSeconds, randomize);
      scheduledTime = addSeconds(scheduledTime, interval);

      await supabase
        .from('campaign_queue')
        .update({ scheduled_for: scheduledTime.toISOString() })
        .eq('id', item.id);
    }

    // Atualizar intervalo na campanha
    await supabase
      .from('campaigns')
      .update({ 
        send_interval_minutes: Math.ceil(newIntervalSeconds / 60),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    return true;
  } catch (error) {
    console.error('Erro ao atualizar velocidade:', error);
    return false;
  }
}

// Verificar limite por hora
export async function checkHourlyLimit(userId: string, limit: number): Promise<{ count: number; remaining: number; isLimitReached: boolean }> {
  const hourKey = format(new Date(), 'yyyy-MM-dd-HH');
  
  const { data } = await supabase
    .from('send_rate_tracking')
    .select('hourly_count')
    .eq('user_id', userId)
    .eq('hour_key', hourKey)
    .single();

  const count = data?.hourly_count ?? 0;
  
  return {
    count,
    remaining: Math.max(0, limit - count),
    isLimitReached: count >= limit,
  };
}

// Verificar limite diário
export async function checkDailyLimit(userId: string, limit: number): Promise<{ count: number; remaining: number; isLimitReached: boolean }> {
  const dayKey = format(new Date(), 'yyyy-MM-dd');
  
  const { data } = await supabase
    .from('send_rate_tracking')
    .select('daily_count')
    .eq('user_id', userId)
    .eq('day_key', dayKey)
    .order('created_at', { ascending: false })
    .limit(1);

  const count = data?.[0]?.daily_count ?? 0;
  
  return {
    count,
    remaining: Math.max(0, limit - count),
    isLimitReached: count >= limit,
  };
}

// Cancelar campanha
export async function cancelCampaign(campaignId: string): Promise<boolean> {
  try {
    const { error: campaignError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'error',
        error_message: 'Campanha cancelada pelo usuário',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (campaignError) throw campaignError;

    // Cancelar itens pendentes
    await supabase
      .from('campaign_queue')
      .update({ status: 'cancelled' })
      .eq('campaign_id', campaignId)
      .in('status', ['pending', 'paused', 'scheduled']);

    return true;
  } catch (error) {
    console.error('Erro ao cancelar campanha:', error);
    return false;
  }
}
