import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useDonationUiStore } from "../../store/donationUiStore";

export function Hero() {
  const { t } = useTranslation();
  const openDonation = useDonationUiStore((s) => s.open);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1920&q=80&auto=format&fit=crop"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/50 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[640px] max-w-7xl flex-col justify-end px-4 pb-20 pt-40 sm:px-6 lg:px-8">
        <Badge tone="emerald" className="w-fit animate-fade-in-up">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {t("hero.badge")}
        </Badge>

        <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-white animate-fade-in-up lg:text-6xl">
          {t("hero.title")}
        </h1>

        <p className="mt-5 max-w-xl text-base text-slate-200 animate-fade-in-up lg:text-lg">
          {t("hero.subtitle")}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-in-up">
          <Button variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right" onClick={() => openDonation()}>
            {t("hero.cta_primary")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => document.getElementById("antennes")?.scrollIntoView({ behavior: "smooth" })}>
            {t("hero.cta_secondary")}
          </Button>
        </div>
      </div>
    </section>
  );
}
