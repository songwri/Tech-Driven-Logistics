import { ArrowRight, CalendarCheck, PenLine } from 'lucide-react'
import { useLab } from '@/lib/labContext'

const MEDIA = `${import.meta.env.BASE_URL}media/tdl-lab-hero`
const POSTER = `${MEDIA}.jpg`

export default function LabGate() {
  const { entries, openReservation, openGuestbook } = useLab()

  const averageRating =
    entries.length > 0
      ? (entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length).toFixed(1)
      : null

  return (
    <section id="lab-gate" className="relative h-screen w-full overflow-hidden bg-[#0c0e11]">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        poster={POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        /* the footage is bright white — knock it back so type stays readable */
        style={{ filter: 'brightness(0.52) saturate(0.85) contrast(1.08)' }}
      >
        <source src={`${MEDIA}.webm`} type="video/webm" />
        <source src={`${MEDIA}.mp4`} type="video/mp4" />
      </video>

      {/* legibility scrims: heavy on the left where the type sits, clear on the right */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(8,10,13,0.94)_0%,rgba(8,10,13,0.86)_28%,rgba(8,10,13,0.55)_52%,rgba(8,10,13,0.28)_75%,rgba(8,10,13,0.35)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0c0e11]/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#0c0e11] to-transparent" />

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
          <div className="max-w-2xl [text-shadow:0_2px_24px_rgba(0,0,0,0.65)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-brand">
              TDL Lab · Offline Showroom
            </p>

            <h1 className="mt-6 font-display text-[2.2rem] font-bold leading-[1.12] text-white md:text-[3.5rem]">
              <span className="block whitespace-nowrap">미래의 물류를</span>
              <span className="block whitespace-nowrap">
                <span className="text-brand">먼저 경험</span>하세요
              </span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/75">
              테크이노베이션팀이 검증한 물류 기술을 실제로 움직이는 상태로 만나는 공간,
              TDL Lab입니다.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openReservation}
                className="group inline-flex items-center justify-between gap-6 bg-brand px-7 py-4 text-left text-white shadow-lg shadow-black/30 transition hover:brightness-110"
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
                className="group inline-flex items-center justify-between gap-6 border border-white/25 bg-black/25 px-7 py-4 text-left text-white backdrop-blur-md transition hover:border-white/70 hover:bg-black/40"
              >
                <span className="flex items-center gap-3">
                  <PenLine width={20} height={20} strokeWidth={1.5} />
                  <span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                      Leave a Note
                    </span>
                    <span className="block text-[15px] font-semibold">방명록 남기기</span>
                  </span>
                </span>
                <ArrowRight width={16} height={16} className="transition group-hover:translate-x-1" />
              </button>
            </div>

            {averageRating && (
              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                방문자 평가 <span className="text-brand">{averageRating}</span> / 5.0 ·{' '}
                {entries.length}건
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
        <span className="animate-pulse font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
          Scroll ↓
        </span>
      </div>
    </section>
  )
}
