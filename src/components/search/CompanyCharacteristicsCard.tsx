import { Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CNAESelector } from './CNAESelector';
import { NaturezaJuridicaSelector } from './NaturezaJuridicaSelector';
import { MultiTagInput } from './MultiTagInput';
import type { AdvancedSearchFilters } from '@/hooks/useAdvancedSearch';

interface CompanyCharacteristicsCardProps {
  filters: AdvancedSearchFilters;
  onChange: (filters: AdvancedSearchFilters) => void;
}

export function CompanyCharacteristicsCard({ filters, onChange }: CompanyCharacteristicsCardProps) {
  const handleTipoEmpresaChange = (tipo: 'matriz' | 'filial', checked: boolean) => {
    if (checked) {
      onChange({ ...filters, tipoEmpresa: [...filters.tipoEmpresa, tipo] });
    } else {
      onChange({ ...filters, tipoEmpresa: filters.tipoEmpresa.filter(t => t !== tipo) });
    }
  };

  const handlePorteChange = (porte: string, checked: boolean) => {
    if (checked) {
      onChange({ ...filters, portes: [...filters.portes, porte] });
    } else {
      onChange({ ...filters, portes: filters.portes.filter(p => p !== porte) });
    }
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseInt(numbers) / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCapitalChange = (field: 'capitalSocialMin' | 'capitalSocialMax', value: string) => {
    onChange({ ...filters, [field]: value.replace(/\D/g, '') });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Características da Empresa
        </CardTitle>
        <CardDescription>
          Filtre pelas atividades das empresas, natureza jurídica, situação, razão social e/ou nome fantasia que procura.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CNAEs Selector */}
        <CNAESelector
          selected={filters.cnaes}
          onChange={(cnaes) => onChange({ ...filters, cnaes })}
          incluirPrincipal={filters.incluirCnaePrincipal}
          incluirSecundaria={filters.incluirCnaeSecundario}
          onIncluirPrincipalChange={(value) => onChange({ ...filters, incluirCnaePrincipal: value })}
          onIncluirSecundariaChange={(value) => onChange({ ...filters, incluirCnaeSecundario: value })}
        />

        {/* Tipo de Empresa */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Empresas:</Label>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tipo-matriz"
                checked={filters.tipoEmpresa.includes('matriz')}
                onCheckedChange={(checked) => handleTipoEmpresaChange('matriz', checked as boolean)}
              />
              <label htmlFor="tipo-matriz" className="text-sm cursor-pointer">
                Matriz
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="tipo-filial"
                checked={filters.tipoEmpresa.includes('filial')}
                onCheckedChange={(checked) => handleTipoEmpresaChange('filial', checked as boolean)}
              />
              <label htmlFor="tipo-filial" className="text-sm cursor-pointer">
                Filial
              </label>
            </div>
          </div>
        </div>

        {/* Porte das Empresas */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Porte das Empresas:</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="porte-mei"
                checked={filters.portes.includes('MEI')}
                onCheckedChange={(checked) => handlePorteChange('MEI', checked as boolean)}
              />
              <label htmlFor="porte-mei" className="text-sm cursor-pointer">
                MEI
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="porte-me"
                checked={filters.portes.includes('ME')}
                onCheckedChange={(checked) => handlePorteChange('ME', checked as boolean)}
              />
              <label htmlFor="porte-me" className="text-sm cursor-pointer">
                ME (Micro Empresa)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="porte-epp"
                checked={filters.portes.includes('EPP')}
                onCheckedChange={(checked) => handlePorteChange('EPP', checked as boolean)}
              />
              <label htmlFor="porte-epp" className="text-sm cursor-pointer">
                EPP (Empresa de Pequeno Porte)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="porte-demais"
                checked={filters.portes.includes('DEMAIS')}
                onCheckedChange={(checked) => handlePorteChange('DEMAIS', checked as boolean)}
              />
              <label htmlFor="porte-demais" className="text-sm cursor-pointer">
                Demais (Sem Enquadramento)
              </label>
            </div>
          </div>
        </div>

        {/* Natureza Jurídica */}
        <NaturezaJuridicaSelector
          selected={filters.naturezasJuridicas}
          onChange={(naturezas) => onChange({ ...filters, naturezasJuridicas: naturezas })}
        />

        {/* Situação */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Situação da Empresa:</Label>
          <Select
            value={filters.situacao}
            onValueChange={(value) => onChange({ 
              ...filters, 
              situacao: value as AdvancedSearchFilters['situacao'] 
            })}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativas">Ativas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="inativas">Inativas</SelectItem>
              <SelectItem value="suspensas">Suspensas</SelectItem>
              <SelectItem value="baixadas">Baixadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Regime Tributário */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Regime Tributário:</Label>
            <Badge variant="secondary" className="text-xs">Opcional</Badge>
          </div>
          <Select
            value={filters.regimeTributario}
            onValueChange={(value) => onChange({ ...filters, regimeTributario: value })}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="simples">Simples Nacional</SelectItem>
              <SelectItem value="presumido">Lucro Presumido</SelectItem>
              <SelectItem value="real">Lucro Real</SelectItem>
              <SelectItem value="mei">MEI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Capital Social */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Capital Social:</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Capital social mínimo</Label>
              <Input
                type="text"
                placeholder="R$ 0,00"
                value={filters.capitalSocialMin ? formatCurrency(filters.capitalSocialMin) : ''}
                onChange={(e) => handleCapitalChange('capitalSocialMin', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Capital social máximo</Label>
              <Input
                type="text"
                placeholder="R$ 0,00"
                value={filters.capitalSocialMax ? formatCurrency(filters.capitalSocialMax) : ''}
                onChange={(e) => handleCapitalChange('capitalSocialMax', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Palavras-chave */}
        <MultiTagInput
          label="Razão Social ou Nome Fantasia"
          description="Digite uma ou mais palavras e aperte enter"
          placeholder="Digite aqui..."
          value={filters.palavrasChave}
          onChange={(tags) => onChange({ ...filters, palavrasChave: tags })}
        />
      </CardContent>
    </Card>
  );
}
