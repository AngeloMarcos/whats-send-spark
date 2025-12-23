-- Create campaign_queue table for queue-based sending
CREATE TABLE public.campaign_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_name TEXT,
  contact_phone TEXT NOT NULL,
  contact_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queue processing
CREATE INDEX idx_campaign_queue_campaign_status ON public.campaign_queue(campaign_id, status);
CREATE INDEX idx_campaign_queue_pending ON public.campaign_queue(campaign_id) WHERE status = 'pending';

-- Add send_interval_minutes to campaigns table
ALTER TABLE public.campaigns ADD COLUMN send_interval_minutes INTEGER DEFAULT 5;

-- Enable RLS
ALTER TABLE public.campaign_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for campaign_queue (user can only access their own campaign's queue)
CREATE POLICY "Users can view their own campaign queue"
ON public.campaign_queue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_queue.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert into their own campaign queue"
ON public.campaign_queue
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_queue.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own campaign queue"
ON public.campaign_queue
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_queue.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own campaign queue"
ON public.campaign_queue
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_queue.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Enable realtime for campaign_queue and campaigns
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_queue;