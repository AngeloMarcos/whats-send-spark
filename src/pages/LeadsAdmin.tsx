import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LeadsStats } from '@/components/leads/LeadsStats';
import { LeadsFilters } from '@/components/leads/LeadsFilters';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { LeadDetailsModal } from '@/components/leads/LeadDetailsModal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import { useLeadsAdmin, type LeadAdmin, type LeadsFilters as LeadsFiltersType } from '@/hooks/useLeadsAdmin';
import { toast } from '@/hooks/use-toast';

export default function LeadsAdmin() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState<LeadsFiltersType>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadAdmin | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<string>('');

  const { leads, totalCount, stats, loading, refetch, updateLeadStatus, deleteLeads } = useLeadsAdmin({
    page,
    pageSize,
    filters
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleFiltersChange = (newFilters: LeadsFiltersType) => {
    setFilters(newFilters);
    setPage(1);
    setSelectedIds([]);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
    setSelectedIds([]);
  };

  const handleViewLead = (lead: LeadAdmin) => {
    setSelectedLead(lead);
    setShowDetailsModal(true);
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteLeads([id]);
      toast({ title: 'Lead excluído com sucesso!' });
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } catch (err) {
      toast({
        title: 'Erro ao excluir lead',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive'
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await deleteLeads(selectedIds);
      toast({ title: `${selectedIds.length} leads excluídos com sucesso!` });
      setSelectedIds([]);
      setShowBulkDeleteDialog(false);
    } catch (err) {
      toast({
        title: 'Erro ao excluir leads',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive'
      });
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (!status || selectedIds.length === 0) return;

    try {
      await updateLeadStatus(selectedIds, status);
      toast({ title: `Status de ${selectedIds.length} leads atualizado!` });
      setSelectedIds([]);
      setBulkStatusValue('');
    } catch (err) {
      toast({
        title: 'Erro ao atualizar status',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive'
      });
    }
  };

  const handleExport = () => {
    // Generate CSV from current leads
    const headers = ['Nome', 'CNPJ', 'Email', 'Telefones', 'Cidade', 'UF', 'Status', 'Fonte', 'Data'];
    const rows = leads.map((lead) => [
      lead.nome_fantasia || lead.razao_social || lead.nome || '',
      lead.cnpj || '',
      lead.email || '',
      lead.telefones || '',
      lead.municipio || '',
      lead.uf || '',
      lead.status || '',
      lead.source || '',
      lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : ''
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Leads exportados com sucesso!' });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Leads</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie todos os leads capturados
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Statistics */}
        <LeadsStats stats={stats} loading={loading} />

        {/* Filters */}
        <LeadsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          onExport={handleExport}
        />

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedIds.length} lead(s) selecionado(s)
            </span>

            <Select value={bulkStatusValue} onValueChange={handleBulkStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="contacted">Contatado</SelectItem>
                <SelectItem value="converted">Convertido</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir selecionados
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Limpar seleção
            </Button>
          </div>
        )}

        {/* Table */}
        <LeadsTable
          leads={leads}
          loading={loading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onViewLead={handleViewLead}
          onDeleteLead={handleDeleteLead}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} de{' '}
              {totalCount.toLocaleString('pt-BR')} leads
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm px-2">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Lead details modal */}
        <LeadDetailsModal
          lead={selectedLead}
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
        />

        {/* Bulk delete confirmation */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {selectedIds.length} lead(s)?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground"
              >
                Excluir {selectedIds.length} lead(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
