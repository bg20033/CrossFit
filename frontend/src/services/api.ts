import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import type { User, RegisterData, UserRole } from '../types'
import { normalizeRole } from '../lib/roles'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    })

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('authToken')
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.handleUnauthorized()
        }
        return Promise.reject(error)
      }
    )
  }

  private handleUnauthorized() {
    localStorage.removeItem('authToken')
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login'
    }
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.client.post('/auth/login', { email, password })
    return response.data
  }

  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const response = await this.client.post('/auth/register', data)
    return response.data
  }

  async getMe(): Promise<User> {
    const response = await this.client.get('/auth/me')
    return normalizeRole(response.data.role || response.data)
      ? { ...response.data, role: normalizeRole(response.data.role) as UserRole }
      : response.data
  }

  async updateProfile(data: { name?: string; email?: string }): Promise<User> {
    const response = await this.client.put('/auth/profile', data)
    return response.data
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

  getClients(params?: { page?: number; pageSize?: number; search?: string }) {
    return this.client.get('/clients', { params })
  }

  getClient(id: number) {
    return this.client.get(`/clients/${id}`)
  }

  getAttendance(params?: { startDate?: string; endDate?: string; clientId?: number }) {
    return this.client.get('/attendance', { params })
  }

  getAttendanceStats(params?: { clientId?: number; groupId?: number; period?: string }) {
    return this.client.get('/attendance/stats', { params })
  }

  checkIn(data: { clientId: number; groupId?: number }) {
    return this.client.post('/attendance/checkin', data)
  }

  checkOut(data: { clientId: number }) {
    return this.client.post('/attendance/checkout', data)
  }

  getWorkoutPlans(params?: { clientId?: number; page?: number; pageSize?: number }) {
    return this.client.get('/workoutplans', { params })
  }

  getDietPlans(params?: { clientId?: number; trainerId?: number }) {
    return this.client.get('/dietplans', { params })
  }

  getGoals(params?: { clientId?: number }) {
    return this.client.get('/goals', { params })
  }

  getTrainingGroups(params?: { trainerId?: number }) {
    return this.client.get('/traininggroups', { params })
  }

  getTrainers() {
    return this.client.get('/trainers')
  }

  getProgressLogs(params?: { clientId?: number }) {
    return this.client.get('/progresslogs', { params })
  }

  getFinance(params?: { startDate?: string; endDate?: string; type?: string }) {
    return this.client.get('/finance', { params })
  }

  getInvoices(params?: { clientId?: number; status?: string }) {
    return this.client.get('/invoices', { params })
  }

  getCashRegister() {
    return this.client.get('/cashregister')
  }

  getRentalInquiries() {
    return this.client.get('/rentalinquiries')
  }

  getMembershipPlans() {
    return this.client.get('/membershipplans')
  }
}

export const api = new ApiService()
export default api
