/**
 * New Website Registration Page
 * 
 * Step-by-step flow for adding a new website:
 * 1. Enter website details (name, URL, description)
 * 2. Auto-generate VAPID keys, API token
 * 3. Show integration code and service worker
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowRight, Check, Key, Code, Download, Copy, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWebsite } from "@/contexts/WebsiteContext";
import { Website } from "@/types/website";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Simple key generators (in production, use crypto libraries on backend)
const generateVapidKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  return Array.from({ length: 87 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const generateApiToken = (websiteId: string) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const random = Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `sigme_${websiteId}_live_${random}`;
};

const generateWebsiteId = () => {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
};

type Step = 1 | 2 | 3;

export default function NewWebsitePage() {
  const navigate = useNavigate();
  const { addWebsite } = useWebsite();
  
  const [step, setStep] = useState<Step>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form data
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  
  // Generated data
  const [generatedWebsite, setGeneratedWebsite] = useState<Website | null>(null);

  const isStep1Valid = name.trim().length > 0 && url.trim().length > 0;

  const handleStep1Submit = async () => {
    if (!isStep1Valid) return;
    
    setIsGenerating(true);
    
    // Simulate API call for key generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const websiteId = generateWebsiteId();
    const newWebsite: Website = {
      id: websiteId,
      name: name.trim(),
      url: url.trim().replace(/\/$/, ""), // Remove trailing slash
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subscriberCount: 0,
      notificationsSent: 0,
      vapidPublicKey: generateVapidKey(),
      vapidPrivateKey: generateVapidKey().substring(0, 43),
      apiToken: generateApiToken(websiteId),
      status: "pending",
      isVerified: false,
      ownerId: "user_1",
    };
    
    setGeneratedWebsite(newWebsite);
    setIsGenerating(false);
    setStep(2);
  };

  const handleComplete = () => {
    if (!generatedWebsite) return;
    
    addWebsite(generatedWebsite);
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

  // Service Worker template
  const serviceWorkerCode = generatedWebsite ? `// Sigme Push Notification Service Worker
// Website: ${generatedWebsite.name}
// Generated: ${new Date().toISOString()}

const SIGME_CONFIG = {
  websiteId: '${generatedWebsite.id}',
  vapidPublicKey: '${generatedWebsite.vapidPublicKey}',
  apiEndpoint: 'https://api.sigme.io/v1'
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
    fetch(\`\${SIGME_CONFIG.apiEndpoint}/track/delivered\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        notificationId: data.notificationId
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
    fetch(\`\${SIGME_CONFIG.apiEndpoint}/track/clicked\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        notificationId: data.notificationId,
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
    fetch(\`\${SIGME_CONFIG.apiEndpoint}/track/dismissed\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        notificationId: data.notificationId
      })
    }).catch(() => {});
  }
});
` : "";

  // Integration script template
  const integrationScript = generatedWebsite ? `<!-- Sigme Push Notifications -->
<!-- Add this before </body> on your website -->
<script>
(function() {
  const SIGME_CONFIG = {
    websiteId: '${generatedWebsite.id}',
    vapidPublicKey: '${generatedWebsite.vapidPublicKey}',
    apiEndpoint: 'https://api.sigme.io/v1',
    serviceWorkerPath: '/sigme-sw.js'
  };

  // Check browser support
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Sigme] Push notifications not supported');
    return;
  }

  // Register service worker
  navigator.serviceWorker.register(SIGME_CONFIG.serviceWorkerPath)
    .then(function(registration) {
      console.log('[Sigme] Service Worker registered');
      
      // Request permission and subscribe
      return Notification.requestPermission().then(function(permission) {
        if (permission !== 'granted') {
          console.log('[Sigme] Notification permission denied');
          return;
        }
        
        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(SIGME_CONFIG.vapidPublicKey)
        });
      });
    })
    .then(function(subscription) {
      if (!subscription) return;
      
      // Send subscription to Sigme
      return fetch(SIGME_CONFIG.apiEndpoint + '/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: SIGME_CONFIG.websiteId,
          subscription: subscription,
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
                    Generating Keys...
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
                    <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(generatedWebsite.id, "Website ID")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Public VAPID Key</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 font-mono text-xs break-all">{generatedWebsite.vapidPublicKey}</code>
                    <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(generatedWebsite.vapidPublicKey, "Public VAPID Key")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground">API Token</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 font-mono text-sm">{generatedWebsite.apiToken}</code>
                    <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(generatedWebsite.apiToken, "API Token")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
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
                <p className="text-xs text-muted-foreground">
                  Save this file as <code className="px-1 py-0.5 rounded bg-muted">sigme-sw.js</code> in your website's root directory
                </p>
                <pre className="p-4 rounded-lg bg-foreground/5 border border-border overflow-x-auto max-h-64">
                  <code className="text-xs text-muted-foreground">{serviceWorkerCode}</code>
                </pre>
              </div>

              {/* Integration Script */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>2. Integration Script</Label>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(integrationScript, "Integration Script")}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add this snippet before <code className="px-1 py-0.5 rounded bg-muted">&lt;/body&gt;</code> on every page
                </p>
                <pre className="p-4 rounded-lg bg-foreground/5 border border-border overflow-x-auto max-h-64">
                  <code className="text-xs text-muted-foreground">{integrationScript}</code>
                </pre>
              </div>

              <Button variant="hero" className="w-full mt-6" onClick={handleComplete}>
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
