import { ReactNode, memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileHeader } from './MobileHeader';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

// Memoized loading component for performance
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
});

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <MobileHeader />
            <div className="flex-1 overflow-auto p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
}