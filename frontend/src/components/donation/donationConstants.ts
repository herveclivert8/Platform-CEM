import type { MobileOperator } from "../../types/donation";

export const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";

export const fieldErrorClass = "border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/70";

export const OPERATOR_STYLES: Record<MobileOperator, { mark: string; initials: string; accent: string }> = {
  MVOLA: { mark: "bg-[#ffd400] text-[#00662f]", initials: "MV", accent: "border-[#ffd400]" },
  ORANGE_MONEY: { mark: "bg-[#ff7900] text-white", initials: "OM", accent: "border-[#ff7900]" },
  AIRTEL_MONEY: { mark: "bg-[#e40000] text-white", initials: "AM", accent: "border-[#e40000]" },
};

export function operatorAccent(operator: MobileOperator): string {
  return OPERATOR_STYLES[operator].accent;
}

export type DonationMethod = "CARD" | "MOBILE_MONEY";

export const PRESET_AMOUNTS: Record<DonationMethod, number[]> = {
  CARD: [10, 25, 50, 100],
  MOBILE_MONEY: [10_000, 25_000, 50_000, 100_000],
};
export const POPULAR_INDEX = 1;
// Approximate cost of one school book, per currency
export const PRICE_PER_BOOK: Record<DonationMethod, number> = { CARD: 2, MOBILE_MONEY: 10_000 };

