// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WebsiteProvider } from "./contexts/WebsiteContext";
import { useEffect } from "react";

// Public pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Protected pages
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import SubscribersPage from "./pages/dashboard/SubscribersPage";
import CampaignsPage from "./pages/dashboard/CampaignsPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import ApiKeysPage from "./pages/dashboard/ApiKeysPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import WebsitesPage from "./pages/dashboard/WebsitesPage";
import NewWebsitePage from "./pages/dashboard/NewWebsitePage";
import WebsiteIntegrationPage from "./pages/dashboard/WebsiteIntegrationPage";

// Protected Route Component
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
    //  Service Worker Registration
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WebsiteProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/*  PUBLIC ROUTES  */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/auth" element={<AuthPage />} /> {/* Legacy route */}

              {/*  PROTECTED ROUTES */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardOverview />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/websites" 
                element={
                  <ProtectedRoute>
                    <WebsitesPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/websites/new" 
                element={
                  <ProtectedRoute>
                    <NewWebsitePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/websites/:websiteId/integration" 
                element={
                  <ProtectedRoute>
                    <WebsiteIntegrationPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/subscribers" 
                element={
                  <ProtectedRoute>
                    <SubscribersPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/campaigns" 
                element={
                  <ProtectedRoute>
                    <CampaignsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/analytics" 
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/api-keys" 
                element={
                  <ProtectedRoute>
                    <ApiKeysPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/settings" 
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />

              {/*  404  */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WebsiteProvider>
    </QueryClientProvider>
  );
};

export default App;