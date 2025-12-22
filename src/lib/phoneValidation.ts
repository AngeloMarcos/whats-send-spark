// Limpa o número removendo caracteres não numéricos
export function cleanPhoneNumber(phone: string): string {
  return String(phone).replace(/\D/g, '');
}

// Valida se é um número brasileiro válido para WhatsApp
export function isValidBrazilianPhone(phone: string): { valid: boolean; reason?: string } {
  const cleaned = cleanPhoneNumber(phone);
  
  if (!cleaned) {
    return { valid: false, reason: 'Número vazio' };
  }
  
  // Número muito curto (menos de 10 dígitos - mínimo: DDD + 8 dígitos)
  if (cleaned.length < 10) {
    return { valid: false, reason: 'Número muito curto' };
  }
  
  // Número muito longo
  if (cleaned.length > 13) {
    return { valid: false, reason: 'Número muito longo' };
  }
  
  // Se começa com 55, validar formato completo
  if (cleaned.startsWith('55')) {
    // 55 + DDD (2) + número (8-9) = 12 ou 13 dígitos
    if (cleaned.length < 12 || cleaned.length > 13) {
      return { valid: false, reason: 'Formato inválido com código 55' };
    }
    
    const ddd = parseInt(cleaned.substring(2, 4));
    if (ddd < 11 || ddd > 99) {
      return { valid: false, reason: `DDD inválido: ${ddd}` };
    }
    
    return { valid: true };
  }
  
  // Se não começa com 55, deve ter DDD + número (10 ou 11 dígitos)
  if (cleaned.length >= 10 && cleaned.length <= 11) {
    const ddd = parseInt(cleaned.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return { valid: false, reason: `DDD inválido: ${ddd}` };
    }
    return { valid: true };
  }
  
  return { valid: false, reason: 'Formato não reconhecido' };
}

// Formata o número para o padrão internacional (55 + DDD + número)
export function formatToInternational(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  // Se já começa com 55, retorna limpo
  if (cleaned.startsWith('55')) {
    return cleaned;
  }
  
  // Adiciona 55 no início
  return '55' + cleaned;
}

// Tenta corrigir automaticamente o número
export function autoCorrectPhone(phone: string): { corrected: string; wasFixed: boolean } {
  const cleaned = cleanPhoneNumber(phone);
  let wasFixed = false;
  let result = cleaned;
  
  // Se não começa com 55, adiciona
  if (!result.startsWith('55')) {
    result = '55' + result;
    wasFixed = true;
  }
  
  // Se é celular de 8 dígitos (sem o 9), adiciona o 9
  // Formato esperado: 55 + DDD(2) + número(8 ou 9) = 12 ou 13 dígitos
  if (result.length === 12) {
    // Pode ser celular antigo sem o 9
    const ddd = result.substring(2, 4);
    const numero = result.substring(4);
    
    // Se o número começa com 6, 7, 8 ou 9, provavelmente é celular e precisa do 9
    if (['6', '7', '8', '9'].includes(numero[0])) {
      result = '55' + ddd + '9' + numero;
      wasFixed = true;
    }
  }
  
  return { corrected: result, wasFixed };
}

// Interface para validação de contato
export interface PhoneValidationInfo {
  isValid: boolean;
  reason?: string;
  originalPhone: string;
  correctedPhone?: string;
  canFix: boolean;
}

// Interface para resultado da validação
export interface PhoneValidationResult {
  validContacts: Record<string, unknown>[];
  invalidContacts: Record<string, unknown>[];
  validationMap: Map<number, PhoneValidationInfo>;
  summary: {
    total: number;
    validCount: number;
    invalidCount: number;
    fixableCount: number;
  };
}

// Valida array de contatos
export function validateContacts(
  contacts: Record<string, unknown>[], 
  phoneColumn: string
): PhoneValidationResult {
  const validContacts: Record<string, unknown>[] = [];
  const invalidContacts: Record<string, unknown>[] = [];
  const validationMap = new Map<number, PhoneValidationInfo>();
  let fixableCount = 0;
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const phone = String(contact[phoneColumn] ?? '');
    const validation = isValidBrazilianPhone(phone);
    
    if (validation.valid) {
      validContacts.push(contact);
      validationMap.set(i, {
        isValid: true,
        originalPhone: phone,
        canFix: false,
      });
    } else {
      // Verifica se pode ser corrigido
      const { corrected } = autoCorrectPhone(phone);
      const afterCorrection = isValidBrazilianPhone(corrected);
      const canFix = afterCorrection.valid;
      
      if (canFix) fixableCount++;
      
      invalidContacts.push(contact);
      validationMap.set(i, {
        isValid: false,
        reason: validation.reason,
        originalPhone: phone,
        correctedPhone: canFix ? corrected : undefined,
        canFix,
      });
    }
  }
  
  return {
    validContacts,
    invalidContacts,
    validationMap,
    summary: {
      total: contacts.length,
      validCount: validContacts.length,
      invalidCount: invalidContacts.length,
      fixableCount,
    },
  };
}

// Aplica correção automática em todos os contatos
export function applyAutoCorrection(
  contacts: Record<string, unknown>[],
  phoneColumn: string
): Record<string, unknown>[] {
  return contacts.map((contact) => {
    const phone = String(contact[phoneColumn] ?? '');
    const { corrected } = autoCorrectPhone(phone);
    
    return {
      ...contact,
      [phoneColumn]: corrected,
    };
  });
}
