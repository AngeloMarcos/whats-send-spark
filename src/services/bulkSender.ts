import { supabase } from '@/integrations/supabase/client';

export interface ContactRow {
  name?: string;
  phone: string;
  [key: string]: string | number | null | undefined;
}

export interface BulkPayload {
  campaignId: string;
  contacts: ContactRow[];
  message: string;
  webhookUrl: string;
  sendNow: boolean;
  scheduledAt: string | null;
  sendLimit: number | null;
}

export async function sendBulkToBackend(payload: BulkPayload) {
  const { data, error } = await supabase.functions.invoke('send-bulk-campaign', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Erro ao enviar lista para o webhook');
  }

  return data;
}
