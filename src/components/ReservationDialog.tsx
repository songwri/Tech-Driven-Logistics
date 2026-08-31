import { useState } from 'react'
import { CalendarDays, Check } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Calendar } from './ui/Calendar'
import { Button } from './ui/Button'
import { Field, Input, Textarea } from './ui/Field'
import { GuestbookCard } from './ui/GuestbookColumns'
import { submitReservation, isLiveBackend, type GuestbookEntry } from '@/lib/labApi'

interface ReservationDialogProps {
  entries: GuestbookEntry[]
  onClose: () => void
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function ReservationDialog({ entries, onClose }: ReservationDialogProps) {
  const [date, setDate] = useState<Date | undefined>()
  const [headcount, setHeadcount] = useState('')
  const [company, setCompany] = useState('')
  const [leadName, setLeadName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const recentEntries = entries.slice(0, 3)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!date) {
      setError('방문 희망 날짜를 선택해 주세요.')
      return
    }

    setStatus('sending')
    setError(null)
    try {
      await submitReservation({
        date: toDateKey(date),
        headcount: Number(headcount),
        company: company.trim(),
        leadName: leadName.trim(),
        phone: phone.trim(),
        email: email.trim(),
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
        <div className="flex items-center gap-3 border border-warm-300/50 bg-cream p-4">
          <Check className="text-brand" />
          <p className="text-sm text-warm-800">
            {date && toDateKey(date)} · {company} · {headcount}명
          </p>
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
      title="쇼룸 방문 예약"
      description="방문 희망일과 인원을 남겨주시면 담당자가 일정 확정 후 연락드립니다."
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
            disabled={{ before: new Date() }}
          />
          <p className="mt-2 flex items-center gap-2 border-t border-warm-300/40 pt-2 font-mono text-[11px] text-warm-600">
            <CalendarDays width={14} height={14} />
            {date ? toDateKey(date) : '방문 희망일을 선택하세요'}
          </p>
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
