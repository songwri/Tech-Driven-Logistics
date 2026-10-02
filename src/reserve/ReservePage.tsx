import { useEffect, useState } from 'react'
import { BookOpen, CalendarCheck, MailCheck, Send } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ReservationForm } from '@/components/visit/ReservationForm'
import { fetchSchedule, isLiveBackend, readCachedSchedule, type Schedule } from '@/lib/labApi'
import { GUESTBOOK_URL, RESERVE_URL } from '@/lib/routes'

const STEPS = [
  { icon: Send, title: '예약 신청', text: '투어 · 일정 · 방문자 정보를 입력합니다.' },
  { icon: CalendarCheck, title: '담당자 확인', text: '일정을 검토하고 승인 여부를 결정합니다.' },
  { icon: MailCheck, title: '확정 안내', text: '신청 담당자 이메일로 결과를 보내드립니다.' },
]

// 화면을 그리기 전에 바로 일정 요청을 시작한다 (모듈을 불러오는 순간).
const scheduleRequest: Promise<{ schedule: Schedule } | { error: true }> = fetchSchedule().then(
  (schedule) => ({ schedule }),
  () => ({ error: true }),
)

/**
 * 예약 신청 전용 페이지 (/reserve/).
 * 링크 · QR 로 바로 열어 쓰는 예약 신청 페이지.
 */
export default function ReservePage() {
  // 최근에 받아 둔 일정이 있으면 바로 쓰고, 없으면 받을 때까지 달력을 '확인 중'으로 막아
  // 가능한 것처럼 보였다가 나중에 막히는 일이 없게 한다.
  const [schedule, setSchedule] = useState<Schedule | null>(() => (isLiveBackend ? readCachedSchedule() : { busy: [], closedDays: [] }))
  const [loading, setLoading] = useState(() => isLiveBackend && schedule === null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void scheduleRequest.then((result) => {
      if (cancelled) return
      if ('schedule' in result) setSchedule(result.schedule)
      else setLoadError('예약 현황을 불러오지 못했습니다. 신청 시 서버에서 일정 중복을 다시 확인합니다.')
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen">
      <header className="border-b border-warm-300/40 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <a href={RESERVE_URL} aria-label="TDL 방문 예약">
            <Logo className="h-7" />
          </a>
          <a
            href={GUESTBOOK_URL}
            className="inline-flex items-center gap-1.5 text-[13px] text-warm-600 transition hover:text-brand"
          >
            <BookOpen width={14} height={14} /> 방명록 보기
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-6 pt-8 md:px-6 md:pt-12">
        <div className="mb-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brand">TDL Lab · Visit Reservation</p>
            <h1 className="mt-2 text-3xl font-bold text-warm-800 md:text-4xl">TDL 방문 예약</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-warm-600">
              <span className="block">물류센터와 TDL Lab에서 검증된 물류 기술을 직접 확인하세요.</span>
              <span className="block">
                방문은 <b className="text-warm-800">월 · 수 · 금</b>에 운영됩니다.
              </span>
            </p>
          </div>
          <ol className="grid grid-cols-3 gap-2 md:w-[420px]">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border border-warm-300/50 bg-white p-3">
                <step.icon width={18} height={18} className="text-brand" strokeWidth={1.75} />
                <p className="mt-2 text-[13px] font-bold text-warm-800">
                  <span className="mr-1 font-mono text-[11px] text-brand">{index + 1}</span>
                  {step.title}
                </p>
                <p className="mt-0.5 hidden text-[11px] leading-snug text-warm-600 sm:block">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

        {loadError && (
          <p className="mb-6 border border-warm-300/60 bg-cream px-3 py-2 text-[13px] text-warm-600">{loadError}</p>
        )}

        <div className="border border-warm-300/50 bg-white p-4 md:p-8">
          <ReservationForm busy={schedule?.busy ?? []} closedDays={schedule?.closedDays ?? []} scheduleLoading={loading} />
        </div>
      </main>

      <footer className="py-8 text-center font-mono text-[11px] text-warm-300">
        Tech Driven Logistics · Tech Innovation Team
      </footer>
    </div>
  )
}
