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
