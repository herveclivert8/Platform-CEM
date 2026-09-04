import type { ReactElement, SVGProps } from "react";
import { useSocialLinks } from "../../hooks/useSocialLinks";
import { FacebookIcon, XIcon, LinkedInIcon, YouTubeIcon } from "../icons/BrandIcons";

interface NetworkConfig {
  name: string;
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
  border: string;
  shadow: string;
  shadowHover: string;
  labelHover: string;
}

export const NETWORK_CONFIG: Record<"facebook" | "x" | "linkedin" | "youtube", NetworkConfig> = {
  facebook: {
    name: "Facebook",
    icon: FacebookIcon,
    border: "border-blue-400/40 hover:border-blue-400/70",
    shadow: "shadow-[0_0_12px_rgba(59,130,246,0.35)]",
    shadowHover: "hover:shadow-[0_0_20px_rgba(59,130,246,0.7)]",
    labelHover: "hover:text-blue-500 dark:hover:text-blue-400",
  },
  x: {
    name: "X",
    icon: XIcon,
    border: "border-slate-400/50 hover:border-slate-500/80 dark:border-white/30 dark:hover:border-white/60",
    shadow: "shadow-[0_0_12px_rgba(100,116,139,0.3)] dark:shadow-[0_0_12px_rgba(255,255,255,0.3)]",
    shadowHover:
      "hover:shadow-[0_0_20px_rgba(100,116,139,0.6)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.6)]",
    labelHover: "hover:text-slate-900 dark:hover:text-white",
  },
  linkedin: {
    name: "LinkedIn",
    icon: LinkedInIcon,
    border: "border-sky-400/40 hover:border-sky-400/70",
    shadow: "shadow-[0_0_12px_rgba(14,165,233,0.35)]",
    shadowHover: "hover:shadow-[0_0_20px_rgba(14,165,233,0.7)]",
    labelHover: "hover:text-sky-500 dark:hover:text-sky-400",
  },
  youtube: {
    name: "YouTube",
    icon: YouTubeIcon,
    border: "border-red-400/40 hover:border-red-400/70",
    shadow: "shadow-[0_0_12px_rgba(239,68,68,0.35)]",
    shadowHover: "hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]",
    labelHover: "hover:text-red-500 dark:hover:text-red-400",
  },
};

export function SocialLinks() {
  const { data } = useSocialLinks();

  const networks = (
    [
      { key: "facebook", url: data?.facebookUrl },
      { key: "x", url: data?.xUrl },
      { key: "linkedin", url: data?.linkedinUrl },
      { key: "youtube", url: data?.youtubeUrl },
    ] as const
  ).filter((n): n is { key: typeof n.key; url: string } => Boolean(n.url));

  if (networks.length === 0) return null;

  return (
    <div className="flex flex-row items-start gap-4">
      {networks.map(({ key, url }) => {
        const network = NETWORK_CONFIG[key];
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={network.name}
            className="group flex flex-col items-center gap-1.5"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full border bg-white/80 text-slate-600 backdrop-blur-md transition-all duration-300 ease-out group-hover:-translate-y-1 dark:bg-slate-900/60 dark:text-white ${network.border} ${network.shadow} ${network.shadowHover}`}
            >
              <network.icon className="h-4 w-4" aria-hidden />
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-widest text-slate-400 transition-colors duration-300 dark:text-slate-500 ${network.labelHover}`}
            >
              {network.name}
            </span>
          </a>
        );
      })}
    </div>
  );
}
