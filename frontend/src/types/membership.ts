import type { Currency, MobileOperator } from "./donation";
import type { MembershipStatus } from "./user";

export type MembershipPaymentKind = "REGISTRATION" | "MONTHLY";
export type MembershipPaymentMethod = "CARD" | "MOBILE_MONEY" | "CASH";
export type MembershipPaymentStatus = "PENDING" | "CONFIRMED" | "REJECTED";

/** Simulated amounts set by the server, per payment kind then per currency. */
export interface MembershipFees {
  REGISTRATION: Record<Currency, number>;
  MONTHLY: Record<Currency, number>;
}

export interface MembershipPayment {
  id: number;
  userId: number;
  branchId: number | null;
  kind: MembershipPaymentKind;
  amount: number;
  currency: Currency;
  paymentMethod: MembershipPaymentMethod;
  mobileOperator: MobileOperator | null;
  senderPhone: string | null;
  transactionReference: string | null;
  status: MembershipPaymentStatus;
  rejectionReason: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export interface MembershipPaymentDto {
  id: number;
  user_id: number;
  branch_id: number | null;
  kind: MembershipPaymentKind;
  amount: number;
  currency: Currency;
  payment_method: MembershipPaymentMethod;
  mobile_operator: MobileOperator | null;
  sender_phone: string | null;
  transaction_reference: string | null;
  status: MembershipPaymentStatus;
  rejection_reason: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export function mapMembershipPayment(dto: MembershipPaymentDto): MembershipPayment {
  return {
    id: dto.id,
    userId: dto.user_id,
    branchId: dto.branch_id,
    kind: dto.kind,
    amount: Number(dto.amount),
    currency: dto.currency,
    paymentMethod: dto.payment_method,
    mobileOperator: dto.mobile_operator,
    senderPhone: dto.sender_phone,
    transactionReference: dto.transaction_reference,
    status: dto.status,
    rejectionReason: dto.rejection_reason,
    periodStart: dto.period_start,
    periodEnd: dto.period_end,
    createdAt: dto.created_at,
  };
}

export interface AdminMembershipPayment extends MembershipPayment {
  memberName: string;
  memberEmail: string;
  branchName: string | null;
}

export interface AdminMembershipPaymentDto extends MembershipPaymentDto {
  member_name: string;
  member_email: string;
  branch_name: string | null;
}

export interface MembershipSummary {
  membershipStatus: MembershipStatus;
  paidUntil: string | null;
  hasAccess: boolean;
  registrationPaid: boolean;
  registrationPending: boolean;
  monthlyPending: boolean;
  payments: MembershipPayment[];
  /** Member card */
  memberNumber: number;
  memberSince: string;
}

export interface MembershipSummaryDto {
  membership_status: MembershipStatus;
  paid_until: string | null;
  has_access: boolean;
  registration_paid: boolean;
  registration_pending: boolean;
  monthly_pending: boolean;
  payments: MembershipPaymentDto[];
  member_number: number;
  member_since: string;
}

export function mapMembershipSummary(dto: MembershipSummaryDto): MembershipSummary {
  return {
    membershipStatus: dto.membership_status,
    paidUntil: dto.paid_until,
    hasAccess: dto.has_access,
    registrationPaid: dto.registration_paid,
    registrationPending: dto.registration_pending,
    monthlyPending: dto.monthly_pending,
    payments: dto.payments.map(mapMembershipPayment),
    memberNumber: dto.member_number,
    memberSince: dto.member_since,
  };
}

export interface AdminMember {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  branchId: number | null;
  branchName: string | null;
  membershipStatus: MembershipStatus;
  paidUntil: string | null;
  hasAccess: boolean;
  registrationPaid: boolean;
  pendingPayments: number;
  createdAt: string;
}

export interface AdminMemberDto {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  branch_id: number | null;
  branch_name: string | null;
  membership_status: MembershipStatus;
  paid_until: string | null;
  has_access: boolean;
  registration_paid: boolean;
  pending_payments: number;
  created_at: string;
}

export function mapAdminMember(dto: AdminMemberDto): AdminMember {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.first_name,
    lastName: dto.last_name,
    phone: dto.phone,
    branchId: dto.branch_id,
    branchName: dto.branch_name,
    membershipStatus: dto.membership_status,
    paidUntil: dto.paid_until,
    hasAccess: dto.has_access,
    registrationPaid: dto.registration_paid,
    pendingPayments: dto.pending_payments,
    createdAt: dto.created_at,
  };
}

/** "2026-11-07" -> "7 novembre 2026" in the UI language. */
export function formatDay(iso: string, language: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" });
}

export interface ProjectComment {
  id: number;
  parentId: number | null;
  authorId: number;
  authorName: string;
  authorIsAdmin: boolean;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  canDelete: boolean;
  replies: ProjectComment[];
}

export interface ProjectCommentDto {
  id: number;
  parent_id: number | null;
  author_id: number;
  author_name: string;
  author_is_admin: boolean;
  author_avatar_url?: string | null;
  body: string;
  created_at: string;
  can_delete: boolean;
  replies: ProjectCommentDto[];
}

export function mapProjectComment(dto: ProjectCommentDto): ProjectComment {
  return {
    id: dto.id,
    parentId: dto.parent_id,
    authorId: dto.author_id,
    authorName: dto.author_name,
    authorIsAdmin: dto.author_is_admin,
    authorAvatarUrl: dto.author_avatar_url ?? null,
    body: dto.body,
    createdAt: dto.created_at,
    canDelete: dto.can_delete,
    replies: dto.replies.map(mapProjectComment),
  };
}

/** A published project the member has commented on. */
export interface MyDiscussion {
  projectId: number;
  title: string;
  phase: "ONGOING" | "COMPLETED";
  branchName: string;
  myComments: number;
  totalComments: number;
  lastActivityAt: string;
}

/** Whole days from today (UTC) to an ISO date: 0 on the due day, negative once passed. */
export function daysUntil(iso: string): number {
  const today = new Date(new Date().toISOString().slice(0, 10));
  return Math.round((new Date(iso).getTime() - today.getTime()) / 86_400_000);
}
