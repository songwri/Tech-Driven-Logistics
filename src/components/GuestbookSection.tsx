import { motion } from 'framer-motion'
import { useLab } from '@/lib/labContext'
import { GuestbookWall } from './ui/GuestbookColumns'
import { Button } from './ui/Button'

export default function GuestbookSection() {
  const { entries, loading, error, openGuestbook } = useLab()

  return (
    <section id="guestbook" className="border-t border-warm-300/30 bg-cream py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-wrap items-end justify-between gap-6"
        >
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">Guestbook</p>
            <h2 className="text-3xl font-bold text-warm-800 md:text-4xl">방문자들이 남긴 기록</h2>
            <p className="mt-3 text-sm text-warm-600">
              방문자 보호를 위해 이름과 소속은 일부만 표시됩니다.
            </p>
          </div>
          <Button variant="outline" onClick={openGuestbook}>
            방명록 남기기
          </Button>
        </motion.div>

        <div className="mt-12">
          {loading ? (
            <p className="py-12 text-center font-mono text-xs uppercase tracking-wider text-warm-300">
              Loading…
            </p>
          ) : error ? (
            <p className="border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-brand">{error}</p>
          ) : (
            <GuestbookWall entries={entries} />
          )}
        </div>
      </div>
    </section>
  )
}
