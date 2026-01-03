import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLog } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsType } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SkeletonSettingsCard } from '@/components/ui/loading-skeletons';
import { Loader2, Save, Webhook, LogOut, Zap, CheckCircle, XCircle } from 'lucide-react';
import { TestContactsSection } from '@/components/settings/TestContactsSection';

// Validate webhook URL for security (SSRF prevention)
function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) return { valid: true }; // Allow empty (user can clear)
  
  try {
    const parsed = new URL(url);
    
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'A URL deve usar HTTPS' };
    }
    
    // Block private/internal IPs and hostnames
    const blockedPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '10.', '192.168.', '172.16.', 'internal', 'local'];
    if (blockedPatterns.some(p => parsed.hostname.includes(p))) {
      return { valid: false, error: 'URLs internas ou privadas não são permitidas' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Formato de URL inválido' };
  }
}

interface WebhookTestResult {
  success: boolean;
  responseTime?: number;
  error?: string;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { logSettingsUpdate, logLogout } = useAuditLog();
  
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setSettings(data as SettingsType);
      setWebhookUrl(data.n8n_webhook_url || '');
    }
    setIsLoading(false);
  };

  const handleWebhookChange = (value: string) => {
    setWebhookUrl(value);
    // Clear error and test result when user is typing
    if (webhookError) setWebhookError(null);
    if (testResult) setTestResult(null);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: 'URL necessária',
        description: 'Digite uma URL para testar',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL first
    const validation = validateWebhookUrl(webhookUrl);
    if (!validation.valid) {
      setWebhookError(validation.error || 'URL inválida');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-webhook', {
        body: { url: webhookUrl },
      });

      if (error) {
        setTestResult({ success: false, error: 'Erro ao testar conexão' });
      } else if (data) {
        setTestResult(data as WebhookTestResult);
        if (data.success) {
          toast({
            title: 'Conexão bem-sucedida!',
            description: `Webhook respondeu em ${data.responseTime}ms`,
          });
        } else {
          toast({
            title: 'Falha na conexão',
            description: data.error || 'Não foi possível conectar ao webhook',
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      setTestResult({ success: false, error: 'Erro ao testar conexão' });
      toast({
        title: 'Erro',
        description: 'Não foi possível testar a conexão',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate webhook URL before saving
    const validation = validateWebhookUrl(webhookUrl);
    if (!validation.valid) {
      setWebhookError(validation.error || 'URL inválida');
      toast({
        title: 'URL do Webhook inválida',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({ n8n_webhook_url: webhookUrl || null })
        .eq('user_id', user.id);

      if (error) throw error;

      // Log the settings update
      logSettingsUpdate(['n8n_webhook_url']);

      toast({ title: 'Configurações salvas com sucesso!' });
    } catch (error: unknown) {
      toast({
        title: 'Erro ao salvar configurações',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    logLogout();
    await signOut();
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Configurações" 
        description="Configure as integrações e preferências do sistema"
      />
      
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="max-w-2xl space-y-6">
            <SkeletonSettingsCard />
            <SkeletonSettingsCard />
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">
            {/* Webhook Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  <CardTitle>Integração n8n</CardTitle>
                </div>
                <CardDescription>
                  Configure a URL do webhook do seu workflow no n8n para enviar campanhas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook">URL do Webhook</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        id="webhook"
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => handleWebhookChange(e.target.value)}
                        placeholder="https://seu-n8n.com/webhook/..."
                        className={webhookError ? 'border-destructive' : ''}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestWebhook}
                      disabled={isTesting || !webhookUrl.trim()}
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Testar</span>
                    </Button>
                  </div>
                  
                  {/* Test result feedback */}
                  {testResult && (
                    <div className={`flex items-center gap-2 text-sm ${
                      testResult.success ? 'text-green-600' : 'text-destructive'
                    }`}>
                      {testResult.success ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Conectado ({testResult.responseTime}ms)</span>
                          <Badge variant="secondary" className="text-green-600 bg-green-500/10">
                            OK
                          </Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          <span>{testResult.error || 'Falha na conexão'}</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {webhookError ? (
                    <p className="text-xs text-destructive">{webhookError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Esta URL será usada para enviar os dados da campanha ao seu workflow n8n. Deve usar HTTPS.
                    </p>
                  )}
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Test Contacts */}
            <TestContactsSection />

            {/* Account */}
            <Card>
              <CardHeader>
                <CardTitle>Conta</CardTitle>
                <CardDescription>
                  Informações da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair da Conta
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
