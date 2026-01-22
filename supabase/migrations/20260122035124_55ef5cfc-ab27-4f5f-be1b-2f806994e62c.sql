-- Adicionar campos para tracking do último status do webhook na tabela settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS n8n_webhook_last_status INTEGER,
ADD COLUMN IF NOT EXISTS n8n_webhook_last_error TEXT,
ADD COLUMN IF NOT EXISTS n8n_webhook_last_called_at TIMESTAMPTZ;

-- Adicionar campos de retry na tabela leads para controle de tentativas
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_webhook_attempt TIMESTAMPTZ;

-- Comentário: Essas colunas permitem rastrear o estado da integração com n8n
-- e controlar quantas vezes um lead foi enviado para reprocessamento