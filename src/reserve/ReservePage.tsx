import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarCheck, MailCheck, Send } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ReservationForm } from '@/components/visit/ReservationForm'
import { fetchLab } from '@/lib/labApi'
import type { BusySegment } from '@/lib/visit'

const HOME_URL = import.meta.env.BASE_URL

const STEPS = [
  { icon: Send, title: '예약 신청', text: '투어 · 일정 · 방문자 정보를 입력합니다.' },
  { icon: CalendarCheck, title: '담당자 확인', text: '일정을 검토하고 승인 여부를 결정합니다.' },
  { icon: MailCheck, title: '확정 안내', text: '신청 담당자 이메일로 결과를 보내드립니다.' },
]

/**
 * 예약 신청 전용 페이지 (/reserve/).
 * 소개 사이트(3D · 영상)를 거치지 않고 바로 열리므로 링크 · QR 공유에 씁니다.
 */
export default function ReservePage() {
  const [busy, setBusy] = useState<BusySegment[]>([])
  const [closedDays, setClosedDays] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLab()
      .then((snapshot) => {
        if (cancelled) return
        setBusy(snapshot.busy)
        setClosedDays(snapshot.closedDays)
      })
      .catch(() => {
        if (!cancelled) setLoadError('예약 현황을 불러오지 못했습니다. 신청 시 서버에서 일정 중복을 다시 확인합니다.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen">
      <header className="border-b border-warm-300/40 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <a href={HOME_URL} aria-label="TDL 홈으로">
            <Logo className="h-7" />
          </a>
          <a
            href={HOME_URL}
            className="inline-flex items-center gap-1.5 text-[13px] text-warm-600 transition hover:text-brand"
          >
            <ArrowLeft width={14} height={14} /> TDL 소개 보기
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-6 pt-8 md:px-6 md:pt-12">
        <div className="mb-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brand">TDL Lab · Visit Reservation</p>
            <h1 className="mt-2 text-3xl font-bold text-warm-800 md:text-4xl">TDL 방문 예약</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-warm-600">
              물류센터와 TDL Lab에서 검증된 물류 기술을 직접 확인하세요. 방문은 <b className="text-warm-800">월 · 수 · 금</b>에
              운영됩니다.
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
          <ReservationForm variant="page" busy={busy} closedDays={closedDays} />
        </div>
      </main>

      <footer className="py-8 text-center font-mono text-[11px] text-warm-300">
        Tech Driven Logistics · Tech Innovation Team
      </footer>
    </div>
  )
}
