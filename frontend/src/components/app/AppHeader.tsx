import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import { roleLabel } from '../../lib/roles'
import { titleForPath } from './navItems'

function initials(name?: string): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function AppHeader({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth()
  const { notifications } = useNotification()
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Menu"
        >
          ☰
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{titleForPath(pathname)}</h1>
          <p className="hidden text-xs text-gray-400 sm:block">
            {new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Njoftime">
          <span className="text-lg">🔔</span>
          {notifications.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
              {notifications.length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
            {initials(user?.name)}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-400">{user ? roleLabel(user.role) : ''}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
