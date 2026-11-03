import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import i18n from "../i18n/i18n";
import type { SupporterKind } from "../config/membershipTypes";

/** ACCEPTED: membership accepted by the Super Admin, an account was created */
export type SupporterContactStatus = "NEW" | "CONTACTED" | "ACCEPTED";

export interface SupporterContact {
  id: number;
  kind: SupporterKind;
  fullName: string;
  email: string;
  phone: string | null;
  message: string | null;
  lang: string;
  status: SupporterContactStatus;
  createdAt: string;
  contactedAt: string | null;
  acceptedAt: string | null;
  /** Accepted, and the account may sign in (access not removed) */
  hasAccountAccess: boolean;
}

interface SupporterContactDto {
  id: number;
  kind: SupporterKind;
  full_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  lang: string;
  status: SupporterContactStatus;
  created_at: string;
  contacted_at: string | null;
  accepted_at: string | null;
  has_account_access: boolean;
}

interface SupporterContactListDto {
  items: SupporterContactDto[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  counts: Record<SupporterContactStatus, number>;
}

export interface SupporterContactInput {
  kind: SupporterKind;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  website: string;
}

/** Public form: benefactors and sponsors leave their details (no account). */
export function useCreateSupporterContact() {
  return useMutation({
    mutationFn: async (input: SupporterContactInput) => {
      await api.post("/supporter-contacts", {
        kind: input.kind,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone || null,
        message: input.message || null,
        website: input.website,
        lang: i18n.language?.startsWith("en") ? "en" : "fr",
      });
    },
  });
}

/** Super Admin back-office list. */
export function useSupporterContacts(filters: { page: number; kind?: SupporterKind; status?: SupporterContactStatus; q?: string }) {
  return useQuery({
    queryKey: ["supporter-contacts", filters],
    queryFn: async () => {
      const { data } = await api.get<SupporterContactListDto>("/supporter-contacts", {
        params: { page: filters.page, page_size: 20, kind: filters.kind, status: filters.status, q: filters.q?.trim() || undefined },
      });
      return {
        items: data.items.map<SupporterContact>((c) => ({
          id: c.id,
          kind: c.kind,
          fullName: c.full_name,
          email: c.email,
          phone: c.phone,
          message: c.message,
          lang: c.lang,
          status: c.status,
          createdAt: c.created_at,
          contactedAt: c.contacted_at,
          acceptedAt: c.accepted_at,
          hasAccountAccess: c.has_account_access,
        })),
        total: data.total,
        page: data.page,
        totalPages: data.total_pages,
        counts: data.counts,
      };
    },
    placeholderData: keepPreviousData,
  });
}

export function useUpdateSupporterContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: SupporterContactStatus }) => {
      await api.patch(`/supporter-contacts/${id}`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supporter-contacts"] }),
  });
}

export function useDeleteSupporterContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/supporter-contacts/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supporter-contacts"] }),
  });
}

/** Accept the membership: creates the account; the temporary password is shown once to the Super Admin. */
export function useAcceptSupporterContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, firstName, lastName }: { id: number; firstName: string; lastName: string }) => {
      const { data } = await api.post<{ temporary_password: string; welcome_email_sent: boolean }>(
        `/supporter-contacts/${id}/accept`,
        { first_name: firstName, last_name: lastName },
      );
      return { temporaryPassword: data.temporary_password, welcomeEmailSent: data.welcome_email_sent };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supporter-contacts"] }),
  });
}

/** Remove (or give back) the account's access. */
export function useSetSupporterAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await api.post(`/supporter-contacts/${id}/access`, { active });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supporter-contacts"] }),
  });
}
