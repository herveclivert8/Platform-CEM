import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { homePathFor, isAdminRole } from "../../types/user";

/** Signed-in users only, and only in their own area: admins in /admin, members in /espace-membre. */
export function RequireAuth({ area }: { area: "admin" | "member" }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword ?? false);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (isAdminRole(role) !== (area === "admin")) {
    return <Navigate to={homePathFor(role)} replace />;
  }

  return <Outlet />;
}
