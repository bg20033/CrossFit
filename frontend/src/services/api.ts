import sharedClient from '../utils/api'
import type { User, RegisterData, UserRole } from '../types'
import { normalizeRole } from '../lib/roles'

interface AuthPayload {
  user: User
  token: string
  refreshToken: string
}

// Typed API surface. Reuses the single shared axios instance (utils/api) so
// auth headers + 401-refresh rotation are applied consistently everywhere.
class ApiService {
  private client = sharedClient

  async login(email: string, password: string): Promise<AuthPayload> {
    const { data } = await this.client.post('/auth/login', { email, password })
    return data
  }

  async register(data: RegisterData): Promise<AuthPayload> {
    const res = await this.client.post('/auth/register', data)
    return res.data
  }

  async refresh(refreshToken: string): Promise<AuthPayload> {
    const { data } = await this.client.post('/auth/refresh', { refreshToken })
    return data
  }

  logout(refreshToken: string | null) {
    if (!refreshToken) return Promise.resolve()
    return this.client.post('/auth/logout', { refreshToken }).catch(() => {})
  }

  logoutAll() {
    return this.client.post('/auth/logout-all')
  }

  async getMe(): Promise<User> {
    const { data } = await this.client.get('/auth/me')
    return { ...data, role: normalizeRole(data.role) as UserRole }
  }

  async getPermissions(): Promise<string[]> {
    const { data } = await this.client.get('/roles/me/permissions')
    return Array.isArray(data?.permissions) ? data.permissions : []
  }

  async updateProfile(data: { name?: string; email?: string }): Promise<User> {
    const res = await this.client.put('/auth/profile', data)
    return res.data
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.client.post('/auth/change-password', { currentPassword, newPassword })
  }

  getClientMe() {
    return this.client.get('/clients/me')
  }

  getTrainerMe() {
    return this.client.get('/trainers/me')
  }
}

export const api = new ApiService()
export default api
