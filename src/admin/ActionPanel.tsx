import { ArrowRight, Check, CircleAlert, Inbox, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatDateShort,
  formatSlot,
  headcountLabel,
  parseDateKey,
  type VisitRequest,
  type VisitStatus,
} from '@/lib/visit'
import { TourTag } from './status'

const DAY = 24 * 60 * 60 * 1000

/** 오늘 기준 남은 날짜: D-3, D-DAY, 지난 날은 +2 처럼 */
function dayLabel(date: string, today: string) {
  const diff = Math.round((parseDateKey(date).getTime() - parseDateKey(today).getTime()) / DAY)
  if (diff === 0) return 'D-DAY'
  return diff > 0 ? `D-${diff}` : `+${-diff}일`
}

function PendingRow({
  request,
  today,
  overdue,
  busy,
  onOpen,
  onSetStatus,
}: {
  request: VisitRequest
  today: string
  overdue?: boolean
  busy: boolean
  onOpen: (id: string) => void
  onSetStatus: (id: string, status: VisitStatus) => void
}) {
  const soon = !overdue && request.date <= today
  return (
    <li className="group grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-cream/60 md:grid-cols-[64px_150px_minmax(0,1fr)_auto]">
      <span
        className={cn(
          'font-mono text-[12px] font-semibold tabular-nums',
          overdue ? 'text-warm-300' : soon ? 'text-brand' : 'text-warm-800',
        )}
      >
        {dayLabel(request.date, today)}
      </span>
      <span className="hidden font-mono text-[12px] tabular-nums text-warm-600 md:block">
        {formatDateShort(request.date)}
        <span className="block text-warm-300">{formatSlot(request.slot)}</span>
      </span>
      <button type="button" onClick={() => onOpen(request.id)} className="min-w-0 text-left">
        <span className="block truncate text-sm font-semibold text-warm-800 group-hover:text-brand">
          {request.company || '(업체명 없음)'}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-warm-600">
          <TourTag tour={request.tour} className="text-[12px] font-normal" />
          <span>·</span>
          <span>
            {request.host.name} {request.host.title}
          </span>
          <span>·</span>
          <span className="tabular-nums">{headcountLabel(request)}</span>
          <span className="font-mono tabular-nums md:hidden">· {formatDateShort(request.date)}</span>
        </span>
      </button>
      <span className="flex items-center gap-1.5">
        {overdue ? (
          <button
            type="button"
            onClick={() => onOpen(request.id)}
            className="border border-warm-300/70 px-2.5 py-1.5 text-[12px] font-semibold text-warm-600 transition hover:border-warm-800 hover:text-warm-800"
          >
            정리하기
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetStatus(request.id, 'approved')}
              className="inline-flex items-center gap-1 border border-[#2f9e44] bg-[#2f9e44] px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 active:translate-y-px disabled:opacity-50"
            >
              <Check width={13} height={13} strokeWidth={3} /> 승인
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetStatus(request.id, 'rejected')}
              className="inline-flex items-center gap-1 border border-warm-300/70 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-warm-600 transition hover:border-brand hover:text-brand active:translate-y-px disabled:opacity-50"
            >
              <X width={13} height={13} strokeWidth={3} /> 거절
            </button>
          </>
        )}
      </span>
    </li>
  )
}

/**
 * 대시보드 맨 위 '처리 필요' 목록.
 * 방문일이 남은 승인 대기는 가까운 날짜순으로 바로 승인 · 거절하고,
 * 방문일이 지났는데 대기로 남은 건은 따로 모아 정리(완료 · 취소)하도록 안내한다.
 */
export function ActionPanel({
  requests,
  today,
  busyId,
  onOpen,
  onSetStatus,
  onShowAll,
}: {
  requests: VisitRequest[]
  today: string
  busyId: string | null
  onOpen: (id: string) => void
  onSetStatus: (id: string, status: VisitStatus) => void
  onShowAll: () => void
}) {
  const pending = requests
    .filter((request) => request.status === 'pending')
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
  const upcoming = pending.filter((request) => request.date >= today)
  const overdue = pending.filter((request) => request.date < today).reverse()
  const LIMIT = 6

  return (
    <section className="border border-warm-300/50 bg-white" aria-labelledby="action-title">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-300/40 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 id="action-title" className="text-base font-bold text-warm-800">
            처리 필요
          </h2>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-[#c2410c]">{upcoming.length}</span>
          <span className="text-[12px] text-warm-600">승인 대기 · 방문일 가까운 순</span>
        </div>
        {pending.length > 0 && (
          <button
            type="button"
            onClick={onShowAll}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-warm-600 transition hover:text-warm-800"
          >
            대기 전체 목록 <ArrowRight width={13} height={13} />
          </button>
        )}
      </header>

      {upcoming.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-6 text-sm text-warm-600">
          <Inbox width={20} height={20} strokeWidth={1.5} className="text-warm-300" />
          새로 들어온 승인 대기 요청이 없습니다.
        </div>
      ) : (
        <ul className="divide-y divide-warm-300/30">
          {upcoming.slice(0, LIMIT).map((request) => (
            <PendingRow
              key={request.id}
              request={request}
              today={today}
              busy={busyId === request.id}
              onOpen={onOpen}
              onSetStatus={onSetStatus}
            />
          ))}
          {upcoming.length > LIMIT && (
            <li className="px-4 py-2.5 text-[12px] text-warm-600">
              외 {upcoming.length - LIMIT}건은 아래 목록에서 확인하세요.
            </li>
          )}
        </ul>
      )}

      {overdue.length > 0 && (
        <div className="border-t border-warm-300/40 bg-cream/50">
          <p className="flex items-center gap-1.5 px-4 pt-3 text-[12px] font-semibold text-warm-800">
            <CircleAlert width={13} height={13} className="text-[#c2410c]" />
            방문일이 지났는데 승인 대기로 남은 요청 {overdue.length}건
            <span className="font-normal text-warm-600">· 완료 또는 취소로 정리해 주세요</span>
          </p>
          <ul className="divide-y divide-warm-300/30">
            {overdue.slice(0, 3).map((request) => (
              <PendingRow
                key={request.id}
                request={request}
                today={today}
                overdue
                busy={busyId === request.id}
                onOpen={onOpen}
                onSetStatus={onSetStatus}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** 대시보드 오른쪽: 다가오는 확정 방문 (방문 준비용) */
export function UpcomingPanel({
  requests,
  today,
  onOpen,
}: {
  requests: VisitRequest[]
  today: string
  onOpen: (id: string) => void
}) {
  const upcoming = requests
    .filter((request) => request.status === 'approved' && request.date >= today)
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
  return (
    <section className="border border-warm-300/50 bg-white" aria-labelledby="upcoming-title">
      <header className="flex items-baseline gap-2 border-b border-warm-300/40 px-4 py-3">
        <h2 id="upcoming-title" className="text-base font-bold text-warm-800">
          다가오는 확정 방문
        </h2>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-[#2b8a3e]">{upcoming.length}</span>
      </header>
      {upcoming.length === 0 ? (
        <p className="px-4 py-6 text-sm text-warm-600">예정된 확정 방문이 없습니다.</p>
      ) : (
        <ol className="max-h-[22rem] divide-y divide-warm-300/30 overflow-y-auto overscroll-contain" tabIndex={0} aria-label="다가오는 확정 방문 목록 (스크롤)">
          {upcoming.map((request) => (
            <li key={request.id}>
              <button
                type="button"
                onClick={() => onOpen(request.id)}
                className="grid w-full grid-cols-[56px_minmax(0,1fr)] gap-3 px-4 py-3 text-left transition hover:bg-cream/60"
              >
                <span className="font-mono text-[12px] font-semibold tabular-nums text-warm-800">
                  {dayLabel(request.date, today)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-warm-800">{request.company}</span>
                  <span className="block font-mono text-[12px] tabular-nums text-warm-600">
                    {formatDateShort(request.date)} {formatSlot(request.slot)} · {headcountLabel(request)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
