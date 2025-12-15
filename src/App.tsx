import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WebsiteProvider } from "./contexts/WebsiteContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import SubscribersPage from "./pages/dashboard/SubscribersPage";
import CampaignsPage from "./pages/dashboard/CampaignsPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import ApiKeysPage from "./pages/dashboard/ApiKeysPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import WebsitesPage from "./pages/dashboard/WebsitesPage";
import NewWebsitePage from "./pages/dashboard/NewWebsitePage";
import WebsiteIntegrationPage from "./pages/dashboard/WebsiteIntegrationPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebsiteProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />
            <Route path="/dashboard/websites" element={<ProtectedRoute><WebsitesPage /></ProtectedRoute>} />
            <Route path="/dashboard/websites/new" element={<ProtectedRoute><NewWebsitePage /></ProtectedRoute>} />
            <Route path="/dashboard/websites/:websiteId/integration" element={<ProtectedRoute><WebsiteIntegrationPage /></ProtectedRoute>} />
            <Route path="/dashboard/subscribers" element={<ProtectedRoute><SubscribersPage /></ProtectedRoute>} />
            <Route path="/dashboard/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
            <Route path="/dashboard/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/dashboard/api-keys" element={<ProtectedRoute><ApiKeysPage /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WebsiteProvider>
  </QueryClientProvider>
);

export default App;
