import { useAuth } from '../contexts/AuthContext'
import AdminDashboard from './AdminDashboard'
import TrainerDashboard from './TrainerDashboard'
import ClientDashboard from './ClientDashboard'
import StaffDashboard from './StaffDashboard'
import ArkaAccess from './ArkaAccess'
import TenantDashboard from './TenantDashboard'
import TenantClientHome from './TenantClientHome'

// The /dashboard landing renders the right dashboard for the logged-in role.
export default function Dashboard() {
  const { user } = useAuth()

  switch (user?.role) {
    case 'admin':
    case 'gym_owner':
      return <AdminDashboard />
    case 'trainer':
      return <TrainerDashboard />
    case 'staff':
      return <StaffDashboard />
    case 'cashier':
      return <ArkaAccess />
    case 'trainer_tenant':
      return <TenantDashboard />
    case 'tenant_client':
      return <TenantClientHome />
    case 'client':
    default:
      return <ClientDashboard />
  }
}
