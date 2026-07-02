import SectionTabs, { type SectionTab } from './SectionTabs'

/*
 * Nën-navigim i seksionit të çmimeve — bashkon Pakot e Anëtarësimit dhe
 * Zbritjet në një hapësirë me tabs. Routes mbeten të ndara (admin/gym_owner).
 */

const TABS: SectionTab[] = [
  { to: '/admin/plans', label: 'Pakot', roles: ['admin', 'gym_owner'], permissions: [] },
  { to: '/admin/discounts', label: 'Zbritjet', roles: ['admin', 'gym_owner'], permissions: [] },
]

export default function PricingTabs() {
  return <SectionTabs tabs={TABS} />
}
