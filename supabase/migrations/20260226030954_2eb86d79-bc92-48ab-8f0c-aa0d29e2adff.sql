
-- Fix stella_onboarding: add access_token column and restrict policies
-- Add an access_token column for record-level access control
ALTER TABLE public.stella_onboarding ADD COLUMN IF NOT EXISTS access_token uuid DEFAULT gen_random_uuid();

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert onboarding data" ON public.stella_onboarding;
DROP POLICY IF EXISTS "Anyone can update their own onboarding by id" ON public.stella_onboarding;
DROP POLICY IF EXISTS "Anyone can read their own onboarding by id" ON public.stella_onboarding;

-- INSERT: anyone can insert (public form), but access_token auto-generated
CREATE POLICY "Anyone can insert onboarding data"
ON public.stella_onboarding FOR INSERT
WITH CHECK (true);

-- SELECT: only by matching access_token (passed as header or matched by id+token)
CREATE POLICY "Select own onboarding by access_token"
ON public.stella_onboarding FOR SELECT
USING (
  access_token::text = coalesce(
    current_setting('request.headers', true)::json->>'x-access-token',
    ''
  )
);

-- UPDATE: only by matching access_token
CREATE POLICY "Update own onboarding by access_token"
ON public.stella_onboarding FOR UPDATE
USING (
  access_token::text = coalesce(
    current_setting('request.headers', true)::json->>'x-access-token',
    ''
  )
);
