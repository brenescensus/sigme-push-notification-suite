//public/service-worker.js
const SW_VERSION = '3.1.0';
const VAPID_PUBLIC_KEY = 'BPB0HWKOKaG0V6xpWcnoaZvnJZCRl1OYfyUXFS7Do7OzJpW6WPoJQyd__u3KVDBDJlINatfLcmNwdF6kS5niPWI';

let unreadCount = 0;

// INSTALLATION
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

// SUBSCRIPTION MANAGEMENT
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
      console.error('[Sigme SW]  VAPID key mismatch! Unsubscribing...');
      console.error('[Sigme SW] Expected:', VAPID_PUBLIC_KEY.substring(0, 30) + '...');
      console.error('[Sigme SW] Got:', subKey.substring(0, 30) + '...');
      await subscription.unsubscribe();
      console.log('[Sigme SW] Please refresh page to resubscribe with correct key');
    } else {
      console.log('[Sigme SW]  VAPID key verified');
    }
  } catch (error) {
    console.error('[Sigme SW] Subscription verification error:', error);
  }
}

// MESSAGE HANDLING
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
      console.log('[Sigme SW] Creating new subscription...');
      subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[Sigme SW]  Subscription created');
    }

    // Register with backend
    const response = await fetch(`${apiUrl}/api/subscribers/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        websiteId,
        subscription: subscription.toJSON(),
        platform: 'web',
        browser: getBrowserInfo(),
        os: getOSInfo(),
        deviceType: getDeviceType(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Registration failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Sigme SW] Registered with backend:', result);

    event.source?.postMessage({
      type: 'SIGME_SUBSCRIBE_SUCCESS',
      subscription: subscription.toJSON(),
      result,
    });
  } catch (error) {
    console.error('[Sigme SW]  Subscribe error:', error);
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
      console.log('[Sigme SW] Unsubscribed');
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
    subscription: subscription ? subscription.toJSON() : null,
  });
}

// PUSH EVENT HANDLING - ENHANCED WITH BETTER LOGGING
self.addEventListener('push', (event) => {
  console.log('========================================');
  console.log('[Sigme SW]  PUSH EVENT RECEIVED');
  console.log('========================================');
  console.log('[Sigme SW] Timestamp:', new Date().toISOString());
  
  if (!event.data) {
    console.log('[Sigme SW]  No data in push event');
    return;
  }

  let notification = null;

  // Try multiple parsing methods
  try {
    // Method 1: Direct JSON
    notification = event.data.json();
    console.log('[Sigme SW]  Parsed using event.data.json()');
  } catch (e1) {
    try {
      // Method 2: Text then JSON
      const text = event.data.text();
      notification = JSON.parse(text);
      console.log('[Sigme SW]  Parsed using event.data.text()');
    } catch (e2) {
      try {
        // Method 3: ArrayBuffer then JSON
        const buffer = event.data.arrayBuffer();
        const text = new TextDecoder().decode(buffer);
        notification = JSON.parse(text);
        console.log('[Sigme SW]  Parsed using ArrayBuffer');
      } catch (e3) {
        // Method 4: Fallback to text display
        const fallbackText = event.data.text();
        notification = {
          title: 'Notification',
          body: fallbackText || 'You have a new notification',
        };
        console.log('[Sigme SW]  Using fallback notification');
      }
    }
  }

  if (!notification) {
    console.error('[Sigme SW]  Failed to parse notification');
    return;
  }

  console.log('[Sigme SW] Notification payload:', notification);
  console.log('[Sigme SW]  Title:', notification.title);
  console.log('[Sigme SW]  Body:', notification.body);
  console.log('[Sigme SW]  Icon:', notification.icon);
  console.log('[Sigme SW]  URL:', notification.url);

  unreadCount++;

  const options = {
    body: notification.body || '',
    icon: notification.icon || '/icon-192.png',
    badge: notification.badge || '/badge-72.png',
    image: notification.image,
    tag: notification.tag || `notif-${Date.now()}`,
    requireInteraction: notification.requireInteraction || false,
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    data: {
      url: notification.url || '/',
      notificationId: notification.notificationId || notification.tag,
      timestamp: Date.now(),
    },
    actions: notification.actions || [],
  };

  console.log('[Sigme SW]  Notification options:', options);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notification.title || 'Notification', options),
      updateBadge(unreadCount),
    ]).then(() => {
      console.log('[Sigme SW]  NOTIFICATION DISPLAYED SUCCESSFULLY');
      console.log('========================================');
    }).catch((error) => {
      console.error('[Sigme SW]  Display error:', error);
      console.log('========================================');
    })
  );
});

// NOTIFICATION CLICK
self.addEventListener('notificationclick', (event) => {
  console.log('========================================');
  console.log('[Sigme SW]  NOTIFICATION CLICKED');
  console.log('========================================');
  console.log('[Sigme SW] Notification:', event.notification);
  console.log('[Sigme SW] Action:', event.action);
  
  event.notification.close();
  unreadCount = Math.max(0, unreadCount - 1);

  const url = event.notification.data?.url || '/';
  console.log('[Sigme SW]  Opening URL:', url);

  event.waitUntil(
    Promise.all([
      clearBadge(),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Try to focus existing window
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              console.log('[Sigme SW]  Focusing existing window');
              return client.focus();
            }
          }
          // Open new window
          if (self.clients.openWindow) {
            console.log('[Sigme SW]  Opening new window');
            return self.clients.openWindow(url);
          }
        }),
    ]).then(() => {
      console.log('[Sigme SW]  URL opened successfully');
      console.log('========================================');
    }).catch((error) => {
      console.error('[Sigme SW]  Error opening URL:', error);
      console.log('========================================');
    })
  );
});

// NOTIFICATION CLOSE
self.addEventListener('notificationclose', (event) => {
  console.log('[Sigme SW]  Notification dismissed');
  unreadCount = Math.max(0, unreadCount - 1);
  event.waitUntil(clearBadge());
});

// UTILITIES
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

function getDeviceType() {
  const ua = navigator.userAgent;
  return /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
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

console.log(`[Sigme SW ${SW_VERSION}]  Loaded successfully`);
console.log(`[Sigme SW] VAPID Key: ${VAPID_PUBLIC_KEY.substring(0, 30)}...`);