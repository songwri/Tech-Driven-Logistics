import { useMemo, useState } from 'react'
import { CalendarDays, Check } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Calendar } from './ui/Calendar'
import { Button } from './ui/Button'
import { Field, Input, Textarea } from './ui/Field'
import { GuestbookCard } from './ui/GuestbookColumns'
import { submitReservation, isLiveBackend, type GuestbookEntry } from '@/lib/labApi'

interface ReservationDialogProps {
  entries: GuestbookEntry[]
  /** 'YYYY-MM-DD HH:mm' slots already confirmed by the team. */
  blockedSlots: string[]
  /** Whole days that are unavailable (both slots taken, or a closure). */
  blockedDays: string[]
  onClose: () => void
}

/** Tours run on Mondays, Wednesdays and Fridays only — everything else is off. */
const CLOSED_WEEKDAYS = [0, 2, 4, 6]
const TIME_SLOTS = ['10:00', '14:00']

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export default function ReservationDialog({
  entries,
  blockedSlots,
  blockedDays,
  onClose,
}: ReservationDialogProps) {
  const [date, setDate] = useState<Date | undefined>()
  const [time, setTime] = useState('')
  const [headcount, setHeadcount] = useState('')
  const [company, setCompany] = useState('')
  const [leadName, setLeadName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicles, setVehicles] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const recentEntries = entries.slice(0, 3)

  const takenDays = useMemo(
    () => blockedDays.map((day) => new Date(`${day}T00:00:00`)),
    [blockedDays],
  )
  const takenSlots = useMemo(() => new Set(blockedSlots), [blockedSlots])
  const isSlotTaken = (slot: string) => Boolean(date) && takenSlots.has(`${toDateKey(date!)} ${slot}`)

  // A day that gets confirmed while the dialog is open would otherwise leave a
  // now-unavailable slot selected.
  const selectedSlotTaken = Boolean(time) && isSlotTaken(time)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!date) {
      setError('방문 희망일을 선택해 주세요. (월·수·금만 가능합니다)')
      return
    }
    if (!time) {
      setError('방문 시간대를 선택해 주세요.')
      return
    }
    if (selectedSlotTaken) {
      setError('이미 확정된 시간대입니다. 다른 날짜나 시간대를 선택해 주세요.')
      return
    }

    setStatus('sending')
    setError(null)
    try {
      await submitReservation({
        date: toDateKey(date),
        time,
        headcount: Number(headcount),
        company: company.trim(),
        leadName: leadName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        vehicles: vehicles.trim() || undefined,
        note: note.trim() || undefined,
      })
      setStatus('done')
    } catch (submitError) {
      setStatus('idle')
      setError(submitError instanceof Error ? submitError.message : '예약 신청에 실패했습니다.')
    }
  }

  if (status === 'done') {
    return (
      <Modal
        eyebrow="Reservation Received"
        title="예약 신청이 접수되었습니다"
        description="담당자가 확인 후 입력해 주신 연락처로 회신드립니다."
        onClose={onClose}
        className="max-w-lg"
      >
        <div className="flex items-start gap-3 border border-warm-300/50 bg-cream p-4">
          <Check className="mt-0.5 shrink-0 text-brand" />
          <div className="text-sm text-warm-800">
            <p>
              {date && formatDate(date)} {time}
            </p>
            <p className="mt-1 text-warm-600">
              {company} · {headcount}명
            </p>
          </div>
        </div>
        <Button className="mt-6 w-full" onClick={onClose}>
          닫기
        </Button>
      </Modal>
    )
  }

  return (
    <Modal
      eyebrow="TDL Lab Visit"
      title="TDL 방문 예약"
      description="방문은 월·수·금 10:00 / 14:00 두 개 시간대로 운영됩니다."
      onClose={onClose}
      className="max-w-5xl"
    >
      {recentEntries.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-warm-600">
            먼저 다녀간 방문자들의 기록
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {recentEntries.map((entry) => (
              <GuestbookCard key={entry.id} entry={entry} className="max-w-none" />
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[auto_1fr]">
        <div className="border border-warm-300/50 p-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            startMonth={new Date()}
            disabled={[{ before: new Date() }, { dayOfWeek: CLOSED_WEEKDAYS }, ...takenDays]}
          />
          <p className="mt-2 flex items-center gap-2 border-t border-warm-300/40 pt-2 font-mono text-[11px] text-warm-600">
            <CalendarDays width={14} height={14} />
            {date ? `${toDateKey(date)} 선택됨` : '월 · 수 · 금만 선택 가능'}
          </p>

          <div className="mt-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-warm-600">
              방문 시간대 <span className="text-brand">*</span>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((slot) => {
                const taken = isSlotTaken(slot)
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTime(slot)}
                    disabled={taken}
                    aria-pressed={time === slot}
                    title={taken ? '이미 확정된 시간대입니다' : undefined}
                    className={`border px-3 py-2 font-mono text-sm transition ${
                      taken
                        ? 'cursor-not-allowed border-warm-300/40 bg-warm-300/10 text-warm-300 line-through'
                        : time === slot
                          ? 'border-brand bg-brand text-white'
                          : 'border-warm-300/60 text-warm-800 hover:border-brand hover:text-brand'
                    }`}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
            {date && (isSlotTaken('10:00') || isSlotTaken('14:00')) && (
              <p className="mt-2 font-mono text-[11px] text-warm-600">
                취소선이 그어진 시간대는 이미 확정된 방문이 있습니다.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="회사명" required>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="LX판토스" />
          </Field>
          <Field label="방문 인원" required>
            <Input
              type="number"
              min={1}
              max={50}
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
              required
              placeholder="8"
            />
          </Field>
          <Field label="투어 대표자" required>
            <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} required placeholder="김대현" />
          </Field>
          <Field label="연락처" required>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="010-0000-0000"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="이메일" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="방문 차량"
              hint="주차 등록에 사용됩니다. 차량이 여러 대면 쉼표(,)로 구분해 주세요."
            >
              <Input
                value={vehicles}
                onChange={(e) => setVehicles(e.target.value)}
                placeholder="12가3456, 34나5678"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="요청사항" hint="관심 기술 영역이나 특별히 보고 싶은 설비가 있다면 남겨주세요.">
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </Field>
          </div>

          {error && (
            <p className="sm:col-span-2 border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>
          )}
          {!isLiveBackend && (
            <p className="sm:col-span-2 font-mono text-[11px] text-warm-600">
              ※ 예약 접수 서버 연결 전입니다. 연결 후 정상 접수됩니다.
            </p>
          )}

          <div className="sm:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? '접수 중…' : '예약 신청'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
