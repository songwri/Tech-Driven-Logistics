import { useState, type ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import {
  MAIN_DIVISIONS,
  STATUS_LABEL,
  TOURS,
  formatDateShort,
  type VisitRequest,
  type VisitStatus,
} from '@/lib/visit'
import type { ManualInput } from './importLegacy'
import { opsFromRequest, opsToRequest, splitComma, type OpsValue } from './opsRecord'

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

const selectClass =
  'w-full border border-warm-300/60 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition focus:border-brand'

export function OpsFields({ value, onChange }: { value: OpsValue; onChange: (value: OpsValue) => void }) {
  const set = (patch: Partial<OpsValue>) => onChange({ ...value, ...patch })
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="주요 인원" hint="줄바꿈 또는 쉼표로 구분">
        <Textarea rows={3} value={value.keyPersons} onChange={(e) => set({ keyPersons: e.target.value })} placeholder="홍길동 상무" />
      </Field>
      <Field label="가이드" hint="안내한 인원 · 줄바꿈으로 구분">
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

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 border-b border-warm-300/40 pb-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-warm-600">{title}</h3>
      {children}
    </section>
  )
}

/**
 * 수기 등록 · 수기 기록 수정.
 * 웹 예약 규칙(월 · 수 · 금, 정해진 시간대, 방문자 명단, 개인정보 동의)을 적용하지 않는다.
 */
export function ManualVisitModal({
  initial,
  onClose,
  onSubmit,
}: {
  /** 있으면 수정, 없으면 새 등록 */
  initial?: VisitRequest
  onClose: () => void
  onSubmit: (input: ManualInput) => Promise<void>
}) {
  const [date, setDate] = useState(initial?.date ?? '')
  const [start, setStart] = useState(initial?.slot.split('-')[0] ?? '')
  const [end, setEnd] = useState(initial?.slot.split('-')[1] ?? '')
  const [tour, setTour] = useState(initial?.tour ?? 'other')
  const [status, setStatus] = useState<VisitStatus>(initial?.status ?? 'approved')
  const [category, setCategory] = useState(initial?.category ?? 'external')
  const [clientType, setClientType] = useState<'none' | 'existing' | 'new'>(initial?.clientType ?? 'none')
  const [company, setCompany] = useState(initial?.company ?? '')
  const [purposes, setPurposes] = useState((initial?.purposes ?? []).join(', '))
  const [industries, setIndustries] = useState((initial?.industries ?? []).join(', '))
  const [headcount, setHeadcount] = useState(initial?.headcount != null ? String(initial.headcount) : '')
  // 진행 언어: 한국어 · 영어 · 중국어. 이전 기록의 다른 외국어(예: '기타: 태국어')는 고치지 않으면 그대로 둔다.
  const initialForeign = initial?.language === 'foreign' ? initial.foreignLanguage : ''
  const [language, setLanguage] = useState<string>(
    initial?.language !== 'foreign' ? 'ko' : initialForeign === '중국어' ? 'zh' : initialForeign === '영어' || !initialForeign ? 'en' : 'keep',
  )
  const [interpreter, setInterpreter] = useState(initial?.interpreter ?? false)
  const [interpreterLanguage, setInterpreterLanguage] = useState(initial?.interpreterLanguage ?? '')
  const [hostName, setHostName] = useState(initial?.host.name ?? '')
  const [hostDivision, setHostDivision] = useState(initial?.host.division ?? '')
  const [hostOrg, setHostOrg] = useState(initial?.host.org ?? '')
  const [ops, setOps] = useState(() => opsFromRequest(initial ?? {}))
  const [memo, setMemo] = useState(initial?.adminMemo ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!date) return setError('방문일을 입력해 주세요.')
    if (!company.trim()) return setError('업체(기관)명을 입력해 주세요.')
    if ((start && !end) || (!start && end)) return setError('시작 · 종료 시간을 모두 입력하거나 둘 다 비워 두세요. (비우면 시간 미정)')
    if (start && end && start >= end) return setError('종료 시간이 시작 시간보다 늦어야 합니다.')
    const count = headcount.trim() === '' ? undefined : Number(headcount)
    if (count !== undefined && !(Number.isInteger(count) && count >= 0)) return setError('방문 인원수는 0 이상의 숫자로 입력해 주세요.')

    const input: ManualInput = {
      tour,
      date,
      slot: start && end ? `${start}-${end}` : '',
      status,
      source: 'manual',
      category,
      clientType: category === 'external' && clientType !== 'none' ? clientType : undefined,
      language: language === 'ko' ? 'ko' : 'foreign',
      foreignLanguage: language === 'en' ? '영어' : language === 'zh' ? '중국어' : language === 'keep' ? initialForeign : '',
      interpreter,
      interpreterLanguage: interpreter ? interpreterLanguage.trim() : '',
      company: company.trim(),
      industries: category === 'external' ? splitComma(industries).slice(0, 1) : [],
      purposes: splitComma(purposes).slice(0, 1),
      host: {
        name: hostName.trim(),
        title: initial?.host.title ?? '',
        division: hostDivision.trim(),
        org: hostOrg.trim(),
        phone: initial?.host.phone ?? '',
        email: initial?.host.email ?? '',
      },
      hostComment: initial?.hostComment ?? '',
      visitors: initial?.visitors ?? [],
      headcount: count,
      note: initial?.note ?? '',
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
          : '전화 · 메일로 잡힌 방문이나 지난 방문을 직접 기록합니다. 요일 · 시간 제한이 없고, 같은 시간에 다른 예약이 있어도 등록됩니다(공동 진행).'
      }
      onClose={onClose}
      className="max-w-4xl"
    >
      <form
        className="space-y-7"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Group title="일정">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="방문일" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="시작 시간" hint="비우면 시간 미정">
              <Input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="종료 시간">
              <Input type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
            <Field label="투어">
              <select className={selectClass} value={tour} onChange={(e) => setTour(e.target.value as VisitRequest['tour'])}>
                {TOURS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {!initial && (
            <div className="mt-4">
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-warm-600">상태</p>
              <Segmented
                label="상태"
                value={status}
                onChange={setStatus}
                options={MANUAL_STATUSES.map((item) => [item, STATUS_LABEL[item]] as const)}
              />
            </div>
          )}
        </Group>

        <Group title="방문 정보">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-warm-600">구분</p>
              <Segmented
                label="방문 구분"
                value={category}
                onChange={setCategory}
                options={[
                  ['external', '외부 (고객)'],
                  ['internal', '내부'],
                ]}
              />
            </div>
            {category === 'external' && (
              <div>
                <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-warm-600">고객 구분</p>
                <Segmented
                  label="고객 구분"
                  value={clientType}
                  onChange={setClientType}
                  options={[
                    ['none', '미분류'],
                    ['existing', '기존'],
                    ['new', '신규'],
                  ]}
                />
              </div>
            )}
            <div>
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-warm-600">투어 언어</p>
              <Segmented
                label="투어 언어"
                value={language}
                onChange={setLanguage}
                options={[
                  ['ko', '한국어'],
                  ['en', '영어'],
                  ['zh', '중국어'],
                  ...(initialForeign && language !== 'ko' && !['영어', '중국어'].includes(initialForeign)
                    ? [['keep', initialForeign.replace(/^기타:\s*/, '')] as [string, string]]
                    : []),
                ]}
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-warm-800">
              <input type="checkbox" checked={interpreter} onChange={(e) => setInterpreter(e.target.checked)} className="accent-brand" />
              고객사 통역 동반
            </label>
            {interpreter && (
              <input
                value={interpreterLanguage}
                onChange={(e) => setInterpreterLanguage(e.target.value)}
                maxLength={40}
                placeholder="방문객 사용 언어 (선택)"
                aria-label="방문객 사용 언어"
                className="mb-1 w-44 border border-warm-300/60 bg-white px-2 py-1.5 text-sm"
              />
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="업체(기관)명" required>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="예: 풀필먼트영업팀, ACME" />
            </Field>
            <Field label="방문 인원수" hint="비우면 미정">
              <Input inputMode="numeric" value={headcount} onChange={(e) => setHeadcount(e.target.value.replace(/[^\d]/g, ''))} placeholder="6" />
            </Field>
            <Field label="방문 목적" hint="한 가지만 입력 (예: 투어). 여러 개를 쓰면 첫 번째만 저장됩니다">
              <Input value={purposes} onChange={(e) => setPurposes(e.target.value)} />
            </Field>
            {category === 'external' && (
              <Field label="업종" hint="한 가지만 입력. 여러 개를 쓰면 첫 번째만 저장됩니다">
                <Input value={industries} onChange={(e) => setIndustries(e.target.value)} />
              </Field>
            )}
            <Field label="담당자 (선택)">
              <Input value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="홍길동 책임" />
            </Field>
            <Field label="담당(실) (선택)" hint="방문 통계의 담당별 집계에 쓰입니다">
              <Input
                value={hostDivision}
                onChange={(e) => setHostDivision(e.target.value)}
                list="tdl-manual-division-options"
                placeholder="CL운영담당"
              />
              <datalist id="tdl-manual-division-options">
                {MAIN_DIVISIONS.map((division) => (
                  <option key={division} value={division} />
                ))}
              </datalist>
            </Field>
            <Field label="담당 조직(팀) (선택)">
              <Input value={hostOrg} onChange={(e) => setHostOrg(e.target.value)} />
            </Field>
          </div>
        </Group>

        <Group title="운영 기록">
          <OpsFields value={ops} onChange={setOps} />
          <div className="mt-4">
            <Field label="관리자 메모">
              <Textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
            </Field>
          </div>
        </Group>

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
    </Modal>
  )
}
