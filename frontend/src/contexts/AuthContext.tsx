import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useAuthStore, useUIStore } from '../stores'
import api from '../services/api'
import { normalizeRole } from '../lib/roles'
import type { User, UserRole } from '../types'

interface AuthContextType {
  user: User | null
  profileId: number | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (data: { email: string; password: string; name: string; role: UserRole }) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, profileId, isLoading, setUser, setLoading, logout: storeLogout } = useAuthStore()
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  const applyUser = async (raw: User) => {
    const normalized = { ...raw, role: normalizeRole(raw.role) as UserRole }
    
    let pid: number | null = null
    try {
      if (normalized.role === 'trainer') {
        const res = await api.getTrainerMe()
        pid = res.data.id
      } else if (normalized.role === 'client') {
        const res = await api.getClientMe()
        pid = res.data.id
      }
    } catch (e) {
      console.error('Failed to resolve profile id:', e)
    }
    
    setUser(normalized, pid)
  }

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          const user = await api.getMe()
          await applyUser(user)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('authToken')
        storeLogout()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const { user, token } = await api.login(email, password)
    localStorage.setItem('authToken', token)
    await applyUser(user)
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    storeLogout()
    setSidebarOpen(false)
  }

  const register = async (data: { email: string; password: string; name: string; role: UserRole }) => {
    const { user, token } = await api.register(data)
    localStorage.setItem('authToken', token)
    await applyUser(user)
  }

  const refreshUser = async () => {
    try {
      const user = await api.getMe()
      await applyUser(user)
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profileId, isLoading, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
