import { useMemo } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar } from '../ui/Calendar'
import { FieldLabel } from './VisitFields'
import {
  CLOSED_WEEKDAYS,
  TOURS,
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
}

/** 좌측 패널: 투어 종류 → 달력 날짜 → 시간대 순으로 고릅니다. */
export function SchedulePicker({ tour, date, slot, busy, closedDays, onChange }: SchedulePickerProps) {
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
    <div className="space-y-4">
      <div>
        <FieldLabel required>투어 종류</FieldLabel>
        <div className="mt-1.5 grid gap-1.5" role="radiogroup">
          {TOURS.map((item) => {
            const active = item.id === tour
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => chooseTour(item.id)}
                className={cn(
                  'flex items-center gap-3 border px-3 py-2 text-left transition',
                  active ? 'border-brand bg-brand/5' : 'border-warm-300/60 hover:border-brand/60',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    active ? 'border-brand' : 'border-warm-300',
                  )}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-brand" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm font-semibold', active ? 'text-brand' : 'text-warm-800')}>
                    {item.label}
                    <span className="ml-1.5 font-normal text-warm-600">· {item.description}</span>
                  </span>
                  <span className="block font-mono text-[11px] text-warm-600">
                    {item.duration} · {item.slots.length === 2 ? item.slots.map(formatSlot).join(' / ') : '10:00 – 16:00 (1시간 단위)'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border border-warm-300/50 p-3">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(picked) => {
            const nextDate = picked ? toDateKey(picked) : ''
            const keepSlot = Boolean(slot) && Boolean(nextDate) && !isSlotBusy(tour, nextDate, slot, busy)
            onChange({ date: nextDate, slot: keepSlot ? slot : '' })
          }}
          startMonth={new Date()}
          disabled={[{ before: new Date() }, { dayOfWeek: CLOSED_WEEKDAYS }, ...closed, ...fullyBookedDays]}
        />
        <p className="mt-2 flex items-center gap-2 border-t border-warm-300/40 pt-2 font-mono text-[11px] text-warm-600">
          <CalendarDays width={14} height={14} />
          {date ? `${formatDateLong(date)} 선택됨` : '월 · 수 · 금만 선택 가능'}
        </p>
      </div>

      <div>
        <FieldLabel required>방문 시간</FieldLabel>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
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
                  'flex items-center justify-center gap-1.5 border px-2 py-2 font-mono text-[13px] transition',
                  taken
                    ? 'cursor-not-allowed border-warm-300/40 bg-warm-300/10 text-warm-300 line-through'
                    : active
                      ? 'border-brand bg-brand text-white'
                      : 'border-warm-300/60 text-warm-800 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-warm-300/60 disabled:hover:text-warm-800',
                )}
              >
                <Clock width={12} height={12} />
                {formatSlot(candidate)}
              </button>
            )
          })}
        </div>
        <p className="mt-2 font-mono text-[11px] text-warm-600">
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
  )
}
