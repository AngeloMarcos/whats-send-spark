import { useState, useEffect, useCallback } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useIBGELocalidades, type Localidade } from '@/hooks/useIBGELocalidades';
import type { AdvancedSearchFilters, LocalidadeSelecionada } from '@/hooks/useAdvancedSearch';

interface LocationCardProps {
  filters: AdvancedSearchFilters;
  onChange: (filters: AdvancedSearchFilters) => void;
}

export function LocationCard({ filters, onChange }: LocationCardProps) {
  const { searchLocalidades, isLoading } = useIBGELocalidades();
  const [localidadeQuery, setLocalidadeQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Localidade[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced search
  useEffect(() => {
    if (localidadeQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchLocalidades(localidadeQuery);
      setSuggestions(results);
      setShowSuggestions(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [localidadeQuery, searchLocalidades]);

  const addLocalidade = useCallback((loc: Localidade) => {
    const newLocalidade: LocalidadeSelecionada = {
      tipo: loc.tipo,
      nome: loc.nome,
      uf: loc.uf,
      codigoIBGE: loc.codigoIBGE,
    };

    // Verificar se já existe
    const exists = filters.localidades.some(
      l => l.nome === loc.nome && l.tipo === loc.tipo
    );

    if (!exists) {
      onChange({
        ...filters,
        localidades: [...filters.localidades, newLocalidade],
      });
    }

    setLocalidadeQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, [filters, onChange]);

  const removeLocalidade = useCallback((index: number) => {
    onChange({
      ...filters,
      localidades: filters.localidades.filter((_, i) => i !== index),
    });
  }, [filters, onChange]);

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Localização / Região
        </CardTitle>
        <CardDescription>
          Escolha a cidade(s), estado(s) ou país(es) que deseja filtrar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Localidades com autocomplete IBGE */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Localidades:</Label>
          <p className="text-xs text-muted-foreground">
            Digite o nome da cidade, estado ou país para selecionar
          </p>
          
          <div className="relative">
            <Input
              placeholder="Digite aqui..."
              value={localidadeQuery}
              onChange={(e) => setLocalidadeQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {/* Dropdown de sugestões */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                {suggestions.map((loc, index) => (
                  <button
                    key={`${loc.tipo}-${loc.id}-${index}`}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors flex items-center justify-between"
                    onClick={() => addLocalidade(loc)}
                  >
                    <span>
                      {loc.nome}
                      {loc.uf && loc.tipo === 'municipio' && (
                        <span className="text-muted-foreground ml-1">- {loc.uf}</span>
                      )}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {loc.tipo === 'estado' ? 'Estado' : 'Cidade'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Tags de localidades selecionadas */}
          {filters.localidades.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.localidades.map((loc, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="pl-2 pr-1 py-1 gap-1"
                >
                  <span>
                    {loc.nome}
                    {loc.uf && loc.tipo === 'municipio' && ` - ${loc.uf}`}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({loc.tipo === 'estado' ? 'UF' : 'Cidade'})
                  </span>
                  <button
                    onClick={() => removeLocalidade(idx)}
                    className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Bairro */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Bairro:</Label>
            <Badge variant="secondary" className="text-xs">Opcional</Badge>
          </div>
          <Input
            placeholder="Digite aqui..."
            value={filters.bairro}
            onChange={(e) => onChange({ ...filters, bairro: e.target.value })}
          />
        </div>

        {/* CEP */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">CEP:</Label>
            <Badge variant="secondary" className="text-xs">Opcional</Badge>
          </div>
          <Input
            placeholder="00000-000"
            value={formatCEP(filters.cep)}
            onChange={(e) => onChange({ ...filters, cep: e.target.value.replace(/\D/g, '') })}
            maxLength={9}
            className="w-full md:w-[200px]"
          />
        </div>

        {/* DDD */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">DDD:</Label>
            <Badge variant="secondary" className="text-xs">Opcional</Badge>
          </div>
          <Input
            type="text"
            placeholder="Digite aqui..."
            value={filters.ddd}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 2);
              onChange({ ...filters, ddd: value });
            }}
            maxLength={2}
            className="w-full md:w-[100px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
