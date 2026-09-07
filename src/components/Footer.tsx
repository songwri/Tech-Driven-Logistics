import { Logo } from './ui/Logo'

export default function Footer() {
  return (
    <footer className="border-t border-warm-300/30 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6">
        <Logo className="h-9" />
        <p className="font-mono text-xs text-warm-600">
          Tech Driven Logistics · Tech Innovation Team
        </p>
      </div>
    </footer>
  )
}
