const navLinks = [
  { href: '#strategy', label: 'About TDL' },
  { href: '#team', label: 'Tech Innovation Team' },
  { href: '#tech-map', label: 'Technology' },
  { href: '#case-study', label: 'Case Study' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '#contact', label: 'Contact' },
]

export default function Nav() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-warm-300/30 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="text-lg font-bold tracking-tight text-warm-800">
          TDL <span className="text-brand">.</span>
        </a>
        <ul className="hidden gap-8 text-sm text-warm-600 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition hover:text-brand">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#contact"
          className="rounded-full border border-brand/40 px-4 py-1.5 text-sm text-brand transition hover:bg-brand/10"
        >
          문의하기
        </a>
      </nav>
    </header>
  )
}
