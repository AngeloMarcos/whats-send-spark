import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import { SearchForm } from '@/components/leads/SearchForm';
import { ResultsTable } from '@/components/leads/ResultsTable';
import { LeadActions } from '@/components/leads/LeadActions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LeadCapture() {
  const { leads, isLoading, error, searchPlaces } = useGooglePlaces();
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const handleSearch = async (params: {
    query: string;
    location: string;
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
            <h1 className="text-2xl font-bold">Capturar Leads</h1>
            <p className="text-muted-foreground">
              Extraia contatos de estabelecimentos do Google Maps
            </p>
          </div>
        </div>

        <SearchForm onSearch={handleSearch} isLoading={isLoading} />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
