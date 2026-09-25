import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { UserRole } from "@/types/api";

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, isLoading, logoutRedirect } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    // After signing out on purpose, go where the sign-out asked (the website);
    // otherwise (an expired session, a bookmarked link) ask the visitor to sign in.
    if (logoutRedirect) return <Navigate to={logoutRedirect} replace />;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
