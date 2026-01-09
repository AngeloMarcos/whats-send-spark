// Types for the automated dispatch system

export interface MessageLog {
  id: string;
  lead_id: string;
  message_id: string | null;
  campaign_id: string | null;
  template_id: string | null;
  phone_number: string | null;
  message_text: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CampaignTrigger {
  id: string;
  campaign_id: string | null;
  trigger_type: 'new_lead' | 'status_change' | 'date_based';
  trigger_condition: string | null;
  template_id: string | null;
  delay_minutes: number;
  is_active: boolean;
  created_at: string;
  user_id: string;
}

export interface LeadResponse {
  id: string;
  lead_id: string;
  message_id: string | null;
  response_text: string | null;
  response_type: 'text' | 'click_link' | 'forwarded' | 'other' | null;
  responded_at: string | null;
  created_at: string;
  user_id: string;
}

export interface BlacklistEntry {
  id: string;
  phone_number: string;
  reason: string | null;
  added_at: string;
  added_by: string | null;
  user_id: string;
}

export interface DispatchPayload {
  event: 'new_lead_active' | 'status_changed_to_ativa' | 'manual_dispatch';
  lead_id?: string;
  campaign_id?: string;
  template_id?: string;
  user_id: string;
  webhook_url?: string;
  message_template?: string;
  filters?: {
    status?: string;
    only_with_phone?: boolean;
    exclude_blacklist?: boolean;
    limit?: number;
  };
}

export interface DispatchResult {
  lead_id: string;
  phone: string;
  status: 'sent' | 'failed' | 'invalid_phone' | 'blacklisted' | 'max_retries';
  message_id?: string;
  error?: string;
}

export interface DispatchMetrics {
  total: number;
  sent: number;
  failed: number;
  invalid_phone: number;
  blacklisted: number;
  max_retries: number;
}

export interface DispatchResponse {
  success: boolean;
  message: string;
  metrics?: DispatchMetrics;
  results?: DispatchResult[];
  timestamp: string;
  queued?: boolean;
  error?: string;
}
