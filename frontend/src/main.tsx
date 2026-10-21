import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import i18n from "./i18n/i18n";
import "./index.css";
import { router } from "./router";
import { SiteFaviconSync } from "./hooks/useSiteLogo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Public site style ("Éditorial", see index.css); the back-office removes it (AdminLayout)
document.documentElement.classList.add("site-theme");
// Colors once chosen in the removed "Appearance" page, still stored by some browsers
try {
  localStorage.removeItem("cem_site_theme");
} catch {
  // Private browsing
}

// Content (posts, projects, home page) is fetched per language: refetch it after a language switch
i18n.on("languageChanged", () => queryClient.invalidateQueries());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SiteFaviconSync />
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
);
