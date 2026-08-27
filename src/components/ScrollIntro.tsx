import { useRef } from 'react'
import HeroBackground from '../three/HeroBackground'
import { useScrollProgress, clampMap } from '../hooks/useScrollProgress'

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

export default function ScrollIntro() {
  const containerRef = useRef<HTMLDivElement>(null)
  const progress = useScrollProgress(containerRef)

  const heroOpacity = clampMap(progress, [0, 0.32], [1, 0])
  const heroY = clampMap(progress, [0, 0.32], [0, -50])
  const heroScale = clampMap(progress, [0, 0.36], [1, 0.92])
  const heroInteractive = progress < 0.3

  const strategyOpacity = clampMap(progress, [0.28, 0.52], [0, 1])
  const strategyY = clampMap(progress, [0.28, 0.55], [60, 0])
  const strategyInteractive = progress > 0.3

  return (
    <div ref={containerRef} id="top" className="relative h-[230vh]">
      <div id="strategy" className="absolute left-0 top-[36%]" />

      <div className="sticky top-0 h-screen overflow-hidden">
        <HeroBackground progress={progress} className="absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(34,211,238,0.18),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy-950/30 via-transparent to-navy-950" />

        <div
          style={{
            opacity: heroOpacity,
            transform: `translateY(${heroY}px) scale(${heroScale})`,
            pointerEvents: heroInteractive ? 'auto' : 'none',
          }}
          className="absolute inset-0 flex items-center pt-16"
        >
          <div className="mx-auto max-w-3xl px-6 text-center md:text-left">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
              TDL · Tech Driven Logistics
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
              기술이 물류를 이끄는 것이 아니라,
              <br />
              <span className="text-gradient-accent">물류 운영의 기본 구조가</span> 됩니다
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/70 md:mx-0">
              자동화, 로봇, 자율주행, 신기술 PoC로 기술기반 운영체계를 구축하고
              고객맞춤형 물류서비스와 사업 경쟁력을 만듭니다.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4 md:justify-start">
              <a
                href="#strategy"
                className="rounded-full bg-cyan-accent px-6 py-3 font-semibold text-navy-950 transition hover:brightness-110"
              >
                TDL 전략 보기
              </a>
              <a
                href="#tech-map"
                className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:border-cyan-accent hover:text-cyan-accent"
              >
                기술 체험하기
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            opacity: strategyOpacity,
            transform: `translateY(${strategyY}px)`,
            pointerEvents: strategyInteractive ? 'auto' : 'none',
          }}
          className="absolute inset-0 flex items-center"
        >
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="grid gap-12 md:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
                  TDL Strategy
                </p>
                <h2 className="text-3xl font-bold text-white md:text-4xl">
                  전략이 현장의 구조가 되기까지
                </h2>
                <p className="mt-6 text-white/70">
                  TDL은 네 가지 축의 실행으로 &ldquo;기술이 물류 운영의 기본 구조가 되는&rdquo; 회사를 완성합니다.
                </p>
              </div>
              <ul className="space-y-3 text-white/80">
                <li>· 기술기반 운영체계 구축</li>
                <li>· 고객맞춤형 물류서비스 제공</li>
                <li>· 자동화와 로봇 기반의 생산성 혁신</li>
                <li>· 자율주행과 신기술 PoC를 통한 미래 물류 선도</li>
              </ul>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="glass-panel rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-cyan-accent">{pillar.title}</h3>
                  <p className="mt-3 text-sm text-white/70">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
