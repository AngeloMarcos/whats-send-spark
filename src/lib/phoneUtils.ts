/**
 * Phone utilities for processing Brazilian phone numbers and generating WhatsApp links
 */

export interface ProcessedPhone {
  original: string;
  cleaned: string;
  international: string;
  formatted: string;
  type: 'celular' | 'comercial' | 'desconhecido';
  whatsappApiLink: string;
  whatsappCustomLink: string;
  isValid: boolean;
}

/**
 * Parse a phone string that may contain multiple phones separated by delimiters
 */
export function parsePhoneString(phoneString: string): string[] {
  if (!phoneString || typeof phoneString !== 'string') return [];
  
  // Split by common delimiters: " / ", "/", ",", ";", " - "
  const phones = phoneString
    .split(/\s*[\/,;]\s*|\s+-\s+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  return phones;
}

/**
 * Clean a phone number to only digits
 */
export function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Detect if phone is celular or comercial based on Brazilian patterns
 */
export function detectPhoneType(phone: string): 'celular' | 'comercial' | 'desconhecido' {
  const cleaned = cleanPhone(phone);
  
  // Remove country code if present
  let localNumber = cleaned;
  if (cleaned.startsWith('55') && cleaned.length > 10) {
    localNumber = cleaned.slice(2);
  }
  
  // Check if it's a mobile number (starts with 9 after DDD and has 9 digits in local part)
  if (localNumber.length === 11) {
    const localPart = localNumber.slice(2); // Remove DDD
    if (localPart.startsWith('9')) {
      return 'celular';
    }
    return 'comercial';
  }
  
  if (localNumber.length === 10) {
    return 'comercial';
  }
  
  return 'desconhecido';
}

/**
 * Format phone to international format (with 55 prefix)
 */
export function toInternationalFormat(phone: string): string {
  const cleaned = cleanPhone(phone);
  
  if (cleaned.length === 0) return '';
  
  // Already has country code
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return cleaned;
  }
  
  // Add country code
  return `55${cleaned}`;
}

/**
 * Format phone for display: (11) 99999-9999
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = cleanPhone(phone);
  
  // Remove country code if present
  let localNumber = cleaned;
  if (cleaned.startsWith('55') && cleaned.length > 10) {
    localNumber = cleaned.slice(2);
  }
  
  if (localNumber.length === 11) {
    return `(${localNumber.slice(0, 2)}) ${localNumber.slice(2, 7)}-${localNumber.slice(7)}`;
  }
  
  if (localNumber.length === 10) {
    return `(${localNumber.slice(0, 2)}) ${localNumber.slice(2, 6)}-${localNumber.slice(6)}`;
  }
  
  return phone; // Return original if can't format
}

/**
 * Validate if it's a valid Brazilian phone
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const cleaned = cleanPhone(phone);
  
  // Remove country code if present
  let localNumber = cleaned;
  if (cleaned.startsWith('55')) {
    localNumber = cleaned.slice(2);
  }
  
  // Must be 10 or 11 digits (with DDD)
  if (localNumber.length !== 10 && localNumber.length !== 11) {
    return false;
  }
  
  // DDD must be between 11-99
  const ddd = parseInt(localNumber.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return false;
  }
  
  return true;
}

/**
 * Generate WhatsApp API direct link
 */
export function generateWhatsAppApiLink(phone: string): string {
  const international = toInternationalFormat(phone);
  if (!international) return '';
  return `https://api.whatsapp.com/send?phone=${international}`;
}

/**
 * Generate custom WhatsApp link with company name
 */
export function generateWhatsAppCustomLink(phone: string, companyName?: string): string {
  const international = toInternationalFormat(phone);
  if (!international) return '';
  
  const encodedName = encodeURIComponent(companyName || '');
  return `https://api.whatsapp.com/send?phone=${international}&text=Olá ${encodedName}`;
}

/**
 * Process a single phone number into a structured object
 */
export function processPhone(phone: string, companyName?: string): ProcessedPhone {
  const cleaned = cleanPhone(phone);
  const international = toInternationalFormat(phone);
  const isValid = isValidBrazilianPhone(phone);
  
  return {
    original: phone,
    cleaned,
    international,
    formatted: formatPhoneDisplay(phone),
    type: detectPhoneType(phone),
    whatsappApiLink: isValid ? generateWhatsAppApiLink(phone) : '',
    whatsappCustomLink: isValid ? generateWhatsAppCustomLink(phone, companyName) : '',
    isValid,
  };
}

/**
 * Process multiple phones from a string
 */
export function processPhones(phoneString: string, companyName?: string): ProcessedPhone[] {
  const phones = parsePhoneString(phoneString);
  return phones
    .map(phone => processPhone(phone, companyName))
    .filter(p => p.cleaned.length > 0);
}

/**
 * Get only valid celular phones (for WhatsApp)
 */
export function getValidCelulares(phones: ProcessedPhone[]): ProcessedPhone[] {
  return phones.filter(p => p.isValid && p.type === 'celular');
}

/**
 * Generate all WhatsApp links from phones
 */
export function getAllWhatsAppLinks(phones: ProcessedPhone[]): string[] {
  return phones
    .filter(p => p.isValid)
    .map(p => p.whatsappApiLink)
    .filter(link => link.length > 0);
}
