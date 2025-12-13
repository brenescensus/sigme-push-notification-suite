/**
 * DevicePreview Component
 * 
 * Real-time notification preview across multiple device types:
 * - iPhone (iOS)
 * - Android (Samsung Galaxy)
 * - MacOS
 * - Windows
 * 
 * All device frames are minimalist, elegant outlines that match
 * real device proportions and notification styling.
 */

import { Bell, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationContent {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
  buttons?: { label: string; url: string }[];
}

interface DevicePreviewProps {
  content: NotificationContent;
  className?: string;
}

// iPhone 15 Pro style notification
function IPhonePreview({ content }: { content: NotificationContent }) {
  return (
    <div className="relative w-[280px] mx-auto">
      {/* iPhone Frame */}
      <div className="relative bg-foreground/5 rounded-[3rem] p-3 border-4 border-foreground/10 shadow-xl">
        {/* Dynamic Island */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-8 bg-foreground rounded-full" />
        
        {/* Screen */}
        <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 rounded-[2.5rem] h-[520px] overflow-hidden relative">
          {/* Status bar */}
          <div className="flex items-center justify-between px-8 pt-4 text-[10px] font-semibold text-foreground/70">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-foreground/70 rounded-sm" />
            </div>
          </div>
          
          {/* Lock screen time */}
          <div className="text-center mt-20">
            <div className="text-6xl font-light text-foreground/90 tracking-tight">9:41</div>
            <div className="text-sm text-foreground/50 mt-1">Friday, December 13</div>
          </div>
          
          {/* Notification Card */}
          <div className="absolute bottom-24 left-4 right-4">
            <div className="bg-background/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-border/30">
              <div className="flex items-start gap-3">
                {content.icon ? (
                  <img src={content.icon} alt="" className="w-10 h-10 rounded-xl" />
                ) : (
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">SIGME</span>
                    <span className="text-[10px] text-muted-foreground">now</span>
                  </div>
                  <p className="font-semibold text-sm text-foreground mt-0.5 truncate">
                    {content.title || "Notification Title"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {content.body || "Your notification message will appear here..."}
                  </p>
                </div>
              </div>
              {content.image && (
                <img 
                  src={content.image} 
                  alt="" 
                  className="w-full h-32 object-cover rounded-lg mt-3" 
                />
              )}
              {content.buttons && content.buttons.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {content.buttons.slice(0, 2).map((btn, i) => (
                    <button 
                      key={i}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/30 rounded-full" />
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4 font-medium">iPhone 15 Pro</p>
    </div>
  );
}

// Samsung Galaxy S24 style notification
function AndroidPreview({ content }: { content: NotificationContent }) {
  return (
    <div className="relative w-[280px] mx-auto">
      {/* Android Frame */}
      <div className="relative bg-foreground/5 rounded-[2.5rem] p-3 border-4 border-foreground/10 shadow-xl">
        {/* Punch hole camera */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-foreground rounded-full" />
        
        {/* Screen */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2rem] h-[520px] overflow-hidden relative">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 text-[10px] font-medium text-white/70">
            <span>9:41</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-1 h-2 bg-white/70 rounded-sm" />
                <div className="w-1 h-3 bg-white/70 rounded-sm" />
                <div className="w-1 h-4 bg-white/70 rounded-sm" />
              </div>
              <div className="w-4 h-2 bg-white/70 rounded-sm" />
            </div>
          </div>
          
          {/* Lock screen */}
          <div className="text-center mt-24">
            <div className="text-7xl font-thin text-white tracking-tight">9:41</div>
            <div className="text-sm text-white/50 mt-1">Fri, Dec 13</div>
          </div>
          
          {/* Notification Card - Android Material You style */}
          <div className="absolute bottom-20 left-4 right-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                {content.icon ? (
                  <img src={content.icon} alt="" className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                    <Bell className="w-6 h-6 text-primary-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Sigme • now</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="font-semibold text-sm text-slate-900 mt-1 truncate">
                    {content.title || "Notification Title"}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                    {content.body || "Your notification message will appear here..."}
                  </p>
                </div>
              </div>
              {content.image && (
                <img 
                  src={content.image} 
                  alt="" 
                  className="w-full h-28 object-cover rounded-2xl mt-3" 
                />
              )}
              {content.buttons && content.buttons.length > 0 && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                  {content.buttons.slice(0, 2).map((btn, i) => (
                    <button 
                      key={i}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-primary rounded-full bg-primary/10"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Navigation bar */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-8">
            <div className="w-4 h-4 border-2 border-white/30 rounded" />
            <div className="w-4 h-4 border-2 border-white/30 rounded-full" />
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-white/30" />
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4 font-medium">Samsung Galaxy S24</p>
    </div>
  );
}

// MacOS Sonoma style notification
function MacOSPreview({ content }: { content: NotificationContent }) {
  return (
    <div className="relative w-[420px] mx-auto">
      {/* MacBook Frame */}
      <div className="relative bg-foreground/5 rounded-xl p-2 border-4 border-foreground/10 shadow-xl">
        {/* Notch / Camera */}
        <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-16 h-4 bg-foreground/80 rounded-b-lg flex items-center justify-center">
          <div className="w-2 h-2 bg-foreground/40 rounded-full" />
        </div>
        
        {/* Screen */}
        <div className="bg-gradient-to-br from-purple-900/80 via-blue-900/80 to-teal-800/80 rounded-lg h-[280px] overflow-hidden relative">
          {/* Menu bar */}
          <div className="flex items-center justify-between px-4 pt-1.5 text-[10px] font-medium text-white/90">
            <div className="flex items-center gap-4">
              <span className="text-base"></span>
              <span className="font-semibold">Finder</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Fri 9:41 AM</span>
            </div>
          </div>
          
          {/* Desktop icons - subtle */}
          <div className="absolute top-10 right-4 space-y-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg" />
            <div className="w-12 h-12 bg-white/10 rounded-lg" />
          </div>
          
          {/* Notification - top right banner */}
          <div className="absolute top-10 right-4 w-80">
            <div className="bg-white/95 backdrop-blur-2xl rounded-2xl p-3 shadow-2xl border border-white/20">
              <div className="flex items-start gap-3">
                {content.icon ? (
                  <img src={content.icon} alt="" className="w-10 h-10 rounded-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-900">SIGME</span>
                    <span className="text-[10px] text-slate-400">now</span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 mt-0.5 truncate">
                    {content.title || "Notification Title"}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                    {content.body || "Your notification message will appear here..."}
                  </p>
                </div>
                <button className="p-1 hover:bg-slate-100 rounded-full">
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
              {content.buttons && content.buttons.length > 0 && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                  {content.buttons.slice(0, 2).map((btn, i) => (
                    <button 
                      key={i}
                      className="px-3 py-1 text-[11px] font-medium text-primary bg-primary/10 rounded-md"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Dock */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1.5 bg-white/20 backdrop-blur-xl rounded-2xl">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-8 h-8 bg-white/30 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      
      {/* MacBook Base */}
      <div className="h-3 bg-foreground/10 rounded-b-lg mx-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-foreground/20 rounded-b-lg" />
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4 font-medium">macOS Sonoma</p>
    </div>
  );
}

// Windows 11 style notification
function WindowsPreview({ content }: { content: NotificationContent }) {
  return (
    <div className="relative w-[420px] mx-auto">
      {/* Windows Frame */}
      <div className="relative bg-foreground/5 rounded-lg p-2 border-4 border-foreground/10 shadow-xl">
        {/* Screen */}
        <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded h-[280px] overflow-hidden relative">
          {/* Desktop */}
          <div className="absolute top-4 left-4 grid grid-cols-1 gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 bg-white/20 rounded" />
              <span className="text-[9px] text-white/80">Recycle Bin</span>
            </div>
          </div>
          
          {/* Notification - Windows 11 style */}
          <div className="absolute top-4 right-4 w-80">
            <div className="bg-slate-800/95 backdrop-blur-2xl rounded-lg p-4 shadow-2xl border border-white/10">
              <div className="flex items-start gap-3">
                {content.icon ? (
                  <img src={content.icon} alt="" className="w-10 h-10 rounded" />
                ) : (
                  <div className="w-10 h-10 rounded gradient-primary flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/60">Sigme</span>
                    <span className="text-[10px] text-white/40">just now</span>
                  </div>
                  <p className="font-semibold text-sm text-white mt-1 truncate">
                    {content.title || "Notification Title"}
                  </p>
                  <p className="text-xs text-white/70 mt-0.5 line-clamp-2">
                    {content.body || "Your notification message will appear here..."}
                  </p>
                </div>
                <button className="p-1 hover:bg-white/10 rounded">
                  <X className="w-3 h-3 text-white/50" />
                </button>
              </div>
              {content.buttons && content.buttons.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {content.buttons.slice(0, 2).map((btn, i) => (
                    <button 
                      key={i}
                      className={cn(
                        "flex-1 px-3 py-1.5 text-xs font-medium rounded",
                        i === 0 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-white/10 text-white hover:bg-white/20"
                      )}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Taskbar */}
          <div className="absolute bottom-0 left-0 right-0 h-11 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center gap-2 px-4">
            <div className="absolute left-4 flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 bg-white/10 rounded" />
              ))}
            </div>
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 h-8 bg-white/10 rounded" />
              ))}
            </div>
            <div className="absolute right-4 text-[10px] text-white/70">
              9:41 AM
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4 font-medium">Windows 11</p>
    </div>
  );
}

// Main component with device selector
export default function DevicePreview({ content, className }: DevicePreviewProps) {
  return (
    <div className={cn("p-4", className)}>
      <IPhonePreview content={content} />
    </div>
  );
}

// Export individual device previews for flexible use
export { IPhonePreview, AndroidPreview, MacOSPreview, WindowsPreview };
export type { NotificationContent };
