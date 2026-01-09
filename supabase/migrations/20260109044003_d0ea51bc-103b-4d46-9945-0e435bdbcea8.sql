-- Add new columns to leads table for ReceitaWS data
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS razao_social TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS situacao TEXT,
ADD COLUMN IF NOT EXISTS atividade TEXT,
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Index for CNPJ lookups
CREATE INDEX IF NOT EXISTS idx_leads_cnpj ON public.leads(cnpj);