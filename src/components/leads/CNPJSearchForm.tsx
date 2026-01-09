import { useState } from 'react';
import { Building, Search, RefreshCw, Save, CheckCircle, User, Phone, Mail, MapPin, Briefcase, AlertCircle, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReceitaWS, formatCNPJ, cleanCNPJ } from '@/hooks/useReceitaWS';
import { useBulkCNPJSearch } from '@/hooks/useBulkCNPJSearch';
import { CaptureResultsTable } from './CaptureResultsTable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LeadCapturado } from '@/types/leadCapture';

interface CNPJSearchFormProps {
  onLeadSaved?: () => void;
}

export function CNPJSearchForm({ onLeadSaved }: CNPJSearchFormProps) {
  const { user } = useAuth();
  const [searchMode, setSearchMode] = useState<'single' | 'bulk'>('single');
  const [cnpjInput, setCnpjInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Single search
  const { isLoading, error, leadData, rawResponse, searchCNPJ, clearData, updateLeadField } = useReceitaWS();
  
  // Bulk search
  const { isSearching, progress, results, searchBulk, cancelSearch, clearResults } = useBulkCNPJSearch();

  const handleCNPJChange = (value: string) => {
    const cleaned = cleanCNPJ(value);
    if (cleaned.length <= 14) {
      setCnpjInput(formatCNPJ(cleaned));
    }
  };

  const handleSingleSearch = async () => {
    if (!cnpjInput.trim()) {
      toast.error('Digite um CNPJ');
      return;
    }
    await searchCNPJ(cnpjInput);
  };

  const handleBulkSearch = async () => {
    const cnpjs = bulkInput
      .split(/[\n,;]/)
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    if (cnpjs.length === 0) {
      toast.error('Cole CNPJs para buscar');
      return;
    }
    
    await searchBulk(cnpjs);
  };

  const handleReload = () => {
    clearData();
    setCnpjInput('');
  };

  const handleClearBulk = () => {
    setBulkInput('');
    clearResults();
  };

  const handleSaveLead = async () => {
    if (!user || !leadData) return;

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
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) {
          toast.error('Este CNPJ já está cadastrado');
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

  const handleSaveBulkLeads = async (leads: LeadCapturado[]) => {
    if (!user || leads.length === 0) return;

    setIsSaving(true);
    try {
      const insertData = leads.map(lead => ({
        user_id: user.id,
        cnpj: cleanCNPJ(lead.cnpj),
        telefones: lead.telefones_raw || 'Não informado',
        telefones_array: lead.telefones,
        whatsapp_links: lead.telefones.map(p => p.whatsappApiLink).filter(Boolean),
        email: lead.email || null,
        nome: lead.razao_social,
        razao_social: lead.razao_social,
        nome_fantasia: lead.nome_fantasia || null,
        owner_name: lead.owner_name || null,
        situacao: lead.situacao || 'DESCONHECIDA',
        atividade: lead.atividade_principal || null,
        endereco: lead.endereco || null,
        cep: lead.cep || null,
        logradouro: lead.logradouro || null,
        numero: lead.numero || null,
        bairro: lead.bairro || null,
        municipio: lead.municipio || null,
        uf: lead.uf || null,
        porte_empresa: lead.porte_empresa || null,
        data_abertura: lead.data_abertura || null,
        socios: lead.socios || [],
        status: 'pending',
        source: lead.source,
      }));

      const { error: insertError } = await supabase.from('leads').insert(insertData);
      if (insertError) throw insertError;

      toast.success(`${leads.length} leads salvos com sucesso!`);
      onLeadSaved?.();
    } catch (err) {
      console.error('Error saving leads:', err);
      toast.error('Erro ao salvar leads');
    } finally {
      setIsSaving(false);
    }
  };

  const getSituacaoBadgeVariant = (situacao: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (situacao?.toUpperCase()) {
      case 'ATIVA': return 'default';
      case 'SUSPENSA': return 'secondary';
      case 'INAPTA':
      case 'BAIXADA': return 'destructive';
      default: return 'outline';
    }
  };

  const bulkCnpjCount = bulkInput
    .split(/[\n,;]/)
    .map(c => c.trim())
    .filter(c => cleanCNPJ(c).length === 14).length;

  return (
    <div className="space-y-6">
      {/* Search Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Buscar Empresas por CNPJ
          </CardTitle>
          <CardDescription>
            Busque um CNPJ individual ou cole uma lista para busca em lote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'single' | 'bulk')}>
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="single" className="gap-2">
                <Search className="h-4 w-4" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="bulk" className="gap-2">
                <FileText className="h-4 w-4" />
                Em Lote
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {searchMode === 'single' ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpjInput}
                  onChange={(e) => handleCNPJChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSingleSearch()}
                  disabled={isLoading}
                  maxLength={18}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleSingleSearch} disabled={isLoading || !cnpjInput.trim()}>
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">Buscar</span>
                </Button>
                {leadData && (
                  <Button variant="outline" size="icon" onClick={handleReload}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="bulk-cnpj">Cole os CNPJs (um por linha ou separados por vírgula)</Label>
                <Textarea
                  id="bulk-cnpj"
                  placeholder="00.000.000/0000-00&#10;11.111.111/0001-11&#10;22.222.222/0002-22"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  disabled={isSearching}
                  rows={5}
                  className="font-mono text-sm"
                />
                {bulkInput && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {bulkCnpjCount} CNPJ{bulkCnpjCount !== 1 ? 's' : ''} válido{bulkCnpjCount !== 1 ? 's' : ''} detectado{bulkCnpjCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleBulkSearch} disabled={isSearching || bulkCnpjCount === 0}>
                  {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">{isSearching ? 'Buscando...' : 'Buscar Todos'}</span>
                </Button>
                {isSearching && (
                  <Button variant="outline" onClick={cancelSearch}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
                {results.length > 0 && !isSearching && (
                  <Button variant="outline" onClick={handleClearBulk}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar for Bulk Search */}
          {isSearching && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Buscando: {progress.currentCnpj}</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
              <p className="text-xs text-muted-foreground">
                {progress.found} encontrados • {progress.errors} erros
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {leadData && searchMode === 'single' && (
            <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Dados preenchidos via ReceitaWS
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Single Lead Data Form */}
      {leadData && searchMode === 'single' && (
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
              <div className="md:col-span-2">
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input
                  id="razao_social"
                  value={leadData.razao_social}
                  onChange={(e) => updateLeadField('razao_social', e.target.value)}
                />
              </div>

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

              <div className="md:col-span-2">
                <Label htmlFor="atividade" className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Atividade Principal
                </Label>
                <Input id="atividade" value={leadData.atividade} readOnly className="bg-muted" />
              </div>

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
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Results Table */}
      {results.length > 0 && searchMode === 'bulk' && (
        <CaptureResultsTable 
          leads={results} 
          onAddToList={handleSaveBulkLeads}
          loading={isSearching}
        />
      )}
    </div>
  );
}
