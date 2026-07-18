import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuthStore, useUIStore } from '../stores'
import api from '../services/api'
import { normalizeRole } from '../lib/roles'
import {
  getSavedAccounts,
  getSavedAccount,
  upsertSavedAccount,
  removeSavedAccount,
  type SavedAccount,
} from '../lib/accounts'
import type { User, UserRole } from '../types'

interface AuthContextType {
  user: User | null
  profileId: number | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (data: { email: string; password: string; name: string; role: UserRole; phone?: string }) => Promise<void>
  refreshUser: () => Promise<void>
  /** All sessions saved in this browser (including the active one). */
  accounts: SavedAccount[]
  /** Swap tokens to another saved session and reload the user. */
  switchAccount: (id: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, profileId, isLoading, setUser, setLoading, logout: storeLogout } = useAuthStore()
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => getSavedAccounts())

  const syncAccounts = () => setAccounts(getSavedAccounts())

  /** Save the currently active session (user + tokens) into the saved-accounts list. */
  const stashSession = (u: User | null) => {
    const token = localStorage.getItem('authToken')
    const refreshToken = localStorage.getItem('refreshToken')
    if (!u || !token || !refreshToken) return
    upsertSavedAccount({ id: String(u.id), email: u.email, name: u.name, role: u.role, token, refreshToken })
    syncAccounts()
  }

  const applyUser = async (raw: User) => {
    const normalized = { ...raw, role: normalizeRole(raw.role) as UserRole }

    // login//auth/me//auth/refresh all include permissions already — only fall
    // back to a /roles/me/permissions roundtrip when they're missing.
    const permissionsPromise: Promise<string[]> = Array.isArray(normalized.permissions)
      ? Promise.resolve(normalized.permissions)
      : api.getPermissions().catch(() => [])

    // Profile-specific screens can still load without a profile id; swallow errors
    // to avoid noisy dev-console output.
    const profileIdPromise: Promise<number | null> =
      normalized.role === 'trainer'
        ? api.getTrainerMe().then((res) => res.data.id as number).catch(() => null)
        : normalized.role === 'client'
          ? api.getClientMe().then((res) => res.data.id as number).catch(() => null)
          : Promise.resolve(null)

    const [permissions, pid] = await Promise.all([permissionsPromise, profileIdPromise])

    setUser({ ...normalized, permissions }, pid)
    stashSession(normalized)
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
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        storeLogout()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    stashSession(user) // keep the current session so the user can switch back
    const { user: nextUser, token, refreshToken } = await api.login(email, password)
    localStorage.setItem('authToken', token)
    localStorage.setItem('refreshToken', refreshToken)
    await applyUser(nextUser)
  }

  const logout = () => {
    api.logout(localStorage.getItem('refreshToken')) // revoke server-side (fire-and-forget)
    if (user) {
      removeSavedAccount(String(user.id))
      syncAccounts()
    }
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    storeLogout()
    setSidebarOpen(false)
  }

  const register = async (data: { email: string; password: string; name: string; role: UserRole; phone?: string }) => {
    stashSession(user)
    const { user: nextUser, token, refreshToken } = await api.register(data)
    localStorage.setItem('authToken', token)
    localStorage.setItem('refreshToken', refreshToken)
    await applyUser(nextUser)
  }

  const refreshUser = async () => {
    try {
      const user = await api.getMe()
      await applyUser(user)
    } catch (error) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      storeLogout()
    }
  }

  const switchAccount = async (id: string) => {
    const target = getSavedAccount(id)
    if (!target || (user && String(user.id) === String(id))) return

    const previous = { token: localStorage.getItem('authToken'), refreshToken: localStorage.getItem('refreshToken') }
    stashSession(user)
    localStorage.setItem('authToken', target.token)
    localStorage.setItem('refreshToken', target.refreshToken)
    try {
      let nextUser: User
      try {
        nextUser = await api.getMe()
      } catch {
        // Access token expired (the interceptor skips /auth/* URLs) — refresh explicitly.
        const refreshed = await api.refresh(target.refreshToken)
        localStorage.setItem('authToken', refreshed.token)
        localStorage.setItem('refreshToken', refreshed.refreshToken)
        nextUser = refreshed.user
      }
      await applyUser(nextUser)
    } catch (error) {
      // Target session is dead — drop it and restore the previous one.
      removeSavedAccount(id)
      syncAccounts()
      if (previous.token && previous.refreshToken) {
        localStorage.setItem('authToken', previous.token)
        localStorage.setItem('refreshToken', previous.refreshToken)
      }
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, profileId, isLoading, login, logout, register, refreshUser, accounts, switchAccount }}
    >
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
