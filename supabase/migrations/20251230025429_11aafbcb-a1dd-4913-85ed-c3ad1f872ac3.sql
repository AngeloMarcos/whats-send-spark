-- Add UNIQUE constraint to prevent duplicate contacts in the same campaign
ALTER TABLE campaign_queue 
ADD CONSTRAINT unique_campaign_phone 
UNIQUE (campaign_id, contact_phone);

-- Create index for faster phone lookups across campaigns
CREATE INDEX IF NOT EXISTS idx_campaign_queue_phone_status 
ON campaign_queue (contact_phone, status);

-- Create view for contact send history
CREATE OR REPLACE VIEW contact_send_history AS
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