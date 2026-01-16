/* ============================================================
   SIGME SERVICE WORKER - PRODUCTION READY
   Fixes: Payload parsing, error handling, VAPID consistency
   ============================================================ */

const SW_VERSION = '3.0.0';
const VAPID_PUBLIC_KEY = 'BBZmIZboXmmfocyHA7FQor98z0DSyWWHoO1Se5nVBULGB_DKaymJZJ3YYW76DiqI_0mIHZNWE9Szm2SnCvQuO2I';

let unreadCount = 0;

// ============================================================
// INSTALLATION
// ============================================================
self.addEventListener('install', (event) => {
  console.log(`[Sigme SW ${SW_VERSION}] Installing...`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[Sigme SW ${SW_VERSION}] Activating...`);
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log(`[Sigme SW ${SW_VERSION}] Claimed clients`);
      verifySubscription();
    })
  );
});

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================
async function verifySubscription() {
  try {
    const subscription = await self.registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('[Sigme SW] No subscription found');
      return;
    }

    // Verify VAPID key matches
    const subKey = arrayBufferToBase64(subscription.options.applicationServerKey);
    if (subKey !== VAPID_PUBLIC_KEY) {
      console.error('[Sigme SW] VAPID key mismatch! Unsubscribing...');
      await subscription.unsubscribe();
      console.log('[Sigme SW] Please refresh page to resubscribe');
    } else {
      console.log('[Sigme SW] VAPID key verified ✓');
    }
  } catch (error) {
    console.error('[Sigme SW] Subscription verification error:', error);
  }
}

// ============================================================
// MESSAGE HANDLING
// ============================================================
self.addEventListener('message', async (event) => {
  if (!event.data?.type) return;

  switch (event.data.type) {
    case 'SIGME_SUBSCRIBE':
      await handleSubscribe(event);
      break;
    case 'SIGME_UNSUBSCRIBE':
      await handleUnsubscribe(event);
      break;
    case 'SIGME_GET_STATUS':
      await handleGetStatus(event);
      break;
  }
});

async function handleSubscribe(event) {
  try {
    const { websiteId, apiUrl } = event.data;
    
    let subscription = await self.registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Register with backend
    const response = await fetch(`${apiUrl}/api/subscribers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId,
        subscription: subscription.toJSON(),
        platform: 'web',
        browser: getBrowserInfo(),
        os: getOSInfo(),
      }),
    });

    if (!response.ok) throw new Error(`Registration failed: ${response.status}`);

    event.source?.postMessage({
      type: 'SIGME_SUBSCRIBE_SUCCESS',
      subscription: subscription.toJSON(),
    });
  } catch (error) {
    console.error('[Sigme SW] Subscribe error:', error);
    event.source?.postMessage({
      type: 'SIGME_SUBSCRIBE_ERROR',
      error: error.message,
    });
  }
}

async function handleUnsubscribe(event) {
  try {
    const subscription = await self.registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    event.source?.postMessage({ type: 'SIGME_UNSUBSCRIBE_SUCCESS' });
  } catch (error) {
    console.error('[Sigme SW] Unsubscribe error:', error);
  }
}

async function handleGetStatus(event) {
  const subscription = await self.registration.pushManager.getSubscription();
  event.source?.postMessage({
    type: 'SIGME_STATUS',
    hasSubscription: !!subscription,
    version: SW_VERSION,
  });
}

// ============================================================
// PUSH EVENT HANDLING - ROBUST PARSING
// ============================================================
self.addEventListener('push', (event) => {
  console.log('[Sigme SW] 🔔 Push event received');
  
  if (!event.data) {
    console.log('[Sigme SW] No data in push event');
    return;
  }

  let notification = null;

  // Try multiple parsing methods
  try {
    // Method 1: Direct JSON
    notification = event.data.json();
  } catch (e1) {
    try {
      // Method 2: Text then JSON
      const text = event.data.text();
      notification = JSON.parse(text);
    } catch (e2) {
      try {
        // Method 3: ArrayBuffer then JSON
        const buffer = event.data.arrayBuffer();
        const text = new TextDecoder().decode(buffer);
        notification = JSON.parse(text);
      } catch (e3) {
        // Method 4: Fallback to text display
        const fallbackText = event.data.text();
        notification = {
          title: 'Notification',
          body: fallbackText || 'You have a new notification',
        };
      }
    }
  }

  if (!notification) {
    console.error('[Sigme SW] Failed to parse notification');
    return;
  }

  console.log('[Sigme SW] Parsed notification:', notification);

  unreadCount++;

  const options = {
    body: notification.body || '',
    icon: notification.icon || '/icon-192.png',
    badge: notification.badge || '/badge-72.png',
    image: notification.image,
    tag: notification.tag || `notif-${Date.now()}`,
    requireInteraction: notification.requireInteraction || false,
    data: {
      url: notification.url || '/',
      notificationId: notification.notificationId || notification.tag,
      timestamp: Date.now(),
    },
    actions: notification.actions || [],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notification.title || 'Notification', options),
      updateBadge(unreadCount),
    ]).then(() => {
      console.log('[Sigme SW] ✓ Notification displayed');
    }).catch((error) => {
      console.error('[Sigme SW] Display error:', error);
    })
  );
});

// ============================================================
// NOTIFICATION CLICK
// ============================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[Sigme SW] Notification clicked');
  
  event.notification.close();
  unreadCount = Math.max(0, unreadCount - 1);

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    Promise.all([
      clearBadge(),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Try to focus existing window
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window
          if (self.clients.openWindow) {
            return self.clients.openWindow(url);
          }
        }),
    ])
  );
});

// ============================================================
// NOTIFICATION CLOSE
// ============================================================
self.addEventListener('notificationclose', (event) => {
  console.log('[Sigme SW] Notification dismissed');
  unreadCount = Math.max(0, unreadCount - 1);
  event.waitUntil(clearBadge());
});

// ============================================================
// UTILITIES
// ============================================================
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

async function updateBadge(count) {
  if ('setAppBadge' in navigator) {
    try {
      await navigator.setAppBadge(count);
    } catch (e) {
      console.error('[Sigme SW] Badge update error:', e);
    }
  }
}

async function clearBadge() {
  if ('clearAppBadge' in navigator) {
    try {
      await navigator.clearAppBadge();
    } catch (e) {
      console.error('[Sigme SW] Badge clear error:', e);
    }
  }
}

console.log(`[Sigme SW ${SW_VERSION}] Loaded successfully ✓`);