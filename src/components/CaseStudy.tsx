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
    <section id="case-study" className="bg-navy-900/50 py-28">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
          Case Study
        </p>
        <h2 className="text-3xl font-bold text-white md:text-4xl">기술 적용 사례 · 성과</h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cases.map((item) => (
            <div key={item.title} className="glass-panel rounded-xl p-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-lime-accent">
                {item.metric}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
