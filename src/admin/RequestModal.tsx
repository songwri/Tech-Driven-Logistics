import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { HostFields, SectionTitle, VisitInfoFields, VisitorsFields } from '@/components/visit/VisitFields'
import {
  TOUR_BY_ID,
  busyFromRequests,
  clientSegment,
  formatDateLong,
  formatSlot,
  headcountLabel,
  languageSummary,
  type VisitRequest,
  type VisitStatus,
  validateVisitDraft,
  divisionGroup,
  OTHER_DIVISION,
} from '@/lib/visit'
import { StatusBadge, TourTag } from './status'
import { ManualVisitModal, OpsFields } from './ManualVisitModal'
import { opsFromRequest, opsToRequest } from './opsRecord'

// 달력 라이브러리(react-day-picker)는 '정보 수정'을 열 때만 받는다.
const SchedulePicker = lazy(() =>
  import('@/components/visit/SchedulePicker').then((module) => ({ default: module.SchedulePicker })),
)

interface RequestModalProps {
  request: VisitRequest
  requests: VisitRequest[]
  onClose: () => void
  onSetStatus: (id: string, status: VisitStatus) => Promise<void>
  onUpdate: (request: VisitRequest) => Promise<void>
  /** 예약 완전 삭제 (구글 시트 행도 삭제) */
  onDelete: (id: string) => Promise<void>
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 border-b border-warm-300/30 py-2 text-sm">
      <span className="font-mono text-[11px] text-warm-600">{label}</span>
      <span className="text-warm-800">{children || <span className="text-warm-300">-</span>}</span>
    </div>
  )
}

export function RequestModal({ request, requests, onClose, onSetStatus, onUpdate, onDelete }: RequestModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<VisitRequest>(request)
  const [memo, setMemo] = useState(request.adminMemo)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingOps, setEditingOps] = useState(false)
  const [ops, setOps] = useState(() => opsFromRequest(request))
  const manual = request.source === 'manual'

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
    // 담당(실) 항목이 생기기 전 기록도 고칠 수 있도록, 관리자 수정에서는 담당(실)을 필수로 보지 않는다.
    const problem = validateVisitDraft({
      ...draft,
      consent: true,
      host: { ...draft.host, division: draft.host.division || '-' },
    })
    if (problem) {
      setError(problem)
      return
    }
    if (await run(() => onUpdate({ ...draft, adminMemo: memo }))) setEditing(false)
  }

  if (editing && manual) {
    return (
      <ManualVisitModal
        initial={request}
        onClose={() => setEditing(false)}
        onSubmit={(input) => onUpdate({ ...request, ...input, status: request.status })}
      />
    )
  }

  if (editing) {
    return (
      <Modal eyebrow="Edit Reservation" title="예약 정보 수정" onClose={() => setEditing(false)} className="max-w-6xl">
        <div className="space-y-8">
          <div className="grid gap-8 md:grid-cols-[320px_1fr]">
            <section>
              <SectionTitle>방문 일정</SectionTitle>
              <Suspense fallback={<p className="py-10 text-center text-sm text-warm-600">달력 불러오는 중…</p>}>
                <SchedulePicker
                  leadDays={0}
                  tour={draft.tour}
                  date={draft.date}
                  slot={draft.slot}
                  busy={busyFromRequests(requests, request.id)}
                  closedDays={[]}
                  onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
                />
              </Suspense>
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
  const headcount = headcountLabel(request)
  const hasHost = Boolean(request.host.name || request.host.org || request.host.phone || request.host.email)
  const saveOps = async () => {
    if (await run(() => onUpdate({ ...request, ...opsToRequest(ops), adminMemo: memo }))) setEditingOps(false)
  }

  /** 현재 상태에서 바꿀 수 있는 상태 버튼 */
  const back = { label: '대기로 되돌리기', variant: 'outline' as const }
  const actions = {
    pending: [
      { status: 'rejected', label: '거절', className: 'bg-[#868e96]' },
      { status: 'approved', label: '승인', className: 'bg-[#2f9e44]' },
    ],
    approved: [
      { status: 'pending', ...back },
      { status: 'cancelled', label: '방문 취소', className: 'bg-[#868e96]' },
      { status: 'completed', label: '방문 완료', className: 'bg-[#1c7ed6]' },
    ],
    completed: [{ status: 'approved', label: '승인으로 되돌리기', variant: 'outline' }],
    rejected: [
      { status: 'pending', ...back },
      { status: 'approved', label: '승인', className: 'bg-[#2f9e44]' },
    ],
    cancelled: [
      { status: 'pending', ...back },
      { status: 'approved', label: '승인', className: 'bg-[#2f9e44]' },
    ],
  }[request.status] as { status: VisitStatus; label: string; className?: string; variant?: 'outline' }[]

  return (
    <Modal
      eyebrow="Reservation Detail"
      title={request.company}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <TourTag tour={request.tour} />
          <span>· {clientSegment(request)}</span>
          {manual && <span className="border border-warm-300/70 px-1 font-mono text-[10px] text-warm-600">수기 등록</span>}
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
          방문 인원 <b className="text-warm-800">{headcount}</b>
          {request.actualHeadcount != null && request.visitors.length > 0 && request.actualHeadcount !== request.visitors.length && (
            <span className="ml-1 text-[12px]">(명단 {request.visitors.length}명)</span>
          )}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <SectionTitle>담당자</SectionTitle>
          {hasHost || !manual ? (
            <>
              <Row label="성함 · 직책">
                {request.host.name} {request.host.title}
              </Row>
              <Row label="담당(실)">
                {request.host.division}
                {request.host.division && divisionGroup(request.host.division) === OTHER_DIVISION && (
                  <span className="ml-1.5 text-[12px] text-warm-600">· 통계는 기타</span>
                )}
              </Row>
              <Row label="조직">{request.host.org}</Row>
              <Row label="연락처">{request.host.phone}</Row>
              <Row label="이메일">
                {request.host.email && (
                  <a href={`mailto:${request.host.email}`} className="underline decoration-warm-300 underline-offset-2">
                    {request.host.email}
                  </a>
                )}
              </Row>
            </>
          ) : (
            <p className="py-2 text-sm text-warm-600">기록된 담당자가 없습니다.</p>
          )}
        </div>
        <div>
          <SectionTitle>방문 정보</SectionTitle>
          <Row label="구분">{clientSegment(request)}</Row>
          <Row label="투어 언어">
            <span className={request.language === 'foreign' ? 'font-semibold text-brand' : undefined}>
              {languageSummary(request)}
            </span>
          </Row>
          {request.category === 'external' && <Row label="업종">{request.industries.join(', ')}</Row>}
          <Row label="방문 목적">{request.purposes.join(', ')}</Row>
          <Row label="담당자 의견">{request.hostComment}</Row>
          <Row label="요청사항">{request.note}</Row>
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle
          aside={
            !editingOps && (
              <button
                type="button"
                onClick={() => {
                  setOps(opsFromRequest(request))
                  setEditingOps(true)
                }}
                className="font-mono text-[11px] font-semibold text-brand hover:underline"
              >
                기록 편집
              </button>
            )
          }
        >
          운영 기록
        </SectionTitle>
        {editingOps ? (
          <div className="border border-warm-300/50 bg-cream/40 p-4">
            <OpsFields value={ops} onChange={setOps} listedHeadcount={manual ? undefined : request.visitors.length} />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingOps(false)}>
                취소
              </Button>
              <Button size="sm" disabled={pending} onClick={() => void saveOps()}>
                {pending ? '저장 중…' : '기록 저장'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-x-6 md:grid-cols-2">
            {!manual && (
              <Row label="실제 방문 인원">
                {request.actualHeadcount != null && `${request.actualHeadcount}명 (명단 ${request.visitors.length}명)`}
              </Row>
            )}
            <Row label="주요 인원">
              {request.keyPersons && <span className="whitespace-pre-line">{request.keyPersons}</span>}
            </Row>
            <Row label="가이드">{request.guides && <span className="whitespace-pre-line">{request.guides}</span>}</Row>
            <Row label="유관 부서">{request.departments?.join(', ')}</Row>
            <Row label="후속 진행">
              {request.followUp && <span className="whitespace-pre-line">{request.followUp}</span>}
            </Row>
          </div>
        )}
      </div>

      {request.visitors.length > 0 && (
        <div className="mt-6">
          <SectionTitle>방문자 명단 ({request.visitors.length}명)</SectionTitle>
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
      )}

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

      {confirmDelete && (
        <div className="mt-6 border border-brand/50 bg-brand/5 p-4" role="alertdialog" aria-label="예약 삭제 확인">
          <p className="text-sm font-semibold text-brand">이 예약을 완전히 삭제할까요?</p>
          <p className="mt-1 text-[13px] text-warm-800">
            관리자 목록 · 통계 · 구글 시트(visit_requests)에서 모두 지워지며 <b>되돌릴 수 없습니다.</b>
            <br />
            기록을 남기려면 삭제 대신 <b>거절</b> 또는 <b>방문 취소</b>를 쓰세요. (둘 다 통계에서는 제외됩니다)
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirmDelete(false)}>
              취소
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await onDelete(request.id)
                  onClose()
                })
              }
            >
              {pending ? '삭제 중…' : '삭제'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-warm-300/40 pt-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startEdit}>
            정보 수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || confirmDelete}
            onClick={() => setConfirmDelete(true)}
            className="text-brand hover:text-brand"
          >
            삭제
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.status}
              size="sm"
              variant={action.variant}
              disabled={pending}
              onClick={() => run(() => onSetStatus(request.id, action.status))}
              className={action.className}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
