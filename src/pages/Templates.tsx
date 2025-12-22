import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Template } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Trash2, Edit, FileText } from 'lucide-react';

export default function Templates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setTemplates(data as Template[]);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('templates')
          .update({
            name: formData.name,
            content: formData.content,
            description: formData.description || null,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: 'Template atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('templates').insert({
          user_id: user.id,
          name: formData.name,
          content: formData.content,
          description: formData.description || null,
        });

        if (error) throw error;
        toast({ title: 'Template criado com sucesso!' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar template',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir template', variant: 'destructive' });
    } else {
      toast({ title: 'Template excluído com sucesso!' });
      fetchTemplates();
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      description: template.description || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({ name: '', content: '', description: '' });
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Templates de Mensagem" 
        description="Crie e gerencie templates para usar em suas campanhas"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Seus Templates</h2>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
                <DialogDescription>
                  Use {"{{nome}}"} para inserir placeholders dinâmicos na mensagem
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Boas-vindas"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo da Mensagem</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Olá {{nome}}, tudo bem?"
                    rows={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do template..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : editingTemplate ? 'Atualizar' : 'Criar Template'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum template cadastrado</p>
              <p className="text-sm text-muted-foreground">Crie seu primeiro template de mensagem</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-md p-3 text-sm">
                    <p className="whitespace-pre-wrap line-clamp-4">{template.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}