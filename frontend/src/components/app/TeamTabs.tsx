import SectionTabs, { type SectionTab } from './SectionTabs'

/*
 * Nën-navigim i seksionit të ekipit — bashkon Trajnerët, Stafin dhe
 * Qiragjinjtë në një hapësirë me tabs. Rregullat e dukshmërisë pasqyrojnë
 * 1:1 guards e routes (shih App.tsx); Qiragjinjtë janë vetëm admin/gym_owner.
 */

const TABS: SectionTab[] = [
  { to: '/admin/trainers', label: 'Trajnerët', roles: ['admin', 'gym_owner'], permissions: ['trainers.write'] },
  { to: '/admin/staff', label: 'Stafi', roles: ['admin', 'gym_owner'], permissions: ['staff.write'] },
  { to: '/admin/rentals', label: 'Qiragjinjtë', roles: ['admin', 'gym_owner'], permissions: [] },
]

export default function TeamTabs() {
  return <SectionTabs tabs={TABS} />
}
