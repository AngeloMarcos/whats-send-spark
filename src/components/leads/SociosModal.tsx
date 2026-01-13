import { Users, Phone, Calendar, Building2 } from 'lucide-react';
import { Socio } from '@/hooks/useGooglePlaces';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SociosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  razaoSocial: string;
  socios: Socio[];
}

export function SociosModal({ open, onOpenChange, razaoSocial, socios }: SociosModalProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Sócios
          </DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {razaoSocial}
          </p>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {socios.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum sócio cadastrado</p>
              </div>
            ) : (
              socios.map((socio, index) => (
                <Card key={index} className="border-l-4 border-l-primary/50">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {socio.nome}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {socio.qualificacao}
                        </p>
                        
                        {socio.dataEntrada && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Entrada: {formatDate(socio.dataEntrada)}
                          </div>
                        )}
                        
                        {/* Found phones (if any) */}
                        {socio.telefonesEncontrados && socio.telefonesEncontrados.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              Telefones encontrados:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {socio.telefonesEncontrados.map((tel, i) => (
                                <Badge 
                                  key={i} 
                                  className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-700"
                                >
                                  <Phone className="h-3 w-3 mr-1" />
                                  {tel}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Badge 
                        variant={socio.tipo === 'PF' ? 'default' : 'secondary'}
                        className="shrink-0"
                      >
                        {socio.tipo === 'PF' ? (
                          <>
                            <Users className="h-3 w-3 mr-1" />
                            PF
                          </>
                        ) : (
                          <>
                            <Building2 className="h-3 w-3 mr-1" />
                            PJ
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
        
        {socios.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Total: {socios.length} sócio(s) • 
              {' '}{socios.filter(s => s.tipo === 'PF').length} pessoa(s) física(s) • 
              {' '}{socios.filter(s => s.tipo === 'PJ').length} pessoa(s) jurídica(s)
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
