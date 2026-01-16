import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useMetaPixel } from '@/hooks/useMetaPixel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Bot, Building2, MessageSquare, FileText, Check, Loader2, Save } from 'lucide-react';

const BUSINESS_SEGMENTS = [
  { value: 'clinica_medica', label: 'Clínica / Consultório Médico' },
  { value: 'clinica_odontologica', label: 'Clínica Odontológica' },
  { value: 'clinica_estetica', label: 'Clínica de Estética' },
  { value: 'imobiliaria', label: 'Imobiliária / Corretor' },
  { value: 'advocacia', label: 'Advocacia / Escritório Jurídico' },
  { value: 'contabilidade', label: 'Contabilidade' },
  { value: 'ecommerce', label: 'E-commerce / Loja Virtual' },
  { value: 'restaurante', label: 'Restaurante / Delivery' },
  { value: 'oficina', label: 'Oficina / Auto Center' },
  { value: 'servicos', label: 'Prestador de Serviços' },
  { value: 'outro', label: 'Outro' },
];

const WEEK_DAYS = [
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
  { value: 'qua', label: 'Qua' },
  { value: 'qui', label: 'Qui' },
  { value: 'sex', label: 'Sex' },
  { value: 'sab', label: 'Sáb' },
  { value: 'dom', label: 'Dom' },
];

const formSchema = z.object({
  clientName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  clientPhone: z.string().min(10, 'WhatsApp inválido').max(15),
  clientEmail: z.string().email('Email inválido'),
  businessName: z.string().min(2, 'Nome da empresa é obrigatório'),
  businessSegment: z.string().min(1, 'Selecione um segmento'),
  businessDescription: z.string().min(10, 'Descreva seu negócio brevemente'),
  website: z.string().optional(),
  workingHoursStart: z.string().default('08:00'),
  workingHoursEnd: z.string().default('18:00'),
  workingDays: z.array(z.string()).min(1, 'Selecione pelo menos um dia'),
  toneOfVoice: z.enum(['formal', 'amigavel', 'profissional']),
  greeting: z.string().optional(),
  services: z.string().min(10, 'Descreva seus serviços/produtos'),
  faqs: z.string().optional(),
  specialRules: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function StellaOnboarding() {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);
  
  const { toast } = useToast();
  const { trackOnboardingStart, trackOnboardingComplete } = useMetaPixel({ trackPageViewOnMount: true });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      businessName: '',
      businessSegment: '',
      businessDescription: '',
      website: '',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      workingDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
      toneOfVoice: 'profissional',
      greeting: '',
      services: '',
      faqs: '',
      specialRules: '',
    },
  });

  const watchedValues = form.watch();

  // Format phone number
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Track onboarding start when user begins filling
  useEffect(() => {
    if (!hasStartedRef.current && watchedValues.clientName.length > 0) {
      hasStartedRef.current = true;
      trackOnboardingStart(watchedValues.businessSegment || undefined);
    }
  }, [watchedValues.clientName, watchedValues.businessSegment, trackOnboardingStart]);

  // Auto-save with debounce
  const autoSave = useCallback(async (data: Partial<FormData>) => {
    if (!data.clientName || !data.clientEmail || !data.clientPhone) return;
    
    setIsSaving(true);
    try {
      const formData = {
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone,
        business_name: data.businessName || '',
        business_segment: data.businessSegment || '',
        form_data: data,
        status: 'in_progress',
      };

      if (recordId) {
        await supabase
          .from('stella_onboarding')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', recordId);
      } else {
        const { data: inserted } = await supabase
          .from('stella_onboarding')
          .insert(formData)
          .select('id')
          .single();
        
        if (inserted?.id) {
          setRecordId(inserted.id);
          localStorage.setItem('stella_onboarding_id', inserted.id);
        }
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [recordId]);

  // Debounced auto-save on form changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave(watchedValues);
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, autoSave]);

  // Recover saved data on mount
  useEffect(() => {
    const savedId = localStorage.getItem('stella_onboarding_id');
    if (savedId) {
      supabase
        .from('stella_onboarding')
        .select('*')
        .eq('id', savedId)
        .eq('status', 'in_progress')
        .single()
        .then(({ data }) => {
          if (data?.form_data) {
            const formData = data.form_data as FormData;
            Object.keys(formData).forEach((key) => {
              form.setValue(key as keyof FormData, formData[key as keyof FormData]);
            });
            setRecordId(savedId);
            toast({
              title: 'Dados recuperados',
              description: 'Continuamos de onde você parou!',
            });
          }
        });
    }
  }, [form, toast]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const formData = {
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone,
        business_name: data.businessName,
        business_segment: data.businessSegment,
        form_data: data,
        status: 'completed',
      };

      if (recordId) {
        await supabase
          .from('stella_onboarding')
          .update(formData)
          .eq('id', recordId);
      } else {
        await supabase
          .from('stella_onboarding')
          .insert(formData);
      }

      // Track conversion
      trackOnboardingComplete({
        segment: data.businessSegment,
        businessName: data.businessName,
      });

      localStorage.removeItem('stella_onboarding_id');
      setIsComplete(true);
      
      toast({
        title: '🎉 Configuração enviada!',
        description: 'Em breve entraremos em contato para ativar sua Stella IA.',
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Configuração Enviada!</h1>
            <p className="text-muted-foreground mb-6">
              Recebemos suas informações. Em até 24h nossa equipe entrará em contato para ativar sua Stella IA.
            </p>
            <p className="text-sm text-muted-foreground">
              Dúvidas? Entre em contato pelo WhatsApp
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Configure sua Stella IA</h1>
          <p className="text-muted-foreground">
            Preencha o formulário abaixo para personalizarmos sua assistente virtual WhatsApp
          </p>
        </div>

        {/* Auto-save indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : lastSaved ? (
            <>
              <Save className="w-4 h-4 text-green-500" />
              <span>Salvo automaticamente às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </>
          ) : (
            <span>Salvamento automático ativado</span>
          )}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Contact Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-primary" />
                Dados de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Seu Nome *</Label>
                  <Input
                    id="clientName"
                    placeholder="João Silva"
                    {...form.register('clientName')}
                  />
                  {form.formState.errors.clientName && (
                    <p className="text-sm text-destructive">{form.formState.errors.clientName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">WhatsApp *</Label>
                  <Input
                    id="clientPhone"
                    placeholder="(11) 99999-9999"
                    {...form.register('clientPhone', {
                      onChange: (e) => {
                        e.target.value = formatPhone(e.target.value);
                      },
                    })}
                  />
                  {form.formState.errors.clientPhone && (
                    <p className="text-sm text-destructive">{form.formState.errors.clientPhone.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="seu@email.com"
                  {...form.register('clientEmail')}
                />
                {form.formState.errors.clientEmail && (
                  <p className="text-sm text-destructive">{form.formState.errors.clientEmail.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-primary" />
                Sobre seu Negócio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nome da Empresa *</Label>
                  <Input
                    id="businessName"
                    placeholder="Minha Empresa Ltda"
                    {...form.register('businessName')}
                  />
                  {form.formState.errors.businessName && (
                    <p className="text-sm text-destructive">{form.formState.errors.businessName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Segmento *</Label>
                  <Select
                    value={form.watch('businessSegment')}
                    onValueChange={(value) => form.setValue('businessSegment', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_SEGMENTS.map((segment) => (
                        <SelectItem key={segment.value} value={segment.value}>
                          {segment.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.businessSegment && (
                    <p className="text-sm text-destructive">{form.formState.errors.businessSegment.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessDescription">Descrição do Negócio *</Label>
                <Textarea
                  id="businessDescription"
                  placeholder="Descreva brevemente o que sua empresa faz, público-alvo, diferenciais..."
                  rows={3}
                  {...form.register('businessDescription')}
                />
                {form.formState.errors.businessDescription && (
                  <p className="text-sm text-destructive">{form.formState.errors.businessDescription.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website / Instagram (opcional)</Label>
                <Input
                  id="website"
                  placeholder="www.suaempresa.com.br ou @seuinstagram"
                  {...form.register('website')}
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                Como a IA deve responder
              </CardTitle>
              <CardDescription>Configure o comportamento da sua assistente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário de Atendimento</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      {...form.register('workingHoursStart')}
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">até</span>
                    <Input
                      type="time"
                      {...form.register('workingHoursEnd')}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dias de Atendimento *</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map((day) => {
                      const isChecked = form.watch('workingDays').includes(day.value);
                      return (
                        <label
                          key={day.value}
                          className={`flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer border transition-colors ${
                            isChecked
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:border-primary/50'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const current = form.getValues('workingDays');
                              if (checked) {
                                form.setValue('workingDays', [...current, day.value]);
                              } else {
                                form.setValue('workingDays', current.filter((d) => d !== day.value));
                              }
                            }}
                            className="sr-only"
                          />
                          <span className="text-xs font-medium">{day.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {form.formState.errors.workingDays && (
                    <p className="text-sm text-destructive">{form.formState.errors.workingDays.message}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Tom de Voz *</Label>
                <RadioGroup
                  value={form.watch('toneOfVoice')}
                  onValueChange={(value) => form.setValue('toneOfVoice', value as 'formal' | 'amigavel' | 'profissional')}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="formal" id="formal" />
                    <Label htmlFor="formal" className="cursor-pointer">Formal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="amigavel" id="amigavel" />
                    <Label htmlFor="amigavel" className="cursor-pointer">Amigável</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="profissional" id="profissional" />
                    <Label htmlFor="profissional" className="cursor-pointer">Profissional</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="greeting">Saudação Personalizada (opcional)</Label>
                <Input
                  id="greeting"
                  placeholder="Ex: Olá! Bem-vindo à Clínica XYZ 👋"
                  {...form.register('greeting')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Informações para a IA
              </CardTitle>
              <CardDescription>Quanto mais informações, melhor será o atendimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="services">Serviços / Produtos Oferecidos *</Label>
                <Textarea
                  id="services"
                  placeholder="Liste seus principais serviços ou produtos, preços aproximados, condições de pagamento..."
                  rows={4}
                  {...form.register('services')}
                />
                {form.formState.errors.services && (
                  <p className="text-sm text-destructive">{form.formState.errors.services.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="faqs">Perguntas Frequentes (opcional)</Label>
                <Textarea
                  id="faqs"
                  placeholder="Liste perguntas e respostas comuns que seus clientes fazem. Ex: 'Qual o horário de funcionamento?' - 'Funcionamos de segunda a sexta, das 8h às 18h.'"
                  rows={4}
                  {...form.register('faqs')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRules">Regras Especiais (opcional)</Label>
                <Textarea
                  id="specialRules"
                  placeholder="Alguma regra específica? Ex: 'Não dar descontos', 'Sempre perguntar o nome antes', 'Encaminhar para atendente humano se perguntarem sobre...' "
                  rows={3}
                  {...form.register('specialRules')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full text-lg py-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                🚀 Enviar Configuração
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Ao enviar, você concorda em receber contato da nossa equipe para configurar sua Stella IA.
          </p>
        </form>
      </div>
    </div>
  );
}
