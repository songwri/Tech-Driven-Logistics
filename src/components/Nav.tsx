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
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-navy-950/70 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="text-lg font-bold tracking-tight text-white">
          TDL <span className="text-cyan-accent">.</span>
        </a>
        <ul className="hidden gap-8 text-sm text-white/70 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition hover:text-cyan-accent">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#contact"
          className="rounded-full border border-cyan-accent/40 px-4 py-1.5 text-sm text-cyan-accent transition hover:bg-cyan-accent/10"
        >
          문의하기
        </a>
      </nav>
    </header>
  )
}
