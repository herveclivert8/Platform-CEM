import type { Currency, MobileOperator } from "../../types/donation";

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

/** Mobile Money only works in ariary; cards can be charged in any of the three currencies. */
export const METHODS_BY_CURRENCY: Record<Currency, DonationMethod[]> = {
  MGA: ["MOBILE_MONEY", "CARD"],
  EUR: ["CARD"],
  USD: ["CARD"],
};

export const PRESET_AMOUNTS: Record<Currency, number[]> = {
  MGA: [10_000, 25_000, 50_000, 100_000],
  EUR: [10, 25, 50, 100],
  USD: [10, 25, 50, 100],
};
export const POPULAR_INDEX = 1;
// Approximate cost of one school book, per currency
export const PRICE_PER_BOOK: Record<Currency, number> = { MGA: 10_000, EUR: 2, USD: 2 };

// Same limits as the backend (CARD_CURRENCY_LIMITS, and the 100 Ar floor of Mobile Money declarations)
const CARD_MINIMUMS: Record<Currency, number> = { MGA: 5_000, EUR: 1, USD: 1 };
export function minimumAmount(method: DonationMethod, currency: Currency): number {
  return method === "MOBILE_MONEY" ? 100 : CARD_MINIMUMS[currency];
}

