import { useState } from 'react'
import { techItems } from '../data/techData'
import TechDetailOverlay from './TechDetailOverlay'

export default function TechMap() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeTech = techItems.find((tech) => tech.id === activeId) ?? null

  return (
    <section id="tech-map" className="mx-auto max-w-7xl px-6 py-28">
      <div className="text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
          Interactive Tech Map
        </p>
        <h2 className="text-3xl font-bold text-white md:text-4xl">
          기술을 보여주는 사이트가 아니라, 기술이 움직이는 사이트
        </h2>
        <p className="mt-4 text-white/60">
          아이콘을 클릭하면 실제 동작과 핵심 기술 포인트를 확인할 수 있습니다.
        </p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {techItems.map((tech) => (
          <button
            key={tech.id}
            type="button"
            onClick={() => setActiveId(tech.id)}
            className="glass-panel group relative rounded-xl p-6 text-left transition hover:border-cyan-accent/50 hover:bg-navy-800/60"
          >
            <span className="hotspot-pulse absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-cyan-accent" />
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-accent">
              {tech.englishName}
            </p>
            <h3 className="mt-2 text-xl font-bold text-white">{tech.name}</h3>
            <p className="mt-2 text-sm text-white/60">{tech.tagline}</p>
            <span className="mt-4 inline-block text-sm text-white/40 transition group-hover:text-cyan-accent">
              클릭하여 동작 확인 →
            </span>
          </button>
        ))}
      </div>

      {activeTech && (
        <TechDetailOverlay tech={activeTech} onClose={() => setActiveId(null)} />
      )}
    </section>
  )
}
