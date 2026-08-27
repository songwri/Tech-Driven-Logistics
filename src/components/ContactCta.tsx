import { motion } from 'framer-motion'

export default function ContactCta() {
  return (
    <section id="contact" className="mx-auto max-w-4xl px-6 py-28 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-brand">
          Contact / Collaboration
        </p>
        <h2 className="text-3xl font-bold text-warm-800 md:text-4xl">
          보여주는 기술이 아니라, 작동하는 기술
        </h2>
        <p className="mt-4 text-warm-600">
          Tech Innovation Team과의 협업, 기술 도입 문의를 환영합니다.
        </p>
        <a
          href="mailto:tech-innovation@example.com"
          className="mt-8 inline-block rounded-full bg-brand px-8 py-3 font-semibold text-white transition hover:brightness-110"
        >
          협업 문의하기
        </a>
      </motion.div>
    </section>
  )
}
