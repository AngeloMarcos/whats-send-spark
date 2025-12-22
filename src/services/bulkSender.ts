import { supabase } from '@/integrations/supabase/client';

export interface Contact {
  name?: string;
  phone?: string;
  [key: string]: string | number | null | undefined;
}

export interface BulkMetadata {
  campaignName: string;
  messageBase?: string;
}

export interface BulkPayload {
  contacts: Contact[];
  metadata: BulkMetadata;
}

export interface SendBulkOptions {
  campaignId: string;
  webhookUrl: string;
  contacts: Contact[];
  message: string;
  sendNow: boolean;
  scheduledAt?: string | null;
  sendLimit?: number | null;
}

/**
 * Sends bulk campaign data via the secure Edge Function.
 * The Edge Function validates the webhook URL server-side to prevent SSRF attacks.
 */
export async function sendBulkCampaign(options: SendBulkOptions) {
  const { data, error } = await supabase.functions.invoke('send-bulk-campaign', {
    body: {
      campaignId: options.campaignId,
      webhookUrl: options.webhookUrl,
      contacts: options.contacts,
      message: options.message,
      sendNow: options.sendNow,
      scheduledAt: options.scheduledAt,
      sendLimit: options.sendLimit,
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao enviar campanha');
  }

  return data;
}

// Keep old interface for backwards compatibility with existing code
export interface ContactRow {
  name?: string;
  phone: string;
  [key: string]: string | number | null | undefined;
}
