import { useState } from "react";
import {
  User,
  Building,
  Bell,
  Shield,
  Users,
  CreditCard,
  Trash2,
  Save,
  Upload,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    pushFailed: true,
    weeklyReport: true,
    campaignComplete: false,
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="rounded-xl bg-card border border-border/50 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Profile Information</h3>
              
              <div className="flex items-start gap-6 mb-6">
                <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  JD
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="john@example.com" />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button variant="hero">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>

            <div className="rounded-xl bg-card border border-border/50 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Password</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Update your password to keep your account secure
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div></div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button variant="outline">Update Password</Button>
              </div>
            </div>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-6">
            <div className="rounded-xl bg-card border border-border/50 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Organization Details</h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" defaultValue="Acme Inc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input id="website" defaultValue="https://acme.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
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

              <div className="flex justify-end mt-6">
                <Button variant="hero">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="rounded-xl bg-card border border-border/50 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Email Notifications</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">Weekly Analytics Report</p>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of your notification performance
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReport}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, weeklyReport: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">Push Failure Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when there are delivery issues
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushFailed}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, pushFailed: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">Campaign Completed</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when campaigns finish sending
                    </p>
                  </div>
                  <Switch
                    checked={notifications.campaignComplete}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, campaignComplete: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <div className="rounded-xl bg-card border border-border/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
                  <p className="text-sm text-muted-foreground">Manage who has access to your account</p>
                </div>
                <Button variant="hero">
                  <Users className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: "John Doe", email: "john@example.com", role: "Admin" },
                  { name: "Jane Smith", email: "jane@example.com", role: "Editor" },
                  { name: "Bob Wilson", email: "bob@example.com", role: "Viewer" },
                ].map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-medium text-accent-foreground">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select defaultValue={member.role.toLowerCase()}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="rounded-xl bg-card border border-border/50 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Current Plan</h3>
              
              <div className="p-4 rounded-lg gradient-primary text-primary-foreground mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">You're currently on the</p>
                    <p className="text-2xl font-bold">Pro Plan</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">$49</p>
                    <p className="text-sm opacity-90">per month</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Subscribers Used</p>
                  <p className="text-2xl font-bold text-foreground">24,892 / 50,000</p>
                  <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div className="h-full gradient-primary rounded-full" style={{ width: "50%" }} />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Notifications This Month</p>
                  <p className="text-2xl font-bold text-foreground">142,350 / 500,000</p>
                  <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div className="h-full gradient-primary rounded-full" style={{ width: "28%" }} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline">View Plans</Button>
                <Button variant="hero">Upgrade Plan</Button>
              </div>
            </div>

            <div className="rounded-xl bg-card border border-border/50 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Payment Method</h3>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-8 rounded bg-foreground/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline">Update Card</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
