import { useState } from 'react';
import { Search, Save, RotateCcw, Loader2, PlayCircle, Download, ListPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CompanyCharacteristicsCard } from '@/components/search/CompanyCharacteristicsCard';
import { LocationCard } from '@/components/search/LocationCard';
import { DateFilterCard } from '@/components/search/DateFilterCard';
import { SavedSearches } from '@/components/search/SavedSearches';
import { SearchResults } from '@/components/search/SearchResults';
import { SaveSearchDialog } from '@/components/search/SaveSearchDialog';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
import { useSavedSearches, PesquisaSalva } from '@/hooks/useSavedSearches';
import type { LeadCapturado } from '@/types/leadCapture';
import * as XLSX from 'xlsx';

export default function AdvancedSearch() {
  const { 
    filters, 
    setFilters, 
    resetFilters, 
    results, 
    isSearching, 
    search, 
    totalResults, 
    currentPage, 
    totalPages,
    pageSize,
    nextPage, 
    previousPage, 
    goToPage 
  } = useAdvancedSearch();
  
  const { searches, isLoading: isLoadingSearches, saveSearch, deleteSearch } = useSavedSearches();
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleLoadSearch = (search: PesquisaSalva) => {
    setFilters(search.filtros);
    toast.success(`Pesquisa "${search.nome}" carregada`);
  };

  const handleExport = (leads: LeadCapturado[]) => {
    if (leads.length === 0) {
      toast.error('Nenhum lead para exportar');
      return;
    }

    const data = leads.map(lead => ({
      'CNPJ': lead.cnpj || '',
      'Razão Social': lead.razao_social || '',
      'Nome Fantasia': lead.nome_fantasia || '',
      'Telefones': lead.telefones.map(t => t.formatted || t.original).join('; '),
      'WhatsApp Links': lead.telefones
        .filter(t => t.whatsappApiLink)
        .map(t => t.whatsappApiLink)
        .join('; '),
      'Email': lead.email || '',
      'Município': lead.municipio || '',
      'UF': lead.uf || '',
      'Bairro': lead.bairro || '',
      'CEP': lead.cep || '',
      'Endereço': lead.endereco || '',
      'Situação': lead.situacao || '',
      'Porte': lead.porte_empresa || '',
      'Data Abertura': lead.data_abertura || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    
    const filename = `pesquisa_avancada_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    toast.success(`${leads.length} leads exportados com sucesso`);
  };

  const handleAddToList = (leads: LeadCapturado[]) => {
    if (leads.length === 0) {
      toast.error('Nenhum lead selecionado');
      return;
    }
    
    // TODO: Implementar modal para selecionar lista
    toast.info(`${leads.length} leads prontos para adicionar à lista`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pesquisa Avançada</h1>
            <p className="text-muted-foreground">
              Transforme sua Captação de Clientes e Parceiros com Filtros Avançados
            </p>
          </div>
        </div>

        {/* Link de tutorial */}
        <Button variant="link" className="p-0 h-auto text-primary">
          <PlayCircle className="h-4 w-4 mr-2" />
          Saiba como usar a Pesquisa Avançada em poucos minutos
        </Button>

        {/* Pesquisas Salvas (Collapsible) */}
        <SavedSearches 
          searches={searches} 
          isLoading={isLoadingSearches}
          onLoad={handleLoadSearch} 
          onDelete={deleteSearch}
        />

        {/* Card 1: Características da Empresa */}
        <CompanyCharacteristicsCard filters={filters} onChange={setFilters} />

        {/* Card 2: Localização/Região */}
        <LocationCard filters={filters} onChange={setFilters} />

        {/* Card 3: Datas */}
        <DateFilterCard filters={filters} onChange={setFilters} />

        {/* Botões de Ação */}
        <div className="flex flex-wrap gap-4">
          <Button 
            onClick={() => search()} 
            disabled={isSearching} 
            size="lg" 
            className="flex-1 min-w-[200px]"
          >
            {isSearching ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Pesquisar Empresas
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowSaveDialog(true)}
            disabled={isSearching}
          >
            <Save className="mr-2 h-4 w-4" />
            Salvar Pesquisa
          </Button>
          <Button variant="outline" onClick={resetFilters} disabled={isSearching}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        </div>

        {/* Resultados */}
        {results.length > 0 && (
          <SearchResults
            results={results}
            totalResults={totalResults}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onNextPage={nextPage}
            onPreviousPage={previousPage}
            onGoToPage={goToPage}
            onExport={handleExport}
            onAddToList={handleAddToList}
          />
        )}

        {/* Dialog para salvar pesquisa */}
        <SaveSearchDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          onSave={async (nome, descricao) => {
            await saveSearch(nome, filters, descricao, totalResults);
            setShowSaveDialog(false);
          }}
          totalResults={totalResults}
        />
      </div>
    </AppLayout>
  );
}
