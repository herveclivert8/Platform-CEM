import clsx from "clsx";
import { ASSOCIATION } from "../../config/association";
import { useSiteLogo } from "../../hooks/useSiteLogo";

/** Official CEM logo: laurel wreath and the association's name (wreath alone without the name). Navy, white in dark mode. */
export function Wordmark({ withName = true, className }: { withName?: boolean; className?: string }) {
  const { logo, logoFull } = useSiteLogo();
  return (
    <span className={clsx("flex items-center", className)}>
      {withName ? (
        <img
          src={logoFull}
          alt={ASSOCIATION.name}
          className="h-11 w-auto max-w-48 shrink-0 object-contain dark:brightness-0 dark:invert"
        />
      ) : (
        <img src={logo} alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-contain dark:brightness-0 dark:invert" />
      )}
    </span>
  );
}
