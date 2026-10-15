import { useState, type ReactNode } from 'react'
import { Check, ChevronLeft, ChevronRight, UserRound, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { holidayName } from '@/lib/holidays'
import {
  TOUR_BY_ID,
  formatDateShort,
  formatScheduleShort,
  headcountOf,
  toDateKey,
  type VisitRequest,
} from '@/lib/visit'
import { Button } from '@/components/ui/Button'
import {
  GUIDE_ROSTER,
  HOURS_PER_DAY,
  OPERATORS,
  formatGuides,
  guideLoads,
  isAssignable,
  memberLabel,
  monthKey,
  parseGuides,
  tourHours,
  workingDays,
  type GuideAssignment,
} from './guideRoster'
import { GuideWeekly } from './GuideWeekly'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const formatHours = (hours: number) => `${Math.round(hours * 10) / 10}`
const formatMM = (value: number) => value.toFixed(2)

function Card({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="border border-warm-300/50 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-300/40 px-4 py-3">
        <div>
          <h3 className="text-[15px] font-bold text-warm-800">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-warm-600">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

/** 선택한 방문의 메인 가이드(목록에서 하나) · 운영 인원(복수 체크) 배정 */
function AssignPanel({
  request,
  onSave,
}: {
  request: VisitRequest
  onSave: (guides: string) => Promise<void>
}) {
  const saved = parseGuides(request.guides)
  const [draft, setDraft] = useState<GuideAssignment>(saved)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const dirty = formatGuides(draft) !== formatGuides(saved)

  const chooseMain = (name: string | null) => {
    setMessage(null)
    // 메인 가이드로 고른 사람은 운영 인원에서 뺀다.
    setDraft((current) => ({ ...current, main: name, operators: current.operators.filter((item) => item !== name) }))
  }
  const toggleOperator = (name: string) => {
    setMessage(null)
    setDraft((current) => ({
      ...current,
      operators: current.operators.includes(name)
        ? current.operators.filter((item) => item !== name)
        : [...current.operators, name],
    }))
  }
  const save = async () => {
    setPending(true)
    setMessage(null)
    try {
      await onSave(formatGuides(draft))
      setMessage({ tone: 'ok', text: '저장했습니다.' })
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '저장에 실패했습니다.' })
    } finally {
      setPending(false)
    }
  }

  const tour = TOUR_BY_ID[request.tour]
  return (
    <div className="space-y-4 p-4">
      <div className="border-l-[5px] bg-cream/50 px-3 py-2" style={{ borderColor: tour.color }}>
        <p className="text-[12px] text-warm-600">
          {formatDateShort(request.date)} · {formatScheduleShort(request.tour, request.slot)}
        </p>
        <p className="mt-0.5 text-[15px] font-bold text-warm-800">{request.company}</p>
        <p className="mt-0.5 text-[12px] text-warm-600">
          {tour.label} · {headcountOf(request)}명 · 투입 {formatHours(tourHours(request))}시간
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-warm-800">
          <UserRound width={14} height={14} /> 메인 가이드
        </legend>
        <div className="border border-warm-300/50" role="radiogroup" aria-label="메인 가이드">
          {[null, ...GUIDE_ROSTER.map((member) => member.name)].map((name) => {
            const member = GUIDE_ROSTER.find((item) => item.name === name)
            const active = draft.main === name
            return (
              <button
                key={name ?? 'none'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => chooseMain(name)}
                className={cn(
                  'flex w-full items-center justify-between border-b border-warm-300/30 px-3 py-1.5 text-left text-[13px] transition last:border-b-0',
                  active ? 'bg-warm-800 font-semibold text-white' : 'text-warm-800 hover:bg-cream/60',
                  !member && !active && 'text-warm-600',
                )}
              >
                {member ? memberLabel(member) : '미배정'}
                {active && <Check width={14} height={14} />}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-warm-800">
          <Users width={14} height={14} /> 운영 인원 <span className="font-normal text-warm-600">복수 선택</span>
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATORS.map((member) => {
            const isMain = draft.main === member.name
            const checked = !isMain && draft.operators.includes(member.name)
            return (
              <label
                key={member.name}
                className={cn(
                  'flex items-center gap-2 border px-2.5 py-1.5 text-[13px] transition',
                  isMain
                    ? 'cursor-not-allowed border-warm-300/40 bg-cream/40 text-warm-300'
                    : checked
                      ? 'cursor-pointer border-warm-800 bg-warm-800/5 font-semibold text-warm-800'
                      : 'cursor-pointer border-warm-300/50 text-warm-800 hover:border-warm-600',
                )}
              >
                <input
                  type="checkbox"
                  className="accent-[#30405f]"
                  checked={checked}
                  disabled={isMain}
                  onChange={() => toggleOperator(member.name)}
                />
                <span className="truncate">{memberLabel(member)}</span>
                {isMain && <span className="ml-auto shrink-0 text-[11px]">메인</span>}
              </label>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-warm-600">메인 가이드로 고른 인원은 운영 인원에서 제외됩니다 · 팀장은 메인 가이드만 가능</p>
      </fieldset>

      {draft.others.length > 0 && (
        <p className="border border-warm-300/50 bg-cream/40 px-3 py-2 text-[12px] text-warm-600">
          명단 외 기존 기록: <span className="text-warm-800">{draft.others.join(', ')}</span> (그대로 유지)
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        {message && (
          <span className={cn('mr-auto text-[12px]', message.tone === 'ok' ? 'text-[#2b8a3e]' : 'text-brand')}>{message.text}</span>
        )}
        <Button variant="outline" size="sm" disabled={!dirty || pending} onClick={() => setDraft(saved)}>
          되돌리기
        </Button>
        <Button size="sm" disabled={!dirty || pending} onClick={() => void save()}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  )
}

export function GuideAssignView({
  requests,
  readOnly,
  onUpdate,
}: {
  requests: VisitRequest[]
  readOnly?: boolean
  onUpdate: (next: VisitRequest) => Promise<void>
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const year = month.getFullYear()
  const monthNumber = month.getMonth() + 1
  const prefix = monthKey(year, monthNumber)
  const today = toDateKey(new Date())

  const confirmed = requests.filter(isAssignable)
  const inMonth = confirmed
    .filter((request) => request.date.startsWith(prefix))
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
  const selected = inMonth.find((request) => request.id === selectedId) ?? null
  const unassigned = inMonth.filter((request) => !parseGuides(request.guides).main).length

  const byDate = new Map<string, VisitRequest[]>()
  for (const request of inMonth) byDate.set(request.date, [...(byDate.get(request.date) ?? []), request])

  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay()
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const shift = (delta: number) => {
    setMonth(new Date(year, monthNumber - 1 + delta, 1))
    setSelectedId(null)
  }

  const days = workingDays(year, monthNumber)
  const loads = guideLoads(inMonth, year, monthNumber)
  const maxMM = Math.max(0.01, ...loads.map((load) => load.manMonth))
  const totals = loads.reduce(
    (sum, load) => ({ main: sum.main + load.main, operator: sum.operator + load.operator, hours: sum.hours + load.hours, manMonth: sum.manMonth + load.manMonth }),
    { main: 0, operator: 0, hours: 0, manMonth: 0 },
  )

  // 연간 M/M: 사람 × 월
  const yearly = Array.from({ length: 12 }, (_, index) =>
    guideLoads(
      confirmed.filter((request) => request.date.startsWith(monthKey(year, index + 1))),
      year,
      index + 1,
    ),
  )
  const yearMax = Math.max(0.01, ...yearly.flat().map((load) => load.manMonth))

  const save = async (request: VisitRequest, guides: string) => {
    await onUpdate({ ...request, guides })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card
          title="투어 가이드 배정"
          subtitle="TDL Lab 이 들어간 승인 · 완료 방문만 표시 (센터 · 시화MTV 단독 투어 제외) · 일정을 눌러 오른쪽에서 배정"
          actions={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shift(-1)}
                aria-label="이전 달"
                className="flex h-8 w-8 items-center justify-center text-warm-600 transition hover:bg-cream hover:text-brand"
              >
                <ChevronLeft width={18} height={18} />
              </button>
              <span className="min-w-28 text-center text-base font-bold text-warm-800">
                {year}년 {monthNumber}월
              </span>
              <button
                type="button"
                onClick={() => shift(1)}
                aria-label="다음 달"
                className="flex h-8 w-8 items-center justify-center text-warm-600 transition hover:bg-cream hover:text-brand"
              >
                <ChevronRight width={18} height={18} />
              </button>
              <span className="ml-2 text-[12px] text-warm-600">
                {inMonth.length}건 ·{' '}
                <b className={unassigned > 0 ? 'text-brand' : 'text-[#2b8a3e]'}>메인 미배정 {unassigned}건</b>
              </span>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <div className="grid min-w-[680px] grid-cols-7">
              {WEEKDAYS.map((name, index) => (
                <div
                  key={name}
                  className={cn(
                    'border-b border-warm-300/40 py-1.5 text-center font-mono text-[11px] font-semibold',
                    index === 0 || index === 6 ? 'text-warm-300' : 'text-warm-800',
                  )}
                >
                  {name}
                </div>
              ))}
              {cells.map((day, index) => {
                if (day === null) return <div key={`empty-${index}`} className="min-h-24 border-b border-r border-warm-300/20 bg-cream/30" />
                const key = toDateKey(new Date(year, monthNumber - 1, day))
                const weekday = index % 7
                const holiday = holidayName(key)
                const off = weekday === 0 || weekday === 6 || Boolean(holiday)
                const list = byDate.get(key) ?? []
                return (
                  <div key={key} className={cn('min-h-24 border-b border-r border-warm-300/30 p-1', off ? 'bg-cream/50' : 'bg-white')}>
                    <div className="mb-1 flex items-center gap-1">
                      <span
                        className={cn(
                          'flex h-6 min-w-6 items-center justify-center px-1 text-[12px] font-semibold',
                          key === today ? 'rounded-full bg-brand text-white' : off ? 'text-brand/70' : 'text-warm-800',
                        )}
                      >
                        {day}
                      </span>
                      {holiday && <span className="truncate text-[10px] text-brand/70">{holiday}</span>}
                    </div>
                    <div className="space-y-1">
                      {list.map((request) => {
                        const assignment = parseGuides(request.guides)
                        const tour = TOUR_BY_ID[request.tour]
                        const active = request.id === selectedId
                        return (
                          <button
                            key={request.id}
                            type="button"
                            onClick={() => setSelectedId(request.id)}
                            aria-pressed={active}
                            title={`${tour.label} · ${formatScheduleShort(request.tour, request.slot)} · ${request.company}`}
                            className={cn(
                              'block w-full border border-l-[4px] px-1 py-0.5 text-left text-[11px] leading-tight transition',
                              active ? 'bg-warm-800 text-white' : 'bg-white text-warm-800 hover:bg-cream/70',
                              !assignment.main && !active && 'bg-brand/5',
                            )}
                            style={{ borderColor: tour.color }}
                          >
                            <span className="flex items-center gap-1">
                              <span className="shrink-0 font-mono text-[10px] opacity-80">{request.slot ? request.slot.slice(0, 5) : '미정'}</span>
                              <span className="truncate font-medium">{request.company}</span>
                            </span>
                            <span className={cn('mt-0.5 block truncate text-[10px]', active ? 'text-white/80' : 'text-warm-600')}>
                              {assignment.main ? (
                                <>
                                  <b className={active ? 'text-white' : 'text-warm-800'}>{assignment.main}</b>
                                  {assignment.operators.length > 0 && ` + ${assignment.operators.length}명`}
                                </>
                              ) : (
                                <b className={active ? 'text-white' : 'text-brand'}>메인 미배정</b>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card title="배정" subtitle={selected ? undefined : '달력에서 방문 일정을 선택하세요'}>
            {selected ? (
              readOnly ? (
                <div className="p-4 text-[13px] text-warm-800">
                  <p className="whitespace-pre-line">{selected.guides || '배정 없음'}</p>
                </div>
              ) : (
                <AssignPanel key={selected.id} request={selected} onSave={(guides) => save(selected, guides)} />
              )
            ) : (
              <p className="px-4 py-10 text-center text-[13px] text-warm-600">
                {inMonth.length === 0 ? '이 달에는 확정된 방문이 없습니다.' : '일정을 누르면 메인 가이드와 운영 인원을 정할 수 있습니다.'}
              </p>
            )}
          </Card>
        </div>
      </div>

      <Card
        title={`${monthNumber}월 인원별 투입 (M/M)`}
        subtitle={`투어 시간 기준 · 근무일 ${days}일 × ${HOURS_PER_DAY}시간 = ${days * HOURS_PER_DAY}시간을 1 M/M 으로 계산 · 시간 미정 방문은 투어 기본 시간`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-warm-300/40 text-left text-[12px] text-warm-600">
                <th className="px-4 py-2 font-semibold">이름</th>
                <th className="px-3 py-2 text-right font-semibold">메인</th>
                <th className="px-3 py-2 text-right font-semibold">운영</th>
                <th className="px-3 py-2 text-right font-semibold">합계</th>
                <th className="px-3 py-2 text-right font-semibold">투입 시간</th>
                <th className="px-3 py-2 text-right font-semibold">M/M</th>
                <th className="w-[32%] px-4 py-2 font-semibold" aria-label="M/M 막대" />
              </tr>
            </thead>
            <tbody>
              {loads.map((load) => (
                <tr key={load.member.name} className="border-b border-warm-300/25">
                  <td className="px-4 py-2 font-semibold text-warm-800">{memberLabel(load.member)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{load.main}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{load.member.canOperate ? load.operator : '–'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{load.main + load.operator}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatHours(load.hours)}h</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-warm-800">{formatMM(load.manMonth)}</td>
                  <td className="px-4 py-2">
                    <div className="h-2.5 bg-cream">
                      <div className="h-full bg-[#30405f]" style={{ width: `${(load.manMonth / maxMM) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-cream/50 font-semibold text-warm-800">
                <td className="px-4 py-2">합계</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.main}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.operator}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.main + totals.operator}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatHours(totals.hours)}h</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMM(totals.manMonth)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <GuideWeekly requests={confirmed} />

      <Card title={`${year}년 월별 M/M`} subtitle="사람 × 월 · 값이 클수록 진하게">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[12px]">
            <thead>
              <tr className="border-b border-warm-300/40 text-warm-600">
                <th className="px-4 py-2 text-left font-semibold">이름</th>
                {Array.from({ length: 12 }, (_, index) => (
                  <th key={index} className={cn('px-2 py-2 text-right font-semibold', index + 1 === monthNumber && 'text-warm-800')}>
                    {index + 1}월
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">연 합계</th>
              </tr>
            </thead>
            <tbody>
              {GUIDE_ROSTER.map((member, row) => {
                const values = yearly.map((month) => month[row].manMonth)
                return (
                  <tr key={member.name} className="border-b border-warm-300/25">
                    <td className="whitespace-nowrap px-4 py-1.5 font-semibold text-warm-800">{memberLabel(member)}</td>
                    {values.map((value, index) => (
                      <td
                        key={index}
                        className="px-2 py-1.5 text-right tabular-nums"
                        style={{
                          background: value > 0 ? `rgba(48, 64, 95, ${0.08 + (value / yearMax) * 0.6})` : undefined,
                          color: value / yearMax > 0.6 ? '#fff' : undefined,
                        }}
                      >
                        {value > 0 ? formatMM(value) : '–'}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-warm-800">
                      {formatMM(values.reduce((sum, value) => sum + value, 0))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
