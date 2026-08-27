export default function ContactCta() {
  return (
    <section id="contact" className="mx-auto max-w-4xl px-6 py-28 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-accent">
        Contact / Collaboration
      </p>
      <h2 className="text-3xl font-bold text-white md:text-4xl">
        보여주는 기술이 아니라, 작동하는 기술
      </h2>
      <p className="mt-4 text-white/60">
        Tech Innovation Team과의 협업, 기술 도입 문의를 환영합니다.
      </p>
      <a
        href="mailto:tech-innovation@example.com"
        className="mt-8 inline-block rounded-full bg-cyan-accent px-8 py-3 font-semibold text-navy-950 transition hover:brightness-110"
      >
        협업 문의하기
      </a>
    </section>
  )
}
