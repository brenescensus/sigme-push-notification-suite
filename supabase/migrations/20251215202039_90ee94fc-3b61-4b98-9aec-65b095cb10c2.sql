-- Sigme Push Notification System Database Schema
-- Production-ready, secure, multi-tenant architecture

-- =====================================================
-- 1. USER ROLES (CRITICAL: Separate table for security)
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'owner')
$$;

-- =====================================================
-- 2. USER PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. WEBSITES (Multi-tenant)
-- =====================================================
CREATE TABLE public.websites (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  
  -- VAPID Keys (encrypted in production)
  vapid_public_key TEXT NOT NULL,
  vapid_private_key TEXT NOT NULL,
  api_token TEXT NOT NULL UNIQUE,
  
  -- Stats
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  notifications_sent INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_websites_user_id ON public.websites(user_id);
CREATE INDEX idx_websites_api_token ON public.websites(api_token);

-- =====================================================
-- 4. SUBSCRIBERS (Per website)
-- =====================================================
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id TEXT REFERENCES public.websites(id) ON DELETE CASCADE NOT NULL,
  
  -- Push subscription data
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  
  -- Device info
  browser TEXT,
  browser_version TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  os TEXT,
  platform TEXT CHECK (platform IN ('web', 'android', 'ios')),
  
  -- Location (from IP geolocation)
  country TEXT,
  country_code TEXT,
  city TEXT,
  timezone TEXT,
  language TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unsubscribed')),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- FCM/APNs tokens (for native apps)
  fcm_token TEXT,
  apns_token TEXT,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  custom_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(website_id, endpoint)
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscribers_website_id ON public.subscribers(website_id);
CREATE INDEX idx_subscribers_status ON public.subscribers(status);
CREATE INDEX idx_subscribers_platform ON public.subscribers(platform);

-- =====================================================
-- 5. CAMPAIGNS
-- =====================================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id TEXT REFERENCES public.websites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon_url TEXT,
  image_url TEXT,
  click_url TEXT,
  
  -- Action buttons (JSON array)
  actions JSONB DEFAULT '[]',
  
  -- Targeting
  segment TEXT DEFAULT 'all',
  target_browsers TEXT[] DEFAULT '{}',
  target_devices TEXT[] DEFAULT '{}',
  target_countries TEXT[] DEFAULT '{}',
  
  -- Scheduling
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'paused', 'recurring')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  
  -- Recurrence
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  recurrence_config JSONB,
  next_send_at TIMESTAMP WITH TIME ZONE,
  
  -- Stats
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_campaigns_website_id ON public.campaigns(website_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_scheduled_at ON public.campaigns(scheduled_at);

-- =====================================================
-- 6. NOTIFICATION LOGS (Audit trail)
-- =====================================================
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  subscriber_id UUID REFERENCES public.subscribers(id) ON DELETE SET NULL,
  website_id TEXT REFERENCES public.websites(id) ON DELETE CASCADE NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'clicked', 'failed', 'dismissed')),
  error_message TEXT,
  error_code TEXT,
  
  -- Timing
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  platform TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notification_logs_campaign_id ON public.notification_logs(campaign_id);
CREATE INDEX idx_notification_logs_website_id ON public.notification_logs(website_id);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at);

-- =====================================================
-- 7. USAGE LIMITS (Plan-based)
-- =====================================================
CREATE TABLE public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business', 'enterprise', 'owner')),
  
  max_websites INTEGER NOT NULL DEFAULT 1,
  max_subscribers_per_website INTEGER NOT NULL DEFAULT 1000,
  max_notifications_per_month INTEGER NOT NULL DEFAULT 10000,
  
  current_notifications_this_month INTEGER NOT NULL DEFAULT 0,
  billing_cycle_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- User roles: users can view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- Profiles: users can view/update their own
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Websites: users see their own, owners see all
CREATE POLICY "Users can view own websites" 
ON public.websites FOR SELECT 
USING (auth.uid() = user_id OR public.is_owner(auth.uid()));

CREATE POLICY "Users can create websites" 
ON public.websites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own websites" 
ON public.websites FOR UPDATE 
USING (auth.uid() = user_id OR public.is_owner(auth.uid()));

CREATE POLICY "Users can delete own websites" 
ON public.websites FOR DELETE 
USING (auth.uid() = user_id OR public.is_owner(auth.uid()));

-- Subscribers: access through website ownership
CREATE POLICY "Users can view subscribers of their websites" 
ON public.subscribers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.websites 
    WHERE websites.id = subscribers.website_id 
    AND (websites.user_id = auth.uid() OR public.is_owner(auth.uid()))
  )
);

CREATE POLICY "Users can manage subscribers of their websites" 
ON public.subscribers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.websites 
    WHERE websites.id = subscribers.website_id 
    AND (websites.user_id = auth.uid() OR public.is_owner(auth.uid()))
  )
);

-- Campaigns: access through website ownership
CREATE POLICY "Users can view campaigns of their websites" 
ON public.campaigns FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.websites 
    WHERE websites.id = campaigns.website_id 
    AND (websites.user_id = auth.uid() OR public.is_owner(auth.uid()))
  )
);

CREATE POLICY "Users can manage campaigns of their websites" 
ON public.campaigns FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.websites 
    WHERE websites.id = campaigns.website_id 
    AND (websites.user_id = auth.uid() OR public.is_owner(auth.uid()))
  )
);

-- Notification logs: access through website ownership
CREATE POLICY "Users can view logs of their websites" 
ON public.notification_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.websites 
    WHERE websites.id = notification_logs.website_id 
    AND (websites.user_id = auth.uid() OR public.is_owner(auth.uid()))
  )
);

-- Usage limits: users see their own
CREATE POLICY "Users can view own usage limits" 
ON public.usage_limits FOR SELECT 
USING (auth.uid() = user_id);

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  
  -- Create default usage limits
  INSERT INTO public.usage_limits (user_id, plan)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_websites_updated_at
  BEFORE UPDATE ON public.websites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update subscriber count on website
CREATE OR REPLACE FUNCTION public.update_website_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.websites 
    SET subscriber_count = subscriber_count + 1 
    WHERE id = NEW.website_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.websites 
    SET subscriber_count = subscriber_count - 1 
    WHERE id = OLD.website_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_subscriber_change
  AFTER INSERT OR DELETE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_website_subscriber_count();