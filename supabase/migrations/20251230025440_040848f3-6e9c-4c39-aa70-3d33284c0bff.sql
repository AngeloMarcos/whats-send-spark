-- Fix view to use SECURITY INVOKER (respects RLS of querying user)
DROP VIEW IF EXISTS contact_send_history;

CREATE VIEW contact_send_history 
WITH (security_invoker = true) AS
SELECT 
  cq.contact_phone,
  cq.contact_name,
  cq.status,
  cq.sent_at,
  cq.error_message,
  c.id as campaign_id,
  c.name as campaign_name,
  c.created_at as campaign_date,
  c.user_id
FROM campaign_queue cq
JOIN campaigns c ON c.id = cq.campaign_id
WHERE cq.status IN ('sent', 'skipped', 'error')
ORDER BY cq.sent_at DESC NULLS LAST;