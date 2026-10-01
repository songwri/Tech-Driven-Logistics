import { useEffect, useRef, useState } from 'react'
import { StarRating } from '@/components/ui/StarRating'
import type { GuestbookEntry } from '@/lib/labApi'
import { formatRating } from '@/lib/rating'
import { cn } from '@/lib/utils'

const CARD = 272
const GAP = 16
/** 초당 이동 거리(px). 벨트 무늬(.conveyor-belt)와 같은 속도 */
const SPEED = 40
const LIMIT = 16

/** 송장 번호처럼 보이는 기록 번호: 작성 월일 + 순번 */
function trackingNo(entry: GuestbookEntry, index: number) {
  const date = new Date(entry.createdAt)
  const md = Number.isNaN(date.getTime())
    ? '0000'
    : `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  return `GB-${md}-${String(index + 1).padStart(2, '0')}`
}

function Parcel({ entry, index, fresh }: { entry: GuestbookEntry; index: number; fresh: boolean }) {
  const affiliation = [entry.company, entry.team].filter(Boolean).join(' ')
  return (
    <article
      className={cn(
        'relative flex h-full flex-col border bg-white px-4 pb-3.5 pt-3',
        fresh ? 'border-brand' : 'border-warm-300/70',
      )}
      style={{ width: CARD }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-warm-300/70 pb-2">
        <span className="font-mono text-[11px] tracking-wide text-warm-600">{trackingNo(entry, index)}</span>
        <span className="flex items-center gap-1.5">
          <StarRating value={entry.rating} size={11} />
          <span className="font-mono text-[11px] font-semibold tabular-nums text-ink">{formatRating(entry.rating)}</span>
        </span>
      </div>
      <p className="mt-2.5 line-clamp-3 flex-1 text-pretty text-[14px] leading-relaxed text-ink">{entry.message}</p>
      <p className="mt-3 truncate text-[12px] text-warm-600">
        <span className="font-semibold text-ink">{entry.name}</span>
        {entry.role && ` ${entry.role}`}
        {affiliation && ` · ${affiliation}`}
      </p>
      {fresh && (
        <span className="absolute -top-2.5 left-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
          방금 도착
        </span>
      )}
    </article>
  )
}

/** 요소의 가로 폭 (화면 크기가 바뀌면 따라간다) */
function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(1200)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([item]) => setWidth(item.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/**
 * 최근 방명록이 컨베이어 위 소포처럼 흘러가는 띠. 남겨진 기록 수만큼만 흐르고, 한 건이면 한 장만 지나간다.
 * 기록이 화면 폭보다 적으면 빈 벨트가 이어진다. 마우스를 올리거나 포커스하면 멈춘다.
 * 움직임 줄이기 설정이면 멈춘 채 가로로 스크롤한다. 전체 기록은 아래 목록에서 읽는다.
 */
export function EntryConveyor({ entries, highlightId }: { entries: GuestbookEntry[]; highlightId: string | null }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const viewport = useWidth(frameRef)
  const recent = entries.slice(0, LIMIT)
  if (recent.length === 0) return null

  // 한 바퀴의 길이: 카드가 모두 지나가고 화면이 비워질 만큼. 같은 줄 두 벌을 이어 붙여 끊김 없이 반복한다.
  const lane = Math.max(recent.length * (CARD + GAP), viewport + CARD)
  const duration = lane / SPEED

  return (
    <section aria-label="최근 방명록" className="conveyor relative">
      <div
        ref={frameRef}
        className="overflow-hidden motion-reduce:overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      >
        <ul
          // 새 기록이 도착하면 처음부터 다시 흘려 맨 앞에서 보이게 한다.
          key={highlightId ?? 'flow'}
          className="conveyor-track flex w-max px-2 pb-3 pt-4"
          style={{ ['--conveyor-duration' as string]: `${duration}s` }}
        >
          {[0, 1].map((copy) => (
            <li key={copy} aria-hidden={copy === 1 || undefined} className="shrink-0" style={{ width: lane }}>
              <ul className="flex gap-4">
                {recent.map((entry, index) => (
                  <li key={entry.id} className="shrink-0">
                    <Parcel entry={entry} index={index} fresh={entry.id === highlightId} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      {/* 벨트 */}
      <div className="conveyor-belt h-2.5 border-y border-warm-800/40 bg-[#efebe8]" aria-hidden />
      <div className="flex justify-between px-[3%]" aria-hidden>
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} className="h-2 w-px bg-warm-800/30" />
        ))}
      </div>
    </section>
  )
}
