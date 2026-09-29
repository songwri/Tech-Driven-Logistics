import { useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Textarea } from './ui/Field'
import { GuestbookCard } from './ui/GuestbookColumns'
import { SchedulePicker } from './visit/SchedulePicker'
import {
  HostFields,
  PrivacyConsent,
  SectionTitle,
  VisitInfoFields,
  VisitorsFields,
} from './visit/VisitFields'
import { submitReservation, isLiveBackend, type GuestbookEntry } from '@/lib/labApi'
import {
  TOUR_BY_ID,
  emptyVisitor,
  formatDateLong,
  formatSlot,
  isSlotBusy,
  type BusySegment,
  type VisitDraft,
  validateVisitDraft,
} from '@/lib/visit'

interface ReservationDialogProps {
  entries: GuestbookEntry[]
  /** 승인된 예약·휴무가 점유한 시간 구간 */
  busy: BusySegment[]
  /** 종일 휴무일 */
  closedDays: string[]
  onClose: () => void
}

const initialDraft = (): VisitDraft => ({
  tour: 'combined',
  date: '',
  slot: '',
  category: 'external',
  clientType: 'existing',
  company: '',
  industries: [],
  purposes: [],
  host: { name: '', title: '', org: '', phone: '', email: '' },
  hostComment: '',
  visitors: [emptyVisitor()],
  note: '',
  consent: false,
})

function trimDraft(draft: VisitDraft): VisitDraft {
  const text = (value: string) => value.trim()
  return {
    ...draft,
    company: text(draft.company),
    hostComment: text(draft.hostComment),
    note: text(draft.note),
    host: {
      name: text(draft.host.name),
      title: text(draft.host.title),
      org: text(draft.host.org),
      phone: text(draft.host.phone),
      email: text(draft.host.email),
    },
    visitors: draft.visitors.map((visitor) => ({
      ...visitor,
      name: text(visitor.name),
      title: text(visitor.title),
      org: text(visitor.org),
      email: text(visitor.email),
      car: text(visitor.car),
    })),
  }
}

export default function ReservationDialog({ entries, busy, closedDays, onClose }: ReservationDialogProps) {
  const [draft, setDraft] = useState<VisitDraft>(initialDraft)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const patch = (next: Partial<VisitDraft>) => setDraft((current) => ({ ...current, ...next }))
  const recentEntries = entries.slice(0, 3)
  const tour = TOUR_BY_ID[draft.tour]

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const problem = validateVisitDraft(draft)
    if (problem) {
      setError(problem)
      return
    }
    // A slot that gets confirmed while the dialog is open would otherwise slip through.
    if (isSlotBusy(draft.tour, draft.date, draft.slot, busy)) {
      setError('이미 확정된 일정과 겹치는 시간대입니다. 다른 날짜나 시간을 선택해 주세요.')
      return
    }

    setStatus('sending')
    setError(null)
    try {
      await submitReservation(trimDraft(draft))
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
        description="담당자 확인 후 승인 결과를 입력하신 이메일로 안내드립니다."
        onClose={onClose}
        className="max-w-lg"
      >
        <div className="flex items-start gap-3 border border-warm-300/50 bg-cream p-4">
          <Check className="mt-0.5 shrink-0 text-brand" />
          <div className="text-sm text-warm-800">
            <p className="font-semibold">{tour.label}</p>
            <p className="mt-1">
              {formatDateLong(draft.date)} {formatSlot(draft.slot)}
            </p>
            <p className="mt-1 text-warm-600">
              {draft.company} · 방문자 {draft.visitors.length}명
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
      title="TDL 방문 예약 신청"
      description="종합 투어 · 센터 투어 · TDL Lab 투어 중 선택해 주세요. 방문은 월 · 수 · 금에 운영됩니다."
      onClose={onClose}
      className="max-w-6xl"
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

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid gap-8 md:grid-cols-[320px_1fr]">
          <section>
            <SectionTitle index="01">방문 일정</SectionTitle>
            <SchedulePicker
              tour={draft.tour}
              date={draft.date}
              slot={draft.slot}
              busy={busy}
              closedDays={closedDays}
              onChange={patch}
            />
          </section>

          <section className="space-y-6">
            <div>
              <SectionTitle index="02">담당자 정보</SectionTitle>
              <HostFields host={draft.host} onChange={(host) => patch({ host })} />
            </div>
            <div>
              <SectionTitle>개인정보 수집 · 이용 동의</SectionTitle>
              <PrivacyConsent checked={draft.consent} onChange={(consent) => patch({ consent })} />
            </div>
          </section>
        </div>

        <section>
          <SectionTitle index="03">방문 정보</SectionTitle>
          <VisitInfoFields draft={draft} onChange={patch} />
        </section>

        <section>
          <SectionTitle
            index="04"
            aside={<span className="font-mono text-[11px] text-warm-600">복수 등록 가능 · 최대 30명</span>}
          >
            방문자 정보
          </SectionTitle>
          <VisitorsFields visitors={draft.visitors} onChange={(visitors) => patch({ visitors })} />
        </section>

        <section>
          <SectionTitle index="05">기타 요청사항</SectionTitle>
          <Textarea
            rows={3}
            value={draft.note}
            onChange={(e) => patch({ note: e.target.value })}
            maxLength={500}
            placeholder="관심 기술 영역이나 특별히 보고 싶은 설비가 있다면 남겨주세요."
            aria-label="기타 요청사항"
          />
        </section>

        <div className="space-y-3 border-t border-warm-300/40 pt-5">
          <p className="border-l-2 border-brand bg-cream px-4 py-3 text-[13px] text-warm-800">
            예약 신청 시 담당자에게 승인 요청이 전달되며, 일정 확정 후 입력하신 이메일로 확정 안내가 발송됩니다.
          </p>
          {error && <p className="border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>}
          {!isLiveBackend && (
            <p className="font-mono text-[11px] text-warm-600">※ 예약 접수 서버 연결 전입니다. 연결 후 정상 접수됩니다.</p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? '접수 중…' : '예약 신청하기'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
