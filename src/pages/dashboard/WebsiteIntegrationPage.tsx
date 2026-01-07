/**
 * Website Integration Page
 * 
 * Shows integration code, service worker, and setup instructions
 * with actual Supabase endpoints.
 */

import { useParams, Link } from "react-router-dom";
import { Code, Download, Copy, Globe, Key, CheckCircle, AlertCircle, ExternalLink, ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useWebsite } from "@/contexts/WebsiteContext";
import { toast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function WebsiteIntegrationPage() {
  const { websiteId } = useParams();
  const { websites } = useWebsite();
  
  const website = websites.find(w => w.id === websiteId);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  if (!website) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center">
          <h2 className="text-xl font-semibold">Website not found</h2>
          <p className="text-muted-foreground mt-2">This website doesn't exist or has been deleted.</p>
          <Button variant="outline" asChild className="mt-4">
            <Link to="/dashboard/websites">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Websites
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Generate service worker code with actual Supabase endpoints
  const serviceWorkerCode = `// Sigme Push Notification Service Worker
// Website: ${website.name}
// Generated: ${new Date().toISOString()}

const SIGME_CONFIG = {
  websiteId: '${website.id}',
  vapidPublicKey: '${website.vapidPublicKey}',
  apiEndpoint: '${SUPABASE_URL}/functions/v1',
  publishableKey: '${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}',
  debug: false
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
      headers: {
        'Content-Type': 'application/json',
        'apikey': SIGME_CONFIG.publishableKey,
        'Authorization': 'Bearer ' + SIGME_CONFIG.publishableKey,
      },
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
      headers: {
        'Content-Type': 'application/json',
        'apikey': SIGME_CONFIG.publishableKey,
        'Authorization': 'Bearer ' + SIGME_CONFIG.publishableKey,
      },
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
  
  if (data.notificationId) {
    fetch(\`\${SIGME_CONFIG.apiEndpoint}/track-notification\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SIGME_CONFIG.publishableKey,
        'Authorization': 'Bearer ' + SIGME_CONFIG.publishableKey,
      },
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        notificationId: data.notificationId,
        event: 'dismissed'
      })
    }).catch(() => {});
  }
});
`;

  // Integration script with actual Supabase endpoints
  // FIXED: Uses correct subscription object format expected by register-subscriber
  const integrationScript = `<!-- Sigme Push Notifications -->
<!-- Add this before </body> on your website -->
<script>
(function() {
  const SIGME_CONFIG = {
    websiteId: '${website.id}',
    vapidPublicKey: '${website.vapidPublicKey}',
    apiEndpoint: '${SUPABASE_URL}/functions/v1',
    publishableKey: '${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}',
    serviceWorkerPath: '/sigme-sw.js',
    serviceWorkerScope: '/',
    debug: false
  };

  // Check browser support
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Sigme] Push notifications not supported in this browser');
    return;
  }

  // Validate VAPID key format
  if (!SIGME_CONFIG.vapidPublicKey || !SIGME_CONFIG.vapidPublicKey.startsWith('B')) {
    console.error('[Sigme] Invalid VAPID public key - must start with B');
    return;
  }

  navigator.serviceWorker.register(SIGME_CONFIG.serviceWorkerPath, { scope: SIGME_CONFIG.serviceWorkerScope })
    .then(function() {
      console.log('[Sigme] Service Worker registered');
      // Ensure the service worker is active/ready before interacting with PushManager
      return navigator.serviceWorker.ready;
    })
    .then(function(registration) {
      console.log('[Sigme] Service Worker ready:', registration.scope);

      // Always ensure we have permission first
      const ensurePermission = function() {
        if (Notification.permission === 'granted') return Promise.resolve('granted');
        if (Notification.permission === 'denied') return Promise.resolve('denied');
        return Notification.requestPermission();
      };

      return ensurePermission()
        .then(function(permission) {
          if (permission !== 'granted') {
            console.log('[Sigme] Notification permission not granted:', permission);
            return null;
          }

          const applicationServerKey = urlBase64ToUint8Array(SIGME_CONFIG.vapidPublicKey);

          // Unsubscribe-first pattern to avoid:
          // "A subscription with a different applicationServerKey already exists"
          return registration.pushManager.getSubscription()
            .then(function(existingSub) {
              if (!existingSub) return;
              console.log('[Sigme] Existing subscription found, unsubscribing...');
              return existingSub.unsubscribe()
                .then(function(ok) {
                  console.log('[Sigme] Existing subscription unsubscribed:', ok);
                })
                .catch(function(err) {
                  // Even if unsubscribe fails, continue and try to resubscribe
                  console.warn('[Sigme] Failed to unsubscribe existing subscription (continuing):', err);
                });
            })
            .then(function() {
              console.log('[Sigme] Subscribing with current VAPID key...');
              return registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
              });
            });
        });
    })
    .then(function(subscription) {
      if (!subscription) {
        console.log('[Sigme] No subscription created');
        return;
      }
      
      console.log('[Sigme] Push subscription created:', subscription.endpoint);
      
      // Get subscription as JSON (includes endpoint and keys)
      const subJson = subscription.toJSON();
      
      // Validate subscription has required keys
      if (!subJson.keys || !subJson.keys.p256dh || !subJson.keys.auth) {
        console.error('[Sigme] Subscription missing required keys');
        return;
      }

      // Parse browser info
      const ua = navigator.userAgent;
      let browser = 'Other';
      let browserVersion = '';
      if (ua.includes('Chrome') && !ua.includes('Edg')) { 
        browser = 'Chrome'; 
        browserVersion = (ua.match(/Chrome\\/([\\d.]+)/) || [])[1] || ''; 
      }
      else if (ua.includes('Firefox')) { 
        browser = 'Firefox'; 
        browserVersion = (ua.match(/Firefox\\/([\\d.]+)/) || [])[1] || ''; 
      }
      else if (ua.includes('Safari') && !ua.includes('Chrome')) { 
        browser = 'Safari'; 
        browserVersion = (ua.match(/Version\\/([\\d.]+)/) || [])[1] || ''; 
      }
      else if (ua.includes('Edg')) { 
        browser = 'Edge'; 
        browserVersion = (ua.match(/Edg\\/([\\d.]+)/) || [])[1] || ''; 
      }

      // Detect device type
      let deviceType = 'desktop';
      if (/Mobi|Android/i.test(ua)) deviceType = 'mobile';
      else if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet';

      // Detect OS
      let os = 'Unknown';
      if (ua.includes('Win')) os = 'Windows';
      else if (ua.includes('Mac')) os = 'macOS';
      else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';

       // Register with Sigme backend
       // IMPORTANT: the Functions endpoint requires a publishable API key (apikey header)
       return fetch(SIGME_CONFIG.apiEndpoint + '/register-subscriber', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'apikey': SIGME_CONFIG.publishableKey,
           'Authorization': 'Bearer ' + SIGME_CONFIG.publishableKey,
         },
         body: JSON.stringify({
           websiteId: SIGME_CONFIG.websiteId,
           subscription: {
             endpoint: subJson.endpoint,
             keys: {
               p256dh: subJson.keys.p256dh,
               auth: subJson.keys.auth
             }
           },
           userAgent: ua,
           language: navigator.language,
           timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
         })
       });
    })
     .then(function(response) {
       if (!response) return;

       return response.text().then(function(text) {
         let parsed = null;
         try { parsed = text ? JSON.parse(text) : null; } catch (_) {}

         if (response.ok) {
           console.log('[Sigme] Subscriber registered:', parsed?.subscriberId || parsed?.subscriber_id || parsed);
           return;
         }

         console.error('[Sigme] Registration failed:', response.status, parsed || text);
       });
     })
     .catch(function(error) {
       console.error('[Sigme] Error:', error);
     });

  // Convert VAPID key to Uint8Array for PushManager
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
</script>`;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/websites">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{website.name}</h2>
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                {website.url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          {website.isVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-success/10 text-success">
              <CheckCircle className="w-4 h-4" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-warning/10 text-warning">
              <AlertCircle className="w-4 h-4" />
              Pending Verification
            </span>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="integration" className="space-y-6">
          <TabsList>
            <TabsTrigger value="integration">
              <Code className="w-4 h-4 mr-2" />
              Integration Code
            </TabsTrigger>
            <TabsTrigger value="keys">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
          </TabsList>

          {/* Integration Code Tab */}
          <TabsContent value="integration" className="space-y-6">
            {/* Setup Steps */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <h3 className="text-lg font-semibold mb-4">Setup Instructions</h3>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="font-medium">Download the Service Worker</p>
                    <p className="text-sm text-muted-foreground">Save it as <code className="px-1 py-0.5 rounded bg-muted">sigme-sw.js</code> in your website's root folder</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center shrink-0">2</span>
                  <div>
                    <p className="font-medium">Add the Integration Script</p>
                    <p className="text-sm text-muted-foreground">Paste it before <code className="px-1 py-0.5 rounded bg-muted">&lt;/body&gt;</code> on every page</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p className="font-medium">Test the Integration</p>
                    <p className="text-sm text-muted-foreground">Visit your website and check the browser console for Sigme logs</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Service Worker */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Service Worker</h3>
                  <p className="text-sm text-muted-foreground">sigme-sw.js</p>
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
              <pre className="p-4 rounded-lg bg-foreground/5 border border-border overflow-x-auto max-h-80">
                <code className="text-xs text-muted-foreground">{serviceWorkerCode}</code>
              </pre>
            </div>

            {/* Integration Script */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Integration Script</h3>
                  <p className="text-sm text-muted-foreground">Add before &lt;/body&gt;</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(integrationScript, "Integration Script")}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <pre className="p-4 rounded-lg bg-foreground/5 border border-border overflow-x-auto max-h-80">
                <code className="text-xs text-muted-foreground">{integrationScript}</code>
              </pre>
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            <div className="p-6 rounded-xl bg-card border border-border/50 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="text-xs text-muted-foreground">Website ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 font-mono text-sm">{website.id}</code>
                  <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(website.id, "Website ID")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="text-xs text-muted-foreground">Public VAPID Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 font-mono text-xs break-all">{website.vapidPublicKey}</code>
                  <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(website.vapidPublicKey, "Public VAPID Key")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="text-xs text-muted-foreground">Private VAPID Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 font-mono text-sm">{website.vapidPrivateKey.substring(0, 20)}...</code>
                  <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(website.vapidPrivateKey, "Private VAPID Key")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-destructive mt-2">Keep this key secret! Never expose it in client-side code.</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="text-xs text-muted-foreground">API Token</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 font-mono text-sm">{website.apiToken}</code>
                  <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(website.apiToken, "API Token")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-destructive mt-2">This token provides full API access. Keep it secure.</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="text-xs text-muted-foreground">API Endpoint</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 font-mono text-sm">{SUPABASE_URL}/functions/v1</code>
                  <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(`${SUPABASE_URL}/functions/v1`, "API Endpoint")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
