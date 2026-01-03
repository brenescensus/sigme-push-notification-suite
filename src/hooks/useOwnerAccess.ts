/**
 * useOwnerAccess Hook (Production Version)
 * 
 * Checks user roles from the database to determine owner status.
 * Owner users have unlimited access to all features.
 * 
 * BILLING TIERS:
 * - Free: 0 recurring notifications
 * - Starter ($10/mo): 10 recurring notifications
 * - Growth ($20/mo): 30 recurring notifications
 * - Custom: Contact Admin
 * - Owner: Unlimited (bypasses all limits)
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UsageLimits {
  maxWebsites: number;
  maxSubscribersPerWebsite: number;
  maxNotificationsPerMonth: number;
  currentNotificationsThisMonth: number;
  maxRecurringNotifications: number;
  currentRecurringNotifications: number;
  plan: string;
  planPriceCents: number;
}

interface OwnerAccessResult {
  isOwner: boolean;
  isLoading: boolean;
  limits: UsageLimits;
  userId: string | null;
  canCreateRecurringNotification: boolean;
  recurringNotificationsRemaining: number;
  refetchLimits: () => Promise<void>;
}

// Plan-based recurring notification limits
const PLAN_RECURRING_LIMITS: Record<string, number> = {
  free: 0,
  starter: 10,
  growth: 30,
  custom: 999999,
  owner: Infinity,
};

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 1000, // $10.00
  growth: 2000, // $20.00
  custom: 0, // Contact Admin
  owner: 0,
};

const DEFAULT_LIMITS: UsageLimits = {
  maxWebsites: 1,
  maxSubscribersPerWebsite: 1000,
  maxNotificationsPerMonth: 10000,
  currentNotificationsThisMonth: 0,
  maxRecurringNotifications: 0,
  currentRecurringNotifications: 0,
  plan: "free",
  planPriceCents: 0,
};

const OWNER_LIMITS: UsageLimits = {
  maxWebsites: Infinity,
  maxSubscribersPerWebsite: Infinity,
  maxNotificationsPerMonth: Infinity,
  currentNotificationsThisMonth: 0,
  maxRecurringNotifications: Infinity,
  currentRecurringNotifications: 0,
  plan: "owner",
  planPriceCents: 0,
};

export function useOwnerAccess(): OwnerAccessResult {
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [limits, setLimits] = useState<UsageLimits>(DEFAULT_LIMITS);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentRecurringCount, setCurrentRecurringCount] = useState(0);

  const fetchLimits = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setIsOwner(false);
        setLimits(DEFAULT_LIMITS);
        setUserId(null);
        setIsLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Check if user has owner role
      const { data: hasOwnerRole, error: roleError } = await supabase.rpc(
        'is_owner',
        { _user_id: session.user.id }
      );

      if (roleError) {
        console.error("Error checking owner status:", roleError);
      }

      if (hasOwnerRole) {
        setIsOwner(true);
        setLimits(OWNER_LIMITS);
        setCurrentRecurringCount(0);
        setIsLoading(false);
        return;
      }

      // Get current recurring notification count
      const { data: recurringCount, error: countError } = await supabase.rpc(
        'get_recurring_notification_count',
        { _user_id: session.user.id }
      );

      if (countError) {
        console.error("Error getting recurring count:", countError);
      }

      setCurrentRecurringCount(recurringCount || 0);

      // Get user's usage limits
      const { data: usageLimits, error: limitsError } = await supabase
        .from("usage_limits")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (limitsError) {
        console.error("Error fetching usage limits:", limitsError);
      }

      if (usageLimits) {
        const plan = usageLimits.plan;
        const maxRecurring = PLAN_RECURRING_LIMITS[plan] ?? 0;
        
        setLimits({
          maxWebsites: usageLimits.max_websites,
          maxSubscribersPerWebsite: usageLimits.max_subscribers_per_website,
          maxNotificationsPerMonth: usageLimits.max_notifications_per_month,
          currentNotificationsThisMonth: usageLimits.current_notifications_this_month,
          maxRecurringNotifications: maxRecurring,
          currentRecurringNotifications: recurringCount || 0,
          plan: plan,
          planPriceCents: PLAN_PRICES[plan] ?? 0,
        });
      } else {
        setLimits({
          ...DEFAULT_LIMITS,
          currentRecurringNotifications: recurringCount || 0,
        });
      }
      
      setIsOwner(false);
      setIsLoading(false);
    } catch (error) {
      console.error("Error in useOwnerAccess:", error);
      setIsOwner(false);
      setLimits(DEFAULT_LIMITS);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchLimits();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Calculate derived values
  const canCreateRecurringNotification = isOwner || 
    currentRecurringCount < limits.maxRecurringNotifications;
  
  const recurringNotificationsRemaining = isOwner 
    ? Infinity 
    : Math.max(0, limits.maxRecurringNotifications - currentRecurringCount);

  return { 
    isOwner, 
    isLoading, 
    limits, 
    userId,
    canCreateRecurringNotification,
    recurringNotificationsRemaining,
    refetchLimits: fetchLimits,
  };
}
