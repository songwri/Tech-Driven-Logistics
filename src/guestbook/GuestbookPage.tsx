import { useEffect, useMemo, useRef, useState } from 'react'
import { PenLine } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import LabProvider from '@/components/LabProvider'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { StarRating } from '@/components/ui/StarRating'
import type { GuestbookEntry } from '@/lib/labApi'
import { useLab } from '@/lib/labContext'
import { formatRating } from '@/lib/rating'
import { RESERVE_URL } from '@/lib/routes'
import { EntryConveyor } from './EntryConveyor'
import { HeroScene } from './HeroScene'

const PAGE_SIZE = 12
const EASE = [0.32, 0.72, 0, 1] as const

type Sort = 'recent' | 'rating'

function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

/** 이름 · 직책 / 회사 · 팀 · 날짜 (이름과 회사는 서버에서 이미 가려진 값) */
function Attribution({ entry }: { entry: GuestbookEntry }) {
  const affiliation = [entry.company, entry.team].filter(Boolean).join(' ')
  return (
    <div className="text-sm">
      <p className="text-ink">
        <span className="font-semibold">{entry.name}</span>
        {entry.role && <span className="ml-2 text-warm-600">{entry.role}</span>}
      </p>
      <p className="mt-0.5 text-[13px] tabular-nums text-warm-600">
        {affiliation && `${affiliation} · `}
        {formatDate(entry.createdAt)}
      </p>
    </div>
  )
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-warm-300/30 ${className}`} aria-hidden />
}

/** 점수 분포: 1점 단위로 묶어 5점부터 보여준다. 트랙 없이 막대만 둔다. */
function Histogram({ entries }: { entries: GuestbookEntry[] }) {
  const buckets = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: entries.filter((entry) => Math.ceil(entry.rating) === score).length,
  }))
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count))
  return (
    <ul className="w-40 space-y-1" aria-label="점수 분포">
      {buckets.map((bucket) => (
        <li key={bucket.score} className="flex items-center gap-2 text-[12px] tabular-nums text-warm-600">
          <span className="w-3 text-right">{bucket.score}</span>
          <span className="flex h-1.5 min-w-0 flex-1">
            <span className="h-full bg-brand/80" style={{ width: `${(bucket.count / max) * 100}%` }} />
          </span>
          <span className="w-5 text-right">{bucket.count}</span>
        </li>
      ))}
    </ul>
  )
}

function CtaButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-3 rounded-full bg-brand py-1.5 pl-6 pr-1.5 text-sm font-semibold text-white transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-110 active:scale-[0.98] ${className}`}
    >
      방명록 남기기
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-0.5">
        <PenLine width={15} height={15} strokeWidth={1.75} />
      </span>
    </button>
  )
}

function EntryItem({ entry, index, highlight }: { entry: GuestbookEntry; index: number; highlight: boolean }) {
  const reduce = useReducedMotion()
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.6, delay: (index % 6) * 0.04, ease: EASE }}
      className={`break-inside-avoid border-t py-5 transition-colors duration-700 ${
        highlight ? 'border-brand bg-brand/[0.04]' : 'border-warm-300/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <StarRating value={entry.rating} size={13} />
        <span className="text-[12px] font-semibold tabular-nums text-ink">{formatRating(entry.rating)}</span>
        {highlight && <span className="text-[12px] font-semibold text-brand">방금 남긴 기록</span>}
      </div>
      <p className="mt-2.5 text-pretty text-[15px] leading-relaxed text-ink">{entry.message}</p>
      <div className="mt-3">
        <Attribution entry={entry} />
      </div>
    </motion.li>
  )
}

function EntrySkeletons() {
  return (
    <ul className="columns-1 gap-x-10 md:columns-2 lg:columns-3" aria-label="불러오는 중">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="break-inside-avoid border-t border-warm-300/60 py-5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-4 h-3.5 w-32" />
        </li>
      ))}
    </ul>
  )
}

/** 요소가 화면에서 벗어났는지. 모바일 하단 고정 버튼을 언제 보일지 정한다. */
function useOffscreen(ref: React.RefObject<HTMLElement | null>) {
  const [offscreen, setOffscreen] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([item]) => setOffscreen(!item.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return offscreen
}

function GuestbookView() {
  const { entries, loading, error, openGuestbook, highlightId } = useLab()
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [sort, setSort] = useState<Sort>('recent')
  const ctaRef = useRef<HTMLDivElement>(null)
  const showSticky = useOffscreen(ctaRef)

  const summary = useMemo(() => {
    if (entries.length === 0) return null
    const total = entries.reduce((sum, entry) => sum + entry.rating, 0)
    return { count: entries.length, average: total / entries.length }
  }, [entries])

  const list = useMemo(() => {
    if (sort === 'recent') return entries
    return [...entries].sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt))
  }, [entries, sort])

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        }

  return (
    <div className="min-h-[100dvh] bg-white text-warm-800">
      <header className="border-b border-warm-300/40">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:px-6">
          <a href={`${import.meta.env.BASE_URL}guestbook/`} aria-label="TDL Lab 방명록">
            <Logo className="h-6" />
          </a>
          <a href={RESERVE_URL} className="text-sm font-semibold text-warm-800 transition hover:text-brand">
            방문 예약
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pt-8 md:px-6 md:pt-10">
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,480px)] md:gap-10">
            <div>
              <motion.h1 {...fade(0)} className="text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
                TDL Lab 방명록
              </motion.h1>
              <motion.p {...fade(0.06)} className="mt-3 max-w-md text-[15px] leading-relaxed text-warm-600">
                다녀가신 분들이 남긴 소감과 평가입니다. 이름과 회사명은 일부만 보입니다.
              </motion.p>
              <motion.div {...fade(0.12)} ref={ctaRef} className="mt-6">
                <CtaButton onClick={openGuestbook} />
              </motion.div>

              {!loading && summary && (
                <motion.div {...fade(0.18)} className="mt-8 flex items-center gap-6 border-t border-warm-300/60 pt-5">
                  <div>
                    <p className="font-display text-4xl font-semibold tabular-nums leading-none tracking-tight text-ink">
                      {summary.average.toFixed(1)}
                    </p>
                    <StarRating value={Math.round(summary.average * 2) / 2} size={13} className="mt-2" />
                    <p className="mt-1 text-[12px] tabular-nums text-warm-600">기록 {summary.count}건 평균</p>
                  </div>
                  <Histogram entries={entries} />
                </motion.div>
              )}
            </div>

            <motion.div {...fade(0.1)}>
              <HeroScene className="mx-auto w-full max-w-[480px]" />
            </motion.div>
          </div>
        </section>

        {/* 남겨진 기록이 컨베이어를 따라 흐른다 */}
        {!loading && !error && entries.length > 0 && (
          <div className="mt-2 md:mt-0">
            <EntryConveyor entries={entries} highlightId={highlightId} />
          </div>
        )}

        <section aria-label="방명록 기록" className="mx-auto max-w-6xl px-5 pb-28 pt-10 md:px-6 md:pb-20">
          {loading ? (
            <EntrySkeletons />
          ) : error ? (
            <div className="border border-brand/40 bg-brand/5 px-5 py-6" role="alert">
              <p className="font-semibold text-ink">방명록을 불러오지 못했습니다</p>
              <p className="mt-1 text-sm text-warm-600">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                다시 불러오기
              </Button>
            </div>
          ) : !summary ? (
            <div className="border-t border-warm-300/60 pt-12 text-center">
              <h2 className="text-xl font-bold tracking-tight text-ink">아직 남겨진 기록이 없습니다</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-warm-600">
                TDL Lab을 다녀가셨다면 첫 방문 기록을 남겨 주세요.
              </p>
            </div>
          ) : (
            <>

              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-bold text-ink">
                  전체 기록 <span className="ml-1 font-normal tabular-nums text-warm-600">{entries.length}</span>
                </h2>
                <div className="flex gap-1" role="group" aria-label="정렬">
                  {(
                    [
                      ['recent', '최신순'],
                      ['rating', '별점순'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={sort === value}
                      onClick={() => setSort(value)}
                      className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${
                        sort === value ? 'bg-ink text-white' : 'text-warm-600 hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {list.length > 0 && (
                <ul className="mt-3 columns-1 gap-x-10 md:columns-2 lg:columns-3">
                  {list.slice(0, visible).map((entry, index) => (
                    <EntryItem key={entry.id} entry={entry} index={index} highlight={entry.id === highlightId} />
                  ))}
                </ul>
              )}
              {list.length > visible && (
                <div className="mt-4 border-t border-warm-300/60 pt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setVisible((current) => current + PAGE_SIZE)}
                    className="text-sm font-semibold text-warm-800 underline decoration-warm-300 underline-offset-4 transition hover:text-brand hover:decoration-brand"
                  >
                    기록 더 보기 ({list.length - visible}건 남음)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-warm-300/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 md:px-6">
          <Logo className="h-6" />
          <p className="text-[13px] text-warm-600">Tech Driven Logistics · Tech Innovation Team</p>
        </div>
      </footer>

      {/* 모바일에서 머리말 버튼이 화면을 벗어나면 하단에 작성 버튼을 고정한다. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-warm-300/50 bg-white/95 px-5 py-3 backdrop-blur transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          showSticky ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
        inert={!showSticky}
      >
        <CtaButton onClick={openGuestbook} className="w-full justify-between" />
      </div>
    </div>
  )
}

/** 방명록 전용 페이지 (/guestbook/). 소개 사이트를 열지 않고 방문 기록만 보여주고 받는다. */
export default function GuestbookPage() {
  return (
    <LabProvider>
      <GuestbookView />
    </LabProvider>
  )
}
