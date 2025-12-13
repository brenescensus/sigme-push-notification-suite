/**
 * RecurringScheduler Component
 * 
 * Advanced scheduling interface supporting:
 * - One-time notifications (immediate or scheduled)
 * - Recurring notifications (daily, weekly, monthly, custom)
 * - Variable recurrence patterns
 * - Timezone support
 */

import { useState } from "react";
import { Send, Calendar, Clock, Repeat, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ScheduleConfig {
  type: "immediate" | "scheduled" | "recurring";
  date?: string;
  time?: string;
  timezone?: string;
  recurrence?: {
    pattern: "daily" | "weekly" | "monthly" | "custom";
    interval: number; // Every X days/weeks/months
    daysOfWeek?: number[]; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    endDate?: string;
    maxOccurrences?: number;
  };
}

interface RecurringSchedulerProps {
  value: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void;
  className?: string;
}

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (EST/EDT)" },
  { value: "America/Chicago", label: "Central Time (CST/CDT)" },
  { value: "America/Denver", label: "Mountain Time (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Paris", label: "CET (Paris)" },
  { value: "Europe/Berlin", label: "CET (Berlin)" },
  { value: "Asia/Tokyo", label: "JST (Tokyo)" },
  { value: "Asia/Shanghai", label: "CST (Shanghai)" },
  { value: "Asia/Dubai", label: "GST (Dubai)" },
  { value: "Australia/Sydney", label: "AEST (Sydney)" },
];

const daysOfWeek = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function RecurringScheduler({ 
  value, 
  onChange, 
  className 
}: RecurringSchedulerProps) {
  const [isRecurring, setIsRecurring] = useState(value.type === "recurring");

  const handleTypeChange = (type: "immediate" | "scheduled") => {
    if (isRecurring && type === "scheduled") {
      onChange({ ...value, type: "recurring" });
    } else {
      onChange({ ...value, type });
    }
  };

  const handleRecurringToggle = (enabled: boolean) => {
    setIsRecurring(enabled);
    if (enabled) {
      onChange({
        ...value,
        type: "recurring",
        recurrence: {
          pattern: "daily",
          interval: 1,
        },
      });
    } else {
      onChange({
        ...value,
        type: value.date ? "scheduled" : "immediate",
        recurrence: undefined,
      });
    }
  };

  const handleRecurrencePatternChange = (pattern: string) => {
    const recurrence = value.recurrence || { pattern: "daily", interval: 1 };
    onChange({
      ...value,
      recurrence: {
        ...recurrence,
        pattern: pattern as "daily" | "weekly" | "monthly" | "custom",
        daysOfWeek: pattern === "weekly" ? [1] : undefined, // Default to Monday
        dayOfMonth: pattern === "monthly" ? 1 : undefined,
      },
    });
  };

  const toggleDayOfWeek = (day: number) => {
    const currentDays = value.recurrence?.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort();
    
    onChange({
      ...value,
      recurrence: {
        ...value.recurrence!,
        daysOfWeek: newDays.length > 0 ? newDays : [day], // At least one day required
      },
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Schedule Type Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant={value.type === "immediate" && !isRecurring ? "hero" : "outline"}
            className={cn(
              "flex-1 h-24 flex-col gap-2 transition-all duration-300",
              value.type === "immediate" && !isRecurring && "ring-2 ring-primary/20"
            )}
            onClick={() => {
              setIsRecurring(false);
              handleTypeChange("immediate");
            }}
          >
            <Send className="w-6 h-6" />
            <span>Send Immediately</span>
          </Button>
          <Button
            type="button"
            variant={value.type !== "immediate" ? "hero" : "outline"}
            className={cn(
              "flex-1 h-24 flex-col gap-2 transition-all duration-300",
              value.type !== "immediate" && "ring-2 ring-primary/20"
            )}
            onClick={() => handleTypeChange("scheduled")}
          >
            <Calendar className="w-6 h-6" />
            <span>Schedule for Later</span>
          </Button>
        </div>
      </div>

      {/* Date/Time Selection (shown when scheduled or recurring) */}
      {value.type !== "immediate" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={value.date || ""}
                onChange={(e) => onChange({ ...value, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={value.time || ""}
                  onChange={(e) => onChange({ ...value, time: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={value.timezone || "UTC"}
              onValueChange={(tz) => onChange({ ...value, timezone: tz })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-accent/30 border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <Repeat className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Recurring Notification</p>
                <p className="text-sm text-muted-foreground">
                  Send this notification on a schedule
                </p>
              </div>
            </div>
            <Switch
              checked={isRecurring}
              onCheckedChange={handleRecurringToggle}
            />
          </div>

          {/* Recurring Options */}
          {isRecurring && value.recurrence && (
            <div className="space-y-4 p-4 rounded-xl bg-secondary/50 border border-border/50 animate-scale-in">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <RefreshCw className="w-4 h-4 text-primary" />
                Recurrence Pattern
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Repeat Every</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={value.recurrence.interval}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          recurrence: {
                            ...value.recurrence!,
                            interval: parseInt(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-20"
                    />
                    <Select
                      value={value.recurrence.pattern}
                      onValueChange={handleRecurrencePatternChange}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Day(s)</SelectItem>
                        <SelectItem value="weekly">Week(s)</SelectItem>
                        <SelectItem value="monthly">Month(s)</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>End After</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="∞"
                      value={value.recurrence.maxOccurrences || ""}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          recurrence: {
                            ...value.recurrence!,
                            maxOccurrences: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          },
                        })
                      }
                      className="w-20"
                    />
                    <span className="flex items-center text-sm text-muted-foreground">
                      occurrences
                    </span>
                  </div>
                </div>
              </div>

              {/* Weekly day selector */}
              {value.recurrence.pattern === "weekly" && (
                <div className="space-y-2">
                  <Label>On these days</Label>
                  <div className="flex gap-2">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className={cn(
                          "w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200",
                          value.recurrence?.daysOfWeek?.includes(day.value)
                            ? "gradient-primary text-primary-foreground shadow-md"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly day selector */}
              {value.recurrence.pattern === "monthly" && (
                <div className="space-y-2">
                  <Label>On day of month</Label>
                  <Select
                    value={String(value.recurrence.dayOfMonth || 1)}
                    onValueChange={(d) =>
                      onChange({
                        ...value,
                        recurrence: {
                          ...value.recurrence!,
                          dayOfMonth: parseInt(d),
                        },
                      })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(31)].map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* End date */}
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={value.recurrence.endDate || ""}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      recurrence: {
                        ...value.recurrence!,
                        endDate: e.target.value || undefined,
                      },
                    })
                  }
                />
              </div>

              {/* Summary */}
              <div className="p-3 rounded-lg bg-accent/50 border border-primary/10">
                <p className="text-sm text-foreground">
                  <span className="font-medium">Summary: </span>
                  {getRecurrenceSummary(value.recurrence)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to generate human-readable recurrence summary
function getRecurrenceSummary(recurrence: ScheduleConfig["recurrence"]): string {
  if (!recurrence) return "";

  const { pattern, interval, daysOfWeek: days, dayOfMonth, maxOccurrences, endDate } = recurrence;

  let summary = "Repeats ";

  if (interval === 1) {
    summary += pattern === "daily" ? "daily" : pattern === "weekly" ? "weekly" : "monthly";
  } else {
    summary += `every ${interval} ${pattern === "daily" ? "days" : pattern === "weekly" ? "weeks" : "months"}`;
  }

  if (pattern === "weekly" && days && days.length > 0) {
    const dayNames = days.map((d) => daysOfWeek.find((dw) => dw.value === d)?.label).join(", ");
    summary += ` on ${dayNames}`;
  }

  if (pattern === "monthly" && dayOfMonth) {
    summary += ` on day ${dayOfMonth}`;
  }

  if (maxOccurrences) {
    summary += `, ${maxOccurrences} times`;
  }

  if (endDate) {
    summary += ` until ${new Date(endDate).toLocaleDateString()}`;
  }

  return summary;
}

export type { ScheduleConfig };
