import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  Eye,
  Trash2,
  Copy,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import type { LeadAdmin } from '@/hooks/useLeadsAdmin';

interface LeadsTableProps {
  leads: LeadAdmin[];
  loading?: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onViewLead: (lead: LeadAdmin) => void;
  onDeleteLead: (id: string) => void;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  novo: { label: 'Novo', variant: 'default' },
  contacted: { label: 'Contatado', variant: 'outline' },
  converted: { label: 'Convertido', variant: 'default' },
  rejected: { label: 'Rejeitado', variant: 'destructive' }
};

const SOURCE_LABELS: Record<string, string> = {
  google_cnpj_biz: '🌐 Google + CNPJ',
  google_maps: '📍 Google Maps',
  imported: '📥 Importado',
  manual: '✏️ Manual'
};

export function LeadsTable({
  leads,
  loading,
  selectedIds,
  onSelectionChange,
  onViewLead,
  onDeleteLead
}: LeadsTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAllSelected = leads.length > 0 && selectedIds.length === leads.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < leads.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(leads.map((l) => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getDisplayName = (lead: LeadAdmin) => {
    return lead.nome_fantasia || lead.razao_social || lead.nome || 'Sem nome';
  };

  const getPhoneCount = (lead: LeadAdmin) => {
    if (lead.telefones_array && Array.isArray(lead.telefones_array)) {
      return lead.telefones_array.length;
    }
    if (lead.telefones) {
      return lead.telefones.split(',').filter(Boolean).length;
    }
    return 0;
  };

  const getFirstPhone = (lead: LeadAdmin) => {
    if (lead.telefones_array && Array.isArray(lead.telefones_array) && lead.telefones_array.length > 0) {
      const first = lead.telefones_array[0];
      return typeof first === 'object' ? first.numero || first.phone : first;
    }
    if (lead.telefones) {
      return lead.telefones.split(',')[0]?.trim();
    }
    return null;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!`, duration: 2000 });
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDeleteLead(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Telefones</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-4 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-32 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-28 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-8 bg-muted rounded animate-pulse" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
        <p className="text-muted-foreground">
          Tente ajustar os filtros ou faça uma nova busca de leads.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) (el as any).indeterminate = isSomeSelected;
                  }}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Telefones</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const phoneCount = getPhoneCount(lead);
              const firstPhone = getFirstPhone(lead);
              const statusConfig = STATUS_BADGES[lead.status || 'pending'] || STATUS_BADGES.pending;

              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="font-medium truncate" title={getDisplayName(lead)}>
                        {getDisplayName(lead)}
                      </p>
                      {lead.email && (
                        <p className="text-xs text-muted-foreground truncate" title={lead.email}>
                          {lead.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.cnpj ? (
                      <span className="font-mono text-sm">{lead.cnpj}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {phoneCount > 0 ? (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{phoneCount} tel</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.municipio || lead.uf ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {lead.municipio ? `${lead.municipio}` : ''}
                          {lead.uf ? `/${lead.uf}` : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {SOURCE_LABELS[lead.source || ''] || lead.source || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {lead.created_at ? (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), 'dd/MM/yy', { locale: ptBR })}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewLead(lead)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        {firstPhone && (
                          <>
                            <DropdownMenuItem onClick={() => openWhatsApp(firstPhone)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(firstPhone, 'Telefone')}>
                              <Phone className="h-4 w-4 mr-2" />
                              Copiar telefone
                            </DropdownMenuItem>
                          </>
                        )}
                        {lead.email && (
                          <DropdownMenuItem onClick={() => copyToClipboard(lead.email!, 'Email')}>
                            <Mail className="h-4 w-4 mr-2" />
                            Copiar email
                          </DropdownMenuItem>
                        )}
                        {lead.cnpj && (
                          <DropdownMenuItem onClick={() => copyToClipboard(lead.cnpj!, 'CNPJ')}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar CNPJ
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteConfirmId(lead.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
