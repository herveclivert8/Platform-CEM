import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Link2 } from "lucide-react";
import { FacebookIcon, LinkedInIcon } from "../icons/BrandIcons";

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.97.99-3.62-.23-.37a9.8 9.8 0 0 1-1.5-5.23c0-5.42 4.41-9.83 9.84-9.83a9.8 9.8 0 0 1 9.83 9.84c0 5.42-4.41 9.83-9.84 9.83Zm8.37-18.2A11.76 11.76 0 0 0 12.05.13C5.5.13.16 5.46.16 12.01c0 2.1.55 4.14 1.59 5.94L.06 24l6.2-1.63a11.84 11.84 0 0 0 5.78 1.47h.01c6.55 0 11.88-5.33 11.89-11.88 0-3.17-1.24-6.16-3.52-8.4Z" />
    </svg>
  );
}

/**
 * Share the current page. The social networks read the page's preview (title, summary, photo)
 * from the server-side share preview (backend seo.py), so only the URL is passed here.
 */
export function ShareButtons({ title }: { title: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = window.location.href;
  const encoded = encodeURIComponent(url);

  const networks = [
    { name: "Facebook", icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { name: "LinkedIn", icon: LinkedInIcon, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}` },
    { name: "WhatsApp", icon: WhatsAppIcon, href: `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}` },
  ];

  const button =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-emerald-400";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("projects.share")}</span>
      {networks.map(({ name, icon: Icon, href }) => (
        <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={t("projects.share_on", { network: name })} className={button}>
          <Icon className="h-4 w-4" aria-hidden />
        </a>
      ))}
      <button
        type="button"
        aria-label={t("projects.copy_link")}
        className={button}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt(t("projects.copy_link"), url);
          }
        }}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
      </button>
      {copied && <span role="status" className="text-xs text-emerald-600 dark:text-emerald-400">{t("projects.link_copied")}</span>}
    </div>
  );
}
