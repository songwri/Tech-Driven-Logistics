import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Globe, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { holidayName } from '@/lib/holidays'
import { blockTargetLabel, languageSummary, hasLanguageNote, OPEN_WEEKDAYS, TOURS, TOUR_BY_ID, formatSlot, isCounted, toDateKey, type TourBlock, type TourType, type VisitRequest } from '@/lib/visit'
import { STATUS_TONE } from './statusTone'
import { StatusBadge } from './status'

interface AdminCalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  requests: VisitRequest[]
  onOpen: (id: string) => void
  /** 막힌 일정 (센터 · Lab 담당자 사정) */
  blocks: TourBlock[]
  /** 일정 막기 창을 연다. 달력을 끌어 기간을 고르거나, 막힌 칩 · 버튼을 눌렀을 때. */
  onBlock: (start: string, end: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MAX_CHIPS = 3

const BLOCK_STRIPES = 'repeating-linear-gradient(135deg, rgba(0,0,0,0.05) 0 6px, transparent 6px 12px)'

const blockVisibleFor = (block: TourBlock, tour: TourType | null) =>
  tour === null ||
  block.resource === 'all' ||
  tour === 'combined' ||
  (tour !== 'other' && block.resource === tour)

export function AdminCalendar({
  month,
  onMonthChange,
  requests: allRequests,
  onOpen,
  blocks: allBlocks,
  onBlock,
}: AdminCalendarProps) {
  const [tourFilter, setTourFilter] = useState<TourType | null>(null)
  const requests = tourFilter ? allRequests.filter((request) => request.tour === tourFilter) : allRequests
  const blocks = allBlocks.filter((block) => blockVisibleFor(block, tourFilter))

  // 날짜 칸을 끌어서 기간 선택 → 일정 막기 창
  const [drag, setDrag] = useState<{ anchor: string; current: string } | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag
  const justDragged = useRef(false)
  const onBlockRef = useRef(onBlock)
  onBlockRef.current = onBlock
  useEffect(() => {
    const finish = () => {
      const state = dragRef.current
      if (!state) return
      setDrag(null)
      if (state.anchor !== state.current) {
        justDragged.current = true
        const [start, end] = [state.anchor, state.current].sort()
        onBlockRef.current(start, end)
      }
    }
    const cancel = () => setDrag(null)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [])
  const dragRange = drag ? [drag.anchor, drag.current].sort() : null

  const blocksByDate = new Map<string, TourBlock[]>()
  for (const block of blocks) {
    const list = blocksByDate.get(block.date) ?? []
    list.push(block)
    blocksByDate.set(block.date, list)
  }
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
          <button
            type="button"
            onClick={() => {
              const today = toDateKey(new Date())
              onBlock(today, today)
            }}
            title="날짜 칸을 누르면 그 날만, 끌면 기간으로 일정 막기 창이 열립니다"
            className="inline-flex items-center gap-1 border border-warm-800 bg-warm-800 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:brightness-125"
          >
            <Lock width={12} height={12} aria-hidden /> 일정 막기
          </button>
          {TOURS.map((tour) => {
            const active = tourFilter === tour.id
            return (
              <button
                key={tour.id}
                type="button"
                aria-pressed={active}
                title={active ? '필터 해제' : `${tour.label}만 보기`}
                onClick={() => setTourFilter(active ? null : tour.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 border px-2 py-1 transition',
                  active ? 'font-bold text-white' : 'border-warm-300/60 hover:border-warm-800 hover:text-warm-800',
                  tourFilter && !active && 'opacity-50',
                )}
                style={active ? { background: tour.color, borderColor: tour.color } : undefined}
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: tour.color, outline: active ? '1px solid #fff' : undefined }}
                  aria-hidden
                />
                {tour.label}
                {active ? '만' : ''}
              </button>
            )
          })}
          <span className="hidden h-3 w-px bg-warm-300/60 sm:block" />
          <StatusBadge status="pending" />
          <StatusBadge status="approved" />
          <StatusBadge status="completed" />
          <StatusBadge status="rejected" />
          <span className="inline-flex items-center gap-1">
            <Globe width={11} height={11} /> 외국어 · 통역
          </span>
        </div>
      </div>

      <div className="sm:overflow-x-auto">
        <div className="grid select-none grid-cols-7 sm:min-w-[720px]">
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
            const holiday = holidayName(key)
            const open = OPEN_WEEKDAYS.includes(weekday) && !holiday
            const list = byDate.get(key) ?? []
            const blockList = blocksByDate.get(key) ?? []
            const inDrag = dragRange !== null && key >= dragRange[0] && key <= dragRange[1]
            const pending = list.filter((request) => request.status === 'pending').length
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onPointerDown={(event) => {
                  if (event.button === 0 && event.pointerType === 'mouse') setDrag({ anchor: key, current: key })
                }}
                onPointerEnter={() => setDrag((current) => (current ? { ...current, current: key } : current))}
                onClick={() => {
                  if (justDragged.current) {
                    justDragged.current = false
                    return
                  }
                  onBlock(key, key)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onBlock(key, key)
                  }
                }}
                aria-label={`${monthIndex + 1}월 ${day}일 예약 ${list.length}건${blockList.length > 0 ? `, 막힌 일정 ${blockList.length}건` : ''}`}
                className={cn(
                  'group min-h-14 cursor-pointer border-b border-r border-warm-300/30 p-1 text-left transition sm:min-h-28 sm:p-1.5',
                  open ? 'bg-white hover:bg-cream/60' : 'bg-cream/50 hover:bg-cream',
                  inDrag && 'bg-brand/10 hover:bg-brand/10',
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      'flex h-6 min-w-6 items-center justify-center px-1 text-[12px] font-semibold',
                      key === today ? 'rounded-full bg-brand text-white' : open ? 'text-warm-800' : 'text-warm-300',
                      (weekday === 0 || holiday) && key !== today && 'text-brand/70',
                    )}
                  >
                    {day}
                  </span>
                  {holiday && (
                    <span className="ml-1 hidden min-w-0 flex-1 truncate text-[10px] font-medium text-brand/70 sm:inline" title={holiday}>
                      {holiday}
                    </span>
                  )}
                  {pending > 0 && (
                    <span className="hidden rounded-full sm:inline bg-[#fff4e6] px-1.5 font-mono text-[10px] font-bold text-[#c2410c]">
                      대기 {pending}
                    </span>
                  )}
                </div>
                {/* 모바일: 날짜 칸이 좁아 예약을 점으로만 표시 (투어 색 · 상태 모양) — 누르면 아래 목록에 그날 예약 */}
                {(list.length > 0 || blockList.length > 0) && (
                  <div className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                    {blockList.map((block) => (
                      <span key={block.id} className="h-2 w-2 rounded-sm bg-warm-600" />
                    ))}
                    {list.map((request) => (
                      <span
                        key={request.id}
                        className={cn(
                          'h-2 w-2 rounded-full',
                          !isCounted(request.status) && 'opacity-30',
                          request.status === 'pending' && 'ring-2 ring-[#f59f00] ring-offset-1',
                        )}
                        style={{ background: TOUR_BY_ID[request.tour].color }}
                      />
                    ))}
                  </div>
                )}
                <div className="hidden space-y-1 sm:block">
                  {blockList.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation()
                        onBlock(block.date, block.date)
                      }}
                      title={`${blockTargetLabel(block.resource)} 일정 막힘${block.slot ? ` · ${block.slot}` : ' · 종일'}${block.reason ? ` · ${block.reason}` : ''} (눌러서 해제)`}
                      className="flex w-full items-center gap-1 overflow-hidden border border-warm-600/40 bg-warm-300/30 px-1 py-0.5 text-left text-[11px] leading-tight text-warm-800 transition hover:brightness-95"
                      style={{ backgroundImage: BLOCK_STRIPES }}
                    >
                      <Lock width={10} height={10} className="shrink-0" aria-hidden />
                      <span className="truncate font-semibold">
                        {blockTargetLabel(block.resource)} 불가{block.slot ? ` ${block.slot.slice(0, 5)}~` : ''}
                      </span>
                    </button>
                  ))}
                  {list.slice(0, MAX_CHIPS).map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpen(request.id)
                      }}
                      title={`${TOUR_BY_ID[request.tour].label} · ${formatSlot(request.slot)} · ${request.company}`}
                      className={cn(
                        'flex w-full items-center gap-1 overflow-hidden border-2 border-l-[5px] px-1 py-0.5 text-left text-[11px] leading-tight transition hover:brightness-95',
                        STATUS_TONE[request.status].chip,
                      )}
                      style={{ borderColor: TOUR_BY_ID[request.tour].color }}
                    >
                      <span className="shrink-0 font-mono text-[10px] opacity-80">{request.slot ? request.slot.slice(0, 5) : '미정'}</span>
                      <span
                        className="shrink-0 rounded-sm px-1 text-[9px] font-bold leading-[14px] text-white"
                        style={{ background: TOUR_BY_ID[request.tour].color }}
                      >
                        {TOUR_BY_ID[request.tour].short}
                      </span>
                      <span className="truncate font-medium">{request.company}</span>
                      {hasLanguageNote(request) && (
                        <Globe width={10} height={10} className="ml-auto shrink-0" aria-label={languageSummary(request)} />
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
