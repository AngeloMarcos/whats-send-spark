-- Create table for front-end error reports
CREATE TABLE public.app_error_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  route TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  source TEXT NOT NULL DEFAULT 'unknown',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast queries by user
CREATE INDEX idx_app_error_reports_user_created ON public.app_error_reports (user_id, created_at DESC);

-- Create index for message grouping
CREATE INDEX idx_app_error_reports_message ON public.app_error_reports (message);

-- Enable RLS
ALTER TABLE public.app_error_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own errors
CREATE POLICY "Users can view their own error reports"
ON public.app_error_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own errors
CREATE POLICY "Users can insert their own error reports"
ON public.app_error_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own errors (to clear history)
CREATE POLICY "Users can delete their own error reports"
ON public.app_error_reports
FOR DELETE
USING (auth.uid() = user_id);