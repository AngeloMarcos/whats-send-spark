import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocioSearchRequest {
  socioNome: string;
  socioQualificacao?: string;
  empresaNome: string;
  empresaCNPJ: string;
  cidade: string;
  uf?: string;
}

interface PhoneResult {
  telefone: string;
  fonte: string;
  camada: number;
  confiabilidade: 'alta' | 'media' | 'baixa';
  tipo: 'celular' | 'fixo' | 'desconhecido';
  urlFonte?: string;
}

interface SearchResponse {
  telefones: PhoneResult[];
  totalEncontrados: number;
  camadasConsultadas: number;
  tempoMs: number;
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════

const DDDS_VALIDOS = [
  11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
  21, 22, 24, // RJ
  27, 28, // ES
  31, 32, 33, 34, 35, 37, 38, // MG
  41, 42, 43, 44, 45, 46, // PR
  47, 48, 49, // SC
  51, 53, 54, 55, // RS
  61, // DF
  62, 64, // GO
  63, // TO
  65, 66, // MT
  67, // MS
  68, // AC
  69, // RO
  71, 73, 74, 75, 77, // BA
  79, // SE
  81, 82, // PE, AL
  83, 84, // PB, RN
  85, 86, 87, 88, 89, // CE, PI
  91, 92, 93, 94, 95, 96, 97, 98, 99 // Norte
];

function validarTelefoneBrasileiro(telefone: string): boolean {
  const limpo = telefone.replace(/\D/g, '');
  
  if (limpo.length !== 10 && limpo.length !== 11) return false;
  
  const ddd = parseInt(limpo.substring(0, 2));
  if (!DDDS_VALIDOS.includes(ddd)) return false;
  
  // Rejeitar números claramente inválidos (ex: 00000, 11111)
  const numero = limpo.substring(2);
  if (/^(\d)\1+$/.test(numero)) return false;
  
  return true;
}

function formatarTelefone(telefone: string): string {
  const limpo = telefone.replace(/\D/g, '');
  
  if (limpo.length === 11) {
    return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 7)}-${limpo.substring(7)}`;
  } else if (limpo.length === 10) {
    return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 6)}-${limpo.substring(6)}`;
  }
  
  return telefone;
}

function detectarTipoTelefone(telefone: string): 'celular' | 'fixo' | 'desconhecido' {
  const limpo = telefone.replace(/\D/g, '');
  
  if (limpo.length === 11) {
    const terceiro = limpo.charAt(2);
    if (terceiro === '9' || terceiro === '8' || terceiro === '7') {
      return 'celular';
    }
    return 'fixo';
  } else if (limpo.length === 10) {
    return 'fixo';
  }
  
  return 'desconhecido';
}

function extrairTelefonesDoTexto(texto: string): string[] {
  // Regex para telefones brasileiros
  const phoneRegex = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-.\s]?\d{4}/g;
  const matches = texto.match(phoneRegex) || [];
  
  const telefones: string[] = [];
  
  for (const match of matches) {
    const limpo = match.replace(/\D/g, '');
    
    if (limpo.length >= 10 && limpo.length <= 13) {
      // Normalizar para 10 ou 11 dígitos
      let numero = limpo;
      if (numero.startsWith('55') && numero.length > 11) {
        numero = numero.substring(2);
      }
      if (numero.length >= 10 && numero.length <= 11 && validarTelefoneBrasileiro(numero)) {
        const formatado = formatarTelefone(numero);
        if (!telefones.includes(formatado)) {
          telefones.push(formatado);
        }
      }
    }
  }
  
  return telefones;
}

function calcularConfiabilidade(
  snippet: string, 
  partnerName: string,
  source: string
): 'alta' | 'media' | 'baixa' {
  const lowerSnippet = snippet.toLowerCase();
  const lowerName = partnerName.toLowerCase().split(' ')[0]; // Primeiro nome
  
  // Alta: nome + indicadores fortes
  if (lowerSnippet.includes(lowerName) && 
      (lowerSnippet.includes('whatsapp') || 
       lowerSnippet.includes('contato') || 
       lowerSnippet.includes('telefone') ||
       lowerSnippet.includes('celular'))) {
    return 'alta';
  }
  
  // Alta: fonte confiável (LinkedIn, etc)
  if (source.includes('linkedin.com') || source.includes('facebook.com')) {
    return 'alta';
  }
  
  // Média: nome aparece no snippet
  if (lowerSnippet.includes(lowerName)) {
    return 'media';
  }
  
  // Baixa: telefone encontrado mas contexto fraco
  return 'baixa';
}

function removerDuplicatas(telefones: PhoneResult[]): PhoneResult[] {
  const vistos = new Map<string, PhoneResult>();
  
  for (const tel of telefones) {
    const key = tel.telefone.replace(/\D/g, '');
    const existente = vistos.get(key);
    
    // Manter o com maior confiabilidade
    if (!existente || 
        (tel.confiabilidade === 'alta' && existente.confiabilidade !== 'alta') ||
        (tel.confiabilidade === 'media' && existente.confiabilidade === 'baixa')) {
      vistos.set(key, tel);
    }
  }
  
  return Array.from(vistos.values());
}

// ═══════════════════════════════════════════════════════════════
// CAMADAS DE BUSCA
// ═══════════════════════════════════════════════════════════════

async function camada1_GoogleCSEAprimorado(
  partnerName: string,
  city: string,
  state: string,
  apiKey: string,
  cseId: string
): Promise<PhoneResult[]> {
  console.log(`[Camada 1] Google CSE aprimorado para: ${partnerName}`);
  const resultados: PhoneResult[] = [];
  
  // Múltiplas queries para melhor cobertura
  const queries = [
    // Query principal com nome completo
    `"${partnerName}" ${city} ${state} (telefone OR celular OR whatsapp OR contato)`,
    // Query com primeiro e último nome
    `"${partnerName.split(' ')[0]}" "${partnerName.split(' ').slice(-1)[0]}" ${city} telefone`,
    // Query em sites de diretório
    `site:telelistas.net OR site:apontador.com.br OR site:guiamais.com.br "${partnerName}" ${city}`
  ];
  
  for (let i = 0; i < queries.length && resultados.length < 3; i++) {
    try {
      const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
      searchUrl.searchParams.set('key', apiKey);
      searchUrl.searchParams.set('cx', cseId);
      searchUrl.searchParams.set('q', queries[i]);
      searchUrl.searchParams.set('num', '10');
      searchUrl.searchParams.set('gl', 'br');
      searchUrl.searchParams.set('lr', 'lang_pt');
      
      const response = await fetch(searchUrl.toString());
      if (!response.ok) continue;
      
      const data = await response.json();
      const items = data.items || [];
      
      for (const item of items) {
        const texto = `${item.title || ''} ${item.snippet || ''} ${item.htmlSnippet || ''}`;
        const telefones = extrairTelefonesDoTexto(texto);
        
        for (const tel of telefones) {
          if (!resultados.some(r => r.telefone.replace(/\D/g, '') === tel.replace(/\D/g, ''))) {
            resultados.push({
              telefone: tel,
              fonte: 'Google CSE',
              camada: 1,
              confiabilidade: calcularConfiabilidade(texto, partnerName, item.link || ''),
              tipo: detectarTipoTelefone(tel),
              urlFonte: item.link
            });
          }
        }
      }
      
      // Delay entre queries
      if (i < queries.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (error) {
      console.error(`[Camada 1] Query ${i + 1} falhou:`, error);
    }
  }
  
  console.log(`[Camada 1] Encontrados: ${resultados.length} telefones`);
  return resultados;
}

async function camada2_OutrasEmpresasSocio(
  partnerName: string,
  city: string,
  state: string,
  apiKey: string,
  cseId: string
): Promise<PhoneResult[]> {
  console.log(`[Camada 2] Buscando outras empresas de: ${partnerName}`);
  const resultados: PhoneResult[] = [];
  
  try {
    // Buscar outras empresas onde o sócio participa
    const query = `"${partnerName}" CNPJ socio ${state}`;
    
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('cx', cseId);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('num', '5');
    searchUrl.searchParams.set('gl', 'br');
    
    const response = await fetch(searchUrl.toString());
    if (!response.ok) return resultados;
    
    const data = await response.json();
    const items = data.items || [];
    
    for (const item of items) {
      const texto = `${item.title || ''} ${item.snippet || ''}`;
      const telefones = extrairTelefonesDoTexto(texto);
      
      for (const tel of telefones) {
        if (!resultados.some(r => r.telefone.replace(/\D/g, '') === tel.replace(/\D/g, ''))) {
          resultados.push({
            telefone: tel,
            fonte: 'Outra empresa do sócio',
            camada: 2,
            confiabilidade: 'media',
            tipo: detectarTipoTelefone(tel),
            urlFonte: item.link
          });
        }
      }
    }
  } catch (error) {
    console.error('[Camada 2] Erro:', error);
  }
  
  console.log(`[Camada 2] Encontrados: ${resultados.length} telefones`);
  return resultados;
}

async function camada3_DiretoriosEmpresariais(
  partnerName: string,
  empresaNome: string,
  city: string,
  apiKey: string,
  cseId: string
): Promise<PhoneResult[]> {
  console.log(`[Camada 3] Diretórios empresariais para: ${partnerName} / ${empresaNome}`);
  const resultados: PhoneResult[] = [];
  
  const sites = [
    'empresaqui.com.br',
    'econodata.com.br',
    'listamais.com.br',
    'guialocal.com.br',
    'encontrasp.com.br',
    'hagah.com.br'
  ];
  
  try {
    const siteQuery = sites.map(s => `site:${s}`).join(' OR ');
    const query = `(${siteQuery}) "${partnerName}" ${city}`;
    
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('cx', cseId);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('num', '5');
    searchUrl.searchParams.set('gl', 'br');
    
    const response = await fetch(searchUrl.toString());
    if (!response.ok) return resultados;
    
    const data = await response.json();
    const items = data.items || [];
    
    for (const item of items) {
      const texto = `${item.title || ''} ${item.snippet || ''}`;
      const telefones = extrairTelefonesDoTexto(texto);
      
      for (const tel of telefones) {
        if (!resultados.some(r => r.telefone.replace(/\D/g, '') === tel.replace(/\D/g, ''))) {
          const siteName = sites.find(s => (item.link || '').includes(s)) || 'Diretório empresarial';
          resultados.push({
            telefone: tel,
            fonte: siteName,
            camada: 3,
            confiabilidade: 'media',
            tipo: detectarTipoTelefone(tel),
            urlFonte: item.link
          });
        }
      }
    }
  } catch (error) {
    console.error('[Camada 3] Erro:', error);
  }
  
  console.log(`[Camada 3] Encontrados: ${resultados.length} telefones`);
  return resultados;
}

async function camada4_RedesSociaisPublicas(
  partnerName: string,
  city: string,
  apiKey: string,
  cseId: string
): Promise<PhoneResult[]> {
  console.log(`[Camada 4] Redes sociais públicas para: ${partnerName}`);
  const resultados: PhoneResult[] = [];
  
  try {
    // Busca em perfis públicos de redes sociais
    const query = `"${partnerName}" ${city} (site:linkedin.com/in OR site:facebook.com OR site:instagram.com) (telefone OR celular OR contato)`;
    
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('cx', cseId);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('num', '5');
    searchUrl.searchParams.set('gl', 'br');
    
    const response = await fetch(searchUrl.toString());
    if (!response.ok) return resultados;
    
    const data = await response.json();
    const items = data.items || [];
    
    for (const item of items) {
      const texto = `${item.title || ''} ${item.snippet || ''}`;
      const telefones = extrairTelefonesDoTexto(texto);
      
      for (const tel of telefones) {
        if (!resultados.some(r => r.telefone.replace(/\D/g, '') === tel.replace(/\D/g, ''))) {
          let fonte = 'Rede Social';
          if ((item.link || '').includes('linkedin')) fonte = 'LinkedIn';
          else if ((item.link || '').includes('facebook')) fonte = 'Facebook';
          else if ((item.link || '').includes('instagram')) fonte = 'Instagram';
          
          resultados.push({
            telefone: tel,
            fonte,
            camada: 4,
            confiabilidade: 'alta', // Redes sociais geralmente são confiáveis
            tipo: detectarTipoTelefone(tel),
            urlFonte: item.link
          });
        }
      }
    }
  } catch (error) {
    console.error('[Camada 4] Erro:', error);
  }
  
  console.log(`[Camada 4] Encontrados: ${resultados.length} telefones`);
  return resultados;
}

async function camada5_GooglePlacesEmpresa(
  empresaNome: string,
  city: string,
  state: string,
  apiKey: string
): Promise<PhoneResult[]> {
  console.log(`[Camada 5] Google Places para empresa: ${empresaNome}`);
  const resultados: PhoneResult[] = [];
  
  try {
    // Buscar a empresa no Google Places
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    searchUrl.searchParams.set('query', `${empresaNome} ${city} ${state}`);
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('language', 'pt-BR');
    
    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) return resultados;
    
    const searchData = await searchResponse.json();
    const places = searchData.results || [];
    
    if (places.length > 0) {
      // Pegar detalhes do primeiro resultado
      const placeId = places[0].place_id;
      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      detailsUrl.searchParams.set('place_id', placeId);
      detailsUrl.searchParams.set('fields', 'formatted_phone_number,international_phone_number,name');
      detailsUrl.searchParams.set('key', apiKey);
      
      const detailsResponse = await fetch(detailsUrl.toString());
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        const result = detailsData.result;
        
        if (result?.formatted_phone_number) {
          const telefone = formatarTelefone(result.formatted_phone_number.replace(/\D/g, ''));
          if (validarTelefoneBrasileiro(telefone)) {
            resultados.push({
              telefone,
              fonte: 'Google Maps (empresa)',
              camada: 5,
              confiabilidade: 'media', // É da empresa, não do sócio
              tipo: detectarTipoTelefone(telefone)
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[Camada 5] Erro:', error);
  }
  
  console.log(`[Camada 5] Encontrados: ${resultados.length} telefones`);
  return resultados;
}

// ═══════════════════════════════════════════════════════════════
// SERVIDOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');

    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      console.error('Missing API keys');
      return new Response(
        JSON.stringify({ 
          error: 'API não configurada',
          telefones: [],
          totalEncontrados: 0,
          camadasConsultadas: 0,
          tempoMs: Date.now() - startTime
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const request: SocioSearchRequest = await req.json();
    const { socioNome, empresaNome, empresaCNPJ, cidade, uf } = request;

    if (!socioNome || !cidade) {
      return new Response(
        JSON.stringify({ error: 'Nome do sócio e cidade são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Busca multi-camadas para: ${socioNome}`);
    console.log(`Empresa: ${empresaNome} | Cidade: ${cidade} ${uf || ''}`);
    console.log('═'.repeat(60));

    let todosTelefones: PhoneResult[] = [];
    let camadasExecutadas = 0;

    // ═══════════════════════════════════════════════════════════
    // EXECUTAR CAMADAS EM SEQUÊNCIA (para em 2+ celulares)
    // ═══════════════════════════════════════════════════════════

    // Camada 1: Google CSE Aprimorado
    const resultadosCamada1 = await camada1_GoogleCSEAprimorado(
      socioNome, cidade, uf || '', GOOGLE_API_KEY, GOOGLE_CSE_ID
    );
    todosTelefones.push(...resultadosCamada1);
    camadasExecutadas++;

    // Se encontrou 2+ celulares, pode parar
    const celularesCamada1 = todosTelefones.filter(t => t.tipo === 'celular').length;
    if (celularesCamada1 >= 2) {
      console.log(`✓ Camada 1 suficiente: ${celularesCamada1} celulares encontrados`);
    } else {
      // Camada 2: Outras empresas do sócio
      await new Promise(r => setTimeout(r, 300));
      const resultadosCamada2 = await camada2_OutrasEmpresasSocio(
        socioNome, cidade, uf || '', GOOGLE_API_KEY, GOOGLE_CSE_ID
      );
      todosTelefones.push(...resultadosCamada2);
      camadasExecutadas++;

      const celularesCamada2 = todosTelefones.filter(t => t.tipo === 'celular').length;
      if (celularesCamada2 >= 2) {
        console.log(`✓ Camadas 1-2 suficientes: ${celularesCamada2} celulares`);
      } else {
        // Camada 3: Diretórios empresariais
        await new Promise(r => setTimeout(r, 300));
        const resultadosCamada3 = await camada3_DiretoriosEmpresariais(
          socioNome, empresaNome, cidade, GOOGLE_API_KEY, GOOGLE_CSE_ID
        );
        todosTelefones.push(...resultadosCamada3);
        camadasExecutadas++;

        // Camada 4: Redes sociais públicas
        await new Promise(r => setTimeout(r, 300));
        const resultadosCamada4 = await camada4_RedesSociaisPublicas(
          socioNome, cidade, GOOGLE_API_KEY, GOOGLE_CSE_ID
        );
        todosTelefones.push(...resultadosCamada4);
        camadasExecutadas++;

        // Camada 5: Google Places da empresa (fallback)
        if (todosTelefones.filter(t => t.tipo === 'celular').length === 0) {
          await new Promise(r => setTimeout(r, 300));
          const resultadosCamada5 = await camada5_GooglePlacesEmpresa(
            empresaNome, cidade, uf || '', GOOGLE_API_KEY
          );
          todosTelefones.push(...resultadosCamada5);
          camadasExecutadas++;
        }
      }
    }

    // Remover duplicatas e ordenar
    todosTelefones = removerDuplicatas(todosTelefones);
    
    // Ordenar: celulares primeiro, depois por confiabilidade
    todosTelefones.sort((a, b) => {
      // Celulares primeiro
      if (a.tipo === 'celular' && b.tipo !== 'celular') return -1;
      if (a.tipo !== 'celular' && b.tipo === 'celular') return 1;
      
      // Depois por confiabilidade
      const ordem = { alta: 0, media: 1, baixa: 2 };
      return ordem[a.confiabilidade] - ordem[b.confiabilidade];
    });

    const tempoMs = Date.now() - startTime;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`RESULTADO FINAL: ${todosTelefones.length} telefones em ${tempoMs}ms`);
    console.log(`Celulares: ${todosTelefones.filter(t => t.tipo === 'celular').length}`);
    console.log(`Camadas consultadas: ${camadasExecutadas}`);
    console.log('─'.repeat(60) + '\n');

    const response: SearchResponse = {
      telefones: todosTelefones.slice(0, 5), // Máximo 5 telefones
      totalEncontrados: todosTelefones.length,
      camadasConsultadas: camadasExecutadas,
      tempoMs
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na busca multi-camadas:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        telefones: [],
        totalEncontrados: 0,
        camadasConsultadas: 0,
        tempoMs: Date.now() - startTime
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
