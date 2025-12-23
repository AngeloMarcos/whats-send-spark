import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsType } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SkeletonSettingsCard } from '@/components/ui/loading-skeletons';
import { Loader2, Save, Webhook, LogOut } from 'lucide-react';

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

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
    // Clear error when user is typing
    if (webhookError) {
      setWebhookError(null);
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

      toast({ title: 'Configurações salvas com sucesso!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar configurações',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
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
                  <Input
                    id="webhook"
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => handleWebhookChange(e.target.value)}
                    placeholder="https://seu-n8n.com/webhook/..."
                    className={webhookError ? 'border-destructive' : ''}
                  />
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
                <Button variant="outline" onClick={signOut}>
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