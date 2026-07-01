import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useNotification } from '../contexts/NotificationContext'

export default function NotificationCenter() {
  const { notifications, removeNotification } = useNotification()

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-800'
      case 'error':
        return 'bg-red-100 border-red-400 text-red-800'
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800'
      case 'info':
      default:
        return 'bg-blue-100 border-blue-400 text-blue-800'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5" />
      case 'error':
        return <XCircle className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'info':
      default:
        return <Info className="h-5 w-5" />
    }
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed right-3 top-3 z-50 w-[calc(100vw-1.5rem)] max-w-sm space-y-3 pointer-events-none sm:right-4 sm:top-4 sm:w-full">
      {notifications.map(notif => (
        <div
          key={notif.id}
          role="status"
          className={`rounded-lg border p-4 pointer-events-auto ${getColorClasses(notif.type)}`}>
          <div className="flex justify-between items-start gap-3">
            <div className="flex min-w-0 gap-2">
              <span className="mt-0.5 shrink-0">{getIcon(notif.type)}</span>
              <div className="min-w-0">
                <h4 className="break-words text-sm font-semibold">{notif.title}</h4>
                {notif.message && <p className="mt-1 break-words text-sm opacity-90">{notif.message}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeNotification(notif.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-70 hover:bg-gray-100 hover:opacity-100"
              aria-label="Mbyll njoftimin"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
