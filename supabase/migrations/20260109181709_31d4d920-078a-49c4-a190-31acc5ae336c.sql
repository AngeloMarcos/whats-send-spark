-- Tabela de logs de mensagens
CREATE TABLE public.message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  message_id TEXT UNIQUE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  phone_number TEXT,
  message_text TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, read, failed
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL
);

-- Tabela de gatilhos/triggers de campanha
CREATE TABLE public.campaign_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- new_lead, status_change, date_based
  trigger_condition TEXT,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  delay_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL
);

-- Tabela de respostas dos leads
CREATE TABLE public.lead_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  message_id TEXT,
  response_text TEXT,
  response_type TEXT, -- text, click_link, forwarded, etc
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL
);

-- Tabela de blacklist
CREATE TABLE public.blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  reason TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID,
  user_id UUID NOT NULL
);

-- Adicionar colunas na tabela leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ultimo_contato TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS numero_tentativas INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_logs
CREATE POLICY "Users can view their own message logs" ON public.message_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own message logs" ON public.message_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own message logs" ON public.message_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own message logs" ON public.message_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for campaign_triggers
CREATE POLICY "Users can view their own campaign triggers" ON public.campaign_triggers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaign triggers" ON public.campaign_triggers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaign triggers" ON public.campaign_triggers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaign triggers" ON public.campaign_triggers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for lead_responses
CREATE POLICY "Users can view their own lead responses" ON public.lead_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own lead responses" ON public.lead_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lead responses" ON public.lead_responses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lead responses" ON public.lead_responses FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for blacklist
CREATE POLICY "Users can view their own blacklist" ON public.blacklist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own blacklist" ON public.blacklist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own blacklist" ON public.blacklist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own blacklist" ON public.blacklist FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_message_logs_lead_id ON public.message_logs(lead_id);
CREATE INDEX idx_message_logs_campaign_id ON public.message_logs(campaign_id);
CREATE INDEX idx_message_logs_status ON public.message_logs(status);
CREATE INDEX idx_message_logs_user_id ON public.message_logs(user_id);
CREATE INDEX idx_campaign_triggers_campaign_id ON public.campaign_triggers(campaign_id);
CREATE INDEX idx_campaign_triggers_user_id ON public.campaign_triggers(user_id);
CREATE INDEX idx_lead_responses_lead_id ON public.lead_responses(lead_id);
CREATE INDEX idx_blacklist_phone ON public.blacklist(phone_number);

-- Trigger for updated_at on message_logs
CREATE TRIGGER update_message_logs_updated_at
BEFORE UPDATE ON public.message_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();