import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number // ms, 0 = persist
  timestamp: Date
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (title: string, message: string, type: NotificationType, duration?: number) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback(
    (title: string, message: string, type: NotificationType, duration = 5000) => {
      const id = Math.random().toString(36).substr(2, 9)
      const notification: Notification = {
        id,
        type,
        title,
        message,
        duration,
        timestamp: new Date()
      }

      setNotifications(prev => [...prev, notification])

      if (duration > 0) {
        setTimeout(() => removeNotification(id), duration)
      }
    },
    []
  )

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
