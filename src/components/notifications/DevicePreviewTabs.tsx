/**
 * DevicePreviewTabs Component
 * 
 * A tabbed interface for switching between different device previews.
 * Shows how push notifications will appear across iOS, Android, macOS, and Windows.
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Monitor, Laptop } from "lucide-react";
import { 
  IPhonePreview, 
  AndroidPreview, 
  MacOSPreview, 
  WindowsPreview,
  NotificationContent 
} from "./DevicePreview";
import { cn } from "@/lib/utils";

interface DevicePreviewTabsProps {
  content: NotificationContent;
  className?: string;
}

export default function DevicePreviewTabs({ content, className }: DevicePreviewTabsProps) {
  const [activeDevice, setActiveDevice] = useState("iphone");

  return (
    <div className={cn("", className)}>
      <Tabs value={activeDevice} onValueChange={setActiveDevice} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="iphone" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">iOS</span>
          </TabsTrigger>
          <TabsTrigger value="android" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Android</span>
          </TabsTrigger>
          <TabsTrigger value="macos" className="flex items-center gap-2">
            <Laptop className="w-4 h-4" />
            <span className="hidden sm:inline">macOS</span>
          </TabsTrigger>
          <TabsTrigger value="windows" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Windows</span>
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[600px] flex items-start justify-center py-4 bg-secondary/30 rounded-2xl border border-border/30">
          <TabsContent value="iphone" className="mt-0 animate-fade-in">
            <IPhonePreview content={content} />
          </TabsContent>
          
          <TabsContent value="android" className="mt-0 animate-fade-in">
            <AndroidPreview content={content} />
          </TabsContent>
          
          <TabsContent value="macos" className="mt-0 animate-fade-in">
            <MacOSPreview content={content} />
          </TabsContent>
          
          <TabsContent value="windows" className="mt-0 animate-fade-in">
            <WindowsPreview content={content} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
