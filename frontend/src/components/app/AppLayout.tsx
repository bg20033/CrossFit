import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { NotificationProvider } from '../../contexts/NotificationContext'
import NotificationCenter from '../NotificationCenter'
import Sidebar from './Sidebar'
import AppHeader from './AppHeader'
import ClientBottomTabs from './ClientBottomTabs'
import { useAuth } from '../../contexts/AuthContext'

// Authenticated app shell: sidebar + header (no public header/footer).
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  const mobileClientShell = user?.role === 'client' || user?.role === 'tenant_client'

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-canvas">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className="md:pl-64">
          <AppHeader onMenu={() => setMenuOpen(true)} />
          <main className={`px-4 py-6 md:px-8 md:py-8 ${mobileClientShell ? 'pb-28 md:pb-8' : ''}`}>
            <Outlet />
          </main>
        </div>

        <ClientBottomTabs role={user?.role} />
        <NotificationCenter />
      </div>
    </NotificationProvider>
  )
}
