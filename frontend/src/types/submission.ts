export interface ProjectSubmissionInput {
  applicantName: string;
  email: string;
  projectSummary: string;
  /** Anti-spam trap field, always empty for a real applicant */
  website?: string;
}

export type SubmissionStatus = "RECEIVED" | "IN_REVIEW" | "ACCEPTED" | "REJECTED";

export const SUBMISSION_STATUSES: SubmissionStatus[] = ["RECEIVED", "IN_REVIEW", "ACCEPTED", "REJECTED"];

export interface ProjectSubmission {
  id: number;
  branchId: number;
  applicantName: string;
  email: string;
  projectSummary: string;
  status: SubmissionStatus;
  internalNotes: string | null;
  statusUpdatedAt: string | null;
  acknowledgmentSentAt: string | null;
  createdAt: string;
}

export interface ProjectSubmissionDto {
  id: number;
  branch_id: number;
  applicant_name: string;
  email: string;
  project_summary: string;
  status: SubmissionStatus;
  internal_notes: string | null;
  status_updated_at: string | null;
  acknowledgment_sent_at: string | null;
  created_at: string;
}

export function mapProjectSubmission(dto: ProjectSubmissionDto): ProjectSubmission {
  return {
    id: dto.id,
    branchId: dto.branch_id,
    applicantName: dto.applicant_name,
    email: dto.email,
    projectSummary: dto.project_summary,
    status: dto.status,
    internalNotes: dto.internal_notes,
    statusUpdatedAt: dto.status_updated_at,
    acknowledgmentSentAt: dto.acknowledgment_sent_at,
    createdAt: dto.created_at,
  };
}
