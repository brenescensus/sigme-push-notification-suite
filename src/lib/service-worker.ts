// Service Worker Registration with Permission Onboarding
export async function registerServiceWorker(websiteId: string, apiUrl: string) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers not supported');
  }

  if (!('PushManager' in window)) {
    throw new Error('Push notifications not supported');
  }

  try {
    // Request permission first
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker registered:', registration);

    // Wait for activation
    await navigator.serviceWorker.ready;

    // Subscribe to push
    registration.active?.postMessage({
      type: 'SIGME_SUBSCRIBE',
      websiteId,
      apiUrl,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'));
      }, 10000);

      navigator.serviceWorker.addEventListener('message', function handler(event) {
        if (event.data?.type === 'SIGME_SUBSCRIBE_SUCCESS') {
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve(event.data.subscription);
        } else if (event.data?.type === 'SIGME_SUBSCRIBE_ERROR') {
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('message', handler);
          reject(new Error(event.data.error));
        }
      });
    });
  } catch (error) {
    console.error('Service Worker registration error:', error);
    throw error;
  }
}