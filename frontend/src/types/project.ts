import type { Pillar, PaginatedDto } from "./post";

export type ProjectPhase = "ONGOING" | "COMPLETED";
export type ProjectReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Project {
  id: number;
  branchId: number;
  branchName: string;
  authorId: number | null;
  authorName: string | null;
  title: string;
  summary: string;
  description: string;
  pillar: Pillar;
  phase: ProjectPhase;
  beneficiaries: string;
  beneficiariesCount: number | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Numeric goal ("5 200 / 8 000 livres collectés"); no progress bar without it */
  goalValue: number | null;
  progressValue: number | null;
  goalUnit: string | null;
  /** Admins' choice: a hidden project is never public, even once validated */
  isVisible: boolean;
  reviewStatus: ProjectReviewStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDto {
  id: number;
  branch_id: number;
  branch_name: string;
  author_id: number | null;
  author_name: string | null;
  title: string;
  summary: string;
  description: string;
  pillar: Pillar;
  phase: ProjectPhase;
  beneficiaries: string;
  beneficiaries_count: number | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  goal_value: number | null;
  progress_value: number | null;
  goal_unit: string | null;
  is_visible?: boolean;
  review_status: ProjectReviewStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
}

export function mapProject(dto: ProjectDto): Project {
  return {
    id: dto.id,
    branchId: dto.branch_id,
    branchName: dto.branch_name,
    authorId: dto.author_id,
    authorName: dto.author_name,
    title: dto.title,
    summary: dto.summary,
    description: dto.description,
    pillar: dto.pillar,
    phase: dto.phase,
    beneficiaries: dto.beneficiaries,
    beneficiariesCount: dto.beneficiaries_count,
    location: dto.location,
    startDate: dto.start_date,
    endDate: dto.end_date,
    goalValue: dto.goal_value ?? null,
    progressValue: dto.progress_value ?? null,
    goalUnit: dto.goal_unit ?? null,
    isVisible: dto.is_visible ?? true,
    reviewStatus: dto.review_status,
    rejectionReason: dto.rejection_reason,
    reviewedAt: dto.reviewed_at,
    images: dto.images,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export type ProjectStatusCounts = Record<ProjectReviewStatus, number>;

export interface ProjectAdminListDto extends PaginatedDto<ProjectDto> {
  counts: ProjectStatusCounts;
}

/** Payload for create/update (snake_case, as sent to the API). */
export interface ProjectInput {
  branch_id?: number;
  title: string;
  summary: string;
  description: string;
  pillar: Pillar;
  phase: ProjectPhase;
  beneficiaries: string;
  beneficiaries_count: number | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  goal_value: number | null;
  progress_value: number | null;
  goal_unit: string | null;
  is_visible: boolean;
  images: string[];
}

/** Public URL segment for each phase. */
export const PHASE_PATH: Record<ProjectPhase, string> = {
  COMPLETED: "realisations",
  ONGOING: "projets-en-cours",
};
