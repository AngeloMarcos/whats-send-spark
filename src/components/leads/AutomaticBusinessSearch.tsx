import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Building2, Loader2, Sparkles, Users, Mail, Phone, Info } from 'lucide-react';
import { useGooglePlaces, Lead } from '@/hooks/useGooglePlaces';
import { useIBGELocalidades, Localidade } from '@/hooks/useIBGELocalidades';
import { useEnrichCNPJ } from '@/hooks/useEnrichCNPJ';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AutoSearchResultsTable } from './AutoSearchResultsTable';
import { LeadActions } from './LeadActions';
import { cn } from '@/lib/utils';

const RADIUS_OPTIONS = [
  { value: '1000', label: '1 km' },
  { value: '5000', label: '5 km' },
  { value: '10000', label: '10 km' },
  { value: '25000', label: '25 km' },
  { value: '50000', label: '50 km' },
];

const BUSINESS_SUGGESTIONS = [
  'Restaurantes',
  'Academias',
  'Clínicas',
  'Salões de Beleza',
  'Oficinas Mecânicas',
  'Escritórios de Advocacia',
  'Contabilidade',
  'Dentistas',
  'Pet Shops',
  'Imobiliárias',
];

export function AutomaticBusinessSearch() {
  const [cidade, setCidade] = useState('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState<Localidade | null>(null);
  const [tipoNegocio, setTipoNegocio] = useState('');
  const [raio, setRaio] = useState('5000');
  const [openCityPopover, setOpenCityPopover] = useState(false);
  const [cityResults, setCityResults] = useState<Localidade[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  
  // Enrichment options
  const [enrichEnabled, setEnrichEnabled] = useState(true);
  const [searchPartnerPhones, setSearchPartnerPhones] = useState(false);
  const [enrichedLeads, setEnrichedLeads] = useState<Lead[]>([]);

  const { searchLocalidades, isLoading: loadingCidades } = useIBGELocalidades();
  const { leads: rawLeads, isLoading, error, metrics, searchPlaces } = useGooglePlaces();
  const { enriquecerLeads, isEnriching, progress, calculateMetrics } = useEnrichCNPJ();

  // Use enriched leads if available, otherwise use raw leads
  const leads = enrichedLeads.length > 0 ? enrichedLeads : rawLeads;
  const enrichmentMetrics = enrichedLeads.length > 0 ? calculateMetrics(enrichedLeads) : null;

  // Debounced city search
  useEffect(() => {
    if (cidade.length < 2) {
      setCityResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchLocalidades(cidade);
      setCityResults(results.filter(r => r.tipo === 'municipio'));
    }, 300);

    return () => clearTimeout(timer);
  }, [cidade, searchLocalidades]);

  const handleCitySelect = useCallback((localidade: Localidade) => {
    setCidadeSelecionada(localidade);
    setCidade(`${localidade.nome}, ${localidade.uf}`);
    setOpenCityPopover(false);
  }, []);

  const handleSearch = async () => {
    if (!cidadeSelecionada || !tipoNegocio.trim()) return;

    setSelectedLeads(new Set());
    setEnrichedLeads([]);
    
    const results = await searchPlaces({
      query: tipoNegocio,
      location: `${cidadeSelecionada.nome}, ${cidadeSelecionada.uf}, Brasil`,
      radius: parseInt(raio),
      maxResults: 100,
      onlyWithPhone: true,
    });

    // Auto-enrich if enabled, passing the selected city for better accuracy
    if (enrichEnabled && results && results.length > 0) {
      const enriched = await enriquecerLeads(
        results, 
        searchPartnerPhones,
        cidadeSelecionada ? { city: cidadeSelecionada.nome, state: cidadeSelecionada.uf } : undefined
      );
      setEnrichedLeads(enriched);
    }
  };

  const canSearch = cidadeSelecionada && tipoNegocio.trim().length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Busca Automática de Empresas</CardTitle>
              <CardDescription>
                Encontre empresas por cidade e tipo de negócio automaticamente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cidade/UF Input */}
            <div className="space-y-2">
              <Label htmlFor="cidade" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Cidade / UF
              </Label>
              <Popover open={openCityPopover} onOpenChange={setOpenCityPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCityPopover}
                    className="w-full justify-start font-normal"
                  >
                    {cidadeSelecionada ? (
                      <span>{cidadeSelecionada.nome}, {cidadeSelecionada.uf}</span>
                    ) : (
                      <span className="text-muted-foreground">Selecione uma cidade...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Digite o nome da cidade..." 
                      value={cidade}
                      onValueChange={setCidade}
                    />
                    <CommandList>
                      {loadingCidades ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>
                            {cidade.length < 2 
                              ? 'Digite pelo menos 2 caracteres...' 
                              : 'Nenhuma cidade encontrada.'}
                          </CommandEmpty>
                          <CommandGroup heading="Cidades">
                            {cityResults.map((localidade) => (
                              <CommandItem
                                key={localidade.id}
                                value={`${localidade.nome}-${localidade.uf}`}
                                onSelect={() => handleCitySelect(localidade)}
                              >
                                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                                {localidade.nome}, {localidade.uf}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tipo de Negócio Input */}
            <div className="space-y-2">
              <Label htmlFor="tipoNegocio" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Tipo de Negócio
              </Label>
              <Input
                id="tipoNegocio"
                placeholder="Ex: restaurantes, academias..."
                value={tipoNegocio}
                onChange={(e) => setTipoNegocio(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSearch) {
                    handleSearch();
                  }
                }}
              />
            </div>

            {/* Raio Select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                Raio de Busca
              </Label>
              <Select value={raio} onValueChange={setRaio}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o raio" />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Business type suggestions */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Sugestões de busca:</Label>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_SUGGESTIONS.map(suggestion => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-xs h-7",
                    tipoNegocio === suggestion && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setTipoNegocio(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          {/* Enrichment Options */}
          <TooltipProvider>
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="enrich" 
                  checked={enrichEnabled} 
                  onCheckedChange={(checked) => {
                    setEnrichEnabled(checked === true);
                    if (!checked) setSearchPartnerPhones(false);
                  }}
                />
                <Label htmlFor="enrich" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  Enriquecer com dados CNPJ (sócios, emails, telefones oficiais)
                </Label>
              </div>

              {/* Partner phone search option */}
              {enrichEnabled && (
                <div className="flex items-center space-x-2 ml-6">
                  <Checkbox 
                    id="searchPhones" 
                    checked={searchPartnerPhones} 
                    onCheckedChange={(checked) => setSearchPartnerPhones(checked === true)}
                  />
                  <Label htmlFor="searchPhones" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Phone className="h-4 w-4 text-orange-600" />
                    Buscar telefones dos sócios (mais lento)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>Busca telefones pessoais dos sócios na internet via Google.</p>
                      <p className="text-xs text-muted-foreground mt-1">Pode demorar mais tempo e nem sempre encontra resultados.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </TooltipProvider>

          {/* Search Button */}
          <Button 
            onClick={handleSearch} 
            disabled={!canSearch || isLoading || isEnriching}
            className="w-full md:w-auto"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando empresas...
              </>
            ) : isEnriching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enriquecendo dados...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Buscar Empresas
              </>
            )}
          </Button>

          {/* Enrichment Progress */}
          {isEnriching && (
            <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="ml-2">
                <div className="space-y-2">
                  <p className="text-sm">
                    Enriquecendo dados: <strong>{progress.current}</strong> de <strong>{progress.total}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">{progress.status}</p>
                  <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.searched}</p>
                  <p className="text-xs text-muted-foreground">Encontrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="text-lg">📞</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{metrics.total}</p>
                  <p className="text-xs text-green-600 dark:text-green-500 font-medium">Com Telefone</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.success_rate}%</p>
                  <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <span className="text-lg">⏱️</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.processing_time.toFixed(1)}s</p>
                  <p className="text-xs text-muted-foreground">Tempo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enrichment Metrics Cards */}
      {enrichmentMetrics && enrichmentMetrics.enriched > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <span className="text-lg">🏢</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{enrichmentMetrics.enriched}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 font-medium">Enriquecidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{enrichmentMetrics.withEmail}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-500 font-medium">Com Email</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{enrichmentMetrics.totalSocios}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-500 font-medium">Total Sócios</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{enrichmentMetrics.phonesFound}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-500 font-medium">Tel. Oficiais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Partner phones metric - only show if there are any */}
          {enrichmentMetrics.totalPartnerPhones > 0 && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <span className="text-lg">🔍</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{enrichmentMetrics.totalPartnerPhones}</p>
                    <p className="text-xs text-green-600 dark:text-green-500 font-medium">Tel. Sócios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Lead Actions */}
      {leads.length > 0 && (
        <LeadActions leads={leads} selectedLeads={selectedLeads} />
      )}

      {/* Results Table */}
      <AutoSearchResultsTable
        leads={leads}
        selectedLeads={selectedLeads}
        onSelectionChange={setSelectedLeads}
        isLoading={isLoading}
      />
    </div>
  );
}
