/**
 * PricingDialog Component
 * 
 * Shows pricing tiers for recurring notifications.
 * Displayed when users try to create recurring notifications on free plan
 * or exceed their plan limits.
 * 
 * PRICING TIERS:
 * - Free: 0 recurring notifications
 * - Starter ($10/mo): 10 recurring notifications
 * - Growth ($20/mo): 30 recurring notifications
 * - Custom: Contact Admin
 */

import { Crown, Check, Zap, Rocket, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  currentRecurring: number;
  maxRecurring: number;
}

const plans = [
  {
    name: "Free",
    id: "free",
    price: 0,
    recurringLimit: 0,
    features: [
      "1 website",
      "1,000 subscribers",
      "10,000 notifications/month",
      "One-time campaigns only",
    ],
    icon: Zap,
  },
  {
    name: "Starter",
    id: "starter",
    price: 10,
    recurringLimit: 10,
    popular: true,
    features: [
      "3 websites",
      "10,000 subscribers per site",
      "50,000 notifications/month",
      "10 recurring notifications",
      "Priority support",
    ],
    icon: Rocket,
  },
  {
    name: "Growth",
    id: "growth",
    price: 20,
    recurringLimit: 30,
    features: [
      "10 websites",
      "50,000 subscribers per site",
      "Unlimited notifications",
      "30 recurring notifications",
      "Advanced analytics",
      "API access",
    ],
    icon: Crown,
  },
  {
    name: "Custom",
    id: "custom",
    price: null,
    recurringLimit: "Unlimited",
    features: [
      "Unlimited websites",
      "Unlimited subscribers",
      "Unlimited notifications",
      "Unlimited recurring",
      "Dedicated support",
      "Custom integrations",
    ],
    icon: Building2,
  },
];

export function PricingDialog({
  open,
  onOpenChange,
  currentPlan,
  currentRecurring,
  maxRecurring,
}: PricingDialogProps) {
  const handleSelectPlan = (planId: string) => {
    // In production, this would integrate with Stripe or your payment system
    // For now, just show a message
    if (planId === "custom") {
      window.open("mailto:sales@sigme.app?subject=Custom%20Plan%20Inquiry", "_blank");
    } else {
      // TODO: Integrate with Stripe for payment
      console.log("Selected plan:", planId);
      alert(`Plan upgrade to ${planId} coming soon! Contact support for immediate upgrade.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-center">
            {maxRecurring === 0 ? (
              <>Recurring notifications require a paid plan. Choose the plan that fits your needs.</>
            ) : (
              <>You've used {currentRecurring} of {maxRecurring} recurring notifications. Upgrade for more.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative p-6 rounded-xl border transition-all duration-200",
                  plan.popular 
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                    : "border-border bg-card hover:border-primary/50",
                  isCurrent && "ring-2 ring-primary"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    plan.popular ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-xs text-muted-foreground">Current plan</span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  {plan.price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold">Contact Us</span>
                  )}
                </div>

                <div className="mb-4 p-3 rounded-lg bg-accent/50">
                  <div className="text-sm font-medium">
                    {typeof plan.recurringLimit === "number" 
                      ? `${plan.recurringLimit} recurring notifications`
                      : "Unlimited recurring notifications"
                    }
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.popular ? "hero" : "outline"}
                  disabled={isCurrent}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isCurrent ? "Current Plan" : plan.price === null ? "Contact Sales" : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
          <p>
            <strong>Note:</strong> Recurring notifications are scheduled notifications that repeat automatically.
            One-time notifications do not count toward your recurring limit.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
