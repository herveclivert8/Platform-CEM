export type UserRole = "SUPER_ADMIN" | "BRANCH_ADMIN" | "MEMBER";

/** SUSPENDED: monthly fee unpaid on the 30th, deactivated until a branch admin reactivates it */
export type MembershipStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";

/** Admins reach the back-office; members only the member area. */
export function isAdminRole(role: UserRole | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "BRANCH_ADMIN";
}

/** ACTIVE: signed up on the site, pays the fees. BENEFACTOR / SPONSOR: account created by the Super Admin, read-only. */
export type MembershipType = "ACTIVE" | "BENEFACTOR" | "SPONSOR";

/** Admins, approved members with this month's fee paid, and accepted benefactors / sponsors: they see members-only content (ongoing projects, authors' emails). */
export function canSeeMemberContent(user: CurrentUser | null): boolean {
  return !!user && (isAdminRole(user.role) || user.memberAccess);
}

/** Benefactor or sponsor: sees ongoing projects, but neither proposes projects, discusses nor pays fees. */
export function isSupporter(user: CurrentUser | null): boolean {
  return !!user && user.role === "MEMBER" && !!user.membershipType && user.membershipType !== "ACTIVE";
}

/** Where a user lands after signing in. */
export function homePathFor(role: UserRole | undefined): string {
  return isAdminRole(role) ? "/admin" : "/espace-membre";
}

export interface CurrentUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  branchId: number | null;
  branchName: string | null;
  /** Temporary password: must be replaced before accessing the admin area */
  mustChangePassword: boolean;
  /** Members only */
  membershipStatus: MembershipStatus | null;
  /** Members: last day covered by the monthly fees (ISO date) */
  paidUntil: string | null;
  /** Sees members-only content: approved member with this month's fee paid, or accepted benefactor / sponsor */
  memberAccess: boolean;
  /** Members only */
  membershipType: MembershipType | null;
  /** Given when the membership is approved (e.g. PARI0045) */
  memberNumber: string | null;
  /** Active member with this month's fee paid: may propose projects and join discussions */
  canParticipate: boolean;
  phone: string | null;
  avatarUrl: string | null;
}

/** DTO shape returned by the FastAPI backend (snake_case). */
export interface CurrentUserDto {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  branch_id: number | null;
  branch_name: string | null;
  must_change_password?: boolean;
  membership_status?: MembershipStatus | null;
  paid_until?: string | null;
  member_access?: boolean;
  membership_type?: MembershipType | null;
  member_number?: string | null;
  can_participate?: boolean;
  phone?: string | null;
  avatar_url?: string | null;
}

export function mapCurrentUser(dto: CurrentUserDto): CurrentUser {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.first_name,
    lastName: dto.last_name,
    role: dto.role,
    branchId: dto.branch_id,
    branchName: dto.branch_name,
    mustChangePassword: dto.must_change_password ?? false,
    membershipStatus: dto.membership_status ?? null,
    paidUntil: dto.paid_until ?? null,
    memberAccess: dto.member_access ?? false,
    membershipType: dto.membership_type ?? null,
    memberNumber: dto.member_number ?? null,
    canParticipate: dto.can_participate ?? false,
    phone: dto.phone ?? null,
    avatarUrl: dto.avatar_url ?? null,
  };
}
