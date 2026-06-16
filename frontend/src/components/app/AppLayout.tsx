import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { NotificationProvider } from '../../contexts/NotificationContext'
import NotificationCenter from '../NotificationCenter'
import Sidebar from './Sidebar'
import AppHeader from './AppHeader'

// Authenticated app shell: sidebar + header (no public header/footer).
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className="md:pl-64">
          <AppHeader onMenu={() => setMenuOpen(true)} />
          <main className="px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>

        <NotificationCenter />
      </div>
    </NotificationProvider>
  )
}
