export type BranchStatus = "active" | "inactive" | "pending";

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
}

/** DTO shape actually returned by the FastAPI backend (snake_case). */
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
  };
}
