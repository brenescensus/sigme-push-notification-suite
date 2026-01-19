// src/components/ProtectedRoute.tsx
// Token-based authentication check 
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  
  // Simple synchronous check
  const token = localStorage.getItem('access_token');
  const isAuthenticated = !!token;
  
  console.log('[ProtectedRoute] Auth check:', {
    path: location.pathname,
    hasToken: isAuthenticated,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'None'
  });

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // console.log('[ProtectedRoute]  Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  // console.log('[ProtectedRoute]  Authenticated, rendering protected content');
  return <>{children}</>;
}