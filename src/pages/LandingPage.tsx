import { Bell, Zap, BarChart3, Users, Shield, Globe, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Send targeted push notifications with rich media support and action buttons.",
  },
  {
    icon: Users,
    title: "Subscriber Management",
    description: "Segment and manage your audience based on behavior, location, and preferences.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track delivery rates, clicks, and conversions with detailed campaign insights.",
  },
  {
    icon: Zap,
    title: "Instant Delivery",
    description: "Reach your users instantly with our high-performance delivery infrastructure.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "GDPR compliant with end-to-end encryption and role-based access control.",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Deliver notifications worldwide with multi-language support and localization.",
  },
];

const stats = [
  { value: "10B+", label: "Notifications Sent" },
  { value: "50K+", label: "Active Websites" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "<100ms", label: "Delivery Speed" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-6 h-18 flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-md group-hover:shadow-glow transition-shadow duration-500">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-semibold text-foreground tracking-tight">Sigme</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300 link-elegant">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300 link-elegant">
              Pricing
            </a>
            <a href="#docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300 link-elegant">
              Documentation
            </a>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="font-medium" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="hero" size="sm" className="font-medium" asChild>
              <Link to="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 overflow-hidden gradient-hero">
        {/* Refined background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-32 left-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/[0.05] rounded-full blur-[120px] animate-float-slow" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/[0.02] to-transparent rounded-full" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full gradient-accent backdrop-blur-sm border border-primary/10 mb-10 animate-fade-up opacity-0 shadow-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent-foreground">Now with AI-powered targeting</span>
            </div>
            
            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-semibold text-foreground mb-8 leading-[1.05] tracking-tight animate-fade-up opacity-0 stagger-1 text-balance">
              Engage Your Users with
              <span className="text-gradient"> Smart Push</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up opacity-0 stagger-2 font-body">
              The modern push notification platform that helps you reach, engage, and retain your audience with targeted, personalized messages.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-up opacity-0 stagger-3">
              <Button variant="hero" size="xl" className="group font-medium" asChild>
                <Link to="/dashboard">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" className="font-medium">
                View Documentation
              </Button>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-24 max-w-5xl mx-auto animate-fade-up opacity-0 stagger-4">
            <div className="glass-card rounded-3xl p-3 shadow-glow-lg animate-glow-pulse">
              <div className="bg-secondary/20 rounded-2xl overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30 bg-background/50">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive/50" />
                    <div className="w-3 h-3 rounded-full bg-warning/50" />
                    <div className="w-3 h-3 rounded-full bg-success/50" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-5 py-1.5 rounded-lg bg-secondary/50 text-xs text-muted-foreground font-mono">
                      app.sigme.io/dashboard
                    </div>
                  </div>
                </div>
                {/* Preview content */}
                <div className="aspect-[16/9] bg-gradient-to-br from-background via-secondary/10 to-accent/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                      <Bell className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">Dashboard Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-border/30 gradient-subtle">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="text-4xl md:text-5xl font-display font-semibold text-foreground mb-3 group-hover:text-gradient transition-colors duration-500">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-28">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-semibold text-foreground mb-6 tracking-tight text-balance">
              Everything you need to grow engagement
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Powerful features to help you send the right message to the right person at the right time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-3xl bg-card border border-border/30 hover:border-primary/20 hover-lift cursor-default"
              >
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-glow transition-all duration-500">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-28 gradient-hero relative overflow-hidden">
        {/* Subtle decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/[0.03] rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-foreground mb-6 tracking-tight text-balance">
            Ready to boost your engagement?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands of businesses using Sigme to connect with their audience.
          </p>
          <Button variant="hero" size="xl" className="group font-medium" asChild>
            <Link to="/dashboard">
              Get Started for Free
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-md">
                <Bell className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-semibold text-foreground">Sigme</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Sigme. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}