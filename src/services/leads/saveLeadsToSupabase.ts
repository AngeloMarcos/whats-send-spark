/**
 * Salva leads no Supabase em lote.
 * Chamado automaticamente após cada pesquisa Google + CNPJ Biz.
 * Não bloqueia por falta de telefone/email.
 * Não faz deduplicação - tratamento de duplicatas via queries.
 */

import { supabase } from '@/integrations/supabase/client';
import { Lead, Socio } from '@/hooks/useGooglePlaces';

export interface SaveLeadsResult {
  saved: number;
  errors: number;
  errorMessages: string[];
}

/**
 * Mapeia um lead enriquecido para o formato da tabela public.leads
 */
function mapLeadToDbFormat(lead: Lead, userId: string) {
  // Juntar todos os telefones disponíveis em uma string separada por vírgula
  const telefones: string[] = [];
  
  // Telefone do Google Maps
  if (lead.phone) {
    telefones.push(lead.phone);
  }
  
  // Telefones oficiais do CNPJ
  if (lead.telefones_oficiais && lead.telefones_oficiais.length > 0) {
    telefones.push(...lead.telefones_oficiais);
  }
  
  // Telefones dos sócios (se disponíveis)
  if (lead.socios && lead.socios.length > 0) {
    lead.socios.forEach((socio: Socio) => {
      if (socio.telefonesEncontrados && socio.telefonesEncontrados.length > 0) {
        telefones.push(...socio.telefonesEncontrados);
      }
    });
  }
  
  // Remover duplicatas e juntar com vírgula
  const telefonesUnicos = [...new Set(telefones.filter(t => t && t.trim()))];
  const telefonesString = telefonesUnicos.join(', ');

  return {
    user_id: userId,
    cnpj: lead.cnpj?.replace(/\D/g, '') || null,
    situacao: lead.situacao_cadastral || null,
    razao_social: lead.razaoSocial || null,
    nome_fantasia: lead.nomeFantasia || lead.name || null,
    nome: lead.name || null,
    email: lead.email_oficial || null,
    telefones: telefonesString || '', // Campo obrigatório (NOT NULL)
    telefones_array: telefonesUnicos.length > 0 ? telefonesUnicos : [],
    status: 'pending',
    source: 'google_cnpj_biz',
    // Campos adicionais do Google Maps
    endereco: lead.address || null,
    // Campos do CNPJ Biz
    porte_empresa: lead.porte || null,
    capital_social: lead.capital_social?.toString() || null,
    // Sócios como JSON
    socios: lead.socios && lead.socios.length > 0 
      ? lead.socios.map((s: Socio) => ({
          nome: s.nome,
          qual: s.qualificacao,
          telefones: s.telefonesEncontrados || []
        }))
      : [],
  };
}

/**
 * Salva um array de leads no Supabase em lote.
 * 
 * @param leads - Array de leads enriquecidos para salvar
 * @param userId - ID do usuário autenticado
 * @returns Objeto com contagem de salvos e erros
 */
export async function saveLeadsToSupabase(
  leads: Lead[],
  userId: string
): Promise<SaveLeadsResult> {
  // Se não houver leads, retornar sem fazer nada
  if (!leads || leads.length === 0) {
    console.log('[saveLeadsToSupabase] Nenhum lead para salvar');
    return { saved: 0, errors: 0, errorMessages: [] };
  }

  // Verificar se o userId está disponível
  if (!userId) {
    console.error('[saveLeadsToSupabase] ERRO: userId não fornecido - usuário não está autenticado');
    return { saved: 0, errors: leads.length, errorMessages: ['Usuário não autenticado'] };
  }

  console.log(`[saveLeadsToSupabase] Iniciando salvamento de ${leads.length} leads...`);

  // Mapear todos os leads para o formato do banco
  const leadsToInsert = leads.map(lead => mapLeadToDbFormat(lead, userId));

  try {
    // === CONEXÃO: Pesquisa de Leads → Insert no Supabase (public.leads) ===
    // Todos os resultados são salvos com status='pending' para processamento posterior
    const { data, error } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select('id');

    if (error) {
      console.error('[saveLeadsToSupabase] ERRO ao inserir leads:', error.message);
      console.error('[saveLeadsToSupabase] Detalhes:', error);
      return { saved: 0, errors: leads.length, errorMessages: [error.message] };
    }

    const savedCount = data?.length || 0;
    console.log(`[saveLeadsToSupabase] ✅ Sucesso! ${savedCount} leads salvos no Supabase`);
    
    return { saved: savedCount, errors: 0, errorMessages: [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[saveLeadsToSupabase] ERRO inesperado:', errorMessage);
    return { saved: 0, errors: leads.length, errorMessages: [errorMessage] };
  }
}
