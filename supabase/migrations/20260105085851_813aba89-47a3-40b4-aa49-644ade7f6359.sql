-- Adicionar colunas de configuração de envio na tabela settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS send_interval_seconds integer DEFAULT 30;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS randomize_interval boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS max_messages_per_hour integer DEFAULT 30;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS max_messages_per_day integer DEFAULT 200;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS allowed_start_time time DEFAULT '08:00:00';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS allowed_end_time time DEFAULT '20:00:00';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS allowed_days text[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat'];
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_pause_on_limit boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS send_profile text DEFAULT 'moderate';

-- Adicionar colunas de agendamento e retry na campaign_queue
ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS scheduled_for timestamp with time zone;
ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone;

-- Criar tabela de controle de rate limiting
CREATE TABLE IF NOT EXISTS send_rate_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  hour_key text NOT NULL,
  day_key text NOT NULL,
  hourly_count integer DEFAULT 0,
  daily_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, hour_key)
);

-- Habilitar RLS
ALTER TABLE send_rate_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view their own rate tracking" ON send_rate_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate tracking" ON send_rate_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate tracking" ON send_rate_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rate tracking" ON send_rate_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_send_rate_tracking_updated_at
  BEFORE UPDATE ON send_rate_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();