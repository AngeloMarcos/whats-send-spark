import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Campaigns from "./pages/Campaigns";
import Lists from "./pages/Lists";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import LeadCapture from "./pages/LeadCapture";

const queryClient = new QueryClient();

// Global error handler for unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    try {
      localStorage.setItem('last_runtime_error', JSON.stringify({
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack || '',
        timestamp: new Date().toISOString(),
      }));
    } catch {}
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    try {
      localStorage.setItem('last_runtime_error', JSON.stringify({
        message: event.reason?.message || String(event.reason) || 'Promise rejection',
        stack: event.reason?.stack || '',
        timestamp: new Date().toISOString(),
      }));
    } catch {}
  });
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Campaigns />} />
            <Route path="/lists" element={<Lists />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/capturar-leads" element={<LeadCapture />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;