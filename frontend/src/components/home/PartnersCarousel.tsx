import { useTranslation } from "react-i18next";
import { Landmark, GraduationCap, Building2, Users, Globe2, HeartHandshake } from "lucide-react";

const PARTNER_CATEGORIES = [
  { icon: Landmark, label: "Institutions publiques" },
  { icon: GraduationCap, label: "Établissements scolaires" },
  { icon: Building2, label: "Fondations d'entreprise" },
  { icon: Users, label: "Associations locales" },
  { icon: Globe2, label: "ONG internationales" },
  { icon: HeartHandshake, label: "Réseau diaspora" },
];

export function PartnersCarousel() {
  const { t } = useTranslation();
  const items = [...PARTNER_CATEGORIES, ...PARTNER_CATEGORIES];

  return (
    <section id="partenaires" className="bg-slate-50 py-20 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t("partners.title")}
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{t("partners.subtitle")}</p>
      </div>

      <div className="relative mt-10 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-950" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-slate-50 to-transparent dark:from-slate-950" />

        <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-4 px-4">
          {items.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-5 py-3 text-sm font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
            >
              <item.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {item.label}
            </div>
          ))}
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
