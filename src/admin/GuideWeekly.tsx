import { useState } from 'react'
import { ChevronLeft, ChevronRight, Sun, Sunset } from 'lucide-react'
import { cn } from '@/lib/utils'
import { holidayName } from '@/lib/holidays'
import { TOUR_BY_ID, parseDateKey, toDateKey, type VisitRequest } from '@/lib/visit'
import {
  GUIDE_ROSTER,
  HOURS_PER_DAY,
  halfOf,
  isWorkingDay,
  labSlot,
  memberLabel,
  mondayOf,
  nameLabel,
  parseGuides,
  tallyLoads,
  weekDates,
  type Half,
} from './guideRoster'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
const HALVES: { id: Half; label: string }[] = [
  { id: 'am', label: '오전' },
  { id: 'pm', label: '오후' },
  { id: 'tbd', label: '시간 미정' },
]

const shortDate = (key: string) => `${Number(key.slice(5, 7))}.${Number(key.slice(8, 10))}`

function addWeeks(monday: string, weeks: number) {
  const date = parseDateKey(monday)
  date.setDate(date.getDate() + weeks * 7)
  return toDateKey(date)
}

/** 인솔자 칩: 진한 남색 바탕 + 흰 글씨. 미배정이면 빨간 점선. */
function LeadChip({ name }: { name: string | null }) {
  return name ? (
    <span className="inline-block rounded-[3px] bg-warm-800 px-2 py-0.5 text-[13px] font-bold leading-tight text-white">{nameLabel(name)}</span>
  ) : (
    <span className="inline-block rounded-[3px] border border-dashed border-brand px-2 py-0.5 text-[12px] font-semibold leading-tight text-brand">미배정</span>
  )
}

/** 운영 인원 칩: 옅은 남색 바탕 + 진한 글씨 */
function OperatorChip({ name }: { name: string }) {
  return (
    <span className="inline-block rounded-[3px] border border-warm-800/25 bg-warm-800/[0.07] px-2 py-0.5 text-[12px] font-medium leading-tight text-warm-800">
      {nameLabel(name)}
    </span>
  )
}

/** 방문 한 건: 시간 · 업체 · 인솔 · 운영 인원 */
function VisitBlock({ request, active, onSelect }: { request: VisitRequest; active: boolean; onSelect: (request: VisitRequest) => void }) {
  const assignment = parseGuides(request.guides)
  const tour = TOUR_BY_ID[request.tour]
  const slot = labSlot(request)
  return (
    <button
      type="button"
      onClick={() => onSelect(request)}
      aria-pressed={active}
      title={`${tour.label} · ${request.company} — 눌러서 배정 수정`}
      className={cn(
        'block w-full border border-l-[5px] bg-white px-2 py-1.5 text-left transition hover:bg-cream/60',
        active && 'ring-2 ring-warm-800 ring-offset-1',
      )}
      style={{ borderColor: tour.color }}
    >
      <span className="flex items-baseline gap-1.5 text-[11px] leading-tight text-warm-600">
        <span className="shrink-0 font-mono">{slot ? slot.slice(0, 5) : '미정'}</span>
        <span className="truncate font-semibold text-warm-800">{request.company}</span>
      </span>
      <span className="mt-1.5 flex items-start gap-1.5">
        <span className="w-7 shrink-0 pt-0.5 text-[10px] font-bold text-warm-800">인솔</span>
        <LeadChip name={assignment.main} />
      </span>
      <span className="mt-1 flex items-start gap-1.5">
        <span className="w-7 shrink-0 pt-0.5 text-[10px] font-bold text-warm-600">운영</span>
        {assignment.operators.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {assignment.operators.map((name) => (
              <OperatorChip key={name} name={name} />
            ))}
          </span>
        ) : (
          <span className="pt-0.5 text-[12px] text-warm-300">–</span>
        )}
      </span>
    </button>
  )
}

const HalfIcon = ({ half }: { half: Half }) =>
  half === 'am' ? <Sun width={15} height={15} aria-hidden /> : half === 'pm' ? <Sunset width={15} height={15} aria-hidden /> : null

/**
 * 주간 인솔 · 운영 배정 보드: 요일 × 오전 · 오후 칸마다 누가 인솔하고 누가 운영 멤버로 들어가는지 한눈에 보여 준다.
 * 칸의 방문을 누르면 위쪽 배정 패널에서 바로 고칠 수 있다. 맨 아래에는 그 주 인원별 인솔 · 운영 횟수를 요약한다.
 */
export function GuideWeekly({
  requests,
  selectedId,
  onSelect,
}: {
  requests: VisitRequest[]
  selectedId: string | null
  onSelect: (request: VisitRequest) => void
}) {
  const thisWeek = mondayOf(toDateKey(new Date()))
  const [monday, setMonday] = useState(thisWeek)
  const dates = weekDates(monday)
  const today = toDateKey(new Date())
  const inWeek = requests.filter((request) => request.date >= dates[0] && request.date <= dates[6])
  // 주말 방문이 없으면 토 · 일 칸은 숨긴다.
  const shown = dates.filter((key, index) => index < 5 || inWeek.some((request) => request.date === key))
  const halves = HALVES.filter((half) => half.id !== 'tbd' || inWeek.some((request) => halfOf(request) === 'tbd'))
  const cellOf = (key: string, half: Half) =>
    inWeek
      .filter((request) => request.date === key && halfOf(request) === half)
      .sort((a, b) => labSlot(a).localeCompare(labSlot(b)))

  const capacity = dates.filter(isWorkingDay).length * HOURS_PER_DAY
  const loads = tallyLoads(inWeek, capacity)
  const unassigned = inWeek.filter((request) => !parseGuides(request.guides).main).length
  const relative =
    monday === thisWeek ? '이번 주' : monday === addWeeks(thisWeek, 1) ? '다음 주' : monday === addWeeks(thisWeek, -1) ? '지난 주' : null

  const quick = (label: string, target: string) => (
    <button
      type="button"
      onClick={() => setMonday(target)}
      aria-pressed={monday === target}
      className={cn(
        'border px-2.5 py-1 text-[12px] font-semibold transition',
        monday === target ? 'border-warm-800 bg-warm-800 text-white' : 'border-warm-300/60 text-warm-600 hover:border-warm-800 hover:text-warm-800',
      )}
    >
      {label}
    </button>
  )

  return (
    <section className="border border-warm-300/50 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-300/40 px-4 py-3">
        <div>
          <h3 className="text-[15px] font-bold text-warm-800">주간 인솔 · 운영 배정</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-warm-600">
            <span className="inline-block rounded-[3px] bg-warm-800 px-2 py-0.5 text-[12px] font-bold leading-tight text-white">인솔자</span>
            <span className="inline-block rounded-[3px] border border-warm-800/25 bg-warm-800/[0.07] px-2 py-0.5 text-[12px] font-medium leading-tight text-warm-800">
              운영 멤버
            </span>
            <span>
              {inWeek.length}건 · <b className={unassigned > 0 ? 'text-brand' : 'text-[#2b8a3e]'}>인솔자 미배정 {unassigned}건</b>
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {quick('지난 주', addWeeks(thisWeek, -1))}
          {quick('이번 주', thisWeek)}
          {quick('다음 주', addWeeks(thisWeek, 1))}
          <span className="mx-1 h-5 w-px bg-warm-300/50" />
          <button
            type="button"
            onClick={() => setMonday(addWeeks(monday, -1))}
            aria-label="이전 주"
            className="flex h-8 w-8 items-center justify-center text-warm-600 transition hover:bg-cream hover:text-brand"
          >
            <ChevronLeft width={18} height={18} />
          </button>
          <span className="min-w-40 text-center text-[14px] font-bold text-warm-800">
            {shortDate(dates[0])} ~ {shortDate(dates[6])}
            {relative && <span className="ml-1.5 text-[12px] font-semibold text-brand">{relative}</span>}
          </span>
          <button
            type="button"
            onClick={() => setMonday(addWeeks(monday, 1))}
            aria-label="다음 주"
            className="flex h-8 w-8 items-center justify-center text-warm-600 transition hover:bg-cream hover:text-brand"
          >
            <ChevronRight width={18} height={18} />
          </button>
        </div>
      </header>

      {inWeek.length === 0 ? (
        <p className="px-4 py-12 text-center text-[13px] text-warm-600">이 주에는 인솔 · 운영 배정 대상 방문이 없습니다.</p>
      ) : (
        <>
          {/* 넓은 화면: 요일 × 오전 · 오후 보드 */}
          <div className="hidden overflow-x-auto sm:block">
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `76px repeat(${shown.length}, minmax(0, 1fr))` }}>
              <div className="border-b border-warm-300/40" />
              {shown.map((key) => {
                const holiday = holidayName(key)
                const off = !isWorkingDay(key)
                return (
                  <div
                    key={key}
                    className={cn('border-b border-l border-warm-300/40 px-2 py-2 text-center', off && 'bg-cream/50')}
                    title={holiday}
                  >
                    <span className={cn('text-[13px] font-bold', off ? 'text-brand/70' : 'text-warm-800')}>
                      {WEEKDAYS[(parseDateKey(key).getDay() + 6) % 7]}
                    </span>
                    <span
                      className={cn(
                        'ml-1.5 inline-flex min-w-6 items-center justify-center px-1 font-mono text-[12px]',
                        key === today ? 'rounded-full bg-brand text-white' : 'text-warm-600',
                      )}
                    >
                      {shortDate(key)}
                    </span>
                    {holiday && <span className="block text-[10px] text-brand/70">{holiday}</span>}
                  </div>
                )
              })}
              {halves.map((half) => (
                <div key={half.id} className="contents">
                  <div className="flex flex-col items-center justify-center gap-1 border-b border-warm-300/40 bg-cream/40 px-2 text-[12px] font-bold text-warm-800">
                    <HalfIcon half={half.id} />
                    {half.label}
                  </div>
                  {shown.map((key) => {
                    const list = cellOf(key, half.id)
                    return (
                      <div
                        key={`${half.id}-${key}`}
                        className={cn('min-h-24 space-y-1.5 border-b border-l border-warm-300/40 p-1.5', !isWorkingDay(key) && 'bg-cream/40')}
                      >
                        {list.length === 0 ? (
                          <span className="block pt-1 text-center text-[12px] text-warm-300">–</span>
                        ) : (
                          list.map((request) => (
                            <VisitBlock key={request.id} request={request} active={request.id === selectedId} onSelect={onSelect} />
                          ))
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 모바일: 방문이 있는 날만 세로로 (날짜 → 오전 · 오후) */}
          <div className="sm:hidden">
            {shown
              .filter((key) => inWeek.some((request) => request.date === key))
              .map((key) => (
                <div key={key} className="border-b border-warm-300/40 last:border-b-0">
                  <p className={cn('bg-cream/50 px-3 py-1.5 text-[13px] font-bold', key === today ? 'text-brand' : 'text-warm-800')}>
                    {shortDate(key)} ({WEEKDAYS[(parseDateKey(key).getDay() + 6) % 7]}){holidayName(key) ? ` · ${holidayName(key)}` : ''}
                  </p>
                  {halves.map((half) => {
                    const list = cellOf(key, half.id)
                    if (list.length === 0) return null
                    return (
                      <div key={half.id} className="flex gap-2 px-3 py-2">
                        <span className="flex w-10 shrink-0 flex-col items-center gap-0.5 pt-1 text-[11px] font-bold text-warm-800">
                          <HalfIcon half={half.id} />
                          {half.label === '시간 미정' ? '미정' : half.label}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {list.map((request) => (
                            <VisitBlock key={request.id} request={request} active={request.id === selectedId} onSelect={onSelect} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
          </div>

          {/* 그 주 인원별 인솔 · 운영 횟수 */}
          <div className="border-t border-warm-300/40 bg-cream/30 px-4 py-3">
            <p className="mb-2 text-[12px] font-semibold text-warm-600">이 주 인원별</p>
            <ul className="flex flex-wrap gap-2">
              {GUIDE_ROSTER.map((member, index) => {
                const load = loads[index]
                const idle = load.main + load.operator === 0
                return (
                  <li
                    key={member.name}
                    className={cn(
                      'flex items-center gap-2 border border-warm-300/50 bg-white px-2.5 py-1.5 text-[12px]',
                      idle && 'border-dashed text-warm-300',
                    )}
                    title={`가동률 ${Math.round(load.manMonth * 100)}% (1건 = 반일 4시간, 근무일 × 8시간 기준)`}
                  >
                    <span className={cn('font-semibold', idle ? 'text-warm-300' : 'text-warm-800')}>{memberLabel(member)}</span>
                    {idle ? (
                      <span>배정 없음</span>
                    ) : (
                      <>
                        <span className="text-warm-800">
                          인솔 <b className="font-mono">{load.main}</b>
                        </span>
                        {member.canOperate && (
                          <span className="text-warm-600">
                            운영 <b className="font-mono">{load.operator}</b>
                          </span>
                        )}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
