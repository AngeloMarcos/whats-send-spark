-- Create campaign_logs table for real-time monitoring
CREATE TABLE public.campaign_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL,
  contact_phone text NOT NULL,
  contact_name text,
  status text NOT NULL DEFAULT 'pending',
  message_sent text,
  error_message text,
  processing_time_ms integer,
  is_test boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Create test_contacts table for test mode
CREATE TABLE public.test_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add is_test_mode column to campaigns table
ALTER TABLE public.campaigns ADD COLUMN is_test_mode boolean DEFAULT false;

-- Enable RLS on campaign_logs
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_logs
CREATE POLICY "Users can view their own campaign logs" ON public.campaign_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_logs.campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can insert into their own campaign logs" ON public.campaign_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_logs.campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own campaign logs" ON public.campaign_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_logs.campaign_id AND campaigns.user_id = auth.uid())
  );

-- Enable RLS on test_contacts
ALTER TABLE public.test_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_contacts
CREATE POLICY "Users can view their own test contacts" ON public.test_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test contacts" ON public.test_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test contacts" ON public.test_contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test contacts" ON public.test_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Enable Realtime for campaign_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_logs;

-- Create index for faster queries
CREATE INDEX idx_campaign_logs_campaign_id ON public.campaign_logs(campaign_id);
CREATE INDEX idx_campaign_logs_created_at ON public.campaign_logs(created_at);
CREATE INDEX idx_test_contacts_user_id ON public.test_contacts(user_id);