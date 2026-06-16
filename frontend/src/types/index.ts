export type UserRole = 'admin' | 'trainer' | 'client' | 'gym_owner' | 'staff'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

export interface AuthContextType {
  user: User | null
  /** Trainer.id or Client.id for the logged-in user (null for admin/staff). */
  profileId: number | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (data: RegisterData) => Promise<void>
  refreshUser: () => Promise<void>
}

export interface RegisterData {
  email: string
  password: string
  name: string
  role: UserRole
}

export interface RentalInquiry {
  name: string
  email: string
  phone: string
  message: string
}
