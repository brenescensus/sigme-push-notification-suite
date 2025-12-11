import { Users, Send, MousePointer, TrendingUp, Bell, Zap } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const chartData = [
  { name: "Mon", subscribers: 2400, notifications: 1800 },
  { name: "Tue", subscribers: 2600, notifications: 2200 },
  { name: "Wed", subscribers: 2900, notifications: 2400 },
  { name: "Thu", subscribers: 3100, notifications: 2100 },
  { name: "Fri", subscribers: 3400, notifications: 2800 },
  { name: "Sat", subscribers: 3200, notifications: 2600 },
  { name: "Sun", subscribers: 3600, notifications: 3000 },
];

const recentCampaigns = [
  { id: 1, name: "Welcome Series", sent: 12450, clicked: 3420, status: "completed" },
  { id: 2, name: "Flash Sale Alert", sent: 8900, clicked: 2100, status: "completed" },
  { id: 3, name: "Weekly Newsletter", sent: 15200, clicked: 4500, status: "active" },
  { id: 4, name: "Product Launch", sent: 0, clicked: 0, status: "scheduled" },
];

export default function DashboardOverview() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome back, John!</h2>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your notifications today.
            </p>
          </div>
          <Button variant="hero" asChild>
            <Link to="/dashboard/campaigns">
              <Send className="w-4 h-4" />
              New Campaign
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Subscribers"
            value="24,892"
            change="+12.5% from last month"
            changeType="positive"
            icon={<Users className="w-6 h-6" />}
          />
          <StatsCard
            title="Notifications Sent"
            value="142,350"
            change="+8.2% from last month"
            changeType="positive"
            icon={<Send className="w-6 h-6" />}
          />
          <StatsCard
            title="Click Rate"
            value="24.8%"
            change="-2.1% from last month"
            changeType="negative"
            icon={<MousePointer className="w-6 h-6" />}
          />
          <StatsCard
            title="Engagement Score"
            value="8.9"
            change="No change"
            changeType="neutral"
            icon={<TrendingUp className="w-6 h-6" />}
          />
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Subscribers Chart */}
          <div className="p-6 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Subscriber Growth</h3>
                <p className="text-sm text-muted-foreground">Last 7 days</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Subscribers</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
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
                    dataKey="subscribers"
                    stroke="hsl(199, 89%, 48%)"
                    strokeWidth={2}
                    fill="url(#colorSubscribers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Notifications Chart */}
          <div className="p-6 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Notifications Sent</h3>
                <p className="text-sm text-muted-foreground">Last 7 days</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-success" />
                <span className="text-muted-foreground">Sent</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                  <Line
                    type="monotone"
                    dataKey="notifications"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(142, 71%, 45%)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="p-6 rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Recent Campaigns</h3>
              <p className="text-sm text-muted-foreground">Your latest notification campaigns</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/campaigns">View All</Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Campaign
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Sent
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Clicked
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    CTR
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                          <Bell className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{campaign.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {campaign.sent.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {campaign.clicked.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {campaign.sent > 0 ? `${((campaign.clicked / campaign.sent) * 100).toFixed(1)}%` : "-"}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          campaign.status === "completed"
                            ? "bg-muted text-muted-foreground"
                            : campaign.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/dashboard/campaigns"
            className="group p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all duration-300 hover-lift"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Send className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Create Campaign</h4>
                <p className="text-sm text-muted-foreground">Send a new notification</p>
              </div>
            </div>
          </Link>

          <Link
            to="/dashboard/subscribers"
            className="group p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all duration-300 hover-lift"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-success" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Manage Subscribers</h4>
                <p className="text-sm text-muted-foreground">View and segment users</p>
              </div>
            </div>
          </Link>

          <Link
            to="/dashboard/api-keys"
            className="group p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all duration-300 hover-lift"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Integration</h4>
                <p className="text-sm text-muted-foreground">Get your API keys</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
