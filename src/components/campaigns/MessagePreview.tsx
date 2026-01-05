import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, CheckCheck, User, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { 
  getCharacterStatus, 
  WHATSAPP_CHAR_LIMIT,
  IDEAL_CHAR_LIMIT 
} from '@/lib/templateVariables';

interface Contact {
  id?: string;
  name?: string;
  phone: string;
  extra_data?: Record<string, unknown>;
}

interface MessagePreviewProps {
  message: string;
  contacts?: Contact[];
}

// Realistic sample data for preview
const realisticSampleData = {
  nome: 'Maria Fernanda Costa',
  primeiro_nome: 'Maria',
  telefone: '(11) 98765-4321',
  email: 'maria.costa@techsolutions.com.br',
  empresa: 'Tech Solutions Ltda',
  cidade: 'São Paulo',
  segmento: 'Tecnologia',
  nome_vendedor: 'Carlos Vendas',
  link_calendario: 'calendly.com/carlos',
  link_material: 'link.empresa.com/material',
};

export function MessagePreview({ message, contacts = [] }: MessagePreviewProps) {
  const [selectedContactIndex, setSelectedContactIndex] = useState<string>('sample');

  // Process message with selected contact data
  const processedMessage = useMemo(() => {
    if (!message) return '';

    let result = message;
    const now = new Date();
    
    if (selectedContactIndex === 'sample') {
      // Show with realistic placeholder examples
      result = result.replace(/{{nome}}/gi, realisticSampleData.nome);
      result = result.replace(/{{primeiro_nome}}/gi, realisticSampleData.primeiro_nome);
      result = result.replace(/{{telefone}}/gi, realisticSampleData.telefone);
      result = result.replace(/{{email}}/gi, realisticSampleData.email);
      result = result.replace(/{{empresa}}/gi, realisticSampleData.empresa);
      result = result.replace(/{{cidade}}/gi, realisticSampleData.cidade);
      result = result.replace(/{{segmento}}/gi, realisticSampleData.segmento);
      result = result.replace(/{{data_atual}}/gi, format(now, 'dd/MM/yyyy'));
      result = result.replace(/{{data}}/gi, format(now, 'dd/MM'));
      result = result.replace(/{{hora}}/gi, format(now, 'HH:mm'));
      result = result.replace(/{{nome_vendedor}}/gi, realisticSampleData.nome_vendedor);
      result = result.replace(/{{link_calendario}}/gi, realisticSampleData.link_calendario);
      result = result.replace(/{{link_material}}/gi, realisticSampleData.link_material);
      // Replace any remaining unknown variables
      result = result.replace(/{{[^}]+}}/g, '[variável]');
    } else {
      const contact = contacts[parseInt(selectedContactIndex)];
      if (contact) {
        // Extract first name
        const firstName = contact.name?.split(' ')[0] || 'Nome';
        
        result = result.replace(/{{nome}}/gi, contact.name || 'Nome');
        result = result.replace(/{{primeiro_nome}}/gi, firstName);
        result = result.replace(/{{telefone}}/gi, contact.phone);
        
        // Replace extra_data variables
        if (contact.extra_data) {
          Object.entries(contact.extra_data).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'gi');
            result = result.replace(regex, String(value || ''));
          });
        }
        
        // Date/time variables
        result = result.replace(/{{data_atual}}/gi, format(now, 'dd/MM/yyyy'));
        result = result.replace(/{{data}}/gi, format(now, 'dd/MM'));
        result = result.replace(/{{hora}}/gi, format(now, 'HH:mm'));
        
        // Replace any remaining placeholders
        result = result.replace(/{{[^}]+}}/g, '[não encontrado]');
      }
    }
    
    return result;
  }, [message, selectedContactIndex, contacts]);

  // Highlight placeholders in original message
  const highlightPlaceholders = (text: string) => {
    if (!text) return null;
    
    const parts = text.split(/({{[^}]+}})/g);
    return parts.map((part, index) => {
      if (part.match(/{{[^}]+}}/)) {
        return (
          <span
            key={index}
            className="bg-primary/20 text-primary px-1 rounded font-medium"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const characterCount = message.length;
  const characterStatus = getCharacterStatus(characterCount);
  const progressPercent = Math.min((characterCount / WHATSAPP_CHAR_LIMIT) * 100, 100);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Preview da Mensagem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Selector */}
        {contacts.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Visualizar com dados de:
            </label>
            <Select value={selectedContactIndex} onValueChange={setSelectedContactIndex}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione um contato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sample">
                  <span className="text-muted-foreground">📱 Exemplo realista</span>
                </SelectItem>
                {contacts.slice(0, 10).map((contact, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {contact.name || contact.phone} - {contact.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* WhatsApp-style Preview */}
        <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-lg p-4 min-h-[140px]">
          <div className="bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXWBgYGHh4d5eXlzc3Oeli0fAAAAG3RSTlNAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAvEOwtAAABKklEQVRIx4WV2Q7EIAhF4UKtduvM//+oU1pbqMSTeYEDghsR0qgihBBbYxZFFlG2AXhW3kRPDxgxJrQpALENnLMVGRkxJpRhxQmIfMBmqS+B+BTKNdFFxqEEbNqhUJL+YOMWwLqm1ByBbMwSqGRs1BN4cMnIjRLqJj2tYg7tMdE0nA+g0cBq4Q5hS9KMQjWxNS2B9cz5BRxFqUCaUBOQgamDrgOZ/WP8DqWKaAqwWk0DwM0LPQJ6L0HuAUFVUvE4dwBxPLVPwGb5+kF+P8MFPKFdEPuQLU4/wLYXJH3rLRfEJQ2ksWvk9WBBLEOkYB+EDFnCkUP2AUg/xFsS5z4xNgC47dZX9/5h7N2jz8aOT/cAAAAASUVORK5CYII=')] bg-repeat opacity-10 absolute inset-0 rounded-lg pointer-events-none" />
          
          {message ? (
            <div className="flex justify-end">
              <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-tl-xl rounded-tr-xl rounded-bl-xl max-w-[90%] p-3 shadow-sm relative animate-scale-in">
                {/* Message Content */}
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground dark:text-[#e9edef]">
                  {processedMessage}
                </div>
                
                {/* Time and Checkmarks */}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[11px] text-[#667781] dark:text-[#8696a0]">
                    {format(new Date(), 'HH:mm')}
                  </span>
                  <CheckCheck className="h-4 w-4 text-[#53bdeb]" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">
              A mensagem aparecerá aqui...
            </div>
          )}
        </div>

        {/* Smart Character Counter */}
        <div className="space-y-2 border-t pt-3">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${characterStatus.bgColor}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${characterStatus.color}`}>
              {characterCount}/{WHATSAPP_CHAR_LIMIT}
            </span>
          </div>
          
          {/* Status Message */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              {characterStatus.status === 'error' ? (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  {characterStatus.message}
                </span>
              ) : characterStatus.status === 'warning' ? (
                <span className="flex items-center gap-1 text-amber-500">
                  <AlertCircle className="h-3 w-3" />
                  {characterStatus.message}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-500">
                  <CheckCircle className="h-3 w-3" />
                  {characterStatus.message}
                </span>
              )}
            </div>
            {characterCount > 0 && characterCount <= IDEAL_CHAR_LIMIT && (
              <span className="text-muted-foreground">
                💡 Tamanho ideal
              </span>
            )}
          </div>
        </div>

        {/* Original with Placeholders (collapsed view) */}
        {message && selectedContactIndex !== 'sample' && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Ver template original
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap">{highlightPlaceholders(message)}</p>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
