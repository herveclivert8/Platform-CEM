export interface DonationInput {
  branchId?: number;
  amount: number;
  donorEmail: string;
}

export interface Donation {
  id: number;
  branchId: number | null;
  amount: number;
  donorEmail: string;
  createdAt: string;
}

export interface DonationDto {
  id: number;
  branch_id: number | null;
  amount: number;
  donor_email: string;
  created_at: string;
}

export function mapDonation(dto: DonationDto): Donation {
  return {
    id: dto.id,
    branchId: dto.branch_id,
    amount: dto.amount,
    donorEmail: dto.donor_email,
    createdAt: dto.created_at,
  };
}
