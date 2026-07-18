import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import { normalizeRole, roleLabel } from '../../lib/roles'
import { titleForPath } from './navItems'
import { Menu, Bell, ChevronDown, UserPlus, LogOut, Check } from 'lucide-react'

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
  const { user, accounts, switchAccount, logout } = useAuth()
  const { unreadCount, addNotification } = useNotification()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  const otherAccounts = accounts.filter((a) => a.id !== String(user?.id))

  const handleSwitch = async (id: string) => {
    if (switching) return
    setSwitching(true)
    try {
      await switchAccount(id)
      setMenuOpen(false)
      navigate('/dashboard')
    } catch {
      addNotification('Gabim', 'Sesioni i asaj llogarie ka skaduar. Kyçu përsëri.', 'error')
      setMenuOpen(false)
      navigate('/login')
    } finally {
      setSwitching(false)
    }
  }

  const handleAddAccount = () => {
    setMenuOpen(false)
    navigate('/login')
  }

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:left-64 md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
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
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 transition hover:bg-gray-100"
            aria-label="Llogaria"
            aria-expanded={menuOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              {initials(user?.name)}
            </span>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-400">{user ? roleLabel(user.role) : ''}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                  {initials(user?.name)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold text-gray-800">{user?.name}</p>
                  <p className="truncate text-xs text-gray-400">{user?.email}</p>
                </div>
                <Check className="h-4 w-4 shrink-0 text-coral-500" />
              </div>

              {otherAccounts.length > 0 && (
                <div className="border-b border-gray-100 py-1">
                  <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Ndërro llogarinë
                  </p>
                  {otherAccounts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleSwitch(a.id)}
                      disabled={switching}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                        {initials(a.name)}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-sm font-medium text-gray-800">{a.name}</span>
                        <span className="block truncate text-xs text-gray-400">
                          {a.email} · {roleLabel(normalizeRole(a.role))}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="py-1">
                <button
                  onClick={handleAddAccount}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <UserPlus className="h-4 w-4 text-gray-400" /> Shto llogari tjetër
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4 text-gray-400" /> Dil nga kjo llogari
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
