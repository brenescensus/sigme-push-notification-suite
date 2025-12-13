/**
 * CampaignsPage - Enhanced with Device Previews and Recurring Scheduling
 * 
 * Features:
 * - Real-time multi-device notification preview (iOS, Android, macOS, Windows)
 * - Advanced recurring scheduling support
 * - Owner-exempt limits (unlimited for platform owner)
 * - Fluid, Apple-inspired UI with smooth transitions
 */

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Send,
  Bell,
  Image,
  Link as LinkIcon,
  Copy,
  Trash2,
  Edit,
  Play,
  Pause,
  Clock,
  Crown,
  Infinity,
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
import DevicePreviewTabs from "@/components/notifications/DevicePreviewTabs";
import RecurringScheduler, { ScheduleConfig } from "@/components/scheduling/RecurringScheduler";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
  status: "draft" | "scheduled" | "active" | "completed" | "paused" | "recurring";
  sent: number;
  delivered: number;
  clicked: number;
  scheduledAt?: string;
  createdAt: string;
  segment: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
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
    status: "recurring",
    isRecurring: true,
    recurrencePattern: "Weekly on Mon",
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
    name: "Daily Tips",
    title: "💡 Your Daily Productivity Tip",
    body: "Small habits lead to big changes. Here's today's tip.",
    status: "recurring",
    isRecurring: true,
    recurrencePattern: "Daily at 9:00 AM",
    sent: 45600,
    delivered: 44200,
    clicked: 8900,
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
      return "bg-success/10 text-success border-success/20";
    case "completed":
      return "bg-muted text-muted-foreground border-muted";
    case "scheduled":
      return "bg-primary/10 text-primary border-primary/20";
    case "paused":
      return "bg-warning/10 text-warning border-warning/20";
    case "recurring":
      return "bg-accent text-accent-foreground border-primary/20";
    case "draft":
      return "bg-secondary text-secondary-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-muted";
  }
};

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { isOwner, limits } = useOwnerAccess();
  
  // Form state for new campaign
  const [campaignName, setCampaignName] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [button1Label, setButton1Label] = useState("");
  const [button1Url, setButton1Url] = useState("");
  const [button2Label, setButton2Label] = useState("");
  const [button2Url, setButton2Url] = useState("");
  
  // Schedule state
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    type: "immediate",
    timezone: "UTC",
  });

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Build notification content for preview
  const previewContent = {
    title: notificationTitle,
    body: notificationBody,
    icon: iconUrl || undefined,
    image: imageUrl || undefined,
    url: clickUrl || undefined,
    buttons: [
      ...(button1Label ? [{ label: button1Label, url: button1Url }] : []),
      ...(button2Label ? [{ label: button2Label, url: button2Url }] : []),
    ],
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Owner Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isOwner && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600">Owner</span>
                  <Infinity className="w-3 h-3 text-amber-500" />
                </div>
              )}
            </div>
            <p className="text-muted-foreground">
              Create, schedule, and manage your push notification campaigns
              {isOwner && (
                <span className="text-primary font-medium"> • Unlimited access</span>
              )}
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="group">
                <Plus className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90 duration-300" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">Create New Campaign</DialogTitle>
                <DialogDescription>
                  Configure your push notification and target audience with real-time preview
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                {/* Left side - Form */}
                <div className="space-y-4">
                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="targeting">Targeting</TabsTrigger>
                      <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="campaign-name">Campaign Name</Label>
                        <Input 
                          id="campaign-name" 
                          placeholder="e.g., Welcome Series"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notification-title">Notification Title</Label>
                        <Input 
                          id="notification-title" 
                          placeholder="e.g., Check out our new features!"
                          value={notificationTitle}
                          onChange={(e) => setNotificationTitle(e.target.value)}
                          className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notification-body">Message Body</Label>
                        <Textarea
                          id="notification-body"
                          placeholder="Write your notification message..."
                          rows={3}
                          value={notificationBody}
                          onChange={(e) => setNotificationBody(e.target.value)}
                          className="transition-all focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="icon-url">Icon URL</Label>
                          <div className="relative">
                            <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              id="icon-url" 
                              placeholder="https://..." 
                              className="pl-9"
                              value={iconUrl}
                              onChange={(e) => setIconUrl(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="click-url">Click URL</Label>
                          <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              id="click-url" 
                              placeholder="https://..." 
                              className="pl-9"
                              value={clickUrl}
                              onChange={(e) => setClickUrl(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="image-url">Image URL (optional)</Label>
                        <Input 
                          id="image-url" 
                          placeholder="https://... (large image for rich notification)"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        <Label>Action Buttons (optional)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <Input 
                            placeholder="Button 1 label"
                            value={button1Label}
                            onChange={(e) => setButton1Label(e.target.value)}
                          />
                          <Input 
                            placeholder="Button 1 URL"
                            value={button1Url}
                            onChange={(e) => setButton1Url(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input 
                            placeholder="Button 2 label"
                            value={button2Label}
                            onChange={(e) => setButton2Label(e.target.value)}
                          />
                          <Input 
                            placeholder="Button 2 URL"
                            value={button2Url}
                            onChange={(e) => setButton2Url(e.target.value)}
                          />
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

                      <div className="p-4 rounded-xl bg-accent/50 border border-primary/10">
                        <p className="text-sm font-medium text-foreground">Estimated Reach</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <p className="text-3xl font-semibold text-primary">24,892</p>
                          <span className="text-sm text-muted-foreground">subscribers</span>
                        </div>
                        {isOwner && (
                          <p className="text-xs text-primary mt-2 flex items-center gap-1">
                            <Infinity className="w-3 h-3" />
                            No subscriber limits applied
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="schedule" className="mt-4">
                      <RecurringScheduler
                        value={scheduleConfig}
                        onChange={setScheduleConfig}
                      />
                      
                      {!limits.canUseRecurring && scheduleConfig.type === "recurring" && (
                        <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                          <p className="text-sm text-amber-800">
                            🔒 Recurring notifications require a Premium plan.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Right side - Device Preview */}
                <div className="lg:border-l lg:pl-6 border-border/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="w-4 h-4 text-primary" />
                    <Label className="text-base font-medium">Live Preview</Label>
                  </div>
                  <DevicePreviewTabs content={previewContent} />
                </div>
              </div>

              <DialogFooter className="mt-6 gap-3">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Save as Draft
                </Button>
                <Button variant="hero" className="group">
                  <Send className="w-4 h-4 mr-2 transition-transform group-hover:translate-x-0.5 duration-200" />
                  {scheduleConfig.type === "immediate" ? "Send Now" : "Schedule Campaign"}
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
              className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
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
              <SelectItem value="recurring">Recurring</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaigns Grid */}
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign, index) => (
            <div
              key={campaign.id}
              className={cn(
                "p-6 rounded-2xl bg-card border border-border/50",
                "hover:border-primary/20 hover:shadow-lg",
                "transition-all duration-500 ease-out",
                "animate-fade-up opacity-0"
              )}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                    "transition-all duration-300",
                    campaign.isRecurring 
                      ? "bg-gradient-to-br from-primary/20 to-accent" 
                      : "gradient-primary"
                  )}>
                    <Bell className={cn(
                      "w-6 h-6",
                      campaign.isRecurring ? "text-primary" : "text-primary-foreground"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{campaign.name}</h3>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border",
                        getStatusColor(campaign.status)
                      )}>
                        {campaign.status === "recurring" ? "🔄 Recurring" : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{campaign.title}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(campaign.createdAt)}
                      </span>
                      <span>•</span>
                      <span>{campaign.segment}</span>
                      {campaign.recurrencePattern && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-medium">{campaign.recurrencePattern}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {campaign.sent > 0 && (
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div className="group">
                        <p className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {campaign.sent.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Sent</p>
                      </div>
                      <div className="group">
                        <p className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {campaign.delivered.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Delivered</p>
                      </div>
                      <div className="group">
                        <p className="text-lg font-semibold text-primary">
                          {((campaign.clicked / campaign.sent) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">CTR</p>
                      </div>
                    </div>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:bg-accent">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      {campaign.status === "active" && (
                        <DropdownMenuItem className="cursor-pointer">
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </DropdownMenuItem>
                      )}
                      {(campaign.status === "paused" || campaign.status === "recurring") && (
                        <DropdownMenuItem className="cursor-pointer">
                          <Play className="w-4 h-4 mr-2" />
                          {campaign.status === "recurring" ? "Run Now" : "Resume"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive cursor-pointer focus:text-destructive">
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
          <div className="text-center py-16 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-accent/50 flex items-center justify-center">
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters to find what you're looking for"
                : "Create your first campaign to start engaging with your audience"}
            </p>
            <Button variant="hero" onClick={() => setIsCreateOpen(true)} className="group">
              <Plus className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90 duration-300" />
              Create Your First Campaign
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
