import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";
import { buttonClasses } from "../ui/buttonStyles";
import { useDonationUiStore } from "../../store/donationUiStore";
import { useHomePage } from "../../hooks/useHomePage";
import { useAuthStore } from "../../store/authStore";
import { homePathFor } from "../../types/user";

export const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1920&q=80&auto=format&fit=crop";

export function Hero() {
  const { t } = useTranslation();
  const openDonation = useDonationUiStore((s) => s.open);
  const signedInRole = useAuthStore((s) => (s.isAuthenticated ? s.user?.role : undefined));
  // Custom cover set by the super admin (in French, automatically translated for English
  // visitors); any empty field falls back to the site's default text / photo
  const { data: hero, isLoading } = useHomePage();
  const badge = hero?.heroBadge || t("hero.badge");
  const title = hero?.heroTitle || t("hero.title");
  const subtitle = hero?.heroSubtitle || t("hero.subtitle");

  return (
    <section className="relative overflow-hidden">
      {/* The photo is fixed behind the page (HomeBackdrop). Scrim: keeps the title readable and
          blends into the veil of the next section (75 %) */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/45 to-slate-950/10" />

      <div
        className={`relative mx-auto flex min-h-[680px] max-w-7xl flex-col justify-end px-4 pb-16 pt-40 transition-opacity sm:px-6 lg:min-h-[760px] lg:px-8 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 animate-fade-in-up">{badge}</p>

        <h1 className="mt-6 max-w-4xl text-4xl font-semibold text-white animate-fade-in-up sm:text-5xl lg:text-6xl">
          {title}
        </h1>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-8 animate-fade-in-up">
          <p className="max-w-xl text-lg leading-relaxed text-slate-200">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={signedInRole ? homePathFor(signedInRole) : "/inscription"}
              className={buttonClasses({ variant: "primary", size: "lg" })}
            >
              {t(signedInRole ? "nav.my_area" : "hero.cta_member")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="border-white/70"
              onClick={() => openDonation()}
            >
              {t("hero.cta_primary")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
