//Component that handles protected routes
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useWebsite } from "@/contexts/WebsiteContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { refreshWebsites, isLoading: websitesLoading } = useWebsite();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log(' [ProtectedRoute] Checking authentication...');
      
      // Try to refresh websites - if it succeeds, user is authenticated
      await refreshWebsites();
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error(' [ProtectedRoute] Authentication failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading while checking auth or while websites are loading
  if (isChecking || websitesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log(' [ProtectedRoute] Redirecting to login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Show protected content if authenticated
  return <>{children}</>;
}