/**
 * Websites Management Page
 * 
 * Lists all websites under the account with quick actions.
 * Allows managing, editing, and deleting websites.
 */

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
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useWebsite } from "@/contexts/WebsiteContext";
import { cn } from "@/lib/utils";
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

  const handleDelete = (id: string) => {
    deleteWebsite(id);
    setDeleteId(null);
    toast({
      title: "Website deleted",
      description: "The website has been removed from your account.",
    });
  };

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (status === "active" && isVerified) {
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
                        {getStatusBadge(website.status, website.isVerified)}
                      </div>
                      <a
                        href={website.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                      >
                        {website.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {website.description && (
                        <p className="text-sm text-muted-foreground mt-1">{website.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{website.subscriberCount.toLocaleString()}</span>
                      <span className="text-muted-foreground">subscribers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{website.notificationsSent.toLocaleString()}</span>
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
                      <Link to="/dashboard">
                        Select
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/dashboard/websites/${website.id}/integration`}>
                        <Code className="w-4 h-4 mr-2" />
                        Setup
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/dashboard/websites/${website.id}/settings`} className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
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

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Added {formatDate(website.createdAt)}</span>
                  <span>•</span>
                  <span>Updated {formatDate(website.updatedAt)}</span>
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
