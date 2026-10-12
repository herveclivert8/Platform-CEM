import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { Button } from "../ui/Button";
import { useLogout } from "../../hooks/useAuth";
import { homePathFor, isAdminRole, type CurrentUser } from "../../types/user";

/**
 * Shown on the sign-in and sign-up pages while an account is still signed in on this browser:
 * says which one, and offers to sign out (to use another account) or to go back to its area.
 */
export function SignedInNotice({ user, action }: { user: CurrentUser; action: "login" | "register" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useLogout();
  const isAdmin = isAdminRole(user.role);
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {t(isAdmin ? "auth.signed_in_as_admin_short" : "auth.signed_in_as_member_short", { name, email: user.email })}{" "}
        {t(action === "login" ? "auth.sign_out_to_switch_text" : "auth.sign_out_to_register_text")}
      </p>
      <div className="mt-6 space-y-2">
        <Button variant="primary" icon={<LogOut className="h-4 w-4" />} onClick={logout} className="w-full justify-center">
          {t(action === "login" ? "auth.sign_out_to_switch" : "auth.sign_out_to_register")}
        </Button>
        <Button variant="ghost" onClick={() => navigate(homePathFor(user.role))} className="w-full justify-center">
          {t(isAdmin ? "auth.go_admin" : "auth.go_member")}
        </Button>
      </div>
    </>
  );
}
