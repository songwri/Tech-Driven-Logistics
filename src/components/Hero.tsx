export default function Hero() {
  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(34,211,238,0.18),transparent_50%)]" />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
            Tech Driven Logistics
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
            기술이 운영을 바꾸고,
            <br />
            <span className="text-gradient-accent">운영이 고객경험을</span> 바꿉니다
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            자동화, 로봇, 자율주행, PoC를 통해 물류의 미래를 설계합니다.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
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
        <div className="glass-panel relative aspect-video w-full rounded-2xl">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl">
            <div className="hotspot-pulse h-4 w-4 rounded-full bg-cyan-accent" />
            <p className="text-sm text-white/50">물류센터 · 로봇 · 자동화 설비 동작 영상</p>
            <p className="text-xs text-white/30">(콘텐츠 연동 예정 영역)</p>
          </div>
        </div>
      </div>
    </section>
  )
}
