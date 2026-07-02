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
  Ticket,
  Computer,
  ScanLine,
  Receipt,
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
  Package,
  LogOut,
  Bell,
  Menu,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Rrugë shtesë që e mbajnë këtë item aktiv (p.sh. tabs brenda seksionit Financa). */
  match?: string[]
}

/** Seksioni financiar i bashkuar — nën-faqet navigohen me tabs brenda faqes. */
export const FINANCE_SECTION_PATHS = ['/admin/finance', '/admin/invoices', '/admin/payroll', '/admin/trainer-payments']

/** Seksioni i çmimeve i bashkuar — Pakot + Zbritjet me tabs brenda faqes. */
export const PRICING_SECTION_PATHS = ['/admin/plans', '/admin/discounts']

/** Seksioni i ekipit i bashkuar — Trajnerët + Stafi + Qiragjinjtë me tabs brenda faqes. */
export const TEAM_SECTION_PATHS = ['/admin/trainers', '/admin/staff', '/admin/rentals']

const dashboard: NavItem = { to: '/dashboard', label: 'Dashboard', icon: Home }
const messages: NavItem = { to: '/messages', label: 'Mesazhet', icon: Mail }
const settings: NavItem = { to: '/settings', label: 'Cilësimet', icon: Settings }

export function navForRole(role: UserRole | undefined, permissions: string[] = []): NavItem[] {
  const items = [...roleNav(role)]
  const add = (permission: string, item: NavItem, blockedRoles: UserRole[] = []) => {
    if (blockedRoles.includes(role as UserRole)) return
    if (!permissions.includes(permission) && !permissions.includes('system.admin')) return
    if (!items.some((existing) => existing.to === item.to)) items.push(item)
  }

  add('clients.write', { to: '/admin/clients', label: 'Klientët', icon: Users }, ['client', 'tenant_client', 'trainer_tenant'])
  add('finance.read', { to: '/admin/finance', label: 'Financat', icon: Banknote, match: FINANCE_SECTION_PATHS }, ['client', 'tenant_client', 'trainer_tenant'])
  add('finance.write', { to: '/admin/cash-register', label: 'Arka / POS', icon: Computer }, ['client', 'tenant_client', 'trainer_tenant'])
  // Faturat mbeten entry më vete vetëm për rolet pa qasje në /admin/finance (staff, cashier, role dinamike);
  // admin/gym_owner i hapin nga tabs e seksionit Financa.
  add('finance.write', { to: '/admin/invoices', label: 'Faturat', icon: Receipt }, ['admin', 'gym_owner', 'client', 'tenant_client', 'trainer_tenant'])
  add('access.scan', { to: '/arka/access', label: 'Qasja (QR)', icon: ScanLine }, ['client', 'tenant_client', 'trainer_tenant'])
  add('trainers.write', { to: '/admin/trainers', label: 'Trajnerët', icon: Dumbbell }, ['client', 'tenant_client', 'trainer_tenant'])
  // Stafi mbetet entry më vete vetëm për rolet dinamike; admin/gym_owner e hapin nga tabs e seksionit Ekipi.
  add('staff.write', { to: '/admin/staff', label: 'Stafi', icon: UserCog }, ['admin', 'gym_owner', 'client', 'tenant_client', 'trainer_tenant'])
  add('reports.read', { to: '/admin/reports', label: 'Raporte', icon: BarChart3 }, ['trainer', 'client', 'tenant_client', 'trainer_tenant'])
  add('roles.manage', { to: '/admin/roles', label: 'Rolet', icon: Shield }, ['client', 'tenant_client', 'trainer_tenant'])

  return [...items, messages, settings]
}

function roleNav(role: UserRole | undefined): NavItem[] {
  switch (role) {
    case 'admin':
    case 'gym_owner':
      return [
        dashboard,
        { to: '/admin/calendar', label: 'Kalendari', icon: CalendarDays },
        { to: '/admin/groups', label: 'Grupet', icon: Users2 },
        // Financat bashkon: Përmbledhjen, Faturat, Rrogat (Payroll) dhe Pagesat e Trajnerëve (tabs brenda faqes)
        { to: '/admin/finance', label: 'Financat', icon: Banknote, match: FINANCE_SECTION_PATHS },
        { to: '/admin/clients', label: 'Klientët', icon: Users },
        // Ekipi bashkon: Trajnerët + Stafin + Qiragjinjtë (tabs brenda faqes)
        { to: '/admin/trainers', label: 'Ekipi', icon: UserCog, match: TEAM_SECTION_PATHS },
        { to: '/admin/reports', label: 'Raporte', icon: BarChart3 },
        { to: '/admin/roles', label: 'Rolet', icon: Shield },
        // Pakot bashkon: Pakot e Anëtarësimit + Zbritjet (tabs brenda faqes)
        { to: '/admin/plans', label: 'Pakot & Zbritjet', icon: Ticket, match: PRICING_SECTION_PATHS },
        { to: '/admin/cash-register', label: 'Arka', icon: Computer },
        { to: '/admin/inventory', label: 'Inventari', icon: Package },
        { to: '/arka/access', label: 'Qasja (QR)', icon: ScanLine },
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
    '/admin/discounts': 'Zbritjet',
    '/admin/cash-register': 'Arka',
    '/admin/inventory': 'Inventari',
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
