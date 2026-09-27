export type UserRole = "SUPER_ADMIN" | "BRANCH_ADMIN";

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
  };
}
