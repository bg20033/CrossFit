import { UserRole } from '../../types'

export interface NavItem {
  to: string
  label: string
  icon: string
}

const dashboard: NavItem = { to: '/dashboard', label: 'Dashboard', icon: '🏠' }
const settings: NavItem = { to: '/settings', label: 'Cilësimet', icon: '⚙️' }

export function navForRole(role: UserRole | undefined): NavItem[] {
  return [...roleNav(role), settings]
}

function roleNav(role: UserRole | undefined): NavItem[] {
  switch (role) {
    case 'admin':
    case 'gym_owner':
      return [
        dashboard,
        { to: '/admin/calendar', label: 'Kalendari', icon: '📅' },
        { to: '/admin/finance', label: 'Financat', icon: '💰' },
        { to: '/admin/clients', label: 'Klientët', icon: '👥' },
        { to: '/admin/trainers', label: 'Trajnerët', icon: '🏋️' },
        { to: '/admin/staff', label: 'Stafi', icon: '👔' },
        { to: '/admin/payroll', label: 'Payroll', icon: '💼' },
        { to: '/admin/plans', label: 'Pakot', icon: '🎫' },
        { to: '/admin/cash-register', label: 'Arka', icon: '🏧' },
        { to: '/admin/invoices', label: 'Faturat', icon: '🧾' },
        { to: '/admin/rentals', label: 'Qiragjinjtë', icon: '🏟️' },
      ]
    case 'trainer':
      return [
        dashboard,
        { to: '/trainer/groups', label: 'Grupet', icon: '📅' },
        { to: '/trainer/workout-builder', label: 'Ushtrimet', icon: '💪' },
        { to: '/trainer/diets', label: 'Dietat', icon: '🍽️' },
      ]
    case 'staff':
      return [
        dashboard,
        { to: '/admin/clients', label: 'Klientët', icon: '👥' },
        { to: '/admin/cash-register', label: 'Arka', icon: '🏧' },
        { to: '/admin/invoices', label: 'Faturat', icon: '🧾' },
      ]
    case 'client':
    default:
      return [
        dashboard,
        { to: '/calendar', label: 'Kalendari', icon: '📅' },
        { to: '/workouts', label: 'Ushtrimet', icon: '💪' },
        { to: '/diet', label: 'Dieta', icon: '🍽️' },
        { to: '/goals', label: 'Qëllimet', icon: '🎯' },
        { to: '/progress', label: 'Progresi', icon: '📈' },
      ]
  }
}

// Map a pathname to a readable section title for the app header.
export function titleForPath(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/admin/calendar': 'Kalendari & Prezenca',
    '/calendar': 'Kalendari im',
    '/admin/finance': 'Financat',
    '/admin/clients': 'Klientët',
    '/admin/trainers': 'Trajnerët',
    '/admin/staff': 'Stafi',
    '/admin/payroll': 'Payroll',
    '/admin/plans': 'Pakot e Anëtarësimit',
    '/admin/cash-register': 'Arka',
    '/admin/invoices': 'Faturat',
    '/admin/rentals': 'Qiragjinjtë',
    '/trainer/groups': 'Grupet',
    '/trainer/workout-builder': 'Krijo Ushtrime',
    '/trainer/diets': 'Planet e Dietës',
    '/workouts': 'Ushtrimet e mia',
    '/diet': 'Dieta ime',
    '/goals': 'Qëllimet',
    '/progress': 'Progresi im',
    '/settings': 'Cilësimet',
  }
  return map[pathname] ?? 'StandUp CrossFit'
}
