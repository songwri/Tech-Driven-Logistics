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
  SESSION_HOURS,
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
/** 소수 둘째 자리 반올림 (0.075 → 0.08: 부동소수 오차 보정) */
const formatMM = (value: number) => (Math.round(value * 100 + 1e-9) / 100).toFixed(2)

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

/** 선택한 방문의 인솔자(목록에서 하나) · 운영 인원(복수 체크) 배정 */
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

  // 인솔자는 여러 명을 고를 수 있다. 인솔자로 고른 사람은 운영 인원에서 뺀다.
  const toggleLead = (name: string) => {
    setMessage(null)
    setDraft((current) => {
      const selected = current.leads.includes(name)
      return {
        ...current,
        leads: selected ? current.leads.filter((item) => item !== name) : [...current.leads, name],
        operators: selected ? current.operators : current.operators.filter((item) => item !== name),
      }
    })
  }
  // 전체 선택 대상: 인솔자를 뺀 운영 가능 인원
  const selectable = OPERATORS.filter((member) => !draft.leads.includes(member.name)).map((member) => member.name)
  const allSelected = selectable.length > 0 && selectable.every((name) => draft.operators.includes(name))
  const toggleAll = () => {
    setMessage(null)
    setDraft((current) => ({ ...current, operators: allSelected ? [] : selectable }))
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
          {tour.label} · {headcountOf(request)}명 · 투입 1타임({formatHours(tourHours(request))}시간)
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-warm-800">
          <UserRound width={14} height={14} /> 인솔자 <span className="font-normal text-warm-600">복수 선택</span>
        </legend>
        <div className="border border-warm-300/50" role="group" aria-label="인솔자">
          {GUIDE_ROSTER.map((member) => {
            const active = draft.leads.includes(member.name)
            return (
              <button
                key={member.name}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggleLead(member.name)}
                className={cn(
                  'flex w-full items-center justify-between border-b border-warm-300/30 px-3 py-1.5 text-left text-[13px] transition last:border-b-0',
                  active ? 'bg-warm-800 font-semibold text-white' : 'text-warm-800 hover:bg-cream/60',
                )}
              >
                {memberLabel(member)}
                {active && <Check width={14} height={14} />}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-warm-600">인솔자가 둘 이상이어도 됩니다 · 모두 선택을 해제하면 미배정입니다</p>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 flex w-full items-center gap-1.5 text-[13px] font-bold text-warm-800">
          <Users width={14} height={14} /> 운영 인원 <span className="font-normal text-warm-600">복수 선택</span>
          <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-warm-600 hover:text-warm-800">
            <input type="checkbox" className="accent-[#30405f]" checked={allSelected} onChange={toggleAll} />
            전체
          </label>
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATORS.map((member) => {
            const isMain = draft.leads.includes(member.name)
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
                {isMain && <span className="ml-auto shrink-0 text-[11px]">인솔자</span>}
              </label>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-warm-600">인솔자로 고른 인원은 운영 인원에서 제외됩니다 · 팀장은 인솔자만 가능</p>
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
  // 모바일: 날짜 칸에는 점만 보여 주고, 날짜를 누르면 달력 아래에 그날 일정 목록을 보여 준다 (예약 대시보드 달력과 같은 방식)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loadMonth, setLoadMonth] = useState(month)
  const year = month.getFullYear()
  const monthNumber = month.getMonth() + 1
  const prefix = monthKey(year, monthNumber)
  const today = toDateKey(new Date())

  const confirmed = requests.filter(isAssignable)
  const inMonth = confirmed
    .filter((request) => request.date.startsWith(prefix))
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
  // 주간 보드에서 다른 달의 방문을 골라도 배정 패널이 열리도록 전체에서 찾는다.
  const selected = confirmed.find((request) => request.id === selectedId) ?? null
  const unassigned = inMonth.filter((request) => parseGuides(request.guides).leads.length === 0).length

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
    setSelectedDate(null)
  }

  // 인원별 투입은 달력과 따로 월을 넘기며 본다 (주간 표처럼).
  const loadYear = loadMonth.getFullYear()
  const loadMonthNumber = loadMonth.getMonth() + 1
  const days = workingDays(loadYear, loadMonthNumber)
  const loads = guideLoads(
    confirmed.filter((request) => request.date.startsWith(monthKey(loadYear, loadMonthNumber))),
    loadYear,
    loadMonthNumber,
  )
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const monthOffset = (loadYear - thisMonth.getFullYear()) * 12 + (loadMonthNumber - 1 - thisMonth.getMonth())
  const moveLoadMonth = (delta: number) => setLoadMonth(new Date(loadYear, loadMonthNumber - 1 + delta, 1))
  const quickMonth = (label: string, offset: number) => (
    <button
      type="button"
      onClick={() => setLoadMonth(new Date(thisMonth.getFullYear(), thisMonth.getMonth() + offset, 1))}
      aria-pressed={monthOffset === offset}
      className={cn(
        'border px-2.5 py-1 text-[12px] font-semibold transition',
        monthOffset === offset ? 'border-warm-800 bg-warm-800 text-white' : 'border-warm-300/60 text-warm-600 hover:border-warm-800 hover:text-warm-800',
      )}
    >
      {label}
    </button>
  )
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

  /** 일정을 고르면 배정 패널로 이동한다 (모바일은 패널이 달력 아래에 있다). */
  const pick = (id: string) => {
    setSelectedId(id)
    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.setTimeout(() => document.getElementById('guide-assign-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }
  /** 주간 보드에서 방문을 누르면 그 달로 달력을 맞추고 위쪽 배정 패널로 이동한다. */
  const pickFromBoard = (request: VisitRequest) => {
    const date = new Date(Number(request.date.slice(0, 4)), Number(request.date.slice(5, 7)) - 1, 1)
    if (date.getTime() !== month.getTime()) setMonth(date)
    setSelectedDate(request.date)
    setSelectedId(request.id)
    window.setTimeout(() => document.getElementById('guide-assign-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const dayList = selectedDate ? (byDate.get(selectedDate) ?? []) : []

  const save = async (request: VisitRequest, guides: string) => {
    await onUpdate({ ...request, guides })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card
          title="투어 가이드 배정"
          actions={
            <div className="flex flex-wrap items-center gap-1">
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
                <b className={unassigned > 0 ? 'text-brand' : 'text-[#2b8a3e]'}>인솔자 미배정 {unassigned}건</b>
              </span>
            </div>
          }
        >
          <div className="sm:overflow-x-auto">
            <div className="grid select-none grid-cols-7 sm:min-w-[680px]">
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
                if (day === null) return <div key={`empty-${index}`} className="min-h-14 border-b border-r border-warm-300/20 bg-cream/30 sm:min-h-24" />
                const key = toDateKey(new Date(year, monthNumber - 1, day))
                const weekday = index % 7
                const holiday = holidayName(key)
                const off = weekday === 0 || weekday === 6 || Boolean(holiday)
                const list = byDate.get(key) ?? []
                const dayActive = key === selectedDate
                return (
                  <div
                    key={key}
                    role={list.length > 0 ? 'button' : undefined}
                    tabIndex={list.length > 0 ? 0 : undefined}
                    onClick={() => list.length > 0 && setSelectedDate(dayActive ? null : key)}
                    onKeyDown={(event) => {
                      if (list.length > 0 && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault()
                        setSelectedDate(dayActive ? null : key)
                      }
                    }}
                    aria-label={`${monthNumber}월 ${day}일 가이드 배정 대상 ${list.length}건`}
                    className={cn(
                      'min-h-14 border-b border-r border-warm-300/30 p-1 sm:min-h-24',
                      off ? 'bg-cream/50' : 'bg-white',
                      list.length > 0 && 'cursor-pointer sm:cursor-default',
                      dayActive && 'bg-brand/10 sm:bg-white',
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1">
                      <span
                        className={cn(
                          'flex h-6 min-w-6 items-center justify-center px-1 text-[12px] font-semibold',
                          key === today ? 'rounded-full bg-brand text-white' : off ? 'text-brand/70' : 'text-warm-800',
                        )}
                      >
                        {day}
                      </span>
                      {holiday && <span className="hidden truncate text-[10px] text-brand/70 sm:inline">{holiday}</span>}
                    </div>
                    {/* 모바일: 투어 색 점 (인솔자 미배정은 빨간 테두리) */}
                    {list.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                        {list.map((request) => (
                          <span
                            key={request.id}
                            className={cn('h-2 w-2 rounded-full', parseGuides(request.guides).leads.length === 0 && 'ring-2 ring-brand ring-offset-1')}
                            style={{ background: TOUR_BY_ID[request.tour].color }}
                          />
                        ))}
                      </div>
                    )}
                    <div className="hidden space-y-1 sm:block">
                      {list.map((request) => {
                        const assignment = parseGuides(request.guides)
                        const tour = TOUR_BY_ID[request.tour]
                        const active = request.id === selectedId
                        return (
                          <button
                            key={request.id}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              pick(request.id)
                            }}
                            aria-pressed={active}
                            title={`${tour.label} · ${formatScheduleShort(request.tour, request.slot)} · ${request.company}`}
                            className={cn(
                              'block w-full border border-l-[4px] px-1 py-0.5 text-left text-[11px] leading-tight transition',
                              active ? 'bg-warm-800 text-white' : 'bg-white text-warm-800 hover:bg-cream/70',
                              assignment.leads.length === 0 && !active && 'bg-brand/5',
                            )}
                            style={{ borderColor: tour.color }}
                          >
                            <span className="flex items-center gap-1">
                              <span className="shrink-0 font-mono text-[10px] opacity-80">{request.slot ? request.slot.slice(0, 5) : '미정'}</span>
                              <span className="truncate font-medium">{request.company}</span>
                            </span>
                            <span className={cn('mt-0.5 block truncate text-[10px]', active ? 'text-white/80' : 'text-warm-600')}>
                              {assignment.leads.length > 0 ? (
                                <>
                                  <b className={active ? 'text-white' : 'text-warm-800'}>{assignment.leads.join(', ')}</b>
                                  {assignment.operators.length > 0 && ` + ${assignment.operators.length}명`}
                                </>
                              ) : (
                                <b className={active ? 'text-white' : 'text-brand'}>인솔자 미배정</b>
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
          <div className="border-t border-warm-300/40 sm:hidden">
            {selectedDate ? (
              <div>
                <p className="bg-cream/50 px-3 py-2 text-[13px] font-bold text-warm-800">{formatDateShort(selectedDate)}</p>
                {dayList.map((request) => {
                  const assignment = parseGuides(request.guides)
                  const tour = TOUR_BY_ID[request.tour]
                  const active = request.id === selectedId
                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => pick(request.id)}
                      aria-pressed={active}
                      className={cn(
                        'flex w-full items-center gap-2.5 border-b border-l-[5px] border-warm-300/30 px-3 py-2.5 text-left transition',
                        active ? 'bg-warm-800 text-white' : 'bg-white text-warm-800 active:bg-cream/70',
                      )}
                      style={{ borderLeftColor: tour.color }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{request.company}</span>
                        <span className={cn('mt-0.5 block truncate text-[12px]', active ? 'text-white/80' : 'text-warm-600')}>
                          {formatScheduleShort(request.tour, request.slot)} · {tour.label}
                        </span>
                      </span>
                      <span className={cn('shrink-0 text-right text-[12px]', active ? 'text-white' : 'text-warm-600')}>
                        {assignment.leads.length > 0 ? (
                          <>
                            <b className={active ? 'text-white' : 'text-warm-800'}>{assignment.leads.join(', ')}</b>
                            {assignment.operators.length > 0 && <span className="block">+ {assignment.operators.length}명</span>}
                          </>
                        ) : (
                          <b className={active ? 'text-white' : 'text-brand'}>인솔자 미배정</b>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="px-3 py-3 text-center text-[12px] text-warm-600">
                {inMonth.length === 0 ? '이 달에는 확정된 방문이 없습니다.' : '점이 있는 날짜를 누르면 그날 일정이 보입니다.'}
              </p>
            )}
          </div>
        </Card>

        <div id="guide-assign-panel" className="scroll-mt-4 lg:sticky lg:top-4 lg:self-start">
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
                {inMonth.length === 0 ? '이 달에는 확정된 방문이 없습니다.' : '일정을 누르면 인솔자와 운영 인원을 정할 수 있습니다.'}
              </p>
            )}
          </Card>
        </div>
      </div>

      <GuideWeekly requests={confirmed} selectedId={selectedId} onSelect={pickFromBoard} />

      <Card
        title="월간 인원별 투입 (M/M)"
        subtitle={`투어 1건 = 1타임(반일 ${SESSION_HOURS}시간, 오전 · 오후 각 1타임) · 근무일 ${days}일 × ${HOURS_PER_DAY}시간 = ${days * HOURS_PER_DAY}시간을 1 M/M 으로 계산`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            {quickMonth('지난 달', -1)}
            {quickMonth('이번 달', 0)}
            {quickMonth('다음 달', 1)}
            <span className="mx-1 h-5 w-px bg-warm-300/50" />
            <button
              type="button"
              onClick={() => moveLoadMonth(-1)}
              aria-label="이전 달 투입"
              className="flex h-8 w-8 items-center justify-center text-warm-600 transition hover:bg-cream hover:text-brand"
            >
              <ChevronLeft width={18} height={18} />
            </button>
            <span className="min-w-28 text-center text-[14px] font-bold text-warm-800">
              {loadYear}년 {loadMonthNumber}월
            </span>
            <button
              type="button"
              onClick={() => moveLoadMonth(1)}
              aria-label="다음 달 투입"
              className="flex h-8 w-8 items-center justify-center text-warm-600 transition hover:bg-cream hover:text-brand"
            >
              <ChevronRight width={18} height={18} />
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-warm-300/40 text-left text-[12px] text-warm-600">
                <th className="px-4 py-2 font-semibold">이름</th>
                <th className="px-3 py-2 text-right font-semibold">인솔</th>
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
