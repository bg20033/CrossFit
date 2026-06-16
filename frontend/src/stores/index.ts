import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  profileId: number | null
  isLoading: boolean
  setUser: (user: User | null, profileId: number | null) => void
  setLoading: (loading: boolean) => void
  updateUser: (updates: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profileId: null,
      isLoading: true,
      setUser: (user, profileId) => set({ user, profileId, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      logout: () => set({ user: null, profileId: null, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, profileId: state.profileId }),
    }
  )
)

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: 'light',
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}))

interface CalendarState {
  selectedDate: Date | null
  viewMode: 'month' | 'week' | 'day'
  selectedEventId: number | null
  setSelectedDate: (date: Date | null) => void
  setViewMode: (mode: 'month' | 'week' | 'day') => void
  setSelectedEventId: (id: number | null) => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  selectedDate: new Date(),
  viewMode: 'month',
  selectedEventId: null,
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedEventId: (selectedEventId) => set({ selectedEventId }),
}))

interface NotificationPrefs {
  email: boolean
  push: boolean
  attendanceReminder: boolean
  goalDeadlines: boolean
  groupUpdates: boolean
}

interface SettingsState {
  notificationPrefs: NotificationPrefs
  language: 'sq' | 'en'
  updateNotificationPrefs: (prefs: Partial<NotificationPrefs>) => void
  setLanguage: (lang: 'sq' | 'en') => void
}

const defaultPrefs: NotificationPrefs = {
  email: true,
  push: true,
  attendanceReminder: true,
  goalDeadlines: true,
  groupUpdates: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationPrefs: defaultPrefs,
      language: 'sq',
      updateNotificationPrefs: (prefs) =>
        set((state) => ({
          notificationPrefs: { ...state.notificationPrefs, ...prefs },
        })),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'settings-storage',
    }
  )
)
