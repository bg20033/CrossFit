import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { hasPermission, hasRole } from '../../lib/roles'
import type { UserRole } from '../../types'

/*
 * Tab-strip i përbashkët për seksione që "bashkojnë" disa pamje në një hapësirë,
 * duke i mbajtur routes të ndara që guards ekzistues të RBAC-ut të vlejnë 1:1.
 * Çdo tab shfaqet vetëm nëse useri kalon të njëjtat rregulla si route-i i synuar;
 * me më pak se 2 tabs të dukshëm nuk shfaqet asgjë.
 */

export interface SectionTab {
  to: string
  label: string
  roles: UserRole[]
  permissions: string[]
}

export default function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const { user } = useAuth()
  if (!user) return null

  const visible = tabs.filter(
    (t) => hasRole(user.role, t.roles) || (t.permissions.length > 0 && hasPermission(user.permissions, t.permissions)),
  )
  if (visible.length < 2) return null

  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
      {visible.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
