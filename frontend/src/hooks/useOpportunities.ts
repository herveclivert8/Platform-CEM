import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export type ApplicationStatus = "NEW" | "IN_REVIEW" | "ACCEPTED" | "REJECTED";

export interface MyApplication {
  id: number;
  status: ApplicationStatus;
  createdAt: string;
}

/** Most files a member may attach to one application (as checked by the API). */
export const MAX_APPLICATION_FILES = 5;
export const MAX_APPLICATION_FILE_BYTES = 10 * 1024 * 1024;

export interface ApplicationFile {
  id: number;
  fileName: string;
  size: number;
}

export interface Application {
  id: number;
  lastName: string;
  firstName: string;
  memberNumber: string;
  branchName: string | null;
  phone: string;
  email: string;
  studyLevel: string;
  faculty: string;
  major: string;
  motivation: string;
  files: ApplicationFile[];
  status: ApplicationStatus;
  createdAt: string;
}

interface ApplicationDto {
  id: number;
  last_name: string;
  first_name: string;
  member_number: string;
  branch_name: string | null;
  phone: string;
  email: string;
  study_level: string;
  faculty: string;
  major: string;
  motivation: string;
  files: { id: number; file_name: string; size: number }[];
  status: ApplicationStatus;
  created_at: string;
}

export interface ItalyApplicationInput {
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  studyLevel: string;
  faculty: string;
  major: string;
  motivation: string;
  files: File[];
}

/** Signed-in member's latest application to the studies in Italy (null: none yet). */
export function useMyItalyApplication(enabled: boolean) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["italy-application", userId],
    queryFn: async () => {
      const { data } = await api.get<{ id: number; status: ApplicationStatus; created_at: string } | null>(
        "/opportunities/italy/applications/me",
      );
      return data ? ({ id: data.id, status: data.status, createdAt: data.created_at } satisfies MyApplication) : null;
    },
    enabled: enabled && !!userId,
  });
}

export function useApplyItaly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ItalyApplicationInput) => {
      const formData = new FormData();
      formData.append("last_name", input.lastName);
      formData.append("first_name", input.firstName);
      formData.append("phone", input.phone);
      formData.append("email", input.email);
      formData.append("study_level", input.studyLevel);
      formData.append("faculty", input.faculty);
      formData.append("major", input.major);
      formData.append("motivation", input.motivation);
      for (const file of input.files) formData.append("files", file);
      // Let the browser set the multipart boundary (the shared client defaults to JSON)
      await api.post("/opportunities/italy/applications", formData, { headers: { "Content-Type": undefined } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["italy-application"] }),
  });
}

/** Super Admin back-office list. */
export function useApplications(filters: { page: number; status?: ApplicationStatus; q?: string }) {
  return useQuery({
    queryKey: ["opportunity-applications", filters],
    queryFn: async () => {
      const { data } = await api.get<{
        items: ApplicationDto[];
        total: number;
        page: number;
        total_pages: number;
        counts: Record<ApplicationStatus, number>;
      }>("/opportunities/applications", {
        params: { page: filters.page, page_size: 20, status: filters.status, q: filters.q?.trim() || undefined },
      });
      return {
        items: data.items.map<Application>((a) => ({
          id: a.id,
          lastName: a.last_name,
          firstName: a.first_name,
          memberNumber: a.member_number,
          branchName: a.branch_name,
          phone: a.phone,
          email: a.email,
          studyLevel: a.study_level,
          faculty: a.faculty,
          major: a.major,
          motivation: a.motivation,
          files: a.files.map((f) => ({ id: f.id, fileName: f.file_name, size: f.size })),
          status: a.status,
          createdAt: a.created_at,
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

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ApplicationStatus }) => {
      await api.patch(`/opportunities/applications/${id}`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["opportunity-applications"] }),
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/opportunities/applications/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["opportunity-applications"] }),
  });
}

/** Download one attached file through the API (no public link), then hand it to the browser. */
export async function downloadApplicationFile(application: Application, file: ApplicationFile): Promise<void> {
  const { data } = await api.get<Blob>(`/opportunities/applications/${application.id}/files/${file.id}`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
