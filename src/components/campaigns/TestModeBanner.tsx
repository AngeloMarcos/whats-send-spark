import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FlaskConical, Phone, MessageSquare, Timer } from 'lucide-react';

interface TestModeBannerProps {
  testContactPhone?: string;
  maxMessages?: number;
  intervalSeconds?: number;
}

export function TestModeBanner({ 
  testContactPhone, 
  maxMessages = 10, 
  intervalSeconds = 5 
}: TestModeBannerProps) {
  return (
    <Alert className="border-red-500/50 bg-red-500/10">
      <FlaskConical className="h-5 w-5 text-red-500" />
      <AlertTitle className="flex items-center gap-2 text-red-600">
        <Badge className="bg-red-500 text-white animate-pulse">
          🧪 MODO TESTE ATIVO
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-3">
        <ul className="space-y-2 text-sm text-red-600/80">
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Todas as mensagens serão enviadas para: 
            <span className="font-mono font-medium">
              {testContactPhone || 'Configurar em Configurações'}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Limite máximo: <span className="font-medium">{maxMessages} mensagens</span>
          </li>
          <li className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Intervalo reduzido: <span className="font-medium">{intervalSeconds} segundos</span>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
