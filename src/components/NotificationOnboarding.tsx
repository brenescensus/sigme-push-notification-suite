import React, { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

type Step =
  | "initial"
  | "requesting"
  | "granted"
  | "denied"
  | "testing"
  | "complete"
  | "unsupported"
  | "error";

interface Props {
  websiteId: string;
  onComplete?: () => void;
  skipable?: boolean;
}

const VAPID_PUBLIC_KEY =
  "BBZmIZboXmmfocyHA7FQor98z0DSyWWHoO1Se5nVBULGB_DKaymJZJ3YYW76DiqI_0mIHZNWE9Szm2SnCvQuO2I";

const NotificationOnboarding: React.FC<Props> = ({
  websiteId,
  onComplete,
  skipable = true,
}) => {
  const [step, setStep] = useState<Step>("initial");
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  /* ----------------------------------
     INITIAL CHECK
  -----------------------------------*/
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStep("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStep("denied");
      return;
    }

    if (Notification.permission === "granted") {
      restoreSubscription();
      setStep("granted");
      return;
    }

    setStep("initial");
  }, []);

  /* ----------------------------------
     RESTORE EXISTING SUBSCRIPTION
  -----------------------------------*/
  const restoreSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) setSubscription(sub);
    } catch (e) {
      console.error("Restore subscription failed", e);
    }
  };

  /* ----------------------------------
     REQUEST PERMISSION + SUBSCRIBE
  -----------------------------------*/
  const enableNotifications = async () => {
    setLoading(true);
    setStep("requesting");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStep(permission === "denied" ? "denied" : "initial");
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);

      await saveSubscriptionToBackend(sub);

      await reg.showNotification("Welcome to Sigme 🎉", {
        body: "Notifications are now enabled.",
        icon: "/icon-192.png",
        badge: "/badge-72.png",
      });

      setStep("granted");
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------
     SAVE SUBSCRIPTION TO BACKEND
  -----------------------------------*/
  const saveSubscriptionToBackend = async (sub: PushSubscription) => {
    const res = await fetch("https://sigme-push-notification-suite.supabase.co/functions/v1/register-subscriber", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId,
        subscription: sub.toJSON(),
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to save subscription");
    }
  };

  /* ----------------------------------
     REAL TEST NOTIFICATION
  -----------------------------------*/
  const sendTestNotification = async () => {
    setLoading(true);
    setStep("testing");

    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });

      if (!res.ok) throw new Error("Push test failed");

      setTimeout(() => {
        setStep("complete");
        onComplete?.();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
      setStep("granted");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------
     UI STATES
  -----------------------------------*/

  if (step === "unsupported") {
    return <Modal title="Unsupported" icon={<XCircle />}>
      Your browser does not support push notifications.
    </Modal>;
  }

  if (step === "denied") {
    return (
      <Modal title="Notifications Blocked" icon={<XCircle />}>
        Enable notifications from browser settings.
        <button onClick={() => location.reload()} className="btn">
          <RefreshCw /> Retry
        </button>
      </Modal>
    );
  }

  if (step === "initial" || step === "requesting") {
    return (
      <Modal title="Enable Notifications" icon={<Bell />}>
        <button onClick={enableNotifications} disabled={loading} className="btn">
          {loading ? <Loader2 className="spin" /> : "Enable"}
        </button>
      </Modal>
    );
  }

  if (step === "granted") {
    return (
      <Modal title="Enabled" icon={<CheckCircle />}>
        <button onClick={sendTestNotification} className="btn">
          Send Test Notification
        </button>
      </Modal>
    );
  }

  if (step === "testing") {
    return <Modal title="Sending..." icon={<Loader2 className="spin" />} />;
  }

  if (step === "complete") {
    return (
      <Modal title="All Set 🎉" icon={<CheckCircle />}>
        <button onClick={onComplete} className="btn">
          Go to Dashboard <ArrowRight />
        </button>
      </Modal>
    );
  }

  if (step === "error") {
    return <Modal title="Error" icon={<XCircle />}>{error}</Modal>;
  }

  return null;
};

export default NotificationOnboarding;

/* ----------------------------------
   HELPERS
-----------------------------------*/
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/* ----------------------------------
   SIMPLE MODAL WRAPPER
-----------------------------------*/
// const Modal: React.FC<{ title: string; icon: React.ReactNode }> = ({
//   title,
//   icon,
//   children,
// }) => (
//   <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
//     <div className="bg-white p-8 rounded-xl max-w-md w-full text-center">
//       <div className="mx-auto mb-4">{icon}</div>
//       <h2 className="text-xl font-bold mb-4">{title}</h2>
//       {children}
//     </div>
//   </div>
// );
interface ModalProps {
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, icon, children }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl max-w-md w-full text-center shadow-xl">
        <div className="flex justify-center mb-4">{icon}</div>
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
};
