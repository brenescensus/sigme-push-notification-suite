// FILE: src/pages/dashboard/WebsiteIntegrationPage.tsx
import { useParams, Link } from "react-router-dom";
import { Code, Download, Copy, Globe, Key, CheckCircle, AlertCircle, ExternalLink, ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useWebsite } from "@/contexts/WebsiteContext";
import { toast } from "@/hooks/use-toast";
import {  Tabs,TabsContent,TabsList,TabsTrigger,} from "@/components/ui/tabs";

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

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

  // Service Worker Code
  const serviceWorkerCode = `// Sigme Push Notification Service Worker
// Website: ${website.name}
// Generated: ${new Date().toISOString()}

const SIGME_CONFIG = {
  websiteId: '${website.id}',
  apiUrl: '${API_URL}',
  vapidPublicKey: '${VAPID_PUBLIC_KEY}'
};

console.log('[Sigme SW] Initializing for website:', SIGME_CONFIG.websiteId);

// Install event
self.addEventListener('install', (event) => {
  console.log('[Sigme SW] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Sigme SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Handle subscription message from page
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'SIGME_SUBSCRIBE') {
    console.log('[Sigme SW] Received subscribe request');
    
    try {
      // Get or create subscription
      let subscription = await self.registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('[Sigme SW] Creating new subscription...');
        subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(SIGME_CONFIG.vapidPublicKey)
        });
      }

      console.log('[Sigme SW] Subscription obtained');

      // Register with backend
      const response = await fetch(\`\${SIGME_CONFIG.apiUrl}/api/subscribers/register\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: SIGME_CONFIG.websiteId,
          subscription: subscription.toJSON(),
          platform: 'web',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other',
          os: navigator.userAgent.includes('Windows') ? 'Windows' :
              navigator.userAgent.includes('Mac') ? 'macOS' : 'Other'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('[Sigme SW] Successfully registered with backend');
        event.source?.postMessage({ type: 'SIGME_SUBSCRIBED', success: true });
      } else {
        console.error('[Sigme SW] Backend registration failed:', result.error);
        event.source?.postMessage({ type: 'SIGME_SUBSCRIBED', success: false });
      }
    } catch (error) {
      console.error('[Sigme SW] Subscription error:', error);
      event.source?.postMessage({ type: 'SIGME_SUBSCRIBED', success: false });
    }
  }
});

// Push event - receive and display notifications
self.addEventListener('push', (event) => {
  console.log('[Sigme SW] Push notification received');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn('[Sigme SW] Failed to parse push data');
      data = { title: 'Notification', body: event.data.text() };
    }
  }

  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    image: data.image,
    data: {
      url: data.url || '/',
      notificationId: data.notificationId || Date.now()
    },
    tag: data.tag || 'sigme-' + Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Sigme SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

console.log('[Sigme SW] Service worker loaded and ready');
`;

  // Integration Script
  const integrationScript = `<!-- Sigme Push Notifications -->
<script>
(function() {
  console.log('[Sigme] Initializing push notifications');

  if (!('serviceWorker' in navigator)) {
    console.warn('[Sigme] Service workers not supported');
    return;
  }

  if (!('PushManager' in window)) {
    console.warn('[Sigme] Push notifications not supported');
    return;
  }

  // Register service worker
  navigator.serviceWorker.register('/sigme-sw.js')
    .then(function(registration) {
      console.log('[Sigme] Service worker registered');
      return navigator.serviceWorker.ready;
    })
    .then(function(registration) {
      // Request permission and subscribe
      if (Notification.permission === 'granted') {
        subscribeUser(registration);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(function(permission) {
          if (permission === 'granted') {
            subscribeUser(registration);
          }
        });
      }
    })
    .catch(function(error) {
      console.error('[Sigme] Registration failed:', error);
    });

  function subscribeUser(registration) {
    if (registration.active) {
      registration.active.postMessage({ type: 'SIGME_SUBSCRIBE' });
    }
  }

  // Listen for subscription result
  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data?.type === 'SIGME_SUBSCRIBED') {
      if (event.data.success) {
        console.log('[Sigme] Successfully subscribed to push notifications');
      } else {
        console.warn('[Sigme] Push subscription failed');
      }
    }
  });
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
              
                <a href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                {website.url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          {website.status === 'active' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-success/10 text-success">
              <CheckCircle className="w-4 h-4" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-warning/10 text-warning">
              <AlertCircle className="w-4 h-4" />
              Pending
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
              Configuration
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
                    <p className="font-medium">Test it!</p>
                    <p className="text-sm text-muted-foreground">Visit your website and allow notifications when prompted</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Service Worker */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Service Worker</h3>
                  <p className="text-sm text-muted-foreground">Handles push notifications on your website</p>
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
                      toast({ title: "Downloaded!", description: "Service worker file saved" });
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
              <div className="relative">
                <pre className="p-4 rounded-lg bg-muted/50 overflow-x-auto text-xs max-h-[300px] overflow-y-auto">
                  <code>{serviceWorkerCode}</code>
                </pre>
              </div>
            </div>

            {/* Integration Script */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Integration Script</h3>
                  <p className="text-sm text-muted-foreground">Add this to your website</p>
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
              <div className="relative">
                <pre className="p-4 rounded-lg bg-muted/50 overflow-x-auto text-xs max-h-[200px] overflow-y-auto">
                  <code>{integrationScript}</code>
                </pre>
              </div>
            </div>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="keys" className="space-y-6">
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <h3 className="text-lg font-semibold mb-4">Configuration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Website ID</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-muted text-sm break-all">
                      {website.id}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(website.id, "Website ID")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>VAPID Public Key</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-muted text-sm break-all">
                      {VAPID_PUBLIC_KEY}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(VAPID_PUBLIC_KEY, "VAPID Public Key")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Endpoint</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-muted text-sm break-all">
                      {API_URL}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(API_URL, "API Endpoint")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}