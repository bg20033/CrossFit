import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicLayout from './components/public/PublicLayout'
import AppLayout from './components/app/AppLayout'

// Public
const Landing = lazy(() => import('./pages/Landing'))
const About = lazy(() => import('./pages/About'))
const RentalInquiry = lazy(() => import('./pages/RentalInquiry'))
const Auth = lazy(() => import('./pages/Auth'))

// App
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const Messages = lazy(() => import('./pages/Messages'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminFinance = lazy(() => import('./pages/AdminFinance'))
const AdminClients = lazy(() => import('./pages/AdminClients'))
const AdminTrainers = lazy(() => import('./pages/AdminTrainers'))
const AdminStaff = lazy(() => import('./pages/AdminStaff'))
const AdminCashRegister = lazy(() => import('./pages/AdminCashRegister'))
const AdminInventory = lazy(() => import('./pages/AdminInventory'))
const AdminDiscounts = lazy(() => import('./pages/AdminDiscounts'))
const AdminInvoices = lazy(() => import('./pages/AdminInvoices'))
const AdminMembershipPlans = lazy(() => import('./pages/AdminMembershipPlans'))
const AdminRentals = lazy(() => import('./pages/AdminRentals'))
const AdminCalendar = lazy(() => import('./pages/AdminCalendar'))
const AdminGroups = lazy(() => import('./pages/AdminGroups'))
const AdminRoles = lazy(() => import('./pages/AdminRoles'))
const Payroll = lazy(() => import('./pages/Payroll'))
const AdminTrainerPayments = lazy(() => import('./pages/AdminTrainerPayments'))
const TrainerDashboard = lazy(() => import('./pages/TrainerDashboard'))
const TrainerGroups = lazy(() => import('./pages/TrainerGroups'))
const TrainerWorkoutBuilder = lazy(() => import('./pages/TrainerWorkoutBuilder'))
const TrainerDiets = lazy(() => import('./pages/TrainerDiets'))
const TrainerClients = lazy(() => import('./pages/TrainerClients'))
const ClientWorkouts = lazy(() => import('./pages/ClientWorkouts'))
const ClientDiet = lazy(() => import('./pages/ClientDiet'))
const ClientGoals = lazy(() => import('./pages/ClientGoals'))
const ClientProgress = lazy(() => import('./pages/ClientProgress'))
const ClientCalendar = lazy(() => import('./pages/ClientCalendar'))
const TenantClientCalendar = lazy(() => import('./pages/TenantClientCalendar'))
const ClientOnboarding = lazy(() => import('./pages/ClientOnboarding'))
const ClientNutrition = lazy(() => import('./pages/ClientNutrition'))
const ArkaAccess = lazy(() => import('./pages/ArkaAccess'))
const TenantDashboard = lazy(() => import('./pages/TenantDashboard'))
const TenantClients = lazy(() => import('./pages/TenantClients'))
const TenantSchedule = lazy(() => import('./pages/TenantSchedule'))
const TenantBilling = lazy(() => import('./pages/TenantBilling'))
const AdminGroupReport = lazy(() => import('./pages/AdminGroupReport'))
const AdminReports = lazy(() => import('./pages/AdminReports'))
const ClientPackageStatus = lazy(() => import('./pages/ClientPackageStatus'))
const ClientQrCard = lazy(() => import('./pages/ClientQrCard'))
const ClientLeaderboard = lazy(() => import('./pages/ClientLeaderboard'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
    </div>
  )
}

function CalendarSwitch() {
  const { user } = useAuth()
  return user?.role === 'tenant_client' ? <TenantClientCalendar /> : <ClientCalendar />
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public site: header + footer */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/rental" element={<RentalInquiry />} />
              <Route path="/login" element={<Auth initialMode="login" />} />
              <Route path="/register" element={<Auth initialMode="register" />} />
            </Route>

            {/* Authenticated app shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Any authenticated role */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/messages" element={<Messages />} />

                {/* Admin / GymOwner only */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner']} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/plans" element={<AdminMembershipPlans />} />
                  <Route path="/admin/payroll" element={<Payroll />} />
                  <Route path="/admin/trainer-payments" element={<AdminTrainerPayments />} />
                  <Route path="/admin/rentals" element={<AdminRentals />} />
                  <Route path="/admin/calendar" element={<AdminCalendar />} />
                  <Route path="/admin/groups" element={<AdminGroups />} />
                  <Route path="/admin/inventory" element={<AdminInventory />} />
                  <Route path="/admin/discounts" element={<AdminDiscounts />} />
                  <Route path="/admin/group-report/:groupId" element={<AdminGroupReport />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner']} allowedPermissions={['finance.read']} blockedRoles={['client', 'tenant_client', 'trainer_tenant']} />}>
                  <Route path="/admin/finance" element={<AdminFinance />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner']} allowedPermissions={['trainers.write']} blockedRoles={['client', 'tenant_client', 'trainer_tenant']} />}>
                  <Route path="/admin/trainers" element={<AdminTrainers />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner']} allowedPermissions={['staff.write']} blockedRoles={['client', 'tenant_client', 'trainer_tenant']} />}>
                  <Route path="/admin/staff" element={<AdminStaff />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner']} allowedPermissions={['reports.read']} blockedRoles={['trainer', 'client', 'tenant_client', 'trainer_tenant']} />}>
                  <Route path="/admin/reports" element={<AdminReports />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner']} allowedPermissions={['roles.manage']} blockedRoles={['client', 'tenant_client', 'trainer_tenant']} />}>
                  <Route path="/admin/roles" element={<AdminRoles />} />
                </Route>

                {/* Front desk: Admin / GymOwner / Staff / Cashier (Arka) */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner', 'staff', 'cashier']} allowedPermissions={['clients.write']} blockedRoles={['client', 'tenant_client', 'trainer_tenant']} />}>
                  <Route path="/admin/clients" element={<AdminClients />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner', 'staff', 'cashier']} allowedPermissions={['finance.write']} blockedRoles={['client', 'tenant_client', 'trainer_tenant']} />}>
                  <Route path="/admin/cash-register" element={<AdminCashRegister />} />
                  <Route path="/admin/invoices" element={<AdminInvoices />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner', 'staff', 'cashier']} allowedPermissions={['access.scan']} blockedRoles={['client', 'tenant_client', 'trainer_tenant']} />}>
                  <Route path="/arka/access" element={<ArkaAccess />} />
                </Route>

                {/* Trainer-Tenant (rental) — isolated from core staff */}
                <Route element={<ProtectedRoute allowedRoles={['trainer_tenant']} />}>
                  <Route path="/tenant" element={<TenantDashboard />} />
                  <Route path="/tenant/clients" element={<TenantClients />} />
                  <Route path="/tenant/schedule" element={<TenantSchedule />} />
                  <Route path="/tenant/billing" element={<TenantBilling />} />
                </Route>

                {/* Trainer (+ admin oversight) */}
                <Route element={<ProtectedRoute allowedRoles={['trainer', 'admin', 'gym_owner']} />}>
                  <Route path="/trainer" element={<TrainerDashboard />} />
                  <Route path="/trainer/groups" element={<TrainerGroups />} />
                  <Route path="/trainer/workout-builder" element={<TrainerWorkoutBuilder />} />
                  <Route path="/trainer/diets" element={<TrainerDiets />} />
                  <Route path="/trainer/clients" element={<TrainerClients />} />
                </Route>

                {/* Client + Tenant-client shared nutrition screens */}
                <Route element={<ProtectedRoute allowedRoles={['client', 'tenant_client']} />}>
                  <Route path="/calendar" element={<CalendarSwitch />} />
                  <Route path="/nutrition" element={<ClientNutrition />} />
                  <Route path="/onboarding" element={<ClientOnboarding />} />
                </Route>

                {/* Client only */}
                <Route element={<ProtectedRoute allowedRoles={['client']} />}>
                  <Route path="/workouts" element={<ClientWorkouts />} />
                  <Route path="/diet" element={<ClientDiet />} />
                  <Route path="/goals" element={<ClientGoals />} />
                  <Route path="/progress" element={<ClientProgress />} />
                  <Route path="/package" element={<ClientPackageStatus />} />
                  <Route path="/qr-card" element={<ClientQrCard />} />
                  <Route path="/leaderboard" element={<ClientLeaderboard />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback — real 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
