/**
 * Website Selector Component
 * 
 * Dropdown in the dashboard header that allows switching between websites.
 * Shows current website status and quick stats.
 */

import { useState } from "react";
import { Check, ChevronDown, Globe, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebsite } from "@/contexts/WebsiteContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

export function WebsiteSelector() {
  const { currentWebsite, websites, setCurrentWebsite, isLoading } = useWebsite();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-10 w-48 bg-muted/50 animate-pulse rounded-lg" />
    );
  }

  if (!currentWebsite) {
    return (
      <Button variant="outline" asChild>
        <Link to="/dashboard/websites/new">
          <Plus className="w-4 h-4 mr-2" />
          Add Website
        </Link>
      </Button>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success";
      case "pending": return "bg-warning";
      case "inactive": return "bg-muted-foreground";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-auto min-w-[200px] justify-between bg-card border-border/50 hover:bg-accent/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                {currentWebsite.name}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(currentWebsite.status))} />
                {/* {currentWebsite.subscriber_count.toLocaleString()} subscribers */}
                {(currentWebsite?.active_subscribers ?? 0).toLocaleString()} subscribers

              </span>
            </div>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px]" align="start">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Your Websites</span>
          <span className="text-xs font-normal text-muted-foreground">
            {websites.length} total
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {websites.map((website) => (
          <DropdownMenuItem
            key={website.id}
            onClick={() => {
              setCurrentWebsite(website);
              setOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer py-3"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{website.name}</span>
                {website.id === currentWebsite.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(website.status))} />
                <span className="truncate">
                  {(() => {
                    try {
                      return new URL(website.url).hostname;
                    } catch {
                      return website.url;
                    }
                  })()}
                </span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {/* // Right before line 72, add this:
console.log(' [WebsiteSelector] currentWebsite:', currentWebsite);
console.log('[WebsiteSelector] subscriber_count:', currentWebsite?.subscriber_count); */}
              {/* {currentWebsite.subscriber_count.toLocaleString()} */}
              {(currentWebsite?.active_subscribers ?? 0).toLocaleString()} subscribers

            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/dashboard/websites/new" className="flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Add New Website</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/dashboard/websites" className="flex items-center gap-2 cursor-pointer">
            <Settings className="w-4 h-4" />
            <span>Manage Websites</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
