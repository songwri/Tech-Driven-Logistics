import { useState } from 'react'
import { useLab } from '@/lib/labContext'

const navLinks = [
  { href: '#strategy', label: 'About TDL' },
  { href: '#team', label: 'Team' },
  { href: '#tech-map', label: 'Technology' },
  { href: '#tdl-lab', label: 'TDL Lab' },
  { href: '#case-study', label: 'Case Study' },
  { href: '#contact', label: 'Contact' },
]

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { openReservation } = useLab()

  return (
    <header className="fixed top-0 z-50 w-full border-b border-warm-300/30 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#lab-gate" className="font-display text-lg font-bold text-warm-800">
          TDL <span className="text-brand">.</span>
        </a>
        <ul className="hidden gap-8 font-mono text-xs uppercase tracking-wide text-warm-600 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition hover:text-brand">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openReservation}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            방문 예약
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-300/50 text-warm-800 transition hover:border-brand hover:text-brand md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <ul className="flex flex-col gap-1 border-t border-warm-300/30 bg-white px-6 py-4 text-sm text-warm-600 md:hidden">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-2 py-2 transition hover:bg-cream hover:text-brand"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}
