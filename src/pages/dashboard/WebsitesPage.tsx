// src/pages/dashboard/WebsitesPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  Plus,
  Settings,
  Code,
  Trash2,
  ExternalLink,
  Users,
  Send,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Pause,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useWebsite } from "@/contexts/WebsiteContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export default function WebsitesPage() {
  const { websites, deleteWebsite, setCurrentWebsite } = useWebsite();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const success = await deleteWebsite(id);
    if (success) {
      toast({
        title: "Website deleted",
        description: "The website has been removed from your account.",
      });
    }
    setDeleteId(null);
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
          <AlertCircle className="w-3 h-3" />
          Pending Setup
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        <Pause className="w-3 h-3" />
        Inactive
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Websites</h1>
            <p className="text-muted-foreground">
              Manage all your websites from one dashboard
            </p>
          </div>
          <Button variant="hero" asChild>
            <Link to="/dashboard/websites/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Website
            </Link>
          </Button>
        </div>

        {/* Websites Grid */}
        {websites.length === 0 ? (
          <div className="p-12 rounded-xl bg-card border border-border/50 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No websites yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add your first website to start collecting subscribers and sending push notifications.
            </p>
            <Button variant="hero" asChild>
              <Link to="/dashboard/websites/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Website
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {websites.map((website) => (
              <div
                key={website.id}
                className="p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Website Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-foreground">{website.name}</h3>
                        {getStatusBadge(website.status)}
                      </div>
                      <a
                        href={website.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-1">
                      
                        <span className="truncate">{website.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      {website.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {website.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats - Using correct column names */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {(website.active_subscribers || 0).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">subscribers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {(website.notifications_sent || 0).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">sent</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentWebsite(website)}
                      asChild
                    >
                      <Link to="/dashboard">Select</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/dashboard/websites/${website.id}/integration`}>
                        <Code className="w-4 h-4 mr-2" />
                        Setup
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/dashboard/websites/${website.id}/settings`}>
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(website.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Website
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Footer - Using correct column names */}
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Added {formatDate(website.created_at)}</span>
                  <span>•</span>
                  <span>Updated {formatDate(website.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Website</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this website and all its subscribers, notifications, and analytics. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}