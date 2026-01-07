import { useState, useMemo } from 'react';
import { Star, Globe, Phone, MapPin, ChevronLeft, ChevronRight, ExternalLink, Search, ArrowUpDown, X } from 'lucide-react';
import { Lead } from '@/hooks/useGooglePlaces';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ResultsTableProps {
  leads: Lead[];
  selectedLeads: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

type SortField = 'name' | 'rating' | 'reviews_count';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export function ResultsTable({ leads, selectedLeads, onSelectionChange }: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [nameFilter, setNameFilter] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Apply name filter - null-safe
    if (nameFilter.trim()) {
      const search = nameFilter.toLowerCase();
      result = result.filter(lead => 
        String(lead.name ?? '').toLowerCase().includes(search) ||
        String(lead.phone ?? '').includes(search)
      );
    }

    // Apply rating filter
    if (minRatingFilter !== 'all') {
      const minRating = parseFloat(minRatingFilter);
      result = result.filter(lead => (lead.rating || 0) >= minRating);
    }

    // Apply sorting - null-safe
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = String(a.name ?? '').localeCompare(String(b.name ?? ''));
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'reviews_count':
          comparison = (a.reviews_count || 0) - (b.reviews_count || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [leads, nameFilter, minRatingFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = filteredAndSortedLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Selection logic now works on filtered leads
  const allFilteredSelected = filteredAndSortedLeads.length > 0 && 
    filteredAndSortedLeads.every(lead => selectedLeads.has(lead.place_id));
  const someSelected = filteredAndSortedLeads.some(lead => selectedLeads.has(lead.place_id));

  const handleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      // Deselect only filtered leads
      const newSelection = new Set(selectedLeads);
      filteredAndSortedLeads.forEach(lead => newSelection.delete(lead.place_id));
      onSelectionChange(newSelection);
    } else {
      // Select all filtered leads
      const newSelection = new Set(selectedLeads);
      filteredAndSortedLeads.forEach(lead => newSelection.add(lead.place_id));
      onSelectionChange(newSelection);
    }
  };

  const handleSelectPageLeads = () => {
    const newSelection = new Set(selectedLeads);
    paginatedLeads.forEach(lead => newSelection.add(lead.place_id));
    onSelectionChange(newSelection);
  };

  const handleClearSelection = () => {
    onSelectionChange(new Set());
  };

  const handleSelectLead = (placeId: string) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(placeId)) {
      newSelection.delete(placeId);
    } else {
      newSelection.add(placeId);
    }
    onSelectionChange(newSelection);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  };

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [nameFilter, minRatingFilter]);

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <MapPin className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Nenhum resultado ainda</p>
          <p className="text-sm">Configure a busca acima e clique em buscar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Resultados ({filteredAndSortedLeads.length} de {leads.length})
            </CardTitle>
            <Badge variant="outline">
              {selectedLeads.size} selecionado{selectedLeads.size !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nome ou telefone..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pl-9 pr-8"
              />
              {nameFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setNameFilter('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Select value={minRatingFilter} onValueChange={setMinRatingFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Avaliação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="3">3+ ⭐</SelectItem>
                <SelectItem value="4">4+ ⭐</SelectItem>
                <SelectItem value="4.5">4.5+ ⭐</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortField}-${sortOrder}`} onValueChange={(v) => {
              const [field, order] = v.split('-') as [SortField, SortOrder];
              setSortField(field);
              setSortOrder(order);
            }}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                <SelectItem value="rating-desc">Avaliação (Maior)</SelectItem>
                <SelectItem value="rating-asc">Avaliação (Menor)</SelectItem>
                <SelectItem value="reviews_count-desc">Reviews (Mais)</SelectItem>
                <SelectItem value="reviews_count-asc">Reviews (Menos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={handleSelectAllFiltered}
                    className={someSelected && !allFilteredSelected ? 'opacity-50' : ''}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('name')}
                >
                  Nome
                  {sortField === 'name' && (
                    <ArrowUpDown className="inline ml-1 h-3 w-3" />
                  )}
                </TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('rating')}
                >
                  Avaliação
                  {sortField === 'rating' && (
                    <ArrowUpDown className="inline ml-1 h-3 w-3" />
                  )}
                </TableHead>
                <TableHead>Web</TableHead>
                <TableHead>Maps</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead) => (
                <TableRow key={lead.place_id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.has(lead.place_id)}
                      onCheckedChange={() => handleSelectLead(lead.place_id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px] cursor-help">
                              {lead.address}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[300px]">
                            <p>{lead.address}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-mono">{formatPhone(lead.phone)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{lead.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {lead.rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{lead.rating}</span>
                        {lead.reviews_count && (
                          <span className="text-xs text-muted-foreground">
                            ({lead.reviews_count})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.website && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <Globe className="h-4 w-4" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{lead.website}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={(lead as Lead & { maps_url?: string }).maps_url || `https://www.google.com/maps/place/?q=place_id:${lead.place_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver no Google Maps</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer with pagination and actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedLeads.size} de {filteredAndSortedLeads.length} selecionados
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectPageLeads}
                className="text-xs"
              >
                Selecionar Página
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="text-xs"
              >
                Selecionar Todos
              </Button>
              {selectedLeads.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
