import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatToInternational } from '@/lib/phoneValidation';
import {
  Search,
  History,
  Loader2,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  SkipForward,
  Megaphone,
} from 'lucide-react';

interface SendHistoryItem {
  contact_phone: string;
  contact_name: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  campaign_id: string;
  campaign_name: string;
  campaign_date: string;
}

interface ContactHistoryDialogProps {
  trigger?: React.ReactNode;
}

export function ContactHistoryDialog({ trigger }: ContactHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SendHistoryItem[]>([]);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!phone.trim()) {
      toast({
        title: 'Digite um telefone',
        description: 'Informe o número para buscar o histórico.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setSearched(true);

    try {
      const formattedPhone = formatToInternational(phone.trim());
      
      // Query the view we created
      const { data, error } = await supabase
        .from('contact_send_history')
        .select('*')
        .eq('contact_phone', formattedPhone)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      setResults((data as SendHistoryItem[]) || []);

      if (!data || data.length === 0) {
        toast({
          title: 'Nenhum registro',
          description: `Não encontramos envios para ${formattedPhone}`,
        });
      }
    } catch (error) {
      console.error('Error searching history:', error);
      toast({
        title: 'Erro na busca',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Enviado';
      case 'error':
        return 'Erro';
      case 'skipped':
        return 'Ignorado';
      default:
        return status;
    }
  };

  const resetSearch = () => {
    setPhone('');
    setResults([]);
    setSearched(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetSearch(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Histórico de Envios
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Envios
          </DialogTitle>
          <DialogDescription>
            Consulte para quais campanhas um número já recebeu mensagem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="phone-search">Número de Telefone</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone-search"
                  placeholder="Ex: 11999998888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite o número com DDD, sem espaços ou caracteres especiais
            </p>
          </div>

          {/* Results */}
          {searched && (
            <div className="space-y-3">
              {results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Nenhum envio encontrado para este número.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {results.length} envio{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}
                    </span>
                    {results[0]?.contact_name && (
                      <Badge variant="secondary">
                        {results[0].contact_name}
                      </Badge>
                    )}
                  </div>
                  
                  <ScrollArea className="h-64 rounded-md border">
                    <div className="p-3 space-y-3">
                      {results.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border"
                        >
                          <div className="mt-0.5">
                            {getStatusIcon(item.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                {item.campaign_name}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={
                                  item.status === 'sent' 
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                                    : item.status === 'error'
                                    ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                }
                              >
                                {getStatusLabel(item.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {item.sent_at 
                                ? new Date(item.sent_at).toLocaleString('pt-BR')
                                : new Date(item.campaign_date).toLocaleDateString('pt-BR')
                              }
                            </div>
                            {item.error_message && (
                              <p className="text-xs text-red-500 mt-1 truncate">
                                {item.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
