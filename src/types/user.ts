
export enum UserRole {
  MSME = 'MSME',
  BUYER = 'BUYER',
}

export interface Profile {
  id: string; // UUID
  email: string | null;
  full_name: string | null;
  role: UserRole | null;
  created_at: string; // ISO string date
  updated_at: string; // ISO string date
}
