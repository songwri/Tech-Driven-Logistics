import { motion } from 'framer-motion'
import BlueprintFrame from './BlueprintFrame'

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
    <section id="case-study" className="bg-cream py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">
            Case Study
          </p>
          <h2 className="text-3xl font-bold text-warm-800 md:text-4xl">기술 적용 사례 · 성과</h2>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {cases.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className="relative border border-warm-300/50 bg-white p-6"
            >
              <BlueprintFrame size={14} />
              <span className="font-mono text-xs uppercase tracking-wider text-brand">
                {item.metric}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-warm-800">{item.title}</h3>
              <p className="mt-3 text-sm text-warm-600">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
