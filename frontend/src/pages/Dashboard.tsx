import { useAuth } from '../contexts/AuthContext'
import AdminDashboard from './AdminDashboard'
import TrainerDashboard from './TrainerDashboard'
import ClientDashboard from './ClientDashboard'
import StaffDashboard from './StaffDashboard'

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
    case 'client':
    default:
      return <ClientDashboard />
  }
}
