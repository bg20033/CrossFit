import { Link } from 'react-router-dom'

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-800 bg-gray-900 text-gray-400">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-lg font-extrabold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base">💪</span>
            StandUp CrossFit
          </div>
          <p className="mt-3 max-w-sm text-sm">
            Platforma e plotë për menaxhimin e palestrës — klientë, trajnerë, orare,
            financa dhe progres, të gjitha në një vend.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Lidhje</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white">Ballina</Link></li>
            <li><Link to="/about" className="hover:text-white">Rreth Nesh</Link></li>
            <li><Link to="/rental" className="hover:text-white">Qira e Hapësirës</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Llogaria</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/login" className="hover:text-white">Kyçu</Link></li>
            <li><Link to="/register" className="hover:text-white">Regjistrohu</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} StandUp CrossFit. Të gjitha të drejtat e rezervuara.
      </div>
    </footer>
  )
}
