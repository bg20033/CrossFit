import { DashboardShell, DashboardHeader, Panel, QuickAction } from '../components/DashboardKit'
import { useAuth } from '../contexts/AuthContext'

/**
 * Home for a tenant trainer's client. Content is private between the client and
 * their personal trainer (the core gym never sees it). This is a navigation hub —
 * the real data lives on the dedicated screens linked below.
 */
export default function TenantClientHome() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0]

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Klient"
        title={firstName ? `Mirë se erdhe, ${firstName}` : 'Mirë se erdhe'}
        subtitle="Programi dhe orari yt me trajnerin tënd personal."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickAction to="/calendar" icon="📅" label="Orari im" />
        <QuickAction to="/workouts" icon="💪" label="Plani im i ushtrimeve" />
        <QuickAction to="/nutrition" icon="🥗" label="Ushqimi & kaloritë" />
      </div>

      <Panel title="Të miat">
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
          Përmbajtja jote është private mes teje dhe trajnerit — salla qendrore nuk e sheh.
          Orari dhe seancat e ardhshme i gjen te <span className="font-semibold">“Orari im”</span>.
        </p>
        <div className="mt-3">
          <QuickAction to="/onboarding" icon="⚙️" label="Konfiguro kaloritë e tua" />
        </div>
      </Panel>
    </DashboardShell>
  )
}
