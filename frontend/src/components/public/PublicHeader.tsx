import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'

const links = [
  { to: '/', label: 'Ballina' },
  { to: '/about', label: 'Rreth Nesh' },
  { to: '/rental', label: 'Qira' },
]

export default function PublicHeader() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
          <img src="/icons/logo.png" alt="Stand Up CrossFit" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          Stand Up <span className="text-gray-500">CrossFit</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? 'text-coral-600' : 'text-gray-500 hover:text-coral-600'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Link to="/dashboard">
              <Button size="sm">Hyr në Panel</Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Kyçu
              </Link>
              <Link to="/register">
                <Button size="sm">Regjistrohu</Button>
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 md:hidden"
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="my-2 border-t border-gray-100" />
            {user ? (
              <Link to="/dashboard" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full">Hyr në Panel</Button>
              </Link>
            ) : (
              <div className="flex gap-2 pb-2">
                <Link to="/login" onClick={() => setOpen(false)} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">Kyçu</Button>
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="flex-1">
                  <Button size="sm" className="w-full">Regjistrohu</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
