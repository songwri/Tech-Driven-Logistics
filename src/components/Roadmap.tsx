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
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
        Roadmap
      </p>
      <h2 className="text-3xl font-bold text-white md:text-4xl">실행 우선순위</h2>

      <ol className="mt-12 grid gap-4 md:grid-cols-5">
        {phases.map((phase) => (
          <li key={phase.step} className="glass-panel rounded-xl p-5">
            <span className="text-xs font-semibold text-cyan-accent">{phase.step}</span>
            <h3 className="mt-2 text-base font-semibold text-white">{phase.title}</h3>
            <p className="mt-2 text-xs text-white/60">{phase.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
