import { useEffect } from "react";
import { ASSOCIATION } from "../config/association";
import { useHomePage } from "./useHomePage";

/** Logo chosen by the Super Admin (Admin → Home page), or the one shipped with the site. */
export function useSiteLogo() {
  const { data } = useHomePage();
  return {
    /** Square emblem */
    logo: data?.logoMarkUrl || ASSOCIATION.logo,
    /** Emblem and name */
    logoFull: data?.logoUrl || ASSOCIATION.logoFull,
  };
}

/** Browser tab icon follows the chosen emblem (renders nothing). */
export function SiteFaviconSync() {
  const { logo } = useSiteLogo();
  useEffect(() => {
    if (logo === ASSOCIATION.logo) return; // index.html already points to the shipped icon
    document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
      link.href = logo;
    });
  }, [logo]);
  return null;
}
