import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { roleLabel } from '../../lib/roles'
import { navForRole, LogOut } from './navItems'

function initials(name?: string): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}


function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = navForRole(user?.role)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-6 py-5 font-display text-lg font-bold tracking-tight text-gray-900"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 font-mono text-sm font-bold text-white">SU</span>
        Stand Up<span className="text-coral-500">.</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-coral-500 text-white'
                    : 'text-gray-600 hover:bg-coral-50 hover:text-coral-700'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="truncate text-xs text-gray-400">{user ? roleLabel(user.role) : ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Dil
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile slide-over */}
      <div className={`fixed inset-0 z-40 md:hidden ${open ? '' : 'pointer-events-none'}`}>
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 transform transition-transform ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent onNavigate={onClose} />
        </aside>
      </div>
    </>
  )
}
