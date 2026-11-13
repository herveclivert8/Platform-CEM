import { dateLocale } from "../lib/locale";

/** CASH, BANK_TRANSFER and IN_KIND (material, no amount) are recorded by an admin only */
export type PaymentMethod = "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CASH" | "IN_KIND";
export type DonationStatus = "PENDING" | "CONFIRMED" | "REJECTED";
export type MobileOperator = "MVOLA" | "ORANGE_MONEY" | "AIRTEL_MONEY";
export type Currency = "MGA" | "EUR" | "USD";

/** Currencies offered to donors, in display order (the first one is the default). */
export const DONATION_CURRENCIES: Currency[] = ["MGA", "EUR", "USD"];

export const CURRENCY_SYMBOLS: Record<Currency, string> = { MGA: "Ar", EUR: "€", USD: "$" };

export const OPERATOR_LABELS: Record<MobileOperator, string> = {
  MVOLA: "MVola",
  ORANGE_MONEY: "Orange Money",
  AIRTEL_MONEY: "Airtel Money",
};

export function formatAmount(amount: number, currency: string): string {
  if (currency === "MGA") return `${amount.toLocaleString(dateLocale(), { maximumFractionDigits: 0 })} Ar`;
  const symbol = CURRENCY_SYMBOLS[currency as Currency] ?? currency;
  return `${amount.toLocaleString(dateLocale(), { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 })} ${symbol}`;
}

/** Malagasy mobile number, as the backend expects it: "+261 34 12 345 67" -> "0341234567" (null if invalid). */
export function normalizeMgPhone(value: string): string | null {
  let digits = value.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+261")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("261") && digits.length === 12) digits = "0" + digits.slice(3);
  return /^03[2-9]\d{7}$/.test(digits) ? digits : null;
}

/** "0341234567" -> "034 12 345 67" */
export function formatMgPhone(value: string | null): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : value;
}

/** Date + time: needed to match a payment in the operator's history. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(dateLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface Donation {
  id: number;
  branchId: number | null;
  amount: number;
  declaredAmount: number | null;
  currency: Currency;
  donorName: string | null;
  donorEmail: string | null;
  donorPhone: string | null;
  paymentMethod: PaymentMethod;
  mobileOperator: MobileOperator | null;
  transactionReference: string | null;
  /** Material received (IN_KIND donations) */
  inKindDescription: string | null;
  status: DonationStatus;
  rejectionReason: string | null;
  statusUpdatedAt: string | null;
  thankYouEmailSentAt: string | null;
  createdAt: string;
}

export interface DonationDto {
  id: number;
  branch_id: number | null;
  amount: number;
  declared_amount: number | null;
  currency: Currency;
  donor_name: string | null;
  donor_email: string | null;
  donor_phone: string | null;
  payment_method: PaymentMethod;
  mobile_operator: MobileOperator | null;
  transaction_reference: string | null;
  in_kind_description?: string | null;
  status: DonationStatus;
  rejection_reason: string | null;
  status_updated_at: string | null;
  thank_you_email_sent_at: string | null;
  created_at: string;
}

export function mapDonation(dto: DonationDto): Donation {
  return {
    id: dto.id,
    branchId: dto.branch_id,
    amount: dto.amount,
    declaredAmount: dto.declared_amount,
    currency: dto.currency,
    donorName: dto.donor_name,
    donorEmail: dto.donor_email,
    donorPhone: dto.donor_phone,
    paymentMethod: dto.payment_method,
    mobileOperator: dto.mobile_operator,
    transactionReference: dto.transaction_reference,
    inKindDescription: dto.in_kind_description ?? null,
    status: dto.status,
    rejectionReason: dto.rejection_reason,
    statusUpdatedAt: dto.status_updated_at,
    thankYouEmailSentAt: dto.thank_you_email_sent_at,
    createdAt: dto.created_at,
  };
}

/** What the donor gets back after donating (no verification data). */
export interface DonationReceipt {
  id: number;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  status: DonationStatus;
  donorName: string | null;
  createdAt: string;
}

export interface DonationReceiptDto {
  id: number;
  amount: number;
  currency: Currency;
  payment_method: PaymentMethod;
  status: DonationStatus;
  donor_name: string | null;
  created_at: string;
}

export function mapDonationReceipt(dto: DonationReceiptDto): DonationReceipt {
  return {
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency,
    paymentMethod: dto.payment_method,
    status: dto.status,
    donorName: dto.donor_name,
    createdAt: dto.created_at,
  };
}

export interface MobileMoneyAccount {
  operator: MobileOperator;
  label: string;
  number: string;
}

/** Bank account (RIB) for a transfer; the admin records the transfer once received. */
export interface BankTransferAccount {
  holder: string | null;
  bankName: string | null;
  accountNumber: string | null;
  iban: string | null;
  swift: string | null;
}

export interface PaymentOptions {
  card: { enabled: boolean; simulated: boolean };
  mobileMoney: { holder: string | null; accounts: MobileMoneyAccount[] };
  /** null: no bank account set, transfer not offered */
  bankTransfer: BankTransferAccount | null;
}

export interface PaymentOptionsDto {
  card: { enabled: boolean; simulated: boolean };
  mobile_money: { holder: string | null; accounts: MobileMoneyAccount[] };
  bank_transfer: {
    holder: string | null;
    bank_name: string | null;
    account_number: string | null;
    iban: string | null;
    swift: string | null;
  } | null;
}

export interface CardDonationInput {
  branchId?: number;
  currency: Currency;
  amount: number;
  donorEmail: string;
  donorName?: string;
  paymentToken: string;
}

export interface MobileMoneyDeclarationInput {
  branchId?: number;
  operator: MobileOperator;
  senderPhone: string;
  transactionReference: string;
  amount: number;
  donorEmail: string;
  donorName?: string;
  /** Anti-spam trap field, always empty for a real donor */
  website?: string;
}

/** A donation received, recorded by an admin: Mobile Money not declared, cash, bank transfer, or material. */
export type ManualDonationInput = {
  branchId?: number;
  donorEmail?: string;
  donorName?: string;
} & (
  | { kind: "MOBILE_MONEY"; operator: MobileOperator; senderPhone: string; transactionReference: string; amount: number }
  | { kind: "CASH"; amount: number; currency: Currency }
  | { kind: "BANK_TRANSFER"; amount: number; currency: Currency; transactionReference?: string }
  | { kind: "IN_KIND"; description: string }
);

