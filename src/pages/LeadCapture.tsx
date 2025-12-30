import { useState } from 'react';
import { MapPin, Search, Phone, Clock, TrendingUp } from 'lucide-react';
import { useGooglePlaces, SearchMetrics } from '@/hooks/useGooglePlaces';
import { SearchForm } from '@/components/leads/SearchForm';
import { ResultsTable } from '@/components/leads/ResultsTable';
import { LeadActions } from '@/components/leads/LeadActions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

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
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">🗺️ Capturar Leads do Google Maps</h1>
            <p className="text-muted-foreground">
              Encontre estabelecimentos e adicione às suas listas
            </p>
          </div>
        </div>

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
    </AppLayout>
  );
}
