import { ChevronLeft, ChevronRight, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OPEN_WEEKDAYS, TOURS, TOUR_BY_ID, toDateKey, type VisitRequest } from '@/lib/visit'
import { STATUS_TONE } from './statusTone'
import { StatusBadge } from './status'

interface AdminCalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  requests: VisitRequest[]
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  onOpen: (id: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MAX_CHIPS = 3

export function AdminCalendar({ month, onMonthChange, requests, selectedDate, onSelectDate, onOpen }: AdminCalendarProps) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const today = toDateKey(new Date())

  const byDate = new Map<string, VisitRequest[]>()
  for (const request of requests) {
    const list = byDate.get(request.date) ?? []
    list.push(request)
    byDate.set(request.date, list)
  }
  for (const list of byDate.values()) list.sort((a, b) => a.slot.localeCompare(b.slot))

  const shift = (delta: number) => onMonthChange(new Date(year, monthIndex + delta, 1))

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="border border-warm-300/50 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warm-300/40 px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="이전 달"
            className="flex h-8 w-8 items-center justify-center text-warm-600 transition hover:bg-cream hover:text-brand"
          >
            <ChevronLeft width={18} height={18} />
          </button>
          <h3 className="min-w-32 text-center text-lg font-bold text-warm-800">
            {year}년 {monthIndex + 1}월
          </h3>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="다음 달"
            className="flex h-8 w-8 items-center justify-center text-warm-600 transition hover:bg-cream hover:text-brand"
          >
            <ChevronRight width={18} height={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date()
              onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1))
            }}
            className="ml-2 border border-warm-300/60 px-2.5 py-1 font-mono text-[11px] text-warm-600 transition hover:border-brand hover:text-brand"
          >
            오늘
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-warm-600">
          {TOURS.map((tour) => (
            <span key={tour.id} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: tour.color }} aria-hidden />
              {tour.label}
            </span>
          ))}
          <span className="hidden h-3 w-px bg-warm-300/60 sm:block" />
          <StatusBadge status="pending" />
          <StatusBadge status="approved" />
          <StatusBadge status="rejected" />
          <span className="inline-flex items-center gap-1">
            <Globe width={11} height={11} /> 외국어 투어
          </span>
        </div>
      </div>

      <div className="sm:overflow-x-auto">
        <div className="grid grid-cols-7 sm:min-w-[720px]">
          {WEEKDAYS.map((name, index) => (
            <div
              key={name}
              className={cn(
                'border-b border-warm-300/40 py-1.5 text-center font-mono text-[11px] font-semibold',
                OPEN_WEEKDAYS.includes(index) ? 'text-warm-800' : 'text-warm-300',
              )}
            >
              {name}
              {OPEN_WEEKDAYS.includes(index) && <span className="ml-1 text-[10px] font-normal text-brand">운영</span>}
            </div>
          ))}
          {cells.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="min-h-14 border-b border-r border-warm-300/20 bg-cream/30 sm:min-h-28" />
            }
            const key = toDateKey(new Date(year, monthIndex, day))
            const weekday = index % 7
            const open = OPEN_WEEKDAYS.includes(weekday)
            const list = byDate.get(key) ?? []
            const pending = list.filter((request) => request.status === 'pending').length
            const selected = selectedDate === key
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDate(selected ? null : key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectDate(selected ? null : key)
                  }
                }}
                aria-pressed={selected}
                aria-label={`${monthIndex + 1}월 ${day}일 예약 ${list.length}건`}
                className={cn(
                  'group min-h-14 cursor-pointer border-b border-r border-warm-300/30 p-1 text-left transition sm:min-h-28 sm:p-1.5',
                  open ? 'bg-white hover:bg-cream/60' : 'bg-cream/50 hover:bg-cream',
                  selected && 'relative z-10 outline outline-2 -outline-offset-2 outline-brand',
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      'flex h-6 min-w-6 items-center justify-center px-1 text-[12px] font-semibold',
                      key === today ? 'rounded-full bg-brand text-white' : open ? 'text-warm-800' : 'text-warm-300',
                      weekday === 0 && key !== today && 'text-brand/70',
                    )}
                  >
                    {day}
                  </span>
                  {pending > 0 && (
                    <span className="hidden rounded-full sm:inline bg-[#fff4e6] px-1.5 font-mono text-[10px] font-bold text-[#c2410c]">
                      대기 {pending}
                    </span>
                  )}
                </div>
                {/* 모바일: 날짜 칸이 좁아 예약을 점으로만 표시 (투어 색 · 상태 모양) — 누르면 아래 목록에 그날 예약 */}
                {list.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                    {list.map((request) => (
                      <span
                        key={request.id}
                        className={cn(
                          'h-2 w-2 rounded-full',
                          request.status === 'rejected' && 'opacity-30',
                          request.status === 'pending' && 'ring-2 ring-[#f59f00] ring-offset-1',
                        )}
                        style={{ background: TOUR_BY_ID[request.tour].color }}
                      />
                    ))}
                  </div>
                )}
                <div className="hidden space-y-1 sm:block">
                  {list.slice(0, MAX_CHIPS).map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpen(request.id)
                      }}
                      title={`${TOUR_BY_ID[request.tour].label} · ${request.slot} · ${request.company}`}
                      className={cn(
                        'flex w-full items-center gap-1 overflow-hidden border border-l-[3px] px-1 py-0.5 text-left text-[11px] leading-tight transition hover:brightness-95',
                        STATUS_TONE[request.status].chip,
                      )}
                      style={{ borderLeftColor: TOUR_BY_ID[request.tour].color }}
                    >
                      <span className="shrink-0 font-mono text-[10px] opacity-80">{request.slot.slice(0, 5)}</span>
                      <span className="truncate font-medium">{request.company}</span>
                      {request.language === 'foreign' && (
                        <Globe width={10} height={10} className="ml-auto shrink-0" aria-label="외국어 투어" />
                      )}
                    </button>
                  ))}
                  {list.length > MAX_CHIPS && (
                    <p className="px-1 font-mono text-[10px] text-warm-600">+{list.length - MAX_CHIPS}건 더보기</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
