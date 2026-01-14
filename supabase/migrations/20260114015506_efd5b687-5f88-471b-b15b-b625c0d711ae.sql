-- Migrar contacts para leads (apenas os que ainda não existem)
INSERT INTO public.leads (
  user_id, list_id, nome, telefones, telefones_array,
  cnpj, razao_social, nome_fantasia, email, situacao,
  atividade, atividades_secundarias,
  cep, logradouro, bairro, municipio, uf, endereco,
  capital_social, porte_empresa, data_abertura,
  socios, source, status, extra_data, created_at
)
SELECT 
  c.user_id,
  c.list_id,
  c.name as nome,
  c.phone as telefones,
  jsonb_build_array(c.phone) as telefones_array,
  c.extra_data->>'cnpj' as cnpj,
  COALESCE(c.extra_data->>'razao_social', c.name) as razao_social,
  c.extra_data->>'nome_fantasia' as nome_fantasia,
  COALESCE(c.email, c.extra_data->>'email') as email,
  c.extra_data->>'situacao' as situacao,
  c.extra_data->>'atividades_principal' as atividade,
  CASE 
    WHEN c.extra_data->'atividades_secundarias' IS NOT NULL 
    THEN c.extra_data->'atividades_secundarias'
    ELSE '[]'::jsonb 
  END as atividades_secundarias,
  c.extra_data->>'cep' as cep,
  c.extra_data->>'logradouro' as logradouro,
  c.extra_data->>'bairro' as bairro,
  c.extra_data->>'municipio' as municipio,
  c.extra_data->>'estado' as uf,
  CONCAT_WS(', ', 
    NULLIF(c.extra_data->>'logradouro', ''),
    NULLIF(c.extra_data->>'bairro', ''),
    NULLIF(c.extra_data->>'municipio', ''),
    NULLIF(c.extra_data->>'estado', '')
  ) as endereco,
  c.extra_data->>'capital_social' as capital_social,
  c.extra_data->>'porte_empresa' as porte_empresa,
  c.extra_data->>'data_abertura' as data_abertura,
  CASE 
    WHEN c.extra_data->'socios' IS NOT NULL AND jsonb_typeof(c.extra_data->'socios') = 'array'
    THEN c.extra_data->'socios'
    WHEN c.extra_data->>'socios' IS NOT NULL AND c.extra_data->>'socios' != ''
    THEN jsonb_build_array(jsonb_build_object('nome', c.extra_data->>'socios'))
    ELSE '[]'::jsonb 
  END as socios,
  COALESCE(c.extra_data->>'source', 'imported') as source,
  'novo' as status,
  c.extra_data,
  c.created_at
FROM public.contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM public.leads l 
  WHERE l.list_id = c.list_id 
  AND l.telefones = c.phone
  AND l.user_id = c.user_id
);

-- Atualizar contact_count nas listas baseado na tabela leads
UPDATE public.lists l
SET contact_count = (
  SELECT COUNT(*) FROM public.leads ld WHERE ld.list_id = l.id
),
updated_at = now();