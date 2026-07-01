import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <p className="font-display text-7xl font-extrabold text-coral-500">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Faqja nuk u gjet</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Lidhja që ndoqe nuk ekziston ose është zhvendosur.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
      >
        Kthehu në fillim
      </Link>
    </div>
  )
}
