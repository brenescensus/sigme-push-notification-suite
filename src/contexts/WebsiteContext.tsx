// src/contexts/WebsiteContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export interface Website {
  id: string;
  user_id: string;
  name: string;
  url: string;
  domain: string | null;
  description: string | null;
  vapid_public_key: string | null;
  vapid_private_key: string | null;
  notifications_sent: number | null;
  active_subscribers: number | null;
  status: "active" | "paused" | "deleted";
  created_at: string | null;
  updated_at: string | null;
}

interface WebsiteContextType {
  websites: Website[];
  currentWebsite: Website | null;
  isLoading: boolean;
  setCurrentWebsite: (website: Website | null) => void;
  addWebsite: (data: { name: string; url: string; description?: string }) => Promise<Website | null>;
  updateWebsite: (id: string, updates: Partial<Website>) => Promise<boolean>;
  deleteWebsite: (id: string) => Promise<boolean>;
  refreshWebsites: () => Promise<void>;
}

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch websites from backend (uses cookies for auth)
  const refreshWebsites = async () => {
    try {
      setIsLoading(true);
      console.log('[WebsiteContext] Fetching websites...');
      
      const data = await api.websites.list();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch websites');
      }

      const websiteList = data.websites || [];
      console.log('[WebsiteContext] Loaded websites:', websiteList.length);
      setWebsites(websiteList);

      // Set current website if not set or if current is deleted
      if (websiteList.length > 0) {
        if (!currentWebsite || !websiteList.find((w: Website) => w.id === currentWebsite.id)) {
          // Try to restore from localStorage
          const savedWebsiteId = localStorage.getItem("sigme_current_website");
          const savedWebsite = savedWebsiteId 
            ? websiteList.find((w: Website) => w.id === savedWebsiteId) 
            : null;
          setCurrentWebsite(savedWebsite || websiteList[0]);
        }
      } else {
        setCurrentWebsite(null);
      }
      
      setIsLoading(false);
    } catch (error: any) {
      console.error('[WebsiteContext] Error fetching websites:', error);
      
      setWebsites([]);
      setCurrentWebsite(null);
      setIsLoading(false);
      
      // Re-throw error so ProtectedRoute can catch it and redirect to login
      throw error;
    }
  };

  // Add new website
  const addWebsite = async (data: { 
    name: string; 
    url: string;
    description?: string;
  }): Promise<Website | null> => {
    try {
      console.log('[WebsiteContext] Creating website:', data);
      const result = await api.websites.create(data);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create website');
      }

      const newWebsite = result.website;
      console.log('[WebsiteContext] Website created:', newWebsite.id);
      
      setWebsites(prev => [newWebsite, ...prev]);
      setCurrentWebsite(newWebsite);

      toast({
        title: "Success",
        description: "Website added successfully",
      });
      
      return newWebsite;
    } catch (error: any) {
      console.error('[WebsiteContext] Error adding website:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add website",
        variant: "destructive",
      });
      return null;
    }
  };

  // Update website
  const updateWebsite = async (id: string, updates: Partial<Website>): Promise<boolean> => {
    try {
      const result = await api.websites.update(id, updates);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update website');
      }

      // Update local state
      setWebsites(prev =>
        prev.map(w => (w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w))
      );
      
      if (currentWebsite?.id === id) {
        setCurrentWebsite(prev => prev ? { ...prev, ...updates } : null);
      }

      toast({
        title: "Success",
        description: "Website updated successfully",
      });

      return true;
    } catch (error: any) {
      console.error('[WebsiteContext] Error updating website:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update website",
        variant: "destructive",
      });
      return false;
    }
  };

  // Delete website (soft delete by setting status to 'deleted')
  const deleteWebsite = async (id: string): Promise<boolean> => {
    try {
      const result = await api.websites.delete(id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete website');
      }

      const newWebsites = websites.filter(w => w.id !== id);
      setWebsites(newWebsites);
      
      if (currentWebsite?.id === id) {
        setCurrentWebsite(newWebsites[0] || null);
      }

      toast({
        title: "Success",
        description: "Website deleted successfully",
      });

      return true;
    } catch (error: any) {
      console.error('[WebsiteContext] Error deleting website:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete website",
        variant: "destructive",
      });
      return false;
    }
  };

  // Save current website to localStorage
  useEffect(() => {
    if (currentWebsite) {
      localStorage.setItem("sigme_current_website", currentWebsite.id);
    }
  }, [currentWebsite]);

  // Don't fetch on mount - let ProtectedRoute call refreshWebsites
  useEffect(() => {
    console.log('[WebsiteContext] Initialized (waiting for explicit refresh)');
  }, []);

  return (
    <WebsiteContext.Provider
      value={{
        websites,
        currentWebsite,
        isLoading,
        setCurrentWebsite,
        addWebsite,
        updateWebsite,
        deleteWebsite,
        refreshWebsites,
      }}
    >
      {children}
    </WebsiteContext.Provider>
  );
}

export function useWebsite() {
  const context = useContext(WebsiteContext);
  if (context === undefined) {
    throw new Error("useWebsite must be used within a WebsiteProvider");
  }
  return context;
}