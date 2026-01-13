import { useState, useEffect, useMemo } from 'react';
import { Send, Loader2, FlaskConical, Plus, MessageSquare, Clock, Users } from 'lucide-react';
import { Lead } from '@/hooks/useGooglePlaces';
import { Template, Campaign } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSendingConfig } from '@/hooks/useSendingConfig';
import { useQueueDispatcher } from '@/hooks/useQueueDispatcher';
import { formatToInternational } from '@/lib/phoneValidation';
import { TestModeBanner } from '@/components/campaigns/TestModeBanner';
import { CampaignSchedulePreview } from '@/components/campaigns/CampaignSchedulePreview';

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  onCampaignCreated?: (campaign: Campaign) => void;
}

export function CreateCampaignModal({
  open,
  onOpenChange,
  leads,
  onCampaignCreated,
}: CreateCampaignModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { config: sendingConfig, isLoading: isLoadingConfig } = useSendingConfig();
  const queueDispatcher = useQueueDispatcher();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [defaultTestContact, setDefaultTestContact] = useState<{ phone: string; name: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    message: '',
    send_now: true,
    scheduled_at: '',
    send_limit: '',
  });

  // Load templates and test contact
  useEffect(() => {
    if (open && user) {
      fetchTemplates();
      fetchDefaultTestContact();
    }
  }, [open, user]);

  const fetchTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setTemplates(data as Template[]);
  };

  const fetchDefaultTestContact = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('test_contacts')
      .select('phone, name')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();
    if (data) setDefaultTestContact(data);
  };

  // Calculate total contacts for schedule preview
  const totalContacts = useMemo(() => {
    if (isTestMode) {
      return Math.min(10, leads.length);
    }
    if (formData.send_limit) {
      return Math.min(parseInt(formData.send_limit), leads.length);
    }
    return leads.length;
  }, [leads.length, formData.send_limit, isTestMode]);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setFormData({
      ...formData,
      template_id: templateId,
      message: template?.content || formData.message,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name || !formData.message) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome e mensagem da campanha',
        variant: 'destructive',
      });
      return;
    }

    if (isTestMode && !defaultTestContact) {
      toast({
        title: 'Contato de teste não configurado',
        description: 'Acesse Configurações e adicione um contato de teste padrão',
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

      // First, create a list for these leads
      const { data: list, error: listError } = await supabase
        .from('lists')
        .insert({
          name: `Campanha: ${formData.name}`,
          description: `Lista criada automaticamente para campanha "${formData.name}" - ${leads.length} contatos`,
          user_id: user.id,
          list_type: 'campaign_auto',
          contact_count: 0,
        })
        .select()
        .single();

      if (listError) throw listError;

      // Insert leads as contacts
      const contacts = leads.map(lead => ({
        list_id: list.id,
        user_id: user.id,
        name: lead.name,
        phone: lead.phone,
        extra_data: {
          source: 'google_maps_campaign',
          address: lead.address,
          category: lead.category,
          rating: lead.rating,
          place_id: lead.place_id,
          captured_at: new Date().toISOString(),
        },
        is_valid: true,
      }));

      const { error: contactsError } = await supabase
        .from('contacts')
        .insert(contacts);

      if (contactsError) throw contactsError;

      // Also insert into leads table
      const leadsData = leads.map(lead => ({
        user_id: user.id,
        list_id: list.id,
        nome: lead.name,
        telefones: lead.phone,
        telefones_array: [lead.phone],
        endereco: lead.address,
        atividade: lead.category,
        cnpj: lead.cnpj || null,
        razao_social: lead.razaoSocial || null,
        nome_fantasia: lead.nomeFantasia || null,
        email: lead.email_oficial || null,
        situacao: lead.situacao_cadastral || null,
        socios: lead.socios ? JSON.parse(JSON.stringify(lead.socios)) : null,
        source: 'google_maps',
        status: 'novo',
      }));

      const { error: leadsError } = await supabase
        .from('leads')
        .insert(leadsData);

      if (leadsError) console.error('Error inserting leads:', leadsError);

      // Convert leads to contact format for campaign
      const campaignContacts = leads.map(lead => ({
        phone: formatToInternational(lead.phone),
        name: lead.name || '',
        empresa: lead.name || '',
        endereco: lead.address || '',
      }));

      // Apply limits
      const actualSendLimit = isTestMode ? 10 : (formData.send_limit ? parseInt(formData.send_limit) : null);
      const contactsToSend = actualSendLimit ? campaignContacts.slice(0, actualSendLimit) : campaignContacts;

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: formData.name,
          list_id: list.id,
          template_id: formData.template_id || null,
          message: formData.message,
          status: formData.send_now ? 'sending' : 'scheduled',
          send_now: formData.send_now,
          scheduled_at: formData.scheduled_at || null,
          send_limit: actualSendLimit,
          contacts_total: contactsToSend.length,
          is_test_mode: isTestMode,
          send_interval_minutes: Math.ceil(sendingConfig.send_interval_seconds / 60),
        })
        .select('*, list:lists(*), template:templates(*)')
        .single();

      if (campaignError) throw campaignError;

      // Initialize queue dispatcher
      const success = await queueDispatcher.initializeQueue(
        campaign.id,
        contactsToSend,
        sendingConfig.send_interval_seconds,
        true,
        formData.send_now ? null : formData.scheduled_at
      );

      if (!success) {
        throw new Error('Falha ao inicializar fila de envio');
      }

      toast({
        title: '🚀 Campanha criada!',
        description: `"${formData.name}" com ${contactsToSend.length} contatos iniciada com sucesso`,
      });

      onCampaignCreated?.(campaign as Campaign);
      handleClose();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Erro ao criar campanha',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      template_id: '',
      message: '',
      send_now: true,
      scheduled_at: '',
      send_limit: '',
    });
    setIsTestMode(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Criar Campanha
          </DialogTitle>
          <DialogDescription>
            Crie uma campanha de WhatsApp diretamente com os {leads.length} leads selecionados
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected Leads Badge */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Contatos selecionados:</span>
            <Badge variant="secondary" className="font-bold">
              {leads.length} leads
            </Badge>
          </div>

          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Campanha *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Prospecção Restaurantes SP"
              required
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template (opcional)</Label>
            <Select value={formData.template_id} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template ou escreva abaixo" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum template disponível
                  </div>
                ) : (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Test Mode Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-destructive" />
              <div>
                <Label className="text-destructive">Modo Teste</Label>
                <p className="text-xs text-destructive/70">
                  Envia para contato de teste, limite de 10 msgs
                </p>
              </div>
            </div>
            <Switch
              checked={isTestMode}
              onCheckedChange={setIsTestMode}
              className="data-[state=checked]:bg-destructive"
            />
          </div>

          {isTestMode && (
            <TestModeBanner
              testContactPhone={defaultTestContact?.phone}
              maxMessages={10}
              intervalSeconds={5}
            />
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Digite sua mensagem. Use {{nome}}, {{empresa}}, {{endereco}} para personalização."
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: {"{{nome}}"}, {"{{empresa}}"}, {"{{endereco}}"}, {"{{telefone}}"}
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
              placeholder={`Máximo: ${leads.length}`}
              max={leads.length}
            />
          </div>

          {/* Schedule Preview */}
          {totalContacts > 0 && !isLoadingConfig && (
            <CampaignSchedulePreview
              totalContacts={totalContacts}
              config={sendingConfig}
            />
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando Campanha...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Iniciar Campanha
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
