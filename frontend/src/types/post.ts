export type Pillar = "EDUCATION" | "SOCIAL" | "SPORT" | "ENTERPRISE";
export type PostStatus = "DRAFT" | "PUBLISHED";

export const ALL_PILLARS: Pillar[] = ["EDUCATION", "SOCIAL", "SPORT", "ENTERPRISE"];

export interface Post {
  id: number;
  branchId: number;
  authorId: number | null;
  title: string;
  content: string;
  pillar: Pillar;
  status: PostStatus;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PostDto {
  id: number;
  branch_id: number;
  author_id: number | null;
  title: string;
  content: string;
  pillar: Pillar;
  status: PostStatus;
  images: string[];
  created_at: string;
  updated_at: string;
}

export function mapPost(dto: PostDto): Post {
  return {
    id: dto.id,
    branchId: dto.branch_id,
    authorId: dto.author_id,
    title: dto.title,
    content: dto.content,
    pillar: dto.pillar,
    status: dto.status,
    images: dto.images,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export interface PaginatedDto<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function mapPaginated<TDto, T>(
  dto: PaginatedDto<TDto>,
  mapItem: (item: TDto) => T,
): Paginated<T> {
  return {
    items: dto.items.map(mapItem),
    total: dto.total,
    page: dto.page,
    pageSize: dto.page_size,
    totalPages: dto.total_pages,
  };
}
