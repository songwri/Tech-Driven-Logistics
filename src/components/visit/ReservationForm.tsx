import { useMemo, useState } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Field'
import { SchedulePicker } from './SchedulePicker'
import { CompanyFields, HostFields, PrivacyConsent, PurposeFields, SectionTitle, VisitorsFields } from './VisitFields'
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
  missingFields,
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
  flagged,
}: {
  problems: Record<FormSection, string | null>
  vertical?: boolean
  /** 신청을 눌러 본 뒤에는 남은 섹션을 빨간색으로 표시한다. */
  flagged?: boolean
}) {
  return (
    <ol className={cn('flex gap-2', vertical ? 'flex-col' : 'flex-wrap')}>
      {FORM_SECTIONS.map((section, index) => {
        const done = problems[section.id] === null
        const missing = flagged && !done
        return (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'inline-flex items-center gap-2 text-[13px] transition hover:text-brand',
                done ? 'text-warm-800' : missing ? 'font-semibold text-brand' : 'text-warm-600',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-semibold',
                  done
                    ? 'border-[#2f9e44] bg-[#2f9e44] text-white'
                    : missing
                      ? 'border-brand text-brand'
                      : 'border-warm-300 text-warm-600',
                )}
                aria-hidden
              >
                {done ? <Check width={10} height={10} strokeWidth={3.5} /> : index + 1}
              </span>
              {section.label}
              <span className="sr-only">{done ? '완료' : '입력 필요'}</span>
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
  // 한 번 신청을 눌러 본 뒤부터 칸마다 오류를 표시한다 (처음부터 빨간 칸이 가득하지 않게).
  const [showErrors, setShowErrors] = useState(false)

  const patch = (next: Partial<VisitDraft>) => {
    setDraft((current) => ({ ...current, ...next }))
    setError(null)
  }
  const problems = useMemo(() => sectionProblems(draft), [draft])
  const doneCount = FORM_SECTIONS.filter((section) => problems[section.id] === null).length
  const errors = useMemo(() => (showErrors ? missingFields(draft) : undefined), [showErrors, draft])
  const openProblems = FORM_SECTIONS.filter((section) => problems[section.id] !== null)
  const tour = TOUR_BY_ID[draft.tour]
  const defaultOrg = draft.category === 'external' ? draft.company.trim() : ''

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const problem = firstProblem(draft)
    if (problem) {
      setShowErrors(true)
      setError(
        openProblems.length > 1 ? `${openProblems.length}개 섹션에 입력이 필요합니다. ${problem.message}` : problem.message,
      )
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
              setShowErrors(false)
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

  const summaryRows: [string, string | null][] = [
    ['투어', tour.label],
    ['날짜', draft.date ? formatDateLong(draft.date) : null],
    ['시간', draft.slot ? formatSlot(draft.slot) : null],
    ['인원', `${draft.visitors.length}명${draft.language === 'foreign' ? ` · ${languageSummary(draft)}` : ''}`],
  ]

  const summaryList = (
    <dl className="grid grid-cols-[40px_1fr] gap-y-2 text-[13px]">
      {summaryRows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-warm-600">{label}</dt>
          <dd className={cn('font-semibold tabular-nums', value ? 'text-warm-800' : 'font-normal text-warm-300')}>
            {value ?? '선택 전'}
          </dd>
        </div>
      ))}
    </dl>
  )

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
    <div className="space-y-14">
      <section id={sectionId('schedule')} className="scroll-mt-24">
        <SectionTitle index="1" done={problems.schedule === null}>
          투어 · 일정
        </SectionTitle>
        <SchedulePicker
          tour={draft.tour}
          date={draft.date}
          slot={draft.slot}
          busy={busy}
          closedDays={closedDays}
          onChange={patch}
          errors={errors}
          wide
        />
      </section>

      <section id={sectionId('host')} className="scroll-mt-24">
        <SectionTitle index="2" done={problems.host === null} aside="예약을 신청하고 승인 결과를 받을 분">
          신청 담당자
        </SectionTitle>
        <HostFields host={draft.host} onChange={(host) => patch({ host })} errors={errors} />
      </section>

      <section id={sectionId('company')} className="scroll-mt-24">
        <SectionTitle index="3" done={problems.company === null}>
          방문 기관
        </SectionTitle>
        <CompanyFields draft={draft} onChange={patch} errors={errors} />
      </section>

      <section id={sectionId('purpose')} className="scroll-mt-24">
        <SectionTitle index="4" done={problems.purpose === null}>
          방문 목적 · 언어
        </SectionTitle>
        <PurposeFields draft={draft} onChange={patch} errors={errors} />
      </section>

      <section id={sectionId('visitors')} className="scroll-mt-24">
        <SectionTitle
          index="5"
          done={problems.visitors === null}
          aside="출입 · 주차 등록에 사용 · 단체는 엑셀 붙여넣기"
        >
          방문자 명단
        </SectionTitle>
        <VisitorsFields
          visitors={draft.visitors}
          onChange={(visitors) => patch({ visitors })}
          defaultOrg={defaultOrg}
          errors={errors}
        />
        {showErrors && problems.visitors && (
          <p className="mt-2 flex items-center gap-1 text-[12px] text-brand">
            <CircleAlert width={13} height={13} className="shrink-0" />
            {problems.visitors}
          </p>
        )}
      </section>

      <section>
        <SectionTitle index="6" aside="선택 입력">
          기타 요청사항
        </SectionTitle>
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
        <SectionTitle index="7" done={problems.consent === null}>
          개인정보 수집 · 이용 동의
        </SectionTitle>
        <PrivacyConsent
          checked={draft.consent}
          onChange={(consent) => patch({ consent })}
          invalid={Boolean(errors?.has('consent'))}
        />
        <p className="mt-4 border-l-2 border-brand bg-cream px-4 py-3 text-[13px] text-warm-800">
          예약 신청 시 담당자에게 승인 요청이 전달되며, 일정 확정 후 입력하신 이메일로 확정 안내가 발송됩니다.
          {!isLiveBackend && (
            <span className="mt-1 block text-[12px] text-warm-600">
              ※ 예약 접수 서버 연결 전입니다. 연결 후 정상 접수됩니다.
            </span>
          )}
        </p>
      </section>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-10 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        {sections}
        <div className="mt-6 hidden items-center justify-end gap-4 lg:flex">
          {errorBox}
          {submitButton}
        </div>
      </div>
      {/* 데스크톱: 우측 고정 요약 패널 / 모바일: 하단 고정 바 */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-5 border border-warm-300/50 bg-white p-5">
          <p className="text-[15px] font-bold text-warm-800">신청 요약</p>
          {summaryList}
          <div className="border-t border-warm-300/40 pt-4">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[13px] font-semibold text-warm-800">입력 진행</p>
              <p className="font-mono text-[13px] tabular-nums text-warm-600">
                <b className="text-warm-800">{doneCount}</b> / {FORM_SECTIONS.length}
              </p>
            </div>
            <div className="mb-3 h-1 overflow-hidden bg-warm-300/30">
              <div
                className="h-full bg-[#2f9e44] transition-[width] duration-300"
                style={{ width: `${(doneCount / FORM_SECTIONS.length) * 100}%` }}
              />
            </div>
            <ProgressSteps problems={problems} vertical flagged={showErrors} />
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
            <p className="text-[12px] tabular-nums text-warm-600">
              입력 진행 {doneCount} / {FORM_SECTIONS.length}
            </p>
          </div>
          {submitButton}
        </div>
      </div>
    </form>
  )
}
