import type { ReactNode } from "react";
import { HomeBackdrop } from "../home/HomeBackdrop";

/**
 * Page over the home page's cover photo, fixed behind it while scrolling, through the dark veil
 * (.cem-photo-section: light text, dark cards). At least the screen height, so no unveiled photo
 * shows above the footer on a short page.
 */
export function PhotoPage({ children }: { children: ReactNode }) {
  return (
    <>
      <HomeBackdrop />
      <div className="cem-photo-section dark relative z-10 min-h-[calc(100vh-4rem)]">{children}</div>
    </>
  );
}
