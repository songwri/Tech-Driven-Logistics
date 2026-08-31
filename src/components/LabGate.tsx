import { CalendarCheck, PenLine } from 'lucide-react'
import { useLab } from '@/lib/labContext'
import BlueprintFrame from './BlueprintFrame'

const actions = [
  {
    id: 'reservation' as const,
    index: '01',
    icon: CalendarCheck,
    label: '쇼룸 방문 예약',
    english: 'Book a Visit',
    description: '자동화·로봇·자율주행 기술을 현장에서 직접 확인하세요.',
  },
  {
    id: 'guestbook' as const,
    index: '02',
    icon: PenLine,
    label: '방명록 남기기',
    english: 'Leave a Note',
    description: '다녀가신 소감을 남겨주세요. 다음 방문자에게 전달됩니다.',
  },
]

export default function LabGate() {
  const { entries, openReservation, openGuestbook } = useLab()

  const averageRating =
    entries.length > 0
      ? (entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length).toFixed(1)
      : null

  return (
    <section id="lab-gate" className="relative flex min-h-screen items-center bg-white pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(167,43,43,0.06),transparent_50%)]" />

      <div className="mx-auto w-full max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand">
          TDL Lab · Offline Showroom
        </p>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight text-warm-800 md:text-5xl">
          기술은 설명이 아니라
          <br />
          <span className="text-brand">현장에서 확인</span>하는 것입니다
        </h1>
        <p className="mt-5 max-w-xl text-warm-600">
          테크이노베이션팀이 운영하는 오프라인 쇼룸, TDL Lab에서 실제 동작하는 물류 기술을 만나보세요.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.id === 'reservation' ? openReservation : openGuestbook}
                className="group relative border border-warm-300/50 bg-white p-8 text-left transition hover:border-brand hover:bg-cream"
              >
                <BlueprintFrame />
                <span className="absolute right-4 top-4 font-mono text-[11px] text-warm-300">
                  {action.index}
                </span>

                <Icon className="text-brand" width={28} height={28} strokeWidth={1.5} />
                <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-brand">
                  {action.english}
                </p>
                <h2 className="mt-1.5 text-xl font-bold text-warm-800">{action.label}</h2>
                <p className="mt-2 text-sm text-warm-600">{action.description}</p>
                <span className="mt-5 inline-block font-mono text-xs text-warm-600 transition group-hover:text-brand">
                  바로가기 →
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-warm-600">
          {averageRating && (
            <span>
              방문자 평가 <span className="text-brand">{averageRating}</span> / 5.0 · {entries.length}건
            </span>
          )}
          <span className="text-warm-300">Scroll — 팀과 TDL Lab 소개 보기 ↓</span>
        </div>
      </div>
    </section>
  )
}
