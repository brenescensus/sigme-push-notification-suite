import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import SubscribersPage from "./pages/dashboard/SubscribersPage";
import CampaignsPage from "./pages/dashboard/CampaignsPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import ApiKeysPage from "./pages/dashboard/ApiKeysPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardOverview />} />
          <Route path="/dashboard/subscribers" element={<SubscribersPage />} />
          <Route path="/dashboard/campaigns" element={<CampaignsPage />} />
          <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
          <Route path="/dashboard/api-keys" element={<ApiKeysPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
