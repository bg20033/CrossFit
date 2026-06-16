import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { eur } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  primaryBtn,
} from '../components/DashboardKit'

interface Staff {
  id: number
  name: string
  position: string
  salary: number
}

const MONTHS = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Korr', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj']

export default function Payroll() {
  const { addNotification } = useNotification()
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Record<number, number>>({})

  const now = new Date()
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1, hours: '160' })

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const res = await api.get('/staff')
      setStaff(res.data.staff ?? [])
    } finally {
      setLoading(false)
    }
  }

  const run = async () => {
    setRunning(true)
    setResults({})
    const next: Record<number, number> = {}
    await Promise.all(
      staff.map(async (s) => {
        try {
          const res = await api.post(`/staff/${s.id}/calculate-salary`, {
            year: period.year,
            month: period.month,
            hoursWorked: parseFloat(period.hours || '0'),
            overtimeHours: 0,
            bonus: 0,
            deductions: 0,
          })
          next[s.id] = Number(res.data?.totalAmount ?? s.salary)
        } catch {
          next[s.id] = Number(s.salary)
        }
      })
    )
    setResults(next)
    setRunning(false)
    addNotification('Sukses', `Rrogat u gjeneruan për ${MONTHS[period.month - 1]} ${period.year}.`, 'success')
  }

  const totalBase = staff.reduce((s, x) => s + Number(x.salary ?? 0), 0)
  const totalPayroll = Object.values(results).reduce((s, v) => s + v, 0)

  return (
    <DashboardShell>
      <DashboardHeader
        badge="HR"
        title="Payroll"
        subtitle="Gjenero rrogat mujore për stafin."
        right={
          <Button onClick={run} disabled={running || staff.length === 0} className={primaryBtn}>
            {running ? 'Duke gjeneruar…' : 'Gjenero rrogat'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="👔" label="Punonjës" value={loading ? '…' : staff.length} />
        <StatCard icon="💼" label="Rroga bazë (total)" value={eur(totalBase)} />
        <StatCard icon="💶" label="Payroll i gjeneruar" value={Object.keys(results).length ? eur(totalPayroll) : '—'} />
      </div>

      <Panel title="Periudha">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Field label="Muaji">
              <select value={period.month} onChange={(e) => setPeriod((p) => ({ ...p, month: parseInt(e.target.value) }))} className={fieldCls}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
          </div>
          <div className="w-24">
            <Field label="Viti"><input type="number" value={period.year} onChange={(e) => setPeriod((p) => ({ ...p, year: parseInt(e.target.value) || p.year }))} className={fieldCls} /></Field>
          </div>
          <div className="w-28">
            <Field label="Orë pune"><input type="number" value={period.hours} onChange={(e) => setPeriod((p) => ({ ...p, hours: e.target.value }))} className={fieldCls} /></Field>
          </div>
        </div>
      </Panel>

      <Panel title="Stafi">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : staff.length === 0 ? (
          <EmptyState icon="👔" text="S'ka staf të regjistruar. Shtoji te faqja e Stafit." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Emri</th>
                  <th className="px-3 py-2 font-semibold">Pozicioni</th>
                  <th className="px-3 py-2 font-semibold">Rroga bazë</th>
                  <th className="px-3 py-2 text-right font-semibold">Rroga e gjeneruar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-3 py-3 text-gray-600">{s.position}</td>
                    <td className="px-3 py-3 text-gray-600">{eur(s.salary)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-900">
                      {results[s.id] != null ? eur(results[s.id]) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}
