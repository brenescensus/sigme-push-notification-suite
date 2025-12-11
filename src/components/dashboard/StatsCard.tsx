import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all duration-300 hover-lift",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {change && (
            <p
              className={cn(
                "text-sm mt-2 font-medium",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}
