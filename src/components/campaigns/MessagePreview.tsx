import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

interface MessagePreviewProps {
  message: string;
}

export function MessagePreview({ message }: MessagePreviewProps) {
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Preview da Mensagem
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted rounded-lg p-4 min-h-[100px]">
          {message ? (
            <p className="text-sm whitespace-pre-wrap">
              {highlightPlaceholders(message)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              A mensagem aparecerá aqui...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}