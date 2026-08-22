import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, ShieldCheck, HeartHandshake } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageDropdown } from "./LanguageDropdown";
import { useDonationUiStore } from "../../store/donationUiStore";

export function Navbar() {
  const { t } = useTranslation();
  const openDonation = useDonationUiStore((s) => s.open);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: t("nav.pillars"), href: "/#piliers" },
    { label: t("nav.branches"), href: "/#antennes" },
    { label: t("nav.network"), href: "/#partenaires" },
    { label: t("nav.model"), href: "/#modele" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80"
          : "border-transparent bg-white/40 backdrop-blur-sm dark:bg-slate-950/40"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <HeartHandshake className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-bold tracking-tight text-slate-900 dark:text-white">
            Club Excellence Madagascar
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Badge tone="slate" className="hidden md:inline-flex">
            {t("nav.law")}
          </Badge>

          <div className="hidden items-center gap-1 sm:flex">
            <LanguageDropdown />
            <ThemeToggle />
          </div>

          <Button variant="primary" size="sm" onClick={() => openDonation()} className="hidden sm:inline-flex">
            {t("nav.donate")}
          </Button>

          <Link
            to="/login"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 lg:inline-flex dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t("nav.admin")}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 lg:hidden dark:text-slate-300"
            aria-label="Ouvrir le menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200/80 bg-white px-4 py-4 animate-fade-in-up lg:hidden dark:border-slate-800 dark:bg-slate-950">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {t("nav.admin")}
            </Link>
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <LanguageDropdown />
              <ThemeToggle />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setMobileOpen(false);
                openDonation();
              }}
            >
              {t("nav.donate")}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
