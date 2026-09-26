import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPaginated, type PaginatedDto, type Pillar } from "../types/post";
import { mapProject, type ProjectDto, type ProjectPhase } from "../types/project";

interface ProjectsParams {
  phase: ProjectPhase;
  branchId?: number;
  pillar?: Pillar;
  page?: number;
  pageSize?: number;
}

/** Public listing: validated (published) projects only. */
export function useProjects({ phase, branchId, pillar, page = 1, pageSize = 12 }: ProjectsParams) {
  return useQuery({
    queryKey: ["projects", phase, branchId, pillar, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<ProjectDto>>("/projects", {
        params: { phase, branch_id: branchId, pillar, page, page_size: pageSize },
      });
      return mapPaginated(data, mapProject);
    },
  });
}

export function useProject(projectId: number | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await api.get<ProjectDto>(`/projects/${projectId}`);
      return mapProject(data);
    },
    enabled: projectId !== undefined,
    retry: false,
  });
}
