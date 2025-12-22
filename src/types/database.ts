export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'error' | 'paused';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  n8n_webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ListType = 'google_sheets' | 'local';

export interface List {
  id: string;
  user_id: string;
  name: string;
  list_type: ListType;
  sheet_id: string | null;
  sheet_tab_id: string | null;
  description: string | null;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  list_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  extra_data: Record<string, unknown>;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  content: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  list_id: string | null;
  template_id: string | null;
  message: string;
  status: CampaignStatus;
  send_now: boolean;
  scheduled_at: string | null;
  send_limit: number | null;
  contacts_total: number;
  contacts_sent: number;
  contacts_failed: number;
  execution_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Joined data
  list?: List;
  template?: Template;
}