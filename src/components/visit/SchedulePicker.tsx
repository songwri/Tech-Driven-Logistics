import { useMemo } from 'react'
import { CalendarDays, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isHoliday } from '@/lib/holidays'
import { Calendar } from '../ui/Calendar'
import { FieldLabel, GroupError } from './VisitFields'
import {
  MIN_LEAD_DAYS,
  MTV_LEAD_BUSINESS_DAYS,
  earliestDateFor,
  formatDateShort,
  includesMtv,
  BOOKABLE_TOURS,
  LEG_PLACE,
  TOUR_BY_ID,
  formatDateLong,
  formatSlot,
  isSlotBusy,
  parseDateKey,
  toDateKey,
  tourWeekdays,
  type BusySegment,
  type TourDefinition,
  type TourType,
} from '@/lib/visit'

const TOUR_GROUPS: { id: 'single' | 'multi'; label: string }[] = [
  { id: 'single', label: '한 곳만' },
  { id: 'multi', label: '여러 곳 함께' },
]

/** 투어 카드 아래 시간 안내: 복합 투어(오전 · 오후)는 순서를 고른다는 안내 */
function slotHint(item: TourDefinition) {
  const lead = includesMtv(item.id) ? ` · ${MTV_LEAD_BUSINESS_DAYS}영업일 전까지 신청` : ''
  if (item.legs) return `${item.duration} · 오전 · 오후 순서 선택${lead}`
  return `${item.duration} · ${item.slots.map((slot) => slot.slice(0, 5)).join(' / ')} 시작${lead}`
}

const halfLabel = (slot: string) => (Number(slot.slice(0, 2)) < 12 ? '오전' : '오후')

interface SchedulePickerProps {
  tour: TourType
  date: string
  slot: string
  busy: BusySegment[]
  closedDays: string[]
  onChange: (patch: { tour?: TourType; date?: string; slot?: string }) => void
  /** 오늘부터 며칠 뒤부터 고를 수 있는지. 신청 화면은 당일·익일 제외(2), 관리자 수정은 0 */
  leadDays?: number
  /** 제출 시도 후 문제가 있는 칸 (missingFields) */
  errors?: Set<string>
  /** 넓은 화면에서 투어 종류(왼쪽)와 달력 · 시간(오른쪽)을 나란히 놓는다. */
  wide?: boolean
  /** 신청 불가 일정을 받는 중: 달력 · 시간을 가리고 고를 수 없게 한다. */
  loading?: boolean
}

/** 좌측 패널: 투어 종류 → 달력 날짜 → 시간대 순으로 고릅니다. */
export function SchedulePicker({
  tour,
  date,
  slot,
  busy,
  closedDays,
  onChange,
  leadDays = MIN_LEAD_DAYS,
  errors,
  wide,
  loading,
}: SchedulePickerProps) {
  // 시화MTV 가 들어간 투어는 3영업일 전까지만 신청받아 고를 수 있는 첫날이 더 늦다.
  const earliest = useMemo(() => earliestDateFor(tour, leadDays), [tour, leadDays])
  const definition = TOUR_BY_ID[tour]

  // 선택한 투어의 모든 시간대가 막힌 날은 달력에서 고를 수 없게 한다.
  const fullyBookedDays = useMemo(() => {
    const days = new Set(busy.map((segment) => segment.date))
    return [...days]
      .filter((day) => definition.slots.every((candidate) => isSlotBusy(tour, day, candidate, busy)))
      .map(parseDateKey)
  }, [busy, definition, tour])

  const closed = useMemo(() => closedDays.map(parseDateKey), [closedDays])
  const closedWeekdays = useMemo(() => {
    const open = tourWeekdays(tour)
    return [0, 1, 2, 3, 4, 5, 6].filter((day) => !open.includes(day))
  }, [tour])
  const selectedDate = date ? parseDateKey(date) : undefined
  const busySlots = date ? definition.slots.filter((candidate) => isSlotBusy(tour, date, candidate, busy)) : []

  const chooseTour = (next: TourType) => {
    const keepSlot = TOUR_BY_ID[next].slots.includes(slot) && !isSlotBusy(next, date, slot, busy)
    // 새 투어가 열리지 않는 요일이면 날짜도 비운다 (센터마다 운영 요일이 다를 수 있다).
    const keepDate =
      !date ||
      (tourWeekdays(next).includes(parseDateKey(date).getDay()) && date >= toDateKey(earliestDateFor(next, leadDays)))
    onChange({ tour: next, date: keepDate ? date : '', slot: keepSlot && keepDate ? slot : '' })
  }

  return (
    <div className={cn('grid gap-5', wide && 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8')}>
      <div>
        <FieldLabel required>투어 종류</FieldLabel>
        <div className="mt-2 space-y-3" role="radiogroup" aria-label="투어 종류">
          {TOUR_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="mb-1.5 text-[12px] font-semibold text-warm-600">{group.label}</p>
              <div className="grid gap-2">
                {BOOKABLE_TOURS.filter((item) => item.group === group.id).map((item) => {
                  const active = item.id === tour
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => chooseTour(item.id)}
                      className={cn(
                        'flex items-center gap-3 border px-3.5 py-3 text-left transition',
                        active ? 'border-brand bg-brand/5' : 'border-warm-300/70 hover:border-brand/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                          active ? 'border-brand' : 'border-warm-300',
                        )}
                        aria-hidden
                      >
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-[15px] font-bold', active ? 'text-brand' : 'text-ink')}>
                          {item.label}
                        </span>
                        {/* 어디를 보는 투어인지: 투어 이름 바로 아래에 진하게 */}
                        <span className={cn('mt-0.5 block text-[13px] font-medium', active ? 'text-brand/90' : 'text-warm-800')}>
                          {item.description}
                        </span>
                        <span className="mt-0.5 block text-[12px] tabular-nums text-warm-600">{slotHint(item)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {tour === 'combined' && (
          <div className="mt-3 rounded border border-brand/40 bg-brand/5 p-2.5">
            <p className="text-[13px] font-medium text-brand">센터 투어는 센터담당자와 별도 협의</p>
          </div>
        )}
      </div>

      <div className="relative space-y-4" aria-busy={loading || undefined}>
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/85 text-center backdrop-blur-[1px]">
            <Loader2 width={22} height={22} className="animate-spin text-brand" aria-hidden />
            <p className="text-[13px] font-semibold text-warm-800">예약 가능한 일정을 확인하고 있습니다…</p>
            <p className="text-[12px] text-warm-600">이미 신청 · 확정된 일정과 겹치지 않는 날짜 · 시간만 보여드립니다.</p>
          </div>
        )}
        <div>
          <FieldLabel required>방문 날짜</FieldLabel>
          <div className={cn('mt-2 border p-3', errors?.has('date') ? 'border-brand/70' : 'border-warm-300/70')}>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(picked) => {
                const nextDate = picked ? toDateKey(picked) : ''
                const keepSlot = Boolean(slot) && Boolean(nextDate) && !isSlotBusy(tour, nextDate, slot, busy)
                onChange({ date: nextDate, slot: keepSlot ? slot : '' })
              }}
              startMonth={earliest}
              defaultMonth={selectedDate ?? earliest}
              disabled={[{ before: earliest }, { dayOfWeek: closedWeekdays }, isHoliday, ...closed, ...fullyBookedDays]}
            />
            <p className="mt-2 flex items-center gap-2 border-t border-warm-300/40 pt-2 text-[12px] text-warm-600">
              <CalendarDays width={14} height={14} />
              {date
                ? `${formatDateLong(date)} 선택됨`
                : leadDays > 0
                  ? includesMtv(tour)
                    ? `월 · 수 · 금 · 시화MTV 는 ${MTV_LEAD_BUSINESS_DAYS}영업일 전까지 신청 (${formatDateShort(toDateKey(earliest))}부터)`
                    : '월 · 수 · 금 · 당일 · 익일은 신청 불가'
                  : '월 · 수 · 금만 선택 가능'}
            </p>
          </div>
          <GroupError show={Boolean(errors?.has('date'))}>방문 날짜를 선택해 주세요.</GroupError>
        </div>

        <div>
          <FieldLabel required>{definition.legs ? '오전 · 오후 순서' : '방문 시간'}</FieldLabel>
          {definition.legs ? (
            <div className="mt-2 grid gap-2">
              {definition.slots.map((candidate) => {
                const legs = definition.legs?.[candidate] ?? []
                const taken = busySlots.includes(candidate)
                const active = slot === candidate
                return (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => onChange({ slot: candidate })}
                    disabled={!date || taken}
                    aria-pressed={active}
                    className={cn(
                      'grid gap-2 border px-3 py-2.5 text-left transition',
                      taken
                        ? 'cursor-not-allowed border-warm-300/40 bg-warm-300/10'
                        : active
                          ? 'border-brand bg-brand/5'
                          : errors?.has('slot') && date
                            ? 'border-brand/70 hover:bg-brand/5'
                            : 'border-warm-300/70 hover:border-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-warm-300/70',
                    )}
                  >
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className={cn('text-[14px] font-bold', active ? 'text-brand' : taken ? 'text-warm-300' : 'text-ink')}>
                        {LEG_PLACE[legs[0].tour].label} 먼저 → {LEG_PLACE[legs[legs.length - 1].tour].label}
                      </span>
                      {taken && <span className="text-[12px] font-semibold text-brand">이 날은 선택 불가</span>}
                    </span>
                    <span className="flex flex-wrap items-stretch gap-1.5">
                      {legs.map((leg, index) => {
                        const legTaken = Boolean(date) && isSlotBusy(leg.tour, date, leg.slot, busy)
                        return (
                          <span key={leg.slot + leg.tour} className="contents">
                            {index > 0 && <span className="self-center font-mono text-[11px] text-warm-600">→</span>}
                            <span
                              className={cn(
                                'min-w-0 flex-1 border-l-[3px] bg-cream/70 px-2 py-1',
                                legTaken && 'opacity-60',
                              )}
                              style={{ borderLeftColor: TOUR_BY_ID[leg.tour].color }}
                            >
                              <span className="block font-mono text-[12px] tabular-nums text-warm-600">
                                {halfLabel(leg.slot)} {formatSlot(leg.slot)}
                              </span>
                              <span className={cn('block text-[13px] font-semibold text-warm-800', legTaken && 'line-through')}>
                                {LEG_PLACE[leg.tour].label}
                              </span>
                              {legTaken && <span className="block text-[11px] font-semibold text-brand">이미 예약 있음</span>}
                            </span>
                          </span>
                        )
                      })}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {definition.slots.map((candidate) => {
                const taken = busySlots.includes(candidate)
                const active = slot === candidate
                return (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => onChange({ slot: candidate })}
                    disabled={!date || taken}
                    aria-pressed={active}
                    title={taken ? '이미 신청되었거나 확정된 일정과 겹치는 시간대입니다' : undefined}
                    className={cn(
                      'flex items-center justify-center gap-1.5 border px-2 py-2.5 font-mono text-[13px] tabular-nums transition',
                      taken
                        ? 'cursor-not-allowed border-warm-300/40 bg-warm-300/10 text-warm-300 line-through'
                        : active
                          ? 'border-brand bg-brand text-white'
                          : errors?.has('slot') && date
                            ? 'border-brand/70 text-warm-800 hover:bg-brand/5'
                            : 'border-warm-300/70 text-warm-800 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-warm-300/60 disabled:hover:text-warm-800',
                    )}
                  >
                    <Clock width={12} height={12} />
                    {formatSlot(candidate)}
                  </button>
                )
              })}
            </div>
          )}
          <GroupError show={Boolean(errors?.has('slot') && date)}>방문 시간을 선택해 주세요.</GroupError>
          <p className="mt-2 text-[12px] text-warm-600">
            {!date
              ? '날짜를 먼저 선택해 주세요.'
              : definition.legs
                ? busySlots.length > 0
                  ? '한쪽 센터의 시간이 이미 차 있어, 가능한 순서만 고를 수 있습니다.'
                  : '두 센터는 떨어져 있어 오전에 한 곳, 오후에 다른 한 곳을 방문합니다. (이동 · 점심 시간 포함)'
                : busySlots.length > 0
                  ? '취소선이 그어진 시간대는 이미 신청되었거나 확정된 방문과 겹칩니다.'
                  : tour === 'combined'
                    ? '메가와이즈 센터 투어 1시간 후 TDL Lab 투어가 이어집니다.'
                    : ' '}
          </p>
        </div>
      </div>
    </div>
  )
}
