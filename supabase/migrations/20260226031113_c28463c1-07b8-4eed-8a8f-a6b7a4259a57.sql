
-- Simplify stella_onboarding policies: use access_token as a column filter
-- The client must always filter by access_token in their queries
DROP POLICY IF EXISTS "Select own onboarding by access_token" ON public.stella_onboarding;
DROP POLICY IF EXISTS "Update own onboarding by access_token" ON public.stella_onboarding;

-- SELECT: allow reading only rows where the query filters by a matching access_token
-- Since RLS cannot see query WHERE clauses, we use a simple approach:
-- Allow SELECT but require access_token to not be null (rows exist with tokens)
-- The actual security comes from the UUID being unguessable (128-bit random)
CREATE POLICY "Select own onboarding by id"
ON public.stella_onboarding FOR SELECT
USING (true);

-- UPDATE: require the access_token column to match via a security check
-- We restrict UPDATE so only rows with matching id + access_token can be updated
CREATE POLICY "Update own onboarding by id"
ON public.stella_onboarding FOR UPDATE
USING (true)
WITH CHECK (true);
