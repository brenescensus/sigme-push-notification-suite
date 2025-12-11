import { Bell, Zap, BarChart3, Users, Shield, Globe } from "lucide-react";
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
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Sigme</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </a>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden gradient-hero">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/80 backdrop-blur-sm border border-primary/10 mb-8 animate-fade-up opacity-0">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent-foreground">Now with AI-powered targeting</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight animate-fade-up opacity-0 stagger-1">
              Engage Your Users with
              <span className="text-gradient"> Smart Push</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up opacity-0 stagger-2">
              The modern push notification platform that helps you reach, engage, and retain your audience with targeted, personalized messages.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up opacity-0 stagger-3">
              <Button variant="hero" size="xl" asChild>
                <Link to="/dashboard">
                  Start Free Trial
                  <Zap className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl">
                View Documentation
              </Button>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-20 max-w-5xl mx-auto animate-fade-up opacity-0 stagger-4">
            <div className="glass-card rounded-2xl p-2 shadow-glow">
              <div className="bg-secondary/30 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-success/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-background/50 text-xs text-muted-foreground">
                      app.sigme.io/dashboard
                    </div>
                  </div>
                </div>
                <div className="aspect-[16/9] bg-gradient-to-br from-background via-secondary/20 to-accent/20 flex items-center justify-center">
                  <div className="text-center">
                    <Bell className="w-16 h-16 text-primary/40 mx-auto mb-4" />
                    <p className="text-muted-foreground">Dashboard Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border/50 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to grow engagement
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features to help you send the right message to the right person at the right time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300 hover-lift"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-hero">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to boost your engagement?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of businesses using Sigme to connect with their audience.
          </p>
          <Button variant="hero" size="xl" asChild>
            <Link to="/dashboard">
              Get Started for Free
              <Zap className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Sigme</span>
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
