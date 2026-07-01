import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { roleLabel } from '../lib/roles'
import api from '../utils/api'
import { toDecimal } from '../utils/number'
import { DashboardShell, DashboardHeader, Panel, Field, fieldCls, primaryBtn } from '../components/DashboardKit'

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const { addNotification } = useNotification()

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' })
  const [savingProfile, setSavingProfile] = useState(false)

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'gym_owner'
  const [gym, setGym] = useState({ openTime: '06:00', closeTime: '22:00', closedDays: '', holidayDates: '', brandName: '', brandColor: '#EE3A24', refundThreshold: '50' })
  const [savingGym, setSavingGym] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    api.get('/gymsettings').then((r) => {
      const d = r.data || {}
      setGym({
        openTime: d.openTime ?? '06:00',
        closeTime: d.closeTime ?? '22:00',
        closedDays: d.closedDays ?? '',
        holidayDates: d.holidayDates ?? '',
        brandName: d.brandName ?? '',
        brandColor: d.brandColor ?? '#EE3A24',
        refundThreshold: String(d.refundThreshold ?? 50),
      })
    }).catch(() => {})
  }, [isAdmin])

  const saveGym = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingGym(true)
    try {
      await api.put('/gymsettings', { ...gym, refundThreshold: toDecimal(gym.refundThreshold) || 0 })
      addNotification('Sukses', 'Konfigurimi u ruajt.', 'success')
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ruajtja dështoi.', 'error')
    } finally {
      setSavingGym(false)
    }
  }

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

  const logoutEverywhere = async () => {
    try {
      await api.post('/auth/logout-all')
      addNotification('Sukses', 'Të gjitha sesionet u anuluan.', 'success')
    } catch {
      addNotification('Gabim', 'Veprimi dështoi.', 'error')
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
              <input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} required minLength={8} className={fieldCls} />
            </Field>
            <Field label="Konfirmo fjalëkalimin">
              <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} required minLength={8} className={fieldCls} />
            </Field>
            <Button type="submit" disabled={savingPw} className={primaryBtn}>
              {savingPw ? 'Duke ruajtur…' : 'Ndrysho fjalëkalimin'}
            </Button>
          </form>
        </Panel>

        <Panel title="Siguria">
          <p className="mb-4 text-sm text-gray-500">
            Dil nga të gjitha pajisjet — anulon të gjitha sesionet aktive (refresh tokens) përveç kësaj.
          </p>
          <Button onClick={logoutEverywhere} variant="outline">
            Dil nga të gjitha pajisjet
          </Button>
        </Panel>

        {isAdmin && (
          <Panel title="Konfigurimi i palestrës" className="lg:col-span-2">
            <form onSubmit={saveGym} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Hapet (orë)"><input type="time" value={gym.openTime} onChange={(e) => setGym((g) => ({ ...g, openTime: e.target.value }))} className={fieldCls} /></Field>
                <Field label="Mbyllet (orë)"><input type="time" value={gym.closeTime} onChange={(e) => setGym((g) => ({ ...g, closeTime: e.target.value }))} className={fieldCls} /></Field>
                <Field label="Pragu i refund-it (€)"><input type="text" inputMode="decimal" value={gym.refundThreshold} onChange={(e) => setGym((g) => ({ ...g, refundThreshold: e.target.value }))} className={fieldCls} /></Field>
                <Field label="Ngjyra e markës"><input type="color" value={gym.brandColor} onChange={(e) => setGym((g) => ({ ...g, brandColor: e.target.value }))} className={`${fieldCls} h-10 p-1`} /></Field>
              </div>
              <Field label="Emri i markës"><input value={gym.brandName} onChange={(e) => setGym((g) => ({ ...g, brandName: e.target.value }))} className={fieldCls} /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Ditë të mbyllura (0=Hën..6=Die, me presje)"><input value={gym.closedDays} onChange={(e) => setGym((g) => ({ ...g, closedDays: e.target.value }))} placeholder="p.sh. 6" className={fieldCls} /></Field>
                <Field label="Festa / mbyllje (data me presje)"><input value={gym.holidayDates} onChange={(e) => setGym((g) => ({ ...g, holidayDates: e.target.value }))} placeholder="2026-12-25,2027-01-01" className={fieldCls} /></Field>
              </div>
              <Button type="submit" disabled={savingGym} className={primaryBtn}>
                {savingGym ? 'Duke ruajtur…' : 'Ruaj konfigurimin'}
              </Button>
            </form>
          </Panel>
        )}
      </div>
    </DashboardShell>
  )
}
