import { useMemo, useState } from 'react'
import { AlertTriangle, Lock, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import {
  BLOCK_TARGETS,
  OPEN_WEEKDAYS,
  STATUS_LABEL,
  TOUR_BY_ID,
  blockSegment,
  blockTargetLabel,
  formatDateShort,
  formatSlot,
  isSlotBusy,
  parseDateKey,
  toDateKey,
  type BlockTarget,
  type TourBlock,
  type VisitRequest,
} from '@/lib/visit'
import type { BlockInput } from './useAdminData'

interface BlockDialogProps {
  /** 처음 채워 둘 기간 (달력에서 끌어 고른 범위 · 선택한 날짜) */
  start: string
  end: string
  blocks: TourBlock[]
  /** 이미 들어온 예약: 막으려는 일정과 겹치는 승인 · 대기 건을 경고한다. */
  requests: VisitRequest[]
  onAdd: (input: BlockInput) => Promise<void>
  onRemove: (ids: string[]) => Promise<void>
  onClose: () => void
}

export const blockSlotLabel = (slot: string) => (slot ? slot.replace('-', ' – ') : '종일')

/** 기간 안의 날짜 중 운영일(월 · 수 · 금)이면서 오늘 이후인 날 */
export function bookableDatesBetween(start: string, end: string) {
  const dates: string[] = []
  if (!start || !end || end < start) return dates
  const today = toDateKey(new Date())
  const cursor = parseDateKey(start)
  const last = parseDateKey(end)
  while (cursor <= last && dates.length < 366) {
    const key = toDateKey(cursor)
    if (key >= today && OPEN_WEEKDAYS.includes(cursor.getDay())) dates.push(key)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function BlockDialog({ start: initialStart, end: initialEnd, blocks, requests, onAdd, onRemove, onClose }: BlockDialogProps) {
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [target, setTarget] = useState<BlockTarget>('center')
  const [allDay, setAllDay] = useState(true)
  const [from, setFrom] = useState('09:30')
  const [to, setTo] = useState('16:00')
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dates = useMemo(() => bookableDatesBetween(start, end), [start, end])
  const existing = useMemo(
    () =>
      blocks
        .filter((block) => block.date >= start && block.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot)),
    [blocks, start, end],
  )
  const affected = useMemo(() => {
    if (allDay === false && (!from || !to || from >= to)) return []
    const wanted = new Set(dates)
    const slot = allDay ? '' : `${from}-${to}`
    return requests
      .filter(
        (request) =>
          wanted.has(request.date) &&
          (request.status === 'pending' || request.status === 'approved') &&
          isSlotBusy(
            request.tour,
            request.date,
            request.slot,
            [blockSegment({ id: '', date: request.date, slot, resource: target, reason: '' })],
          ),
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot))
  }, [requests, dates, target, allDay, from, to])
  const timeInvalid = !allDay && (!from || !to || from >= to)
  const canSubmit = dates.length > 0 && !timeInvalid && !pending

  const run = async (task: () => Promise<void>) => {
    setPending(true)
    setError(null)
    try {
      await task()
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : '저장에 실패했습니다.')
    } finally {
      setPending(false)
    }
  }

  const submit = () =>
    run(async () => {
      await onAdd({ dates, resource: target, slot: allDay ? '' : `${from}-${to}`, reason: reason.trim() })
      onClose()
    })

  return (
    <Modal
      eyebrow="Block Schedule"
      title="일정 막기"
      description="담당자 사정으로 투어가 어려운 날짜 · 시간을 미리 막습니다. 예약 화면에서는 확정된 일정처럼 선택할 수 없게 됩니다."
      onClose={onClose}
      className="max-w-xl"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="시작일" required>
            <Input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value)
                if (end < e.target.value) setEnd(e.target.value)
              }}
            />
          </Field>
          <Field label="종료일" required>
            <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-warm-800">막을 대상</p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="막을 대상">
            {BLOCK_TARGETS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={target === item.id}
                onClick={() => setTarget(item.id)}
                className={cn(
                  'border px-3 py-2 text-left transition',
                  target === item.id ? 'border-warm-800 bg-warm-800 text-white' : 'border-warm-300/70 hover:border-warm-800',
                )}
              >
                <span className="block text-[14px] font-bold">{item.label}</span>
                <span className={cn('block text-[11px]', target === item.id ? 'text-white/80' : 'text-warm-600')}>{item.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-warm-800">시간</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex border border-warm-300/60 bg-white" role="radiogroup" aria-label="시간 범위">
              {(
                [
                  [true, '종일'],
                  [false, '시간 지정'],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={text}
                  type="button"
                  role="radio"
                  aria-checked={allDay === value}
                  onClick={() => setAllDay(value)}
                  className={cn(
                    'px-3 py-2 text-[13px] font-semibold transition',
                    allDay === value ? 'bg-warm-800 text-white' : 'text-warm-600 hover:text-warm-800',
                  )}
                >
                  {text}
                </button>
              ))}
            </div>
            {!allDay && (
              <div className="flex items-center gap-2">
                <Input type="time" step={600} value={from} onChange={(e) => setFrom(e.target.value)} />
                <span className="text-warm-600">~</span>
                <Input type="time" step={600} value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            )}
          </div>
          {timeInvalid && <p className="mt-1.5 text-[12px] text-brand">끝 시간은 시작 시간보다 늦어야 합니다.</p>}
        </div>

        <Field label="사유" hint="관리자에게만 보입니다 (예: 센터 점검, 출장)">
          <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
        </Field>

        <p className="border border-warm-300/50 bg-cream/50 px-3 py-2 text-[13px] text-warm-800">
          {dates.length > 0 ? (
            <>
              운영일(월 · 수 · 금) <b className="text-brand">{dates.length}일</b>이 막힙니다.
              <span className="ml-1 text-warm-600">
                {formatDateShort(dates[0])}
                {dates.length > 1 ? ` ~ ${formatDateShort(dates[dates.length - 1])}` : ''}
              </span>
            </>
          ) : (
            '선택한 기간에 막을 수 있는 운영일(오늘 이후의 월 · 수 · 금)이 없습니다.'
          )}
        </p>

        {affected.length > 0 && (
          <div role="alert" className="border border-[#f59f00] bg-[#fff4e6] px-3 py-2.5 text-[13px] text-[#8a3b00]">
            <p className="flex items-center gap-1.5 font-bold">
              <AlertTriangle width={14} height={14} aria-hidden /> 이미 들어온 예약 {affected.length}건과 겹칩니다
            </p>
            <p className="mt-0.5 text-[12px]">
              막아도 이 예약들은 자동으로 바뀌지 않습니다. 필요하면 예약자와 조율하고 거절 · 일정 변경을 직접 처리해 주세요.
            </p>
            <ul className="mt-1.5 max-h-32 space-y-0.5 overflow-y-auto text-[12px]">
              {affected.map((request) => (
                <li key={request.id} className="flex flex-wrap items-center gap-x-2">
                  <span className="font-mono">{formatDateShort(request.date)}</span>
                  <span className="font-mono">{formatSlot(request.slot)}</span>
                  <span>{TOUR_BY_ID[request.tour].short}</span>
                  <span className="font-semibold">{request.company}</span>
                  <span className="rounded-sm bg-white/70 px-1 text-[11px] font-bold">{STATUS_LABEL[request.status]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {existing.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-warm-800">이 기간에 이미 막힌 일정 ({existing.length}건)</p>
            <ul className="max-h-40 divide-y divide-warm-300/30 overflow-y-auto border border-warm-300/50">
              {existing.map((block) => (
                <li key={block.id} className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-warm-800">
                  <Lock width={12} height={12} className="shrink-0 text-warm-600" aria-hidden />
                  <span className="font-mono">{formatDateShort(block.date)}</span>
                  <span className="font-semibold">{blockTargetLabel(block.resource)}</span>
                  <span className="font-mono text-warm-600">{blockSlotLabel(block.slot)}</span>
                  <span className="min-w-0 flex-1 truncate text-warm-600">{block.reason}</span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void run(() => onRemove([block.id]))}
                    aria-label={`${formatDateShort(block.date)} 막힘 해제`}
                    className="inline-flex shrink-0 items-center gap-0.5 border border-warm-300/60 px-1.5 py-0.5 text-[11px] font-semibold text-warm-600 transition hover:border-brand hover:text-brand disabled:opacity-50"
                  >
                    <X width={11} height={11} /> 해제
                  </button>
                </li>
              ))}
            </ul>
            {existing.length > 1 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => void run(() => onRemove(existing.map((block) => block.id)))}
                className="mt-1.5 text-[12px] font-semibold text-warm-600 underline-offset-2 hover:text-brand hover:underline disabled:opacity-50"
              >
                이 기간 막힘 모두 해제
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="border border-brand/40 bg-brand/5 px-3 py-2 text-[13px] text-brand">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            닫기
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {pending ? '저장 중…' : `${affected.length > 0 ? '확인하고 ' : ''}${dates.length}일 막기`}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
