import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, RotateCcw } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { reportError, serializeUnknownError } from '@/lib/errorReporting';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Ignore DOM errors caused by browser extensions (translators, Grammarly, etc.)
    const domExtensionErrors = [
      'removeChild',
      'insertBefore',
      'appendChild',
      'replaceChild',
      'Node was not found',
    ];
    
    const isDomExtensionError = domExtensionErrors.some(
      err => error?.message?.includes(err)
    );
    
    if (isDomExtensionError) {
      console.warn('[ErrorBoundary] DOM error likely from browser extension, ignoring:', error.message);
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      return;
    }
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Store error in localStorage for debugging
    try {
      localStorage.setItem('last_runtime_error', JSON.stringify({
        message: error?.message || 'Unknown error',
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        timestamp: new Date().toISOString(),
      }));
    } catch {}
    
    // Report to backend
    const { message, stack } = serializeUnknownError(error);
    reportError({
      message,
      stack,
      componentStack: errorInfo?.componentStack ?? undefined,
      source: 'ErrorBoundary',
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyError = () => {
    const errorDetails = {
      message: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || '',
      componentStack: this.state.errorInfo?.componentStack || '',
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => toast.success('Detalhes do erro copiados!'))
      .catch(() => toast.error('Falha ao copiar'));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Get last stored error from localStorage
      let storedError: { message?: string; timestamp?: string } | null = null;
      try {
        const stored = localStorage.getItem('last_runtime_error');
        if (stored) storedError = JSON.parse(stored);
      } catch {}

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Algo deu errado
              </CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado na aplicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-md p-3 text-sm font-mono overflow-auto max-h-32">
                {this.state.error?.message || 'Erro desconhecido'}
              </div>
              
              {storedError?.timestamp && (
                <p className="text-xs text-muted-foreground">
                  Ocorreu em: {new Date(storedError.timestamp).toLocaleString('pt-BR')}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleRetry} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar novamente
                </Button>
                <Button onClick={this.handleReload} variant="outline" size="sm">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Recarregar página
                </Button>
                <Button onClick={this.handleCopyError} variant="ghost" size="sm">
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
