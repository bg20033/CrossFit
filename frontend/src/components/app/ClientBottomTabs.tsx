import { NavLink } from 'react-router-dom'
import type { UserRole } from '../../types'
import {
  Home,
  CalendarDays,
  ScanLine,
  User,
  Apple,
  Dumbbell,
} from 'lucide-react'

const clientTabs = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/calendar', label: 'Orari', icon: CalendarDays },
  { to: '/qr-card', label: 'Hyrje', icon: ScanLine },
  { to: '/progress', label: 'Body', icon: User },
  { to: '/nutrition', label: 'Ushqimi', icon: Apple },
]

const tenantClientTabs = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/calendar', label: 'Orari', icon: CalendarDays },
  { to: '/workouts', label: 'Plani', icon: Dumbbell },
  { to: '/nutrition', label: 'Ushqimi', icon: Apple },
]

export default function ClientBottomTabs({ role }: { role: UserRole | undefined }) {
  const tabs = role === 'tenant_client' ? tenantClientTabs : clientTabs
  if (role !== 'client' && role !== 'tenant_client') return null

  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 rounded-[28px] border border-gray-200 bg-white px-2 py-2 md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/dashboard'}
              className={({ isActive }) =>
                `flex h-14 flex-col items-center justify-center rounded-2xl text-[11px] font-bold transition ${
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="mt-1">{tab.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
