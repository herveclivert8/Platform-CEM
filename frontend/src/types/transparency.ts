export interface TransparencyReport {
  id: number;
  title: string;
  description: string;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  branchId: number;
  branchName: string;
}

export interface DonationTotal {
  year: number | null;
  currency: string;
  amount: number;
  count: number;
}

export interface Transparency {
  branches: number;
  countries: number;
  achievements: number;
  ongoingProjects: number;
  beneficiaries: number;
  reports: TransparencyReport[];
  /** null: the super admin has not chosen to publish donation amounts */
  donationsByYear: DonationTotal[] | null;
  donationsTotal: DonationTotal[] | null;
}

export interface TransparencyDto {
  branches: number;
  countries: number;
  achievements: number;
  ongoing_projects: number;
  beneficiaries: number;
  reports: {
    id: number;
    title: string;
    description: string;
    file_url: string | null;
    thumbnail_url: string | null;
    created_at: string;
    branch_id: number;
    branch_name: string;
  }[];
  donations_by_year: DonationTotal[] | null;
  donations_total: DonationTotal[] | null;
}

export function mapTransparency(dto: TransparencyDto): Transparency {
  return {
    branches: dto.branches,
    countries: dto.countries,
    achievements: dto.achievements,
    ongoingProjects: dto.ongoing_projects,
    beneficiaries: dto.beneficiaries,
    reports: dto.reports.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      fileUrl: r.file_url,
      thumbnailUrl: r.thumbnail_url,
      createdAt: r.created_at,
      branchId: r.branch_id,
      branchName: r.branch_name,
    })),
    donationsByYear: dto.donations_by_year,
    donationsTotal: dto.donations_total,
  };
}
