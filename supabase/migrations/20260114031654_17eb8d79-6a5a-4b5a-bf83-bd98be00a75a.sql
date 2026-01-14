-- Remover constraint antiga
ALTER TABLE lists DROP CONSTRAINT IF EXISTS check_list_type;

-- Criar nova constraint com google_maps
ALTER TABLE lists ADD CONSTRAINT check_list_type 
  CHECK (list_type = ANY (ARRAY['google_sheets'::text, 'local'::text, 'google_maps'::text]));