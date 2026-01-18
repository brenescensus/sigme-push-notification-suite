// src/pages/dashboard/NewWebsitePage.tsx
// Backend-only version (NO Supabase)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowRight, Check, Code, Download, Copy, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const VAPID_PUBLIC_KEY = "BPB0HWKOKaG0V6xpWcnoaZvnJZCRl1OYfyUXFS7Do7OzJpW6WPoJQyd__u3KVDBDJlINatfLcmNwdF6kS5niPWI";
// const BACKEND_URL = "https://sigme-backend-fkde.vercel.app";
const BACKEND_URL = "http://localhost:3000";



const generateWebsiteId = () =>
  `ws_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;

const generateApiToken = (websiteId: string) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const random = Array.from({ length: 24 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `sigme_${websiteId}_live_${random}`;
};

type Step = 1 | 2 | 3;

interface GeneratedWebsite {
  id: string;
  name: string;
  url: string;
  domain: string;
  description?: string;
  vapidPublicKey: string;
  apiToken: string;
}

export default function NewWebsitePage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const [generatedWebsite, setGeneratedWebsite] = useState<GeneratedWebsite | null>(null);

  const isStep1Valid = name.trim().length > 0 && url.trim().length > 0;

  const extractDomain = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname;
    } catch {
      return urlString.replace(/^https?:\/\//, '').split('/')[0];
    }
  };

  const handleStep1Submit = async () => {
    if (!isStep1Valid) return;

    setIsGenerating(true);
    setError(null);

    try {
          console.log(' Debug - Starting website creation...');
// Debug 1: Check if user is authenticated
    const token = localStorage.getItem('access_token');
    console.log(' Debug - Token exists?', !!token);
    console.log(' Debug - Token:', token ? token.substring(0, 20) + '...' : 'No token');
      const websiteId = generateWebsiteId();
      const apiToken = generateApiToken(websiteId);
      const cleanUrl = url.trim().replace(/\/$/, "");
      const domain = extractDomain(cleanUrl);

      const trimmedDescription = description.trim();
      
    const requestData = {
      name: name.trim(),
      domain:domain,
      url: cleanUrl,
      description: description.trim() || null
    };

    console.log(' Debug - Request data:', requestData);
    const result = await api.websites.create(requestData);
    console.log(' Debug - API Response:', result);

      if (!result.success) {
              console.error(' Debug - API Error:', result.error);

        throw new Error(result.error || "Failed to create website");
      }

      setGeneratedWebsite({
        id: result.website.id,
        name: result.website.name,
        url: result.website.url,
        domain: result.website.domain,
        description: result.website.description,
        vapidPublicKey: VAPID_PUBLIC_KEY,
        apiToken: apiToken,
      });

      toast({
        title: "Success",
        description: "Website created successfully",
      });

      setStep(2);
    } catch (err: any) {
          console.error(' Debug - Catch error:', err);

      console.error("Error creating website:", err);
      setError(err.message || "Failed to create website");
      toast({
        title: "Error",
        description: err.message || "Failed to create website",
        variant: "destructive"
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
    navigate("/dashboard/websites");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const serviceWorkerCode = generatedWebsite ? `/**
 * Sigme Push Notification Service Worker
 * Website: ${generatedWebsite.name}
 * Generated: ${new Date().toISOString()}
 * 
 *  Uses authorized VAPID key that matches backend
 */

const SW_VERSION = '1.0.0';
const VAPID_PUBLIC_KEY = '${VAPID_PUBLIC_KEY}';

const SIGME_CONFIG = {
  websiteId: '${generatedWebsite.id}',
  apiEndpoint: '${BACKEND_URL}',
  debug: true
};

function log(...args) {
  if (SIGME_CONFIG.debug) console.log('[Sigme SW]', ...args);
}

// VAPID key utilities
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Install
self.addEventListener('install', () => {
  log('Installing...');
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  log('Activating...');
  event.waitUntil(self.clients.claim());
});

// Subscribe to push
async function subscribeToPush() {
  try {
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
    
    log('Subscription created');
    
    // Register with backend
    const response = await fetch(\`\${SIGME_CONFIG.apiEndpoint}/api/subscribers/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        subscription: subscription.toJSON(),
        platform: 'web',
        browser: getBrowserInfo(),
        os: getOSInfo(),
      })
    });

    if (response.ok) {
      const result = await response.json();
      log('Registered with backend:', result);
      return true;
    }
    
    return false;
  } catch (err) {
    log('Subscribe error:', err);
    return false;
  }
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getOSInfo() {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
}

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SIGME_SUBSCRIBE') {
    event.waitUntil(
      subscribeToPush().then(success => {
        event.source?.postMessage({ 
          type: 'SIGME_SUBSCRIBED', 
          success 
        });
      })
    );
  }
});

// Push event
self.addEventListener('push', (event) => {
  log('Push received');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { 
        title: 'Notification', 
        body: event.data.text() 
      };
    }
  }
  
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    image: data.image,
    data: { 
      url: data.url || '/', 
      notificationId: data.notificationId 
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'sigme-' + Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

log('Service Worker ready');
` : "";

  const integrationScript = generatedWebsite ? `<!-- Sigme Push Notifications -->
<script>
(function() {
  var config = {
    websiteId: '${generatedWebsite.id}',
    vapid: '${VAPID_PUBLIC_KEY}',
    api: '${BACKEND_URL}'
  };

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Sigme] Push not supported');
    return;
  }

  navigator.serviceWorker.register('/sigme-sw.js', { scope: '/' })
    .then(function() { return navigator.serviceWorker.ready; })
    .then(function(reg) {
      console.log('[Sigme] SW ready');
      
      if (Notification.permission === 'granted') {
        reg.active?.postMessage({ type: 'SIGME_SUBSCRIBE' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(function(p) {
          if (p === 'granted') {
            reg.active?.postMessage({ type: 'SIGME_SUBSCRIBE' });
          }
        });
      }
    })
    .catch(function(e) { 
      console.error('[Sigme] Error:', e); 
    });

  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data?.type === 'SIGME_SUBSCRIBED') {
      console.log('[Sigme]', e.data.success ? '✓ Subscribed!' : 'Subscription failed');
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
                {s === 1 ? "Details" : s === 2 ? "Config" : "Integration"}
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
                <h2 className="text-xl font-semibold">Add New Website</h2>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Website URL *</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description..."
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
                {isGenerating ? "Creating..." : "Create Website"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && generatedWebsite && (
          <div className="p-8 rounded-2xl bg-card border">
            <div className="flex items-center gap-3 mb-6">
              <Check className="w-12 h-12 text-success" />
              <div>
                <h2 className="text-xl font-semibold">Website Created!</h2>
                <p className="text-sm text-muted-foreground">Ready for push notifications</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="text-xs text-muted-foreground">Website ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono flex-1">{generatedWebsite.id}</code>
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
                <Label className="text-xs text-muted-foreground">VAPID Public Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono flex-1 break-all">{VAPID_PUBLIC_KEY}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(VAPID_PUBLIC_KEY, "VAPID Key")}
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

        {/* Step 3: Integration Code */}
        {step === 3 && generatedWebsite && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-card border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Service Worker</h3>
                    <p className="text-sm text-muted-foreground">Save as sigme-sw.js</p>
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

            <div className="p-6 rounded-xl bg-card border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Integration Script</h3>
                    <p className="text-sm text-muted-foreground">Add before &lt;/body&gt;</p>
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