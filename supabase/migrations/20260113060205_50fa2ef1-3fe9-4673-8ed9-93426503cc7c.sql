-- Fix the audit_logs RLS policy to use correct has_role signature (1 parameter instead of 2)
DROP POLICY IF EXISTS "Users view own logs or admins view all" ON public.audit_logs;

CREATE POLICY "Users view own logs or admins view all" ON public.audit_logs
  FOR SELECT USING (
    auth.uid() = user_id OR public.has_role('admin'::app_role)
  );