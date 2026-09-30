import { useMemo, useState } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Field'
import { SchedulePicker } from './SchedulePicker'
import { HostFields, PrivacyConsent, SectionTitle, VisitInfoFields, VisitorsFields } from './VisitFields'
import { submitReservation, isLiveBackend } from '@/lib/labApi'
import {
  FORM_SECTIONS,
  TOUR_BY_ID,
  emptyVisitor,
  firstProblem,
  formatDateLong,
  formatSlot,
  isSlotBusy,
  languageSummary,
  sectionProblems,
  type BusySegment,
  type FormSection,
  type VisitDraft,
} from '@/lib/visit'

const initialDraft = (): VisitDraft => ({
  tour: 'combined',
  date: '',
  slot: '',
  category: 'external',
  clientType: 'existing',
  language: 'ko',
  foreignLanguage: '',
  interpreter: false,
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

const sectionId = (section: FormSection) => `rf-${section}`

function scrollToSection(section: FormSection) {
  const element = document.getElementById(sectionId(section))
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // 섹션 안 첫 입력칸으로 포커스를 옮겨 바로 고칠 수 있게 한다.
  const fields = element ? [...element.querySelectorAll<HTMLInputElement>('input, textarea')] : []
  const empty = fields.find((field) => (field.type === 'checkbox' ? !field.checked : !field.value.trim()))
  if (empty) window.setTimeout(() => empty.focus({ preventScroll: true }), 350)
}

/** 섹션 진행 표시: 완료된 섹션은 체크, 누르면 해당 섹션으로 이동 */
function ProgressSteps({
  problems,
  vertical,
}: {
  problems: Record<FormSection, string | null>
  vertical?: boolean
}) {
  return (
    <ol className={cn('flex gap-1.5', vertical ? 'flex-col' : 'flex-wrap')}>
      {FORM_SECTIONS.map((section, index) => {
        const done = problems[section.id] === null
        return (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'inline-flex items-center gap-1.5 text-[12px] transition hover:text-brand',
                done ? 'text-warm-800' : 'text-warm-600',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold',
                  done ? 'border-[#2f9e44] bg-[#2f9e44] text-white' : 'border-warm-300 text-warm-600',
                )}
                aria-hidden
              >
                {done ? <Check width={10} height={10} strokeWidth={3.5} /> : index + 1}
              </span>
              {section.label}
              <span className="sr-only">{done ? '완료' : '미완료'}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

interface ReservationFormProps {
  busy: BusySegment[]
  closedDays: string[]
}

/** 예약 신청 폼. 데스크톱은 우측 고정 요약 패널, 모바일은 하단 고정 바로 신청 버튼을 항상 보여준다. */
export function ReservationForm({ busy, closedDays }: ReservationFormProps) {
  const [draft, setDraft] = useState<VisitDraft>(initialDraft)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const patch = (next: Partial<VisitDraft>) => {
    setDraft((current) => ({ ...current, ...next }))
    setError(null)
  }
  const problems = useMemo(() => sectionProblems(draft), [draft])
  const doneCount = FORM_SECTIONS.filter((section) => problems[section.id] === null).length
  const tour = TOUR_BY_ID[draft.tour]
  const defaultOrg = draft.category === 'external' ? draft.company.trim() : ''

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const problem = firstProblem(draft)
    if (problem) {
      setError(problem.message)
      scrollToSection(problem.section)
      return
    }
    // A slot that gets confirmed while the form is open would otherwise slip through.
    if (isSlotBusy(draft.tour, draft.date, draft.slot, busy)) {
      setError('이미 확정된 일정과 겹치는 시간대입니다. 다른 날짜나 시간을 선택해 주세요.')
      scrollToSection('schedule')
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
      <div className="mx-auto max-w-lg py-4">
        <div className="flex items-start gap-3 border border-[#8ce99a] bg-[#ebfbee] p-5">
          <Check className="mt-0.5 shrink-0 text-[#2b8a3e]" />
          <div className="text-sm text-warm-800">
            <p className="text-base font-bold">예약 신청이 접수되었습니다</p>
            <p className="mt-1 text-warm-600">담당자 확인 후 승인 결과를 {draft.host.email} 로 안내드립니다.</p>
            <dl className="mt-4 grid grid-cols-[72px_1fr] gap-y-1 text-[13px]">
              <dt className="text-warm-600">투어</dt>
              <dd className="font-semibold">{tour.label}</dd>
              <dt className="text-warm-600">일정</dt>
              <dd>
                {formatDateLong(draft.date)} {formatSlot(draft.slot)}
              </dd>
              <dt className="text-warm-600">방문</dt>
              <dd>
                {draft.company} · {draft.visitors.length}명
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setDraft(initialDraft())
              setStatus('idle')
              window.scrollTo({ top: 0 })
            }}
          >
            다른 일정 추가 신청
          </Button>
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            소개 페이지로
          </a>
        </div>
      </div>
    )
  }

  const summary = (
    <p className="min-w-0 text-[13px] leading-relaxed text-warm-800">
      <b>{tour.label}</b>
      <span className="text-warm-600">
        {' · '}
        {draft.date ? formatDateLong(draft.date) : '날짜 미선택'}
        {' · '}
        {draft.slot ? formatSlot(draft.slot) : '시간 미선택'}
        {' · '}방문자 {draft.visitors.length}명
        {draft.language === 'foreign' && ` · ${languageSummary(draft)}`}
      </span>
    </p>
  )

  const errorBox = error && (
    <p role="alert" className="flex items-start gap-2 border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">
      <CircleAlert width={16} height={16} className="mt-0.5 shrink-0" />
      {error}
    </p>
  )

  const submitButton = (
    <Button type="submit" disabled={status === 'sending'} className="whitespace-nowrap">
      {status === 'sending' ? '접수 중…' : '예약 신청하기'}
    </Button>
  )

  const sections = (
    <div className="space-y-10">
      <div className="grid gap-8 md:grid-cols-[320px_1fr]">
        <section id={sectionId('schedule')} className="scroll-mt-24">
          <SectionTitle index="01">투어 · 일정</SectionTitle>
          <SchedulePicker
            tour={draft.tour}
            date={draft.date}
            slot={draft.slot}
            busy={busy}
            closedDays={closedDays}
            onChange={patch}
          />
        </section>

        <section id={sectionId('host')} className="scroll-mt-24">
          <SectionTitle index="02" aside={<span className="text-[12px] text-warm-600">예약을 신청하고 결과를 받을 분</span>}>
            신청 담당자
          </SectionTitle>
          <HostFields host={draft.host} onChange={(host) => patch({ host })} />
        </section>
      </div>

      <section id={sectionId('info')} className="scroll-mt-24">
        <SectionTitle index="03">방문 정보</SectionTitle>
        <VisitInfoFields draft={draft} onChange={patch} />
      </section>

      <section id={sectionId('visitors')} className="scroll-mt-24">
        <SectionTitle
          index="04"
          aside={<span className="text-[12px] text-warm-600">출입 · 주차 등록에 사용 · 단체는 엑셀 붙여넣기</span>}
        >
          방문자 명단
        </SectionTitle>
        <VisitorsFields visitors={draft.visitors} onChange={(visitors) => patch({ visitors })} defaultOrg={defaultOrg} />
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

      {/* 입력을 모두 마친 뒤 동의하도록 폼 맨 끝, 신청 버튼 바로 위에 둔다. */}
      <section id={sectionId('consent')} className="scroll-mt-24">
        <SectionTitle index="06">개인정보 수집 · 이용 동의</SectionTitle>
        <PrivacyConsent checked={draft.consent} onChange={(consent) => patch({ consent })} />
        <p className="mt-4 border-l-2 border-brand bg-cream px-4 py-3 text-[13px] text-warm-800">
          예약 신청 시 담당자에게 승인 요청이 전달되며, 일정 확정 후 입력하신 이메일로 확정 안내가 발송됩니다.
          {!isLiveBackend && (
            <span className="mt-1 block font-mono text-[11px] text-warm-600">
              ※ 예약 접수 서버 연결 전입니다. 연결 후 정상 접수됩니다.
            </span>
          )}
        </p>
      </section>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        {sections}
        <div className="mt-6 hidden items-center justify-end gap-4 lg:flex">
          {errorBox}
          {submitButton}
        </div>
      </div>
      {/* 데스크톱: 우측 고정 요약 패널 / 모바일: 하단 고정 바 */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4 border border-warm-300/50 bg-white p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-brand">신청 요약</p>
          {summary}
          <div className="border-t border-warm-300/40 pt-3">
            <p className="mb-2 text-[12px] text-warm-600">
              입력 진행 <b className="text-warm-800">{doneCount}</b> / {FORM_SECTIONS.length}
            </p>
            <ProgressSteps problems={problems} vertical />
          </div>
          {errorBox}
          <div className="[&>button]:w-full">{submitButton}</div>
        </div>
      </aside>
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-warm-300/50 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        {errorBox && <div className="mb-2">{errorBox}</div>}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {summary}
            <p className="text-[11px] text-warm-600">
              입력 진행 {doneCount} / {FORM_SECTIONS.length}
            </p>
          </div>
          {submitButton}
        </div>
      </div>
    </form>
  )
}
