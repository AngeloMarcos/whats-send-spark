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
  // Input validation
  if (!options.campaignId?.trim()) {
    throw new Error('Campaign ID é obrigatório');
  }

  if (!options.webhookUrl?.trim()) {
    throw new Error('Webhook URL é obrigatório');
  }

  if (!Array.isArray(options.contacts) || options.contacts.length === 0) {
    throw new Error('Lista de contatos vazia ou inválida');
  }

  if (!options.message?.trim()) {
    throw new Error('Mensagem é obrigatória');
  }

  // Filter and validate contacts - only include those with valid phones
  const validContacts = options.contacts.filter(contact => {
    if (!contact) return false;
    const phone = String(contact.phone || '').replace(/\D/g, '');
    return phone.length >= 10 && phone.length <= 15;
  });

  if (validContacts.length === 0) {
    throw new Error('Nenhum contato com telefone válido');
  }

  // Log if some contacts were filtered out
  if (validContacts.length < options.contacts.length) {
    console.warn(`${options.contacts.length - validContacts.length} contatos ignorados por telefone inválido`);
  }

  const { data, error } = await supabase.functions.invoke('send-bulk-campaign', {
    body: {
      campaignId: options.campaignId.trim(),
      webhookUrl: options.webhookUrl.trim(),
      contacts: validContacts,
      message: options.message.trim(),
      sendNow: options.sendNow ?? true,
      scheduledAt: options.scheduledAt || null,
      sendLimit: options.sendLimit || null,
    },
  });

  if (error) {
    console.error('Bulk campaign error:', error);
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
