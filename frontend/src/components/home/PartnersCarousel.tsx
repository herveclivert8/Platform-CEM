import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";
import { usePartnerGroups } from "./partners";

/** Below this many boxes the scrolling strip would leave a gap on wide screens: the list is repeated. */
const MIN_ITEMS = 8;

export function PartnersCarousel() {
  const { t } = useTranslation();
  // Names only, in the admin's order (the kinds of partnership are shown on « Qui sommes-nous »)
  const partners = usePartnerGroups().flatMap((g) => g.partners);
  if (!partners.length) return null;

  const base = Array.from({ length: Math.ceil(MIN_ITEMS / partners.length) }, () => partners).flat();
  // The strip holds the list twice and scrolls by half its width, so the loop is seamless
  const items = [...base, ...base];

  return (
    <section id="partenaires" className="cem-photo-section dark py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t("partners.title")}
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{t("partners.subtitle")}</p>
      </div>

      <div className="relative mt-10 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-slate-950/60 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-slate-950/60 to-transparent" />

        {/* Paused on hover, so a partner's link can be clicked */}
        <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-4 px-4 hover:[animation-play-state:paused]">
          {items.map((partner, i) => {
            const className =
              "flex items-center gap-2.5 whitespace-nowrap rounded-xl border border-slate-200/80 bg-white px-5 py-3 text-sm font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";
            const content = (
              <>
                <Landmark className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {partner.name}
              </>
            );
            // Only the first copy is read by screen readers and reachable with the keyboard
            const hidden = i >= partners.length;
            return partner.url ? (
              <a
                key={i}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-hidden={hidden || undefined}
                tabIndex={hidden ? -1 : undefined}
                className={`${className} hover:text-emerald-600 dark:hover:text-emerald-400`}
              >
                {content}
              </a>
            ) : (
              <div key={i} aria-hidden={hidden || undefined} className={className}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
