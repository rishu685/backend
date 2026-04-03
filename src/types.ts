export type UserRole = "viewer" | "analyst" | "admin";

export type UserStatus = "active" | "inactive";

export type RecordType = "income" | "expense";

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  status: UserStatus;
}
