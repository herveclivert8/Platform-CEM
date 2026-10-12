import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPaginated, type PaginatedDto, type Pillar } from "../types/post";
import { mapProject, type ProjectDto, type ProjectPhase } from "../types/project";
import { useAuthStore } from "../store/authStore";
import { canSeeMemberContent } from "../types/user";

/** Members-only content (ongoing projects, authors' emails) depends on who is signed in. */
export function useCanSeeMemberContent(): boolean {
  return useAuthStore((s) => (s.isAuthenticated ? canSeeMemberContent(s.user) : false));
}

interface ProjectsParams {
  phase: ProjectPhase;
  branchId?: number;
  pillar?: Pillar;
  page?: number;
  pageSize?: number;
}

/** Public listing: validated (published) projects only. */
export function useProjects({ phase, branchId, pillar, page = 1, pageSize = 12 }: ProjectsParams) {
  const memberView = useCanSeeMemberContent();
  return useQuery({
    queryKey: ["projects", phase, branchId, pillar, page, pageSize, memberView],
    // Ongoing projects are reserved for members: visitors never request them
    enabled: phase === "COMPLETED" || memberView,
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<ProjectDto>>("/projects", {
        params: { phase, branch_id: branchId, pillar, page, page_size: pageSize },
      });
      return mapPaginated(data, mapProject);
    },
  });
}

export function useProject(projectId: number | undefined) {
  const memberView = useCanSeeMemberContent();
  return useQuery({
    queryKey: ["project", projectId, memberView],
    queryFn: async () => {
      const { data } = await api.get<ProjectDto>(`/projects/${projectId}`);
      return mapProject(data);
    },
    enabled: projectId !== undefined,
    retry: false,
  });
}
