import { MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { buildWhatsAppUrl, formatPhoneDisplay } from '@/lib/phoneUtils';

interface WhatsAppButtonProps {
  phone: string;
  internationalPhone?: string;
  companyName?: string;
  variant?: 'icon' | 'full' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function WhatsAppButton({
  phone,
  internationalPhone,
  companyName,
  variant = 'icon',
  size = 'sm',
  className,
}: WhatsAppButtonProps) {
  const phoneToUse = internationalPhone || phone;
  const message = companyName ? `Olá ${companyName}` : undefined;
  const whatsappUrl = buildWhatsAppUrl(phoneToUse, message);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (variant === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClick}
              className={cn(
                sizeClasses[size],
                'text-green-600 hover:text-green-700 hover:bg-green-50',
                className
              )}
            >
              <MessageCircle className={iconSizes[size]} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Abrir WhatsApp: {formatPhoneDisplay(phone)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className={cn(
          'h-6 px-2 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50',
          className
        )}
      >
        <MessageCircle className="h-3 w-3" />
        WhatsApp
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={size === 'lg' ? 'default' : 'sm'}
      onClick={handleClick}
      className={cn(
        'gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300',
        className
      )}
    >
      <MessageCircle className={iconSizes[size]} />
      <span>{formatPhoneDisplay(phone)}</span>
      <ExternalLink className="h-3 w-3" />
    </Button>
  );
}
