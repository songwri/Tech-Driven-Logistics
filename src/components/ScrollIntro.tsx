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

      <div className="sticky top-0 h-screen overflow-hidden bg-white">
        <HeroBackground progress={progress} className="absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(167,43,43,0.07),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(83,74,71,0.05),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white" />

        <div
          style={{
            opacity: heroOpacity,
            transform: `translateY(${heroY}px) scale(${heroScale})`,
            pointerEvents: heroInteractive ? 'auto' : 'none',
          }}
          className="absolute inset-0 flex items-center pt-16"
        >
          <div className="mx-auto max-w-3xl px-6 text-center md:text-left">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-brand">
              Tech Innovation Team
            </p>
            <h1 className="text-4xl font-bold leading-tight text-warm-800 md:text-6xl">
              <span className="text-brand">TDL,</span> Tech Driven Logistics
            </h1>
            <p className="mt-4 text-xl font-semibold leading-snug text-warm-800 md:text-2xl">
              고객맞춤형 물류 서비스를 제공하는 기술 기반 물류 운영 체계
            </p>
            <p className="mx-auto mt-6 max-w-xl text-lg text-warm-600 md:mx-0">
              자동화, 로봇, 자율주행, 신기술 PoC로 그 구조를 현장에 구현합니다.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4 md:justify-start">
              <a
                href="#strategy"
                className="rounded-full bg-brand px-6 py-3 font-semibold text-white transition hover:brightness-110"
              >
                TDL 전략 보기
              </a>
              <a
                href="#tech-map"
                className="rounded-full border border-warm-300 px-6 py-3 font-semibold text-warm-800 transition hover:border-brand hover:text-brand"
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
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-brand">
                  TDL Strategy
                </p>
                <h2 className="text-3xl font-bold text-warm-800 md:text-4xl">
                  전략이 현장의 구조가 되기까지
                </h2>
                <p className="mt-6 text-warm-600">
                  TDL은 네 가지 축의 실행으로 &ldquo;기술이 물류 운영의 기본 구조가 되는&rdquo; 회사를 완성합니다.
                </p>
              </div>
              <ul className="space-y-3 text-warm-800">
                <li>· 기술기반 운영체계 구축</li>
                <li>· 고객맞춤형 물류서비스 제공</li>
                <li>· 자동화와 로봇 기반의 생산성 혁신</li>
                <li>· 자율주행과 신기술 PoC를 통한 미래 물류 선도</li>
              </ul>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="glass-panel rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-brand">{pillar.title}</h3>
                  <p className="mt-3 text-sm text-warm-600">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
