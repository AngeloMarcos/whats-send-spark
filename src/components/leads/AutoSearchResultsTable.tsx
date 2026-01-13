import { useState } from 'react';
import { Phone, Star, MapPin, Globe, ExternalLink, Check } from 'lucide-react';
import { Lead } from '@/hooks/useGooglePlaces';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface AutoSearchResultsTableProps {
  leads: Lead[];
  selectedLeads: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  isLoading?: boolean;
}

// WhatsApp SVG Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export function AutoSearchResultsTable({ 
  leads, 
  selectedLeads, 
  onSelectionChange,
  isLoading 
}: AutoSearchResultsTableProps) {
  const toggleLead = (placeId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(placeId)) {
      newSelected.delete(placeId);
    } else {
      newSelected.add(placeId);
    }
    onSelectionChange(newSelected);
  };

  const toggleAll = () => {
    if (selectedLeads.size === leads.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(leads.map(l => l.place_id)));
    }
  };

  const formatPhone = (phone: string) => {
    // Clean the phone number
    const cleaned = phone.replace(/\D/g, '');
    
    // Format for display
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      const ddd = cleaned.slice(2, 4);
      const rest = cleaned.slice(4);
      if (rest.length === 9) {
        return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
      } else if (rest.length === 8) {
        return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
      }
    }
    return phone;
  };

  const getWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return `https://wa.me/${cleaned}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Buscando empresas...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">Nenhuma empresa encontrada</h3>
          <p className="text-sm text-muted-foreground">
            Selecione uma cidade e tipo de negócio para iniciar a busca
          </p>
        </CardContent>
      </Card>
    );
  }

  const leadsWithPhone = leads.filter(l => l.phone);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Resultados da Busca
          </CardTitle>
          <Badge 
            variant="outline" 
            className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-700"
          >
            <Phone className="h-3 w-3 mr-1" />
            {leadsWithPhone.length} com telefone
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedLeads.size === leads.length && leads.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Avaliação</TableHead>
                <TableHead className="min-w-[200px]">
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-600" />
                    Telefone
                  </span>
                </TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow 
                  key={lead.place_id}
                  className={selectedLeads.has(lead.place_id) ? 'bg-primary/5' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.has(lead.place_id)}
                      onCheckedChange={() => toggleLead(lead.place_id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium line-clamp-1">{lead.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {lead.category}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {lead.rating ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{lead.rating}</span>
                        {lead.reviews_count && (
                          <span className="text-xs text-muted-foreground">
                            ({lead.reviews_count})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.phone ? (
                      <div className="flex items-center gap-2">
                        <Badge 
                          className="bg-green-100 text-green-800 border-green-300 font-bold text-sm px-3 py-1.5 dark:bg-green-950 dark:text-green-400 dark:border-green-700"
                        >
                          <Phone className="h-3.5 w-3.5 mr-1.5" />
                          {formatPhone(lead.phone)}
                        </Badge>
                        <a
                          href={getWhatsAppLink(lead.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                          title="Abrir no WhatsApp"
                        >
                          <WhatsAppIcon className="h-4 w-4 text-white" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Sem telefone</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground line-clamp-2 max-w-[250px]">
                      {lead.address}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {lead.website && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" title="Visitar site">
                            <Globe className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {lead.maps_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" title="Ver no Google Maps">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {selectedLeads.size > 0 && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg flex items-center justify-between">
            <span className="text-sm">
              <Check className="h-4 w-4 inline mr-1 text-green-600" />
              <strong>{selectedLeads.size}</strong> empresa(s) selecionada(s)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
