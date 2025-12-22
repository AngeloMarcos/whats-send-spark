import { Campaign } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Loader2, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignHistoryProps {
  campaigns: Campaign[];
  onRefresh: () => void;
  isLoading: boolean;
}

const statusConfig = {
  draft: { label: 'Rascunho', variant: 'secondary' as const },
  scheduled: { label: 'Agendada', variant: 'outline' as const },
  sending: { label: 'Enviando', variant: 'default' as const },
  completed: { label: 'Concluída', variant: 'default' as const },
  error: { label: 'Erro', variant: 'destructive' as const },
  paused: { label: 'Pausada', variant: 'secondary' as const },
};

export function CampaignHistory({ campaigns, onRefresh, isLoading }: CampaignHistoryProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Histórico de Campanhas
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma campanha encontrada
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Lista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Enviados</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead>Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const status = statusConfig[campaign.status];
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{campaign.list?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{campaign.contacts_sent}</TableCell>
                      <TableCell className="text-center">{campaign.contacts_total}</TableCell>
                      <TableCell>
                        {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}