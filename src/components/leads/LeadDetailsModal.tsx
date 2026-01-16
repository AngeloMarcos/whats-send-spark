import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ExternalLink,
  Copy,
  Users,
  Briefcase,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import type { LeadAdmin } from '@/hooks/useLeadsAdmin';

interface LeadDetailsModalProps {
  lead: LeadAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  novo: { label: 'Novo', variant: 'default' },
  contacted: { label: 'Contatado', variant: 'outline' },
  converted: { label: 'Convertido', variant: 'default' },
  rejected: { label: 'Rejeitado', variant: 'destructive' }
};

export function LeadDetailsModal({ lead, open, onOpenChange }: LeadDetailsModalProps) {
  if (!lead) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!`, duration: 2000 });
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  const getPhones = () => {
    if (lead.telefones_array && Array.isArray(lead.telefones_array)) {
      return lead.telefones_array.map((t: any) => 
        typeof t === 'object' ? t.numero || t.phone : t
      );
    }
    if (lead.telefones) {
      return lead.telefones.split(',').map((p: string) => p.trim()).filter(Boolean);
    }
    return [];
  };

  const getSocios = () => {
    if (lead.socios && Array.isArray(lead.socios)) {
      return lead.socios;
    }
    return [];
  };

  const phones = getPhones();
  const socios = getSocios();
  const statusConfig = STATUS_BADGES[lead.status || 'pending'] || STATUS_BADGES.pending;
  const displayName = lead.nome_fantasia || lead.razao_social || lead.nome || 'Sem nome';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Detalhes do Lead
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Header with name and status */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                {lead.razao_social && lead.razao_social !== displayName && (
                  <p className="text-sm text-muted-foreground">{lead.razao_social}</p>
                )}
              </div>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>

            <Separator />

            {/* Company info */}
            <div className="grid grid-cols-2 gap-4">
              {lead.cnpj && (
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{lead.cnpj}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(lead.cnpj!, 'CNPJ')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {lead.situacao && (
                <div>
                  <p className="text-sm text-muted-foreground">Situação Cadastral</p>
                  <Badge variant={lead.situacao === 'ATIVA' ? 'default' : 'secondary'}>
                    {lead.situacao}
                  </Badge>
                </div>
              )}

              {lead.atividade && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Atividade Principal</p>
                  <p className="text-sm">{lead.atividade}</p>
                </div>
              )}

              {lead.porte_empresa && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Porte
                  </p>
                  <p>{lead.porte_empresa}</p>
                </div>
              )}

              {lead.capital_social && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Capital Social
                  </p>
                  <p>{lead.capital_social}</p>
                </div>
              )}

              {lead.data_abertura && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Data Abertura
                  </p>
                  <p>{lead.data_abertura}</p>
                </div>
              )}
            </div>

            {/* Contact info */}
            <Separator />
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4" /> Contato
              </h3>
              <div className="space-y-3">
                {phones.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Telefones ({phones.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {phones.map((phone: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                          <span className="text-sm font-mono">{phone}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(phone, 'Telefone')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-green-600"
                            onClick={() => openWhatsApp(phone)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {lead.email && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(lead.email!, 'Email')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            {(lead.endereco || lead.logradouro || lead.municipio) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Endereço
                  </h3>
                  <div className="text-sm space-y-1">
                    {lead.endereco ? (
                      <p>{lead.endereco}</p>
                    ) : (
                      <>
                        {lead.logradouro && (
                          <p>
                            {lead.logradouro}
                            {lead.numero && `, ${lead.numero}`}
                            {lead.complemento && ` - ${lead.complemento}`}
                          </p>
                        )}
                        {lead.bairro && <p>{lead.bairro}</p>}
                        {(lead.municipio || lead.uf || lead.cep) && (
                          <p>
                            {lead.municipio && lead.municipio}
                            {lead.uf && `/${lead.uf}`}
                            {lead.cep && ` - CEP: ${lead.cep}`}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Partners */}
            {socios.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Sócios ({socios.length})
                  </h3>
                  <div className="space-y-2">
                    {socios.map((socio: any, idx: number) => (
                      <div key={idx} className="bg-muted rounded-md p-2">
                        <p className="font-medium">{socio.nome || socio.name}</p>
                        {socio.qual && (
                          <p className="text-xs text-muted-foreground">{socio.qual}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Fonte</p>
                <p>{lead.source || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p>
                  {lead.created_at
                    ? format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : '-'}
                </p>
              </div>
              {lead.ultimo_contato && (
                <div>
                  <p className="text-muted-foreground">Último contato</p>
                  <p>
                    {format(new Date(lead.ultimo_contato), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
              {lead.numero_tentativas !== null && lead.numero_tentativas > 0 && (
                <div>
                  <p className="text-muted-foreground">Tentativas de contato</p>
                  <p>{lead.numero_tentativas}</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
