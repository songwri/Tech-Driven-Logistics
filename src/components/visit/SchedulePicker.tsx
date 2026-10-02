import { useMemo } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar } from '../ui/Calendar'
import { FieldLabel, GroupError } from './VisitFields'
import {
  CLOSED_WEEKDAYS,
  MIN_LEAD_DAYS,
  earliestBookableDate,
  BOOKABLE_TOURS,
  TOUR_BY_ID,
  formatDateLong,
  formatSlot,
  isSlotBusy,
  parseDateKey,
  toDateKey,
  type BusySegment,
  type TourType,
} from '@/lib/visit'

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
}: SchedulePickerProps) {
  const earliest = useMemo(() => earliestBookableDate(leadDays), [leadDays])
  const definition = TOUR_BY_ID[tour]

  // 선택한 투어의 모든 시간대가 막힌 날은 달력에서 고를 수 없게 한다.
  const fullyBookedDays = useMemo(() => {
    const days = new Set(busy.map((segment) => segment.date))
    return [...days]
      .filter((day) => definition.slots.every((candidate) => isSlotBusy(tour, day, candidate, busy)))
      .map(parseDateKey)
  }, [busy, definition, tour])

  const closed = useMemo(() => closedDays.map(parseDateKey), [closedDays])
  const selectedDate = date ? parseDateKey(date) : undefined
  const busySlots = date ? definition.slots.filter((candidate) => isSlotBusy(tour, date, candidate, busy)) : []

  const chooseTour = (next: TourType) => {
    const keepSlot = TOUR_BY_ID[next].slots.includes(slot) && !isSlotBusy(next, date, slot, busy)
    onChange({ tour: next, slot: keepSlot ? slot : '' })
  }

  return (
    <div className={cn('grid gap-5', wide && 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8')}>
      <div>
        <FieldLabel required>투어 종류</FieldLabel>
        <div className="mt-2 grid gap-2" role="radiogroup">
          {BOOKABLE_TOURS.map((item, index) => {
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
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[12px] font-bold',
                    active ? 'border-brand bg-brand text-white' : 'border-warm-300 text-warm-600',
                  )}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[15px] font-bold', active ? 'text-brand' : 'text-ink')}>
                    {item.label}
                  </span>
                  {/* 어디를 보는 투어인지: 투어 이름 바로 아래에 진하게 */}
                  <span className={cn('mt-0.5 block text-[13px] font-medium', active ? 'text-brand/90' : 'text-warm-800')}>
                    {item.description}
                  </span>
                  <span className="mt-0.5 block text-[12px] tabular-nums text-warm-600">
                    {item.duration} ·{' '}
                    {item.slots.map((slot) => slot.slice(0, 5)).join(' / ')} 시작
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {tour === 'combined' && (
          <div className="mt-3 rounded border border-brand/40 bg-brand/5 p-2.5">
            <p className="text-[13px] font-medium text-brand">센터 투어는 센터담당자와 별도 협의</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
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
              disabled={[{ before: earliest }, { dayOfWeek: CLOSED_WEEKDAYS }, ...closed, ...fullyBookedDays]}
            />
            <p className="mt-2 flex items-center gap-2 border-t border-warm-300/40 pt-2 text-[12px] text-warm-600">
              <CalendarDays width={14} height={14} />
              {date
                ? `${formatDateLong(date)} 선택됨`
                : leadDays > 0
                  ? '월 · 수 · 금 · 당일 · 익일은 신청 불가'
                  : '월 · 수 · 금만 선택 가능'}
            </p>
          </div>
          <GroupError show={Boolean(errors?.has('date'))}>방문 날짜를 선택해 주세요.</GroupError>
        </div>

        <div>
          <FieldLabel required>방문 시간</FieldLabel>
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
                  title={taken ? '이미 확정된 일정과 겹치는 시간대입니다' : undefined}
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
          <GroupError show={Boolean(errors?.has('slot') && date)}>방문 시간을 선택해 주세요.</GroupError>
          <p className="mt-2 text-[12px] text-warm-600">
            {!date
              ? '날짜를 먼저 선택해 주세요.'
              : busySlots.length > 0
                ? '취소선이 그어진 시간대는 이미 확정된 방문과 겹칩니다.'
                : tour === 'combined'
                  ? '센터 투어 1시간 후 TDL Lab 투어가 이어집니다.'
                  : ' '}
          </p>
        </div>
      </div>
    </div>
  )
}
