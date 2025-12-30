import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { presetTemplates, getCategoryInfo } from '@/lib/templateVariables';
import { Copy, Sparkles } from 'lucide-react';

interface TemplateLibraryProps {
  onUseTemplate: (template: typeof presetTemplates[0]) => void;
}

export function TemplateLibrary({ onUseTemplate }: TemplateLibraryProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Biblioteca de Templates</CardTitle>
        </div>
        <CardDescription>
          Templates prontos para usar. Clique para copiar e personalizar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {presetTemplates.map((template, index) => {
            const categoryInfo = getCategoryInfo(template.category);
            return (
              <Card 
                key={index} 
                className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 hover:border-primary/50"
                onClick={() => onUseTemplate(template)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${categoryInfo.color}`}>
                      {categoryInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {template.variables.slice(0, 2).map((v) => (
                        <Badge key={v} variant="outline" className="text-[10px] px-1 py-0">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                      {template.variables.length > 2 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          +{template.variables.length - 2}
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
