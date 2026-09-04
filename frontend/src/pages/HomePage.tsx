import { lazy, Suspense } from "react";
import { Hero } from "../components/home/Hero";
import { BentoGrid } from "../components/home/BentoGrid";
import { ModelSection } from "../components/home/ModelSection";
import { PartnersCarousel } from "../components/home/PartnersCarousel";
import { Skeleton } from "../components/ui/Skeleton";

// Leaflet pulls in a non-trivial amount of JS; keep it out of the initial
// bundle so the hero/CTA are interactive as fast as possible on mobile.
const MadagascarMap = lazy(() =>
  import("../components/home/MadagascarMap").then((m) => ({ default: m.MadagascarMap })),
);

export function HomePage() {
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
      <ModelSection />
      <PartnersCarousel />
    </>
  );
}
