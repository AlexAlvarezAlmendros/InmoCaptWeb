import { useAuth0 } from '@auth0/auth0-react';
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isLoading } = useAuth0();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const location = useLocation();

  if (isLoading || rolesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
