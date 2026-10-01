import { motion } from 'framer-motion'

const cases = [
  {
    title: '분류 자동화 적용',
    metric: '처리량 향상',
    description: '자동화 설비 도입으로 물류센터 분류 처리량을 개선했습니다.',
  },
  {
    title: 'AMR 기반 운반 무인화',
    metric: '동선 최적화',
    description: 'AMR 도입으로 반복 운반 작업을 무인화하고 동선을 최적화했습니다.',
  },
  {
    title: '신기술 PoC 실증',
    metric: '빠른 의사결정',
    description: '단기 PoC로 기술 적용 가능성을 검증하고 실패 비용을 최소화했습니다.',
  },
]

export default function CaseStudy() {
  return (
    <section id="case-study" className="bg-white py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">Case Study</p>
          <h2 className="text-3xl font-bold leading-tight text-ink md:text-[2.75rem]">기술 적용 사례 · 성과</h2>
        </motion.div>

        {/* 카드 대신 한 줄씩 넓게 읽히는 목록: 성과 키워드를 크게, 사례 · 설명을 옆에 */}
        <ol className="mt-14 border-t border-ink">
          {cases.map((item, i) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
              className="group grid gap-3 border-b border-warm-300/60 py-8 transition-colors hover:bg-cream/60 md:grid-cols-[56px_minmax(0,1.1fr)_minmax(0,1fr)] md:items-baseline md:gap-8 md:px-4"
            >
              <span className="font-mono text-[13px] tabular-nums text-warm-300">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-2xl font-bold tracking-tight text-ink transition-colors group-hover:text-brand md:text-[2rem]">
                  {item.metric}
                </p>
                <h3 className="mt-1 text-[15px] font-semibold text-warm-600">{item.title}</h3>
              </div>
              <p className="max-w-md text-[15px] leading-relaxed text-warm-600">{item.description}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
