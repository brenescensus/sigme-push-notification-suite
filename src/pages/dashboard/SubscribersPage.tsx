// // src/pages/dashboard/SubscribersPage.tsx
// import { useState, useEffect } from "react";
// import {
//   Search,
//   Filter,
//   Download,
//   MoreHorizontal,
//   Chrome,
//   Smartphone,
//   Monitor,
//   Globe,
//   MapPin,
//   Send,
// } from "lucide-react";
// import DashboardLayout from "@/components/layout/DashboardLayout";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { TestNotificationDialog } from "@/components/subscribers/TestNotificationDialog";
// import { useWebsite } from "@/contexts/WebsiteContext";
// import { toast } from "@/hooks/use-toast";
// import { api } from "@/lib/api";

// interface Subscriber {
//   id: string;
//   browser: string | null;
//   device_type: string | null;
//   os: string | null;
//   country: string | null;
//   city: string | null;
//   platform: string | null;
//   created_at: string;
//   last_active_at: string | null;
//   status: string;
// }

// const getBrowserIcon = (browser: string | null) => {
//   switch (browser?.toLowerCase()) {
//     case "chrome":
//       return <Chrome className="w-4 h-4" />;
//     default:
//       return <Globe className="w-4 h-4" />;
//   }
// };

// const getDeviceIcon = (device: string | null) => {
//   switch (device?.toLowerCase()) {
//     case "mobile":
//       return <Smartphone className="w-4 h-4" />;
//     case "desktop":
//       return <Monitor className="w-4 h-4" />;
//     default:
//       return <Monitor className="w-4 h-4" />;
//   }
// };

// const formatDate = (dateString: string | null) => {
//   if (!dateString) return "N/A";
//   return new Date(dateString).toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// };

// const formatTime = (dateString: string | null) => {
//   if (!dateString) return "";
//   return new Date(dateString).toLocaleTimeString("en-US", {
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// };

// export default function SubscribersPage() {
//   const { currentWebsite } = useWebsite();
//   const [searchQuery, setSearchQuery] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [deviceFilter, setDeviceFilter] = useState("all");
//   const [testDialogOpen, setTestDialogOpen] = useState(false);
//   const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
//   const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
//   const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   // Load subscribers from your backend
//   useEffect(() => {
//     loadSubscribers();
//   }, [currentWebsite?.id]);

//   const loadSubscribers = async () => {
//     if (!currentWebsite?.id) {
//       setSubscribers([]);
//       setIsLoading(false);
//       return;
//     }

//     try {
//       setIsLoading(true);
//       const result = await api.subscribers.getAll(currentWebsite.id);
      
//       if (result.success) {
//         setSubscribers(result.subscribers || []);
//       } else {
//         throw new Error(result.error || 'Failed to load subscribers');
//       }
//     } catch (error: any) {
//       console.error('Failed to load subscribers:', error);
//       toast({
//         title: "Error",
//         description: error.message || "Failed to load subscribers",
//         variant: "destructive",
//       });
//       setSubscribers([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const filteredSubscribers = subscribers.filter((sub) => {
//     const matchesSearch =
//       (sub.country?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
//       (sub.city?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
//       (sub.browser?.toLowerCase() || '').includes(searchQuery.toLowerCase());
//     const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
//     const matchesDevice = deviceFilter === "all" || sub.device_type?.toLowerCase() === deviceFilter;
//     return matchesSearch && matchesStatus && matchesDevice;
//   });

//   const stats = {
//     total: subscribers.length,
//     active: subscribers.filter(s => s.status === 'active').length,
//     inactive: subscribers.filter(s => s.status === 'inactive').length,
//     unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length,
//   };

//   const handleSendTest = (subscriber: Subscriber) => {
//     setSelectedSubscriber(subscriber);
//     setTestDialogOpen(true);
//   };

//   const handleRemoveSubscriber = async (subscriber: Subscriber) => {
//     if (isDeleting) return;
    
//     if (!confirm(`Are you sure you want to remove this subscriber?`)) {
//       return;
//     }

//     setIsDeleting(subscriber.id);
    
//     try {
//       const result = await api.subscribers.delete(subscriber.id);
      
//       if (result.success) {
//         toast({
//           title: "Subscriber removed",
//           description: "The subscriber has been removed successfully.",
//         });
//         // Remove from local state
//         setSubscribers(prev => prev.filter(s => s.id !== subscriber.id));
//       } else {
//         throw new Error(result.error || 'Failed to remove subscriber');
//       }
//     } catch (err: any) {
//       console.error('Failed to remove subscriber:', err);
//       toast({
//         title: "Error",
//         description: err.message || "Failed to remove subscriber",
//         variant: "destructive",
//       });
//     } finally {
//       setIsDeleting(null);
//     }
//   };

//   const handleExportCSV = () => {
//     if (subscribers.length === 0) {
//       toast({
//         title: "No data",
//         description: "No subscribers to export",
//         variant: "destructive",
//       });
//       return;
//     }

//     const headers = ['ID', 'Browser', 'Device', 'OS', 'Country', 'City', 'Status', 'Subscribed', 'Last Active'];
//     const rows = subscribers.map(sub => [
//       sub.id,
//       sub.browser || '',
//       sub.device_type || '',
//       sub.os || '',
//       sub.country || '',
//       sub.city || '',
//       sub.status,
//       sub.created_at,
//       sub.last_active_at || ''
//     ]);

//     const csvContent = [
//       headers.join(','),
//       ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
//     ].join('\n');

//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `subscribers-${currentWebsite?.name || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
//     a.click();
//     URL.revokeObjectURL(url);

//     toast({
//       title: "Export successful",
//       description: `Exported ${subscribers.length} subscribers`,
//     });
//   };

//   return (
//     <DashboardLayout>
//       <div className="space-y-6">
//         {/* Header */}
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//           <div>
//             <h1 className="text-3xl font-bold">Subscribers</h1>
//             <p className="text-muted-foreground">
//               Manage your push notification subscribers
//             </p>
//           </div>
//           <Button variant="outline" onClick={handleExportCSV}>
//             <Download className="w-4 h-4 mr-2" />
//             Export CSV
//           </Button>
//         </div>

//         {/* Filters */}
//         <div className="flex flex-col sm:flex-row gap-4">
//           <div className="relative flex-1">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//             <Input
//               placeholder="Search by location, browser..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="pl-9"
//             />
//           </div>
//           <div className="flex gap-3">
//             <Select value={statusFilter} onValueChange={setStatusFilter}>
//               <SelectTrigger className="w-36">
//                 <Filter className="w-4 h-4 mr-2" />
//                 <SelectValue placeholder="Status" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Status</SelectItem>
//                 <SelectItem value="active">Active</SelectItem>
//                 <SelectItem value="inactive">Inactive</SelectItem>
//                 <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
//               </SelectContent>
//             </Select>
//             <Select value={deviceFilter} onValueChange={setDeviceFilter}>
//               <SelectTrigger className="w-36">
//                 <SelectValue placeholder="Device" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Devices</SelectItem>
//                 <SelectItem value="desktop">Desktop</SelectItem>
//                 <SelectItem value="mobile">Mobile</SelectItem>
//                 <SelectItem value="tablet">Tablet</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         {/* Stats Row */}
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           <div className="p-4 rounded-lg bg-card border border-border/50">
//             <p className="text-2xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
//             <p className="text-sm text-muted-foreground">Total Subscribers</p>
//           </div>
//           <div className="p-4 rounded-lg bg-card border border-border/50">
//             <p className="text-2xl font-bold text-success">{stats.active.toLocaleString()}</p>
//             <p className="text-sm text-muted-foreground">Active</p>
//           </div>
//           <div className="p-4 rounded-lg bg-card border border-border/50">
//             <p className="text-2xl font-bold text-warning">{stats.inactive.toLocaleString()}</p>
//             <p className="text-sm text-muted-foreground">Inactive</p>
//           </div>
//           <div className="p-4 rounded-lg bg-card border border-border/50">
//             <p className="text-2xl font-bold text-muted-foreground">{stats.unsubscribed.toLocaleString()}</p>
//             <p className="text-sm text-muted-foreground">Unsubscribed</p>
//           </div>
//         </div>

//         {/* Subscribers Table */}
//         <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="border-b border-border bg-muted/30">
//                   <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
//                     Subscriber
//                   </th>
//                   <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
//                     Location
//                   </th>
//                   <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
//                     Subscribed
//                   </th>
//                   <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
//                     Last Active
//                   </th>
//                   <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
//                     Status
//                   </th>
//                   <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
//                     Actions
//                   </th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {isLoading ? (
//                   <tr>
//                     <td colSpan={6} className="py-8 text-center text-muted-foreground">
//                       Loading subscribers...
//                     </td>
//                   </tr>
//                 ) : filteredSubscribers.length === 0 ? (
//                   <tr>
//                     <td colSpan={6} className="py-8 text-center text-muted-foreground">
//                       {subscribers.length === 0 ? 'No subscribers yet' : 'No subscribers match your filters'}
//                     </td>
//                   </tr>
//                 ) : (
//                   filteredSubscribers.map((subscriber) => (
//                     <tr
//                       key={subscriber.id}
//                       className="border-b border-border/50 hover:bg-muted/20 transition-colors"
//                     >
//                       <td className="py-4 px-6">
//                         <div className="flex items-center gap-3">
//                           <div className="flex items-center gap-2">
//                             <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-primary">
//                               {getDeviceIcon(subscriber.device_type)}
//                             </div>
//                             <div>
//                               <div className="flex items-center gap-2">
//                                 {getBrowserIcon(subscriber.browser)}
//                                 <span className="text-sm font-medium text-foreground">
//                                   {subscriber.browser || 'Unknown'}
//                                 </span>
//                               </div>
//                               <p className="text-xs text-muted-foreground">
//                                 {subscriber.device_type || 'Unknown'} • {subscriber.os || 'Unknown'}
//                               </p>
//                             </div>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="py-4 px-6">
//                         <div className="flex items-center gap-2">
//                           <MapPin className="w-4 h-4 text-muted-foreground" />
//                           <div>
//                             <p className="text-sm font-medium text-foreground">{subscriber.city || 'Unknown'}</p>
//                             <p className="text-xs text-muted-foreground">{subscriber.country || 'Unknown'}</p>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="py-4 px-6">
//                         <p className="text-sm text-foreground">{formatDate(subscriber.created_at)}</p>
//                         <p className="text-xs text-muted-foreground">{formatTime(subscriber.created_at)}</p>
//                       </td>
//                       <td className="py-4 px-6">
//                         <p className="text-sm text-foreground">{formatDate(subscriber.last_active_at)}</p>
//                         <p className="text-xs text-muted-foreground">{formatTime(subscriber.last_active_at)}</p>
//                       </td>
//                       <td className="py-4 px-6">
//                         <span
//                           className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
//                             subscriber.status === "active"
//                               ? "bg-success/10 text-success"
//                               : subscriber.status === "inactive"
//                               ? "bg-warning/10 text-warning"
//                               : "bg-muted text-muted-foreground"
//                           }`}
//                         >
//                           {subscriber.status.charAt(0).toUpperCase() + subscriber.status.slice(1)}
//                         </span>
//                       </td>
//                       <td className="py-4 px-6 text-right">
//                         <DropdownMenu>
//                           <DropdownMenuTrigger asChild>
//                             <Button variant="ghost" size="sm">
//                               <MoreHorizontal className="w-4 h-4" />
//                             </Button>
//                           </DropdownMenuTrigger>
//                           <DropdownMenuContent align="end">
//                             <DropdownMenuItem onClick={() => handleSendTest(subscriber)}>
//                               <Send className="w-4 h-4 mr-2" />
//                               Send Test Notification
//                             </DropdownMenuItem>
//                             <DropdownMenuItem 
//                               className="text-destructive"
//                               disabled={isDeleting === subscriber.id}
//                               onClick={() => handleRemoveSubscriber(subscriber)}
//                             >
//                               {isDeleting === subscriber.id ? "Removing..." : "Remove"}
//                             </DropdownMenuItem>
//                           </DropdownMenuContent>
//                         </DropdownMenu>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination */}
//           <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
//             <p className="text-sm text-muted-foreground">
//               Showing {filteredSubscribers.length} of {subscribers.length} subscribers
//             </p>
//           </div>
//         </div>
//       </div>

//       {currentWebsite && (
//         <TestNotificationDialog
//           subscriber={selectedSubscriber}
//           websiteId={currentWebsite.id}
//           open={testDialogOpen}
//           onOpenChange={setTestDialogOpen}
//         />
//       )}
//     </DashboardLayout>
//   );
// }















// src/pages/dashboard/SubscribersPage.tsx
import { useState, useEffect } from "react";
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
  AlertCircle,
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
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";

interface Subscriber {
  id: string;
  browser: string | null;
  device_type: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  platform: string | null;
  created_at: string;
  last_seen_at: string | null;
  status: string;
  website_id: string; // Added to verify website association
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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reload subscribers when website changes
  useEffect(() => {
    loadSubscribers();
  }, [currentWebsite?.id]);

  const loadSubscribers = async () => {
    if (!currentWebsite?.id) {
      setSubscribers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('📥 Loading subscribers for website:', currentWebsite.id, currentWebsite.name);
      
      const result = await api.subscribers.getAll(currentWebsite.id);
      
      if (result.success) {
        // Double-check that all subscribers belong to this website
        const filteredSubs = (result.subscribers || []).filter(
          sub => sub.website_id === currentWebsite.id
        );
        
        console.log(`Loaded ${filteredSubs.length} subscribers for ${currentWebsite.name}`);
        setSubscribers(filteredSubs);
      } else {
        throw new Error(result.error || 'Failed to load subscribers');
      }
    } catch (error: any) {
      console.error('Failed to load subscribers:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load subscribers",
        variant: "destructive",
      });
      setSubscribers([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleRemoveSubscriber = async (subscriber: Subscriber) => {
    if (isDeleting) return;
    
    if (!confirm(`Are you sure you want to remove this subscriber?`)) {
      return;
    }

    setIsDeleting(subscriber.id);
    
    try {
      const result = await api.subscribers.delete(subscriber.id);
      
      if (result.success) {
        toast({
          title: "Subscriber removed",
          description: "The subscriber has been removed successfully.",
        });
        // Remove from local state
        setSubscribers(prev => prev.filter(s => s.id !== subscriber.id));
      } else {
        throw new Error(result.error || 'Failed to remove subscriber');
      }
    } catch (err: any) {
      console.error('Failed to remove subscriber:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to remove subscriber",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      toast({
        title: "No data",
        description: "No subscribers to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['ID', 'Browser', 'Device', 'OS', 'Country', 'City', 'Status', 'Subscribed', 'Last Seen'];
    const rows = subscribers.map(sub => [
      sub.id,
      sub.browser || '',
      sub.device_type || '',
      sub.os || '',
      sub.country || '',
      sub.city || '',
      sub.status,
      sub.created_at,
      sub.last_seen_at || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${currentWebsite?.name || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${subscribers.length} subscribers from ${currentWebsite?.name}`,
    });
  };

  // No website selected state
  if (!currentWebsite) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Website Selected</h2>
            <p className="text-muted-foreground mb-6">
              Please select a website to view its subscribers, or add a new website to get started.
            </p>
            <Button variant="hero" asChild>
              <Link to="/dashboard/websites">View Websites</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Website Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Subscribers</h1>
            <p className="text-muted-foreground">
              Managing subscribers for <span className="font-medium text-foreground">{currentWebsite.name}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {currentWebsite.url}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={subscribers.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/websites">
                Switch Website
              </Link>
            </Button>
          </div>
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
                    Last Seen
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
                      Loading subscribers for {currentWebsite.name}...
                    </td>
                  </tr>
                ) : filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="text-muted-foreground">
                        {subscribers.length === 0 ? (
                          <>
                            <p className="mb-2">No subscribers yet for {currentWebsite.name}</p>
                            <p className="text-sm">
                              Share your website URL to start collecting subscribers!
                            </p>
                          </>
                        ) : (
                          'No subscribers match your filters'
                        )}
                      </div>
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
                        <p className="text-sm text-foreground">{formatDate(subscriber.last_seen_at)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(subscriber.last_seen_at)}</p>
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
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSendTest(subscriber)}>
                              <Send className="w-4 h-4 mr-2" />
                              Send Test Notification
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              disabled={isDeleting === subscriber.id}
                              onClick={() => handleRemoveSubscriber(subscriber)}
                            >
                              {isDeleting === subscriber.id ? "Removing..." : "Remove"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Showing {filteredSubscribers.length} of {subscribers.length} subscribers for {currentWebsite.name}
            </p>
          </div>
        </div>
      </div>

      <TestNotificationDialog
        subscriber={selectedSubscriber}
        websiteId={currentWebsite.id}
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
      />
    </DashboardLayout>
  );
}
