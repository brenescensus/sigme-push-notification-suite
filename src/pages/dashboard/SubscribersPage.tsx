import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Chrome,
  Smartphone,
  Monitor,
  Globe,
  MapPin,
  Send,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TestNotificationDialog } from "@/components/subscribers/TestNotificationDialog";
import { useWebsite } from "@/contexts/WebsiteContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Subscriber {
  id: string;
  browser: string | null;
  device_type: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  platform: string | null;
  created_at: string;
  last_active_at: string | null;
  status: string;
}

const getBrowserIcon = (browser: string | null) => {
  switch (browser?.toLowerCase()) {
    case "chrome":
      return <Chrome className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
  }
};

const getDeviceIcon = (device: string | null) => {
  switch (device?.toLowerCase()) {
    case "mobile":
      return <Smartphone className="w-4 h-4" />;
    case "desktop":
      return <Monitor className="w-4 h-4" />;
    default:
      return <Monitor className="w-4 h-4" />;
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (dateString: string | null) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function SubscribersPage() {
  const { currentWebsite } = useWebsite();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ['subscribers', currentWebsite?.id],
    queryFn: async () => {
      if (!currentWebsite?.id) return [];
      const { data, error } = await supabase
        .from('subscribers')
        .select('id, browser, device_type, os, country, city, platform, created_at, last_active_at, status')
        .eq('website_id', currentWebsite.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as Subscriber[];
    },
    enabled: !!currentWebsite?.id,
  });

  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesSearch =
      (sub.country?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (sub.city?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (sub.browser?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesDevice = deviceFilter === "all" || sub.device_type?.toLowerCase() === deviceFilter;
    return matchesSearch && matchesStatus && matchesDevice;
  });

  const stats = {
    total: subscribers.length,
    active: subscribers.filter(s => s.status === 'active').length,
    inactive: subscribers.filter(s => s.status === 'inactive').length,
    unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length,
  };

  const handleSendTest = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setTestDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground">
              Manage and segment your push notification subscribers
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by location, browser..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border/50">
            <p className="text-2xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Subscribers</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border/50">
            <p className="text-2xl font-bold text-success">{stats.active.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border/50">
            <p className="text-2xl font-bold text-warning">{stats.inactive.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Inactive</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border/50">
            <p className="text-2xl font-bold text-muted-foreground">{stats.unsubscribed.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Unsubscribed</p>
          </div>
        </div>

        {/* Subscribers Table */}
        <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Subscriber
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Location
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Subscribed
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Last Active
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading subscribers...
                    </td>
                  </tr>
                ) : filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No subscribers found
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((subscriber) => (
                    <tr
                      key={subscriber.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-primary">
                              {getDeviceIcon(subscriber.device_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                {getBrowserIcon(subscriber.browser)}
                                <span className="text-sm font-medium text-foreground">
                                  {subscriber.browser || 'Unknown'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {subscriber.device_type || 'Unknown'} • {subscriber.os || 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{subscriber.city || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{subscriber.country || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-foreground">{formatDate(subscriber.created_at)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(subscriber.created_at)}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-foreground">{formatDate(subscriber.last_active_at)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(subscriber.last_active_at)}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            subscriber.status === "active"
                              ? "bg-success/10 text-success"
                              : subscriber.status === "inactive"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {subscriber.status.charAt(0).toUpperCase() + subscriber.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendTest(subscriber)}>
                              <Send className="w-4 h-4 mr-2" />
                              Send Test Notification
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Showing {filteredSubscribers.length} of {subscribers.length} subscribers
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <TestNotificationDialog
        subscriber={selectedSubscriber}
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
      />
    </DashboardLayout>
  );
}
