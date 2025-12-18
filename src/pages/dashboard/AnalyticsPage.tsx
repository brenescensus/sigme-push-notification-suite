/**
 * AnalyticsPage - Real Database Queries
 * 
 * Fetches actual analytics data from notification_logs, campaigns, and subscribers tables.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Users,
  Send,
  MousePointer,
  Globe,
  Smartphone,
  Monitor,
  Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useWebsite } from "@/contexts/WebsiteContext";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

type TimePeriod = "24h" | "7d" | "30d" | "90d";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<TimePeriod>("7d");
  const { currentWebsite } = useWebsite();

  const getDaysFromPeriod = (p: TimePeriod) => {
    switch (p) {
      case "24h": return 1;
      case "7d": return 7;
      case "30d": return 30;
      case "90d": return 90;
      default: return 7;
    }
  };

  const startDate = startOfDay(subDays(new Date(), getDaysFromPeriod(period)));
  const endDate = endOfDay(new Date());

  // Fetch notification stats
  const { data: notificationStats, isLoading: statsLoading } = useQuery({
    queryKey: ["analytics-stats", currentWebsite?.id, period],
    queryFn: async () => {
      if (!currentWebsite?.id) return null;

      const { data: logs, error } = await supabase
        .from("notification_logs")
        .select("status, clicked_at, delivered_at")
        .eq("website_id", currentWebsite.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      const sent = logs?.length || 0;
      const delivered = logs?.filter(l => l.delivered_at || l.status === 'sent').length || 0;
      const clicked = logs?.filter(l => l.clicked_at).length || 0;

      return {
        sent,
        delivered,
        clicked,
        deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0",
        clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : "0",
      };
    },
    enabled: !!currentWebsite?.id,
  });

  // Fetch subscriber stats
  const { data: subscriberStats } = useQuery({
    queryKey: ["analytics-subscribers", currentWebsite?.id, period],
    queryFn: async () => {
      if (!currentWebsite?.id) return null;

      const { data: newSubscribers, error } = await supabase
        .from("subscribers")
        .select("id")
        .eq("website_id", currentWebsite.id)
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      return {
        newCount: newSubscribers?.length || 0,
        total: currentWebsite.subscriberCount || 0,
      };
    },
    enabled: !!currentWebsite?.id,
  });

  // Fetch time series data
  const { data: timeSeriesData } = useQuery({
    queryKey: ["analytics-timeseries", currentWebsite?.id, period],
    queryFn: async () => {
      if (!currentWebsite?.id) return [];

      const { data: logs, error } = await supabase
        .from("notification_logs")
        .select("created_at, status, delivered_at, clicked_at")
        .eq("website_id", currentWebsite.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by day
      const grouped = new Map<string, { sent: number; delivered: number; clicked: number }>();
      
      logs?.forEach(log => {
        const day = format(new Date(log.created_at), "MMM d");
        if (!grouped.has(day)) {
          grouped.set(day, { sent: 0, delivered: 0, clicked: 0 });
        }
        const stats = grouped.get(day)!;
        stats.sent++;
        if (log.delivered_at || log.status === 'sent') stats.delivered++;
        if (log.clicked_at) stats.clicked++;
      });

      return Array.from(grouped.entries()).map(([name, stats]) => ({
        name,
        ...stats,
      }));
    },
    enabled: !!currentWebsite?.id,
  });

  // Fetch device distribution
  const { data: deviceData } = useQuery({
    queryKey: ["analytics-devices", currentWebsite?.id],
    queryFn: async () => {
      if (!currentWebsite?.id) return [];

      const { data: subscribers, error } = await supabase
        .from("subscribers")
        .select("device_type")
        .eq("website_id", currentWebsite.id)
        .eq("status", "active");

      if (error) throw error;

      const counts = { Desktop: 0, Mobile: 0, Tablet: 0 };
      subscribers?.forEach(s => {
        const type = s.device_type?.toLowerCase() || "desktop";
        if (type.includes("mobile") || type.includes("phone")) counts.Mobile++;
        else if (type.includes("tablet")) counts.Tablet++;
        else counts.Desktop++;
      });

      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      return [
        { name: "Desktop", value: Math.round((counts.Desktop / total) * 100), color: "hsl(199, 89%, 48%)" },
        { name: "Mobile", value: Math.round((counts.Mobile / total) * 100), color: "hsl(142, 71%, 45%)" },
        { name: "Tablet", value: Math.round((counts.Tablet / total) * 100), color: "hsl(38, 92%, 50%)" },
      ];
    },
    enabled: !!currentWebsite?.id,
  });

  // Fetch browser distribution
  const { data: browserData } = useQuery({
    queryKey: ["analytics-browsers", currentWebsite?.id],
    queryFn: async () => {
      if (!currentWebsite?.id) return [];

      const { data: subscribers, error } = await supabase
        .from("subscribers")
        .select("browser")
        .eq("website_id", currentWebsite.id)
        .eq("status", "active");

      if (error) throw error;

      const counts = new Map<string, number>();
      subscribers?.forEach(s => {
        const browser = s.browser || "Other";
        counts.set(browser, (counts.get(browser) || 0) + 1);
      });

      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, users]) => ({ name, users }));
    },
    enabled: !!currentWebsite?.id,
  });

  // Fetch country distribution
  const { data: countryData } = useQuery({
    queryKey: ["analytics-countries", currentWebsite?.id],
    queryFn: async () => {
      if (!currentWebsite?.id) return [];

      const { data: subscribers, error } = await supabase
        .from("subscribers")
        .select("country")
        .eq("website_id", currentWebsite.id)
        .eq("status", "active");

      if (error) throw error;

      const counts = new Map<string, number>();
      subscribers?.forEach(s => {
        const country = s.country || "Unknown";
        counts.set(country, (counts.get(country) || 0) + 1);
      });

      const total = subscribers?.length || 1;
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([country, count]) => ({
          country,
          subscribers: count,
          percentage: Math.round((count / total) * 100),
        }));
    },
    enabled: !!currentWebsite?.id,
  });

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
            <p className="text-muted-foreground">
              Track your notification performance and subscriber insights
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Sent"
              value={notificationStats?.sent?.toLocaleString() || "0"}
              change={`${period} period`}
              changeType="neutral"
              icon={<Send className="w-6 h-6" />}
            />
            <StatsCard
              title="Delivery Rate"
              value={`${notificationStats?.deliveryRate || 0}%`}
              change="of notifications delivered"
              changeType="positive"
              icon={<TrendingUp className="w-6 h-6" />}
            />
            <StatsCard
              title="Click Rate"
              value={`${notificationStats?.clickRate || 0}%`}
              change="click-through rate"
              changeType={Number(notificationStats?.clickRate || 0) > 5 ? "positive" : "neutral"}
              icon={<MousePointer className="w-6 h-6" />}
            />
            <StatsCard
              title="New Subscribers"
              value={subscriberStats?.newCount?.toLocaleString() || "0"}
              change={`Total: ${subscriberStats?.total?.toLocaleString() || 0}`}
              changeType="positive"
              icon={<Users className="w-6 h-6" />}
            />
          </div>
        )}

        {/* Main Chart */}
        <div className="p-6 rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Performance Overview</h3>
              <p className="text-sm text-muted-foreground">
                Sent, delivered, and clicked notifications
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                Sent
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-success" />
                Delivered
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-warning" />
                Clicked
              </span>
            </div>
          </div>
          <div className="h-80">
            {timeSeriesData && timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClicked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 91%)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(214, 20%, 91%)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    stroke="hsl(199, 89%, 48%)"
                    strokeWidth={2}
                    fill="url(#colorSent)"
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    fill="url(#colorDelivered)"
                  />
                  <Area
                    type="monotone"
                    dataKey="clicked"
                    stroke="hsl(38, 92%, 50%)"
                    strokeWidth={2}
                    fill="url(#colorClicked)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available for this period
              </div>
            )}
          </div>
        </div>

        {/* Secondary Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Device Distribution */}
          <div className="p-6 rounded-xl bg-card border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-6">Device Distribution</h3>
            <div className="flex items-center gap-8">
              <div className="w-48 h-48">
                {deviceData && deviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(0, 0%, 100%)",
                          border: "1px solid hsl(214, 20%, 91%)",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No subscriber data
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-4">
                {(deviceData || []).map((device, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: device.color }}
                      />
                      <div className="flex items-center gap-2">
                        {device.name === "Desktop" && <Monitor className="w-4 h-4 text-muted-foreground" />}
                        {device.name === "Mobile" && <Smartphone className="w-4 h-4 text-muted-foreground" />}
                        {device.name === "Tablet" && <Smartphone className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-foreground">{device.name}</span>
                      </div>
                    </div>
                    <span className="font-semibold text-foreground">{device.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Browser Distribution */}
          <div className="p-6 rounded-xl bg-card border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-6">Browser Distribution</h3>
            <div className="h-48">
              {browserData && browserData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={browserData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 91%)" horizontal={false} />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(214, 20%, 91%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="users" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No subscriber data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="p-6 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Top Countries</h3>
          </div>
          {countryData && countryData.length > 0 ? (
            <div className="space-y-4">
              {countryData.map((country, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">{country.country}</span>
                    <span className="text-sm text-muted-foreground">
                      {country.subscribers.toLocaleString()} ({country.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-primary rounded-full transition-all duration-500"
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No geographic data available
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
