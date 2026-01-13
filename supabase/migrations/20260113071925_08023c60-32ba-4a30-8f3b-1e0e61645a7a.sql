-- Enable RLS on the contact_send_history view
ALTER VIEW public.contact_send_history SET (security_invoker = true);

-- Since contact_send_history is a VIEW, RLS is inherited from underlying tables
-- The view joins campaign_queue and campaigns tables which already have RLS
-- We need to ensure the view respects RLS by using security_invoker

-- Alternatively, create a security barrier view to enforce RLS
DROP VIEW IF EXISTS public.contact_send_history;

CREATE VIEW public.contact_send_history 
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
    cq.sent_at,
    c.id AS campaign_id,
    c.created_at AS campaign_date,
    c.user_id,
    cq.contact_phone,
    cq.contact_name,
    cq.status,
    cq.error_message,
    c.name AS campaign_name
FROM public.campaign_queue cq
JOIN public.campaigns c ON c.id = cq.campaign_id
WHERE c.user_id = auth.uid();