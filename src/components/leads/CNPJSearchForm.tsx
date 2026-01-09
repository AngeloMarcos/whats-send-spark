import { useState } from 'react';
import { Building, Search, RefreshCw, Save, CheckCircle, User, Phone, Mail, MapPin, Briefcase, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useReceitaWS, formatCNPJ, cleanCNPJ, LeadFromCNPJ } from '@/hooks/useReceitaWS';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CNPJSearchFormProps {
  onLeadSaved?: () => void;
}

export function CNPJSearchForm({ onLeadSaved }: CNPJSearchFormProps) {
  const { user } = useAuth();
  const [cnpjInput, setCnpjInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { isLoading, error, leadData, rawResponse, searchCNPJ, clearData, updateLeadField } = useReceitaWS();

  const handleCNPJChange = (value: string) => {
    // Auto-format as user types
    const cleaned = cleanCNPJ(value);
    if (cleaned.length <= 14) {
      setCnpjInput(formatCNPJ(cleaned));
    }
  };

  const handleSearch = async () => {
    if (!cnpjInput.trim()) {
      toast.error('Digite um CNPJ');
      return;
    }
    await searchCNPJ(cnpjInput);
  };

  const handleReload = () => {
    clearData();
    setCnpjInput('');
  };

  const handleSaveLead = async () => {
    if (!user || !leadData) return;

    // Validation before insert
    const cleanedCnpj = cleanCNPJ(leadData.cnpj);
    if (!cleanedCnpj || cleanedCnpj.length !== 14) {
      toast.error('CNPJ inválido');
      return;
    }

    const razaoSocial = (leadData.razao_social || '').trim();
    if (!razaoSocial) {
      toast.error('Razão social é obrigatória');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare data with safe fallbacks
      const insertData = {
        user_id: user.id,
        cnpj: cleanedCnpj,
        telefones: (leadData.telefones || '').trim() || 'Não informado',
        email: (leadData.email || '').trim() || null,
        nome: razaoSocial,
        razao_social: razaoSocial,
        owner_name: (leadData.owner_name || '').trim() || null,
        situacao: (leadData.situacao || '').trim() || 'DESCONHECIDA',
        atividade: (leadData.atividade || '').trim() || null,
        endereco: (leadData.endereco || '').trim() || null,
        status: 'pending',
        source: 'receitaws',
        extra_data: {
          captured_at: new Date().toISOString(),
          raw_response: rawResponse || {},
        },
      };

      const { error: insertError } = await supabase.from('leads').insert([insertData]);

      if (insertError) throw insertError;

      toast.success('Lead salvo com sucesso!');
      handleReload();
      onLeadSaved?.();
    } catch (err) {
      console.error('Error saving lead:', err);
      
      // User-friendly error messages based on error type
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) {
          toast.error('Este CNPJ já está cadastrado');
        } else if (msg.includes('violates') || msg.includes('constraint')) {
          toast.error('Dados inválidos. Verifique os campos obrigatórios.');
        } else if (msg.includes('network') || msg.includes('fetch')) {
          toast.error('Erro de conexão. Verifique sua internet.');
        } else {
          toast.error('Erro ao salvar lead. Tente novamente.');
        }
      } else {
        toast.error('Erro desconhecido ao salvar');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getSituacaoBadgeVariant = (situacao: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (situacao?.toUpperCase()) {
      case 'ATIVA':
        return 'default';
      case 'SUSPENSA':
        return 'secondary';
      case 'INAPTA':
      case 'BAIXADA':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* CNPJ Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Buscar Empresa por CNPJ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpjInput}
                onChange={(e) => handleCNPJChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={isLoading}
                maxLength={18}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleSearch}
                disabled={isLoading || !cnpjInput.trim()}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Buscar</span>
              </Button>
              {leadData && (
                <Button variant="outline" size="icon" onClick={handleReload}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {leadData && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Dados preenchidos via ReceitaWS
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Data Form */}
      {leadData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Dados da Empresa</span>
              <Badge variant={getSituacaoBadgeVariant(leadData.situacao)}>
                {leadData.situacao || 'Sem status'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Owner Name - Highlighted */}
            {leadData.owner_name && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <Label className="text-primary font-medium">Sócio/Proprietário</Label>
                </div>
                <p className="text-lg font-semibold">{leadData.owner_name}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* Razão Social */}
              <div className="md:col-span-2">
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input
                  id="razao_social"
                  value={leadData.razao_social}
                  onChange={(e) => updateLeadField('razao_social', e.target.value)}
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="telefones" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Telefone
                </Label>
                <Input
                  id="telefones"
                  value={leadData.telefones}
                  onChange={(e) => updateLeadField('telefones', e.target.value)}
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={leadData.email}
                  onChange={(e) => updateLeadField('email', e.target.value)}
                />
              </div>

              {/* Activity */}
              <div className="md:col-span-2">
                <Label htmlFor="atividade" className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Atividade Principal
                </Label>
                <Input
                  id="atividade"
                  value={leadData.atividade}
                  readOnly
                  className="bg-muted"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <Label htmlFor="endereco" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Endereço
                </Label>
                <Input
                  id="endereco"
                  value={leadData.endereco}
                  onChange={(e) => updateLeadField('endereco', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveLead} disabled={isSaving}>
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
