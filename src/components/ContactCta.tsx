import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { RESERVE_URL } from '@/lib/routes'

export default function ContactCta() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-6 py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="grid gap-10 border-y border-ink py-14 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-end"
      >
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">Contact / Collaboration</p>
          <h2 className="text-3xl font-bold leading-tight text-ink md:text-[2.75rem]">
            보여주는 기술이 아니라, 작동하는 기술
          </h2>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-warm-600">
            Tech Innovation Team과의 협업, 기술 도입 문의를 환영합니다.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <a
            href="mailto:PANTOSKR_403144@lxpantos.com"
            className="group inline-flex items-center justify-between gap-6 bg-ink px-7 py-4 text-white transition hover:bg-brand active:translate-y-px md:min-w-72"
          >
            <span className="text-[15px] font-semibold">협업 문의하기</span>
            <ArrowUpRight width={18} height={18} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <a
            href={RESERVE_URL}
            className="text-sm font-semibold text-warm-800 underline decoration-warm-300 underline-offset-4 transition hover:text-brand hover:decoration-brand"
          >
            TDL Lab 방문 예약하기 →
          </a>
        </div>
      </motion.div>
    </section>
  )
}
