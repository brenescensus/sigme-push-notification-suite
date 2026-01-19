// src/pages/AuthPage.tsx 
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; //  Add these imports
import { Mail, Lock, User, ArrowRight, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { api, tokenManager } from "@/lib/api";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  //  Add navigation hooks
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page user was trying to access (if redirected from protected route)
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        // console.log('[Auth]  Attempting signup...');
        const response = await api.auth.signup(email, password, fullName);
        
        // console.log('[Auth]  Signup successful, response:', response);
        
        // Verify token was saved
        const savedToken = tokenManager.get();
        // console.log('[Auth]  Token after signup:', savedToken ? 'Exists' : 'Missing!');
        
        if (!savedToken) {
          throw new Error('Authentication failed - no token received');
        }

        toast({ 
          title: "Account created!", 
          description: "Welcome to Sigme" 
        });

        // console.log('[Auth]  Navigating to dashboard...');
        
        //  Small delay to ensure token is persisted
        await new Promise(resolve => setTimeout(resolve, 100));
        
        navigate('/dashboard', { replace: true });
        return;
      }

      // LOGIN
      // console.log('[Auth]  Attempting login...');
      const response = await api.auth.login(email, password);
      
      // console.log('[Auth]  Login successful, response:', response);
      
      // Verify token was saved
      const savedToken = tokenManager.get();
      // console.log('[Auth]  Token after login:', savedToken ? 'Exists' : 'Missing!');
      
      if (!savedToken) {
        throw new Error('Authentication failed - no token received');
      }

      toast({ 
        title: "Welcome back!", 
        description: "Signed in successfully" 
      });

      // console.log('[Auth]  Navigating to:', from);
      
      //  Small delay to ensure token is persisted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      navigate(from, { replace: true });

    } catch (err: any) {
      console.error('[Auth]  Error:', err);

      let message = err.message || "Authentication failed";
      
      // Better error messages
      if (message.includes("Invalid login credentials") || message.includes("Invalid")) {
        message = "Invalid email or password";
      } else if (message.includes("User already registered") || message.includes("already")) {
        message = "Email already registered. Please sign in.";
      } else if (message.includes("Password")) {
        message = "Password must be at least 6 characters";
      }

      toast({ 
        title: "Error", 
        description: message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-40 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-white">Sigme</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Engage your users with powerful push notifications
          </h1>
          <p className="text-lg text-white/80">
            Send targeted, scheduled, and recurring notifications across web, iOS, and Android.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur">
              <div className="text-2xl font-bold text-white">∞</div>
              <div className="text-sm text-white/70">Unlimited Websites</div>
            </div>
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur">
              <div className="text-2xl font-bold text-white">$0</div>
              <div className="text-sm text-white/70">Start Free</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/60">
          © 2024 Sigme. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {mode === "login"
                ? "Sign in to access your dashboard"
                : "Get started with Sigme in seconds"}
            </p>
          </div>

          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-11"
                    required={mode === "signup"}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign in" : "Create account"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}