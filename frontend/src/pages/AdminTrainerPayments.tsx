import { Banknote, Calculator, CheckCircle2, Users, Wallet } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import FinanceTabs from '../components/app/FinanceTabs'
import api from '../utils/api'
import { eur } from '../utils/format'
import { toDecimal } from '../utils/number'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
  Modal,
  primaryBtn,
} from '../components/DashboardKit'

interface Trainer {
  id: number
  name: string
  commissionPerClient: number
  paymentModel: string
  trainerType: string
}
interface Commission {
  id: number
  trainerId: number
  trainer: string
  period: string
  year: number
  month: number
  clientCount: number
  ratePerClient: number
  sessionsPlanned: number
  sessionsHeld: number
  sessionsCancelled: number
  paymentModel: string
  proratedAmount: number
  bonus: number
  deductions: number
  totalAmount: number
  status: string
  paidDate?: string
}

const MONTHS = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Korr', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj']
const MODEL_AL: Record<string, string> = { prorated: 'Pro-ratë', flat: 'Fiks/klient', hourly: 'Orar' }

export default function AdminTrainerPayments() {
  const { addNotification } = useNotification()
  const now = new Date()
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [calcFor, setCalcFor] = useState<Trainer | null>(null)
  const [calcForm, setCalcForm] = useState({ rate: '', model: '', bonus: '0', deductions: '0', notes: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, cRes] = await Promise.all([
        api.get('/trainers?pageSize=100'),
        api.get(`/trainerpayments?year=${period.year}&month=${period.month}`),
      ])
      setTrainers(tRes.data?.trainers ?? [])
      setCommissions(cRes.data ?? [])
    } catch {
      addNotification('Gabim', 'Ngarkimi i komisioneve dështoi.', 'error')
    } finally {
      setLoading(false)
    }
  }, [period.year, period.month, addNotification])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const commissionFor = (trainerId: number) =>
    commissions.find((c) => c.trainerId === trainerId && c.month === period.month && c.year === period.year)

  const openCalc = (t: Trainer) => {
    setCalcFor(t)
    setCalcForm({
      rate: String(t.commissionPerClient ?? 0),
      model: t.paymentModel || 'prorated',
      bonus: '0',
      deductions: '0',
      notes: '',
    })
  }

  const runCalc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!calcFor) return
    try {
      await api.post(`/trainerpayments/${calcFor.id}/calculate`, {
        year: period.year,
        month: period.month,
        ratePerClient: toDecimal(calcForm.rate),
        paymentModel: calcForm.model,
        bonus: toDecimal(calcForm.bonus),
        deductions: toDecimal(calcForm.deductions),
        notes: calcForm.notes,
      })
      addNotification('Sukses', `Komisioni u llogarit për ${calcFor.name}.`, 'success')
      setCalcFor(null)
      fetchData()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Llogaritja dështoi.', 'error')
    }
  }

  const calcAll = async () => {
    await Promise.all(
      trainers.map((t) =>
        api
          .post(`/trainerpayments/${t.id}/calculate`, { year: period.year, month: period.month })
          .catch(() => null)
      )
    )
    addNotification('Sukses', `Komisionet u rillogaritën për ${MONTHS[period.month - 1]} ${period.year}.`, 'success')
    fetchData()
  }

  const pay = async (c: Commission) => {
    try {
      await api.post(`/trainerpayments/${c.id}/pay`, { paymentMethod: 'cash' })
      addNotification('Paguar', `${c.trainer} u pagua ${eur(c.totalAmount)} (regjistruar si shpenzim).`, 'success')
      fetchData()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Pagesa dështoi.', 'error')
    }
  }

  const totalPending = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + Number(c.totalAmount), 0)
  const totalPaid = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.totalAmount), 0)

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Financa"
        title="Pagesat e Trajnerëve"
        subtitle="Komisioni mujor sipas klientëve, pro-ratë me seancat e mbajtura. Pagesa regjistrohet si shpenzim."
        right={
          <Button onClick={calcAll} disabled={loading || trainers.length === 0} className={primaryBtn}>
            <Calculator className="mr-1 h-4 w-4" /> Llogarit të gjithë
          </Button>
        }
      />

      <FinanceTabs />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5" />} label="Trajnerë" value={loading ? '…' : trainers.length} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Për t'u paguar" value={eur(totalPending)} />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Paguar këtë muaj" value={eur(totalPaid)} />
      </div>

      <Panel title="Periudha">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Field label="Muaji">
              <select
                value={period.month}
                onChange={(e) => setPeriod((p) => ({ ...p, month: parseInt(e.target.value) }))}
                className={fieldCls}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="w-24">
            <Field label="Viti">
              <input
                type="number"
                value={period.year}
                onChange={(e) => setPeriod((p) => ({ ...p, year: parseInt(e.target.value) || p.year }))}
                className={fieldCls}
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title={`Trajnerët — ${MONTHS[period.month - 1]} ${period.year}`} action={<Badge accent="green">{trainers.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : trainers.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} text="S'ka trajnerë. Shtoji te faqja e Trajnerëve." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Trajneri</th>
                  <th className="px-3 py-2 font-semibold">Modeli</th>
                  <th className="px-3 py-2 font-semibold">Klientë</th>
                  <th className="px-3 py-2 font-semibold">Seanca (mbajtur/plan)</th>
                  <th className="px-3 py-2 text-right font-semibold">Komisioni</th>
                  <th className="px-3 py-2 text-right font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trainers.map((t) => {
                  const c = commissionFor(t.id)
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">{t.name}</td>
                      <td className="px-3 py-3 text-gray-600">{MODEL_AL[c?.paymentModel ?? t.paymentModel] ?? t.paymentModel}</td>
                      <td className="px-3 py-3 text-gray-600">{c ? c.clientCount : '—'}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {c ? `${c.sessionsHeld}/${c.sessionsPlanned}${c.sessionsCancelled ? ` (${c.sessionsCancelled} anul.)` : ''}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-900">{c ? eur(c.totalAmount) : '—'}</td>
                      <td className="px-3 py-3 text-right">
                        {c ? (
                          <Badge accent={c.status === 'paid' ? 'green' : c.status === 'cancelled' ? 'gray' : 'gray'}>
                            {c.status === 'paid' ? 'Paguar' : c.status === 'cancelled' ? 'Anuluar' : 'Pezull'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">Pa llogaritur</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openCalc(t)}>
                            {c ? 'Rillogarit' : 'Llogarit'}
                          </Button>
                          {c && c.status === 'pending' && (
                            <Button size="sm" className={primaryBtn} onClick={() => pay(c)}>
                              <CheckCircle2 className="mr-1 h-4 w-4" /> Paguaj
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {calcFor && (
        <Modal title={`Llogarit komisionin — ${calcFor.name}`} onClose={() => setCalcFor(null)}>
          <form onSubmit={runCalc} className="space-y-4">
            <p className="rounded-lg bg-coral-50 px-3 py-2 text-xs text-coral-700">
              Formula pro-ratë: (seanca të mbajtura ÷ të planifikuara) × klientë × €/klient. Sigurohu që seancat janë
              gjeneruar te faqja e Grupeve që proratimi të jetë i saktë.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="€ për klient">
                <input
                  type="text"
                  inputMode="decimal"
                  value={calcForm.rate}
                  onChange={(e) => setCalcForm({ ...calcForm, rate: e.target.value })}
                  className={fieldCls}
                />
              </Field>
              <Field label="Modeli i pagesës">
                <select
                  value={calcForm.model}
                  onChange={(e) => setCalcForm({ ...calcForm, model: e.target.value })}
                  className={fieldCls}
                >
                  <option value="prorated">Pro-ratë (sipas seancave)</option>
                  <option value="flat">Fiks për klient</option>
                  <option value="hourly">Orar (vetëm payroll)</option>
                </select>
              </Field>
              <Field label="Bonus (€)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={calcForm.bonus}
                  onChange={(e) => setCalcForm({ ...calcForm, bonus: e.target.value })}
                  className={fieldCls}
                />
              </Field>
              <Field label="Zbritje (€)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={calcForm.deductions}
                  onChange={(e) => setCalcForm({ ...calcForm, deductions: e.target.value })}
                  className={fieldCls}
                />
              </Field>
            </div>
            <Field label="Shënime">
              <textarea
                value={calcForm.notes}
                onChange={(e) => setCalcForm({ ...calcForm, notes: e.target.value })}
                rows={2}
                className={fieldCls}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCalcFor(null)}>Anulo</Button>
              <Button type="submit" className={primaryBtn}>Llogarit</Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardShell>
  )
}
