import { motion } from 'framer-motion'

/** Axis spans 2025–2034 so each phase's width is proportional to its duration. */
const AXIS_START = 2025
const AXIS_END = 2034

const phases = [
  {
    key: 'Modularization',
    period: '~ 2027',
    from: 2025,
    to: 2027,
    summary: '단위 설비·시스템별 기능 검증과 도입, 확산',
    keywords: ['기능 검증', '도입', '확산'],
  },
  {
    key: 'Connection',
    period: '2028 – 2030',
    from: 2028,
    to: 2030,
    summary: '설비 및 시스템 간 연결·통합 고도화',
    keywords: ['연결', '통합', '고도화'],
  },
  {
    key: 'Integration',
    period: '2031 – 2034',
    from: 2031,
    to: 2034,
    summary: '자율성 기반의 유기적으로 통합된 물류 생태계',
    keywords: ['자율성', '유기적 통합', '물류 생태계'],
  },
]

/** Position on the axis as a percentage, months included so "Now" drifts
 *  through the year instead of snapping on 1 January. */
function axisPercent(date: Date) {
  const value = date.getFullYear() + date.getMonth() / 12
  const span = AXIS_END + 1 - AXIS_START
  return Math.min(100, Math.max(0, ((value - AXIS_START) / span) * 100))
}

function spanPercent(from: number, to: number) {
  const span = AXIS_END + 1 - AXIS_START
  return {
    left: ((from - AXIS_START) / span) * 100,
    width: ((to + 1 - from) / span) * 100,
  }
}

export default function Roadmap() {
  const now = new Date()
  const nowLeft = axisPercent(now)

  return (
    <section id="roadmap" className="mx-auto max-w-7xl px-6 py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">Roadmap</p>
        <h2 className="text-3xl font-bold text-warm-800 md:text-4xl">기술 전략 로드맵</h2>
        <p className="mt-4 max-w-2xl text-warm-600">
          단위 기술의 검증에서 시작해, 시스템 간 연결을 거쳐, 자율성 기반의 통합 물류
          생태계로 나아갑니다.
        </p>
      </motion.div>

      {/* Desktop: proportional timeline with a live "Now" marker */}
      <div className="mt-20 hidden md:block">
        <div className="relative">
          {/* Now marker sits above the axis */}
          <div
            className="absolute -top-9 z-10 -translate-x-1/2"
            style={{ left: `${nowLeft}%` }}
          >
            <div className="flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                Now
              </span>
              <span className="font-mono text-[10px] text-warm-600">{now.getFullYear()}</span>
              <span className="mt-1 h-3 w-px bg-brand" />
            </div>
          </div>

          {/* Phase bars */}
          <div className="relative h-2">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-warm-300/50" />
            {phases.map((phase, i) => {
              const { left, width } = spanPercent(phase.from, phase.to)
              return (
                <motion.div
                  key={phase.key}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.7, delay: i * 0.18, ease: 'easeOut' }}
                  className="absolute top-0 h-2 origin-left"
                  style={{
                    left: `${left}%`,
                    width: `calc(${width}% - 6px)`,
                    background:
                      i === 0
                        ? 'var(--color-brand)'
                        : i === 1
                          ? 'color-mix(in srgb, var(--color-brand) 62%, white)'
                          : 'color-mix(in srgb, var(--color-brand) 32%, white)',
                  }}
                />
              )
            })}
          </div>

          {/* Year ticks */}
          <div className="relative mt-2 h-4">
            {Array.from({ length: AXIS_END - AXIS_START + 1 }, (_, i) => AXIS_START + i).map(
              (year) => {
                const { left } = spanPercent(year, year)
                return (
                  <span
                    key={year}
                    className="absolute font-mono text-[10px] text-warm-300"
                    style={{ left: `${left}%` }}
                  >
                    {year}
                  </span>
                )
              },
            )}
          </div>

          {/* Phase detail cards aligned under their bars */}
          <div className="relative mt-8 h-44">
            {phases.map((phase, i) => {
              const { left, width } = spanPercent(phase.from, phase.to)
              return (
                <motion.div
                  key={phase.key}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, delay: 0.25 + i * 0.18 }}
                  className="absolute top-0 border-t-2 border-brand/30 pr-6 pt-4"
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-wider text-warm-600">
                    Phase {i + 1} · {phase.period}
                  </p>
                  <h3 className="mt-1.5 font-display text-xl font-bold text-warm-800">
                    {phase.key}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-warm-600">{phase.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {phase.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="border border-warm-300/60 px-2 py-0.5 font-mono text-[10px] text-warm-600"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile: vertical stack */}
      <ol className="mt-12 space-y-6 md:hidden">
        {phases.map((phase, i) => {
          const isCurrent = now.getFullYear() >= phase.from && now.getFullYear() <= phase.to
          return (
            <motion.li
              key={phase.key}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="border-l-2 border-brand/40 pl-5"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-warm-600">
                  Phase {i + 1} · {phase.period}
                </span>
                {isCurrent && (
                  <span className="bg-brand px-1.5 py-0.5 font-mono text-[10px] text-white">
                    NOW
                  </span>
                )}
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-warm-800">{phase.key}</h3>
              <p className="mt-1.5 text-sm text-warm-600">{phase.summary}</p>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}
