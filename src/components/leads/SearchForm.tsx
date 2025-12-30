import { useState } from 'react';
import { Search, MapPin, Filter, Loader2 } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';

interface SearchFormProps {
  onSearch: (params: {
    query: string;
    location: string;
    maxResults: number;
    minRating: number;
    onlyWithPhone: boolean;
  }) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState(50);
  const [minRating, setMinRating] = useState(0);
  const [onlyWithPhone, setOnlyWithPhone] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !location.trim()) return;
    
    onSearch({
      query: query.trim(),
      location: location.trim(),
      maxResults,
      minRating,
      onlyWithPhone,
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="query">Termo de Busca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="query"
                  placeholder="Ex: restaurantes, dentistas, academias..."
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
          </div>

          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
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
                    max={100}
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

          <Button type="submit" className="w-full" disabled={isLoading || !query || !location}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar Estabelecimentos
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
