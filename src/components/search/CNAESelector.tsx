import { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cnaes, cnaeCategories, searchCNAEs, getCNAEsByCategory, getCNAEByCode } from '@/data/cnaes';

interface CNAESelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  incluirPrincipal: boolean;
  incluirSecundaria: boolean;
  onIncluirPrincipalChange: (value: boolean) => void;
  onIncluirSecundariaChange: (value: boolean) => void;
}

export function CNAESelector({
  selected,
  onChange,
  incluirPrincipal,
  incluirSecundaria,
  onIncluirPrincipalChange,
  onIncluirSecundariaChange,
}: CNAESelectorProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredCNAEs = useMemo(() => {
    return searchCNAEs(query, 15);
  }, [query]);

  const addCNAE = (code: string) => {
    if (!selected.includes(code)) {
      onChange([...selected, code]);
    }
    setQuery('');
    setShowDropdown(false);
  };

  const removeCNAE = (code: string) => {
    onChange(selected.filter(c => c !== code));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Atividades/CNAEs:</Label>
        <Badge variant="secondary" className="text-xs">Opcional</Badge>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Não selecione nenhuma se desejar todas as atividades/CNAEs.
      </p>
      
      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Digite código ou nome do CNAE..."
          className="pl-10"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(e.target.value.length >= 2);
          }}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
        />
        
        {/* Dropdown de sugestões */}
        {showDropdown && filteredCNAEs.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredCNAEs.map(cnae => (
              <button
                key={cnae.code}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                onClick={() => addCNAE(cnae.code)}
              >
                <span className="font-mono text-xs text-muted-foreground">{cnae.code}</span>
                <span className="ml-2">{cnae.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Accordion com lista completa por categoria */}
      <Accordion type="single" collapsible className="border rounded-md">
        <AccordionItem value="list" className="border-0">
          <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4" />
              Adicionar atividade/CNAE da lista
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2">
            <ScrollArea className="h-[300px]">
              <Accordion type="multiple" className="space-y-1">
                {cnaeCategories.map(category => {
                  const categoryCNAEs = getCNAEsByCategory(category.code);
                  if (categoryCNAEs.length === 0) return null;
                  
                  return (
                    <AccordionItem 
                      key={category.code} 
                      value={category.code}
                      className="border rounded-md"
                    >
                      <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                        <span className="text-left">
                          <span className="font-bold">{category.code}</span> - {category.name}
                          <span className="text-muted-foreground ml-2">({categoryCNAEs.length})</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pb-2">
                        <div className="space-y-1 max-h-[200px] overflow-auto">
                          {categoryCNAEs.map(cnae => (
                            <Button
                              key={cnae.code}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-auto py-1.5 px-2"
                              onClick={() => addCNAE(cnae.code)}
                              disabled={selected.includes(cnae.code)}
                            >
                              <span className="font-mono text-muted-foreground mr-2">
                                {cnae.code}
                              </span>
                              <span className="truncate text-left">{cnae.name}</span>
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      {/* CNAEs selecionados */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(code => {
            const cnae = getCNAEByCode(code);
            return (
              <Badge 
                key={code} 
                variant="outline" 
                className="pl-2 pr-1 py-1 gap-1 text-xs"
              >
                <span className="font-mono">{code}</span>
                {cnae && <span className="max-w-[150px] truncate">- {cnae.name}</span>}
                <button
                  onClick={() => removeCNAE(code)}
                  className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      
      {/* Checkboxes de escopo */}
      <div className="flex flex-wrap gap-4 pt-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="cnae-principal"
            checked={incluirPrincipal}
            onCheckedChange={(checked) => onIncluirPrincipalChange(checked as boolean)}
          />
          <label htmlFor="cnae-principal" className="text-sm cursor-pointer">
            Incluir atividade principal
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="cnae-secundaria"
            checked={incluirSecundaria}
            onCheckedChange={(checked) => onIncluirSecundariaChange(checked as boolean)}
          />
          <label htmlFor="cnae-secundaria" className="text-sm cursor-pointer">
            Incluir atividade secundária
          </label>
        </div>
      </div>
    </div>
  );
}
