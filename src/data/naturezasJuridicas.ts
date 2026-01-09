export interface NaturezaJuridica {
  code: string;
  name: string;
}

export const naturezasJuridicas: NaturezaJuridica[] = [
  // Administração Pública
  { code: "101-5", name: "Órgão Público do Poder Executivo Federal" },
  { code: "102-3", name: "Órgão Público do Poder Executivo Estadual ou do Distrito Federal" },
  { code: "103-1", name: "Órgão Público do Poder Executivo Municipal" },
  { code: "104-0", name: "Órgão Público do Poder Legislativo Federal" },
  { code: "105-8", name: "Órgão Público do Poder Legislativo Estadual ou do Distrito Federal" },
  { code: "106-6", name: "Órgão Público do Poder Legislativo Municipal" },
  { code: "107-4", name: "Órgão Público do Poder Judiciário Federal" },
  { code: "108-2", name: "Órgão Público do Poder Judiciário Estadual" },
  { code: "110-4", name: "Autarquia Federal" },
  { code: "111-2", name: "Autarquia Estadual ou do Distrito Federal" },
  { code: "112-1", name: "Autarquia Municipal" },
  { code: "113-9", name: "Fundação Pública de Direito Público Federal" },
  { code: "114-7", name: "Fundação Pública de Direito Público Estadual ou do Distrito Federal" },
  { code: "115-5", name: "Fundação Pública de Direito Público Municipal" },
  { code: "116-3", name: "Órgão Público Autônomo Federal" },
  { code: "117-1", name: "Órgão Público Autônomo Estadual ou do Distrito Federal" },
  { code: "118-0", name: "Órgão Público Autônomo Municipal" },
  { code: "119-8", name: "Comissão Polinacional" },
  { code: "121-0", name: "Consórcio Público de Direito Público (Associação Pública)" },
  { code: "122-8", name: "Consórcio Público de Direito Privado" },
  { code: "123-6", name: "Estado ou Distrito Federal" },
  { code: "124-4", name: "Município" },
  { code: "125-2", name: "Fundação Pública de Direito Privado Federal" },
  { code: "126-0", name: "Fundação Pública de Direito Privado Estadual ou do Distrito Federal" },
  { code: "127-9", name: "Fundação Pública de Direito Privado Municipal" },
  { code: "128-7", name: "Fundo Público da Administração Indireta Federal" },
  { code: "129-5", name: "Fundo Público da Administração Indireta Estadual ou do Distrito Federal" },
  { code: "130-9", name: "Fundo Público da Administração Indireta Municipal" },
  { code: "131-7", name: "Fundo Público da Administração Direta Federal" },
  { code: "132-5", name: "Fundo Público da Administração Direta Estadual ou do Distrito Federal" },
  { code: "133-3", name: "Fundo Público da Administração Direta Municipal" },
  { code: "134-1", name: "União" },
  
  // Entidades Empresariais
  { code: "201-1", name: "Empresa Pública" },
  { code: "203-8", name: "Sociedade de Economia Mista" },
  { code: "204-6", name: "Sociedade Anônima Aberta" },
  { code: "205-4", name: "Sociedade Anônima Fechada" },
  { code: "206-2", name: "Sociedade Empresária Limitada" },
  { code: "207-1", name: "Sociedade Empresária em Nome Coletivo" },
  { code: "208-9", name: "Sociedade Empresária em Comandita Simples" },
  { code: "209-7", name: "Sociedade Empresária em Comandita por Ações" },
  { code: "212-7", name: "Empresa Individual de Responsabilidade Limitada (EIRELI)" },
  { code: "213-5", name: "Empresário (Individual)" },
  { code: "214-3", name: "Cooperativa" },
  { code: "215-1", name: "Consórcio de Sociedades" },
  { code: "216-0", name: "Grupo de Sociedades" },
  { code: "217-8", name: "Estabelecimento, no Brasil, de Sociedade Estrangeira" },
  { code: "219-4", name: "Estabelecimento, no Brasil, de Empresa Binacional Argentino-Brasileira" },
  { code: "221-6", name: "Empresa Domiciliada no Exterior" },
  { code: "222-4", name: "Clube/Fundo de Investimento" },
  { code: "223-2", name: "Sociedade Simples Pura" },
  { code: "224-1", name: "Sociedade Simples Limitada" },
  { code: "225-9", name: "Sociedade Simples em Nome Coletivo" },
  { code: "226-7", name: "Sociedade Simples em Comandita Simples" },
  { code: "227-5", name: "Empresa Binacional" },
  { code: "228-3", name: "Consórcio de Empregadores" },
  { code: "229-1", name: "Consórcio Simples" },
  { code: "230-5", name: "Sociedade Unipessoal de Advocacia" },
  { code: "231-3", name: "Cooperativa de Consumo" },
  { code: "232-1", name: "Sociedade Limitada Unipessoal" },
  
  // Entidades sem Fins Lucrativos
  { code: "303-4", name: "Serviço Notarial e Registral (Cartório)" },
  { code: "306-9", name: "Fundação Privada" },
  { code: "307-7", name: "Serviço Social Autônomo" },
  { code: "308-5", name: "Condomínio Edilício" },
  { code: "310-7", name: "Comissão de Conciliação Prévia" },
  { code: "311-5", name: "Entidade de Mediação e Arbitragem" },
  { code: "312-3", name: "Entidade Sindical" },
  { code: "313-1", name: "Estabelecimento, no Brasil, de Fundação ou Associação Estrangeiras" },
  { code: "314-0", name: "Fundação ou Associação domiciliada no exterior" },
  { code: "320-4", name: "Organização Religiosa" },
  { code: "321-2", name: "Comunidade Indígena" },
  { code: "322-1", name: "Fundo Privado" },
  { code: "323-9", name: "Órgão de Direção Nacional de Partido Político" },
  { code: "324-7", name: "Órgão de Direção Regional de Partido Político" },
  { code: "325-5", name: "Órgão de Direção Local de Partido Político" },
  { code: "326-3", name: "Comitê Financeiro de Partido Político" },
  { code: "327-1", name: "Frente Plebiscitária ou Referendária" },
  { code: "328-0", name: "Organização Social (OS)" },
  { code: "329-8", name: "Demais Condomínios" },
  { code: "330-1", name: "Plano de Benefícios de Previdência Complementar Fechada" },
  { code: "399-9", name: "Associação Privada" },
  
  // Pessoas Físicas
  { code: "401-4", name: "Empresa Individual Imobiliária" },
  { code: "402-2", name: "Segurado Especial" },
  { code: "408-1", name: "Contribuinte individual" },
  { code: "409-0", name: "Candidato a Cargo Político Eletivo" },
  { code: "411-1", name: "Leiloeiro" },
  { code: "412-9", name: "Produtor Rural (Pessoa Física)" },
  
  // Organizações Internacionais
  { code: "501-0", name: "Organização Internacional" },
  { code: "502-8", name: "Representação Diplomática Estrangeira" },
  { code: "503-6", name: "Outras Instituições Extraterritoriais" },
];

export function searchNaturezasJuridicas(query: string, limit = 20): NaturezaJuridica[] {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return naturezasJuridicas
    .filter(nat => {
      const normalizedCode = nat.code.toLowerCase();
      const normalizedName = nat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedCode.includes(normalizedQuery) || normalizedName.includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function getNaturezaJuridicaByCode(code: string): NaturezaJuridica | undefined {
  return naturezasJuridicas.find(nat => nat.code === code);
}
