// Test notification modal 
//Add information to be viewed as web notification
import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface Subscriber {
  id: string;
  browser: string | null;
  device_type: string | null;
  platform: string | null;
  country: string | null;
  city: string | null;
}

interface TestNotificationDialogProps {
  subscriber: Subscriber | null;
  websiteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestNotificationDialog({ 
  subscriber, 
  websiteId,
  open, 
  onOpenChange 
}: TestNotificationDialogProps) {
  
  const DEFAULT_ICON = `${window.location.origin}/icon-192.png`;
  const DEFAULT_BADGE = `${window.location.origin}/badge-72.png`;
  
  const [title, setTitle] = useState("Test Notification");
  const [body, setBody] = useState("This is a test push notification from Sigme.");
  const [iconUrl, setIconUrl] = useState(DEFAULT_ICON); // Default to public folder icon
  const [clickUrl, setClickUrl] = useState("");
  const [sending, setSending] = useState(false);

  // Get VAPID key from environment variable
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 
    'BPB0HWKOKaG0V6xpWcnoaZvnJZCRl1OYfyUXFS7Do7OzJpW6WPoJQyd__u3KVDBDJlINatfLcmNwdF6kS5niPWI';

  const handleSend = async () => {
    if (!subscriber) return;

    setSending(true);
    try {
      console.log(' [TestNotification] Sending test notification...');
      console.log(' [TestNotification] Subscriber ID:', subscriber.id);
      console.log('[TestNotification] Website ID:', websiteId);
      console.log('[TestNotification] Using VAPID key:', VAPID_PUBLIC_KEY.substring(0, 20) + '...');

      //  Use the icon URL (already defaults to public folder icon)
      const finalIconUrl = iconUrl || DEFAULT_ICON;

      console.log(' [TestNotification] Notification:', { 
        title, 
        body, 
        icon: finalIconUrl, 
        url: clickUrl 
      });

      //  Send notification with correct payload structure
      const result = await apiFetch('notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          websiteId,
          notification: {
            title,
            body,
            icon: finalIconUrl, 
            url: clickUrl || undefined,
          },
          targetSubscriberIds: [subscriber.id],
        }),
      });

      console.log(' [TestNotification] Server response:', result);

      if (result.success) {
        toast.success(
          result.sent > 0 
            ? ` Notification sent successfully to ${result.sent} subscriber(s)!` 
            : "Notification queued but may not have been delivered"
        );
        
        // Check for errors
        if (result.errors && result.errors.length > 0) {
          console.error(' [TestNotification] Errors:', result.errors);
          
          // Check for VAPID key mismatch
          const vapidError = result.errors.find(e => 
            e.error?.includes('Public key is not valid') || 
            e.error?.includes('VAPID')
          );
          
          if (vapidError) {
            toast.error(
              ' VAPID key mismatch detected! The subscriber was created with a different VAPID key. ' +
              'Please delete this subscriber and re-subscribe with the current key.',
              { duration: 8000 }
            );
          } else {
            toast.error(result.errors[0].error || "Some notifications failed to send");
          }
        } else {
          // Only close dialog if completely successful
          onOpenChange(false);
          
          // Reset form for next test
          setTitle("Test Notification");
          setBody("This is a test push notification from Sigme.");
          setIconUrl(DEFAULT_ICON); //  Reset to default icon
          setClickUrl("");
        }
      } else {
        toast.error(result.error || "Failed to send test notification");
      }
    } catch (error: any) {
      console.error(' [TestNotification] Error:', error);
      toast.error(error.message || "Failed to send test notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Test Notification</DialogTitle>
          <DialogDescription>
            Send a test push notification to this subscriber for debugging.
          </DialogDescription>
        </DialogHeader>

        {subscriber && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-3 max-w-full overflow-hidden">
            <div>
              <p className="font-medium text-foreground">
                {subscriber.browser || 'Unknown'} • {subscriber.device_type || 'Unknown'}
              </p>
              <p className="text-muted-foreground">
                {subscriber.city ? `${subscriber.city}, ` : ''}{subscriber.country || 'Unknown location'}
              </p>
              <p className="text-xs text-muted-foreground">
                Platform: {subscriber.platform || 'web'}
              </p>
            </div>
            
            <div className="pt-2 border-t border-muted space-y-2">
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-foreground mb-1">VAPID Key:</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {VAPID_PUBLIC_KEY.substring(0, 40)}...
                </p>
              </div>
              
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-foreground mb-1">Icon URL:</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {iconUrl || DEFAULT_ICON}
                </p>
              </div>
              
              {clickUrl && (
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-foreground mb-1">Click URL:</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {clickUrl}
                  </p>
                </div>
              )}
            </div>
            
            {/* Live Preview */}
            <div className="pt-2 border-t border-muted">
              <p className="text-xs font-medium text-foreground mb-2">Live Preview:</p>
              <div className="bg-white border border-border rounded-lg p-3 flex gap-3 items-start shadow-lg hover:shadow-xl transition-shadow max-w-full overflow-hidden">
                <div className="relative flex-shrink-0">
                  <img 
                    src={iconUrl || DEFAULT_ICON} 
                    alt="Notification icon"
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg animate-pulse"
                    style={{
                      filter: 'hue-rotate(200deg) saturate(1.5) brightness(1.1)',
                      boxShadow: '0 0 20px rgba(102, 126, 234, 0.5)'
                    }}
                    onError={(e) => {
                      // Fallback if icon fails to load
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23667eea"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-size="40" fill="white"></text></svg>';
                    }}
                  />
                  {/* Notification ping animation */}
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {title || 'Notification Title'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                    {body || 'Notification message will appear here...'}
                  </p>
                  {clickUrl && (
                    <div className="mt-2 flex items-start gap-1 text-xs overflow-hidden">
                      <svg className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="text-blue-600 hover:text-blue-800 truncate font-medium min-w-0">
                        {clickUrl}
                      </span>
                    </div>
                  )}
                  {!clickUrl && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      No click URL - opens homepage
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                ⏱️ This is how the notification will appear on the browser
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              maxLength={65}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/65 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notification message"
              rows={3}
              maxLength={240}
            />
            <p className="text-xs text-muted-foreground">
              {body.length}/240 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iconUrl">Icon URL</Label>
            <Input
              id="iconUrl"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder={DEFAULT_ICON}
              className="font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground flex-1">
                Using: {iconUrl === DEFAULT_ICON ? 'Default icon' : 'Custom icon'}
              </p>
              {iconUrl !== DEFAULT_ICON && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIconUrl(DEFAULT_ICON)}
                  className="text-xs h-6 px-2"
                >
                  Reset to default
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Default: /icon-192.png (192x192px PNG recommended)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clickUrl">Click URL (optional)</Label>
            <Input
              id="clickUrl"
              value={clickUrl}
              onChange={(e) => setClickUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Default: / (homepage)
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || !title || !body}
            className="w-full sm:w-auto"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}