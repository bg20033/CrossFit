import { UserRole } from '../../types'
import type { LucideIcon } from 'lucide-react'
import {
  Home,
  CalendarDays,
  Banknote,
  Users,
  Dumbbell,
  UserCog,
  BarChart3,
  Shield,
  Wallet,
  Ticket,
  Computer,
  ScanLine,
  Receipt,
  Building,
  Mail,
  Settings,
  UtensilsCrossed,
  Users2,
  Apple,
  Target,
  TrendingUp,
  CreditCard,
  IdCard,
  Trophy,
  LogOut,
  Bell,
  Menu,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const dashboard: NavItem = { to: '/dashboard', label: 'Dashboard', icon: Home }
const messages: NavItem = { to: '/messages', label: 'Mesazhet', icon: Mail }
const settings: NavItem = { to: '/settings', label: 'Cilësimet', icon: Settings }

export function navForRole(role: UserRole | undefined): NavItem[] {
  return [...roleNav(role), messages, settings]
}

function roleNav(role: UserRole | undefined): NavItem[] {
  switch (role) {
    case 'admin':
    case 'gym_owner':
      return [
        dashboard,
        { to: '/admin/calendar', label: 'Kalendari', icon: CalendarDays },
        { to: '/admin/groups', label: 'Grupet', icon: Users2 },
        { to: '/admin/finance', label: 'Financat', icon: Banknote },
        { to: '/admin/clients', label: 'Klientët', icon: Users },
        { to: '/admin/trainers', label: 'Trajnerët', icon: Dumbbell },
        { to: '/admin/staff', label: 'Stafi', icon: UserCog },
        { to: '/admin/reports', label: 'Raporte', icon: BarChart3 },
        { to: '/admin/roles', label: 'Rolet', icon: Shield },
        { to: '/admin/payroll', label: 'Payroll', icon: Wallet },
        { to: '/admin/trainer-payments', label: 'Pagesat e Trajnerëve', icon: Banknote },
        { to: '/admin/plans', label: 'Pakot', icon: Ticket },
        { to: '/admin/cash-register', label: 'Arka', icon: Computer },
        { to: '/arka/access', label: 'Qasja (QR)', icon: ScanLine },
        { to: '/admin/invoices', label: 'Faturat', icon: Receipt },
        { to: '/admin/rentals', label: 'Qiragjinjtë', icon: Building },
      ]
    case 'trainer':
      return [
        dashboard,
        { to: '/trainer/groups', label: 'Grupet', icon: CalendarDays },
        { to: '/trainer/workout-builder', label: 'Ushtrimet', icon: Dumbbell },
        { to: '/trainer/diets', label: 'Dietat', icon: UtensilsCrossed },
        { to: '/trainer/clients', label: 'Klientët', icon: Users },
      ]
    case 'staff':
      return [
        dashboard,
        { to: '/arka/access', label: 'Qasja (QR)', icon: ScanLine },
        { to: '/admin/clients', label: 'Klientët', icon: Users },
        { to: '/admin/cash-register', label: 'Arka', icon: Computer },
        { to: '/admin/invoices', label: 'Faturat', icon: Receipt },
      ]
    case 'cashier':
      return [
        dashboard,
        { to: '/arka/access', label: 'Qasja (QR)', icon: ScanLine },
        { to: '/admin/cash-register', label: 'Arka / POS', icon: Computer },
        { to: '/admin/clients', label: 'Klientët', icon: Users },
        { to: '/admin/invoices', label: 'Faturat', icon: Receipt },
      ]
    case 'trainer_tenant':
      return [
        dashboard,
        { to: '/tenant/clients', label: 'Klientët e mi', icon: Users },
        { to: '/tenant/schedule', label: 'Orari im', icon: CalendarDays },
        { to: '/tenant/billing', label: 'Qiraja & Faturat', icon: Receipt },
      ]
    case 'tenant_client':
      return [
        dashboard,
        { to: '/calendar', label: 'Orari im', icon: CalendarDays },
        { to: '/workouts', label: 'Plani im', icon: Dumbbell },
        { to: '/nutrition', label: 'Ushqimi', icon: Apple },
      ]
    case 'client':
    default:
      return [
        dashboard,
        { to: '/calendar', label: 'Kalendari', icon: CalendarDays },
        { to: '/workouts', label: 'Ushtrimet', icon: Dumbbell },
        { to: '/diet', label: 'Dieta', icon: UtensilsCrossed },
        { to: '/nutrition', label: 'Ushqimi', icon: Apple },
        { to: '/package', label: 'Anëtarësimi', icon: CreditCard },
        { to: '/qr-card', label: 'Kartela QR', icon: IdCard },
        { to: '/goals', label: 'Qëllimet', icon: Target },
        { to: '/progress', label: 'Progresi', icon: TrendingUp },
        { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      ]
  }
}

// Map a pathname to a readable section title for the app header.
export function titleForPath(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/messages': 'Mesazhet',
    '/admin/calendar': 'Kalendari & Prezenca',
    '/admin/groups': 'Grupet e Trajnimit',
    '/calendar': 'Kalendari im',
    '/admin/finance': 'Financat',
    '/admin/clients': 'Klientët',
    '/admin/trainers': 'Trajnerët',
    '/admin/staff': 'Stafi',
    '/admin/roles': 'Rolet & Permissions',
    '/admin/payroll': 'Payroll',
    '/admin/trainer-payments': 'Pagesat e Trajnerëve',
    '/admin/plans': 'Pakot e Anëtarësimit',
    '/admin/cash-register': 'Arka',
    '/arka/access': 'Qasja me QR',
    '/admin/invoices': 'Faturat',
    '/admin/rentals': 'Qiragjinjtë',
    '/trainer/groups': 'Grupet',
    '/trainer/workout-builder': 'Krijo Ushtrime',
    '/trainer/diets': 'Planet e Dietës',
    '/admin/reports': 'Raporte',
    '/trainer/clients': 'Klientët e mi',
    '/package': 'Anëtarësimi im',
    '/qr-card': 'Kartela e Anëtarit',
    '/workouts': 'Ushtrimet e mia',
    '/diet': 'Dieta ime',
    '/nutrition': 'Ushqimi & Kaloritë',
    '/onboarding': 'Konfigurimi i Profilit',
    '/goals': 'Qëllimet',
    '/progress': 'Progresi im',
    '/leaderboard': 'Leaderboard & Rekordet',
    '/tenant/clients': 'Klientët e mi',
    '/tenant/schedule': 'Orari im',
    '/tenant/billing': 'Qiraja & Faturat',
    '/settings': 'Cilësimet',
  }
  return map[pathname] ?? 'Stand Up CrossFit'
}

// Re-export icons used by other components (header, sidebar, etc.)
export { LogOut, Bell, Menu }
