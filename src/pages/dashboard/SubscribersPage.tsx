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

const subscribers = [
  {
    id: "1",
    browser: "Chrome",
    device: "Desktop",
    os: "Windows",
    country: "United States",
    city: "New York",
    subscribedAt: "2024-01-15T10:30:00Z",
    status: "active",
    lastActive: "2024-01-20T14:22:00Z",
  },
  {
    id: "2",
    browser: "Safari",
    device: "Mobile",
    os: "iOS",
    country: "United Kingdom",
    city: "London",
    subscribedAt: "2024-01-14T08:15:00Z",
    status: "active",
    lastActive: "2024-01-20T09:45:00Z",
  },
  {
    id: "3",
    browser: "Firefox",
    device: "Desktop",
    os: "macOS",
    country: "Germany",
    city: "Berlin",
    subscribedAt: "2024-01-12T16:45:00Z",
    status: "active",
    lastActive: "2024-01-19T18:30:00Z",
  },
  {
    id: "4",
    browser: "Chrome",
    device: "Mobile",
    os: "Android",
    country: "Canada",
    city: "Toronto",
    subscribedAt: "2024-01-10T12:00:00Z",
    status: "inactive",
    lastActive: "2024-01-15T11:20:00Z",
  },
  {
    id: "5",
    browser: "Edge",
    device: "Desktop",
    os: "Windows",
    country: "Australia",
    city: "Sydney",
    subscribedAt: "2024-01-08T22:30:00Z",
    status: "active",
    lastActive: "2024-01-20T06:15:00Z",
  },
  {
    id: "6",
    browser: "Chrome",
    device: "Tablet",
    os: "Android",
    country: "France",
    city: "Paris",
    subscribedAt: "2024-01-05T14:20:00Z",
    status: "active",
    lastActive: "2024-01-18T19:40:00Z",
  },
  {
    id: "7",
    browser: "Safari",
    device: "Desktop",
    os: "macOS",
    country: "Japan",
    city: "Tokyo",
    subscribedAt: "2024-01-03T05:10:00Z",
    status: "active",
    lastActive: "2024-01-20T02:30:00Z",
  },
  {
    id: "8",
    browser: "Chrome",
    device: "Mobile",
    os: "Android",
    country: "Brazil",
    city: "São Paulo",
    subscribedAt: "2024-01-01T18:45:00Z",
    status: "unsubscribed",
    lastActive: "2024-01-10T12:00:00Z",
  },
];

const getBrowserIcon = (browser: string) => {
  switch (browser.toLowerCase()) {
    case "chrome":
      return <Chrome className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
  }
};

const getDeviceIcon = (device: string) => {
  switch (device.toLowerCase()) {
    case "mobile":
      return <Smartphone className="w-4 h-4" />;
    case "desktop":
      return <Monitor className="w-4 h-4" />;
    default:
      return <Monitor className="w-4 h-4" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function SubscribersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");

  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesSearch =
      sub.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.browser.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesDevice = deviceFilter === "all" || sub.device.toLowerCase() === deviceFilter;
    return matchesSearch && matchesStatus && matchesDevice;
  });

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
            <p className="text-2xl font-bold text-foreground">24,892</p>
            <p className="text-sm text-muted-foreground">Total Subscribers</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border/50">
            <p className="text-2xl font-bold text-success">22,145</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border/50">
            <p className="text-2xl font-bold text-warning">1,892</p>
            <p className="text-sm text-muted-foreground">Inactive</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border/50">
            <p className="text-2xl font-bold text-muted-foreground">855</p>
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
                {filteredSubscribers.map((subscriber) => (
                  <tr
                    key={subscriber.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-primary">
                            {getDeviceIcon(subscriber.device)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {getBrowserIcon(subscriber.browser)}
                              <span className="text-sm font-medium text-foreground">
                                {subscriber.browser}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {subscriber.device} • {subscriber.os}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{subscriber.city}</p>
                          <p className="text-xs text-muted-foreground">{subscriber.country}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-foreground">{formatDate(subscriber.subscribedAt)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(subscriber.subscribedAt)}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-foreground">{formatDate(subscriber.lastActive)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(subscriber.lastActive)}</p>
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
                          <DropdownMenuItem>Send Notification</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
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
    </DashboardLayout>
  );
}
