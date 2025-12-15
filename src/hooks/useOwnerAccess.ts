/**
 * useOwnerAccess Hook (Production Version)
 * 
 * Checks user roles from the database to determine owner status.
 * Owner users have unlimited access to all features.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsageLimits {
  maxWebsites: number;
  maxSubscribersPerWebsite: number;
  maxNotificationsPerMonth: number;
  currentNotificationsThisMonth: number;
  plan: string;
}

interface OwnerAccessResult {
  isOwner: boolean;
  isLoading: boolean;
  limits: UsageLimits;
  userId: string | null;
}

const DEFAULT_LIMITS: UsageLimits = {
  maxWebsites: 1,
  maxSubscribersPerWebsite: 1000,
  maxNotificationsPerMonth: 10000,
  currentNotificationsThisMonth: 0,
  plan: "free",
};

const OWNER_LIMITS: UsageLimits = {
  maxWebsites: Infinity,
  maxSubscribersPerWebsite: Infinity,
  maxNotificationsPerMonth: Infinity,
  currentNotificationsThisMonth: 0,
  plan: "owner",
};

export function useOwnerAccess(): OwnerAccessResult {
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [limits, setLimits] = useState<UsageLimits>(DEFAULT_LIMITS);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkOwnerStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (isMounted) {
            setIsOwner(false);
            setLimits(DEFAULT_LIMITS);
            setUserId(null);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setUserId(session.user.id);
        }

        // Check if user has owner role
        const { data: hasOwnerRole, error: roleError } = await supabase.rpc(
          'is_owner',
          { _user_id: session.user.id }
        );

        if (roleError) {
          console.error("Error checking owner status:", roleError);
        }

        if (hasOwnerRole) {
          if (isMounted) {
            setIsOwner(true);
            setLimits(OWNER_LIMITS);
            setIsLoading(false);
          }
          return;
        }

        // Get user's usage limits
        const { data: usageLimits, error: limitsError } = await supabase
          .from("usage_limits")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (limitsError) {
          console.error("Error fetching usage limits:", limitsError);
        }

        if (isMounted) {
          if (usageLimits) {
            setLimits({
              maxWebsites: usageLimits.max_websites,
              maxSubscribersPerWebsite: usageLimits.max_subscribers_per_website,
              maxNotificationsPerMonth: usageLimits.max_notifications_per_month,
              currentNotificationsThisMonth: usageLimits.current_notifications_this_month,
              plan: usageLimits.plan,
            });
          } else {
            setLimits(DEFAULT_LIMITS);
          }
          setIsOwner(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error in useOwnerAccess:", error);
        if (isMounted) {
          setIsOwner(false);
          setLimits(DEFAULT_LIMITS);
          setIsLoading(false);
        }
      }
    }

    checkOwnerStatus();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkOwnerStatus();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isOwner, isLoading, limits, userId };
}
