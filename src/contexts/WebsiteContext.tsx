/**
 * Website Context (Production Version)
 * 
 * Manages website data from the database.
 * Provides CRUD operations for multi-website management.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Type matching database schema
export interface Website {
  id: string;
  name: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  subscriberCount: number;
  notificationsSent: number;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  apiToken: string;
  status: "active" | "pending" | "inactive";
  isVerified: boolean;
  userId: string;
}

interface WebsiteContextType {
  websites: Website[];
  currentWebsite: Website | null;
  isLoading: boolean;
  setCurrentWebsite: (website: Website | null) => void;
  addWebsite: (website: Omit<Website, "userId">) => Promise<Website | null>;
  updateWebsite: (id: string, updates: Partial<Website>) => Promise<boolean>;
  deleteWebsite: (id: string) => Promise<boolean>;
  refreshWebsites: () => Promise<void>;
}

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

// Convert database row to Website type
function dbToWebsite(row: any): Website {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subscriberCount: row.subscriber_count,
    notificationsSent: row.notifications_sent,
    vapidPublicKey: row.vapid_public_key,
    vapidPrivateKey: row.vapid_private_key,
    apiToken: row.api_token,
    status: row.status as "active" | "pending" | "inactive",
    isVerified: row.is_verified,
    userId: row.user_id,
  };
}

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch websites from database
  const refreshWebsites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setWebsites([]);
        setCurrentWebsite(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching websites:", error);
        toast({
          title: "Error",
          description: "Failed to load websites",
          variant: "destructive",
        });
        return;
      }

      const websiteList = (data || []).map(dbToWebsite);
      setWebsites(websiteList);

      // Set current website if not set or if current is deleted
      if (websiteList.length > 0) {
        if (!currentWebsite || !websiteList.find(w => w.id === currentWebsite.id)) {
          // Try to restore from localStorage
          const savedWebsiteId = localStorage.getItem("sigme_current_website");
          const savedWebsite = savedWebsiteId 
            ? websiteList.find(w => w.id === savedWebsiteId) 
            : null;
          setCurrentWebsite(savedWebsite || websiteList[0]);
        }
      } else {
        setCurrentWebsite(null);
      }
    } catch (error) {
      console.error("Error in refreshWebsites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new website
  const addWebsite = async (website: Omit<Website, "userId">): Promise<Website | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: "Error",
          description: "You must be logged in to add a website",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from("websites")
        .insert({
          id: website.id,
          user_id: session.user.id,
          name: website.name,
          url: website.url,
          description: website.description,
          vapid_public_key: website.vapidPublicKey,
          vapid_private_key: website.vapidPrivateKey,
          api_token: website.apiToken,
          status: website.status,
          is_verified: website.isVerified,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding website:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to add website",
          variant: "destructive",
        });
        return null;
      }

      const newWebsite = dbToWebsite(data);
      setWebsites(prev => [newWebsite, ...prev]);
      setCurrentWebsite(newWebsite);
      
      return newWebsite;
    } catch (error) {
      console.error("Error in addWebsite:", error);
      return null;
    }
  };

  // Update website
  const updateWebsite = async (id: string, updates: Partial<Website>): Promise<boolean> => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.url !== undefined) dbUpdates.url = updates.url;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.isVerified !== undefined) dbUpdates.is_verified = updates.isVerified;

      const { error } = await supabase
        .from("websites")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.error("Error updating website:", error);
        toast({
          title: "Error",
          description: "Failed to update website",
          variant: "destructive",
        });
        return false;
      }

      // Update local state
      setWebsites(prev =>
        prev.map(w => (w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w))
      );
      
      if (currentWebsite?.id === id) {
        setCurrentWebsite(prev => prev ? { ...prev, ...updates } : null);
      }

      return true;
    } catch (error) {
      console.error("Error in updateWebsite:", error);
      return false;
    }
  };

  // Delete website
  const deleteWebsite = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("websites")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting website:", error);
        toast({
          title: "Error",
          description: "Failed to delete website",
          variant: "destructive",
        });
        return false;
      }

      const newWebsites = websites.filter(w => w.id !== id);
      setWebsites(newWebsites);
      
      if (currentWebsite?.id === id) {
        setCurrentWebsite(newWebsites[0] || null);
      }

      return true;
    } catch (error) {
      console.error("Error in deleteWebsite:", error);
      return false;
    }
  };

  // Save current website to localStorage
  useEffect(() => {
    if (currentWebsite) {
      localStorage.setItem("sigme_current_website", currentWebsite.id);
    }
  }, [currentWebsite]);

  // Initial load and auth state listener
  useEffect(() => {
    refreshWebsites();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshWebsites();
    });

    return () => subscription.unsubscribe();
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
