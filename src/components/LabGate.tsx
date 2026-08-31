import { lazy, Suspense } from 'react'
import { ArrowRight, CalendarCheck, PenLine } from 'lucide-react'
import { useLab } from '@/lib/labContext'

const HeroLabScene = lazy(() => import('@/three/HeroLabScene'))

export default function LabGate() {
  const { entries, openReservation, openGuestbook } = useLab()

  const averageRating =
    entries.length > 0
      ? (entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length).toFixed(1)
      : null

  return (
    <section id="lab-gate" className="relative h-screen w-full overflow-hidden bg-[#0c0e11]">
      <Suspense fallback={null}>
        <HeroLabScene className="absolute inset-0" />
      </Suspense>

      {/* legibility scrims — kept off the right side so the handoff stays visible */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(12,14,17,0.92)_0%,rgba(12,14,17,0.62)_34%,rgba(12,14,17,0.05)_62%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0c0e11] to-transparent" />

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-brand">
              TDL Lab · Offline Showroom
            </p>

            <h1 className="mt-6 font-display text-[2.1rem] font-bold leading-[1.12] text-white md:text-[3.4rem]">
              <span className="block whitespace-nowrap">휴머노이드와 AMR이</span>
              <span className="block whitespace-nowrap">함께 일하는 현장을</span>
              <span className="block whitespace-nowrap">
                <span className="text-brand">직접 확인</span>하세요
              </span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/60">
              테크이노베이션팀이 검증한 물류 자동화·로봇·자율주행 기술이 실제로 움직이는
              공간, TDL Lab에서 만나보세요.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openReservation}
                className="group inline-flex items-center justify-between gap-6 bg-brand px-7 py-4 text-left text-white transition hover:brightness-110"
              >
                <span className="flex items-center gap-3">
                  <CalendarCheck width={20} height={20} strokeWidth={1.5} />
                  <span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">
                      Book a Visit
                    </span>
                    <span className="block text-[15px] font-semibold">쇼룸 방문 예약</span>
                  </span>
                </span>
                <ArrowRight width={16} height={16} className="transition group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={openGuestbook}
                className="group inline-flex items-center justify-between gap-6 border border-white/20 px-7 py-4 text-left text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/5"
              >
                <span className="flex items-center gap-3">
                  <PenLine width={20} height={20} strokeWidth={1.5} />
                  <span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                      Leave a Note
                    </span>
                    <span className="block text-[15px] font-semibold">방명록 남기기</span>
                  </span>
                </span>
                <ArrowRight width={16} height={16} className="transition group-hover:translate-x-1" />
              </button>
            </div>

            {averageRating && (
              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                방문자 평가 <span className="text-brand">{averageRating}</span> / 5.0 ·{' '}
                {entries.length}건
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
        <span className="animate-pulse font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
          Scroll ↓
        </span>
      </div>
    </section>
  )
}
