import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Send,
  MousePointer,
  Globe,
  Smartphone,
  Monitor,
  Chrome,
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const overviewData = [
  { name: "Jan 1", sent: 4200, delivered: 4100, clicked: 1200 },
  { name: "Jan 5", sent: 4800, delivered: 4650, clicked: 1400 },
  { name: "Jan 9", sent: 5100, delivered: 4950, clicked: 1600 },
  { name: "Jan 13", sent: 5500, delivered: 5300, clicked: 1850 },
  { name: "Jan 17", sent: 6200, delivered: 6000, clicked: 2100 },
  { name: "Jan 21", sent: 5800, delivered: 5600, clicked: 1900 },
  { name: "Jan 25", sent: 6500, delivered: 6300, clicked: 2200 },
];

const deviceData = [
  { name: "Desktop", value: 45, color: "hsl(199, 89%, 48%)" },
  { name: "Mobile", value: 42, color: "hsl(142, 71%, 45%)" },
  { name: "Tablet", value: 13, color: "hsl(38, 92%, 50%)" },
];

const browserData = [
  { name: "Chrome", users: 12500 },
  { name: "Safari", users: 6200 },
  { name: "Firefox", users: 3100 },
  { name: "Edge", users: 2100 },
  { name: "Other", users: 992 },
];

const countryData = [
  { country: "United States", subscribers: 8450, percentage: 34 },
  { country: "United Kingdom", subscribers: 4200, percentage: 17 },
  { country: "Germany", subscribers: 3100, percentage: 12 },
  { country: "France", subscribers: 2400, percentage: 10 },
  { country: "Canada", subscribers: 2100, percentage: 8 },
  { country: "Others", subscribers: 4642, percentage: 19 },
];

const hourlyData = [
  { hour: "00", clicks: 120 },
  { hour: "02", clicks: 80 },
  { hour: "04", clicks: 45 },
  { hour: "06", clicks: 90 },
  { hour: "08", clicks: 280 },
  { hour: "10", clicks: 420 },
  { hour: "12", clicks: 380 },
  { hour: "14", clicks: 450 },
  { hour: "16", clicks: 520 },
  { hour: "18", clicks: 480 },
  { hour: "20", clicks: 350 },
  { hour: "22", clicks: 220 },
];

export default function AnalyticsPage() {
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
          <Select defaultValue="7d">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Sent"
            value="38,100"
            change="+15.3% vs last period"
            changeType="positive"
            icon={<Send className="w-6 h-6" />}
          />
          <StatsCard
            title="Delivery Rate"
            value="96.8%"
            change="+0.5% vs last period"
            changeType="positive"
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <StatsCard
            title="Click Rate"
            value="28.4%"
            change="-1.2% vs last period"
            changeType="negative"
            icon={<MousePointer className="w-6 h-6" />}
          />
          <StatsCard
            title="New Subscribers"
            value="1,245"
            change="+8.7% vs last period"
            changeType="positive"
            icon={<Users className="w-6 h-6" />}
          />
        </div>

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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overviewData}>
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
          </div>
        </div>

        {/* Secondary Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Device Distribution */}
          <div className="p-6 rounded-xl bg-card border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-6">Device Distribution</h3>
            <div className="flex items-center gap-8">
              <div className="w-48 h-48">
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
              </div>
              <div className="flex-1 space-y-4">
                {deviceData.map((device, index) => (
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
            </div>
          </div>
        </div>

        {/* Geographic & Time Distribution */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Countries */}
          <div className="p-6 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Top Countries</h3>
            </div>
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
          </div>

          {/* Click Activity by Hour */}
          <div className="p-6 rounded-xl bg-card border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-6">Click Activity by Hour</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 91%)" />
                  <XAxis
                    dataKey="hour"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 10 }}
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
                    }}
                  />
                  <Bar dataKey="clicks" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
