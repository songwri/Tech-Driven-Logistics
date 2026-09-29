import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  INDUSTRIES,
  JOBS,
  OTHER,
  PURPOSES,
  TOURS,
  baseOption,
  clientSegment,
  type VisitRequest,
} from '@/lib/visit'
import { ColumnChart, DonutChart, type Datum } from './charts'

/** 고객 구분 색 (투어 색과 겹치지 않는 3색, 팔레트 검증 완료) */
const SEGMENTS = [
  { label: '외부 · 기존', color: '#4a3aa7' },
  { label: '외부 · 신규', color: '#e87ba4' },
  { label: '내부', color: '#eda100' },
]

type Period = 'year' | 'month'
type Basis = 'all' | 'approved'

function countBy(requests: VisitRequest[], keys: (request: VisitRequest) => string[], order: string[]) {
  const counts = new Map(order.map((key) => [key, 0]))
  for (const request of requests) {
    for (const key of new Set(keys(request))) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts].map(([label, value]) => ({ label, value }))
}

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('border border-warm-300/50 bg-white p-5', className)}>
      <header className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-bold text-warm-800">{title}</h3>
        {subtitle && <span className="font-mono text-[11px] text-warm-600">{subtitle}</span>}
      </header>
      {children}
    </section>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="inline-flex border border-warm-300/60" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 text-[13px] font-semibold transition',
            value === option.value ? 'bg-warm-800 text-white' : 'text-warm-600 hover:text-warm-800',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function StatsView({ requests }: { requests: VisitRequest[] }) {
  const [now] = useState(() => new Date())
  const years = useMemo(() => {
    const set = new Set(requests.map((request) => Number(request.date.slice(0, 4))))
    set.add(now.getFullYear())
    return [...set].sort((a, b) => a - b)
  }, [requests, now])

  const [year, setYear] = useState(now.getFullYear())
  const [period, setPeriod] = useState<Period>('year')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [basis, setBasis] = useState<Basis>('all')

  const basisRequests = useMemo(
    () => (basis === 'approved' ? requests.filter((request) => request.status === 'approved') : requests),
    [requests, basis],
  )

  const prefix = period === 'year' ? `${year}-` : `${year}-${String(month).padStart(2, '0')}-`
  const scoped = useMemo(() => basisRequests.filter((request) => request.date.startsWith(prefix)), [basisRequests, prefix])
  const periodLabel = period === 'year' ? `${year}년` : `${year}년 ${month}월`

  // 비교 기간: 전년 / 전월
  const previousPrefix =
    period === 'year'
      ? `${year - 1}-`
      : month === 1
        ? `${year - 1}-12-`
        : `${year}-${String(month - 1).padStart(2, '0')}-`
  const previous = basisRequests.filter((request) => request.date.startsWith(previousPrefix))

  const allInPeriod = requests.filter((request) => request.date.startsWith(prefix))
  const approved = allInPeriod.filter((request) => request.status === 'approved').length
  const decided = allInPeriod.filter((request) => request.status !== 'pending').length
  const visitors = scoped.reduce((sum, request) => sum + request.visitors.length, 0)
  const previousVisitors = previous.reduce((sum, request) => sum + request.visitors.length, 0)

  const purposes = countBy(scoped, (request) => request.purposes.map(baseOption), [...PURPOSES, OTHER])
  const segments = SEGMENTS.map((segment) => ({
    ...segment,
    value: scoped.filter((request) => clientSegment(request) === segment.label).length,
  }))
  const tours: Datum[] = TOURS.map((tour) => ({
    label: tour.label,
    value: scoped.filter((request) => request.tour === tour.id).length,
    color: tour.color,
  }))
  const external = scoped.filter((request) => request.category === 'external')
  const industries = countBy(external, (request) => request.industries.map(baseOption), [...INDUSTRIES, OTHER])
    .filter((datum) => datum.value > 0)
    .sort((a, b) => b.value - a.value)
  const jobs = JOBS.map((job) => ({
    label: job,
    value: scoped.reduce((sum, request) => sum + request.visitors.filter((visitor) => visitor.jobs.includes(job)).length, 0),
  }))

  const monthly: Datum[] = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, '0')}-`
    return {
      label: `${index + 1}월`,
      value: basisRequests.filter((request) => request.date.startsWith(key)).length,
      dim: period === 'month' && index + 1 !== month,
    }
  })
  const yearly: Datum[] = years.map((item) => ({
    label: `${item}년`,
    value: basisRequests.filter((request) => request.date.startsWith(`${item}-`)).length,
    dim: item !== year,
  }))

  const kpis = [
    {
      label: basis === 'approved' ? '승인 건수' : '신청 건수',
      value: scoped.length,
      unit: '건',
      delta: scoped.length - previous.length,
    },
    { label: '방문 인원', value: visitors, unit: '명', delta: visitors - previousVisitors },
    {
      label: '승인률',
      value: decided > 0 ? Math.round((approved / decided) * 100) : 0,
      unit: '%',
      note: `처리 ${decided}건 중 승인 ${approved}건`,
    },
    {
      label: '건당 평균 인원',
      value: scoped.length > 0 ? Math.round((visitors / scoped.length) * 10) / 10 : 0,
      unit: '명',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 border border-warm-300/50 bg-white px-4 py-3">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="연도"
          className="border border-warm-300/60 bg-white px-2 py-1.5 text-[13px] font-semibold text-warm-800"
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}년
            </option>
          ))}
        </select>
        <Segmented
          label="조회 단위"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'year', label: '연간' },
            { value: 'month', label: '월별' },
          ]}
        />
        {period === 'month' && (
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="월"
            className="border border-warm-300/60 bg-white px-2 py-1.5 text-[13px] font-semibold text-warm-800"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index} value={index + 1}>
                {index + 1}월
              </option>
            ))}
          </select>
        )}
        <span className="hidden h-5 w-px bg-warm-300/50 sm:block" />
        <Segmented
          label="집계 기준"
          value={basis}
          onChange={setBasis}
          options={[
            { value: 'all', label: '전체 신청' },
            { value: 'approved', label: '승인 건만' },
          ]}
        />
        <span className="ml-auto font-mono text-[11px] text-warm-600">방문일 기준 · {periodLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="border border-warm-300/50 bg-white px-4 py-3">
            <p className="font-mono text-[11px] text-warm-600">{kpi.label}</p>
            <p className="mt-1 text-3xl font-bold text-warm-800">
              {kpi.value}
              <span className="ml-0.5 text-base font-semibold text-warm-600">{kpi.unit}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-warm-600">
              {'delta' in kpi && kpi.delta !== undefined ? (
                <>
                  {period === 'year' ? '전년' : '전월'} 대비{' '}
                  <b className={kpi.delta > 0 ? 'text-[#2b8a3e]' : kpi.delta < 0 ? 'text-brand' : 'text-warm-600'}>
                    {kpi.delta > 0 ? '▲' : kpi.delta < 0 ? '▼' : '–'} {Math.abs(kpi.delta)}
                  </b>
                </>
              ) : (
                (kpi.note ?? ' ')
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card title="방문 목적" subtitle={`${periodLabel} · 복수 선택 포함`}>
          <ColumnChart data={purposes} total={scoped.length} />
        </Card>
        <Card title="고객 구분" subtitle={periodLabel}>
          <div className="flex min-h-[208px] items-center justify-center">
            <DonutChart data={segments} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card title="월별 추이" subtitle={`${year}년 · 월별 ${basis === 'approved' ? '승인' : '신청'} 건수`}>
          <ColumnChart data={monthly} height={160} />
        </Card>
        <Card title="연도별 추이" subtitle="연도별 합계">
          <ColumnChart data={yearly} height={160} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <Card title="투어 종류" subtitle={periodLabel}>
          <ColumnChart data={tours} height={160} />
        </Card>
        <Card title="업종 (외부 방문)" subtitle={`${periodLabel} · 많은 순`}>
          <ColumnChart data={industries} height={160} total={external.length} />
        </Card>
      </div>

      <Card title="방문자 직무" subtitle={`${periodLabel} · 방문자 수 기준`}>
        <ColumnChart data={jobs} height={140} unit="명" />
      </Card>
    </div>
  )
}
