import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// Anchor links scroll to Landing sections (Landing handles hash scrolling).
const anchors = [
  { hash: '#programs', label: 'Programet' },
  { hash: '#coaches', label: 'Trajnerët' },
  { hash: '#schedule', label: 'Orari' },
  { hash: '#pricing', label: 'Anëtarësia' },
  { hash: '#faq', label: 'FAQ' },
]

const pages = [
  { to: '/about', label: 'Rreth Nesh' },
  { to: '/rental', label: 'Qira' },
]

export default function PublicHeader() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-cocoa/10 bg-cream/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5 text-cocoa no-underline" onClick={() => setOpen(false)}>
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-clay font-newsreader text-xl leading-none text-cream">
            S
          </span>
          <span className="text-base font-bold tracking-[-0.01em]">
            Stand Up <span className="text-clay">CrossFit</span>
          </span>
        </Link>

        <div className="hidden items-center gap-[26px] text-[14.5px] font-medium lg:flex">
          {anchors.map((l) => (
            <Link key={l.hash} to={{ pathname: '/', hash: l.hash }} className="text-[#413A30] transition hover:text-clay">
              {l.label}
            </Link>
          ))}
          {pages.map((l) => (
            <Link key={l.to} to={l.to} className="text-[#413A30] transition hover:text-clay">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-5 lg:flex">
          {user ? (
            <Link
              to="/dashboard"
              className="whitespace-nowrap rounded-full bg-cocoa px-5 py-[11px] text-sm font-semibold text-cream transition hover:bg-cocoa/85"
            >
              Hyr në Panel
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-[#413A30] hover:text-cocoa">
                Kyçu
              </Link>
              <Link
                to={{ pathname: '/', hash: '#contact' }}
                className="whitespace-nowrap rounded-full bg-cocoa px-5 py-[11px] text-sm font-semibold text-cream transition hover:bg-cocoa/85"
              >
                Rezervo klasë falas
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-cocoa hover:bg-cocoa/5 lg:hidden"
          aria-label="Menu"
        >
          ☰
        </button>
      </nav>

      {open && (
        <div className="border-t border-cocoa/10 bg-cream lg:hidden">
          <nav className="mx-auto flex max-w-[1200px] flex-col px-6 py-3">
            {[...anchors.map((l) => ({ key: l.hash, to: { pathname: '/', hash: l.hash }, label: l.label })),
              ...pages.map((l) => ({ key: l.to, to: l.to as string | { pathname: string; hash: string }, label: l.label }))].map((l) => (
              <Link
                key={l.key}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-[#413A30] hover:bg-cocoa/5"
              >
                {l.label}
              </Link>
            ))}
            <div className="my-2 border-t border-cocoa/10" />
            {user ? (
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="rounded-full bg-cocoa px-5 py-3 text-center text-sm font-semibold text-cream"
              >
                Hyr në Panel
              </Link>
            ) : (
              <div className="flex gap-2 pb-2">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full border border-cocoa/20 px-5 py-3 text-center text-sm font-semibold text-cocoa"
                >
                  Kyçu
                </Link>
                <Link
                  to={{ pathname: '/', hash: '#contact' }}
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full bg-cocoa px-5 py-3 text-center text-sm font-semibold text-cream"
                >
                  Klasë falas
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
