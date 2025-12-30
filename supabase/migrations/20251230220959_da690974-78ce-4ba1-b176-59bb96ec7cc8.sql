-- Add new fields to templates table for robust template system
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]'::jsonb;

-- Create index for filtering by category
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates (user_id, category);

-- Create index for filtering by favorites
CREATE INDEX IF NOT EXISTS idx_templates_favorite ON public.templates (user_id, is_favorite DESC);