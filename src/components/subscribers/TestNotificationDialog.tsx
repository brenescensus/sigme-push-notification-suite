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
import { supabase } from "@/integrations/supabase/client";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestNotificationDialog({ subscriber, open, onOpenChange }: TestNotificationDialogProps) {
  const [title, setTitle] = useState("Test Notification");
  const [body, setBody] = useState("This is a test push notification from Sigme.");
  const [iconUrl, setIconUrl] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subscriber) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to send test notifications");
        return;
      }

      const response = await supabase.functions.invoke('send-test-notification', {
        body: {
          subscriber_id: subscriber.id,
          title,
          body,
          icon_url: iconUrl || undefined,
          click_url: clickUrl || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success(response.data.message || "Test notification sent!");
        onOpenChange(false);
      } else {
        toast.error(response.data?.message || "Failed to send test notification");
      }
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast.error(error.message || "Failed to send test notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Test Notification</DialogTitle>
          <DialogDescription>
            Send a test push notification to this subscriber for debugging.
          </DialogDescription>
        </DialogHeader>

        {subscriber && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium text-foreground">
              {subscriber.browser || 'Unknown'} • {subscriber.device_type || 'Unknown'}
            </p>
            <p className="text-muted-foreground">
              {subscriber.city ? `${subscriber.city}, ` : ''}{subscriber.country || 'Unknown location'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Platform: {subscriber.platform || 'web'}
            </p>
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notification message"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iconUrl">Icon URL (optional)</Label>
            <Input
              id="iconUrl"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://example.com/icon.png"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clickUrl">Click URL (optional)</Label>
            <Input
              id="clickUrl"
              value={clickUrl}
              onChange={(e) => setClickUrl(e.target.value)}
              placeholder="https://example.com/page"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !title || !body}>
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
