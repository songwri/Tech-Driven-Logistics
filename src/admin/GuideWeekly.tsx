import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { holidayName } from '@/lib/holidays'
import { parseDateKey, toDateKey, type VisitRequest } from '@/lib/visit'
import {
  GUIDE_ROSTER,
  HOURS_PER_DAY,
  isWorkingDay,
  memberLabel,
  mondayOf,
  roleOf,
  tallyLoads,
  tourHours,
  weekDates,
} from './guideRoster'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

const formatHours = (hours: number) => `${Math.round(hours * 10) / 10}`
const shortDate = (key: string) => `${Number(key.slice(5, 7))}.${Number(key.slice(8, 10))}`

function addWeeks(monday: string, weeks: number) {
  const date = parseDateKey(monday)
  date.setDate(date.getDate() + weeks * 7)
  return toDateKey(date)
}

/**
 * 주간 인원별 투입: 월~일 칸에 그날 맡은 투어 시간(메인/운영)을 보여 주고,
 * 가동률 = 투입 시간 ÷ (그 주 근무일 × 8시간).
 */
export function GuideWeekly({ requests }: { requests: VisitRequest[] }) {
  const thisWeek = mondayOf(toDateKey(new Date()))
  const [monday, setMonday] = useState(thisWeek)
  const dates = weekDates(monday)
  const inWeek = requests.filter((request) => request.date >= dates[0] && request.date <= dates[6])
  // 주말 방문이 없으면 토 · 일 칸은 숨긴다.
  const shown = dates.filter((key, index) => index < 5 || inWeek.some((request) => request.date === key))
  const workDays = dates.filter(isWorkingDay).length
  const capacity = workDays * HOURS_PER_DAY
  const loads = tallyLoads(inWeek, capacity)
  const maxRate = Math.max(0.01, ...loads.map((load) => load.manMonth))
  const totals = loads.reduce(
    (sum, load) => ({ main: sum.main + load.main, operator: sum.operator + load.operator, hours: sum.hours + load.hours }),
    { main: 0, operator: 0, hours: 0 },
  )
  const relative = monday === thisWeek ? '이번 주' : monday === addWeeks(thisWeek, 1) ? '다음 주' : monday === addWeeks(thisWeek, -1) ? '지난 주' : null

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
          <h3 className="text-[15px] font-bold text-warm-800">주간 인원별 투입</h3>
          <p className="mt-0.5 text-[12px] text-warm-600">
            날짜 칸은 그날 투입 시간(투어 1건 = 반일 4시간) · <b className="text-warm-800">진하게</b> 메인 / 연하게 운영 · 가동률 = 투입 시간 ÷ 근무일 {workDays}일 ×{' '}
            {HOURS_PER_DAY}시간({capacity}시간)
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead>
            <tr className="border-b border-warm-300/40 text-[12px] text-warm-600">
              <th className="px-4 py-2 text-left font-semibold">이름</th>
              {shown.map((key) => {
                const holiday = holidayName(key)
                const off = !isWorkingDay(key)
                return (
                  <th key={key} className={cn('px-2 py-2 text-center font-semibold', off && 'text-brand/70')} title={holiday}>
                    {WEEKDAYS[(parseDateKey(key).getDay() + 6) % 7]} {shortDate(key)}
                    {holiday && <span className="block text-[10px] font-normal">{holiday}</span>}
                  </th>
                )
              })}
              <th className="px-2 py-2 text-right font-semibold">메인</th>
              <th className="px-2 py-2 text-right font-semibold">운영</th>
              <th className="px-2 py-2 text-right font-semibold">투입 시간</th>
              <th className="px-2 py-2 text-right font-semibold">가동률</th>
              <th className="w-[14%] px-4 py-2" aria-label="가동률 막대" />
            </tr>
          </thead>
          <tbody>
            {GUIDE_ROSTER.map((member, row) => {
              const load = loads[row]
              return (
                <tr key={member.name} className="border-b border-warm-300/25">
                  <td className="whitespace-nowrap px-4 py-2 font-semibold text-warm-800">{memberLabel(member)}</td>
                  {shown.map((key) => {
                    const jobs = inWeek
                      .filter((request) => request.date === key)
                      .map((request) => ({ request, role: roleOf(request, member.name) }))
                      .filter((job) => job.role !== null)
                    const hours = jobs.reduce((sum, job) => sum + tourHours(job.request), 0)
                    const main = jobs.some((job) => job.role === 'main')
                    return (
                      <td
                        key={key}
                        className={cn(
                          'px-2 py-2 text-center tabular-nums',
                          jobs.length === 0 && 'text-warm-300',
                          main ? 'bg-[#30405f] font-semibold text-white' : jobs.length > 0 && 'bg-[#30405f]/15 text-warm-800',
                        )}
                        title={jobs
                          .map((job) => `${job.request.slot ? job.request.slot.slice(0, 5) : '미정'} ${job.request.company} (${job.role === 'main' ? '메인' : '운영'})`)
                          .join('\n')}
                      >
                        {jobs.length > 0 ? `${formatHours(hours)}h${jobs.length > 1 ? `(${jobs.length}건)` : ''}` : '–'}
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 text-right tabular-nums">{load.main}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{member.canOperate ? load.operator : '–'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatHours(load.hours)}h</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-warm-800">{Math.round(load.manMonth * 100)}%</td>
                  <td className="px-4 py-2">
                    <div className="h-2.5 bg-cream">
                      <div className="h-full bg-[#30405f]" style={{ width: `${(load.manMonth / maxRate) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-cream/50 font-semibold text-warm-800">
              <td className="px-4 py-2">합계</td>
              {shown.map((key) => (
                <td key={key} className="px-2 py-2 text-center tabular-nums">
                  {inWeek.filter((request) => request.date === key).length}건
                </td>
              ))}
              <td className="px-2 py-2 text-right tabular-nums">{totals.main}</td>
              <td className="px-2 py-2 text-right tabular-nums">{totals.operator}</td>
              <td className="px-2 py-2 text-right tabular-nums">{formatHours(totals.hours)}h</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
