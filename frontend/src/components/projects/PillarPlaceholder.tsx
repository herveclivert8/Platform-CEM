import clsx from "clsx";
import { BookOpen, HandHeart, Lightbulb, Trophy } from "lucide-react";
import type { Pillar } from "../../types/post";

const VISUALS: Record<Pillar, { icon: typeof BookOpen; className: string }> = {
  EDUCATION: { icon: BookOpen, className: "from-emerald-500 to-teal-600" },
  SOCIAL: { icon: HandHeart, className: "from-orange-500 to-rose-500" },
  SPORT: { icon: Trophy, className: "from-sky-500 to-indigo-600" },
  ENTERPRISE: { icon: Lightbulb, className: "from-amber-500 to-orange-600" },
};

/** Stand-in for a project without photo: the pillar's icon on its colour, so grids stay even. */
export function PillarPlaceholder({ pillar, className, iconClassName = "h-10 w-10" }: { pillar: Pillar; className?: string; iconClassName?: string }) {
  const { icon: Icon, className: gradient } = VISUALS[pillar];
  return (
    <div className={clsx("flex h-full w-full items-center justify-center bg-gradient-to-br text-white/90", gradient, className)} aria-hidden>
      <Icon className={iconClassName} strokeWidth={1.5} />
    </div>
  );
}
