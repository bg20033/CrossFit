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
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm space-y-3 pointer-events-none">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`p-4 rounded-lg border shadow-lg pointer-events-auto ${getColorClasses(notif.type)}`}>
          <div className="flex justify-between items-start gap-3">
            <div className="flex gap-2">
              <span className="text-xl mt-0.5">{getIcon(notif.type)}</span>
              <div>
                <h4 className="font-semibold">{notif.title}</h4>
                <p className="text-sm opacity-90">{notif.message}</p>
              </div>
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              className="text-lg opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
