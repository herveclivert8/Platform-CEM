export interface ProjectSubmissionInput {
  applicantName: string;
  email: string;
  projectSummary: string;
}

export interface ProjectSubmission {
  id: number;
  branchId: number;
  applicantName: string;
  email: string;
  projectSummary: string;
  createdAt: string;
}

export interface ProjectSubmissionDto {
  id: number;
  branch_id: number;
  applicant_name: string;
  email: string;
  project_summary: string;
  created_at: string;
}

export function mapProjectSubmission(dto: ProjectSubmissionDto): ProjectSubmission {
  return {
    id: dto.id,
    branchId: dto.branch_id,
    applicantName: dto.applicant_name,
    email: dto.email,
    projectSummary: dto.project_summary,
    createdAt: dto.created_at,
  };
}
