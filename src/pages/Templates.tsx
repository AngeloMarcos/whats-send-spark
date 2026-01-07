import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Template } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { SkeletonCard } from '@/components/ui/loading-skeletons';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import { TemplateLibrary } from '@/components/templates/TemplateLibrary';
import { templateCategories, getCategoryInfo, extractVariables, presetTemplates } from '@/lib/templateVariables';
import { Plus, Loader2, Trash2, Edit, FileText, Star, Copy, Search, Filter } from 'lucide-react';

export default function Templates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    if (user) fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar templates', variant: 'destructive' });
    } else if (data) {
      // Map database response to Template type with defaults
      const mappedTemplates: Template[] = data.map((t) => ({
        ...t,
        is_favorite: t.is_favorite ?? false,
        category: t.category ?? 'geral',
        variables: (t.variables as string[]) ?? [],
      }));
      setTemplates(mappedTemplates);
    }
    setIsLoading(false);
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Null-safe search filter
      if (searchQuery) {
        const query = (searchQuery ?? '').toLowerCase();
        const name = String(template.name ?? '').toLowerCase();
        const content = String(template.content ?? '').toLowerCase();
        const description = String(template.description ?? '').toLowerCase();
        
        const matchesSearch = 
          name.includes(query) ||
          content.includes(query) ||
          description.includes(query);
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (categoryFilter !== 'all' && template.category !== categoryFilter) {
        return false;
      }
      
      // Favorites filter
      if (showFavoritesOnly && !template.is_favorite) {
        return false;
      }
      
      return true;
    });
  }, [templates, searchQuery, categoryFilter, showFavoritesOnly]);

  const handleSave = async (templateData: Omit<Template, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    setIsSaving(true);
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('templates')
          .update({
            name: templateData.name,
            content: templateData.content,
            description: templateData.description || null,
            category: templateData.category,
            is_favorite: templateData.is_favorite,
            variables: templateData.variables,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: 'Template atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('templates').insert({
          user_id: user.id,
          name: templateData.name,
          content: templateData.content,
          description: templateData.description || null,
          category: templateData.category,
          is_favorite: templateData.is_favorite,
          variables: templateData.variables,
        });

        if (error) throw error;
        toast({ title: 'Template criado com sucesso!' });
      }

      setIsDialogOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao salvar template',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    const { error } = await supabase.from('templates').delete().eq('id', deleteId);
    
    if (error) {
      toast({ title: 'Erro ao excluir template', variant: 'destructive' });
    } else {
      toast({ title: 'Template excluído com sucesso!' });
      fetchTemplates();
    }
    
    setDeleteId(null);
    setIsDeleting(false);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleDuplicate = async (template: Template) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('templates').insert({
        user_id: user.id,
        name: `${template.name} (cópia)`,
        content: template.content,
        description: template.description,
        category: template.category,
        is_favorite: false,
        variables: template.variables,
      });

      if (error) throw error;
      toast({ title: 'Template duplicado com sucesso!' });
      fetchTemplates();
    } catch (error) {
      toast({ title: 'Erro ao duplicar template', variant: 'destructive' });
    }
  };

  const handleToggleFavorite = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('templates')
        .update({ is_favorite: !template.is_favorite })
        .eq('id', template.id);

      if (error) throw error;
      fetchTemplates();
    } catch (error) {
      toast({ title: 'Erro ao atualizar favorito', variant: 'destructive' });
    }
  };

  const handleUsePresetTemplate = (preset: typeof presetTemplates[0]) => {
    setEditingTemplate({
      id: '',
      user_id: '',
      name: preset.name,
      content: preset.content,
      description: preset.description,
      category: preset.category,
      is_favorite: false,
      variables: preset.variables,
      created_at: '',
      updated_at: '',
    });
    setIsDialogOpen(true);
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Templates de Mensagem" 
        description="Crie e gerencie templates para usar em suas campanhas"
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Template Library */}
        <TemplateLibrary onUseTemplate={handleUsePresetTemplate} />

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {templateCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="gap-1"
            >
              <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favoritos
            </Button>
          </div>
          
          <Button onClick={handleNewTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              {searchQuery || categoryFilter !== 'all' || showFavoritesOnly ? (
                <>
                  <p className="text-muted-foreground">Nenhum template encontrado</p>
                  <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">Nenhum template cadastrado</p>
                  <p className="text-sm text-muted-foreground">Crie seu primeiro template ou use um da biblioteca</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const categoryInfo = getCategoryInfo(template.category);
              const variables = extractVariables(template.content);
              
              return (
                <Card 
                  key={template.id} 
                  className="transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {template.is_favorite && (
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                          )}
                          <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className={`text-xs ${categoryInfo.color}`}>
                            <span className="mr-1">{categoryInfo.icon}</span>
                            {categoryInfo.label}
                          </Badge>
                          {variables.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {variables.length} variáve{variables.length > 1 ? 'is' : 'l'}
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <CardDescription className="line-clamp-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Content Preview */}
                    <div className="bg-muted rounded-md p-3 text-sm">
                      <p className="whitespace-pre-wrap line-clamp-3">{template.content}</p>
                    </div>
                    
                    {/* Variables */}
                    {variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {variables.slice(0, 3).map((v) => (
                          <Badge key={v} variant="outline" className="text-xs font-mono">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                        {variables.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{variables.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicar</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleToggleFavorite(template)}
                          >
                            <Star className={`h-4 w-4 ${template.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{template.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDeleteId(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Editor Dialog */}
      <TemplateEditor
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
