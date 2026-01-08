import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, Trash2, RefreshCw, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ErrorReport {
  id: string;
  route: string;
  message: string;
  stack: string | null;
  component_stack: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function Errors() {
  const { user, loading: authLoading } = useAuth();
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('7d');
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const fetchErrors = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('app_error_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      
      // Apply period filter
      if (periodFilter !== 'all') {
        const now = new Date();
        let since: Date;
        switch (periodFilter) {
          case '24h':
            since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            since = new Date(0);
        }
        query = query.gte('created_at', since.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) {
        toast.error('Erro ao carregar relatórios');
        console.error(error);
        return;
      }
      
      setErrors((data ?? []) as ErrorReport[]);
    } catch (e) {
      console.error('Failed to fetch errors:', e);
      toast.error('Falha ao carregar erros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchErrors();
    }
  }, [user, periodFilter]);

  const filteredErrors = errors.filter(err => {
    const matchesSearch = searchTerm === '' || 
      err.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (err.stack ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRoute = routeFilter === 'all' || err.route === routeFilter;
    
    return matchesSearch && matchesRoute;
  });

  const uniqueRoutes = [...new Set(errors.map(e => e.route))];

  const handleCopyError = (error: ErrorReport) => {
    const details = {
      id: error.id,
      route: error.route,
      message: error.message,
      stack: error.stack,
      componentStack: error.component_stack,
      source: error.source,
      metadata: error.metadata,
      createdAt: error.created_at,
    };
    navigator.clipboard.writeText(JSON.stringify(details, null, 2))
      .then(() => toast.success('Detalhes copiados!'))
      .catch(() => toast.error('Falha ao copiar'));
  };

  const handleDeleteError = async (id: string) => {
    const { error } = await supabase
      .from('app_error_reports')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Falha ao excluir');
    } else {
      setErrors(prev => prev.filter(e => e.id !== id));
      toast.success('Erro excluído');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Tem certeza que deseja excluir todos os erros?')) return;
    
    const { error } = await supabase
      .from('app_error_reports')
      .delete()
      .eq('user_id', user?.id);
    
    if (error) {
      toast.error('Falha ao limpar histórico');
    } else {
      setErrors([]);
      toast.success('Histórico limpo');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Rota', 'Fonte', 'Mensagem'];
    const rows = filteredErrors.map(e => [
      format(new Date(e.created_at), 'dd/MM/yyyy HH:mm:ss'),
      e.route,
      e.source,
      e.message.replace(/"/g, '""'),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erros-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'ErrorBoundary':
        return 'destructive';
      case 'window.error':
        return 'default';
      case 'unhandledrejection':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Histórico de Erros</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie os erros capturados na aplicação
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchErrors}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredErrors.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={errors.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por mensagem..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Rota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as rotas</SelectItem>
                  {uniqueRoutes.map(route => (
                    <SelectItem key={route} value={route}>{route}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredErrors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum erro encontrado</p>
              <p className="text-sm text-muted-foreground">
                {errors.length > 0 ? 'Tente ajustar os filtros' : 'Isso é uma boa notícia!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredErrors.map((error) => (
              <Card key={error.id} className="overflow-hidden">
                <CardHeader 
                  className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSourceBadgeVariant(error.source)}>
                          {error.source}
                        </Badge>
                        <Badge variant="outline">{error.route}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(error.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-medium truncate">
                        {error.message}
                      </CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleCopyError(error); }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteError(error.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expandedError === error.id && (
                  <CardContent className="pt-0 pb-4 border-t">
                    <div className="space-y-3 mt-3">
                      {error.stack && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Stack Trace:</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      {error.component_stack && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Component Stack:</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                            {error.component_stack}
                          </pre>
                        </div>
                      )}
                      {error.metadata && Object.keys(error.metadata).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Metadata:</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(error.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {errors.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{errors.length}</p>
                  <p className="text-xs text-muted-foreground">Total de erros</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueRoutes.length}</p>
                  <p className="text-xs text-muted-foreground">Rotas afetadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {errors.filter(e => e.source === 'ErrorBoundary').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Erros de render</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {errors.filter(e => e.source === 'unhandledrejection').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Promises rejeitadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
