export interface EstadoBrasil {
  uf: string;
  nome: string;
  regiao: string;
  ddds: string[];
}

export const estadosBrasil: EstadoBrasil[] = [
  // Norte
  { uf: "AC", nome: "Acre", regiao: "Norte", ddds: ["68"] },
  { uf: "AP", nome: "Amapá", regiao: "Norte", ddds: ["96"] },
  { uf: "AM", nome: "Amazonas", regiao: "Norte", ddds: ["92", "97"] },
  { uf: "PA", nome: "Pará", regiao: "Norte", ddds: ["91", "93", "94"] },
  { uf: "RO", nome: "Rondônia", regiao: "Norte", ddds: ["69"] },
  { uf: "RR", nome: "Roraima", regiao: "Norte", ddds: ["95"] },
  { uf: "TO", nome: "Tocantins", regiao: "Norte", ddds: ["63"] },
  
  // Nordeste
  { uf: "AL", nome: "Alagoas", regiao: "Nordeste", ddds: ["82"] },
  { uf: "BA", nome: "Bahia", regiao: "Nordeste", ddds: ["71", "73", "74", "75", "77"] },
  { uf: "CE", nome: "Ceará", regiao: "Nordeste", ddds: ["85", "88"] },
  { uf: "MA", nome: "Maranhão", regiao: "Nordeste", ddds: ["98", "99"] },
  { uf: "PB", nome: "Paraíba", regiao: "Nordeste", ddds: ["83"] },
  { uf: "PE", nome: "Pernambuco", regiao: "Nordeste", ddds: ["81", "87"] },
  { uf: "PI", nome: "Piauí", regiao: "Nordeste", ddds: ["86", "89"] },
  { uf: "RN", nome: "Rio Grande do Norte", regiao: "Nordeste", ddds: ["84"] },
  { uf: "SE", nome: "Sergipe", regiao: "Nordeste", ddds: ["79"] },
  
  // Centro-Oeste
  { uf: "DF", nome: "Distrito Federal", regiao: "Centro-Oeste", ddds: ["61"] },
  { uf: "GO", nome: "Goiás", regiao: "Centro-Oeste", ddds: ["62", "64"] },
  { uf: "MT", nome: "Mato Grosso", regiao: "Centro-Oeste", ddds: ["65", "66"] },
  { uf: "MS", nome: "Mato Grosso do Sul", regiao: "Centro-Oeste", ddds: ["67"] },
  
  // Sudeste
  { uf: "ES", nome: "Espírito Santo", regiao: "Sudeste", ddds: ["27", "28"] },
  { uf: "MG", nome: "Minas Gerais", regiao: "Sudeste", ddds: ["31", "32", "33", "34", "35", "37", "38"] },
  { uf: "RJ", nome: "Rio de Janeiro", regiao: "Sudeste", ddds: ["21", "22", "24"] },
  { uf: "SP", nome: "São Paulo", regiao: "Sudeste", ddds: ["11", "12", "13", "14", "15", "16", "17", "18", "19"] },
  
  // Sul
  { uf: "PR", nome: "Paraná", regiao: "Sul", ddds: ["41", "42", "43", "44", "45", "46"] },
  { uf: "RS", nome: "Rio Grande do Sul", regiao: "Sul", ddds: ["51", "53", "54", "55"] },
  { uf: "SC", nome: "Santa Catarina", regiao: "Sul", ddds: ["47", "48", "49"] },
];

export const regioesBrasil = [
  { code: "N", name: "Norte" },
  { code: "NE", name: "Nordeste" },
  { code: "CO", name: "Centro-Oeste" },
  { code: "SE", name: "Sudeste" },
  { code: "S", name: "Sul" },
];

export function getEstadoByUF(uf: string): EstadoBrasil | undefined {
  return estadosBrasil.find(estado => estado.uf === uf.toUpperCase());
}

export function getEstadosByRegiao(regiao: string): EstadoBrasil[] {
  return estadosBrasil.filter(estado => estado.regiao === regiao);
}

export function getDDDsByUF(uf: string): string[] {
  const estado = getEstadoByUF(uf);
  return estado?.ddds || [];
}

export function getUFByDDD(ddd: string): string | undefined {
  const estado = estadosBrasil.find(e => e.ddds.includes(ddd));
  return estado?.uf;
}

export function searchEstados(query: string): EstadoBrasil[] {
  if (!query) return estadosBrasil;
  
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return estadosBrasil.filter(estado => {
    const normalizedNome = estado.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedUF = estado.uf.toLowerCase();
    return normalizedNome.includes(normalizedQuery) || normalizedUF.includes(normalizedQuery);
  });
}
