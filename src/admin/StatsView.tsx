import { useMemo, useState, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadWorkbook } from '@/lib/xlsx'
import {
  INDUSTRIES,
  JOBS,
  OTHER,
  PURPOSES,
  TOURS,
  baseOption,
  clientSegment,
  headcountOf,
  isConfirmed,
  isCounted,
  type VisitRequest,
} from '@/lib/visit'
import { ColumnChart, DonutChart, type Datum } from './charts'
import { StatsGrid } from './StatsGrid'
import { buildStatsSheets, divisionStats, monthlyRows, yearlyRows } from './statsData'

/** 방문 유형 색: 차트와 같은 슬레이트 계열 + 신규 고객만 브랜드 색으로 강조 */
const SEGMENTS = [
  { label: '고객 · 기존', color: '#30405f' },
  { label: '고객 · 신규', color: '#a72b2b' },
  { label: '내부 방문', color: '#8e99ae' },
  { label: '고객 · 미분류', color: '#d5d9e0' },
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
        {subtitle && <span className="text-[12px] text-warm-600">{subtitle}</span>}
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
  const [gridView, setGridView] = useState<'month' | 'year'>('month')

  // 거절된 예약은 모든 통계에서 제외한다. (승인률 계산에만 거절 건수를 쓴다)
  const basisRequests = useMemo(
    () =>
      requests.filter((request) =>
        basis === 'approved' ? isConfirmed(request.status) : isCounted(request.status),
      ),
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
  const approved = allInPeriod.filter((request) => isConfirmed(request.status)).length
  const decided = allInPeriod.filter((request) => isConfirmed(request.status) || request.status === 'rejected').length
  const visitors = scoped.reduce((sum, request) => sum + headcountOf(request), 0)
  const previousVisitors = previous.reduce((sum, request) => sum + headcountOf(request), 0)

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
  const languages: Datum[] = [
    { label: '한국어', value: scoped.filter((request) => request.language !== 'foreign').length },
    {
      label: '외국어 · 통역 동반',
      value: scoped.filter((request) => request.language === 'foreign' && request.interpreter).length,
    },
    {
      label: '외국어 · 통역 없음',
      value: scoped.filter((request) => request.language === 'foreign' && !request.interpreter).length,
    },
  ]
  const jobs = JOBS.map((job) => ({
    label: job,
    value: scoped.reduce((sum, request) => sum + request.visitors.filter((visitor) => visitor.jobs.includes(job)).length, 0),
  }))

  const divisions = divisionStats(scoped)
  const divisionPeople: Datum[] = divisions.map((row) => ({ label: row.label, value: row.people }))

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

  const gridRows = gridView === 'month' ? monthlyRows(requests, year) : yearlyRows(requests, years)

  const exportExcel = () => {
    const fileLabel = period === 'year' ? `${year}` : `${year}-${String(month).padStart(2, '0')}`
    downloadWorkbook(
      `TDL_visit_stats_${fileLabel}.xlsx`,
      buildStatsSheets({
        requests,
        periodRequests: allInPeriod.filter((request) => isCounted(request.status)),
        scoped,
        year,
        years,
        periodLabel,
      }),
    )
  }

  const kpis = [
    {
      label: basis === 'approved' ? '승인·완료 건수' : '신청 건수',
      value: scoped.length,
      unit: '건',
      delta: scoped.length - previous.length,
    },
    {
      // 집계 기준이 '전체'면 승인 대기까지 포함한 신청 인원이라 아래 통계표의 '방문 인원(승인·완료)'과 다르다.
      label: basis === 'approved' ? '방문 인원' : '신청 인원 (대기 포함)',
      value: visitors,
      unit: '명',
      delta: visitors - previousVisitors,
    },
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
            { value: 'all', label: '전체 (거절·취소 제외)' },
            { value: 'approved', label: '승인·완료만' },
          ]}
        />
        <span className="ml-auto text-[12px] text-warm-600">방문일 기준 · {periodLabel}</span>
        <button
          type="button"
          onClick={exportExcel}
          className="inline-flex items-center gap-1.5 border border-warm-800 bg-warm-800 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:brightness-110"
        >
          <Download width={14} height={14} /> 엑셀 다운로드
        </button>
      </div>

      <div className="grid grid-cols-2 border border-warm-300/50 bg-white lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className={cn(
              'px-5 py-4',
              index % 2 === 1 && 'border-l border-warm-300/40',
              index >= 2 && 'border-t border-warm-300/40 lg:border-t-0',
              index === 2 && 'lg:border-l',
            )}
          >
            <p className="text-[13px] font-semibold text-warm-600">{kpi.label}</p>
            <p className="mt-1 text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-warm-800">
              {kpi.value}
              <span className="ml-1 text-base font-medium text-warm-600">{kpi.unit}</span>
            </p>
            <p className="mt-2 text-[12px] tabular-nums text-warm-600">
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

      {/* 핵심: 추이를 가장 크게, 세부 분석은 아래로 작게 */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="월별 추이" subtitle={`${year}년 · 월별 ${basis === 'approved' ? '승인' : '신청'} 건수`}>
          <ColumnChart data={monthly} height={220} />
        </Card>
        <Card title="연도별 추이" subtitle="연도별 합계">
          <ColumnChart data={yearly} height={220} />
        </Card>
      </div>

      <Card title="담당(실)별 방문 인원" subtitle={`${periodLabel} · 주요 6개 담당 + 기타`}>
        <ColumnChart data={divisionPeople} height={170} unit="명" />
        <dl className="mt-3 grid grid-cols-7 gap-[2px] border-t border-warm-300/40 pl-9 pr-1 pt-2 text-center">
          {divisions.map((row) => (
            <div key={row.label}>
              <dt className="sr-only">{row.label} 방문 건수</dt>
              <dd className="font-mono text-[11px] tabular-nums text-warm-600">{row.count}건</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="방문 유형" subtitle={periodLabel}>
          <div className="flex min-h-[188px] items-center justify-center">
            <DonutChart data={segments} />
          </div>
        </Card>
        <Card title="방문 목적" subtitle="복수 선택 포함">
          <ColumnChart data={purposes} total={scoped.length} height={150} />
        </Card>
        <Card title="투어 종류" subtitle={periodLabel}>
          <ColumnChart data={tours} height={150} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="업종 (고객 방문)" subtitle={`${periodLabel} · 많은 순`}>
          <ColumnChart data={industries} height={150} total={external.length} />
        </Card>
        <Card title="투어 언어" subtitle="방문 측 통역 동반 여부">
          <ColumnChart data={languages} height={150} />
        </Card>
      </div>

      <Card title="방문자 직무" subtitle={`${periodLabel} · 방문자 수 기준`}>
        <ColumnChart data={jobs} height={130} unit="명" />
      </Card>

      <section className="border border-warm-300/50 bg-white p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-warm-800">기간별 통계표</h3>
            <p className="mt-0.5 text-[12px] text-warm-600">
              거절 · 취소 건은 통계에서 제외(해당 열만 참고 표시) · 열마다 값이 클수록 진하게 표시 · 엑셀에는 월별/연도별/항목별/예약 목록 시트가 함께 저장됩니다
            </p>
          </div>
          <Segmented
            label="표 단위"
            value={gridView}
            onChange={setGridView}
            options={[
              { value: 'month', label: `${year}년 월별` },
              { value: 'year', label: '연도별' },
            ]}
          />
        </header>
        <StatsGrid rows={gridRows} firstHeader={gridView === 'month' ? '월' : '연도'} />
      </section>
    </div>
  )
}
