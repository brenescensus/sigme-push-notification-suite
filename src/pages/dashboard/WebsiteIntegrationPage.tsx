/**
 * Website Integration Page
 * 
 * Shows integration code, service worker, and setup instructions
 * with actual Supabase endpoints.
 * 
 * IMPORTANT: Uses a SINGLE authorized Firebase VAPID key pair for ALL websites.
 * This ensures cryptographic consistency across the entire push notification system.
 * 
 * AUTHORIZED VAPID KEY (from Firebase Cloud Messaging):
 * Public: BBZmIZboXmmfocyHA7FQor98z0DSyWWHoO1Se5nVBULGB_DKaymJZJ3YYW76DiqI_0mIHZNWE9Szm2SnCvQuO2I
 * Private: Stored in FIREBASE_VAPID_PRIVATE_KEY secret (backend only)
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
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * AUTHORIZED FIREBASE VAPID PUBLIC KEY
 * This is the SINGLE SOURCE OF TRUTH for all Web Push subscriptions.
 * DO NOT CHANGE unless you are rotating the Firebase VAPID keys.
 * The private key is stored in FIREBASE_VAPID_PRIVATE_KEY secret.
 */
const FIREBASE_VAPID_PUBLIC_KEY = "BBZmIZboXmmfocyHA7FQor98z0DSyWWHoO1Se5nVBULGB_DKaymJZJ3YYW76DiqI_0mIHZNWE9Szm2SnCvQuO2I";

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

  // ============================================================================
  // SERVICE WORKER - Uses authorized Firebase VAPID key (passed via query params)
  // Single source of truth for ALL push notification logic.
  // VAPID KEY CONSISTENCY: All websites use the same Firebase VAPID key.
  // ============================================================================
  const serviceWorkerCode = `/**
 * Sigme Push Notification Service Worker v2 (DEBUG BUILD)
 * Website: ${website.name}
 * Generated: ${new Date().toISOString()}
 * 
 * AUDIT-ENHANCED VERSION with comprehensive logging
 * Every notification that shows "sent successfully" WILL trigger the push event.
 * 
 * SINGLE SOURCE OF TRUTH for all push logic:
 * - Receives and displays notifications
 * - Tracks delivery, clicks, dismissals
 * - Handles notification actions and URLs
 * - Auto-subscribes and resolves VAPID conflicts
 * 
 * DEBUG FEATURES:
 * - Verbose logging for every event
 * - Payload inspection
 * - Subscription validation
 * - Endpoint health tracking
 */

// ============================================================================
// CONFIGURATION (injected via query params on registration)
// ============================================================================
const SIGME_CONFIG = {
  websiteId: '',
  vapidPublicKey: '',
  apiEndpoint: '',
  anonKey: '',
  debug: true, // ALWAYS true for audit - set to false in production
  version: '2.0.0-audit'
};

// Parse config from SW URL query params
const swUrl = new URL(self.location.href);
SIGME_CONFIG.websiteId = swUrl.searchParams.get('websiteId') || '';
SIGME_CONFIG.vapidPublicKey = swUrl.searchParams.get('vapid') || '';
SIGME_CONFIG.apiEndpoint = swUrl.searchParams.get('api') || '';
SIGME_CONFIG.anonKey = swUrl.searchParams.get('key') || '';

// ============================================================================
// VERBOSE DEBUG LOGGING
// ============================================================================
const DEBUG_PREFIX = '[Sigme SW v' + SIGME_CONFIG.version + ']';

function log(...args) {
  console.log(DEBUG_PREFIX, new Date().toISOString(), ...args);
}

function logError(...args) {
  console.error(DEBUG_PREFIX, 'ERROR', new Date().toISOString(), ...args);
}

function logWarn(...args) {
  console.warn(DEBUG_PREFIX, 'WARN', new Date().toISOString(), ...args);
}

function logDebug(...args) {
  if (SIGME_CONFIG.debug) {
    console.debug(DEBUG_PREFIX, 'DEBUG', new Date().toISOString(), ...args);
  }
}

log('========================================');
log('SERVICE WORKER INITIALIZING');
log('========================================');
log('Config:', {
  websiteId: SIGME_CONFIG.websiteId,
  vapidKeyPrefix: SIGME_CONFIG.vapidPublicKey.substring(0, 20) + '...',
  vapidKeyLength: SIGME_CONFIG.vapidPublicKey.length,
  apiEndpoint: SIGME_CONFIG.apiEndpoint,
  hasAnonKey: !!SIGME_CONFIG.anonKey
});

// ============================================================================
// VAPID KEY UTILITIES
// ============================================================================
function urlBase64ToUint8Array(base64String) {
  try {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    logDebug('VAPID key decoded successfully, byte length:', outputArray.length);
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

// ============================================================================
// SUBSCRIPTION VALIDATION
// ============================================================================
function validateSubscription(subscription) {
  if (!subscription) {
    return { valid: false, reason: 'Subscription is null' };
  }
  if (!subscription.endpoint) {
    return { valid: false, reason: 'Missing endpoint' };
  }
  if (!subscription.endpoint.startsWith('https://')) {
    return { valid: false, reason: 'Invalid endpoint - must be HTTPS' };
  }
  
  const json = subscription.toJSON();
  if (!json.keys?.p256dh) {
    return { valid: false, reason: 'Missing p256dh key' };
  }
  if (!json.keys?.auth) {
    return { valid: false, reason: 'Missing auth key' };
  }
  
  return { 
    valid: true, 
    endpoint: subscription.endpoint,
    p256dhLength: json.keys.p256dh.length,
    authLength: json.keys.auth.length
  };
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// Handles VAPID key conflicts automatically
// ============================================================================
async function ensureSubscription() {
  log('ensureSubscription() called');
  
  if (!SIGME_CONFIG.websiteId || !SIGME_CONFIG.vapidPublicKey) {
    logError('Missing websiteId or vapidPublicKey in config');
    return null;
  }

  // Validate VAPID key format
  if (!SIGME_CONFIG.vapidPublicKey.startsWith('B')) {
    logError('Invalid VAPID public key - must start with B (uncompressed EC point)');
    return null;
  }

  const applicationServerKey = urlBase64ToUint8Array(SIGME_CONFIG.vapidPublicKey);
  if (!applicationServerKey || applicationServerKey.length !== 65) {
    logError('Invalid VAPID key length. Expected 65 bytes, got:', applicationServerKey?.length);
    return null;
  }

  log('VAPID key validated: starts with 0x' + applicationServerKey[0].toString(16) + ', length:', applicationServerKey.length);

  try {
    // Check existing subscription
    let existingSub = await self.registration.pushManager.getSubscription();
    
    if (existingSub) {
      log('Found existing subscription:', existingSub.endpoint.substring(0, 60) + '...');
      
      // Check if the existing subscription uses the same VAPID key
      const existingKey = existingSub.options?.applicationServerKey;
      if (existingKey) {
        const existingKeyArray = new Uint8Array(existingKey);
        const existingKeyBase64 = uint8ArrayToUrlBase64(existingKeyArray);
        
        logDebug('Existing VAPID key:', existingKeyBase64.substring(0, 30) + '...');
        logDebug('Expected VAPID key:', SIGME_CONFIG.vapidPublicKey.substring(0, 30) + '...');
        
        if (existingKeyBase64 === SIGME_CONFIG.vapidPublicKey) {
          log('✓ Existing subscription matches current VAPID key - REUSING');
          const validation = validateSubscription(existingSub);
          log('Subscription validation:', validation);
          return existingSub;
        }
        
        logWarn('⚠ VAPID key mismatch detected!');
        logWarn('Old key prefix:', existingKeyBase64.substring(0, 30));
        logWarn('New key prefix:', SIGME_CONFIG.vapidPublicKey.substring(0, 30));
        log('Unsubscribing old subscription to create new one with correct VAPID key...');
      }
      
      // Unsubscribe the old subscription
      try {
        const unsubResult = await existingSub.unsubscribe();
        log('Unsubscribed old subscription:', unsubResult);
      } catch (unsubErr) {
        logError('Failed to unsubscribe old subscription:', unsubErr);
      }
      
      // Double-check it's gone
      existingSub = await self.registration.pushManager.getSubscription();
      if (existingSub) {
        logWarn('Subscription still exists after unsubscribe, forcing second attempt...');
        try {
          await existingSub.unsubscribe();
          log('Second unsubscribe successful');
        } catch (e) {
          logError('Second unsubscribe attempt failed:', e);
        }
      }
    } else {
      log('No existing subscription found');
    }
    
    // Create new subscription
    log('Creating new push subscription with VAPID key...');
    const newSub = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
    
    const validation = validateSubscription(newSub);
    log('✓ New subscription created!');
    log('Endpoint:', newSub.endpoint);
    log('Validation:', validation);
    
    return newSub;
    
  } catch (err) {
    // Handle InvalidStateError with aggressive retry
    if (err.name === 'InvalidStateError') {
      logWarn('InvalidStateError encountered - attempting aggressive cleanup...');
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          log('Aggressive cleanup successful');
        }
        // Retry subscription
        const retrySub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
        log('✓ Retry subscription successful:', retrySub.endpoint);
        return retrySub;
      } catch (retryErr) {
        logError('Retry subscription failed:', retryErr);
        return null;
      }
    }
    
    logError('Subscription error:', err.name, err.message);
    return null;
  }
}

// ============================================================================
// BACKEND REGISTRATION
// ============================================================================
async function registerWithBackend(subscription) {
  log('registerWithBackend() called');
  
  if (!subscription || !SIGME_CONFIG.apiEndpoint) {
    logError('Cannot register: missing subscription or API endpoint');
    return false;
  }

  const subJson = subscription.toJSON();
  
  if (!subJson.keys?.p256dh || !subJson.keys?.auth) {
    logError('Subscription missing required keys (p256dh, auth)');
    return false;
  }

  // Gather device info
  const ua = self.navigator?.userAgent || '';
  let browser = 'Unknown', browserVersion = '', deviceType = 'desktop', os = 'Unknown';
  
  if (ua.includes('Firefox')) { browser = 'Firefox'; browserVersion = (ua.match(/Firefox\\/(\\d+)/) || [])[1] || ''; }
  else if (ua.includes('Edg')) { browser = 'Edge'; browserVersion = (ua.match(/Edg\\/(\\d+)/) || [])[1] || ''; }
  else if (ua.includes('Chrome')) { browser = 'Chrome'; browserVersion = (ua.match(/Chrome\\/(\\d+)/) || [])[1] || ''; }
  else if (ua.includes('Safari') && !ua.includes('Chrome')) { browser = 'Safari'; browserVersion = (ua.match(/Version\\/(\\d+)/) || [])[1] || ''; }
  
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  
  if (/Mobi|Android|iPhone/.test(ua)) deviceType = 'mobile';
  else if (/Tablet|iPad/.test(ua)) deviceType = 'tablet';

  const payload = {
    websiteId: SIGME_CONFIG.websiteId,
    subscription: {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth
      }
    },
    userAgent: ua,
    browser: browser,
    browserVersion: browserVersion,
    deviceType: deviceType,
    os: os,
    platform: 'web',
    language: self.navigator?.language || 'en',
    timezone: 'UTC'
  };

  logDebug('Registration payload:', {
    websiteId: payload.websiteId,
    endpointPrefix: payload.subscription.endpoint.substring(0, 50) + '...',
    browser: payload.browser,
    os: payload.os
  });

  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (SIGME_CONFIG.anonKey) {
      headers['apikey'] = SIGME_CONFIG.anonKey;
      headers['Authorization'] = 'Bearer ' + SIGME_CONFIG.anonKey;
    }

    const url = SIGME_CONFIG.apiEndpoint + '/register-subscriber';
    log('Registering with backend:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      log('✓ Backend registration successful!');
      log('Subscriber ID:', result.subscriberId || result);
      return true;
    } else {
      const errorText = await response.text();
      logError('Backend registration failed:', response.status, errorText);
      return false;
    }
  } catch (err) {
    logError('Backend registration error:', err);
    return false;
  }
}

// ============================================================================
// TRACKING HELPER
// ============================================================================
async function trackEvent(eventType, notificationId, action) {
  if (!SIGME_CONFIG.apiEndpoint) {
    logDebug('Tracking skipped - no API endpoint');
    return;
  }
  if (!notificationId) {
    logDebug('Tracking skipped - no notification ID');
    return;
  }
  
  logDebug('Tracking event:', eventType, 'notification:', notificationId, 'action:', action);
  
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (SIGME_CONFIG.anonKey) {
      headers['apikey'] = SIGME_CONFIG.anonKey;
      headers['Authorization'] = 'Bearer ' + SIGME_CONFIG.anonKey;
    }
    
    const response = await fetch(SIGME_CONFIG.apiEndpoint + '/track-notification', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        websiteId: SIGME_CONFIG.websiteId,
        notificationId: notificationId,
        event: eventType,
        action: action || 'default'
      })
    });
    
    if (response.ok) {
      log('✓ Tracked:', eventType, 'for notification:', notificationId);
    } else {
      logWarn('Tracking response not ok:', response.status);
    }
  } catch (err) {
    logError('Failed to track event:', err);
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Install event - take control immediately
self.addEventListener('install', (event) => {
  log('========================================');
  log('INSTALL EVENT');
  log('========================================');
  log('skipWaiting() called - new SW will activate immediately');
  self.skipWaiting();
});

// Activate event - claim clients and auto-subscribe
self.addEventListener('activate', (event) => {
  log('========================================');
  log('ACTIVATE EVENT');
  log('========================================');
  
  event.waitUntil(
    self.clients.claim().then(async () => {
      log('✓ Clients claimed - SW now controls all pages');
      
      // Check notification permission
      if (typeof Notification !== 'undefined') {
        log('Notification permission:', Notification.permission);
        
        if (Notification.permission === 'granted') {
          log('Permission granted - ensuring subscription...');
          const subscription = await ensureSubscription();
          if (subscription) {
            await registerWithBackend(subscription);
          } else {
            logWarn('Failed to create subscription during activate');
          }
        } else if (Notification.permission === 'denied') {
          logWarn('Notifications are BLOCKED by user');
        } else {
          log('Notification permission not yet granted (default)');
        }
      } else {
        logWarn('Notification API not available');
      }
    })
  );
});

// Message handler for manual subscription trigger from page
self.addEventListener('message', (event) => {
  log('MESSAGE EVENT:', event.data?.type);
  
  if (event.data?.type === 'SIGME_SUBSCRIBE') {
    log('Received SIGME_SUBSCRIBE message from page');
    event.waitUntil(
      ensureSubscription().then(async (sub) => {
        if (sub) {
          const registered = await registerWithBackend(sub);
          event.source?.postMessage({ 
            type: 'SIGME_SUBSCRIBED', 
            success: true,
            registered: registered,
            endpoint: sub.endpoint.substring(0, 50) + '...'
          });
          log('✓ Subscription complete, sent success response to page');
        } else {
          event.source?.postMessage({ type: 'SIGME_SUBSCRIBED', success: false });
          logWarn('Subscription failed, sent failure response to page');
        }
      })
    );
  }
  
  if (event.data?.type === 'SIGME_DEBUG_STATUS') {
    // Debug helper - report current status
    self.registration.pushManager.getSubscription().then(sub => {
      event.source?.postMessage({
        type: 'SIGME_DEBUG_STATUS_RESPONSE',
        hasSubscription: !!sub,
        endpoint: sub?.endpoint?.substring(0, 50) + '...',
        config: {
          websiteId: SIGME_CONFIG.websiteId,
          vapidKeyPrefix: SIGME_CONFIG.vapidPublicKey.substring(0, 20) + '...'
        }
      });
    });
  }
});

// ============================================================================
// PUSH EVENT - THE CRITICAL PATH
// This is where notifications are received from the server
// ============================================================================
self.addEventListener('push', (event) => {
  log('========================================');
  log('🔔 PUSH EVENT RECEIVED');
  log('========================================');
  log('Timestamp:', new Date().toISOString());
  log('Has data:', !!event.data);
  
  let data = {};
  let rawPayload = null;
  
  if (event.data) {
    try {
      rawPayload = event.data.text();
      log('Raw payload (first 500 chars):', rawPayload.substring(0, 500));
      data = JSON.parse(rawPayload);
      log('Parsed payload:', {
        title: data.title,
        body: data.body?.substring(0, 100),
        url: data.url,
        notificationId: data.notificationId,
        icon: data.icon,
        image: data.image,
        timestamp: data.timestamp
      });
    } catch (e) {
      logWarn('Failed to parse payload as JSON:', e.message);
      data = { title: 'Notification', body: rawPayload };
    }
  } else {
    logWarn('Push event has no data!');
    data = { title: 'New Notification', body: 'You have a new notification' };
  }
  
  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    image: data.image,
    badge: data.badge || '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      notificationId: data.notificationId || 'unknown-' + Date.now(),
      campaignId: data.campaignId,
      websiteId: SIGME_CONFIG.websiteId,
      timestamp: Date.now()
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'sigme-' + Date.now(),
    renotify: data.renotify !== false
  };

  log('Showing notification:', title);
  log('Options:', {
    body: options.body?.substring(0, 50),
    tag: options.tag,
    notificationId: options.data.notificationId
  });

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        log('✓ NOTIFICATION DISPLAYED SUCCESSFULLY');
        log('Notification ID:', options.data.notificationId);
        return trackEvent('delivered', options.data.notificationId);
      })
      .catch(err => {
        logError('✗ FAILED TO SHOW NOTIFICATION:', err);
      })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  log('========================================');
  log('👆 NOTIFICATION CLICKED');
  log('========================================');
  log('Action:', event.action || 'default (body clicked)');
  log('Notification tag:', event.notification.tag);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  log('Notification data:', data);
  
  event.waitUntil(
    trackEvent('clicked', data.notificationId, event.action).then(() => {
      const urlToOpen = data.url || '/';
      log('Opening URL:', urlToOpen);
      
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          log('Found', clientList.length, 'open clients');
          
          // Try to focus existing window with matching URL
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              log('Focusing existing client:', client.url);
              return client.focus();
            }
          }
          
          // Open new window
          if (self.clients.openWindow) {
            log('Opening new window for:', urlToOpen);
            return self.clients.openWindow(urlToOpen);
          }
        });
    })
  );
});

// Notification close (dismissed without clicking)
self.addEventListener('notificationclose', (event) => {
  log('========================================');
  log('❌ NOTIFICATION DISMISSED');
  log('========================================');
  log('Tag:', event.notification.tag);
  
  const data = event.notification.data || {};
  event.waitUntil(trackEvent('dismissed', data.notificationId));
});

// Error handler
self.addEventListener('error', (event) => {
  logError('Uncaught error in service worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  logError('Unhandled promise rejection:', event.reason);
});

log('========================================');
log('SERVICE WORKER SCRIPT LOADED');
log('Waiting for events...');
log('========================================');
`;

  // ============================================================================
  // MINIMAL INTEGRATION SCRIPT - Uses authorized Firebase VAPID key
  // Just registers SW with config params and requests permission
  // ============================================================================
//   const integrationScript = `<!-- Sigme Push Notifications -->
// <!-- VAPID Key: Authorized Firebase VAPID public key -->
// <!-- Add this before </body> on your website -->
// <script>
// /**
//  * Sigme Push Notifications - Minimal Integration
//  * 
//  * This script:
//  * 1. Registers the service worker with config via query params
//  * 2. Requests notification permission on load
//  * 3. The SW handles EVERYTHING else automatically
//  * 
//  * VAPID Key Consistency:
//  * Uses the authorized Firebase VAPID public key for all subscriptions.
//  */
// (function() {
//   // Configuration - uses authorized Firebase VAPID key
//   var config = {
//     websiteId: '${website.id}',
//     vapid: '${FIREBASE_VAPID_PUBLIC_KEY}',
//     api: '${SUPABASE_URL}/functions/v1',
//     key: '${SUPABASE_ANON_KEY}'
//   };

//   // Check browser support
//   if (!('serviceWorker' in navigator)) {
//     console.warn('[Sigme] Service workers not supported');
//     return;
//   }
//   if (!('PushManager' in window)) {
//     console.warn('[Sigme] Push notifications not supported');
//     return;
//   }

//   // Build SW URL with config params
//   var swUrl = '/sigme-sw.js?' +
//     'websiteId=' + encodeURIComponent(config.websiteId) +
//     '&vapid=' + encodeURIComponent(config.vapid) +
//     '&api=' + encodeURIComponent(config.api) +
//     '&key=' + encodeURIComponent(config.key);

//   // Register service worker
//   navigator.serviceWorker.register(swUrl, { scope: '/' })
//     .then(function(reg) {
//       console.log('[Sigme] Service Worker registered');
//       return navigator.serviceWorker.ready;
//     })
//     .then(function(registration) {
//       console.log('[Sigme] Service Worker ready');

//       // Request permission and subscribe
//       if (Notification.permission === 'granted') {
//         console.log('[Sigme] Permission already granted, triggering subscription...');
//         triggerSubscription(registration);
//       } else if (Notification.permission !== 'denied') {
//         console.log('[Sigme] Requesting notification permission...');
//         Notification.requestPermission().then(function(permission) {
//           if (permission === 'granted') {
//             console.log('[Sigme] Permission granted!');
//             triggerSubscription(registration);
//           } else {
//             console.log('[Sigme] Permission denied or dismissed:', permission);
//           }
//         });
//       } else {
//         console.log('[Sigme] Notifications are blocked by user');
//       }
//     })
//     .catch(function(err) {
//       console.error('[Sigme] Registration failed:', err);
//     });

//   // Tell the SW to subscribe
//   function triggerSubscription(registration) {
//     if (registration.active) {
//       registration.active.postMessage({ type: 'SIGME_SUBSCRIBE' });
//     } else {
//       // Wait for SW to activate
//       navigator.serviceWorker.addEventListener('controllerchange', function() {
//         if (navigator.serviceWorker.controller) {
//           navigator.serviceWorker.controller.postMessage({ type: 'SIGME_SUBSCRIBE' });
//         }
//       });
//     }
//   }

//   // Listen for subscription result
//   navigator.serviceWorker.addEventListener('message', function(event) {
//     if (event.data?.type === 'SIGME_SUBSCRIBED') {
//       if (event.data.success) {
//         console.log('[Sigme] ✓ Successfully subscribed to push notifications!');
//       } else {
//         console.warn('[Sigme] Subscription failed - check SW logs for details');
//       }
//     }
//   });
// })();
// </script>`;

const integrationScript = `<!-- Sigme Push Notifications -->
<script>
(function () {
  var config = {
    websiteId: '${website.id}',
    vapidPublicKey: '${FIREBASE_VAPID_PUBLIC_KEY}',
    api: '${SUPABASE_URL}/functions/v1'
  };

  if (!('serviceWorker' in navigator)) {
    console.warn('[Sigme] Service workers not supported');
    return;
  }

  if (!('PushManager' in window)) {
    console.warn('[Sigme] Push not supported');
    return;
  }

  navigator.serviceWorker.register('/service-worker.js')
    .then(function () {
      return navigator.serviceWorker.ready;
    })
    .then(function (registration) {
      if (Notification.permission === 'granted') {
        sendSubscribeMessage();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(function (permission) {
          if (permission === 'granted') {
            sendSubscribeMessage();
          }
        });
      }
    })
    .catch(function (err) {
      console.error('[Sigme] SW registration failed:', err);
    });

  function sendSubscribeMessage() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SIGME_SUBSCRIBE',
        payload: config
      });
    }
  }

  navigator.serviceWorker.addEventListener('message', function (event) {
    if (event.data?.type === 'SIGME_SUBSCRIBED') {
      if (event.data.success) {
        console.log('[Sigme] Push subscription successful');
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
                    <p className="font-medium">Done! No manual steps required</p>
                    <p className="text-sm text-muted-foreground">The SW handles permission, subscription, and conflict resolution automatically</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Service Worker */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Service Worker</h3>
                  <p className="text-sm text-muted-foreground">Single source of truth for all push logic</p>
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
                  <p className="text-sm text-muted-foreground">Minimal script - just registers SW and requests permission</p>
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
                <pre className="p-4 rounded-lg bg-muted/50 overflow-x-auto text-xs max-h-[300px] overflow-y-auto">
                  <code>{integrationScript}</code>
                </pre>
              </div>
            </div>

            {/* Important Notes */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h4 className="font-medium text-primary mb-2">How it works</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Automatic conflict resolution:</strong> Old subscriptions with different VAPID keys are automatically removed</li>
                <li>• <strong>Permission handling:</strong> Requests permission on page load (auto-subscribes if already granted)</li>
                <li>• <strong>Self-configuring SW:</strong> Config passed via URL params, no hardcoded values in SW file</li>
                <li>• <strong>Cross-browser:</strong> Works with Chrome, Firefox, Edge, and Safari (macOS)</li>
              </ul>
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <h3 className="text-lg font-semibold mb-4">Your API Keys</h3>
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
                  <Label>Public VAPID Key (Firebase - shared across all websites)</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-muted text-sm break-all">
                      {FIREBASE_VAPID_PUBLIC_KEY}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(FIREBASE_VAPID_PUBLIC_KEY, "VAPID Public Key")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the authorized Firebase VAPID key used for all push subscriptions
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Private VAPID Key</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-muted text-sm break-all">
                      Stored securely in backend secrets (FIREBASE_VAPID_PRIVATE_KEY)
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The private key is never exposed to the frontend for security
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-muted text-sm break-all">
                      {website.apiToken ? "••••••••••••••••••••••••" : "Not available"}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(website.apiToken || "", "API Token")}
                      disabled={!website.apiToken}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Endpoint</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-muted text-sm break-all">
                      {SUPABASE_URL}/functions/v1
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(`${SUPABASE_URL}/functions/v1`, "API Endpoint")}
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
