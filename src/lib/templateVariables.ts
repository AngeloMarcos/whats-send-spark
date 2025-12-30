import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Standard template variables
export const standardVariables = [
  { key: 'nome', label: 'Nome', icon: '👤', description: 'Nome do contato' },
  { key: 'telefone', label: 'Telefone', icon: '📱', description: 'Telefone do contato' },
  { key: 'empresa', label: 'Empresa', icon: '🏢', description: 'Nome da empresa' },
  { key: 'email', label: 'Email', icon: '📧', description: 'Email do contato' },
  { key: 'data', label: 'Data', icon: '📅', description: 'Data atual' },
  { key: 'hora', label: 'Hora', icon: '🕐', description: 'Hora atual' },
];

// Category options for templates
export const templateCategories = [
  { value: 'geral', label: 'Geral', color: 'bg-muted text-muted-foreground' },
  { value: 'marketing', label: 'Marketing', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'vendas', label: 'Vendas', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'suporte', label: 'Suporte', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'boas-vindas', label: 'Boas-vindas', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'lembrete', label: 'Lembrete', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
];

// Preset templates library
export const presetTemplates = [
  {
    name: 'Boas-vindas',
    category: 'boas-vindas',
    content: 'Olá {{nome}}! 👋\n\nSeja muito bem-vindo(a)! Estamos muito felizes em tê-lo(a) conosco.\n\nQualquer dúvida, é só responder esta mensagem.\n\nAbraços!',
    description: 'Template padrão para dar boas-vindas a novos clientes',
    variables: ['nome'],
  },
  {
    name: 'Promoção',
    category: 'marketing',
    content: 'Olá {{nome}}! 🎉\n\nTemos uma promoção exclusiva para você!\n\n🔥 Condições especiais até {{data}}.\n\nResponda SIM para saber mais!',
    description: 'Template para campanhas de promoção e ofertas',
    variables: ['nome', 'data'],
  },
  {
    name: 'Lembrete',
    category: 'lembrete',
    content: 'Olá {{nome}}! ⏰\n\nEste é um lembrete sobre nosso compromisso.\n\n📅 Data: {{data}}\n🕐 Horário: {{hora}}\n\nConfirma sua presença?',
    description: 'Template para lembretes de compromissos e reuniões',
    variables: ['nome', 'data', 'hora'],
  },
  {
    name: 'Agradecimento',
    category: 'suporte',
    content: 'Olá {{nome}}! 💚\n\nMuito obrigado pela sua confiança!\n\nFoi um prazer atendê-lo(a). Conte conosco sempre!\n\nAbraços da equipe.',
    description: 'Template para agradecer após atendimento ou compra',
    variables: ['nome'],
  },
  {
    name: 'Cobrança Amigável',
    category: 'vendas',
    content: 'Olá {{nome}}! 📋\n\nIdentificamos uma pendência em sua conta.\n\nVamos resolver juntos? Responda esta mensagem para negociarmos as melhores condições.\n\nAguardamos seu retorno!',
    description: 'Template para cobrança de forma amigável',
    variables: ['nome'],
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

// Process message with contact data
export function processMessage(
  message: string, 
  contact?: { name?: string; phone?: string; [key: string]: unknown }
): string {
  let result = message;
  const now = new Date();
  
  // Replace standard variables
  result = result.replace(/\{\{nome\}\}/gi, contact?.name || 'Nome');
  result = result.replace(/\{\{telefone\}\}/gi, contact?.phone || '(11) 99999-9999');
  result = result.replace(/\{\{empresa\}\}/gi, String(contact?.empresa || contact?.company || 'Empresa'));
  result = result.replace(/\{\{email\}\}/gi, String(contact?.email || 'email@exemplo.com'));
  result = result.replace(/\{\{data\}\}/gi, format(now, 'dd/MM', { locale: ptBR }));
  result = result.replace(/\{\{hora\}\}/gi, format(now, 'HH:mm', { locale: ptBR }));
  
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

// Suggest column mapping for a variable
export function suggestMapping(variable: string, columns: string[]): string | null {
  const mappings: Record<string, string[]> = {
    'nome': ['nome', 'name', 'cliente', 'contato', 'nome_cliente', 'nome completo'],
    'telefone': ['telefone', 'phone', 'celular', 'whatsapp', 'fone', 'numero'],
    'empresa': ['empresa', 'company', 'companhia', 'organização', 'org', 'razao social'],
    'email': ['email', 'e-mail', 'mail', 'correio'],
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
