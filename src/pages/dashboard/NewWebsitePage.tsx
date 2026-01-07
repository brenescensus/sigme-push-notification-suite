/**
 * New Website Registration Page
 * 
 * Step-by-step flow for adding a new website:
 * 1. Enter website details (name, URL, description)
 * 2. Generate VAPID keys via secure backend
 * 3. Show integration code and service worker
 * 
 * IMPORTANT: VAPID keys are now generated server-side using proper
 * P-256 elliptic curve cryptography. Client-side random strings
 * are NOT valid VAPID keys and will cause browser errors.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowRight, Check, Key, Code, Download, Copy, Sparkles, AlertCircle } from "lucide-react";
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
    
    // Website is already saved to database in handleStep1Submit
    // Just refresh the context and navigate
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

  // Service Worker template with actual Supabase URLs
  const serviceWorkerCode = generatedWebsite ? `// Sigme Push Notification Service Worker
// Website: ${generatedWebsite.name}
// Generated: ${new Date().toISOString()}

const SIGME_CONFIG = {
  websiteId: '${generatedWebsite.id}',
  vapidPublicKey: '${generatedWebsite.vapidPublicKey}',
  apiEndpoint: '${supabaseUrl}/functions/v1'
};

// Handle push events
self.addEventListener('push', function(event) {
  console.log('[Sigme SW] Push received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Notification', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    image: data.image,
    badge: data.badge || '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      notificationId: data.notificationId,
      websiteId: SIGME_CONFIG.websiteId
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );

  // Track delivery
  if (data.notificationId) {
    fetch(\`\${SIGME_CONFIG.apiEndpoint}/track-notification\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        notificationId: data.notificationId,
        event: 'delivered'
      })
    }).catch(() => {});
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Sigme SW] Notification clicked:', event);
  event.notification.close();

  const data = event.notification.data || {};
  
  // Track click
  if (data.notificationId) {
    fetch(\`\${SIGME_CONFIG.apiEndpoint}/track-notification\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        notificationId: data.notificationId,
        event: 'clicked',
        action: event.action || 'default'
      })
    }).catch(() => {});
  }

  // Open URL
  const urlToOpen = data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  const data = event.notification.data || {};
  
  // Track dismissal
  if (data.notificationId) {
    fetch(\`\${SIGME_CONFIG.apiEndpoint}/track-notification\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        notificationId: data.notificationId,
        event: 'dismissed'
      })
    }).catch(() => {});
  }
});
` : "";

  // Integration script template with actual Supabase URLs
  const integrationScript = generatedWebsite ? `<!-- Sigme Push Notifications -->
<!-- Add this before </body> on your website -->
<script>
(function() {
  const SIGME_CONFIG = {
    websiteId: '${generatedWebsite.id}',
    vapidPublicKey: '${generatedWebsite.vapidPublicKey}',
    apiEndpoint: '${supabaseUrl}/functions/v1',
    serviceWorkerPath: '/sigme-sw.js'
  };

  // Check browser support
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Sigme] Push notifications not supported');
    return;
  }

  // Register service worker
  navigator.serviceWorker.register(SIGME_CONFIG.serviceWorkerPath, { scope: '/' })
    .then(function(reg) {
      console.log('[Sigme] Service Worker registered');
      return navigator.serviceWorker.ready.then(function() {
        return reg;
      });
    })
    .then(function(registration) {
      console.log('[Sigme] Service Worker ready:', registration.scope);

      const ensurePermission = function() {
        if (Notification.permission === 'granted') return Promise.resolve('granted');
        if (Notification.permission === 'denied') return Promise.resolve('denied');
        return Notification.requestPermission();
      };

      return ensurePermission().then(function(permission) {
        if (permission !== 'granted') {
          console.log('[Sigme] Notification permission not granted:', permission);
          return null;
        }

        const applicationServerKey = urlBase64ToUint8Array(SIGME_CONFIG.vapidPublicKey);

        return registration.pushManager.getSubscription()
          .then(function(existingSub) {
            if (!existingSub) {
              console.log('[Sigme] No existing subscription found');
              return;
            }
            console.log('[Sigme] Existing subscription found, unsubscribing...');
            return existingSub.unsubscribe()
              .then(function(ok) {
                console.log('[Sigme] Existing subscription unsubscribed:', ok);
              })
              .catch(function(err) {
                console.warn('[Sigme] Failed to unsubscribe existing subscription (continuing):', err);
              });
          })
          .then(function() {
            console.log('[Sigme] Subscribing with current VAPID key...');
            return registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey
            }).catch(function(err) {
              if (err && err.name === 'InvalidStateError') {
                console.warn('[Sigme] InvalidStateError on subscribe; retrying unsubscribe+subscribe once');
                return registration.pushManager.getSubscription()
                  .then(function(sub) { return sub ? sub.unsubscribe() : null; })
                  .catch(function(e) { console.warn('[Sigme] Retry unsubscribe failed (continuing):', e); })
                  .then(function() {
                    return registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: applicationServerKey
                    });
                  });
              }
              throw err;
            });
          });
      });
    })
    .then(function(subscription) {
      if (!subscription) return;
      
      // Send subscription to Sigme backend
      return fetch(SIGME_CONFIG.apiEndpoint + '/register-subscriber', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}',
          'Authorization': 'Bearer ' + '${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}',
        },
        body: JSON.stringify({
          websiteId: SIGME_CONFIG.websiteId,
          subscription: subscription.toJSON ? subscription.toJSON() : subscription,
          userAgent: navigator.userAgent,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });
    })
    .then(function(response) {
      if (response && response.ok) {
        console.log('[Sigme] Subscriber registered successfully');
      }
    })
    .catch(function(error) {
      console.error('[Sigme] Error:', error);
    });

  // Helper function for VAPID key conversion
  // Converts base64url to Uint8Array for applicationServerKey
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
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
                  The full URL of your website (including https://)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this website..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                variant="hero"
                className="w-full"
                disabled={!isStep1Valid || isGenerating}
                onClick={handleStep1Submit}
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    Generating Secure Keys...
                  </>
                ) : (
                  <>
                    Generate Keys
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Keys Generated */}
        {step === 2 && generatedWebsite && (
          <div className="space-y-6">
            <div className="p-8 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Key className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Keys Generated!</h2>
                  <p className="text-sm text-muted-foreground">Your VAPID keys and API token are ready</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Website ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 font-mono text-sm">{generatedWebsite.id}</code>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(generatedWebsite.id, "Website ID")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Public VAPID Key (for browser subscription)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 font-mono text-xs break-all">{generatedWebsite.vapidPublicKey}</code>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(generatedWebsite.vapidPublicKey, "Public VAPID Key")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    ✓ Valid P-256 public key (starts with 'B')
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground">API Token</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 font-mono text-sm">{generatedWebsite.apiToken}</code>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(generatedWebsite.apiToken, "API Token")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    <strong>Security Note:</strong> Your private VAPID key is securely stored on our servers 
                    and is never exposed to the frontend. It's used only for signing push notifications.
                  </p>
                </div>
              </div>

              <Button variant="hero" className="w-full mt-6" onClick={() => setStep(3)}>
                Continue to Integration
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Integration Code */}
        {step === 3 && generatedWebsite && (
          <div className="space-y-6">
            <div className="p-8 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Code className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Integration Code</h2>
                  <p className="text-sm text-muted-foreground">Add these files to your website</p>
                </div>
              </div>

              {/* Service Worker */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <Label>1. Service Worker (sigme-sw.js)</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([serviceWorkerCode], { type: "application/javascript" });
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = downloadUrl;
                        a.download = "sigme-sw.js";
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(serviceWorkerCode, "Service Worker")}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Place this file in your website's root directory (e.g., /sigme-sw.js)
                </p>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted/50 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                    {serviceWorkerCode}
                  </pre>
                </div>
              </div>

              {/* Integration Script */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <Label>2. Integration Script</Label>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(integrationScript, "Integration Script")}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add this script before the closing &lt;/body&gt; tag on your website
                </p>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted/50 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                    {integrationScript}
                  </pre>
                </div>
              </div>

              <Button variant="hero" className="w-full" onClick={handleComplete}>
                <Check className="w-4 h-4 mr-2" />
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
