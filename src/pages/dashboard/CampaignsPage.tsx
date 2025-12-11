import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Send,
  Calendar,
  Clock,
  Bell,
  Image,
  Link as LinkIcon,
  Copy,
  Trash2,
  Edit,
  Play,
  Pause,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Campaign {
  id: string;
  name: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
  status: "draft" | "scheduled" | "active" | "completed" | "paused";
  sent: number;
  delivered: number;
  clicked: number;
  scheduledAt?: string;
  createdAt: string;
  segment: string;
}

const campaigns: Campaign[] = [
  {
    id: "1",
    name: "Welcome Series",
    title: "Welcome to Our App!",
    body: "Thanks for subscribing. Check out what's new!",
    status: "completed",
    sent: 12450,
    delivered: 12100,
    clicked: 3420,
    createdAt: "2024-01-15T10:30:00Z",
    segment: "New Subscribers",
  },
  {
    id: "2",
    name: "Flash Sale Alert",
    title: "🔥 Flash Sale - 50% Off!",
    body: "Limited time offer. Shop now and save big!",
    url: "https://example.com/sale",
    status: "completed",
    sent: 8900,
    delivered: 8600,
    clicked: 2100,
    createdAt: "2024-01-14T08:15:00Z",
    segment: "All Subscribers",
  },
  {
    id: "3",
    name: "Weekly Newsletter",
    title: "This Week's Top Stories",
    body: "Catch up on the latest news and updates.",
    status: "active",
    sent: 15200,
    delivered: 14800,
    clicked: 4500,
    createdAt: "2024-01-12T16:45:00Z",
    segment: "Active Users",
  },
  {
    id: "4",
    name: "Product Launch",
    title: "Introducing Our New Feature!",
    body: "Be the first to try our exciting new update.",
    status: "scheduled",
    sent: 0,
    delivered: 0,
    clicked: 0,
    scheduledAt: "2024-01-25T09:00:00Z",
    createdAt: "2024-01-10T12:00:00Z",
    segment: "Premium Users",
  },
  {
    id: "5",
    name: "Re-engagement",
    title: "We Miss You!",
    body: "Come back and see what you've been missing.",
    status: "draft",
    sent: 0,
    delivered: 0,
    clicked: 0,
    createdAt: "2024-01-08T22:30:00Z",
    segment: "Inactive Users",
  },
  {
    id: "6",
    name: "Holiday Special",
    title: "🎄 Holiday Deals Inside",
    body: "Exclusive holiday offers just for you.",
    status: "paused",
    sent: 5600,
    delivered: 5400,
    clicked: 1200,
    createdAt: "2024-01-05T14:20:00Z",
    segment: "All Subscribers",
  },
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (status: Campaign["status"]) => {
  switch (status) {
    case "active":
      return "bg-success/10 text-success";
    case "completed":
      return "bg-muted text-muted-foreground";
    case "scheduled":
      return "bg-primary/10 text-primary";
    case "paused":
      return "bg-warning/10 text-warning";
    case "draft":
      return "bg-secondary text-secondary-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground">
              Create, schedule, and manage your push notification campaigns
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Configure your push notification and target audience
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="content" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="targeting">Targeting</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input id="campaign-name" placeholder="e.g., Welcome Series" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-title">Notification Title</Label>
                    <Input id="notification-title" placeholder="e.g., Check out our new features!" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-body">Message Body</Label>
                    <Textarea
                      id="notification-body"
                      placeholder="Write your notification message..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="icon-url">Icon URL (optional)</Label>
                      <div className="relative">
                        <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="icon-url" placeholder="https://..." className="pl-9" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="click-url">Click URL (optional)</Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="click-url" placeholder="https://..." className="pl-9" />
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="mt-6">
                    <Label>Preview</Label>
                    <div className="mt-2 p-4 rounded-lg bg-secondary/50 border border-border/50">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                          <Bell className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Notification Title</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your notification message will appear here...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="targeting" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subscribers</SelectItem>
                        <SelectItem value="new">New Subscribers (Last 7 days)</SelectItem>
                        <SelectItem value="active">Active Users</SelectItem>
                        <SelectItem value="inactive">Inactive Users</SelectItem>
                        <SelectItem value="premium">Premium Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Browser</Label>
                      <Select defaultValue="all">
                        <SelectTrigger>
                          <SelectValue placeholder="Any browser" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Browser</SelectItem>
                          <SelectItem value="chrome">Chrome</SelectItem>
                          <SelectItem value="firefox">Firefox</SelectItem>
                          <SelectItem value="safari">Safari</SelectItem>
                          <SelectItem value="edge">Edge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Device</Label>
                      <Select defaultValue="all">
                        <SelectTrigger>
                          <SelectValue placeholder="Any device" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Device</SelectItem>
                          <SelectItem value="desktop">Desktop</SelectItem>
                          <SelectItem value="mobile">Mobile</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder="Any country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Country</SelectItem>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 rounded-lg bg-accent/50 border border-primary/10">
                    <p className="text-sm font-medium text-foreground">Estimated Reach</p>
                    <p className="text-2xl font-bold text-primary mt-1">24,892 subscribers</p>
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" className="flex-1 h-24 flex-col gap-2">
                        <Send className="w-6 h-6" />
                        <span>Send Immediately</span>
                      </Button>
                      <Button variant="outline" className="flex-1 h-24 flex-col gap-2">
                        <Calendar className="w-6 h-6" />
                        <span>Schedule for Later</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label>Time</Label>
                        <Input type="time" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select defaultValue="utc">
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utc">UTC</SelectItem>
                          <SelectItem value="est">Eastern Time (EST)</SelectItem>
                          <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                          <SelectItem value="gmt">GMT</SelectItem>
                          <SelectItem value="cet">Central European Time (CET)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Save as Draft
                </Button>
                <Button variant="hero">
                  <Send className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaigns Grid */}
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{campaign.name}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{campaign.title}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(campaign.createdAt)}
                      </span>
                      <span>•</span>
                      <span>{campaign.segment}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {campaign.sent > 0 && (
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{campaign.sent.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Sent</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{campaign.delivered.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Delivered</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-primary">
                          {((campaign.clicked / campaign.sent) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">CTR</p>
                      </div>
                    </div>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      {campaign.status === "active" && (
                        <DropdownMenuItem>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </DropdownMenuItem>
                      )}
                      {campaign.status === "paused" && (
                        <DropdownMenuItem>
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first campaign to get started"}
            </p>
            <Button variant="hero" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
