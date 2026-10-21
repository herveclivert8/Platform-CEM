import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { mapPaginated, type Paginated, type PaginatedDto } from "../types/post";
import { mapProject, type Project, type ProjectDto } from "../types/project";
import type { Currency, MobileOperator } from "../types/donation";
import type { MembershipStatus } from "../types/user";
import {
  mapAdminMember,
  mapMembershipPayment,
  mapMembershipSummary,
  type AdminMember,
  type AdminMemberDto,
  type AdminMembershipPayment,
  type AdminMembershipPaymentDto,
  type MembershipFees,
  type MembershipPaymentKind,
  type MembershipPaymentStatus,
  type MembershipSummary,
  type MembershipSummaryDto,
  type MyDiscussion,
} from "../types/membership";
import { useScopedBranchId } from "./useAdminScope";
import { invalidateProjectQueries } from "./useAdminProjects";

/** Registration fee and monthly fee in each currency (simulated amounts, set by the server). */
export function useMembershipFees() {
  return useQuery<MembershipFees>({
    queryKey: ["membership-fees"],
    queryFn: async () => {
      const { data } = await api.get<{ registration: Record<Currency, number>; monthly: Record<Currency, number> }>(
        "/members/fees",
      );
      return { REGISTRATION: data.registration, MONTHLY: data.monthly };
    },
    staleTime: 5 * 60_000,
  });
}

/** Signed-in member's membership state and payment history. */
export function useMyMembership() {
  return useQuery<MembershipSummary>({
    queryKey: ["my-membership"],
    queryFn: async () => {
      const { data } = await api.get<MembershipSummaryDto>("/members/me");
      return mapMembershipSummary(data);
    },
  });
}

export type MembershipPaymentInput =
  | { method: "CARD"; kind: MembershipPaymentKind; currency: Currency; paymentToken: string }
  | {
      method: "MOBILE_MONEY";
      kind: MembershipPaymentKind;
      operator: MobileOperator;
      senderPhone: string;
      transactionReference: string;
    }
  | { method: "CASH"; kind: MembershipPaymentKind; currency: Currency };

export function usePayMembership() {
  const queryClient = useQueryClient();
  return useMutation<MembershipSummary, unknown, MembershipPaymentInput>({
    mutationFn: async (input) => {
      const request =
        input.method === "CARD"
          ? api.post<MembershipSummaryDto>("/members/me/payments/card", {
              kind: input.kind,
              currency: input.currency,
              payment_token: input.paymentToken,
            })
          : input.method === "MOBILE_MONEY"
            ? api.post<MembershipSummaryDto>("/members/me/payments/mobile-money", {
                kind: input.kind,
                operator: input.operator,
                sender_phone: input.senderPhone,
                transaction_reference: input.transactionReference,
              })
            : api.post<MembershipSummaryDto>("/members/me/payments/cash", {
                kind: input.kind,
                currency: input.currency,
              });
      const { data } = await request;
      return mapMembershipSummary(data);
    },
    onSuccess: (summary) => {
      queryClient.setQueryData(["my-membership"], summary);
      // The profile's access flag may have changed (card payment of the monthly fee)
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useMyProjects() {
  return useQuery<Project[]>({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data } = await api.get<ProjectDto[]>("/members/me/projects");
      return data.map(mapProject);
    },
  });
}

export interface MemberProjectInput {
  title: string;
  summary: string;
  description: string;
  pillar: string;
  beneficiaries: string;
  location: string;
  /** Optional photo, already uploaded (POST /upload/image) */
  image: string | null;
  /** Optional documents, already uploaded (POST /project-documents) */
  document_ids: number[];
}

export function useCreateMemberProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MemberProjectInput) => {
      const { data } = await api.post<ProjectDto>("/members/me/projects", {
        ...input,
        location: input.location.trim() || null,
      });
      return mapProject(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      invalidateProjectQueries(queryClient);
    },
  });
}

export function useMyDiscussions(enabled: boolean) {
  return useQuery<MyDiscussion[]>({
    queryKey: ["my-discussions"],
    queryFn: async () => {
      const { data } = await api.get<
        { project_id: number; title: string; phase: "ONGOING" | "COMPLETED"; branch_name: string; my_comments: number; total_comments: number; last_activity_at: string }[]
      >("/members/me/discussions");
      return data.map((d) => ({
        projectId: d.project_id,
        title: d.title,
        phase: d.phase,
        branchName: d.branch_name,
        myComments: d.my_comments,
        totalComments: d.total_comments,
        lastActivityAt: d.last_activity_at,
      }));
    },
    enabled,
  });
}

/** Name and phone (email and branch stay fixed). */
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { firstName: string; lastName: string; phone: string }) =>
      api.patch("/members/me/profile", { first_name: input.firstName, last_name: input.lastName, phone: input.phone }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

/** Download all of the member's personal data (right of access and portability), as a JSON file. */
export function useExportMyData() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<Blob>("/members/me/export", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mes-donnees-cem.json";
      link.click();
      URL.revokeObjectURL(url);
    },
  });
}

/** Delete one's account (right to erasure): immediate; the member is then signed out. */
export function useDeleteMyAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.post("/members/me/delete", { password }),
    onSuccess: () => {
      // The server already closed every session: forget them locally, without calling /auth/logout
      useAuthStore.getState().logout();
      queryClient.clear();
    },
  });
}

/** Profile photo: an uploaded image's url, or null to remove it. */
export function useSetMyAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (avatarUrl: string | null) => api.put("/members/me/avatar", { avatar_url: avatarUrl }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

// ============================================
// Back-office
// ============================================

export interface AdminMemberFilters {
  page: number;
  status?: MembershipStatus;
  q?: string;
}

export function useAdminMembers(filters: AdminMemberFilters) {
  const branchId = useScopedBranchId();
  return useQuery<Paginated<AdminMember>>({
    queryKey: ["admin-members", branchId ?? "all", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<AdminMemberDto>>("/members/admin", {
        params: {
          branch_id: branchId,
          page: filters.page,
          page_size: 20,
          membership_status: filters.status || undefined,
          q: filters.q?.trim() || undefined,
        },
      });
      return mapPaginated(data, mapAdminMember);
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminMembershipPayments(status: MembershipPaymentStatus | undefined, page: number) {
  const branchId = useScopedBranchId();
  return useQuery<Paginated<AdminMembershipPayment>>({
    queryKey: ["admin-membership-payments", branchId ?? "all", status, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<AdminMembershipPaymentDto>>("/members/admin/payments", {
        params: { branch_id: branchId, status, page, page_size: 20 },
      });
      return mapPaginated(data, (dto) => ({
        ...mapMembershipPayment(dto),
        memberName: dto.member_name,
        memberEmail: dto.member_email,
        branchName: dto.branch_name,
      }));
    },
    placeholderData: keepPreviousData,
  });
}

function useMemberAdminMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      queryClient.invalidateQueries({ queryKey: ["admin-membership-payments"] });
    },
  });
}

export function useApproveMember() {
  return useMemberAdminMutation((memberId: number) => api.post(`/members/admin/${memberId}/approve`));
}

/** Reactivates an account suspended for an unpaid fee, once this month's fee is paid. */
export function useReactivateMember() {
  return useMemberAdminMutation((memberId: number) => api.post(`/members/admin/${memberId}/reactivate`));
}

export function useRejectMember() {
  return useMemberAdminMutation(({ memberId, reason }: { memberId: number; reason: string }) =>
    api.post(`/members/admin/${memberId}/reject`, { reason }),
  );
}

export function useConfirmMembershipPayment() {
  return useMemberAdminMutation((paymentId: number) => api.post(`/members/admin/payments/${paymentId}/confirm`));
}

export function useRejectMembershipPayment() {
  return useMemberAdminMutation(({ paymentId, reason }: { paymentId: number; reason: string }) =>
    api.post(`/members/admin/payments/${paymentId}/reject`, { reason }),
  );
}

/** Cash received at the branch counter, recorded (and confirmed) by an admin. */
export function useRecordCashPayment() {
  return useMemberAdminMutation(
    ({ memberId, kind, currency }: { memberId: number; kind: MembershipPaymentKind; currency: Currency }) =>
      api.post(`/members/admin/${memberId}/payments/cash`, { kind, currency }),
  );
}
