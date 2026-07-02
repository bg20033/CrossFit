import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react'
import api, { API_BASE_URL } from '../utils/api'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

const MAX_VISIBLE_TOASTS = 4
const DUPLICATE_WINDOW_MS = 2000
const SERVER_TOAST_DURATION_MS = 8000
let localNotificationCounter = 0

export interface Notification {
  id: string
  serverId?: number
  type: NotificationType
  title: string
  message: string
  duration?: number // ms, 0 = persist
  timestamp: Date
  link?: string | null
}

function notificationType(value: unknown): NotificationType {
  const normalized = String(value ?? 'info').toLowerCase()
  return normalized === 'success' || normalized === 'error' || normalized === 'warning' ? normalized : 'info'
}

function pushToast(current: Notification[], notification: Notification) {
  const isDuplicate = current.some((item) => (
    item.type === notification.type &&
    item.title === notification.title &&
    item.message === notification.message &&
    notification.timestamp.getTime() - item.timestamp.getTime() < DUPLICATE_WINDOW_MS
  ))

  if (isDuplicate) return current
  return [notification, ...current].slice(0, MAX_VISIBLE_TOASTS)
}

function fromServerNotification(n: any): Notification | null {
  const rawId = n.Id ?? n.id
  if (rawId == null) return null
  const serverId = Number(rawId)
  if (!Number.isInteger(serverId)) return null
  return {
    id: `server-${serverId}`,
    serverId,
    type: notificationType(n.Type ?? n.type),
    title: n.Title ?? n.title ?? 'Njoftim',
    message: n.Message ?? n.message ?? '',
    duration: SERVER_TOAST_DURATION_MS,
    timestamp: new Date(n.CreatedAt ?? n.createdAt ?? Date.now()),
    link: n.Link ?? n.link ?? null,
  }
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (title: string, message: string, type: NotificationType, duration?: number) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const dismissNotification = useCallback((id: string, markServerRead: boolean) => {
    let serverId: number | undefined
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id)
      serverId = notification?.serverId
      return prev.filter(n => n.id !== id)
    })

    if (markServerRead && serverId) {
      api.post(`/notifications/${serverId}/read`)
        .then(() => setUnreadCount((count) => Math.max(0, count - 1)))
        .catch(() => undefined)
    }
  }, [])

  const removeNotification = useCallback((id: string) => {
    dismissNotification(id, true)
  }, [dismissNotification])

  const addNotification = useCallback(
    (title: string, message: string, type: NotificationType, duration = 5000) => {
      localNotificationCounter += 1
      const id = `local-${Date.now()}-${localNotificationCounter}`
      const notification: Notification = {
        id,
        type,
        title,
        message,
        duration,
        timestamp: new Date()
      }

      setNotifications(prev => pushToast(prev, notification))

      if (duration > 0) {
        window.setTimeout(() => dismissNotification(id, false), duration)
      }
    },
    [dismissNotification]
  )

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('authToken')) return

    api.get('/notifications/unread-count')
      .then((res) => {
        setUnreadCount(Number(res.data?.count ?? 0))
      })
      .catch(() => undefined)

    // Live stream with reconnect. The old `onerror = () => stream.close()`
    // killed notifications permanently on the FIRST hiccup (server restart,
    // token rotation, network blip). Now we close and reopen with the current
    // token after a backoff.
    let stream: EventSource | null = null
    let retryTimer: number | undefined
    let retryDelayMs = 5_000
    let disposed = false

    const connect = () => {
      if (disposed) return
      const token = localStorage.getItem('authToken')
      if (!token) return

      stream = new EventSource(`${API_BASE_URL}/notifications/stream?access_token=${encodeURIComponent(token)}`)
      stream.addEventListener('notification', (event) => {
        try {
          const n = JSON.parse((event as MessageEvent).data)
          const notification = fromServerNotification(n)
          if (!notification) return
          setNotifications((prev) => {
            if (prev.some((row) => row.id === notification.id)) return prev
            return pushToast(prev, notification)
          })
          setUnreadCount((count) => count + 1)
        } catch {
          // Ignore malformed stream events.
        }
      })
      stream.addEventListener('unread', (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data)
          setUnreadCount(Number(data.count ?? 0))
          retryDelayMs = 5_000 // healthy again → reset backoff
        } catch {
          // Ignore malformed stream events.
        }
      })
      stream.onerror = () => {
        stream?.close()
        stream = null
        if (disposed) return
        retryTimer = window.setTimeout(connect, retryDelayMs)
        retryDelayMs = Math.min(retryDelayMs * 2, 60_000)
      }
    }

    connect()
    return () => {
      disposed = true
      if (retryTimer) window.clearTimeout(retryTimer)
      stream?.close()
    }
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, removeNotification, clearAll }}>
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
