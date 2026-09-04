export type BranchStatus = "active" | "inactive" | "pending";

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  photoUrl: string | null;
}

export interface BranchManager {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface Branch {
  id: number;
  cityName: string;
  country: string;
  continent: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  managerId: number | null;
  status: BranchStatus;
  publicationCount?: number;
  createdAt: string;
  /** Only populated by the single-branch fetch (GET /branches/:id), absent from the paginated list. */
  manager?: BranchManager | null;
  teamMembers?: TeamMember[];
}

/** DTO shape actually returned by the FastAPI backend (snake_case). */
export interface TeamMemberDto {
  id: number;
  name: string;
  role: string;
  photo_url: string | null;
}

export interface BranchManagerDto {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export interface BranchDto {
  id: number;
  name: string;
  country: string;
  continent: string | null;
  latitude: number | null;
  longitude: number | null;
  physical_address: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  manager_id: number | null;
  status: BranchStatus;
  publication_count?: number;
  created_at: string;
  manager?: BranchManagerDto | null;
  team_members?: TeamMemberDto[];
}

export function mapBranch(dto: BranchDto): Branch {
  return {
    id: dto.id,
    cityName: dto.name,
    country: dto.country,
    continent: dto.continent,
    lat: dto.latitude,
    lng: dto.longitude,
    address: dto.physical_address,
    description: dto.description,
    logoUrl: dto.logo_url,
    bannerUrl: dto.banner_url,
    contactName: dto.contact_name,
    contactEmail: dto.contact_email,
    contactPhone: dto.contact_phone,
    managerId: dto.manager_id,
    status: dto.status,
    publicationCount: dto.publication_count,
    createdAt: dto.created_at,
    manager: dto.manager
      ? {
          id: dto.manager.id,
          fullName: dto.manager.full_name,
          email: dto.manager.email,
          avatarUrl: dto.manager.avatar_url,
        }
      : (dto.manager as null | undefined),
    teamMembers: dto.team_members?.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      photoUrl: m.photo_url,
    })),
  };
}
