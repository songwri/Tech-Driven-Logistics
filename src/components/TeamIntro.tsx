const points = [
  '자동화 설비 검토 및 적용',
  '물류로봇 도입 및 운영 최적화',
  '자율주행 기술 검증',
  '신기술 PoC 설계 및 사업화 검토',
  '현장 적용 가능한 기술만 선별하여 실증',
]

export default function TeamIntro() {
  return (
    <section id="team" className="bg-navy-900/50 py-28">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
          Tech Innovation Team
        </p>
        <h2 className="text-3xl font-bold text-white md:text-4xl">
          우리는 기술을 검토하는 팀이 아니라,
          <br />
          기술을 현장에 구현하는 팀입니다
        </h2>
        <ul className="mx-auto mt-10 grid max-w-3xl gap-4 text-left text-white/75 md:grid-cols-2">
          {points.map((point) => (
            <li key={point} className="glass-panel rounded-lg px-4 py-3 text-sm">
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
