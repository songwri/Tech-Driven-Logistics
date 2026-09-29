import type { ReactNode } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field, Input, Textarea } from '../ui/Field'
import {
  CATEGORY_LABEL,
  CLIENT_TYPE_LABEL,
  INDUSTRY_GROUPS,
  JOBS,
  MAX_VISITORS,
  OTHER,
  PURPOSES,
  emptyVisitor,
  type ClientType,
  type VisitCategory,
  type VisitDraft,
  type VisitHost,
  type Visitor,
} from '@/lib/visit'

type Patch = (patch: Partial<VisitDraft>) => void

export function SectionTitle({ index, children, aside }: { index?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-warm-300/40 pb-2">
      <h4 className="flex items-baseline gap-2 text-[15px] font-bold text-warm-800">
        {index && <span className="font-mono text-xs text-brand">{index}</span>}
        {children}
      </h4>
      {aside}
    </div>
  )
}

export function Chip({
  selected,
  onClick,
  children,
  multi = true,
  className,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  multi?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 border px-3 py-1.5 text-[13px] transition',
        selected
          ? 'border-brand bg-brand/5 font-semibold text-brand'
          : 'border-warm-300/60 text-warm-800 hover:border-brand/60',
        className,
      )}
    >
      {multi && (
        <span
          className={cn(
            'flex h-3.5 w-3.5 items-center justify-center border',
            selected ? 'border-brand bg-brand text-white' : 'border-warm-300',
          )}
        >
          {selected && <Check width={10} height={10} strokeWidth={3} />}
        </span>
      )}
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
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
}) {
  const current = values.find((value) => value.startsWith(OTHER))
  const text = current ? current.replace(/^기타:?\s*/, '') : ''
  const rest = values.filter((value) => !value.startsWith(OTHER))
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip selected={Boolean(current)} onClick={() => onChange(current ? rest : [...rest, OTHER])}>
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

export function HostFields({ host, onChange }: { host: VisitHost; onChange: (host: VisitHost) => void }) {
  const set = (key: keyof VisitHost) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...host, [key]: e.target.value })
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="성함" required>
        <Input value={host.name} onChange={set('name')} required maxLength={40} placeholder="김대현" />
      </Field>
      <Field label="직책" required>
        <Input value={host.title} onChange={set('title')} required maxLength={40} placeholder="책임" />
      </Field>
      <Field label="조직명" required>
        <Input value={host.org} onChange={set('org')} required maxLength={60} placeholder="테크이노베이션팀" />
      </Field>
      <Field label="연락처" required>
        <Input type="tel" value={host.phone} onChange={set('phone')} required maxLength={30} placeholder="010-0000-0000" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="이메일" required hint="승인 결과가 이 주소로 안내됩니다.">
          <Input type="email" value={host.email} onChange={set('email')} required maxLength={120} placeholder="name@lxpantos.com" />
        </Field>
      </div>
    </div>
  )
}

/* ---------------------------------------------------- 개인정보 동의 */

export function PrivacyConsent({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
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
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-warm-800">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-brand)]"
        />
        <span>
          위 개인정보 수집 · 이용에 <b>동의합니다</b>
          <span className="text-brand"> *</span>
        </span>
      </label>
    </div>
  )
}

/* ------------------------------------------------ 방문 구분 · 고객사 */

export function VisitInfoFields({ draft, onChange }: { draft: VisitDraft; onChange: Patch }) {
  const external = draft.category === 'external'
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel required>방문 구분</FieldLabel>
          <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup">
            {(Object.keys(CATEGORY_LABEL) as VisitCategory[]).map((category) => (
              <Chip
                key={category}
                multi={false}
                selected={draft.category === category}
                onClick={() =>
                  onChange({
                    category,
                    clientType: category === 'external' ? (draft.clientType ?? 'existing') : undefined,
                    industries: category === 'external' ? draft.industries : [],
                  })
                }
                className="min-w-20 justify-center"
              >
                {CATEGORY_LABEL[category]}
              </Chip>
            ))}
            {external &&
              (Object.keys(CLIENT_TYPE_LABEL) as ClientType[]).map((clientType) => (
                <Chip
                  key={clientType}
                  multi={false}
                  selected={draft.clientType === clientType}
                  onClick={() => onChange({ clientType })}
                >
                  {CLIENT_TYPE_LABEL[clientType]}
                </Chip>
              ))}
          </div>
        </div>
        <Field label={external ? '업체명' : '방문 조직명'} required>
          <Input
            value={draft.company}
            onChange={(e) => onChange({ company: e.target.value })}
            required
            maxLength={60}
            placeholder={external ? 'LX판토스' : '예) CL사업담당 풀필먼트팀'}
          />
        </Field>
      </div>

      {external && (
        <div>
          <FieldLabel required>업종 (다중 선택)</FieldLabel>
          <div className="mt-1.5 space-y-2">
            {INDUSTRY_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-wrap items-center gap-2">
                <span className="w-24 shrink-0 font-mono text-[11px] text-warm-300">{group.label}</span>
                {group.items.map((item) => (
                  <Chip
                    key={item}
                    selected={draft.industries.includes(item)}
                    onClick={() => onChange({ industries: toggle(draft.industries, item) })}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 font-mono text-[11px] text-warm-300">그 외</span>
              <OtherOption
                values={draft.industries}
                onChange={(industries) => onChange({ industries })}
                placeholder="업종 직접 입력"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <FieldLabel required>방문 목적 (다중 선택)</FieldLabel>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
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
      </div>

      <Field label="담당자 의견" hint="방문 배경, 고객사 니즈 등 안내에 참고할 내용을 적어주세요.">
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

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-wider text-warm-600">
      {children}
      {required && <span className="text-brand"> *</span>}
    </span>
  )
}

/* ------------------------------------------------------------ 방문자 */

export function VisitorsFields({
  visitors,
  onChange,
}: {
  visitors: Visitor[]
  onChange: (visitors: Visitor[]) => void
}) {
  const update = (index: number, patch: Partial<Visitor>) =>
    onChange(visitors.map((visitor, i) => (i === index ? { ...visitor, ...patch } : visitor)))

  return (
    <div className="space-y-3">
      {visitors.map((visitor, index) => (
        <div key={index} className="border border-warm-300/50 bg-cream/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-warm-800">방문자 #{index + 1}</span>
            {visitors.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(visitors.filter((_, i) => i !== index))}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-warm-600 transition hover:text-brand"
              >
                <X width={12} height={12} /> 삭제
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="성함" required>
              <Input value={visitor.name} onChange={(e) => update(index, { name: e.target.value })} required maxLength={40} />
            </Field>
            <Field label="직책" required>
              <Input value={visitor.title} onChange={(e) => update(index, { title: e.target.value })} required maxLength={40} />
            </Field>
            <Field label="조직명" required>
              <Input value={visitor.org} onChange={(e) => update(index, { org: e.target.value })} required maxLength={60} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="이메일" required>
                <Input
                  type="email"
                  value={visitor.email}
                  onChange={(e) => update(index, { email: e.target.value })}
                  required
                  maxLength={120}
                />
              </Field>
            </div>
            <Field label="방문 차량번호" hint="주차 등록용">
              <Input value={visitor.car} onChange={(e) => update(index, { car: e.target.value })} maxLength={20} placeholder="12가3456" />
            </Field>
          </div>
          <div className="mt-3">
            <FieldLabel>직무 구분</FieldLabel>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {JOBS.map((job) => (
                <Chip
                  key={job}
                  selected={visitor.jobs.includes(job)}
                  onClick={() => update(index, { jobs: toggle(visitor.jobs, job) })}
                  className="px-2.5 py-1 text-[12px]"
                >
                  {job}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={visitors.length >= MAX_VISITORS}
        onClick={() => onChange([...visitors, emptyVisitor()])}
        className="flex w-full items-center justify-center gap-1.5 border border-dashed border-warm-300 py-2.5 text-sm font-semibold text-warm-600 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus width={14} height={14} /> 방문자 추가 ({visitors.length}/{MAX_VISITORS}명)
      </button>
    </div>
  )
}
