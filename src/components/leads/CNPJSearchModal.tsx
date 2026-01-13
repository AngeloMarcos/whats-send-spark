import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useBrasilAPI, BrasilAPIResponse } from '@/hooks/useBrasilAPI';
import { supabase } from '@/integrations/supabase/client';
import { buildWhatsAppUrl } from '@/lib/phoneUtils';
import {
  Building,
  Search,
  Loader2,
  Phone,
  Copy,
  MessageCircle,
  Mail,
  MapPin,
  Briefcase,
  AlertCircle,
  Save,
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
} from 'lucide-react';

interface CNPJSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadSaved?: () => void;
}

// Formatar CNPJ para exibição
function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

// Formatar telefone para exibição
function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return phone;
}

// Formatar capital social
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Aplicar máscara de CNPJ enquanto digita
function applyCNPJMask(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  let formatted = cleaned;
  
  if (cleaned.length > 2) {
    formatted = cleaned.slice(0, 2) + '.' + cleaned.slice(2);
  }
  if (cleaned.length > 5) {
    formatted = formatted.slice(0, 6) + '.' + formatted.slice(6);
  }
  if (cleaned.length > 8) {
    formatted = formatted.slice(0, 10) + '/' + formatted.slice(10);
  }
  if (cleaned.length > 12) {
    formatted = formatted.slice(0, 15) + '-' + formatted.slice(15);
  }
  
  return formatted.slice(0, 18);
}

// Componente para linha de informação
function InfoRow({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | null | undefined;
}) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

export function CNPJSearchModal({ open, onOpenChange, onLeadSaved }: CNPJSearchModalProps) {
  const [cnpjInput, setCnpjInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { isLoading, error, data, searchCNPJ, clearData } = useBrasilAPI();

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCNPJMask(e.target.value);
    setCnpjInput(masked);
  };

  const handleSearch = async () => {
    if (!cnpjInput) {
      toast({
        title: 'CNPJ obrigatório',
        description: 'Digite um CNPJ para buscar',
        variant: 'destructive',
      });
      return;
    }

    await searchCNPJ(cnpjInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/\D/g, ''));
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência`,
    });
  };

  const openWhatsApp = (phone: string, companyName: string) => {
    const url = buildWhatsAppUrl(phone, `Olá ${companyName}! Vi sua empresa e gostaria de conversar.`);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleSaveLead = async () => {
    if (!data) return;

    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: 'Não autenticado',
          description: 'Você precisa estar logado para salvar leads',
          variant: 'destructive',
        });
        return;
      }

      // Montar array de telefones
      const telefones: string[] = [];
      if (data.ddd_telefone_1) telefones.push(data.ddd_telefone_1);
      if (data.ddd_telefone_2) telefones.push(data.ddd_telefone_2);

      // Montar endereço completo
      const endereco = [
        data.descricao_tipo_de_logradouro,
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
      ]
        .filter(Boolean)
        .join(', ');

      // Montar array de sócios
      const socios = data.qsa?.map(socio => ({
        nome: socio.nome_socio,
        qual: socio.qualificacao_socio,
      })) || [];

      const { error: insertError } = await supabase.from('leads').insert({
        user_id: userData.user.id,
        cnpj: data.cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        nome: data.nome_fantasia || data.razao_social,
        situacao: data.descricao_situacao_cadastral,
        telefones: telefones.join(', ') || 'Sem telefone',
        telefones_array: telefones,
        email: data.email,
        endereco,
        logradouro: `${data.descricao_tipo_de_logradouro || ''} ${data.logradouro || ''}`.trim(),
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cep: data.cep,
        municipio: data.municipio,
        uf: data.uf,
        atividade: data.cnae_fiscal_descricao,
        atividades_secundarias: data.cnaes_secundarios,
        data_abertura: data.data_inicio_atividade,
        capital_social: data.capital_social?.toString(),
        porte_empresa: data.porte,
        socios,
        source: 'brasil_api',
        status: 'novo',
      });

      if (insertError) throw insertError;

      toast({
        title: 'Lead salvo!',
        description: `${data.razao_social} foi adicionado à sua lista de leads`,
      });

      onLeadSaved?.();
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o lead. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setCnpjInput('');
    clearData();
    onOpenChange(false);
  };

  const getSituacaoBadgeVariant = (situacao: string) => {
    const lower = situacao?.toLowerCase() || '';
    if (lower.includes('ativa')) return 'default';
    if (lower.includes('baixa') || lower.includes('inativa')) return 'destructive';
    if (lower.includes('suspensa')) return 'secondary';
    return 'outline';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Buscar Empresa por CNPJ
          </DialogTitle>
          <DialogDescription>
            Consulte dados de empresas diretamente da base oficial (BrasilAPI)
          </DialogDescription>
        </DialogHeader>

        {/* Campo de busca */}
        <div className="flex gap-2">
          <Input
            placeholder="00.000.000/0001-00"
            value={cnpjInput}
            onChange={handleCNPJChange}
            onKeyPress={handleKeyPress}
            maxLength={18}
            className="font-mono text-lg"
          />
          <Button onClick={handleSearch} disabled={isLoading} className="min-w-[100px]">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </div>

        {/* Erro */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Resultados */}
        {data && (
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg leading-tight">
                    {data.razao_social}
                  </CardTitle>
                  {data.nome_fantasia && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {data.nome_fantasia}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    CNPJ: {formatCNPJ(data.cnpj)}
                  </p>
                </div>
                <Badge variant={getSituacaoBadgeVariant(data.descricao_situacao_cadastral)}>
                  {data.descricao_situacao_cadastral}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* DESTAQUE ESPECIAL PARA TELEFONES */}
              <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-500 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-green-700 dark:text-green-400">
                    Telefones da Empresa
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* Telefone Principal */}
                  {data.ddd_telefone_1 && (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Principal</p>
                        <span className="text-2xl font-mono font-bold text-foreground">
                          {formatPhone(data.ddd_telefone_1)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(data.ddd_telefone_1, 'Telefone')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openWhatsApp(data.ddd_telefone_1, data.nome_fantasia || data.razao_social)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Telefone Secundário */}
                  {data.ddd_telefone_2 && (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Secundário</p>
                        <span className="text-xl font-mono font-semibold text-foreground">
                          {formatPhone(data.ddd_telefone_2)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(data.ddd_telefone_2, 'Telefone')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openWhatsApp(data.ddd_telefone_2, data.nome_fantasia || data.razao_social)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sem telefone */}
                  {!data.ddd_telefone_1 && !data.ddd_telefone_2 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhum telefone cadastrado para esta empresa na base oficial
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Demais Dados */}
              <div className="grid gap-3 md:grid-cols-2">
                <InfoRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={data.email}
                />
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Cidade/UF"
                  value={`${data.municipio}/${data.uf}`}
                />
                <InfoRow
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Atividade Principal"
                  value={data.cnae_fiscal_descricao}
                />
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Data de Abertura"
                  value={data.data_inicio_atividade ? new Date(data.data_inicio_atividade).toLocaleDateString('pt-BR') : null}
                />
                <InfoRow
                  icon={<Building className="h-4 w-4" />}
                  label="Porte"
                  value={data.porte}
                />
                <InfoRow
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Capital Social"
                  value={data.capital_social ? formatCurrency(data.capital_social) : null}
                />
              </div>

              {/* Endereço completo */}
              {data.logradouro && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Endereço Completo</p>
                      <p className="text-sm">
                        {[
                          data.descricao_tipo_de_logradouro,
                          data.logradouro,
                          data.numero,
                          data.complemento,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      <p className="text-sm">
                        {data.bairro} - {data.municipio}/{data.uf} - CEP: {data.cep}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sócios */}
              {data.qsa && data.qsa.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">
                      Quadro Societário ({data.qsa.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {data.qsa.slice(0, 5).map((socio, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{socio.nome_socio}</span>
                        <Badge variant="outline" className="text-xs">
                          {socio.qualificacao_socio}
                        </Badge>
                      </div>
                    ))}
                    {data.qsa.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{data.qsa.length - 5} sócios
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Botão para Salvar Lead */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleSaveLead}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar como Lead
              </Button>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
