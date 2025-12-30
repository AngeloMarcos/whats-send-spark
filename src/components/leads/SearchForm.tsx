import { useState } from 'react';
import { Search, MapPin, Filter, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useSearchRateLimit } from '@/hooks/useSearchRateLimit';
import { Badge } from '@/components/ui/badge';

interface SearchFormProps {
  onSearch: (params: {
    query: string;
    location: string;
    radius: number;
    maxResults: number;
    minRating: number;
    onlyWithPhone: boolean;
  }) => void;
  isLoading: boolean;
}

const RADIUS_OPTIONS = [
  { value: '1000', label: '1 km' },
  { value: '5000', label: '5 km' },
  { value: '10000', label: '10 km' },
  { value: '25000', label: '25 km' },
  { value: '50000', label: '50 km' },
];

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('5000');
  const [maxResults, setMaxResults] = useState(50);
  const [minRating, setMinRating] = useState(0);
  const [onlyWithPhone, setOnlyWithPhone] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const { canSearch, remainingSeconds, searchesRemaining, recordSearch } = useSearchRateLimit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !location.trim() || !canSearch) return;
    
    recordSearch();
    onSearch({
      query: query.trim(),
      location: location.trim(),
      radius: parseInt(radius),
      maxResults,
      minRating,
      onlyWithPhone,
    });
  };

  const isDisabled = isLoading || !query || !location || !canSearch;

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="query">Tipo de Negócio</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="query"
                  placeholder="Ex: restaurantes, clínicas, academias"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="Ex: São Paulo, SP"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">Raio de Busca</Label>
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger id="radius">
                  <SelectValue placeholder="Selecione o raio" />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros Avançados'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Máximo de Resultados: {maxResults}</Label>
                  <Slider
                    value={[maxResults]}
                    onValueChange={(value) => setMaxResults(value[0])}
                    min={10}
                    max={200}
                    step={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Avaliação Mínima: {minRating > 0 ? `${minRating}⭐` : 'Qualquer'}</Label>
                  <Slider
                    value={[minRating]}
                    onValueChange={(value) => setMinRating(value[0])}
                    min={0}
                    max={5}
                    step={0.5}
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="onlyWithPhone"
                    checked={onlyWithPhone}
                    onCheckedChange={setOnlyWithPhone}
                  />
                  <Label htmlFor="onlyWithPhone" className="text-sm">
                    Apenas com telefone
                  </Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center gap-4">
            <Button type="submit" className="flex-1" size="lg" disabled={isDisabled}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : !canSearch ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Aguarde {remainingSeconds}s
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  🔍 Buscar Estabelecimentos
                </>
              )}
            </Button>
            
            <Badge variant={canSearch ? 'secondary' : 'destructive'} className="whitespace-nowrap">
              {searchesRemaining}/3 buscas
            </Badge>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
