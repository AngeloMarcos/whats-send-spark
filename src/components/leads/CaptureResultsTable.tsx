import { useState } from 'react';
import { 
  Building2, 
  Mail, 
  MapPin, 
  Copy, 
  Download, 
  Plus,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PhoneBadgeList } from './PhoneBadge';
import { ExportDialog } from './ExportDialog';
import { toast } from 'sonner';
import type { LeadCapturado } from '@/types/leadCapture';
import { cn } from '@/lib/utils';

interface CaptureResultsTableProps {
  leads: LeadCapturado[];
  onAddToList?: (leads: LeadCapturado[]) => void;
  loading?: boolean;
}

export function CaptureResultsTable({ 
  leads, 
  onAddToList,
  loading = false,
}: CaptureResultsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyAllWhatsAppLinks = () => {
    const selectedLeads = leads.filter(l => selectedIds.has(l.id));
    const leadsToUse = selectedLeads.length > 0 ? selectedLeads : leads;
    
    const links = leadsToUse
      .flatMap(l => l.telefones.filter(p => p.isValid).map(p => p.whatsappApiLink))
      .filter(Boolean);
    
    if (links.length === 0) {
      toast.error('Nenhum link WhatsApp disponível');
      return;
    }

    navigator.clipboard.writeText(links.join('\n'));
    toast.success(`${links.length} links copiados!`);
  };

  const getSituacaoBadge = (situacao: string) => {
    const isActive = situacao?.toUpperCase().includes('ATIVA');
    return (
      <Badge 
        variant="outline" 
        className={cn(
          'gap-1',
          isActive 
            ? 'border-green-200 bg-green-50 text-green-700' 
            : 'border-red-200 bg-red-50 text-red-700'
        )}
      >
        {isActive ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
        {situacao || 'Desconhecida'}
      </Badge>
    );
  };

  const selectedLeads = leads.filter(l => selectedIds.has(l.id));
  const leadsToExport = selectedLeads.length > 0 ? selectedLeads : leads;

  if (leads.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0 
              ? `${selectedIds.size} de ${leads.length} selecionados`
              : `${leads.length} leads encontrados`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyAllWhatsAppLinks}
            className="gap-1.5"
          >
            <Copy className="h-4 w-4" />
            Copiar Links
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          {onAddToList && (
            <Button
              size="sm"
              onClick={() => onAddToList(selectedLeads.length > 0 ? selectedLeads : leads)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Adicionar à Lista
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === leads.length && leads.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-8"></TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Telefones</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map(lead => (
              <Collapsible key={lead.id} asChild open={expandedIds.has(lead.id)}>
                <>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => toggleExpand(lead.id)}
                        >
                          {expandedIds.has(lead.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {lead.cnpj}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <div className="font-medium line-clamp-1">
                            {lead.razao_social}
                          </div>
                          {lead.nome_fantasia && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {lead.nome_fantasia}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PhoneBadgeList 
                        phones={lead.telefones} 
                        companyName={lead.razao_social}
                        maxVisible={2}
                      />
                    </TableCell>
                    <TableCell>
                      {lead.email ? (
                        <a 
                          href={`mailto:${lead.email}`}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">{lead.email}</span>
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.municipio || lead.uf ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {[lead.municipio, lead.uf].filter(Boolean).join('/')}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getSituacaoBadge(lead.situacao)}
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Details */}
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={8} className="p-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Endereço Completo</h4>
                            <p className="text-sm text-muted-foreground">
                              {lead.endereco || 'Não disponível'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">Atividade Principal</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {lead.atividade_principal || 'Não disponível'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">Sócio Principal</h4>
                            <p className="text-sm text-muted-foreground">
                              {lead.owner_name || 'Não disponível'}
                            </p>
                          </div>
                          {lead.data_abertura && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Data de Abertura</h4>
                              <p className="text-sm text-muted-foreground">
                                {lead.data_abertura}
                              </p>
                            </div>
                          )}
                          {lead.porte_empresa && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Porte</h4>
                              <p className="text-sm text-muted-foreground">
                                {lead.porte_empresa}
                              </p>
                            </div>
                          )}
                          {lead.capital_social && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Capital Social</h4>
                              <p className="text-sm text-muted-foreground">
                                R$ {Number(lead.capital_social).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))}
          </TableBody>
        </Table>
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        leads={leadsToExport}
      />
    </div>
  );
}
