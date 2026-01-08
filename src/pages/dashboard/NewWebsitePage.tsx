/**
 * New Website Registration Page
 * 
 * Step-by-step flow for adding a new website:
 * 1. Enter website details (name, URL, description)
 * 2. Generate VAPID keys via secure backend
 * 3. Show integration code and service worker
 * 
 * REFACTORED: Uses self-configuring service worker with query params.
 * No manual console steps required.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowRight, Check, Key, Code, Download, Copy, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWebsite } from "@/contexts/WebsiteContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Generate a unique website ID
const generateWebsiteId = () => {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate API token
const generateApiToken = (websiteId: string) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const random = Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `sigme_${websiteId}_live_${random}`;
};

type Step = 1 | 2 | 3;

interface GeneratedWebsite {
  id: string;
  name: string;
  url: string;
  description?: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  apiToken: string;
}

export default function NewWebsitePage() {
  const navigate = useNavigate();
  const { addWebsite } = useWebsite();
  
  const [step, setStep] = useState<Step>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  
  // Generated data
  const [generatedWebsite, setGeneratedWebsite] = useState<GeneratedWebsite | null>(null);

  const isStep1Valid = name.trim().length > 0 && url.trim().length > 0;

  const handleStep1Submit = async () => {
    if (!isStep1Valid) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to create a website");
      }

      // Generate VAPID keys via secure backend edge function
      console.log('[NewWebsite] Calling generate-vapid-keys edge function...');
      
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
        'generate-vapid-keys',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (vapidError) {
        console.error('[NewWebsite] VAPID generation error:', vapidError);
        throw new Error(`Failed to generate VAPID keys: ${vapidError.message}`);
      }

      if (!vapidData?.success || !vapidData?.publicKey || !vapidData?.privateKey) {
        console.error('[NewWebsite] Invalid VAPID response:', vapidData);
        throw new Error('Invalid response from VAPID key generator');
      }

      // Validate the public key format
      if (!vapidData.publicKey.startsWith('B')) {
        console.error('[NewWebsite] Invalid public key format - does not start with B');
        throw new Error('Generated VAPID public key is invalid (must start with B)');
      }

      console.log('[NewWebsite] VAPID keys generated successfully');
      console.log('[NewWebsite] Public key starts with:', vapidData.publicKey.substring(0, 10));
      
      const websiteId = generateWebsiteId();
      const apiToken = generateApiToken(websiteId);
      const cleanUrl = url.trim().replace(/\/$/, ""); // Remove trailing slash
      
      // Insert website into database
      const { error: insertError } = await supabase
        .from('websites')
        .insert({
          id: websiteId,
          name: name.trim(),
          url: cleanUrl,
          description: description.trim() || null,
          vapid_public_key: vapidData.publicKey,
          vapid_private_key: vapidData.privateKey,
          api_token: apiToken,
          user_id: session.user.id,
          status: 'pending',
          is_verified: false,
        });

      if (insertError) {
        console.error('[NewWebsite] Database insert error:', insertError);
        throw new Error(`Failed to save website: ${insertError.message}`);
      }
      
      setGeneratedWebsite({
        id: websiteId,
        name: name.trim(),
        url: cleanUrl,
        description: description.trim() || undefined,
        vapidPublicKey: vapidData.publicKey,
        vapidPrivateKey: vapidData.privateKey,
        apiToken: apiToken,
      });
      
      setStep(2);
      
    } catch (err: any) {
      console.error('[NewWebsite] Error:', err);
      setError(err.message || 'An unexpected error occurred');
      toast({
        title: "Error",
        description: err.message || 'Failed to create website',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    if (!generatedWebsite) return;
    
    toast({
      title: "Website added successfully!",
      description: "You can now integrate Sigme on your website.",
    });
    navigate(`/dashboard/websites/${generatedWebsite.id}/integration`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  // Get the Supabase URL for API endpoints
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // ============================================================================
  // REFACTORED SERVICE WORKER - Self-configuring via query params
  // ============================================================================
  const serviceWorkerCode = generatedWebsite ? `/**
 * Sigme Push Notification Service Worker
 * Website: ${generatedWebsite.name}
 * Generated: ${new Date().toISOString()}
 * 
 * SINGLE SOURCE OF TRUTH for all push logic.
 * Config received via query params on registration.
 */

// Configuration (injected via query params)
const SIGME_CONFIG = {
  websiteId: '',
  vapidPublicKey: '',
  apiEndpoint: '',
  anonKey: '',
  debug: true
};

// Parse config from SW URL query params
const swUrl = new URL(self.location.href);
SIGME_CONFIG.websiteId = swUrl.searchParams.get('websiteId') || '';
SIGME_CONFIG.vapidPublicKey = swUrl.searchParams.get('vapid') || '';
SIGME_CONFIG.apiEndpoint = swUrl.searchParams.get('api') || '';
SIGME_CONFIG.anonKey = swUrl.searchParams.get('key') || '';

function log(...args) {
  if (SIGME_CONFIG.debug) console.log('[Sigme SW]', ...args);
}

function logError(...args) {
  console.error('[Sigme SW Error]', ...args);
}

log('Service Worker loaded with config:', {
  websiteId: SIGME_CONFIG.websiteId,
  vapidKeyPrefix: SIGME_CONFIG.vapidPublicKey.substring(0, 20) + '...',
  apiEndpoint: SIGME_CONFIG.apiEndpoint
});

// VAPID key utilities
function urlBase64ToUint8Array(base64String) {
  try {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    logError('Failed to decode VAPID key:', e);
    return null;
  }
}

function uint8ArrayToUrlBase64(uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
}

// Subscription management with conflict resolution
async function ensureSubscription() {
  if (!SIGME_CONFIG.websiteId || !SIGME_CONFIG.vapidPublicKey) {
    logError('Missing websiteId or vapidPublicKey');
    return null;
  }

  if (!SIGME_CONFIG.vapidPublicKey.startsWith('B')) {
    logError('Invalid VAPID public key - must start with B');
    return null;
  }

  const applicationServerKey = urlBase64ToUint8Array(SIGME_CONFIG.vapidPublicKey);
  if (!applicationServerKey || applicationServerKey.length !== 65) {
    logError('Invalid VAPID key length:', applicationServerKey?.length);
    return null;
  }

  try {
    let existingSub = await self.registration.pushManager.getSubscription();
    
    if (existingSub) {
      const existingKey = existingSub.options?.applicationServerKey;
      if (existingKey) {
        const existingKeyBase64 = uint8ArrayToUrlBase64(new Uint8Array(existingKey));
        if (existingKeyBase64 === SIGME_CONFIG.vapidPublicKey) {
          log('Existing subscription matches, reusing');
          return existingSub;
        }
        log('VAPID key mismatch, unsubscribing...');
      }
      
      try {
        await existingSub.unsubscribe();
        log('Unsubscribed old subscription');
      } catch (e) {
        logError('Unsubscribe failed:', e);
      }
    }
    
    log('Creating new subscription...');
    const newSub = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
    
    log('Subscription created:', newSub.endpoint);
    return newSub;
    
  } catch (err) {
    if (err.name === 'InvalidStateError') {
      logError('InvalidStateError, aggressive cleanup...');
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        return await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
      } catch (e) {
        logError('Retry failed:', e);
      }
    }
    logError('Subscription error:', err);
    return null;
  }
}

// Backend registration
async function registerWithBackend(subscription) {
  if (!subscription || !SIGME_CONFIG.apiEndpoint) return false;

  const subJson = subscription.toJSON();
  if (!subJson.keys?.p256dh || !subJson.keys?.auth) {
    logError('Missing subscription keys');
    return false;
  }

  const ua = self.navigator?.userAgent || '';
  let browser = 'Unknown', browserVersion = '', deviceType = 'desktop', os = 'Unknown';
  
  if (ua.includes('Firefox')) { browser = 'Firefox'; browserVersion = (ua.match(/Firefox\\/(\\d+)/) || [])[1] || ''; }
  else if (ua.includes('Edg')) { browser = 'Edge'; browserVersion = (ua.match(/Edg\\/(\\d+)/) || [])[1] || ''; }
  else if (ua.includes('Chrome')) { browser = 'Chrome'; browserVersion = (ua.match(/Chrome\\/(\\d+)/) || [])[1] || ''; }
  else if (ua.includes('Safari') && !ua.includes('Chrome')) { browser = 'Safari'; }
  
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  
  if (/Mobi|Android|iPhone/.test(ua)) deviceType = 'mobile';
  else if (/Tablet|iPad/.test(ua)) deviceType = 'tablet';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (SIGME_CONFIG.anonKey) {
      headers['apikey'] = SIGME_CONFIG.anonKey;
      headers['Authorization'] = 'Bearer ' + SIGME_CONFIG.anonKey;
    }

    const response = await fetch(SIGME_CONFIG.apiEndpoint + '/register-subscriber', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        subscription: { endpoint: subJson.endpoint, keys: subJson.keys },
        userAgent: ua,
        browser, browserVersion, deviceType, os,
        platform: 'web',
        language: self.navigator?.language || 'en',
        timezone: 'UTC'
      })
    });

    if (response.ok) {
      const result = await response.json();
      log('Registered:', result.subscriberId);
      return true;
    }
    logError('Registration failed:', response.status);
    return false;
  } catch (err) {
    logError('Registration error:', err);
    return false;
  }
}

// Tracking helper
async function trackEvent(eventType, notificationId, action) {
  if (!SIGME_CONFIG.apiEndpoint || !notificationId) return;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (SIGME_CONFIG.anonKey) {
      headers['apikey'] = SIGME_CONFIG.anonKey;
      headers['Authorization'] = 'Bearer ' + SIGME_CONFIG.anonKey;
    }
    await fetch(SIGME_CONFIG.apiEndpoint + '/track-notification', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        notificationId,
        event: eventType,
        action: action || 'default'
      })
    });
  } catch (e) { /* ignore */ }
}

// Install
self.addEventListener('install', () => {
  log('Installing...');
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  log('Activating...');
  event.waitUntil(
    self.clients.claim().then(async () => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const sub = await ensureSubscription();
        if (sub) await registerWithBackend(sub);
      }
    })
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SIGME_SUBSCRIBE') {
    event.waitUntil(
      ensureSubscription().then(async (sub) => {
        if (sub) {
          await registerWithBackend(sub);
          event.source?.postMessage({ type: 'SIGME_SUBSCRIBED', success: true });
        } else {
          event.source?.postMessage({ type: 'SIGME_SUBSCRIBED', success: false });
        }
      })
    );
  }
});

// Push
self.addEventListener('push', (event) => {
  log('Push received');
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data = { title: 'Notification', body: event.data.text() }; }
  }
  
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    image: data.image,
    badge: data.badge || '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/', notificationId: data.notificationId, websiteId: SIGME_CONFIG.websiteId },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'sigme-' + Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
      .then(() => trackEvent('delivered', data.notificationId))
  );
});

// Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil(
    trackEvent('clicked', data.notificationId, event.action).then(() => {
      const urlToOpen = data.url || '/';
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            if (client.url.includes(urlToOpen) && 'focus' in client) return client.focus();
          }
          if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
        });
    })
  );
});

// Close
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  event.waitUntil(trackEvent('dismissed', data.notificationId));
});

log('Service Worker ready');
` : "";

  // Minimal integration script
  const integrationScript = generatedWebsite ? `<!-- Sigme Push Notifications -->
<script>
(function() {
  var config = {
    websiteId: '${generatedWebsite.id}',
    vapid: '${generatedWebsite.vapidPublicKey}',
    api: '${supabaseUrl}/functions/v1',
    key: '${supabaseAnonKey}'
  };

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Sigme] Push not supported');
    return;
  }

  var swUrl = '/sigme-sw.js?' +
    'websiteId=' + encodeURIComponent(config.websiteId) +
    '&vapid=' + encodeURIComponent(config.vapid) +
    '&api=' + encodeURIComponent(config.api) +
    '&key=' + encodeURIComponent(config.key);

  navigator.serviceWorker.register(swUrl, { scope: '/' })
    .then(function() { return navigator.serviceWorker.ready; })
    .then(function(reg) {
      console.log('[Sigme] SW ready');
      if (Notification.permission === 'granted') {
        reg.active?.postMessage({ type: 'SIGME_SUBSCRIBE' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(function(p) {
          if (p === 'granted') reg.active?.postMessage({ type: 'SIGME_SUBSCRIBE' });
        });
      }
    })
    .catch(function(e) { console.error('[Sigme] Error:', e); });

  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data?.type === 'SIGME_SUBSCRIBED') {
      console.log('[Sigme] ' + (e.data.success ? '✓ Subscribed!' : 'Subscription failed'));
    }
  });
})();
</script>` : "";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              <span className={cn(
                "hidden sm:block text-sm font-medium",
                step >= s ? "text-foreground" : "text-muted-foreground"
              )}>
                {s === 1 ? "Website Details" : s === 2 ? "Keys Generated" : "Integration"}
              </span>
              {s < 3 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Website Details */}
        {step === 1 && (
          <div className="p-8 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Add New Website</h2>
                <p className="text-sm text-muted-foreground">Enter your website details</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Website Name *</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Website"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  A friendly name to identify this website in your dashboard
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Website URL *</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The full URL of your website including https://
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your website..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleStep1Submit}
                disabled={!isStep1Valid || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>Generating Keys...</>
                ) : (
                  <>
                    Generate VAPID Keys
                    <Key className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Keys Generated */}
        {step === 2 && generatedWebsite && (
          <div className="p-8 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-success" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Keys Generated!</h2>
                <p className="text-sm text-muted-foreground">Your VAPID keys are ready</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="text-xs text-muted-foreground">Website ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono flex-1 break-all">{generatedWebsite.id}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(generatedWebsite.id, "Website ID")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="text-xs text-muted-foreground">Public VAPID Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono flex-1 break-all">{generatedWebsite.vapidPublicKey}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(generatedWebsite.vapidPublicKey, "Public Key")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={() => setStep(3)} className="w-full">
              Continue to Integration
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 3: Integration */}
        {step === 3 && generatedWebsite && (
          <div className="space-y-6">
            {/* Service Worker */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Service Worker</h3>
                    <p className="text-sm text-muted-foreground">Save as sigme-sw.js in root folder</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([serviceWorkerCode], { type: "application/javascript" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "sigme-sw.js";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(serviceWorkerCode, "Service Worker")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
              <pre className="p-4 rounded-lg bg-muted/50 overflow-x-auto text-xs max-h-[200px] overflow-y-auto">
                <code>{serviceWorkerCode}</code>
              </pre>
            </div>

            {/* Integration Script */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Integration Script</h3>
                    <p className="text-sm text-muted-foreground">Add before &lt;/body&gt; on every page</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(integrationScript, "Integration Script")}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <pre className="p-4 rounded-lg bg-muted/50 overflow-x-auto text-xs max-h-[200px] overflow-y-auto">
                <code>{integrationScript}</code>
              </pre>
            </div>

            <Button onClick={handleComplete} className="w-full">
              Complete Setup
              <Check className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
