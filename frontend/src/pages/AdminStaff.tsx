import { User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import TeamTabs from '../components/app/TeamTabs'
import api from '../utils/api'
import { toDecimal } from '../utils/number'
import { eur, shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
  Modal,
  primaryBtn,
} from '../components/DashboardKit'

interface Staff {
  id: number
  name: string
  email: string
  position: string
  salary: number
  isActive: boolean
  role: string
  hireDate: string
}

const emptyStaff = { name: '', email: '', password: '', position: '', salary: '0', role: 'Staff' }
const now = new Date()
const emptySalary = { year: String(now.getFullYear()), month: String(now.getMonth() + 1), hoursWorked: '160', bonus: '0', deductions: '0' }
const roleLabel = (role: string) => role === 'Cashier' ? 'Arka' : 'Staf'

export default function AdminStaff() {
  const { addNotification } = useNotification()
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyStaff)
  const [salaryFor, setSalaryFor] = useState<Staff | null>(null)
  const [salary, setSalary] = useState(emptySalary)
  const [salaryResult, setSalaryResult] = useState<string>('')

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const res = await api.get('/staff')
      setStaff(res.data.staff ?? [])
    } catch {
      setError('Ngarkimi i stafit dështoi')
    } finally {
      setLoading(false)
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/staff/create', { ...form, salary: toDecimal(form.salary) })
      setShowForm(false)
      setForm(emptyStaff)
      addNotification('Sukses', 'Anëtari i stafit u krijua.', 'success')
      fetchStaff()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Krijimi i stafit dështoi')
    }
  }

  const calcSalary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!salaryFor) return
    setSalaryResult('')
    try {
      const res = await api.post(`/staff/${salaryFor.id}/calculate-salary`, {
        year: parseInt(salary.year),
        month: parseInt(salary.month),
        hoursWorked: toDecimal(salary.hoursWorked),
        bonus: toDecimal(salary.bonus),
        deductions: toDecimal(salary.deductions),
      })
      const total = res.data?.totalAmount ?? res.data?.total ?? res.data?.totalSalary ?? res.data?.netSalary
      setSalaryResult(total != null ? `Rroga e llogaritur: ${eur(total)}` : 'Rroga u llogarit.')
    } catch (err: any) {
      setSalaryResult(err.response?.data?.message || 'Llogaritja dështoi')
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const changeSalary = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSalary((p) => ({ ...p, [e.target.name]: e.target.value }))

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Menaxhim"
        title="Stafi"
        subtitle="Punonjësit, pozicionet dhe rrogat."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Anëtar i ri'}
          </Button>
        }
      />

      <TeamTabs />

      {error && <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>}

      {showForm && (
        <Panel title="Shto anëtar stafi">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emri"><input name="name" value={form.name} onChange={change} required className={fieldCls} /></Field>
              <Field label="Email"><input type="email" name="email" value={form.email} onChange={change} required className={fieldCls} /></Field>
              <Field label="Fjalëkalimi"><input type="password" name="password" value={form.password} onChange={change} required minLength={8} className={fieldCls} /></Field>
              <Field label="Pozicioni"><input name="position" value={form.position} onChange={change} required placeholder="p.sh. Recepsionist" className={fieldCls} /></Field>
              <Field label="Rroga bazë (€)"><input type="text" inputMode="decimal" name="salary" value={form.salary} onChange={change} className={fieldCls} /></Field>
              <Field label="Roli">
                <select name="role" value={form.role} onChange={change} className={fieldCls}>
                  <option value="Staff">Staf / Recepsion</option>
                  <option value="Cashier">Arka</option>
                </select>
              </Field>
            </div>
            <Button type="submit" className={primaryBtn}>Krijo</Button>
          </form>
        </Panel>
      )}

      <Panel title="Lista e stafit" action={<Badge accent="gray">{staff.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : staff.length === 0 ? (
          <EmptyState icon={<User className="h-5 w-5" />} text="Ende s'ka staf. Shto të parin me '+ Anëtar i ri'." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Emri</th>
                  <th className="px-3 py-2 font-semibold">Pozicioni</th>
                  <th className="px-3 py-2 font-semibold">Roli</th>
                  <th className="px-3 py-2 font-semibold">Rroga</th>
                  <th className="px-3 py-2 font-semibold">Punësuar</th>
                  <th className="px-3 py-2 font-semibold">Statusi</th>
                  <th className="px-3 py-2 text-right font-semibold">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{s.position}</td>
                    <td className="px-3 py-3"><Badge accent={s.role === 'Cashier' ? 'orange' : 'gray'}>{roleLabel(s.role)}</Badge></td>
                    <td className="px-3 py-3 text-gray-800">{eur(s.salary)}</td>
                    <td className="px-3 py-3 text-gray-600">{shortDate(s.hireDate)}</td>
                    <td className="px-3 py-3"><Badge accent={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Aktiv' : 'Pasiv'}</Badge></td>
                    <td className="px-3 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setSalaryFor(s); setSalary(emptySalary); setSalaryResult('') }}>
                        Llogarit rrogë
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {salaryFor && (
        <Modal title={`Llogarit rrogë — ${salaryFor.name}`} onClose={() => setSalaryFor(null)}>
          <form onSubmit={calcSalary} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Viti"><input type="number" name="year" value={salary.year} onChange={changeSalary} className={fieldCls} /></Field>
              <Field label="Muaji"><input type="number" min="1" max="12" name="month" value={salary.month} onChange={changeSalary} className={fieldCls} /></Field>
              <Field label="Orë pune"><input type="number" name="hoursWorked" value={salary.hoursWorked} onChange={changeSalary} className={fieldCls} /></Field>
              <Field label="Bonus (€)"><input type="number" name="bonus" value={salary.bonus} onChange={changeSalary} className={fieldCls} /></Field>
              <Field label="Zbritje (€)"><input type="number" name="deductions" value={salary.deductions} onChange={changeSalary} className={fieldCls} /></Field>
            </div>
            {salaryResult && <p className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-800">{salaryResult}</p>}
            <Button type="submit" className={`w-full ${primaryBtn}`}>Llogarit</Button>
          </form>
        </Modal>
      )}
    </DashboardShell>
  )
}
