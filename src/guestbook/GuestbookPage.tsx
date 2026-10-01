import { useEffect, useMemo, useRef, useState } from 'react'
import { PenLine } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import LabProvider from '@/components/LabProvider'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { useLab } from '@/lib/labContext'
import { RESERVE_URL } from '@/lib/routes'
import { EntryConveyor } from './EntryConveyor'
import { HeroScene } from './HeroScene'

const EASE = [0.32, 0.72, 0, 1] as const
/** 컨베이어에 올리는 기록: 별점 3점 이상만, 최근 10건 */
const MIN_RATING = 3
const SHOWN = 10

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

function ConveyorSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden px-2 pb-3 pt-4" aria-label="불러오는 중">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="h-[162px] w-[272px] shrink-0 animate-pulse border border-warm-300/50 bg-warm-300/20" aria-hidden />
      ))}
    </div>
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
  const ctaRef = useRef<HTMLDivElement>(null)
  const showSticky = useOffscreen(ctaRef)

  const shown = useMemo(
    () => entries.filter((entry) => entry.rating >= MIN_RATING).slice(0, SHOWN),
    [entries],
  )

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-warm-800">
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

      <main className="flex flex-1 flex-col justify-center">
        <section className="mx-auto max-w-6xl px-5 pt-8 md:px-6 md:pt-10">
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,480px)] md:gap-10">
            <div>
              <motion.h1 {...fade(0)} className="text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
                TDL Lab 방명록
              </motion.h1>
              <motion.p {...fade(0.06)} className="mt-3 max-w-md text-[15px] leading-relaxed text-warm-600">
                다녀가신 분들이 남긴 소감입니다. 이름, 회사명, 팀명은 일부만 보입니다.
              </motion.p>
              <motion.div {...fade(0.12)} ref={ctaRef} className="mt-6">
                <CtaButton onClick={openGuestbook} />
              </motion.div>
            </div>

            <motion.div {...fade(0.1)}>
              <HeroScene className="mx-auto w-full max-w-[480px]" />
            </motion.div>
          </div>
        </section>

        {/* 남겨진 기록이 컨베이어를 따라 흐른다 */}
        <div className="pb-20 pt-2 md:pb-16 md:pt-0">
          {loading ? (
            <ConveyorSkeleton />
          ) : error ? (
            <div className="mx-auto max-w-6xl px-5 md:px-6">
              <div className="border border-brand/40 bg-brand/5 px-5 py-6" role="alert">
                <p className="font-semibold text-ink">방명록을 불러오지 못했습니다</p>
                <p className="mt-1 text-sm text-warm-600">{error}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                  다시 불러오기
                </Button>
              </div>
            </div>
          ) : shown.length > 0 ? (
            <EntryConveyor entries={shown} highlightId={highlightId} />
          ) : (
            <div className="mx-auto max-w-6xl border-t border-warm-300/60 px-5 pt-10 text-center md:px-6">
              <p className="text-base font-bold text-ink">아직 소개할 방문 기록이 없습니다</p>
              <p className="mt-1.5 text-sm text-warm-600">TDL Lab을 다녀가셨다면 첫 방문 기록을 남겨 주세요.</p>
            </div>
          )}
        </div>
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
