import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
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
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminFinance = lazy(() => import('./pages/AdminFinance'))
const AdminClients = lazy(() => import('./pages/AdminClients'))
const AdminTrainers = lazy(() => import('./pages/AdminTrainers'))
const AdminStaff = lazy(() => import('./pages/AdminStaff'))
const AdminCashRegister = lazy(() => import('./pages/AdminCashRegister'))
const AdminInvoices = lazy(() => import('./pages/AdminInvoices'))
const AdminMembershipPlans = lazy(() => import('./pages/AdminMembershipPlans'))
const AdminRentals = lazy(() => import('./pages/AdminRentals'))
const AdminCalendar = lazy(() => import('./pages/AdminCalendar'))
const Payroll = lazy(() => import('./pages/Payroll'))
const TrainerDashboard = lazy(() => import('./pages/TrainerDashboard'))
const TrainerGroups = lazy(() => import('./pages/TrainerGroups'))
const TrainerWorkoutBuilder = lazy(() => import('./pages/TrainerWorkoutBuilder'))
const TrainerDiets = lazy(() => import('./pages/TrainerDiets'))
const ClientWorkouts = lazy(() => import('./pages/ClientWorkouts'))
const ClientDiet = lazy(() => import('./pages/ClientDiet'))
const ClientGoals = lazy(() => import('./pages/ClientGoals'))
const ClientProgress = lazy(() => import('./pages/ClientProgress'))
const ClientCalendar = lazy(() => import('./pages/ClientCalendar'))

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
    </div>
  )
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

                {/* Admin / GymOwner only */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner']} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/finance" element={<AdminFinance />} />
                  <Route path="/admin/trainers" element={<AdminTrainers />} />
                  <Route path="/admin/staff" element={<AdminStaff />} />
                  <Route path="/admin/plans" element={<AdminMembershipPlans />} />
                  <Route path="/admin/payroll" element={<Payroll />} />
                  <Route path="/admin/rentals" element={<AdminRentals />} />
                  <Route path="/admin/calendar" element={<AdminCalendar />} />
                </Route>

                {/* Admin / GymOwner / Staff (front desk) */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'gym_owner', 'staff']} />}>
                  <Route path="/admin/clients" element={<AdminClients />} />
                  <Route path="/admin/cash-register" element={<AdminCashRegister />} />
                  <Route path="/admin/invoices" element={<AdminInvoices />} />
                </Route>

                {/* Trainer (+ admin oversight) */}
                <Route element={<ProtectedRoute allowedRoles={['trainer', 'admin', 'gym_owner']} />}>
                  <Route path="/trainer" element={<TrainerDashboard />} />
                  <Route path="/trainer/groups" element={<TrainerGroups />} />
                  <Route path="/trainer/workout-builder" element={<TrainerWorkoutBuilder />} />
                  <Route path="/trainer/diets" element={<TrainerDiets />} />
                </Route>

                {/* Client */}
                <Route element={<ProtectedRoute allowedRoles={['client']} />}>
                  <Route path="/workouts" element={<ClientWorkouts />} />
                  <Route path="/diet" element={<ClientDiet />} />
                  <Route path="/goals" element={<ClientGoals />} />
                  <Route path="/progress" element={<ClientProgress />} />
                  <Route path="/calendar" element={<ClientCalendar />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
