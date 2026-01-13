import { Users, Phone, Calendar, Building2, MessageCircle, ExternalLink, Shield, ShieldCheck, ShieldAlert, Smartphone, Send } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { buildWhatsAppUrl, cleanPhone, isValidBrazilianPhone } from '@/lib/phoneUtils';

interface SociosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  razaoSocial: string;
  socios: Socio[];
}

// Mensagem padrão de abordagem comercial
const MENSAGEM_PADRAO = (nomeEmpresa: string) => 
  `Olá, vi que você é sócio da ${nomeEmpresa}. Tenho uma solução de automação de WhatsApp/CRM que ajuda imobiliárias a atender leads 24h, qualificar automaticamente e aumentar fechamentos. Posso te mostrar rapidinho como funciona?`;

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

  // Valida se o telefone tem pelo menos 10 dígitos (DDD + número)
  const telefoneValido = (phone: string): boolean => {
    return isValidBrazilianPhone(phone);
  };

  // Gera link do WhatsApp simples (sem mensagem)
  const getWhatsAppLink = (phone: string) => {
    return buildWhatsAppUrl(phone);
  };

  // Gera link do WhatsApp com mensagem de abordagem
  const getWhatsAppLinkComMensagem = (phone: string, nomeEmpresa: string) => {
    return buildWhatsAppUrl(phone, MENSAGEM_PADRAO(nomeEmpresa));
  };

  // Obtém o primeiro telefone válido do sócio (priorizando celulares)
  const getPrimeiroTelefoneValido = (socio: Socio): string | null => {
    if (!socio.telefonesEncontrados || socio.telefonesEncontrados.length === 0) {
      return null;
    }

    // Primeiro tenta encontrar um celular válido
    for (let i = 0; i < socio.telefonesEncontrados.length; i++) {
      const tel = socio.telefonesEncontrados[i];
      if (telefoneValido(tel) && socio.tiposTelefones?.[i] === 'celular') {
        return tel;
      }
    }

    // Se não encontrou celular, retorna o primeiro telefone válido
    for (const tel of socio.telefonesEncontrados) {
      if (telefoneValido(tel)) {
        return tel;
      }
    }

    return null;
  };

  const getConfiabilidadeBadge = (confiabilidade?: string) => {
    switch (confiabilidade) {
      case 'alta':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 text-[10px] px-1 py-0">
                <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                Alta
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Confiabilidade alta - telefone verificado</TooltipContent>
          </Tooltip>
        );
      case 'media':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 text-[10px] px-1 py-0">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                Média
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Confiabilidade média - verificar antes de usar</TooltipContent>
          </Tooltip>
        );
      case 'baixa':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 text-[10px] px-1 py-0">
                <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
                Baixa
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Confiabilidade baixa - confirmar telefone</TooltipContent>
          </Tooltip>
        );
      default:
        return null;
    }
  };

  const getTipoIcon = (tipo?: string) => {
    if (tipo === 'celular') {
      return <Smartphone className="h-3 w-3 text-green-600" />;
    }
    return <Phone className="h-3 w-3" />;
  };

  const sociosWithPhone = socios.filter(s => s.telefonesEncontrados && s.telefonesEncontrados.length > 0).length;
  const totalPhones = socios.reduce((acc, s) => acc + (s.telefonesEncontrados?.length || 0), 0);
  const totalCelulares = socios.reduce((acc, s) => {
    return acc + (s.tiposTelefones?.filter(t => t === 'celular').length || 0);
  }, 0);

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
              <TooltipProvider>
                {socios.map((socio, index) => {
                  const primeiroTelefone = getPrimeiroTelefoneValido(socio);
                  
                  return (
                    <Card key={index} className="border-l-4 border-l-primary/50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground truncate">
                                {socio.nome}
                              </p>
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
                            
                            <p className="text-sm text-muted-foreground">
                              {socio.qualificacao}
                            </p>
                            
                            {socio.dataEntrada && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Entrada: {formatDate(socio.dataEntrada)}
                              </div>
                            )}
                            
                            {/* Botão principal WhatsApp Sócio - aparece apenas se tiver telefone válido */}
                            {primeiroTelefone && (
                              <div className="mt-3">
                                <Button
                                  asChild
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                                >
                                  <a
                                    href={getWhatsAppLinkComMensagem(primeiroTelefone, razaoSocial)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    WhatsApp Sócio
                                  </a>
                                </Button>
                              </div>
                            )}
                            
                            {/* Lista de telefones encontrados */}
                            {socio.telefonesEncontrados && socio.telefonesEncontrados.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  Telefones encontrados:
                                </p>
                                <div className="space-y-2">
                                  {socio.telefonesEncontrados.map((tel, i) => (
                                    <div key={i} className="flex flex-wrap items-center gap-1.5">
                                      <Badge 
                                        className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-700"
                                      >
                                        {getTipoIcon(socio.tiposTelefones?.[i])}
                                        <span className="ml-1">{tel}</span>
                                      </Badge>
                                      
                                      {/* Confiabilidade badge */}
                                      {socio.confiabilidadesTelefones?.[i] && 
                                        getConfiabilidadeBadge(socio.confiabilidadesTelefones[i])
                                      }
                                      
                                      {/* WhatsApp button - só mostra se telefone for válido */}
                                      {telefoneValido(tel) && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <a
                                              href={getWhatsAppLink(tel)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                                            >
                                              <MessageCircle className="h-3 w-3" />
                                            </a>
                                          </TooltipTrigger>
                                          <TooltipContent>Abrir WhatsApp (sem mensagem)</TooltipContent>
                                        </Tooltip>
                                      )}

                                      {/* Source tooltip */}
                                      {socio.fontesTelefones?.[i] && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <a
                                              href={socio.fontesTelefones[i].startsWith('http') ? socio.fontesTelefones[i] : undefined}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                              <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
                                              Fonte
                                            </a>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs">
                                            <p className="text-xs break-all">{socio.fontesTelefones[i]}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TooltipProvider>
            )}
          </div>
        </ScrollArea>
        
        {socios.length > 0 && (
          <div className="pt-3 border-t space-y-1">
            <p className="text-xs text-muted-foreground text-center">
              Total: {socios.length} sócio(s) • 
              {' '}{socios.filter(s => s.tipo === 'PF').length} pessoa(s) física(s) • 
              {' '}{socios.filter(s => s.tipo === 'PJ').length} pessoa(s) jurídica(s)
            </p>
            {totalPhones > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 text-center font-medium">
                📞 {totalPhones} telefone(s) ({totalCelulares} celular{totalCelulares !== 1 ? 'es' : ''}) em {sociosWithPhone} sócio(s)
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
