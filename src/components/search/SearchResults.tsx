import { useState, useMemo } from 'react';
import { 
  Download, 
  ListPlus, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Building,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PhoneBadge } from '@/components/leads/PhoneBadge';
import { WhatsAppButton } from '@/components/leads/WhatsAppButton';
import type { LeadCapturado } from '@/types/leadCapture';

interface SearchResultsProps {
  results: LeadCapturado[];
  totalResults: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onExport: (leads: LeadCapturado[]) => void;
  onAddToList: (leads: LeadCapturado[]) => void;
}

export function SearchResults({
  results,
  totalResults,
  currentPage,
  totalPages,
  pageSize,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  onExport,
  onAddToList,
}: SearchResultsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedLeads = useMemo(() => {
    return results.filter(lead => selectedIds.has(lead.id || ''));
  }, [results, selectedIds]);

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(l => l.id || '')));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleExport = () => {
    const leadsToExport = selectedIds.size > 0 ? selectedLeads : results;
    onExport(leadsToExport);
  };

  const handleAddToList = () => {
    const leadsToAdd = selectedIds.size > 0 ? selectedLeads : results;
    onAddToList(leadsToAdd);
  };

  if (results.length === 0) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Resultados da Pesquisa
            <Badge variant="secondary" className="ml-2">
              {totalResults.toLocaleString('pt-BR')} empresas
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Badge variant="outline">
                {selectedIds.size} selecionados
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToList}
            >
              <ListPlus className="h-4 w-4 mr-2" />
              Adicionar à Lista
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size === results.length && results.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Telefones</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id || '')}
                        onCheckedChange={() => toggleSelect(lead.id || '')}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm truncate max-w-[250px]">
                          {lead.nome_fantasia || lead.razao_social}
                        </div>
                        {lead.cnpj && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {lead.cnpj}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.telefones.slice(0, 2).map((phone, idx) => (
                          <PhoneBadge 
                            key={idx} 
                            phone={phone} 
                            showWhatsApp={false}
                          />
                        ))}
                        {lead.telefones.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{lead.telefones.length - 2} mais
                          </Badge>
                        )}
                        {lead.telefones.length === 0 && lead.telefones_raw && (
                          <span className="text-xs text-muted-foreground">
                            {lead.telefones_raw}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {lead.telefones
                          .filter(p => p.whatsappApiLink)
                          .slice(0, 2)
                          .map((phone, idx) => (
                            <WhatsAppButton
                              key={idx}
                              phone={phone.formatted || phone.original}
                              size="sm"
                            />
                          ))}
                        {lead.telefones.filter(p => p.whatsappApiLink).length === 0 && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{lead.email}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate max-w-[120px]">
                          {lead.municipio && lead.uf 
                            ? `${lead.municipio}/${lead.uf}`
                            : lead.uf || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={lead.situacao === 'ATIVA' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {lead.situacao || '-'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {startItem.toLocaleString('pt-BR')} - {endItem.toLocaleString('pt-BR')} de {totalResults.toLocaleString('pt-BR')} resultados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={currentPage === totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
