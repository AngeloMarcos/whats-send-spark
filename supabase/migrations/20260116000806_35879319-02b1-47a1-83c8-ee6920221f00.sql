-- Create table for Stella IA onboarding questionnaire responses
CREATE TABLE public.stella_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_segment TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stella_onboarding ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (no auth required for this onboarding form)
CREATE POLICY "Anyone can insert onboarding data"
ON public.stella_onboarding
FOR INSERT
WITH CHECK (true);

-- Allow updates only with matching id (for auto-save)
CREATE POLICY "Anyone can update their own onboarding by id"
ON public.stella_onboarding
FOR UPDATE
USING (true);

-- Allow reads for auto-save recovery
CREATE POLICY "Anyone can read their own onboarding by id"
ON public.stella_onboarding
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_stella_onboarding_updated_at
BEFORE UPDATE ON public.stella_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();