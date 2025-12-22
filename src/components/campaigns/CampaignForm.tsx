import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { List, Template, Campaign } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Sparkles, Wand2 } from 'lucide-react';

interface CampaignFormProps {
  lists: List[];
  templates: Template[];
  onMessageChange: (message: string) => void;
  onCampaignCreated: (campaign: Campaign) => void;
}

export function CampaignForm({ lists, templates, onMessageChange, onCampaignCreated }: CampaignFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    list_id: '',
    template_id: '',
    message: '',
    send_now: true,
    scheduled_at: '',
    send_limit: '',
    use_ai: false,
    ai_prompt: '',
  });

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setFormData({ 
      ...formData, 
      template_id: templateId,
      message: template?.content || formData.message 
    });
    onMessageChange(template?.content || formData.message);
  };

  const handleMessageChange = (message: string) => {
    setFormData({ ...formData, message });
    onMessageChange(message);
  };

  const generateAIMessage = async () => {
    if (!formData.ai_prompt.trim()) {
      toast({
        title: 'Descreva a mensagem',
        description: 'Digite o que você quer que a IA escreva',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-message', {
        body: { prompt: formData.ai_prompt },
      });

      if (error) throw error;

      if (data?.message) {
        setFormData({ ...formData, message: data.message, use_ai: false });
        onMessageChange(data.message);
        toast({ title: 'Mensagem gerada com sucesso!' });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name || !formData.list_id || !formData.message) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome, lista e mensagem',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get settings for webhook URL
      const { data: settings } = await supabase
        .from('settings')
        .select('n8n_webhook_url')
        .eq('user_id', user.id)
        .single();

      if (!settings?.n8n_webhook_url) {
        toast({
          title: 'Configure o webhook',
          description: 'Acesse Configurações e adicione a URL do webhook do n8n',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Get selected list
      const selectedList = lists.find(l => l.id === formData.list_id);

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: formData.name,
          list_id: formData.list_id,
          template_id: formData.template_id || null,
          message: formData.message,
          status: formData.send_now ? 'sending' : 'scheduled',
          send_now: formData.send_now,
          scheduled_at: formData.scheduled_at || null,
          send_limit: formData.send_limit ? parseInt(formData.send_limit) : null,
          contacts_total: selectedList?.contact_count || 0,
        })
        .select('*, list:lists(*), template:templates(*)')
        .single();

      if (campaignError) throw campaignError;

      // Send to n8n webhook
      const { data: webhookData, error: webhookError } = await supabase.functions.invoke('send-campaign', {
        body: {
          campaignId: campaign.id,
          webhookUrl: settings.n8n_webhook_url,
          sheetId: selectedList?.sheet_id,
          sheetTabId: selectedList?.sheet_tab_id,
          message: formData.message,
          sendNow: formData.send_now,
          scheduledAt: formData.scheduled_at || null,
          sendLimit: formData.send_limit ? parseInt(formData.send_limit) : null,
        },
      });

      if (webhookError) {
        // Update campaign status to error
        await supabase
          .from('campaigns')
          .update({ status: 'error', error_message: webhookError.message })
          .eq('id', campaign.id);
        
        throw webhookError;
      }

      // Update campaign with execution ID if returned
      if (webhookData?.executionId) {
        await supabase
          .from('campaigns')
          .update({ execution_id: webhookData.executionId })
          .eq('id', campaign.id);
      }

      toast({ title: 'Campanha iniciada com sucesso!' });
      onCampaignCreated(campaign as Campaign);

      // Reset form
      setFormData({
        name: '',
        list_id: '',
        template_id: '',
        message: '',
        send_now: true,
        scheduled_at: '',
        send_limit: '',
        use_ai: false,
        ai_prompt: '',
      });
      onMessageChange('');
    } catch (error: any) {
      toast({
        title: 'Erro ao criar campanha',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Nova Campanha
        </CardTitle>
        <CardDescription>
          Configure e envie uma nova campanha de mensagens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Campanha *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Black Friday 2024"
              required
            />
          </div>

          {/* List Selection */}
          <div className="space-y-2">
            <Label>Lista de Contatos *</Label>
            <Select value={formData.list_id} onValueChange={(v) => setFormData({ ...formData, list_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma lista" />
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name} ({list.contact_count} contatos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template (opcional)</Label>
            <Select value={formData.template_id} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI Generation Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <Label>Gerar mensagem com IA</Label>
                <p className="text-xs text-muted-foreground">Use IA para criar a mensagem automaticamente</p>
              </div>
            </div>
            <Switch
              checked={formData.use_ai}
              onCheckedChange={(checked) => setFormData({ ...formData, use_ai: checked })}
            />
          </div>

          {/* AI Prompt */}
          {formData.use_ai && (
            <div className="space-y-2">
              <Label htmlFor="ai_prompt">Descreva a mensagem que você quer</Label>
              <Textarea
                id="ai_prompt"
                value={formData.ai_prompt}
                onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                placeholder="Ex: Uma mensagem de promoção de Black Friday para clientes VIP, com tom amigável e chamada para ação"
                rows={3}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateAIMessage}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Gerar Mensagem
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder="Digite a mensagem. Use {{nome}} para personalizar."
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground">
              Placeholders disponíveis: {"{{nome}}"}, {"{{telefone}}"}, {"{{email}}"}
            </p>
          </div>

          {/* Scheduling */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Enviar agora</Label>
              <p className="text-xs text-muted-foreground">
                {formData.send_now ? 'A campanha será enviada imediatamente' : 'Agende para enviar depois'}
              </p>
            </div>
            <Switch
              checked={formData.send_now}
              onCheckedChange={(checked) => setFormData({ ...formData, send_now: checked })}
            />
          </div>

          {!formData.send_now && (
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Data e Hora do Envio</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              />
            </div>
          )}

          {/* Send Limit */}
          <div className="space-y-2">
            <Label htmlFor="send_limit">Limite de Envios (opcional)</Label>
            <Input
              id="send_limit"
              type="number"
              value={formData.send_limit}
              onChange={(e) => setFormData({ ...formData, send_limit: e.target.value })}
              placeholder="Sem limite"
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para enviar para todos os contatos
            </p>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando Campanha...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Iniciar Disparo
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}