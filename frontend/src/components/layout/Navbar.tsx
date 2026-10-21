import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, LogIn, LogOut, UserRound } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { Button } from "../ui/Button";
import { buttonClasses } from "../ui/buttonStyles";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageDropdown } from "./LanguageDropdown";
import { useDonationUiStore } from "../../store/donationUiStore";
import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../hooks/useAuth";
import { canSeeMemberContent, homePathFor } from "../../types/user";

export function Navbar() {
  const { t } = useTranslation();
  const openDonation = useDonationUiStore((s) => s.open);
  const [scrolled, setScrolled] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useLogout();
  // Signed in (member or admin): "Sign out" and "My area" replace "Sign in" and "Join"
  const signedInRole = useAuthStore((s) => (s.isAuthenticated ? s.user?.role : undefined));
  // "Projets en cours" is reserved for members with their fee paid, and admins
  const memberView = useAuthStore((s) => (s.isAuthenticated ? canSeeMemberContent(s.user) : false));
  const signOut = () => {
    setMobileOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    // The navbar CTA duplicates the page's own hero CTA (or, on the branch hub
    // pages, the donation sidebar/bottom bar) if it's visible right away - so it
    // only appears once the user has scrolled past that first screen, where it
    // earns its keep as the one persistently-reachable "donate" action.
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      setShowCta(window.scrollY > 320);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks: { label: string; href?: string; to?: string }[] = [
    { label: t("nav.home"), to: "/" },
    { label: t("nav.about"), to: "/qui-sommes-nous" },
    { label: t("nav.branches"), to: "/antennes" },
    { label: t("nav.achievements"), to: "/realisations" },
    ...(memberView ? [{ label: t("nav.ongoing"), to: "/projets-en-cours" }] : []),
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
        <Link to="/" aria-label="Club Excellence Madagascar — accueil">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            const className =
              "rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";
            return link.to ? (
              <Link key={link.to} to={link.to} className={className}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className={className}>
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <LanguageDropdown />
            <ThemeToggle />
          </div>

          {showCta && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openDonation()}
              className="hidden animate-fade-in-up sm:inline-flex"
            >
              {t("nav.donate")}
            </Button>
          )}

          {signedInRole ? (
            <>
              <button
                type="button"
                onClick={signOut}
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 sm:inline-flex dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                {t("auth.sign_out")}
              </button>
              <Link
                to={homePathFor(signedInRole)}
                className={buttonClasses({ variant: "secondary", size: "sm", className: "hidden sm:inline-flex" })}
              >
                <UserRound className="h-4 w-4" aria-hidden />
                {t("nav.my_area")}
              </Link>
            </>
          ) : (
            <>
              {/* One sign-in for everyone: admins land in the back-office, members in their area */}
              <Link
                to="/login"
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 sm:inline-flex dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {t("nav.login")}
              </Link>
              <Link
                to="/inscription"
                className={buttonClasses({ variant: "secondary", size: "sm", className: "hidden sm:inline-flex" })}
              >
                {t("nav.register")}
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 lg:hidden dark:text-slate-300"
            aria-label={t("common.open_menu")}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200/80 bg-white px-4 py-4 animate-fade-in-up lg:hidden dark:border-slate-800 dark:bg-slate-950">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const className =
                "rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
              return link.to ? (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={className}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={className}
                >
                  {link.label}
                </a>
              );
            })}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              {signedInRole ? (
                <>
                  <button
                    type="button"
                    onClick={signOut}
                    className={buttonClasses({ variant: "ghost", size: "sm", className: "border border-slate-200 dark:border-slate-700" })}
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    {t("auth.sign_out")}
                  </button>
                  <Link
                    to={homePathFor(signedInRole)}
                    onClick={() => setMobileOpen(false)}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    <UserRound className="h-4 w-4" aria-hidden />
                    {t("nav.my_area")}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className={buttonClasses({ variant: "ghost", size: "sm", className: "border border-slate-200 dark:border-slate-700" })}
                  >
                    <LogIn className="h-4 w-4" aria-hidden />
                    {t("nav.login")}
                  </Link>
                  <Link
                    to="/inscription"
                    onClick={() => setMobileOpen(false)}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>
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
