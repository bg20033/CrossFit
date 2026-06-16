import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

const features = [
  { icon: '👥', title: 'Menaxho Anëtarët', text: 'Klientë, trajnerë dhe staf me qasje sipas rolit.' },
  { icon: '📅', title: 'Orare & Grupe', text: 'Organizo grupe CrossFit dhe sesione personale lehtësisht.' },
  { icon: '💪', title: 'Plane & Dieta', text: 'Krijo plane ushtrimesh e dieta, eksporto në PDF.' },
  { icon: '💰', title: 'Financa', text: 'Ndiq të hyrat, shpenzimet, rrogat dhe faturat.' },
  { icon: '🎯', title: 'Progres & Qëllime', text: 'Gjurmo peshën, matjet dhe arritjet e klientëve.' },
  { icon: '🏧', title: 'Arka & Recepsion', text: 'Regjistrim i shpejtë, pagesa dhe raporte ditore.' },
]

const stats = [
  { value: '5', label: 'Role të ndryshme' },
  { value: '15+', label: 'Module menaxhimi' },
  { value: '100%', label: 'Në një platformë' },
]

export default function Landing() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900 text-white">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 md:px-6 md:py-32">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-gray-200">
            Sistemi i menaxhimit të palestrës
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            Drejto palestrën tënde, <span className="text-gray-400">pa stres.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-gray-300">
            Klientë, trajnerë, orare, financa dhe progres — të gjitha në një platformë moderne
            për palestra dhe trajnerë personalë.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-200">Fillo Tani</Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                Mëso më shumë
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid max-w-lg grid-cols-3 gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-white md:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Gjithçka që të duhet</h2>
            <p className="mt-3 text-gray-600">Një grup i plotë veglash për të menaxhuar çdo pjesë të palestrës.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl">{f.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="text-3xl font-bold md:text-4xl">Gati ta transformosh palestrën?</h2>
          <p className="mt-3 text-gray-400">Regjistrohu sot dhe nis menaxhimin në mënyrë profesionale.</p>
          <div className="mt-8">
            <Link to="/register">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-200">Krijo Llogari Falas</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
