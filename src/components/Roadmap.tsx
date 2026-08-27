import { motion } from 'framer-motion'

const phases = [
  { step: '1단계', title: '전략 · 구조 확정', description: 'TDL 메시지 정리, 기술 카테고리 및 대표 기술 선정' },
  { step: '2단계', title: '콘텐츠 수집', description: '영상 · GIF 확보, 기술 설명 작성, 사례 및 성과 정리' },
  { step: '3단계', title: 'UX/UI 설계', description: '인터랙티브 맵, 상세 페이지 템플릿, 오버레이 UI 설계' },
  { step: '4단계', title: '제작', description: '프론트엔드 구현, 영상 연동, 반응형 검수' },
  { step: '5단계', title: '런칭 후 고도화', description: '신규 PoC 추가, 사례 업데이트, 대시보드형 성과 연동' },
]

export default function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto max-w-7xl px-6 py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">Roadmap</p>
        <h2 className="text-3xl font-bold text-warm-800 md:text-4xl">실행 우선순위</h2>
      </motion.div>

      {/* Desktop: a circuit trace connecting each step */}
      <div className="relative mt-16 hidden md:block">
        <div className="absolute top-[7px] h-0.5 bg-warm-300/60" style={{ left: '10%', right: '10%' }} />
        <motion.div
          className="absolute top-[7px] h-0.5 origin-left bg-brand"
          style={{ left: '10%', right: '10%' }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
        <div className="grid grid-cols-5">
          {phases.map((phase, i) => (
            <div key={phase.step} className="px-3 text-left">
              <motion.span
                className="mx-auto flex h-[15px] w-[15px] items-center justify-center border-2 border-brand bg-white"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 320, damping: 18 }}
              />
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
                className="mt-4"
              >
                <span className="font-mono text-xs text-brand">{phase.step}</span>
                <h3 className="mt-1 text-sm font-semibold text-warm-800">{phase.title}</h3>
                <p className="mt-1.5 text-xs text-warm-600">{phase.description}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical trace */}
      <ol className="relative mt-12 space-y-8 border-l-2 border-warm-300/60 pl-6 md:hidden">
        {phases.map((phase, i) => (
          <motion.li
            key={phase.step}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="relative"
          >
            <span className="absolute -left-[29px] top-0.5 h-[14px] w-[14px] border-2 border-brand bg-white" />
            <span className="font-mono text-xs text-brand">{phase.step}</span>
            <h3 className="mt-1 text-sm font-semibold text-warm-800">{phase.title}</h3>
            <p className="mt-1.5 text-xs text-warm-600">{phase.description}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}
