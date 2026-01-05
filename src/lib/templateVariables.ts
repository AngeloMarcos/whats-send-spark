import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Standard template variables - Expanded list
export const standardVariables = [
  { key: 'nome', label: 'Nome', icon: '👤', description: 'Nome completo do contato' },
  { key: 'primeiro_nome', label: 'Primeiro Nome', icon: '👋', description: 'Apenas o primeiro nome' },
  { key: 'telefone', label: 'Telefone', icon: '📱', description: 'Telefone do contato' },
  { key: 'empresa', label: 'Empresa', icon: '🏢', description: 'Nome da empresa' },
  { key: 'email', label: 'Email', icon: '📧', description: 'Email do contato' },
  { key: 'cidade', label: 'Cidade', icon: '📍', description: 'Cidade/localização do lead' },
  { key: 'segmento', label: 'Segmento', icon: '🎯', description: 'Área de atuação' },
  { key: 'data_atual', label: 'Data Atual', icon: '📅', description: 'Data de hoje (DD/MM/YYYY)' },
  { key: 'hora', label: 'Hora', icon: '🕐', description: 'Hora atual' },
  { key: 'nome_vendedor', label: 'Vendedor', icon: '👔', description: 'Nome de quem está enviando' },
  { key: 'link_calendario', label: 'Link Calendário', icon: '📆', description: 'URL para agendamento' },
  { key: 'link_material', label: 'Link Material', icon: '📎', description: 'URL para PDF/vídeo' },
];

// Category options for templates - Expanded with icons
export const templateCategories = [
  { value: 'geral', label: 'Geral', icon: '📋', color: 'bg-muted text-muted-foreground' },
  { value: 'saude', label: 'Saúde', icon: '🏥', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'vendas', label: 'Vendas', icon: '💰', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'suporte', label: 'Suporte', icon: '🛠️', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'marketing', label: 'Marketing', icon: '📢', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'juridico', label: 'Jurídico', icon: '⚖️', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300' },
  { value: 'varejo', label: 'Varejo', icon: '🛒', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
];

// WhatsApp character limits
export const WHATSAPP_CHAR_LIMIT = 4096;
export const IDEAL_CHAR_LIMIT = 500;

// Realistic sample data for previews
export const realisticSampleData = {
  name: 'Maria Fernanda Costa',
  phone: '(11) 98765-4321',
  empresa: 'Tech Solutions Ltda',
  email: 'maria.costa@techsolutions.com.br',
  cidade: 'São Paulo',
  segmento: 'Tecnologia',
};

export const senderSampleData = {
  name: 'Carlos Vendas',
  calendarLink: 'https://calendly.com/carlos-vendas',
  materialLink: 'https://materiais.empresa.com/proposta.pdf',
};

// Preset templates library
export const presetTemplates = [
  {
    name: 'Boas-vindas',
    category: 'geral',
    content: 'Olá {{primeiro_nome}}! 👋\n\nSeja muito bem-vindo(a)! Estamos muito felizes em tê-lo(a) conosco.\n\nQualquer dúvida, é só responder esta mensagem.\n\nAbraços!',
    description: 'Template padrão para dar boas-vindas a novos clientes',
    variables: ['primeiro_nome'],
  },
  {
    name: 'Promoção',
    category: 'marketing',
    content: 'Olá {{primeiro_nome}}! 🎉\n\nTemos uma promoção exclusiva para você!\n\n🔥 Condições especiais até {{data_atual}}.\n\nResponda SIM para saber mais!',
    description: 'Template para campanhas de promoção e ofertas',
    variables: ['primeiro_nome', 'data_atual'],
  },
  {
    name: 'Lembrete Consulta',
    category: 'saude',
    content: 'Olá {{primeiro_nome}}! ⏰\n\nEste é um lembrete sobre sua consulta.\n\n📅 Data: {{data_atual}}\n🕐 Horário: {{hora}}\n📍 Local: {{cidade}}\n\nConfirma sua presença?',
    description: 'Template para lembretes de consultas médicas',
    variables: ['primeiro_nome', 'data_atual', 'hora', 'cidade'],
  },
  {
    name: 'Follow-up Vendas',
    category: 'vendas',
    content: 'Olá {{primeiro_nome}}! 💼\n\nSou {{nome_vendedor}} da {{empresa}}.\n\nGostaria de conversar sobre como podemos ajudar sua empresa em {{segmento}}.\n\n📆 Que tal agendarmos? {{link_calendario}}\n\nAguardo seu retorno!',
    description: 'Template para follow-up comercial',
    variables: ['primeiro_nome', 'nome_vendedor', 'empresa', 'segmento', 'link_calendario'],
  },
  {
    name: 'Pós-Venda',
    category: 'suporte',
    content: 'Olá {{primeiro_nome}}! 💚\n\nMuito obrigado pela sua confiança!\n\nFoi um prazer atendê-lo(a). Conte conosco sempre!\n\n📎 Acesse seu material: {{link_material}}\n\nAbraços da equipe.',
    description: 'Template para agradecer após atendimento ou compra',
    variables: ['primeiro_nome', 'link_material'],
  },
];

// Extract variables from template content
export function extractVariables(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const variable = match[1].trim().toLowerCase();
    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }
  return variables;
}

// Process message with contact data and sender info
export function processMessage(
  message: string, 
  contact?: { name?: string; phone?: string; [key: string]: unknown },
  senderInfo?: { name?: string; calendarLink?: string; materialLink?: string }
): string {
  let result = message;
  const now = new Date();
  
  // Extract first name from full name
  const firstName = contact?.name?.split(' ')[0] || 'Nome';
  
  // Replace standard variables
  result = result.replace(/\{\{primeiro_nome\}\}/gi, firstName);
  result = result.replace(/\{\{nome\}\}/gi, contact?.name || 'Nome');
  result = result.replace(/\{\{telefone\}\}/gi, contact?.phone || '(11) 99999-9999');
  result = result.replace(/\{\{empresa\}\}/gi, String(contact?.empresa || contact?.company || 'Empresa'));
  result = result.replace(/\{\{email\}\}/gi, String(contact?.email || 'email@exemplo.com'));
  result = result.replace(/\{\{cidade\}\}/gi, String(contact?.cidade || contact?.city || 'Cidade'));
  result = result.replace(/\{\{segmento\}\}/gi, String(contact?.segmento || contact?.segment || 'Segmento'));
  
  // Date and time variables
  result = result.replace(/\{\{data_atual\}\}/gi, format(now, 'dd/MM/yyyy', { locale: ptBR }));
  result = result.replace(/\{\{data\}\}/gi, format(now, 'dd/MM', { locale: ptBR }));
  result = result.replace(/\{\{hora\}\}/gi, format(now, 'HH:mm', { locale: ptBR }));
  
  // Sender info variables
  result = result.replace(/\{\{nome_vendedor\}\}/gi, senderInfo?.name || 'Vendedor');
  result = result.replace(/\{\{link_calendario\}\}/gi, senderInfo?.calendarLink || 'calendly.com/seu-link');
  result = result.replace(/\{\{link_material\}\}/gi, senderInfo?.materialLink || 'link.empresa.com/material');
  
  // Replace custom variables from contact extra_data
  if (contact) {
    Object.entries(contact).forEach(([key, value]) => {
      if (key !== 'name' && key !== 'phone') {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        result = result.replace(regex, String(value || ''));
      }
    });
  }
  
  return result;
}

// Get character status for smart counter
export function getCharacterStatus(length: number) {
  if (length > WHATSAPP_CHAR_LIMIT) {
    return {
      status: 'error' as const,
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      message: 'Excedeu limite WhatsApp',
      showWarning: true,
    };
  }
  if (length > IDEAL_CHAR_LIMIT) {
    return {
      status: 'warning' as const,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500',
      message: 'Atenção: mensagem longa',
      showWarning: false,
    };
  }
  return {
    status: 'success' as const,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    message: 'Ideal para mensagem fria',
    showWarning: false,
  };
}

// Suggest column mapping for a variable
export function suggestMapping(variable: string, columns: string[]): string | null {
  const mappings: Record<string, string[]> = {
    'nome': ['nome', 'name', 'cliente', 'contato', 'nome_cliente', 'nome completo'],
    'primeiro_nome': ['primeiro_nome', 'first_name', 'primeiro nome'],
    'telefone': ['telefone', 'phone', 'celular', 'whatsapp', 'fone', 'numero'],
    'empresa': ['empresa', 'company', 'companhia', 'organização', 'org', 'razao social'],
    'email': ['email', 'e-mail', 'mail', 'correio'],
    'cidade': ['cidade', 'city', 'localidade', 'municipio'],
    'segmento': ['segmento', 'segment', 'area', 'setor', 'ramo'],
  };
  
  const keywords = mappings[variable.toLowerCase()] || [];
  return columns.find(col => 
    keywords.some(kw => col.toLowerCase().includes(kw))
  ) || null;
}

// Highlight variables in text for display (returns data for rendering)
export function highlightVariables(text: string): Array<{ type: 'variable' | 'text'; content: string; key: number }> {
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) => ({
    type: part.match(/\{\{[^}]+\}\}/) ? 'variable' : 'text',
    content: part,
    key: i,
  }));
}

// Get category info by value
export function getCategoryInfo(categoryValue: string) {
  return templateCategories.find(c => c.value === categoryValue) || templateCategories[0];
}
