import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { UserRole } from '../types'

type Mode = 'login' | 'register'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100'

export default function Auth({ initialMode = 'login' }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client' as UserRole,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const isLogin = mode === 'login'

  const switchTo = (m: Mode) => {
    setError('')
    setMode(m)
    // keep the URL in sync without a full reload
    window.history.replaceState(null, '', m === 'login' ? '/login' : '/register')
  }

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isLogin && form.password !== form.confirmPassword) {
      setError('Fjalëkalimet nuk përputhen')
      return
    }
    try {
      setLoading(true)
      if (isLogin) {
        await login(form.email, form.password)
      } else {
        await register({ name: form.name, email: form.email, password: form.password, role: form.role })
      }
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || (isLogin ? 'Kyçja dështoi' : 'Regjistrimi dështoi'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full items-center justify-center bg-gray-50 px-4 py-16 min-h-[80vh]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-2xl text-white">💪</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            {isLogin ? 'Mirë se u ktheve' : 'Krijo një llogari'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isLogin ? 'Kyçu për të hyrë në panelin tënd' : 'Bashkohu me StandUp CrossFit sot'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          {/* Toggle */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => switchTo('login')}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Kyçu
            </button>
            <button
              type="button"
              onClick={() => switchTo('register')}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                !isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Regjistrohu
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Emri i plotë</label>
                <input name="name" value={form.name} onChange={change} required className={inputClass} />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={change}
                required
                className={inputClass}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Unë jam...</label>
                <select name="role" value={form.role} onChange={change} className={inputClass}>
                  <option value="client">Klient</option>
                  <option value="trainer">Trajner</option>
                  <option value="gym_owner">Pronar i Palestrës</option>
                  <option value="staff">Staf / Recepsion</option>
                </select>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Fjalëkalimi</label>
              <input
                type="password"
                name="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={change}
                required
                className={inputClass}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Konfirmo Fjalëkalimin</label>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={change}
                  required
                  className={inputClass}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white hover:bg-gray-800"
            >
              {loading ? 'Duke procesuar…' : isLogin ? 'Kyçu' : 'Krijo Llogari'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            {isLogin ? (
              <>
                S'ke llogari?{' '}
                <button onClick={() => switchTo('register')} className="font-semibold text-gray-900 underline">
                  Regjistrohu
                </button>
              </>
            ) : (
              <>
                Ke llogari?{' '}
                <button onClick={() => switchTo('login')} className="font-semibold text-gray-900 underline">
                  Kyçu
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          <Link to="/" className="hover:text-gray-600">← Kthehu te ballina</Link>
        </p>
      </div>
    </div>
  )
}
