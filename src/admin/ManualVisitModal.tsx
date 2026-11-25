import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { RelaxedFormContext } from '@/components/ui/relaxed'
import { TimeField } from '@/components/ui/TimeField'
import { CompanyFields, HostFields, PurposeFields, SectionTitle, VisitorsFields } from '@/components/visit/VisitFields'
import { cn } from '@/lib/utils'
import {
  normalizeIndustry,
  STATUS_LABEL,
  toursForSite,
  type AdminSite,
  formatDateShort,
  type Visitor,
  type VisitDraft,
  type VisitRequest,
  type VisitStatus,
} from '@/lib/visit'
import type { ManualInput } from './importLegacy'
import { feedbackRecipientCount } from './feedbackMail'
import { opsFromRequest, opsToRequest, type OpsValue } from './opsRecord'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MANUAL_STATUSES: VisitStatus[] = ['approved', 'completed', 'pending', 'cancelled', 'rejected']


function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="inline-flex border border-warm-300/60 bg-white" role="radiogroup" aria-label={label}>
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'px-3 py-2 text-[13px] font-semibold transition',
            value === option ? 'bg-warm-800 text-white' : 'text-warm-600 hover:text-warm-800',
          )}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function OpsFields({
  value,
  onChange,
  listedHeadcount,
}: {
  value: OpsValue
  onChange: (value: OpsValue) => void
  /** 웹 예약의 방문자 명단 인원. 주면 '실제 방문 인원' 칸을 보여준다 (수기 등록은 방문 인원수 칸을 따로 쓴다). */
  listedHeadcount?: number
}) {
  const set = (patch: Partial<OpsValue>) => onChange({ ...value, ...patch })
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {listedHeadcount !== undefined && (
        <Field
          label="실제 방문 인원"
          hint={`단체 방문처럼 신청 명단(${listedHeadcount}명)과 다를 때 입력 · 비우면 명단 인원으로 집계`}
        >
          <Input
            inputMode="numeric"
            value={value.actualHeadcount}
            onChange={(e) => set({ actualHeadcount: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
            placeholder={String(listedHeadcount)}
          />
        </Field>
      )}
      <Field label="주요 인원" hint="줄바꿈 또는 쉼표로 구분">
        <Textarea rows={3} value={value.keyPersons} onChange={(e) => set({ keyPersons: e.target.value })} placeholder="홍길동 상무" />
      </Field>
      <Field label="가이드" hint="줄바꿈으로 구분 · 인솔자는 '(인솔자)' 표시 · 가이드 배정 메뉴에서 고를 수 있음">
        <Textarea rows={3} value={value.guides} onChange={(e) => set({ guides: e.target.value })} placeholder={'홍길동 책임\n김철수 선임'} />
      </Field>
      <Field label="유관 부서" hint="쉼표로 구분 (예: 풀필먼트영업팀, SC품질팀)">
        <Input value={value.departments} onChange={(e) => set({ departments: e.target.value })} />
      </Field>
      <Field label="후속 진행 현황">
        <Textarea rows={3} value={value.followUp} onChange={(e) => set({ followUp: e.target.value })} placeholder="PoC 논의, 견적 요청 등" />
      </Field>
    </div>
  )
}

const blankHost = { name: '', title: '', division: '', org: '', phone: '', email: '' }

/**
 * 수기 등록 · 수기 기록 수정.
 * 신청 화면(reserve)과 같은 순서 · 같은 입력 칸(투어 · 일정 → 담당자 → 방문 기관 → 방문 목적 · 언어 → 방문자 명단)으로 입력한다.
 * 다른 점: 요일 · 시간 제한이 없고(시간 미정 가능), 업체(기관)명과 방문일 외에는 필수가 아니며, 개인정보 동의는 받지 않는다.
 */
export function ManualVisitModal({
  site,
  initial,
  onClose,
  onSubmit,
  partnerSuggestions,
}: {
  /** 파트너사명 칸에 제안할 이미 기록된 이름 */
  partnerSuggestions?: string[]
  /** 이 관리자 페이지에서 고를 수 있는 투어만 보여준다 (시화MTV 페이지는 시화MTV 가 들어간 투어) */
  site: AdminSite
  /** 있으면 수정, 없으면 새 등록 */
  initial?: VisitRequest
  onClose: () => void
  onSubmit: (input: ManualInput) => Promise<void>
}) {
  const tours = toursForSite(site)
  const [draft, setDraft] = useState<VisitDraft>(() => ({
    tour: initial?.tour ?? (site === 'mtv' ? 'mtv' : 'other'),
    date: initial?.date ?? '',
    slot: initial?.slot ?? '',
    category: initial?.category ?? 'external',
    clientType: initial?.clientType,
    partnerName: initial?.partnerName ?? '',
    language: initial?.language ?? 'ko',
    foreignLanguage: initial?.foreignLanguage ?? '',
    interpreter: initial?.interpreter ?? false,
    interpreterLanguage: initial?.interpreterLanguage ?? '',
    company: initial?.company ?? '',
    // 업종: 예전 값은 현재 분류로 옮겨 보여 준다.
    industries: initial?.industries[0] ? [normalizeIndustry(initial.industries[0])] : [],
    purposes: initial?.purposes ?? [],
    host: { ...blankHost, ...initial?.host },
    hostComment: initial?.hostComment ?? '',
    visitors: initial?.visitors ?? [],
    note: initial?.note ?? '',
    consent: false,
  }))
  const patch = (change: Partial<VisitDraft>) => setDraft((current) => ({ ...current, ...change }))
  const [start, setStart] = useState(initial?.slot.split('-')[0] ?? '')
  const [end, setEnd] = useState(initial?.slot.split('-')[1] ?? '')
  const [status, setStatus] = useState<VisitStatus>(initial?.status ?? 'approved')
  const [headcount, setHeadcount] = useState(initial?.headcount != null ? String(initial.headcount) : '')
  // 방문 완료로 바꿀 때 방문자 명단 이메일로 방명록(만족도 · 개선 의견) 요청 메일을 보낼지. 기본은 보내지 않음.
  const [feedbackMail, setFeedbackMail] = useState(initial?.feedbackMail ?? false)
  const [ops, setOps] = useState(() => opsFromRequest(initial ?? {}))
  const [memo, setMemo] = useState(initial?.adminMemo ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const visitors: Visitor[] = draft.visitors

  const submit = async () => {
    if (!draft.date) return setError('방문일을 입력해 주세요.')
    if (!draft.company.trim()) return setError(`${draft.category === 'internal' ? '방문 조직' : '업체(기관)'}명을 입력해 주세요.`)
    if ((start && !end) || (!start && end)) return setError('시작 · 종료 시간을 모두 입력하거나 둘 다 비워 두세요. (비우면 시간 미정)')
    if (start && end && start >= end) return setError('종료 시간이 시작 시간보다 늦어야 합니다.')
    const count = headcount.trim() === '' ? undefined : Number(headcount)
    if (count !== undefined && !(Number.isInteger(count) && count >= 0)) return setError('방문 인원수는 0 이상의 숫자로 입력해 주세요.')

    // 완전히 빈 줄은 버리고, 성함 없이 다른 칸만 채운 줄과 형식이 틀린 이메일은 알려 준다.
    const listed = visitors.filter((v) => v.name.trim() || v.title.trim() || v.org.trim() || v.email.trim() || v.car.trim() || v.jobs.length > 0)
    const noName = listed.findIndex((v) => !v.name.trim())
    if (noName >= 0) return setError(`방문자 ${noName + 1}의 성함을 입력해 주세요. (이름이 없는 줄은 저장되지 않습니다)`)
    const badEmail = listed.findIndex((v) => v.email.trim() && !EMAIL.test(v.email.trim()))
    if (badEmail >= 0) return setError(`방문자 ${badEmail + 1}의 이메일 형식이 올바르지 않습니다.`)
    const trimmedVisitors = listed.map((v) => ({ ...v, name: v.name.trim(), title: v.title.trim(), org: v.org.trim(), email: v.email.trim(), car: v.car.trim() }))
    if (feedbackMail && feedbackRecipientCount({ visitors: trimmedVisitors }) === 0) {
      return setError('방명록 메일을 보내려면 방문자 명단에 이메일이 있는 사람이 한 명 이상 필요합니다.')
    }

    const external = draft.category === 'external'
    const input: ManualInput = {
      tour: draft.tour,
      date: draft.date,
      slot: start && end ? `${start}-${end}` : '',
      status,
      source: 'manual',
      category: draft.category,
      clientType: external ? draft.clientType : undefined,
      partnerName: external && draft.clientType === 'partner' ? (draft.partnerName ?? '').trim().replace(/,/g, ' ') : '',
      language: draft.language,
      foreignLanguage: draft.language === 'foreign' ? draft.foreignLanguage : '',
      interpreter: draft.interpreter,
      interpreterLanguage: draft.interpreter ? (draft.interpreterLanguage ?? '').trim() : '',
      company: draft.company.trim(),
      industries: external ? draft.industries.slice(0, 1) : [],
      purposes: draft.purposes.slice(0, 1),
      host: {
        name: draft.host.name.trim(),
        title: draft.host.title.trim(),
        division: draft.host.division.trim(),
        org: draft.host.org.trim(),
        phone: draft.host.phone.trim(),
        email: draft.host.email.trim(),
      },
      hostComment: draft.hostComment.trim(),
      visitors: trimmedVisitors,
      feedbackMail,
      headcount: count,
      note: draft.note.trim(),
      consent: false,
      adminMemo: memo.trim(),
      ...opsToRequest(ops),
    }
    setPending(true)
    setError(null)
    try {
      await onSubmit(input)
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '저장에 실패했습니다.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      eyebrow={initial ? 'Edit Record' : 'Manual Entry'}
      title={initial ? '방문 기록 수정' : '방문 수기 등록'}
      description={
        initial
          ? `${formatDateShort(initial.date)} · ${initial.company}`
          : '전화 · 메일로 잡힌 방문이나 지난 방문을 직접 기록합니다. 신청 화면과 같은 순서로 입력하며, 요일 · 시간 제한이 없고 같은 시간에 다른 예약이 있어도 등록됩니다(공동 진행).'
      }
      onClose={onClose}
      className="max-w-5xl"
    >
      <RelaxedFormContext.Provider value>
        <form
          noValidate
          className="space-y-12"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <section>
            <SectionTitle index="1" aside="요일 · 시간 제한 없음 · 시간은 비워 두면 미정">
              투어 · 일정
            </SectionTitle>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[13px] font-semibold text-warm-800">투어 종류</p>
                <div className="grid gap-2" role="radiogroup" aria-label="투어 종류">
                  {tours.map((item) => {
                    const active = item.id === draft.tour
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => patch({ tour: item.id })}
                        className={cn(
                          'flex items-center gap-3 border px-3.5 py-3 text-left transition',
                          active ? 'border-brand bg-brand/5' : 'border-warm-300/70 hover:border-brand/60',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                            active ? 'border-brand' : 'border-warm-300',
                          )}
                          aria-hidden
                        >
                          {active && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block text-[15px] font-bold', active ? 'text-brand' : 'text-ink')}>{item.label}</span>
                          {item.description && (
                            <span className={cn('mt-0.5 block text-[13px] font-medium', active ? 'text-brand/90' : 'text-warm-800')}>
                              {item.description}
                            </span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-4">
                <Field label="방문일" required strict>
                  <Input type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="시작 시간" hint="비우면 시간 미정">
                    <TimeField value={start} onChange={setStart} aria-label="시작 시간" />
                  </Field>
                  <Field label="종료 시간">
                    <TimeField value={end} onChange={setEnd} aria-label="종료 시간" />
                  </Field>
                </div>
                {!initial && (
                  <div>
                    <p className="mb-1.5 text-[13px] font-semibold text-warm-800">상태</p>
                    <Segmented
                      label="상태"
                      value={status}
                      onChange={setStatus}
                      options={MANUAL_STATUSES.map((item) => [item, STATUS_LABEL[item]] as const)}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <SectionTitle index="2" aside="모두 선택 입력 · 통계의 담당별 집계에는 담당(실)을 씁니다">
              신청 담당자
            </SectionTitle>
            <HostFields host={draft.host} onChange={(host) => patch({ host })} />
          </section>

          <section>
            <SectionTitle index="3">방문 기관</SectionTitle>
            <CompanyFields draft={draft} onChange={patch} partnerSuggestions={partnerSuggestions} />
          </section>

          <section>
            <SectionTitle index="4">방문 목적 · 언어</SectionTitle>
            <PurposeFields draft={draft} onChange={patch} />
          </section>

          <section>
            <SectionTitle index="5" aside="선택 사항 · 이메일을 넣으면 방문 완료 시 방명록 메일을 보낼 수 있습니다">
              방문자 명단
            </SectionTitle>
            <div className="mb-4 max-w-xs">
              <Field
                label="방문 인원수"
                hint={visitors.some((v) => v.name.trim()) ? '아래 명단이 있으면 명단 인원으로 집계됩니다' : '명단 없이 인원만 기록할 때 · 비우면 미정'}
              >
                <Input inputMode="numeric" value={headcount} onChange={(e) => setHeadcount(e.target.value.replace(/[^\d]/g, ''))} placeholder="6" />
              </Field>
            </div>
            <VisitorsFields visitors={visitors} onChange={(next) => patch({ visitors: next })} defaultOrg={draft.company.trim()} optional />
            <label className="mt-4 flex items-start gap-2 border border-warm-300/60 bg-white px-3 py-3 text-sm text-warm-800">
              <input
                type="checkbox"
                checked={feedbackMail}
                onChange={(e) => setFeedbackMail(e.target.checked)}
                disabled={Boolean(initial?.feedbackMailAt)}
                className="mt-0.5 accent-brand"
              />
              <span>
                <span className="font-semibold">방문 완료 시 방명록 요청 메일 보내기</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-warm-600">
                  {initial?.feedbackMailAt
                    ? '이미 발송한 예약입니다. 같은 예약에는 다시 보내지 않습니다.'
                    : `상태를 '방문 완료'로 바꾸는 순간 명단 전체(이메일이 있는 ${feedbackRecipientCount({ visitors })}명)에게 한 번만 발송합니다. 방문자에게 안내하고 동의를 받은 경우에만 켜 주세요. 이미 '방문 완료'로 등록하면 저장 직후 발송됩니다.`}
                </span>
              </span>
            </label>
          </section>

          <section>
            <SectionTitle index="6" aside="관리자만 보는 기록 · 웹 신청에는 없는 항목">
              운영 기록 · 메모
            </SectionTitle>
            <OpsFields value={ops} onChange={setOps} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="기타 요청사항" optional>
                <Textarea rows={2} value={draft.note} onChange={(e) => patch({ note: e.target.value })} maxLength={1000} />
              </Field>
              <Field label="관리자 메모" optional>
                <Textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
              </Field>
            </div>
          </section>

          {error && <p className="border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? '저장 중…' : initial ? '저장' : '등록'}
            </Button>
          </div>
        </form>
      </RelaxedFormContext.Provider>
    </Modal>
  )
}
