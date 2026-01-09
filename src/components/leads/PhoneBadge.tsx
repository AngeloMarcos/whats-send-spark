import { Phone, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WhatsAppButton } from './WhatsAppButton';
import type { ProcessedPhone } from '@/lib/phoneUtils';
import { cn } from '@/lib/utils';

interface PhoneBadgeProps {
  phone: ProcessedPhone;
  showWhatsApp?: boolean;
  companyName?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function PhoneBadge({
  phone,
  showWhatsApp = true,
  companyName,
  size = 'sm',
  className,
}: PhoneBadgeProps) {
  const isCelular = phone.type === 'celular';
  
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Badge
        variant="outline"
        className={cn(
          'gap-1 font-mono',
          size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
          isCelular 
            ? 'border-green-200 bg-green-50 text-green-700' 
            : 'border-blue-200 bg-blue-50 text-blue-700'
        )}
      >
        {isCelular ? (
          <Smartphone className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        ) : (
          <Phone className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        )}
        {phone.formatted}
      </Badge>
      
      {showWhatsApp && phone.isValid && (
        <WhatsAppButton
          phone={phone.formatted}
          internationalPhone={phone.international}
          companyName={companyName}
          size={size}
        />
      )}
    </div>
  );
}

interface PhoneBadgeListProps {
  phones: ProcessedPhone[];
  showWhatsApp?: boolean;
  companyName?: string;
  maxVisible?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function PhoneBadgeList({
  phones,
  showWhatsApp = true,
  companyName,
  maxVisible = 3,
  size = 'sm',
  className,
}: PhoneBadgeListProps) {
  const visiblePhones = phones.slice(0, maxVisible);
  const hiddenCount = phones.length - maxVisible;
  
  if (phones.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">Sem telefone</span>
    );
  }
  
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visiblePhones.map((phone, index) => (
        <PhoneBadge
          key={`${phone.cleaned}-${index}`}
          phone={phone}
          showWhatsApp={showWhatsApp}
          companyName={companyName}
          size={size}
        />
      ))}
      {hiddenCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{hiddenCount} mais
        </Badge>
      )}
    </div>
  );
}
