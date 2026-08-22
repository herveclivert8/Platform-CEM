import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export function RequireSuperAdmin() {
  const role = useAuthStore((s) => s.user?.role);

  if (role !== "SUPER_ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
