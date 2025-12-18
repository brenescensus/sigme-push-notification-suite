/**
 * CampaignsPage - Database-Connected Campaign Management
 * 
 * Features:
 * - Full CRUD with Supabase database
 * - Real-time multi-device notification preview
 * - Advanced recurring scheduling support
 * - Owner-exempt limits
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Loader2,
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
import { useWebsite } from "@/contexts/WebsiteContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (status: string) => {
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
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const { isOwner, limits } = useOwnerAccess();
  const { currentWebsite } = useWebsite();
  const queryClient = useQueryClient();
  
  // Form state
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
  const [segment, setSegment] = useState("all");
  const [targetBrowsers, setTargetBrowsers] = useState<string[]>([]);
  const [targetDevices, setTargetDevices] = useState<string[]>([]);
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    type: "immediate",
    timezone: "UTC",
  });

  // Fetch campaigns from database
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", currentWebsite?.id],
    queryFn: async () => {
      if (!currentWebsite?.id) return [];
      
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("website_id", currentWebsite.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWebsite?.id,
  });

  // Create campaign mutation
  const createCampaign = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (!currentWebsite?.id) throw new Error("No website selected");

      const actions = [];
      if (button1Label) actions.push({ label: button1Label, url: button1Url });
      if (button2Label) actions.push({ label: button2Label, url: button2Url });

      const scheduledAt = scheduleConfig.type === "scheduled" && scheduleConfig.scheduledDate
        ? scheduleConfig.scheduledDate.toISOString()
        : null;

      const isRecurring = scheduleConfig.type === "recurring";
      const recurrencePattern = isRecurring 
        ? `${scheduleConfig.recurringInterval} at ${scheduleConfig.recurringTime || "09:00"}`
        : null;

      const status = isDraft 
        ? "draft" 
        : scheduleConfig.type === "immediate" 
          ? "active" 
          : scheduleConfig.type === "recurring"
            ? "recurring"
            : "scheduled";

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          website_id: currentWebsite.id,
          name: campaignName,
          title: notificationTitle,
          body: notificationBody,
          icon_url: iconUrl || null,
          image_url: imageUrl || null,
          click_url: clickUrl || null,
          actions: actions,
          segment: segment,
          target_browsers: targetBrowsers.length > 0 ? targetBrowsers : null,
          target_devices: targetDevices.length > 0 ? targetDevices : null,
          target_countries: targetCountries.length > 0 ? targetCountries : null,
          status,
          scheduled_at: scheduledAt,
          is_recurring: isRecurring,
          recurrence_pattern: recurrencePattern,
          recurrence_config: isRecurring ? scheduleConfig : null,
          next_send_at: isRecurring && scheduleConfig.recurringStartDate 
            ? scheduleConfig.recurringStartDate.toISOString() 
            : scheduledAt,
        })
        .select()
        .single();

      if (error) throw error;
      return { campaign: data, sendNow: scheduleConfig.type === "immediate" && !isDraft };
    },
    onSuccess: async ({ campaign, sendNow }) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      resetForm();
      setIsCreateOpen(false);
      
      if (sendNow) {
        // Trigger immediate send
        await sendCampaignNow(campaign.id);
      }
      
      toast({
        title: "Campaign created",
        description: sendNow ? "Campaign is being sent now" : "Campaign saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update campaign mutation
  const updateCampaign = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Campaign> }) => {
      const { error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete campaign mutation
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send campaign now
  const sendCampaignNow = async (campaignId: string) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign || !currentWebsite) return;

      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          campaignId,
          websiteId: currentWebsite.id,
          notification: {
            title: campaign.title,
            body: campaign.body,
            icon: campaign.icon_url,
            image: campaign.image_url,
            url: campaign.click_url,
            actions: campaign.actions,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Campaign sent",
        description: `Sent to ${data.sent} subscribers`,
      });

      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Duplicate campaign
  const duplicateCampaign = async (campaign: Campaign) => {
    if (!currentWebsite?.id) return;

    const { error } = await supabase
      .from("campaigns")
      .insert({
        website_id: currentWebsite.id,
        name: `${campaign.name} (Copy)`,
        title: campaign.title,
        body: campaign.body,
        icon_url: campaign.icon_url,
        image_url: campaign.image_url,
        click_url: campaign.click_url,
        actions: campaign.actions,
        segment: campaign.segment,
        target_browsers: campaign.target_browsers,
        target_devices: campaign.target_devices,
        target_countries: campaign.target_countries,
        status: "draft",
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign duplicated" });
    }
  };

  const resetForm = () => {
    setCampaignName("");
    setNotificationTitle("");
    setNotificationBody("");
    setIconUrl("");
    setImageUrl("");
    setClickUrl("");
    setButton1Label("");
    setButton1Url("");
    setButton2Label("");
    setButton2Url("");
    setSegment("all");
    setTargetBrowsers([]);
    setTargetDevices([]);
    setTargetCountries([]);
    setScheduleConfig({ type: "immediate", timezone: "UTC" });
    setEditingCampaign(null);
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  if (!currentWebsite) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold mb-2">No website selected</h3>
          <p className="text-muted-foreground">Please select or create a website first</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
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
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notification-title">Notification Title</Label>
                        <Input 
                          id="notification-title" 
                          placeholder="e.g., Check out our new features!"
                          value={notificationTitle}
                          onChange={(e) => setNotificationTitle(e.target.value)}
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
                        <Select value={segment} onValueChange={setSegment}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select segment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subscribers</SelectItem>
                            <SelectItem value="new">New Subscribers (Last 7 days)</SelectItem>
                            <SelectItem value="active">Active Users</SelectItem>
                            <SelectItem value="inactive">Inactive Users</SelectItem>
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
                          <p className="text-3xl font-semibold text-primary">
                            {currentWebsite?.subscriberCount || 0}
                          </p>
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
                      
                      {limits.plan === "free" && scheduleConfig.type === "recurring" && (
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
                <Button 
                  variant="outline" 
                  onClick={() => createCampaign.mutate(true)}
                  disabled={createCampaign.isPending || !campaignName || !notificationTitle || !notificationBody}
                >
                  {createCampaign.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save as Draft
                </Button>
                <Button 
                  variant="hero" 
                  className="group"
                  onClick={() => createCampaign.mutate(false)}
                  disabled={createCampaign.isPending || !campaignName || !notificationTitle || !notificationBody}
                >
                  {createCampaign.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2 transition-transform group-hover:translate-x-0.5 duration-200" />
                  )}
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
              <SelectItem value="recurring">Recurring</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-2">Loading campaigns...</p>
          </div>
        )}

        {/* Campaigns Grid */}
        {!isLoading && (
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
                      campaign.is_recurring 
                        ? "bg-gradient-to-br from-primary/20 to-accent" 
                        : "gradient-primary"
                    )}>
                      <Bell className={cn(
                        "w-6 h-6",
                        campaign.is_recurring ? "text-primary" : "text-primary-foreground"
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
                          {formatDate(campaign.created_at)}
                        </span>
                        <span>•</span>
                        <span>{campaign.segment || "All Subscribers"}</span>
                        {campaign.recurrence_pattern && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium">{campaign.recurrence_pattern}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {campaign.sent_count > 0 && (
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div className="group">
                          <p className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {campaign.sent_count.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Sent</p>
                        </div>
                        <div className="group">
                          <p className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {campaign.delivered_count.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Delivered</p>
                        </div>
                        <div className="group">
                          <p className="text-lg font-semibold text-primary">
                            {campaign.sent_count > 0 
                              ? ((campaign.clicked_count / campaign.sent_count) * 100).toFixed(1) 
                              : 0}%
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
                        {campaign.status === "draft" && (
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => sendCampaignNow(campaign.id)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Now
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => duplicateCampaign(campaign)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {campaign.status === "active" && (
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => updateCampaign.mutate({ id: campaign.id, updates: { status: "paused" } })}
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {(campaign.status === "paused" || campaign.status === "recurring") && (
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => campaign.status === "recurring" 
                              ? sendCampaignNow(campaign.id)
                              : updateCampaign.mutate({ id: campaign.id, updates: { status: "active" } })
                            }
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {campaign.status === "recurring" ? "Run Now" : "Resume"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive cursor-pointer focus:text-destructive"
                          onClick={() => deleteCampaign.mutate(campaign.id)}
                        >
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
        )}

        {!isLoading && filteredCampaigns.length === 0 && (
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
