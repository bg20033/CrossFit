import { Link } from 'react-router-dom'

const anchorLinks = [
  { hash: '#programs', label: 'Programet' },
  { hash: '#coaches', label: 'Trajnerët' },
  { hash: '#pricing', label: 'Anëtarësia' },
  { hash: '#contact', label: 'Kontakti' },
]

const pageLinks = [
  { to: '/about', label: 'Rreth Nesh' },
  { to: '/rental', label: 'Qira e Hapësirës' },
  { to: '/login', label: 'Kyçu' },
  { to: '/register', label: 'Regjistrohu' },
]

export default function PublicFooter() {
  return (
    <footer className="bg-cocoa text-cream">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8 px-6 pb-10 pt-14">
        <div className="flex items-center gap-2.5">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-clay font-newsreader text-xl text-cream">S</span>
          <span className="text-base font-bold">Stand Up CrossFit</span>
        </div>

        <div className="flex flex-wrap gap-x-[26px] gap-y-2 text-sm font-medium">
          {anchorLinks.map((l) => (
            <Link key={l.hash} to={{ pathname: '/', hash: l.hash }} className="text-cream/80 transition hover:text-cream">
              {l.label}
            </Link>
          ))}
          {pageLinks.map((l) => (
            <Link key={l.to} to={l.to} className="text-cream/80 transition hover:text-cream">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="text-[13px] text-cream/55">
          © {new Date().getFullYear()} Stand Up CrossFit · Prishtinë
        </div>
      </div>
    </footer>
  )
}
