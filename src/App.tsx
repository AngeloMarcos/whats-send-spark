import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { installGlobalErrorHandlers } from "@/lib/errorReporting";
import Campaigns from "./pages/Campaigns";
import Lists from "./pages/Lists";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import LeadCapture from "./pages/LeadCapture";
import AdvancedSearch from "./pages/AdvancedSearch";
import Errors from "./pages/Errors";

const queryClient = new QueryClient();

// Install global error handlers for reporting
installGlobalErrorHandlers();

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
            <Route path="/pesquisa-avancada" element={<AdvancedSearch />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/erros" element={<Errors />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;