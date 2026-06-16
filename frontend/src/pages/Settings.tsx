import { useState } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { roleLabel } from '../utils/roles'
import api from '../utils/api'
import { DashboardShell, DashboardHeader, Panel, Field, fieldCls, primaryBtn } from '../components/DashboardKit'

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const { addNotification } = useNotification()

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' })
  const [savingProfile, setSavingProfile] = useState(false)

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await api.put('/auth/profile', { name: profile.name, email: profile.email })
      await refreshUser()
      addNotification('Sukses', 'Profili u përditësua.', 'success')
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Përditësimi dështoi.', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.newPassword !== pw.confirm) {
      addNotification('Gabim', 'Fjalëkalimet e reja nuk përputhen.', 'error')
      return
    }
    setSavingPw(true)
    try {
      await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      addNotification('Sukses', 'Fjalëkalimi u ndryshua.', 'success')
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ndryshimi dështoi.', 'error')
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader badge="Llogaria" title="Cilësimet" subtitle="Menaxho profilin dhe sigurinë e llogarisë." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Profili">
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Roli">
              <input value={user ? roleLabel(user.role) : ''} disabled className={`${fieldCls} bg-gray-50 text-gray-500`} />
            </Field>
            <Field label="Emri">
              <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} required className={fieldCls} />
            </Field>
            <Field label="Email">
              <input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} required className={fieldCls} />
            </Field>
            <Button type="submit" disabled={savingProfile} className={primaryBtn}>
              {savingProfile ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
            </Button>
          </form>
        </Panel>

        <Panel title="Ndrysho fjalëkalimin">
          <form onSubmit={changePassword} className="space-y-4">
            <Field label="Fjalëkalimi aktual">
              <input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} required className={fieldCls} />
            </Field>
            <Field label="Fjalëkalimi i ri">
              <input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} required className={fieldCls} />
            </Field>
            <Field label="Konfirmo fjalëkalimin">
              <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} required className={fieldCls} />
            </Field>
            <Button type="submit" disabled={savingPw} className={primaryBtn}>
              {savingPw ? 'Duke ruajtur…' : 'Ndrysho fjalëkalimin'}
            </Button>
          </form>
        </Panel>
      </div>
    </DashboardShell>
  )
}
