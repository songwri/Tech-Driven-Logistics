import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import LabProvider from '@/components/LabProvider'
import BlueprintFrame from '@/components/BlueprintFrame'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { StarRating } from '@/components/ui/StarRating'
import type { GuestbookEntry } from '@/lib/labApi'
import { useLab } from '@/lib/labContext'
import { RESERVE_URL } from '@/lib/routes'

const PAGE_SIZE = 12
const HERO_IMAGE = `${import.meta.env.BASE_URL}media/tdl-lab-hero.jpg`
const EASE = [0.16, 1, 0.3, 1] as const

function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

/** 이름 · 직함 · 소속 · 날짜 (이름과 소속은 서버에서 이미 가려진 값) */
function Attribution({ entry, large }: { entry: GuestbookEntry; large?: boolean }) {
  return (
    <div className={large ? 'text-base' : 'text-sm'}>
      <p className="text-ink">
        <span className="font-semibold">{entry.name}</span>
        {entry.role && <span className="ml-2 text-warm-600">{entry.role}</span>}
      </p>
      <p className="mt-0.5 text-[13px] tabular-nums text-warm-600">
        {entry.company && `${entry.company} · `}
        {formatDate(entry.createdAt)}
      </p>
    </div>
  )
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-warm-300/30 ${className}`} aria-hidden />
}

function Summary({
  count,
  average,
  featured,
  loading,
}: {
  count: number
  average: number
  featured: GuestbookEntry | null
  loading: boolean
}) {
  return (
    <section aria-label="평가 요약" className="border-t border-ink">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-20 lg:py-20">
        <div>
          {loading ? (
            <>
              <Skeleton className="h-16 w-40" />
              <Skeleton className="mt-4 h-4 w-28" />
            </>
          ) : (
            <>
              <p className="font-display text-7xl font-semibold tabular-nums leading-none tracking-tight text-ink">
                {average.toFixed(1)}
                <span className="ml-2 text-2xl font-medium text-warm-600">/ 5</span>
              </p>
              <StarRating value={Math.round(average)} size={18} className="mt-4" />
              <p className="mt-3 text-sm text-warm-600">방명록 {count}건의 평균 평가</p>
            </>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-7 w-full max-w-3xl" />
            <Skeleton className="h-7 w-5/6 max-w-3xl" />
            <Skeleton className="mt-6 h-4 w-40" />
          </div>
        ) : (
          featured && (
            <figure>
              <blockquote className="max-w-4xl text-pretty text-xl font-medium leading-snug tracking-tight text-ink md:text-2xl md:leading-[1.4]">
                &ldquo;{featured.message}&rdquo;
              </blockquote>
              <figcaption className="mt-6">
                <Attribution entry={featured} large />
              </figcaption>
            </figure>
          )
        )}
      </div>
    </section>
  )
}

function EntryItem({ entry, index }: { entry: GuestbookEntry; index: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.04, ease: EASE }}
      className="break-inside-avoid border-t border-warm-300/60 py-6"
    >
      <StarRating value={entry.rating} size={14} />
      <p className="mt-3 text-pretty text-[17px] leading-relaxed text-ink">{entry.message}</p>
      <div className="mt-4">
        <Attribution entry={entry} />
      </div>
    </motion.li>
  )
}

function EntrySkeletons() {
  return (
    <ul className="columns-1 gap-x-12 md:columns-2 lg:columns-3" aria-label="불러오는 중">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="break-inside-avoid border-t border-warm-300/60 py-6">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-5 h-3.5 w-32" />
        </li>
      ))}
    </ul>
  )
}

function GuestbookView() {
  const { entries, loading, error, openGuestbook } = useLab()
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(PAGE_SIZE)

  const summary = useMemo(() => {
    if (entries.length === 0) return null
    const total = entries.reduce((sum, entry) => sum + entry.rating, 0)
    // 대표 기록: 가장 최근에 남겨진 4점 이상의 기록 (없으면 가장 최근 기록)
    const featured = entries.find((entry) => entry.rating >= 4) ?? entries[0]
    return { count: entries.length, average: total / entries.length, featured }
  }, [entries])

  const rest = useMemo(
    () => (summary ? entries.filter((entry) => entry.id !== summary.featured.id) : []),
    [entries, summary],
  )

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        }

  return (
    <div className="min-h-[100dvh] bg-white text-warm-800">
      <header className="border-b border-warm-300/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href={`${import.meta.env.BASE_URL}guestbook/`} aria-label="TDL Lab 방명록">
            <Logo className="h-7" />
          </a>
          <a href={RESERVE_URL} className="text-sm font-semibold text-warm-800 transition hover:text-brand">
            방문 예약
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-14 pt-10 md:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:pb-20 lg:pt-16">
          <div>
            <motion.h1
              {...fade(0)}
              className="text-balance text-4xl font-bold leading-[1.12] tracking-tight text-ink md:text-5xl lg:text-6xl"
            >
              TDL Lab을 다녀가신 분들의 기록
            </motion.h1>
            <motion.p {...fade(0.08)} className="mt-6 max-w-md text-[17px] leading-relaxed text-warm-600">
              방문 소감과 평가를 모았습니다. 이름과 소속은 일부만 보이도록 가려서 표시합니다.
            </motion.p>
            <motion.div {...fade(0.16)} className="mt-9">
              <Button size="lg" onClick={openGuestbook} className="active:translate-y-px">
                방명록 남기기
              </Button>
            </motion.div>
          </div>

          <motion.div {...fade(0.12)} className="relative lg:justify-self-end">
            <div className="relative aspect-[5/6] max-h-[72dvh] w-full overflow-hidden bg-warm-800 lg:aspect-[4/5]">
              <img
                src={HERO_IMAGE}
                alt="물류 창고에서 상자를 옮기는 TDL Lab의 휴머노이드 로봇"
                className="h-full w-full object-cover"
                fetchPriority="high"
              />
            </div>
            <div className="pointer-events-none absolute -inset-2.5">
              <BlueprintFrame size={18} />
            </div>
          </motion.div>
        </section>

        {/* 기록이 없거나 불러오지 못했을 때는 평점 요약을 보여주지 않는다 (0.0점이 실제 평가로 읽히지 않게). */}
        {(loading || summary) && (
          <Summary
            count={summary?.count ?? 0}
            average={summary?.average ?? 0}
            featured={summary?.featured ?? null}
            loading={loading}
          />
        )}

        <section aria-label="방명록 전체 기록" className="mx-auto max-w-7xl px-6 pb-24">
          {!loading && !error && summary && (
            <div className="flex items-baseline justify-between gap-4 border-t border-warm-300/60 pt-10">
              <h2 className="text-2xl font-bold tracking-tight text-ink">전체 기록</h2>
              <p className="text-sm tabular-nums text-warm-600">{entries.length}건</p>
            </div>
          )}

          {loading ? (
            <div className="pt-10">
              <EntrySkeletons />
            </div>
          ) : error ? (
            <div className="mt-10 border border-brand/40 bg-brand/5 px-5 py-6" role="alert">
              <p className="font-semibold text-ink">방명록을 불러오지 못했습니다</p>
              <p className="mt-1 text-sm text-warm-600">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                다시 불러오기
              </Button>
            </div>
          ) : !summary ? (
            <div className="mt-10 border-t border-warm-300/60 pt-14 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-ink">아직 남겨진 기록이 없습니다</h2>
              <p className="mx-auto mt-3 max-w-sm text-warm-600">
                TDL Lab을 다녀가셨다면 첫 방문 기록을 남겨주세요.
              </p>
              <Button size="lg" className="mt-8" onClick={openGuestbook}>
                방명록 남기기
              </Button>
            </div>
          ) : (
            <>
              {rest.length > 0 && (
                <ul className="mt-6 columns-1 gap-x-12 md:columns-2 lg:columns-3">
                  {rest.slice(0, visible).map((entry, index) => (
                    <EntryItem key={entry.id} entry={entry} index={index} />
                  ))}
                </ul>
              )}
              {rest.length > visible && (
                <div className="mt-6 border-t border-warm-300/60 pt-8 text-center">
                  <button
                    type="button"
                    onClick={() => setVisible((current) => current + PAGE_SIZE)}
                    className="text-sm font-semibold text-warm-800 underline decoration-warm-300 underline-offset-4 transition hover:text-brand hover:decoration-brand"
                  >
                    기록 더 보기 ({rest.length - visible}건 남음)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-warm-300/50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <Logo className="h-7" />
          <p className="text-[13px] text-warm-600">Tech Driven Logistics · Tech Innovation Team</p>
        </div>
      </footer>
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
