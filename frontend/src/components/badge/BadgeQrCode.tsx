import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";
import QRCode from "qrcode";
import clsx from "clsx";
import { buttonClasses } from "../ui/buttonStyles";
import { useSiteLogo } from "../../hooks/useSiteLogo";
import type { UserRole } from "../../types/user";

/** Dark modules of the QR code: gold for the Super Admin, green for branch admins, navy for members. */
const QR_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "#92400e",
  BRANCH_ADMIN: "#065f46",
  MEMBER: "#0f172a",
};

/** The QR code only holds this link: the page reads the holder's information live from the server. */
function badgeUrl(token: string): string {
  return `${window.location.origin}/verifier/${token}`;
}

/** Mention shown on the badge, as on the verification page. */
function badgeTitle(role: UserRole, branchName: string | null): string {
  if (role === "SUPER_ADMIN") return "Superadmin";
  return `${role === "BRANCH_ADMIN" ? "ADMIN" : "CEM"} ${branchName ?? ""}`.trim();
}

interface BadgeHolder {
  firstName: string;
  lastName: string;
  role: UserRole;
  branchName: string | null;
}

/** QR code on a white tile (always scannable, whatever the theme) with its download button. */
export function BadgeQrCode({ token, holder, size = 200 }: { token: string; holder: BadgeHolder; size?: number }) {
  const { t } = useTranslation();
  const [src, setSrc] = useState<string | null>(null);
  const name = `${holder.firstName} ${holder.lastName}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(badgeUrl(token), {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: QR_COLORS[holder.role], light: "#ffffff" },
    }).then((url) => !cancelled && setSrc(url));
    return () => {
      cancelled = true;
    };
  }, [token, holder.role]);

  const fileName = `badge-cem-${name}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={clsx(
          "rounded-2xl bg-white p-2 shadow-sm",
          holder.role === "SUPER_ADMIN" ? "ring-2 ring-amber-500" : "ring-1 ring-slate-200",
        )}
        style={{ width: size, height: size }}
      >
        {src && <img src={src} alt={t("badge.qr_alt", { name })} className="h-full w-full" />}
      </div>
      {src && (
        <a href={src} download={`${fileName}.png`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
          <Download className="h-4 w-4" aria-hidden />
          {t("badge.download")}
        </a>
      )}
    </div>
  );
}

/** Badge card: logo, holder, mention and QR code. */
export function BadgeCard({ token, holder, className }: { token: string; holder: BadgeHolder; className?: string }) {
  const { t } = useTranslation();
  const { logo } = useSiteLogo();
  return (
    <div className={clsx("flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left", className)}>
      <BadgeQrCode token={token} holder={holder} size={176} />
      <div className="min-w-0">
        <img src={logo} alt="" width={40} height={40} className="mx-auto h-10 w-10 rounded-full bg-white p-0.5 sm:mx-0" />
        <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
          {holder.firstName} {holder.lastName}
        </p>
        <p
          className={clsx(
            "mt-1 text-sm font-semibold uppercase tracking-wide",
            holder.role === "SUPER_ADMIN" ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400",
          )}
        >
          {badgeTitle(holder.role, holder.branchName)}
        </p>
        <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">{t("badge.hint")}</p>
      </div>
    </div>
  );
}

/** Modal showing someone's badge (Super Admin, accounts page). */
export function BadgeDialog({ token, holder, onClose }: { token: string; holder: BadgeHolder; onClose: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-dialog-title"
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-fade-in-up dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="badge-dialog-title" className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            {t("badge.of", { name: `${holder.firstName} ${holder.lastName}` })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={t("badge.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <BadgeCard token={token} holder={holder} />
      </div>
    </div>
  );
}
