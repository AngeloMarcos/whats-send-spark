import { useState, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { naturezasJuridicas, searchNaturezasJuridicas, getNaturezaJuridicaByCode } from '@/data/naturezasJuridicas';

interface NaturezaJuridicaSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function NaturezaJuridicaSelector({ selected, onChange }: NaturezaJuridicaSelectorProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredNaturezas = useMemo(() => {
    return searchNaturezasJuridicas(query, 15);
  }, [query]);

  const addNatureza = (code: string) => {
    if (!selected.includes(code)) {
      onChange([...selected, code]);
    }
    setQuery('');
    setShowDropdown(false);
  };

  const removeNatureza = (code: string) => {
    onChange(selected.filter(c => c !== code));
  };

  // Agrupar naturezas jurídicas por categoria
  const groupedNaturezas = useMemo(() => {
    return {
      administracao: naturezasJuridicas.filter(n => 
        parseInt(n.code) >= 101 && parseInt(n.code) <= 199
      ),
      empresariais: naturezasJuridicas.filter(n => 
        parseInt(n.code) >= 201 && parseInt(n.code) <= 299
      ),
      semFinsLucrativos: naturezasJuridicas.filter(n => 
        parseInt(n.code) >= 301 && parseInt(n.code) <= 399
      ),
      pessoasFisicas: naturezasJuridicas.filter(n => 
        parseInt(n.code) >= 401 && parseInt(n.code) <= 499
      ),
      internacionais: naturezasJuridicas.filter(n => 
        parseInt(n.code) >= 501 && parseInt(n.code) <= 599
      ),
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Natureza Jurídica:</Label>
        <Badge variant="secondary" className="text-xs">Opcional</Badge>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Não selecione nenhuma se desejar todas as naturezas jurídicas.
      </p>
      
      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Digite código ou nome..."
          className="pl-10"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(e.target.value.length >= 2);
          }}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
        />
        
        {/* Dropdown de sugestões */}
        {showDropdown && filteredNaturezas.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredNaturezas.map(nat => (
              <button
                key={nat.code}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                onClick={() => addNatureza(nat.code)}
              >
                <span className="font-mono text-xs text-muted-foreground">{nat.code}</span>
                <span className="ml-2">{nat.name}</span>
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
              Adicionar Natureza Jurídica da lista
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2">
            <ScrollArea className="h-[300px]">
              <Accordion type="multiple" className="space-y-1">
                {/* Administração Pública */}
                <AccordionItem value="admin" className="border rounded-md">
                  <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                    <span>Administração Pública ({groupedNaturezas.administracao.length})</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="space-y-1 max-h-[200px] overflow-auto">
                      {groupedNaturezas.administracao.map(nat => (
                        <Button
                          key={nat.code}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-auto py-1.5 px-2"
                          onClick={() => addNatureza(nat.code)}
                          disabled={selected.includes(nat.code)}
                        >
                          <span className="font-mono text-muted-foreground mr-2">{nat.code}</span>
                          <span className="truncate text-left">{nat.name}</span>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Entidades Empresariais */}
                <AccordionItem value="empresariais" className="border rounded-md">
                  <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                    <span>Entidades Empresariais ({groupedNaturezas.empresariais.length})</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="space-y-1 max-h-[200px] overflow-auto">
                      {groupedNaturezas.empresariais.map(nat => (
                        <Button
                          key={nat.code}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-auto py-1.5 px-2"
                          onClick={() => addNatureza(nat.code)}
                          disabled={selected.includes(nat.code)}
                        >
                          <span className="font-mono text-muted-foreground mr-2">{nat.code}</span>
                          <span className="truncate text-left">{nat.name}</span>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Entidades sem Fins Lucrativos */}
                <AccordionItem value="semfins" className="border rounded-md">
                  <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                    <span>Entidades sem Fins Lucrativos ({groupedNaturezas.semFinsLucrativos.length})</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="space-y-1 max-h-[200px] overflow-auto">
                      {groupedNaturezas.semFinsLucrativos.map(nat => (
                        <Button
                          key={nat.code}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-auto py-1.5 px-2"
                          onClick={() => addNatureza(nat.code)}
                          disabled={selected.includes(nat.code)}
                        >
                          <span className="font-mono text-muted-foreground mr-2">{nat.code}</span>
                          <span className="truncate text-left">{nat.name}</span>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Pessoas Físicas */}
                <AccordionItem value="pf" className="border rounded-md">
                  <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                    <span>Pessoas Físicas ({groupedNaturezas.pessoasFisicas.length})</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="space-y-1 max-h-[200px] overflow-auto">
                      {groupedNaturezas.pessoasFisicas.map(nat => (
                        <Button
                          key={nat.code}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-auto py-1.5 px-2"
                          onClick={() => addNatureza(nat.code)}
                          disabled={selected.includes(nat.code)}
                        >
                          <span className="font-mono text-muted-foreground mr-2">{nat.code}</span>
                          <span className="truncate text-left">{nat.name}</span>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Organizações Internacionais */}
                <AccordionItem value="int" className="border rounded-md">
                  <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                    <span>Organizações Internacionais ({groupedNaturezas.internacionais.length})</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="space-y-1 max-h-[200px] overflow-auto">
                      {groupedNaturezas.internacionais.map(nat => (
                        <Button
                          key={nat.code}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-auto py-1.5 px-2"
                          onClick={() => addNatureza(nat.code)}
                          disabled={selected.includes(nat.code)}
                        >
                          <span className="font-mono text-muted-foreground mr-2">{nat.code}</span>
                          <span className="truncate text-left">{nat.name}</span>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      {/* Naturezas selecionadas */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(code => {
            const nat = getNaturezaJuridicaByCode(code);
            return (
              <Badge 
                key={code} 
                variant="outline" 
                className="pl-2 pr-1 py-1 gap-1 text-xs"
              >
                <span className="font-mono">{code}</span>
                {nat && <span className="max-w-[150px] truncate">- {nat.name}</span>}
                <button
                  onClick={() => removeNatureza(code)}
                  className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
