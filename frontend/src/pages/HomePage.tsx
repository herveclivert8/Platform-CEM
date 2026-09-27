import { lazy, Suspense } from "react";
import { Hero } from "../components/home/Hero";
import { BentoGrid } from "../components/home/BentoGrid";
import { NetworkSection } from "../components/home/NetworkSection";
import { HomeProjectsSection } from "../components/home/HomeProjectsSection";
import { PartnersCarousel } from "../components/home/PartnersCarousel";
import { Skeleton } from "../components/ui/Skeleton";
import { usePageMeta } from "../hooks/usePageMeta";

// Leaflet pulls in a non-trivial amount of JS; keep it out of the initial
// bundle so the hero/CTA are interactive as fast as possible on mobile.
const MadagascarMap = lazy(() =>
  import("../components/home/MadagascarMap").then((m) => ({ default: m.MadagascarMap })),
);

export function HomePage() {
  usePageMeta("");
  return (
    <>
      <Hero />
      <BentoGrid />
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <Skeleton className="h-[480px] w-full rounded-2xl" />
          </div>
        }
      >
        <MadagascarMap />
      </Suspense>
      <HomeProjectsSection />
      <NetworkSection />
      <PartnersCarousel />
    </>
  );
}
