export type UserRole = "user" | "admin";

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

export interface AdminUserEntry {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
}
