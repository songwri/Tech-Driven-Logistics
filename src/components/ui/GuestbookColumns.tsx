import { Fragment } from 'react'
import { motion } from 'framer-motion'
import type { GuestbookEntry } from '@/lib/labApi'
import { cn } from '@/lib/utils'
import { StarRating } from './StarRating'

function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

export function GuestbookCard({ entry, className }: { entry: GuestbookEntry; className?: string }) {
  return (
    <div className={cn('w-full max-w-xs border border-warm-300/50 bg-white p-6', className)}>
      <StarRating value={entry.rating} size={14} />
      <p className="mt-3 text-sm leading-relaxed text-warm-800">{entry.message}</p>
      <div className="mt-5 border-t border-warm-300/40 pt-3">
        <p className="text-sm font-semibold text-warm-800">
          {entry.name}
          <span className="ml-2 font-normal text-warm-600">{entry.role}</span>
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-warm-600">
          {entry.company} · {formatDate(entry.createdAt)}
        </p>
      </div>
    </div>
  )
}

/** One infinitely looping column of guestbook cards. */
export function GuestbookColumn({
  entries,
  duration = 15,
  className,
}: {
  entries: GuestbookEntry[]
  duration?: number
  className?: string
}) {
  return (
    <div className={className}>
      <motion.div
        animate={{ translateY: '-50%' }}
        transition={{ duration, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
        className="flex flex-col gap-6 pb-6"
      >
        {[0, 1].map((pass) => (
          <Fragment key={pass}>
            {entries.map((entry) => (
              <GuestbookCard key={`${pass}-${entry.id}`} entry={entry} />
            ))}
          </Fragment>
        ))}
      </motion.div>
    </div>
  )
}

/** Splits entries across up to three looping columns. Falls back to a plain
 *  grid while there are too few entries for the loop to read as motion. */
export function GuestbookWall({ entries }: { entries: GuestbookEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="border border-dashed border-warm-300/60 px-6 py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-warm-300">No entries yet</p>
        <p className="mt-3 text-sm text-warm-600">
          아직 남겨진 방명록이 없습니다. TDL Lab의 첫 방문 기록을 남겨주세요.
        </p>
      </div>
    )
  }

  if (entries.length < 6) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <GuestbookCard key={entry.id} entry={entry} className="max-w-none" />
        ))}
      </div>
    )
  }

  const size = Math.ceil(entries.length / 3)
  const columns = [entries.slice(0, size), entries.slice(size, size * 2), entries.slice(size * 2)]

  return (
    <div className="flex max-h-[640px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
      <GuestbookColumn entries={columns[0]} duration={18} />
      <GuestbookColumn entries={columns[1]} duration={23} className="hidden md:block" />
      <GuestbookColumn entries={columns[2]} duration={20} className="hidden lg:block" />
    </div>
  )
}
