import { useState, type ReactNode } from 'react'
import { Check, CircleAlert, ClipboardPaste, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field, Input, Label, Textarea } from '../ui/Field'
import {
  CATEGORY_LABEL,
  CLIENT_TYPE_LABEL,
  INDUSTRY_GROUPS,
  JOBS,
  MAIN_DIVISIONS,
  MAX_VISITORS,
  OTHER,
  FOREIGN_LANGUAGE,
  PURPOSES,
  TOUR_LANGUAGE_LABEL,
  emptyVisitor,
  type ClientType,
  type TourLanguage,
  type VisitCategory,
  type VisitDraft,
  type VisitHost,
  type Visitor,
} from '@/lib/visit'

type Patch = (patch: Partial<VisitDraft>) => void
/** 제출 시도 후 문제가 있는 칸의 키 목록 (missingFields). 없으면 오류 표시를 하지 않는다. */
type Errors = Set<string> | undefined

/** 선택형 묶음(칩 · 라디오) 아래에 붙는 오류 문구 */
export function GroupError({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null
  return (
    <p className="mt-1.5 flex items-center gap-1 text-[12px] text-brand">
      <CircleAlert width={13} height={13} className="shrink-0" />
      {children}
    </p>
  )
}

export function SectionTitle({
  index,
  children,
  aside,
  done,
}: {
  index?: string
  children: ReactNode
  aside?: ReactNode
  /** 섹션 입력이 끝나면 번호 자리에 체크를 보여준다. */
  done?: boolean
}) {
  if (!index) {
    return (
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-warm-300/40 pb-2">
        <h4 className="shrink-0 whitespace-nowrap text-[15px] font-bold text-warm-800">{children}</h4>
        {aside && <div className="hidden text-right sm:block">{aside}</div>}
      </div>
    )
  }
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-semibold transition',
          done ? 'bg-[#2f9e44] text-white' : 'bg-warm-800 text-white',
        )}
        aria-hidden
      >
        {done ? <Check width={14} height={14} strokeWidth={3} /> : index}
      </span>
      <h3 className="text-lg font-bold text-warm-800 md:text-xl">{children}</h3>
      {done && <span className="sr-only">입력 완료</span>}
      {aside && <div className="w-full pl-10 text-[13px] text-warm-600 sm:ml-auto sm:w-auto sm:pl-0">{aside}</div>}
    </div>
  )
}

/**
 * 선택형 버튼. 다중 선택(multi)은 체크박스 네모 대신 알약형 토글로,
 * 선택되면 체크 아이콘이 붙는다. 단일 선택은 같은 모양의 라디오 역할.
 */
export function Chip({
  selected,
  onClick,
  children,
  multi = true,
  disabled,
  className,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  multi?: boolean
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-9 items-center gap-1 rounded-full border px-3.5 py-1.5 text-[13px] transition',
        selected
          ? 'border-brand bg-brand text-white shadow-sm'
          : 'border-warm-300/70 bg-white text-warm-800 hover:border-brand/60 hover:text-brand',
        disabled && !selected && 'cursor-not-allowed opacity-40 hover:border-warm-300/70 hover:text-warm-800',
        className,
      )}
    >
      {multi && selected && <Check width={13} height={13} strokeWidth={3} className="-ml-0.5" />}
      {children}
    </button>
  )
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/** '기타' 체크 + 직접 입력. 값은 '기타' 또는 '기타: 입력값' 으로 저장됩니다. */
function OtherOption({
  values,
  onChange,
  placeholder,
  disabled,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  disabled?: boolean
}) {
  const current = values.find((value) => value.startsWith(OTHER))
  const text = current ? current.replace(/^기타:?\s*/, '') : ''
  const rest = values.filter((value) => !value.startsWith(OTHER))
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        selected={Boolean(current)}
        disabled={disabled && !current}
        onClick={() => onChange(current ? rest : [...rest, OTHER])}
      >
        {OTHER}
      </Chip>
      {current && (
        <Input
          value={text}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/,/g, ' ')
            onChange([...rest, cleaned ? `${OTHER}: ${cleaned}` : OTHER])
          }}
          placeholder={placeholder}
          maxLength={40}
          className="max-w-xs py-1.5"
          autoFocus
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ 담당자 */

export function HostFields({
  host,
  onChange,
  errors,
}: {
  host: VisitHost
  onChange: (host: VisitHost) => void
  errors?: Errors
}) {
  const bad = (key: keyof VisitHost) => Boolean(errors?.has(`host.${key}`))
  const set = (key: keyof VisitHost) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...host, [key]: e.target.value })
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="성함" required error={bad('name') ? '성함을 입력해 주세요.' : null}>
        <Input
          value={host.name}
          onChange={set('name')}
          required
          maxLength={40}
          placeholder="예) 홍길동"
          autoComplete="name"
          invalid={bad('name')}
        />
      </Field>
      <Field label="직책" required error={bad('title') ? '직책을 입력해 주세요.' : null}>
        <Input value={host.title} onChange={set('title')} required maxLength={40} placeholder="예) 책임" invalid={bad('title')} />
      </Field>
      <Field
        label="담당(실)"
        required
        hint="목록에서 고르거나 직접 입력"
        error={bad('division') ? '담당(실)을 입력해 주세요.' : null}
      >
        <Input
          value={host.division}
          onChange={set('division')}
          required
          maxLength={40}
          list="tdl-division-options"
          placeholder="예) CL운영담당"
          invalid={bad('division')}
        />
        <datalist id="tdl-division-options">
          {MAIN_DIVISIONS.map((division) => (
            <option key={division} value={division} />
          ))}
        </datalist>
      </Field>
      <Field label="조직명(팀)" required error={bad('org') ? '조직명을 입력해 주세요.' : null}>
        <Input
          value={host.org}
          onChange={set('org')}
          required
          maxLength={60}
          placeholder="예) 테크이노베이션팀"
          invalid={bad('org')}
        />
      </Field>
      <Field label="연락처" required error={bad('phone') ? '연락처를 입력해 주세요.' : null}>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={host.phone}
          onChange={set('phone')}
          required
          maxLength={30}
          placeholder="예) 010-1234-5678"
          invalid={bad('phone')}
        />
      </Field>
      <Field
        label="이메일"
        required
        hint="승인 결과가 이 주소로 발송됩니다."
        error={bad('email') ? '이메일 주소를 정확히 입력해 주세요.' : null}
      >
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={host.email}
          onChange={set('email')}
          required
          maxLength={120}
          placeholder="예) name@lxpantos.com"
          invalid={bad('email')}
        />
      </Field>
    </div>
  )
}

/* ---------------------------------------------------- 개인정보 동의 */

export function PrivacyConsent({
  checked,
  onChange,
  invalid,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  invalid?: boolean
}) {
  return (
    <div>
      <div
        className="h-40 overflow-y-auto border border-warm-300/60 bg-cream/60 px-4 py-3 text-[12px] leading-relaxed text-warm-600"
        tabIndex={0}
        aria-label="개인정보 수집·이용 동의 내용"
      >
        <p className="font-semibold text-warm-800">개인정보 수집 · 이용 동의 (필수)</p>
        <p className="mt-2">
          TDL(Tech Innovation Team)은 방문 예약 접수 및 출입 관리를 위해 아래와 같이 개인정보를 수집 · 이용합니다.
        </p>
        <p className="mt-2 font-semibold text-warm-800">1. 수집 항목</p>
        <p>
          · 담당자: 성함, 직책, 조직명, 연락처, 이메일
          <br />· 방문자: 성함, 직책, 조직명, 이메일, 방문 차량번호, 직무 구분
        </p>
        <p className="mt-2 font-semibold text-warm-800">2. 수집 · 이용 목적</p>
        <p>방문 예약 접수 및 일정 확정 안내, 출입 등록 및 주차 등록, 방문 현황 통계(개인 식별 불가 형태)</p>
        <p className="mt-2 font-semibold text-warm-800">3. 보유 및 이용 기간</p>
        <p>
          방문일로부터 <b>1년</b>간 보관 후 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간
          동안 보관합니다.
        </p>
        <p className="mt-2 font-semibold text-warm-800">4. 제3자 제공</p>
        <p>수집한 개인정보는 위 목적 외로 이용하거나 제3자에게 제공하지 않습니다.</p>
        <p className="mt-2 font-semibold text-warm-800">5. 동의 거부 권리 및 불이익</p>
        <p>
          개인정보 수집 · 이용에 대한 동의를 거부할 권리가 있습니다. 다만 필수 항목에 동의하지 않으시면 방문 예약
          신청이 제한됩니다.
        </p>
        <p className="mt-2">
          담당자는 방문자 정보를 입력하기 전에 방문자 본인에게 위 내용을 안내하고 동의를 받았음을 확인합니다.
        </p>
      </div>
      <label
        className={cn(
          'mt-3 flex cursor-pointer items-center gap-3 border px-4 py-3.5 text-[15px] text-warm-800 transition',
          checked
            ? 'border-brand bg-brand/5'
            : invalid
              ? 'border-brand/70 bg-brand/[0.03]'
              : 'border-warm-300/70 bg-white hover:border-warm-600/60',
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={invalid || undefined}
          className="h-5 w-5 shrink-0 accent-[var(--color-brand)]"
        />
        <span>
          위 개인정보 수집 · 이용에 <b>동의합니다</b>
          <span className="text-brand"> *</span>
        </span>
      </label>
    </div>
  )
}

const CATEGORY_HINT: Record<VisitCategory, string> = {
  internal: '임직원 · 사내 조직 · 해외법인 등',
  external: '기존 고객사 · 신규(잠재) 고객사',
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
        active ? 'border-brand' : 'border-warm-300',
      )}
    >
      {active && <span className="h-2 w-2 rounded-full bg-brand" />}
    </span>
  )
}

/** 투어 진행 언어 · 외국어 종류 · 방문 측 통역 동반 여부 */
function LanguageFields({ draft, onChange }: { draft: VisitDraft; onChange: Patch }) {
  const foreign = draft.language === 'foreign'
  return (
    <div className="border border-warm-300/50 bg-cream/40 p-4">
      <FieldLabel required>투어 진행 언어</FieldLabel>
      <div className="mt-1.5 flex flex-wrap items-center gap-2" role="radiogroup">
        {(Object.keys(TOUR_LANGUAGE_LABEL) as TourLanguage[]).map((language) => (
          <Chip
            key={language}
            multi={false}
            selected={draft.language === language}
            onClick={() =>
              onChange(
                language === 'ko'
                  ? { language, foreignLanguage: '', interpreter: false }
                  : { language, foreignLanguage: FOREIGN_LANGUAGE },
              )
            }
            className="min-w-20 justify-center"
          >
            {TOUR_LANGUAGE_LABEL[language]}
          </Chip>
        ))}
      </div>

      {foreign && (
        <div className="mt-4 border-t border-warm-300/40 pt-3">
          <FieldLabel required>방문 측(고객사) 통역 동반</FieldLabel>
          <div className="mt-1.5 flex flex-wrap items-center gap-2" role="radiogroup">
            <Chip multi={false} selected={draft.interpreter} onClick={() => onChange({ interpreter: true })}>
              통역 동반
            </Chip>
            <Chip multi={false} selected={!draft.interpreter} onClick={() => onChange({ interpreter: false })}>
              통역 없음
            </Chip>
            <span className="text-[12px] text-warm-600">
              {draft.interpreter
                ? '고객사 통역이 함께 오면 한국어로 안내하고 통역이 전달합니다.'
                : '통역 없이 오시는 경우 영어로 안내 가능한 인력을 배정합니다.'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------ 방문 구분 · 고객사 */

const MAX_INDUSTRIES = 3

/** 방문 유형 · 고객 유형 · 업체명 · 업종 */
export function CompanyFields({
  draft,
  onChange,
  errors,
  hideInternalCompany,
}: {
  draft: VisitDraft
  onChange: Patch
  errors?: Errors
  /** 예약 화면: 내부 방문은 방문 조직명을 받지 않는다 (신청 담당자 정보로 대신 채움). */
  hideInternalCompany?: boolean
}) {
  const external = draft.category === 'external'
  const industryFull = draft.industries.length >= MAX_INDUSTRIES
  return (
    <div className="space-y-6">
      <div>
        <FieldLabel required>방문 유형</FieldLabel>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup">
          {(Object.keys(CATEGORY_LABEL) as VisitCategory[]).map((category) => {
            const active = draft.category === category
            return (
              <button
                key={category}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() =>
                  onChange({
                    category,
                    clientType: category === 'external' ? (draft.clientType ?? 'existing') : undefined,
                    industries: category === 'external' ? draft.industries : [],
                  })
                }
                className={cn(
                  'flex items-center gap-3 border px-4 py-3 text-left transition',
                  active ? 'border-brand bg-brand/5' : 'border-warm-300/70 hover:border-brand/60',
                )}
              >
                <RadioDot active={active} />
                <span>
                  <span className={cn('block text-sm font-semibold', active ? 'text-brand' : 'text-warm-800')}>
                    {CATEGORY_LABEL[category]}
                  </span>
                  <span className="block text-[12px] text-warm-600">{CATEGORY_HINT[category]}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {external && (
          <div>
            <FieldLabel required>고객 유형</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
              {(Object.keys(CLIENT_TYPE_LABEL) as ClientType[]).map((clientType) => (
                <Chip
                  key={clientType}
                  multi={false}
                  selected={draft.clientType === clientType}
                  onClick={() => onChange({ clientType })}
                  className="min-w-28 justify-center"
                >
                  {CLIENT_TYPE_LABEL[clientType]}
                </Chip>
              ))}
            </div>
            <GroupError show={Boolean(errors?.has('clientType'))}>고객 유형을 선택해 주세요.</GroupError>
          </div>
        )}
        {(external || !hideInternalCompany) && (
          <div className={external ? undefined : 'sm:col-span-2'}>
            <Field
              label={external ? '업체명' : '방문 조직명'}
              required
              error={errors?.has('company') ? (external ? '업체명을 입력해 주세요.' : '방문 조직명을 입력해 주세요.') : null}
            >
              <Input
                value={draft.company}
                onChange={(e) => onChange({ company: e.target.value })}
                required
                maxLength={60}
                placeholder={external ? '예) LX판토스' : '예) CL사업담당 풀필먼트팀'}
                invalid={errors?.has('company')}
              />
            </Field>
          </div>
        )}
      </div>

      {external && (
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <FieldLabel required>업종</FieldLabel>
            <span className="text-[12px] text-warm-600">
              주 업종부터 최대 {MAX_INDUSTRIES}개 · <b className="font-semibold text-warm-800">{draft.industries.length}</b>개
              선택
            </span>
          </div>
          <div className="mt-2 space-y-2.5">
            {INDUSTRY_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-wrap items-center gap-2">
                <span className="w-full shrink-0 text-[12px] text-warm-600 sm:w-24">{group.label}</span>
                {group.items.map((item) => (
                  <Chip
                    key={item}
                    selected={draft.industries.includes(item)}
                    disabled={industryFull && !draft.industries.includes(item)}
                    onClick={() => onChange({ industries: toggle(draft.industries, item) })}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-full shrink-0 text-[12px] text-warm-600 sm:w-24">그 외</span>
              <OtherOption
                values={draft.industries}
                onChange={(industries) => onChange({ industries })}
                placeholder="업종 직접 입력"
                disabled={industryFull}
              />
            </div>
          </div>
          <GroupError show={Boolean(errors?.has('industries'))}>
            {draft.industries.includes(OTHER) ? '기타 업종을 입력해 주세요.' : '업종을 하나 이상 선택해 주세요.'}
          </GroupError>
        </div>
      )}
    </div>
  )
}

/** 방문 목적 · 투어 진행 언어 · 담당자 의견 */
export function PurposeFields({ draft, onChange, errors }: { draft: VisitDraft; onChange: Patch; errors?: Errors }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <FieldLabel required>방문 목적</FieldLabel>
          <span className="text-[12px] text-warm-600">해당하는 항목 모두 선택</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {PURPOSES.map((purpose) => (
            <Chip
              key={purpose}
              selected={draft.purposes.includes(purpose)}
              onClick={() => onChange({ purposes: toggle(draft.purposes, purpose) })}
            >
              {purpose}
            </Chip>
          ))}
          <OtherOption
            values={draft.purposes}
            onChange={(purposes) => onChange({ purposes })}
            placeholder="방문 목적 직접 입력"
          />
        </div>
        <GroupError show={Boolean(errors?.has('purposes'))}>
          {draft.purposes.includes(OTHER) ? '기타 방문 목적을 입력해 주세요.' : '방문 목적을 하나 이상 선택해 주세요.'}
        </GroupError>
      </div>

      <LanguageFields draft={draft} onChange={onChange} />

      <Field label="담당자 의견" optional hint="방문 배경, 고객사 니즈 등 안내에 참고할 내용을 적어주세요.">
        <Textarea
          rows={3}
          value={draft.hostComment}
          onChange={(e) => onChange({ hostComment: e.target.value })}
          maxLength={500}
        />
      </Field>
    </div>
  )
}

/** 관리자 수정 화면용: 방문 기관과 방문 목적을 한 번에 */
export function VisitInfoFields({ draft, onChange }: { draft: VisitDraft; onChange: Patch }) {
  return (
    <div className="space-y-6">
      <CompanyFields draft={draft} onChange={onChange} />
      <PurposeFields draft={draft} onChange={onChange} />
    </div>
  )
}

export function FieldLabel({ children, required, optional }: { children: ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <Label required={required} optional={optional}>
      {children}
    </Label>
  )
}

/* ------------------------------------------------------------ 방문자 */

const VISITOR_COLUMNS = '성함 · 직책 · 조직명 · 이메일 · 차량번호 · 직무'
const rowGrid = 'md:grid-cols-[28px_1fr_0.8fr_1.2fr_1.6fr_1fr_1fr_28px]'

/** 엑셀/표에서 복사한 줄들을 방문자 목록으로 바꾼다. (탭 또는 쉼표 구분) */
function parseVisitorRows(text: string, defaultOrg: string): Visitor[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.includes('\t') ? line.split('\t') : line.split(',')).map((cell) => cell.trim()))
    .filter((cells) => !/^(성함|이름|name)$/i.test(cells[0] ?? ''))
    .map(([name = '', title = '', org = '', email = '', car = '', job = '']) => ({
      name,
      title,
      org: org || defaultOrg,
      email,
      car,
      jobs: JOBS.includes(job) ? [job] : [],
    }))
}

const isEmptyVisitor = (visitor: Visitor) =>
  !visitor.name && !visitor.title && !visitor.email && !visitor.car && visitor.jobs.length === 0

/**
 * 방문자 명단. 한 사람을 한 줄로 입력하고(데스크톱은 표, 모바일은 카드),
 * 직무는 드롭다운 하나로 고른다. 단체 방문은 엑셀에서 붙여넣기로 한 번에 등록.
 */
export function VisitorsFields({
  visitors,
  onChange,
  defaultOrg = '',
  errors,
}: {
  visitors: Visitor[]
  onChange: (visitors: Visitor[]) => void
  /** 새 방문자의 조직명 기본값 (보통 업체명) */
  defaultOrg?: string
  errors?: Errors
}) {
  const bad = (index: number, key: 'name' | 'title' | 'org' | 'email') => Boolean(errors?.has(`visitor.${index}.${key}`))
  const rowHasError = (index: number) => (['name', 'title', 'org', 'email'] as const).some((key) => bad(index, key))
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteResult, setPasteResult] = useState<string | null>(null)

  const update = (index: number, patch: Partial<Visitor>) =>
    onChange(visitors.map((visitor, i) => (i === index ? { ...visitor, ...patch } : visitor)))
  const full = visitors.length >= MAX_VISITORS

  const applyPaste = () => {
    const parsed = parseVisitorRows(pasteText, defaultOrg)
    if (parsed.length === 0) {
      setPasteResult('붙여넣은 내용에서 방문자를 찾지 못했습니다.')
      return
    }
    const base = visitors.filter((visitor) => !isEmptyVisitor(visitor))
    const room = MAX_VISITORS - base.length
    const added = parsed.slice(0, Math.max(0, room))
    onChange([...base, ...added])
    setPasteText('')
    setPasteOpen(false)
    setPasteResult(
      added.length < parsed.length
        ? `${added.length}명을 추가했습니다. 최대 ${MAX_VISITORS}명이라 ${parsed.length - added.length}명은 제외했습니다.`
        : `${added.length}명을 추가했습니다. 빈칸이 있으면 표에서 채워 주세요.`,
    )
  }

  const cellLabel = 'mb-1 block text-[12px] font-semibold text-warm-800 md:sr-only'
  const cellInput = 'py-2'

  return (
    <div>
      <div className={cn('hidden gap-2 border-b border-warm-300/50 pb-2 text-[12px] font-semibold text-warm-800 md:grid', rowGrid)}>
        <span>#</span>
        <span>
          성함<span className="text-brand">*</span>
        </span>
        <span>
          직책<span className="text-brand">*</span>
        </span>
        <span>
          조직명<span className="text-brand">*</span>
        </span>
        <span>
          이메일<span className="text-brand">*</span>
        </span>
        <span>
          차량번호 <span className="font-normal text-warm-600">선택</span>
        </span>
        <span>
          직무 <span className="font-normal text-warm-600">선택</span>
        </span>
        <span />
      </div>

      <ol className="divide-y divide-warm-300/40">
        {visitors.map((visitor, index) => (
          <li
            key={index}
            className={cn(
              'relative grid grid-cols-2 gap-2 py-3 md:items-center md:py-2',
              rowGrid,
              rowHasError(index) && 'bg-brand/[0.02]',
            )}
          >
            <span className="col-span-2 font-mono text-[12px] font-semibold text-warm-800 md:col-span-1 md:text-center md:font-normal md:text-warm-600">
              <span className="md:hidden">방문자 </span>
              {index + 1}
            </span>
            <label>
              <span className={cellLabel}>성함 *</span>
              <Input
                aria-label={`방문자 ${index + 1} 성함`}
                value={visitor.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="홍길동"
                invalid={bad(index, 'name')}
                maxLength={40}
                className={cellInput}
              />
            </label>
            <label>
              <span className={cellLabel}>직책 *</span>
              <Input
                aria-label={`방문자 ${index + 1} 직책`}
                value={visitor.title}
                onChange={(e) => update(index, { title: e.target.value })}
                placeholder="책임"
                invalid={bad(index, 'title')}
                maxLength={40}
                className={cellInput}
              />
            </label>
            <label className="col-span-2 md:col-span-1">
              <span className={cellLabel}>조직명 *</span>
              <Input
                aria-label={`방문자 ${index + 1} 조직명`}
                value={visitor.org}
                onChange={(e) => update(index, { org: e.target.value })}
                placeholder="소속 조직"
                invalid={bad(index, 'org')}
                maxLength={60}
                className={cellInput}
              />
            </label>
            <label className="col-span-2 md:col-span-1">
              <span className={cellLabel}>이메일 *</span>
              <Input
                type="email"
                inputMode="email"
                aria-label={`방문자 ${index + 1} 이메일`}
                value={visitor.email}
                onChange={(e) => update(index, { email: e.target.value })}
                placeholder="name@company.com"
                invalid={bad(index, 'email')}
                maxLength={120}
                className={cellInput}
              />
            </label>
            <label>
              <span className={cellLabel}>
                차량번호 <span className="font-normal text-warm-600">선택 · 주차 등록</span>
              </span>
              <Input
                aria-label={`방문자 ${index + 1} 차량번호`}
                value={visitor.car}
                onChange={(e) => update(index, { car: e.target.value })}
                maxLength={20}
                placeholder="00가0000"
                className={cellInput}
              />
            </label>
            <label>
              <span className={cellLabel}>
                직무 <span className="font-normal text-warm-600">선택</span>
              </span>
              <select
                aria-label={`방문자 ${index + 1} 직무`}
                value={visitor.jobs[0] ?? ''}
                onChange={(e) => update(index, { jobs: e.target.value ? [e.target.value] : [] })}
                className="w-full border border-warm-300/70 bg-white px-2 py-2 text-sm text-warm-800 outline-none transition focus:border-brand"
              >
                <option value="">선택</option>
                {JOBS.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </select>
            </label>
            {visitors.length > 1 ? (
              <button
                type="button"
                onClick={() => onChange(visitors.filter((_, i) => i !== index))}
                aria-label={`방문자 ${index + 1} 삭제`}
                className="absolute right-0 top-2.5 flex h-7 w-7 items-center justify-center text-warm-300 transition hover:text-brand md:static"
              >
                <X width={16} height={16} />
              </button>
            ) : (
              <span className="hidden md:block" />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={full}
          onClick={() => onChange([...visitors, { ...emptyVisitor(), org: defaultOrg }])}
          className="inline-flex items-center gap-1.5 border border-dashed border-warm-300 px-4 py-2 text-sm font-semibold text-warm-600 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus width={14} height={14} /> 방문자 추가
        </button>
        <button
          type="button"
          disabled={full}
          onClick={() => setPasteOpen((open) => !open)}
          aria-expanded={pasteOpen}
          className="inline-flex items-center gap-1.5 border border-warm-300/70 px-4 py-2 text-sm font-semibold text-warm-600 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ClipboardPaste width={14} height={14} /> 엑셀에서 붙여넣기
        </button>
        <span className="ml-auto font-mono text-[11px] text-warm-600">
          {visitors.length} / {MAX_VISITORS}명
        </span>
      </div>

      {pasteOpen && (
        <div className="mt-3 border border-warm-300/60 bg-cream/50 p-3">
          <p className="text-[12px] text-warm-800">
            엑셀에서 <b>{VISITOR_COLUMNS}</b> 순서의 열을 복사해 붙여넣으세요. 한 줄이 한 명입니다.
            {defaultOrg && ' 조직명이 비어 있으면 업체명으로 채웁니다.'}
          </p>
          <Textarea
            rows={5}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'홍길동\t팀장\t물류혁신팀\thong@company.com\t12가3456\t운영'}
            className="mt-2 font-mono text-[12px]"
            aria-label="방문자 명단 붙여넣기"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPasteOpen(false)}
              className="px-3 py-1.5 text-sm text-warm-600 hover:text-warm-800"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={applyPaste}
              className="bg-warm-800 px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              명단 추가
            </button>
          </div>
        </div>
      )}
      {pasteResult && (
        <p className="mt-2 font-mono text-[11px] text-warm-600" role="status">
          {pasteResult}
        </p>
      )}
    </div>
  )
}
