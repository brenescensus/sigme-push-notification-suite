import { useState } from "react";
import { Copy, Plus, Eye, EyeOff, Trash2, RefreshCw, Code, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  type: "public" | "private";
}

const apiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production Website",
    key: "pk_live_abc123def456ghi789jkl012mno345pqr678stu901",
    createdAt: "2024-01-10T10:30:00Z",
    lastUsed: "2024-01-20T14:22:00Z",
    type: "public",
  },
  {
    id: "2",
    name: "Development",
    key: "pk_test_xyz789abc456def123ghi012jkl345mno678pqr901",
    createdAt: "2024-01-05T08:15:00Z",
    lastUsed: "2024-01-19T09:45:00Z",
    type: "public",
  },
  {
    id: "3",
    name: "Backend Server",
    key: "sk_live_secret123key456for789backend012api345calls",
    createdAt: "2024-01-08T16:45:00Z",
    lastUsed: "2024-01-20T18:30:00Z",
    type: "private",
  },
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const codeSnippet = `<!-- Add this to your website's <head> tag -->
<script src="https://cdn.sigme.io/sdk.js"></script>
<script>
  Sigme.init({
    appId: 'YOUR_APP_ID',
    publicKey: 'pk_live_abc123def456ghi789...'
  });
</script>`;

export default function ApiKeysPage() {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  const maskKey = (key: string) => {
    return key.substring(0, 12) + "..." + key.substring(key.length - 4);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground">
              Manage your API keys for website integration
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for your website or application
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g., Production Website"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="hero" onClick={() => setIsCreateOpen(false)}>
                  Create Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Warning Alert */}
        <Alert className="border-warning/20 bg-warning/5">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Keep your keys secure</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Never share your private API keys in public repositories or client-side code. Only use
            public keys in browser environments.
          </AlertDescription>
        </Alert>

        {/* API Keys List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Your API Keys</h3>
          
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="p-6 rounded-xl bg-card border border-border/50"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-foreground">{apiKey.name}</h4>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        apiKey.type === "public"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {apiKey.type === "public" ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-1.5 rounded-md bg-muted text-sm font-mono text-muted-foreground">
                      {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {visibleKeys.has(apiKey.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copyToClipboard(apiKey.key, "API Key")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created {formatDate(apiKey.createdAt)}</span>
                    {apiKey.lastUsed && (
                      <>
                        <span>•</span>
                        <span>Last used {formatDate(apiKey.lastUsed)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Integration Guide */}
        <div className="p-6 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Quick Integration</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Add this snippet to your website to start collecting subscribers
          </p>
          <div className="relative">
            <pre className="p-4 rounded-lg bg-foreground/5 border border-border overflow-x-auto">
              <code className="text-sm text-muted-foreground">{codeSnippet}</code>
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-3 right-3"
              onClick={() => copyToClipboard(codeSnippet, "Code snippet")}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>

        {/* VAPID Keys Section */}
        <div className="p-6 rounded-xl bg-card border border-border/50">
          <h3 className="text-lg font-semibold text-foreground mb-4">VAPID Keys</h3>
          <p className="text-muted-foreground mb-4">
            Your Web Push VAPID keys for server-side notification sending
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Public VAPID Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value="BEl62iUYgUivxIkv69yViEuiBIa40..."
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard("BEl62iUYgUivxIkv69yViEuiBIa40...", "Public VAPID Key")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Private VAPID Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  type="password"
                  value="UUxI4O8-FbRouAF3NJ3..."
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard("UUxI4O8-FbRouAF3NJ3...", "Private VAPID Key")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
