# Sigme Push Notification Testing Guide

## Overview

This guide documents how to verify that every notification marked "sent successfully" by the Sigme system actually reaches the browser and triggers the push event.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PUSH NOTIFICATION FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Browser subscribes with VAPID key → Creates endpoint               │
│  2. Subscription registered with backend → Stored in subscribers table │
│  3. Notification sent via edge function → Encrypted with Web Push      │
│  4. Push service (FCM/Mozilla) → Delivers to browser                   │
│  5. Service Worker receives push event → Shows notification            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## VAPID Key Consistency (CRITICAL)

**Single Source of Truth:**
```
Public Key: BBZmIZboXmmfocyHA7FQor98z0DSyWWHoO1Se5nVBULGB_DKaymJZJ3YYW76DiqI_0mIHZNWE9Szm2SnCvQuO2I
Private Key: Stored in FIREBASE_VAPID_PRIVATE_KEY secret
```

All subscriptions MUST use this exact VAPID public key. The service worker automatically detects and fixes VAPID key mismatches.

---

## Testing Procedure

### Step 1: Verify Service Worker Installation

Open DevTools → Application → Service Workers

**Expected:**
- Service worker registered with scope "/"
- Status: "activated and running"
- Script URL includes `?websiteId=...&vapid=BBZ...`

**Console should show:**
```
[Sigme SW v2.0.0-audit] SERVICE WORKER INITIALIZING
[Sigme SW v2.0.0-audit] Config: {websiteId: "...", vapidKeyPrefix: "BBZmIZboXmmfocyHA...", ...}
```

### Step 2: Verify Subscription

In DevTools Console, run:
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    if (sub) {
      console.log('✓ Subscription exists');
      console.log('Endpoint:', sub.endpoint);
      console.log('Keys:', sub.toJSON().keys);
    } else {
      console.log('✗ No subscription found');
    }
  });
});
```

**Expected:**
- Endpoint starts with `https://fcm.googleapis.com/fcm/send/` (Chrome) or `https://updates.push.services.mozilla.com/` (Firefox)
- Keys object has `p256dh` and `auth` values

### Step 3: Verify Subscription in Database

In Sigme dashboard → Subscribers page:
- Find your test subscriber
- Verify browser, device type, and status are correct
- Note the subscriber ID for test notifications

### Step 4: Send Test Notification

1. Go to Subscribers page
2. Click "Test" button on a subscriber
3. Fill in title and body
4. Click "Send Test"

**Expected Response:**
```json
{
  "success": true,
  "message": "Push notification sent successfully",
  "platform": "web",
  "statusCode": 201
}
```

### Step 5: Verify Push Event Reception

**In browser console, you should see:**
```
[Sigme SW v2.0.0-audit] ========================================
[Sigme SW v2.0.0-audit]  PUSH EVENT RECEIVED
[Sigme SW v2.0.0-audit] ========================================
[Sigme SW v2.0.0-audit] Timestamp: 2025-01-15T...
[Sigme SW v2.0.0-audit] Has data: true
[Sigme SW v2.0.0-audit] Raw payload: {"title":"Test","body":"..."}
[Sigme SW v2.0.0-audit] Parsed payload: {title: "Test", ...}
[Sigme SW v2.0.0-audit] ✓ NOTIFICATION DISPLAYED SUCCESSFULLY
```

### Step 6: Verify Notification Display

- System notification should appear
- Click notification → should open correct URL
- Dismiss notification → should track "dismissed" event

---

## Troubleshooting

### Issue: "sent successfully" but no push event

**Possible causes:**

1. **VAPID Key Mismatch**
   - Check console for: "VAPID key mismatch detected"
   - Solution: Service worker auto-fixes this, wait for re-subscription

2. **Subscription Expired**
   - Backend returns 404/410 from push service
   - Solution: Unsubscribe and re-subscribe
   ```javascript
   navigator.serviceWorker.ready.then(reg => {
     reg.pushManager.getSubscription().then(sub => {
       if (sub) sub.unsubscribe().then(() => {
         reg.active.postMessage({ type: 'SIGME_SUBSCRIBE' });
       });
     });
   });
   ```

3. **Wrong VAPID Private Key**
   - Backend shows: "VAPID authentication failed"
   - Solution: Verify FIREBASE_VAPID_PRIVATE_KEY secret matches the public key

4. **Encryption Error**
   - Backend shows: Error during encryptPayload
   - Check p256dh and auth keys in subscriber record

5. **Browser Tab Not Open**
   - Push events only fire if browser is running
   - Background notifications work on desktop, limited on mobile

### Issue: Duplicate Notifications

- Check for multiple service worker registrations
- Verify tag is unique per notification
- Check `renotify: false` if duplicate tags should not re-notify

### Issue: Notification Shows But Click Doesn't Work

- Verify `url` field in notification payload
- Check `notificationclick` handler logs
- Ensure URL is same-origin or use `clients.openWindow()`

---

## Debug Commands

### Check Service Worker Status
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.active.postMessage({ type: 'SIGME_DEBUG_STATUS' });
});

navigator.serviceWorker.addEventListener('message', e => {
  if (e.data?.type === 'SIGME_DEBUG_STATUS_RESPONSE') {
    console.log('SW Status:', e.data);
  }
});
```

### Force Re-subscription
```javascript
navigator.serviceWorker.ready.then(async reg => {
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
  reg.active.postMessage({ type: 'SIGME_SUBSCRIBE' });
});
```

### Check Push Manager Permission
```javascript
navigator.permissions.query({ name: 'push', userVisibleOnly: true }).then(p => {
  console.log('Push permission:', p.state);
});
```

### Simulate Push Event (DevTools only)
Application → Service Workers → Push

Enter JSON payload:
```json
{
  "title": "Debug Test",
  "body": "Testing push event handler",
  "notificationId": "debug-123"
}
```

---

## Multi-Browser Testing Matrix

| Browser | Platform | Expected Behavior |
|---------|----------|-------------------|
| Chrome Desktop | Windows/macOS/Linux | Full support, FCM endpoints |
| Firefox Desktop | Windows/macOS/Linux | Full support, Mozilla endpoints |
| Edge Desktop | Windows/macOS | Full support (Chromium-based) |
| Chrome Android | Android | Full support with FCM |
| Firefox Android | Android | Limited background support |
| Safari Desktop | macOS 13+ | Full support (Safari 16.4+) |
| Safari iOS | iOS 16.4+ | Limited (requires PWA install) |

---

## Edge Function Logs

Check logs for send-notification and send-test-notification functions:

**Successful send:**
```
[WebPush] Sending to: https://fcm.googleapis.com/...
[WebPush] Response status: 201
```

**Failed send:**
```
[WebPush] Error: 404 - Subscription expired
[WebPush] Error: 401 - VAPID authentication failed
```

---

## Checklist for Production

- [ ] VAPID keys are consistent (public in SW, private in secrets)
- [ ] All subscriptions use the same VAPID public key
- [ ] Service worker debug mode disabled (`debug: false`)
- [ ] Expired subscriptions are marked inactive in database
- [ ] Error tracking for failed notifications
- [ ] Rate limiting for high-volume sends

---

## Contact

For issues with the Sigme push notification system, check:
1. Service Worker console logs
2. Edge function logs in Lovable Cloud
3. Network tab for failed requests to push services
