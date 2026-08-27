const pillars = [
  {
    title: '운영 혁신',
    description: '기술기반 운영체계 구축으로 물류 현장의 표준을 재정의합니다.',
  },
  {
    title: '서비스 차별화',
    description: '고객맞춤형 물류서비스로 차별화된 경험을 제공합니다.',
  },
  {
    title: '사업 경쟁력 강화',
    description: '기술 기반 사업경쟁력 확보로 지속가능한 성장을 만듭니다.',
  },
]

export default function TdlStrategy() {
  return (
    <section id="strategy" className="mx-auto max-w-7xl px-6 py-28">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
            TDL Strategy
          </p>
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Tech Driven Logistics
          </h2>
          <p className="mt-6 text-white/70">
            기술이 물류를 이끄는 것이 아니라, 기술이 물류 운영의 기본 구조가 되는 회사입니다.
          </p>
        </div>
        <ul className="space-y-3 text-white/80">
          <li>· 기술기반 운영체계 구축</li>
          <li>· 고객맞춤형 물류서비스 제공</li>
          <li>· 자동화와 로봇 기반의 생산성 혁신</li>
          <li>· 자율주행과 신기술 PoC를 통한 미래 물류 선도</li>
        </ul>
      </div>
      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="glass-panel rounded-xl p-6">
            <h3 className="text-lg font-semibold text-cyan-accent">{pillar.title}</h3>
            <p className="mt-3 text-sm text-white/70">{pillar.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
