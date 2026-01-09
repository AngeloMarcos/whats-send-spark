import { Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdvancedSearchFilters } from '@/hooks/useAdvancedSearch';

interface DateFilterCardProps {
  filters: AdvancedSearchFilters;
  onChange: (filters: AdvancedSearchFilters) => void;
}

const periodosPreDefinidos = [
  { dias: 7, label: 'Últimos 7 dias' },
  { dias: 15, label: 'Últimos 15 dias' },
  { dias: 30, label: 'Últimos 30 dias' },
  { dias: 60, label: 'Últimos 60 dias' },
  { dias: 90, label: 'Últimos 90 dias' },
  { dias: 365, label: 'Último ano' },
];

export function DateFilterCard({ filters, onChange }: DateFilterCardProps) {
  const handleTabChange = (value: string) => {
    onChange({
      ...filters,
      tipoFiltroData: value as AdvancedSearchFilters['tipoFiltroData'],
      // Reset date values when changing tabs
      periodoUltimos: null,
      dataUnica: '',
      dataInicio: '',
      dataFim: '',
    });
  };

  const handlePeriodoClick = (dias: number) => {
    onChange({
      ...filters,
      tipoFiltroData: 'periodo',
      periodoUltimos: filters.periodoUltimos === dias ? null : dias,
    });
  };

  const handleTodasDatasChange = (checked: boolean) => {
    if (checked) {
      onChange({
        ...filters,
        tipoFiltroData: 'todas',
        periodoUltimos: null,
        dataUnica: '',
        dataInicio: '',
        dataFim: '',
      });
    } else {
      onChange({
        ...filters,
        tipoFiltroData: 'periodo',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Datas
        </CardTitle>
        <CardDescription>
          Encontre empresas abertas recentemente ou mais antigas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={filters.tipoFiltroData === 'todas' ? 'periodo' : filters.tipoFiltroData}
          onValueChange={handleTabChange}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="periodo">Filtro por Período</TabsTrigger>
            <TabsTrigger value="data">Filtro por Data</TabsTrigger>
            <TabsTrigger value="faixa">Faixa de Data</TabsTrigger>
          </TabsList>

          <TabsContent value="periodo" className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {periodosPreDefinidos.map(({ dias, label }) => (
                <Button
                  key={dias}
                  variant={filters.periodoUltimos === dias ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => handlePeriodoClick(dias)}
                  disabled={filters.tipoFiltroData === 'todas'}
                >
                  {label}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="data" className="pt-4">
            <div className="space-y-2">
              <Label className="text-sm">Empresas abertas em:</Label>
              <Input
                type="date"
                value={filters.dataUnica}
                onChange={(e) => onChange({ ...filters, dataUnica: e.target.value })}
                disabled={filters.tipoFiltroData === 'todas'}
                className="w-full md:w-[250px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="faixa" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Data início:</Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => onChange({ ...filters, dataInicio: e.target.value })}
                  disabled={filters.tipoFiltroData === 'todas'}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Data fim:</Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => onChange({ ...filters, dataFim: e.target.value })}
                  disabled={filters.tipoFiltroData === 'todas'}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2">
            <Checkbox
              id="all-dates"
              checked={filters.tipoFiltroData === 'todas'}
              onCheckedChange={handleTodasDatasChange}
            />
            <label htmlFor="all-dates" className="text-sm cursor-pointer">
              Abranger todas as empresas (desconsiderar data de abertura)
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
