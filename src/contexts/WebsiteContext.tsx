/**
 * Website Context
 * 
 * Provides website switching functionality across the dashboard.
 * All dashboard pages use this context to know which website's data to display.
 * 
 * In production, this would:
 * - Fetch websites from Supabase
 * - Sync with backend when switching
 * - Handle real-time updates
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Website, mockWebsites } from "@/types/website";

interface WebsiteContextType {
  // Current selected website
  currentWebsite: Website | null;
  setCurrentWebsite: (website: Website) => void;
  
  // All websites for this account
  websites: Website[];
  setWebsites: React.Dispatch<React.SetStateAction<Website[]>>;
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  addWebsite: (website: Website) => void;
  updateWebsite: (id: string, updates: Partial<Website>) => void;
  deleteWebsite: (id: string) => void;
  refreshWebsites: () => Promise<void>;
}

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsiteState] = useState<Website | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load websites on mount
  useEffect(() => {
    const loadWebsites = async () => {
      setIsLoading(true);
      
      // In production, fetch from Supabase:
      // const { data } = await supabase.from('websites').select('*');
      
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 300));
      setWebsites(mockWebsites);
      
      // Set first website as default, or restore from localStorage
      const savedWebsiteId = localStorage.getItem("sigme_current_website");
      const savedWebsite = mockWebsites.find(w => w.id === savedWebsiteId);
      setCurrentWebsiteState(savedWebsite || mockWebsites[0] || null);
      
      setIsLoading(false);
    };

    loadWebsites();
  }, []);

  // Persist current website selection
  const setCurrentWebsite = (website: Website) => {
    setCurrentWebsiteState(website);
    localStorage.setItem("sigme_current_website", website.id);
  };

  // Add new website
  const addWebsite = (website: Website) => {
    setWebsites(prev => [...prev, website]);
    // Auto-select the new website
    setCurrentWebsite(website);
  };

  // Update website
  const updateWebsite = (id: string, updates: Partial<Website>) => {
    setWebsites(prev => 
      prev.map(w => w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w)
    );
    
    // Update current if it's the one being updated
    if (currentWebsite?.id === id) {
      setCurrentWebsiteState(prev => prev ? { ...prev, ...updates } : prev);
    }
  };

  // Delete website
  const deleteWebsite = (id: string) => {
    setWebsites(prev => prev.filter(w => w.id !== id));
    
    // Select another website if current was deleted
    if (currentWebsite?.id === id) {
      const remaining = websites.filter(w => w.id !== id);
      setCurrentWebsiteState(remaining[0] || null);
    }
  };

  // Refresh websites from server
  const refreshWebsites = async () => {
    setIsLoading(true);
    // In production: refetch from Supabase
    await new Promise(resolve => setTimeout(resolve, 300));
    setWebsites(mockWebsites);
    setIsLoading(false);
  };

  return (
    <WebsiteContext.Provider
      value={{
        currentWebsite,
        setCurrentWebsite,
        websites,
        setWebsites,
        isLoading,
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
