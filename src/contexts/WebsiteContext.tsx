// src/contexts/WebsiteContext.tsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

export interface Website {
  id: string;
  name: string;
  url: string;
  domain: string;
  description?: string;
  created_at: string;
  updated_at: string;
  active_subscribers?: number;
  notifications_sent?: number;
  status: "active" | "pending" | "inactive";
  user_id: string;
}

interface WebsiteContextType {
  websites: Website[];
  currentWebsite: Website | null;
  isLoading: boolean;
  error: string | null;
  setCurrentWebsite: (website: Website | null) => void;
  addWebsite: (data: { name: string; url: string; domain: string; description?: string }) => Promise<Website | null>;
  updateWebsite: (id: string, updates: Partial<Website>) => Promise<boolean>;
  deleteWebsite: (id: string) => Promise<boolean>;
  refreshWebsites: () => Promise<void>;
}

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const refreshWebsites = async () => {
    //  Don't fetch if we're on public pages
    if (location.pathname.includes('/login') || location.pathname.includes('/auth') || location.pathname === '/') {
      // console.log(' [WebsiteContext] Skipping fetch - on public page');
      setIsLoading(false);
      return;
    }

    //  Check if token exists before making request
    const token = localStorage.getItem('access_token');
    if (!token) {
      // console.log(' [WebsiteContext] Skipping fetch - no token');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // console.log(' [WebsiteContext] Starting to fetch websites...');
      // console.log(' [WebsiteContext] Token exists:', !!token);
      // console.log(' [WebsiteContext] Current path:', location.pathname);
      
      const data = await api.websites.list();
      
      // console.log(' [WebsiteContext] Raw API response:', data);
      
      //  Handle multiple response formats
      let websiteList: Website[] = [];
      
      if (data.success === true && Array.isArray(data.websites)) {
        websiteList = data.websites;
      } else if (data.success === false) {
        throw new Error(data.error || 'Failed to fetch websites');
      } else if (Array.isArray(data)) {
        websiteList = data;
      } else {
        console.error(' [WebsiteContext] Unexpected response format:', data);
        throw new Error('Unexpected response format from server');
      }
      
      // console.log(` [WebsiteContext] Loaded ${websiteList.length} websites`);
      setWebsites(websiteList);

      // Set current website
      if (websiteList.length > 0) {
        if (!currentWebsite || !websiteList.find((w: Website) => w.id === currentWebsite.id)) {
          // console.log(' [WebsiteContext] Setting current website to:', websiteList[0].name);
          setCurrentWebsite(websiteList[0]);
        }
      } else {
        // console.log(' [WebsiteContext] No websites found');
        setCurrentWebsite(null);
      }
      
    } catch (error: any) {
      console.error(' [WebsiteContext] Error fetching websites:', error);
      console.error(' [WebsiteContext] Error message:', error.message);
      
      setWebsites([]);
      setCurrentWebsite(null);
      setError(error.message || 'Failed to load websites');
      
      //  DON'T re-throw the error - just log it
      // This prevents redirect loops
      
    } finally {
      setIsLoading(false);
    }
  };

  const addWebsite = async (data: { 
    name: string; 
    url: string; 
    domain: string;
    description?: string;
  }): Promise<Website | null> => {
    try {
      // console.log(' [WebsiteContext] Creating website:', data);
      const result = await api.websites.create(data);
      
      // console.log(' [WebsiteContext] Create result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create website');
      }

      const newWebsite = result.website;
      // console.log(' [WebsiteContext] Website created:', newWebsite.id);
      
      setWebsites(prev => [newWebsite, ...prev]);
      setCurrentWebsite(newWebsite);
      
      toast({
        title: "Success",
        description: "Website added successfully",
      });
      
      return newWebsite;
    } catch (error: any) {
      console.error(' [WebsiteContext] Error adding website:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add website",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateWebsite = async (id: string, updates: Partial<Website>): Promise<boolean> => {
    try {
      // console.log(' [WebsiteContext] Updating website:', id, updates);
      
      const apiUpdates: any = {};
      
      if (updates.name !== undefined) apiUpdates.name = updates.name;
      if (updates.url !== undefined) apiUpdates.url = updates.url;
      if (updates.description !== undefined) apiUpdates.description = updates.description;
      if (updates.status !== undefined) apiUpdates.status = updates.status;
      if (updates.domain !== undefined) apiUpdates.domain = updates.domain;
      
      const result = await api.websites.update(id, apiUpdates);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update website');
      }

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
      console.error(' [WebsiteContext] Error updating website:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update website",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteWebsite = async (id: string): Promise<boolean> => {
    try {
      // console.log(' [WebsiteContext] Deleting website:', id);
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
      console.error(' [WebsiteContext] Error deleting website:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete website",
        variant: "destructive",
      });
      return false;
    }
  };

  //  Load websites when we navigate to dashboard
  useEffect(() => {
    if (location.pathname.startsWith('/dashboard')) {
      // console.log( '[WebsiteContext] Dashboard detected, loading websites...');
      
      // Small delay to ensure token is saved
      const timer = setTimeout(() => {
        refreshWebsites();
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      // console.log(' [WebsiteContext] Not on dashboard, skipping load');
      setIsLoading(false);
    }
  }, [location.pathname]);

  return (
    <WebsiteContext.Provider
      value={{
        websites,
        currentWebsite,
        isLoading,
        error,
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