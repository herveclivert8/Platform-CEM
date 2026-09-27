import { useAdminScopeStore } from "../store/adminScopeStore";
import { useAuthStore } from "../store/authStore";

/**
 * Branch the admin lists are scoped to: always their own for a Branch Admin; for the Super Admin,
 * the branch picked in the scope selector, or undefined for "all branches".
 */
export function useScopedBranchId(): number | undefined {
  const user = useAuthStore((s) => s.user);
  const { selectedBranchId } = useAdminScopeStore();
  if (user?.role === "SUPER_ADMIN") return selectedBranchId === "all" ? undefined : selectedBranchId;
  return user?.branchId ?? undefined;
}
