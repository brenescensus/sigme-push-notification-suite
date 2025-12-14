import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WebsiteProvider } from "./contexts/WebsiteContext";
import LandingPage from "./pages/LandingPage";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebsiteProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route path="/dashboard/websites" element={<WebsitesPage />} />
            <Route path="/dashboard/websites/new" element={<NewWebsitePage />} />
            <Route path="/dashboard/websites/:websiteId/integration" element={<WebsiteIntegrationPage />} />
            <Route path="/dashboard/subscribers" element={<SubscribersPage />} />
            <Route path="/dashboard/campaigns" element={<CampaignsPage />} />
            <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
            <Route path="/dashboard/api-keys" element={<ApiKeysPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WebsiteProvider>
  </QueryClientProvider>
);

export default App;
