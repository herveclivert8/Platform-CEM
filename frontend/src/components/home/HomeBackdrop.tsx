import { useHomePage } from "../../hooks/useHomePage";
import { PhotoBackdrop } from "../layout/PhotoBackdrop";
import { DEFAULT_HERO_IMAGE } from "./Hero";

/** Home page cover photo, fixed behind the page; only the branches map itself is opaque. */
export function HomeBackdrop() {
  // Wait for the settings so the default cover doesn't flash before the custom one
  const { data: hero, isLoading } = useHomePage();
  return <PhotoBackdrop src={isLoading ? null : hero?.heroImageUrl || DEFAULT_HERO_IMAGE} />;
}
