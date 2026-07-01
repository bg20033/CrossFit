import { Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import api from '../utils/api'
import { DashboardShell, DashboardHeader, Panel, Badge, EmptyState, Field, fieldCls, primaryBtn } from '../components/DashboardKit'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'

interface Permission {
  id: number
  key: string
  module: string
  description: string
}

interface RoleRow {
  id: number
  key: string
  name: string
  description: string
  isSystem: boolean
  isActive: boolean
  permissions: string[]
}

interface RoleUser {
  id: number
  name: string
  email: string
  baselineRole: string
  dynamicRoles: { id: number; key: string; name: string }[]
}

const empty = { name: '', description: '', permissionKeys: [] as string[] }

export default function AdminRoles() {
  const { addNotification } = useNotification()
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [users, setUsers] = useState<RoleUser[]>([])
  const [form, setForm] = useState(empty)
  const [assignment, setAssignment] = useState({ userId: '', roleId: '' })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const grouped = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
      acc[p.module] = acc[p.module] || []
      acc[p.module].push(p)
      return acc
    }, {})
  }, [permissions])

  const load = async () => {
    setLoading(true)
    try {
      const [r, p, u] = await Promise.all([api.get('/roles'), api.get('/roles/permissions'), api.get('/roles/users')])
      setRoles(r.data ?? [])
      setPermissions(p.data ?? [])
      setUsers(u.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const togglePermission = (key: string) => {
    setForm((f) => ({
      ...f,
      permissionKeys: f.permissionKeys.includes(key)
        ? f.permissionKeys.filter((k) => k !== key)
        : [...f.permissionKeys, key],
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/roles', form)
      setForm(empty)
      setOpen(false)
      addNotification('Sukses', 'Roli u krijua.', 'success')
      load()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Krijimi i rolit dështoi.', 'error')
    }
  }

  const assignRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignment.userId || !assignment.roleId) return
    try {
      await api.post(`/roles/${assignment.roleId}/assign`, { userId: Number(assignment.userId) })
      setAssignment({ userId: '', roleId: '' })
      addNotification('Sukses', 'Roli iu caktua user-it.', 'success')
      load()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Caktimi dështoi.', 'error')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="RBAC"
        title="Rolet & Permissions"
        subtitle="Krijo role dinamike dhe cakto çfarë lejohet për secilin modul."
        right={<Button className={primaryBtn} onClick={() => setOpen((v) => !v)}>{open ? 'Mbyll' : '+ Rol i ri'}</Button>}
      />

      {open && (
        <Panel title="Krijo rol">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Emri i rolit">
                <input className={fieldCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="p.sh. Recepsion Mbrëmje" />
              </Field>
              <Field label="Përshkrimi">
                <input className={fieldCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(grouped).map(([module, items]) => (
                <div key={module} className="rounded-xl border border-gray-100 p-4">
                  <p className="mb-3 text-sm font-bold capitalize text-gray-900">{module}</p>
                  <div className="space-y-2">
                    {items.map((p) => (
                      <label key={p.key} className="flex items-start gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={form.permissionKeys.includes(p.key)}
                          onChange={() => togglePermission(p.key)}
                          className="mt-1 accent-coral-500"
                        />
                        <span>
                          <span className="block font-semibold text-gray-800">{p.key}</span>
                          <span className="text-xs text-gray-400">{p.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button type="submit" className={primaryBtn}>Ruaj rolin</Button>
          </form>
        </Panel>
      )}

      <Panel title="Rolet aktive">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar...</p>
        ) : roles.length === 0 ? (
          <EmptyState icon={<Lock className="h-5 w-5" />} text="Ende nuk ka role dinamike. Krijo rolin e parë." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {roles.map((role) => (
              <div key={role.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{role.name}</p>
                    <p className="font-mono text-xs text-gray-400">{role.key}</p>
                  </div>
                  <Badge accent={role.isActive ? 'green' : 'gray'}>{role.isActive ? 'Aktiv' : 'Joaktiv'}</Badge>
                </div>
                {role.description && <p className="mt-2 text-sm text-gray-500">{role.description}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {role.permissions.map((p) => (
                    <span key={p} className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-[11px] text-gray-600">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Cakto rol te user-i">
        <form onSubmit={assignRole} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select value={assignment.userId} onChange={(e) => setAssignment((a) => ({ ...a, userId: e.target.value }))} className={fieldCls} required>
            <option value="">Zgjedh user-in</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} · {u.email} · {u.baselineRole}</option>
            ))}
          </select>
          <select value={assignment.roleId} onChange={(e) => setAssignment((a) => ({ ...a, roleId: e.target.value }))} className={fieldCls} required>
            <option value="">Zgjedh rolin dinamik</option>
            {roles.filter((r) => r.isActive).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <Button type="submit" className={primaryBtn}>Cakto</Button>
        </form>

        <div className="mt-4 space-y-2">
          {users.slice(0, 8).map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                <p className="text-xs text-gray-400">{u.baselineRole} · {u.email}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {u.dynamicRoles.length === 0 ? (
                  <span className="text-xs text-gray-400">Pa rol dinamik</span>
                ) : u.dynamicRoles.map((r) => (
                  <span key={r.id} className="rounded-full bg-coral-50 px-2 py-1 text-xs font-semibold text-coral-700">{r.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </DashboardShell>
  )
}
