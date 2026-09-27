export type PublicationFormat = "pdf" | "rapport";

export interface Publication {
  id: number;
  branchId: number;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  fileUrl: string | null;
  format: PublicationFormat;
  createdAt: string;
}

export interface PublicationDto {
  id: number;
  branch_id: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
  file_url: string | null;
  format: PublicationFormat;
  created_at: string;
}

export function mapPublication(dto: PublicationDto): Publication {
  return {
    id: dto.id,
    branchId: dto.branch_id,
    title: dto.title,
    description: dto.description,
    thumbnailUrl: dto.thumbnail_url,
    fileUrl: dto.file_url,
    format: dto.format,
    createdAt: dto.created_at,
  };
}

/** A report in the back-office list, with its branch name. */
export interface AdminPublication extends Publication {
  branchName: string | null;
}

export interface AdminPublicationDto extends PublicationDto {
  branch_name: string | null;
}

export function mapAdminPublication(dto: AdminPublicationDto): AdminPublication {
  return { ...mapPublication(dto), branchName: dto.branch_name };
}

/** Create / update payload (snake_case). Titles and descriptions are typed in French only. */
export interface PublicationInput {
  title: string;
  description: string;
  file_url: string | null;
  thumbnail_url: string | null;
  format: PublicationFormat;
}
