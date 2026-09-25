/**
 * Card input helpers + SIMULATED tokenization.
 *
 * Like Stripe.js / Stripe Elements, the card number never leaves the browser: it is turned into
 * a token here and only the token is sent to the backend. With a real provider, `tokenizeCard`
 * is replaced by the provider's SDK (e.g. stripe.createPaymentMethod) - the rest stays the same.
 */

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export function detectCardBrand(number: string): CardBrand {
  const digits = number.replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "unknown";
}

/** "4242424242424242" -> "4242 4242 4242 4242" (Amex: 4-6-5) */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  if (detectCardBrand(digits) === "amex") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(" ");
  }
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

/** "1234" -> "12 / 34" */
export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export type CardFieldError = "number" | "expiry" | "cvc" | null;

export interface CardInput {
  number: string;
  expiry: string;
  cvc: string;
}

/** Field-level validation, same checks a payment form runs before submitting. */
export function validateCard({ number, expiry, cvc }: CardInput): CardFieldError {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 13 || !passesLuhn(digits)) return "number";

  const [mm, yy] = expiry.replace(/\s/g, "").split("/");
  const month = Number(mm);
  const year = 2000 + Number(yy);
  const now = new Date();
  if (!mm || !yy || yy.length !== 2 || month < 1 || month > 12) return "expiry";
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return "expiry";

  const expectedCvc = detectCardBrand(digits) === "amex" ? 4 : 3;
  if (cvc.replace(/\D/g, "").length !== expectedCvc) return "cvc";
  return null;
}

/** Test cards accepted in simulation mode (same numbers as Stripe's test mode). */
export const TEST_CARDS = [
  { number: "4242 4242 4242 4242", token: "sim_tok_success", outcome: "success" },
  { number: "5555 5555 5555 4444", token: "sim_tok_success", outcome: "success" },
  { number: "4000 0000 0000 0002", token: "sim_tok_declined", outcome: "declined" },
  { number: "4000 0000 0000 9995", token: "sim_tok_insufficient_funds", outcome: "insufficient_funds" },
] as const;

/**
 * Simulated tokenization: returns the token matching a test card, or null for any other card
 * (a real card must never be typed in simulation mode - it would not be charged anyway).
 */
export function tokenizeCard(card: CardInput): string | null {
  const digits = card.number.replace(/\D/g, "");
  return TEST_CARDS.find((c) => c.number.replace(/\s/g, "") === digits)?.token ?? null;
}
