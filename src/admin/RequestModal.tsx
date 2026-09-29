import { useState, type ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { SchedulePicker } from '@/components/visit/SchedulePicker'
import { HostFields, SectionTitle, VisitInfoFields, VisitorsFields } from '@/components/visit/VisitFields'
import {
  TOUR_BY_ID,
  busyFromRequests,
  clientSegment,
  formatDateLong,
  formatSlot,
  type VisitRequest,
  type VisitStatus,
  validateVisitDraft,
} from '@/lib/visit'
import { StatusBadge, TourTag } from './status'

interface RequestModalProps {
  request: VisitRequest
  requests: VisitRequest[]
  onClose: () => void
  onSetStatus: (id: string, status: VisitStatus) => Promise<void>
  onUpdate: (request: VisitRequest) => Promise<void>
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 border-b border-warm-300/30 py-2 text-sm">
      <span className="font-mono text-[11px] text-warm-600">{label}</span>
      <span className="text-warm-800">{children || <span className="text-warm-300">-</span>}</span>
    </div>
  )
}

export function RequestModal({ request, requests, onClose, onSetStatus, onUpdate }: RequestModalProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<VisitRequest>(request)
  const [memo, setMemo] = useState(request.adminMemo)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (task: () => Promise<void>) => {
    setPending(true)
    setError(null)
    try {
      await task()
      return true
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : '처리에 실패했습니다.')
      return false
    } finally {
      setPending(false)
    }
  }

  const startEdit = () => {
    setDraft({ ...request, consent: true })
    setEditing(true)
    setError(null)
  }

  const save = async () => {
    const problem = validateVisitDraft({ ...draft, consent: true })
    if (problem) {
      setError(problem)
      return
    }
    if (await run(() => onUpdate({ ...draft, adminMemo: memo }))) setEditing(false)
  }

  if (editing) {
    return (
      <Modal eyebrow="Edit Reservation" title="예약 정보 수정" onClose={() => setEditing(false)} className="max-w-6xl">
        <div className="space-y-8">
          <div className="grid gap-8 md:grid-cols-[320px_1fr]">
            <section>
              <SectionTitle>방문 일정</SectionTitle>
              <SchedulePicker
                tour={draft.tour}
                date={draft.date}
                slot={draft.slot}
                busy={busyFromRequests(requests, request.id)}
                closedDays={[]}
                onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
              />
            </section>
            <section className="space-y-6">
              <div>
                <SectionTitle>담당자 정보</SectionTitle>
                <HostFields host={draft.host} onChange={(host) => setDraft((current) => ({ ...current, host }))} />
              </div>
              <div>
                <SectionTitle>방문 정보</SectionTitle>
                <VisitInfoFields draft={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
              </div>
            </section>
          </div>
          <section>
            <SectionTitle>방문자 정보</SectionTitle>
            <VisitorsFields
              visitors={draft.visitors}
              onChange={(visitors) => setDraft((current) => ({ ...current, visitors }))}
            />
          </section>
          <section>
            <SectionTitle>기타 요청사항</SectionTitle>
            <Textarea
              rows={2}
              value={draft.note}
              onChange={(e) => setDraft((current) => ({ ...current, note: e.target.value }))}
              aria-label="기타 요청사항"
            />
          </section>
          {error && <p className="border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>
              취소
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  const tour = TOUR_BY_ID[request.tour]
  const headcount = request.visitors.length

  return (
    <Modal
      eyebrow="Reservation Detail"
      title={request.company}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <TourTag tour={request.tour} />
          <span>· {clientSegment(request)}</span>
        </span>
      }
      onClose={onClose}
      className="max-w-3xl"
    >
      <div
        className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-l-4 border-warm-300/50 bg-cream/60 px-4 py-3"
        style={{ borderLeftColor: tour.color }}
      >
        <div>
          <p className="font-mono text-[11px] text-warm-600">방문 일정</p>
          <p className="text-lg font-bold text-warm-800">
            {formatDateLong(request.date)} · {formatSlot(request.slot)}
          </p>
        </div>
        <p className="text-right text-sm text-warm-600">
          {tour.label} ({tour.duration})
          <br />
          방문자 <b className="text-warm-800">{headcount}명</b>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <SectionTitle>담당자</SectionTitle>
          <Row label="성함 · 직책">
            {request.host.name} {request.host.title}
          </Row>
          <Row label="조직">{request.host.org}</Row>
          <Row label="연락처">{request.host.phone}</Row>
          <Row label="이메일">
            <a href={`mailto:${request.host.email}`} className="underline decoration-warm-300 underline-offset-2">
              {request.host.email}
            </a>
          </Row>
        </div>
        <div>
          <SectionTitle>방문 정보</SectionTitle>
          <Row label="구분">{clientSegment(request)}</Row>
          {request.category === 'external' && <Row label="업종">{request.industries.join(', ')}</Row>}
          <Row label="방문 목적">{request.purposes.join(', ')}</Row>
          <Row label="담당자 의견">{request.hostComment}</Row>
          <Row label="요청사항">{request.note}</Row>
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle>방문자 ({headcount}명)</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12px]">
            <thead>
              <tr className="bg-cream text-left font-mono text-[11px] text-warm-600">
                {['성함', '직책', '조직명', '이메일', '차량번호', '직무'].map((head) => (
                  <th key={head} className="border border-warm-300/40 px-2 py-1.5 font-semibold">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {request.visitors.map((visitor, index) => (
                <tr key={index}>
                  <td className="border border-warm-300/40 px-2 py-1.5 font-semibold">{visitor.name}</td>
                  <td className="border border-warm-300/40 px-2 py-1.5">{visitor.title}</td>
                  <td className="border border-warm-300/40 px-2 py-1.5">{visitor.org}</td>
                  <td className="border border-warm-300/40 px-2 py-1.5">{visitor.email}</td>
                  <td className="border border-warm-300/40 px-2 py-1.5">{visitor.car || '-'}</td>
                  <td className="border border-warm-300/40 px-2 py-1.5">{visitor.jobs.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle
          aside={
            memo !== request.adminMemo && (
              <button
                type="button"
                onClick={() => run(() => onUpdate({ ...request, adminMemo: memo }))}
                className="font-mono text-[11px] font-semibold text-brand hover:underline"
              >
                메모 저장
              </button>
            )
          }
        >
          관리자 메모
        </SectionTitle>
        <Textarea
          rows={2}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="거절 사유, 안내 사항 등 (신청자에게 노출되지 않습니다)"
          aria-label="관리자 메모"
        />
      </div>

      {error && <p className="mt-4 border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-warm-300/40 pt-4">
        <Button variant="outline" size="sm" onClick={startEdit}>
          정보 수정
        </Button>
        <div className="flex flex-wrap gap-2">
          {request.status !== 'pending' && (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => onSetStatus(request.id, 'pending'))}>
              대기로 되돌리기
            </Button>
          )}
          {request.status !== 'rejected' && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => onSetStatus(request.id, 'rejected'))}
              className="bg-[#868e96]"
            >
              거절
            </Button>
          )}
          {request.status !== 'approved' && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => onSetStatus(request.id, 'approved'))}
              className="bg-[#2f9e44]"
            >
              승인
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
