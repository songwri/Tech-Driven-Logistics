import { useState } from 'react'
import { motion } from 'framer-motion'
import { techItems } from '../data/techData'
import TechDetailOverlay from './TechDetailOverlay'
import TechPreview from '../three/TechPreview'

export default function TechMap() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeTech = techItems.find((tech) => tech.id === activeId) ?? null

  return (
    <section id="tech-map" className="mx-auto max-w-7xl px-6 py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center"
      >
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
          Interactive Tech Map
        </p>
        <h2 className="text-3xl font-bold text-white md:text-4xl">
          기술을 보여주는 사이트가 아니라, 기술이 움직이는 사이트
        </h2>
        <p className="mt-4 text-white/60">
          카드를 클릭하면 3D 와이어프레임 모델의 실제 동작과 핵심 기술 포인트를 확인할 수 있습니다.
        </p>
      </motion.div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {techItems.map((tech, i) => (
          <motion.button
            key={tech.id}
            type="button"
            onClick={() => setActiveId(tech.id)}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
            className="glass-panel group overflow-hidden rounded-xl text-left transition hover:border-cyan-accent/50 hover:bg-navy-800/60"
          >
            <div className="aspect-video w-full border-b border-white/10 bg-navy-900/60">
              <TechPreview techId={tech.id} className="h-full w-full pointer-events-none" />
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-accent">
                {tech.englishName}
              </p>
              <h3 className="mt-2 text-xl font-bold text-white">{tech.name}</h3>
              <p className="mt-2 text-sm text-white/60">{tech.tagline}</p>
              <span className="mt-4 inline-block text-sm text-white/40 transition group-hover:text-cyan-accent">
                클릭하여 동작 확인 →
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {activeTech && (
        <TechDetailOverlay tech={activeTech} onClose={() => setActiveId(null)} />
      )}
    </section>
  )
}
