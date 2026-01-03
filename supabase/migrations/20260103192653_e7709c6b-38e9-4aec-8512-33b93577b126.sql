-- Add recurring notification tracking to usage_limits
ALTER TABLE public.usage_limits 
ADD COLUMN IF NOT EXISTS max_recurring_notifications integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_recurring_notifications integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_price_cents integer NOT NULL DEFAULT 0;

-- Update default plan values (free = 0 recurring, starter = 10, growth = 30)
-- These will be enforced in the app based on plan name

-- Create a function to get recurring notification count for a user
CREATE OR REPLACE FUNCTION public.get_recurring_notification_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT COUNT(*)::integer 
     FROM public.campaigns c
     JOIN public.websites w ON c.website_id = w.id
     WHERE w.user_id = _user_id 
       AND c.is_recurring = true 
       AND c.status IN ('recurring', 'active', 'scheduled')),
    0
  )
$$;

-- Create a function to check if user can create recurring notification
CREATE OR REPLACE FUNCTION public.can_create_recurring_notification(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_limit integer;
  current_count integer;
  user_is_owner boolean;
BEGIN
  -- Owners bypass all limits
  SELECT public.is_owner(_user_id) INTO user_is_owner;
  IF user_is_owner THEN
    RETURN true;
  END IF;
  
  -- Get user's recurring notification limit based on plan
  SELECT 
    CASE 
      WHEN ul.plan = 'starter' THEN 10
      WHEN ul.plan = 'growth' THEN 30
      WHEN ul.plan = 'custom' THEN COALESCE(ul.max_recurring_notifications, 999999)
      ELSE 0  -- free plan = 0
    END
  INTO user_limit
  FROM public.usage_limits ul
  WHERE ul.user_id = _user_id;
  
  -- If no usage_limits record, treat as free (0 recurring)
  IF user_limit IS NULL THEN
    user_limit := 0;
  END IF;
  
  -- Get current recurring notification count
  SELECT public.get_recurring_notification_count(_user_id) INTO current_count;
  
  RETURN current_count < user_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_recurring_notification_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_recurring_notification(uuid) TO authenticated;