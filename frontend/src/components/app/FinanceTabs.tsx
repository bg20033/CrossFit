import SectionTabs, { type SectionTab } from './SectionTabs'

/*
 * Nën-navigim i seksionit financiar — "bashkon" katër pamjet
 * (Financat, Faturat, Payroll, Pagesat e Trajnerëve) në një hapësirë me tabs.
 * Rregullat e dukshmërisë pasqyrojnë 1:1 guards e routes (shih App.tsx).
 */

const TABS: SectionTab[] = [
  { to: '/admin/finance', label: 'Përmbledhja', roles: ['admin', 'gym_owner'], permissions: ['finance.read'] },
  { to: '/admin/invoices', label: 'Faturat', roles: ['admin', 'gym_owner', 'staff', 'cashier'], permissions: ['finance.write'] },
  { to: '/admin/payroll', label: 'Rrogat', roles: ['admin', 'gym_owner'], permissions: [] },
  { to: '/admin/trainer-payments', label: 'Pagesat e Trajnerëve', roles: ['admin', 'gym_owner'], permissions: [] },
]

export default function FinanceTabs() {
  return <SectionTabs tabs={TABS} />
}
