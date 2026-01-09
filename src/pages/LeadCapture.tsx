import { useState } from 'react';
import { MapPin, Search, Phone, Clock, TrendingUp, Building, AlertTriangle, RefreshCw } from 'lucide-react';
import { useGooglePlaces, SearchMetrics } from '@/hooks/useGooglePlaces';
import { SearchForm } from '@/components/leads/SearchForm';
import { ResultsTable } from '@/components/leads/ResultsTable';
import { LeadActions } from '@/components/leads/LeadActions';
import { CNPJSearchForm } from '@/components/leads/CNPJSearchForm';
import { AppLayout } from '@/components/layout/AppLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';

function StatsCards({ metrics }: { metrics: SearchMetrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.searched}</p>
              <p className="text-xs text-muted-foreground">Encontrados</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.total}</p>
              <p className="text-xs text-muted-foreground">Com Telefone</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.success_rate}%</p>
              <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.processing_time.toFixed(1)}s</p>
              <p className="text-xs text-muted-foreground">Tempo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LeadCapture() {
  const { leads, isLoading, error, metrics, searchPlaces } = useGooglePlaces();
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('google-maps');

  const handleSearch = async (params: {
    query: string;
    location: string;
    radius: number;
    maxResults: number;
    minRating: number;
    onlyWithPhone: boolean;
  }) => {
    setSelectedLeads(new Set());
    await searchPlaces(params);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">🔍 Capturar Leads</h1>
            <p className="text-muted-foreground">
              Encontre empresas via Google Maps ou CNPJ
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="google-maps" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Google Maps
            </TabsTrigger>
            <TabsTrigger value="cnpj" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Busca CNPJ
            </TabsTrigger>
          </TabsList>

          {/* Use CSS visibility instead of unmounting to avoid React 19 + Radix portal issues */}
          <div className={`space-y-6 mt-6 ${activeTab === 'google-maps' ? 'block' : 'hidden'}`}>
            <SearchForm onSearch={handleSearch} isLoading={isLoading} />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {metrics && <StatsCards metrics={metrics} />}

            {leads.length > 0 && (
              <LeadActions leads={leads} selectedLeads={selectedLeads} />
            )}

            <ResultsTable
              leads={leads}
              selectedLeads={selectedLeads}
              onSelectionChange={setSelectedLeads}
            />
          </div>

          <div className={`mt-6 ${activeTab === 'cnpj' ? 'block' : 'hidden'}`}>
            <ErrorBoundary
              fallback={
                <Card className="p-6">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center gap-2">
                      Erro ao carregar busca por CNPJ.
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="h-auto p-0"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Recarregar página
                      </Button>
                    </AlertDescription>
                  </Alert>
                </Card>
              }
            >
              <CNPJSearchForm />
            </ErrorBoundary>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
