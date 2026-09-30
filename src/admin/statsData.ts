import {
  INDUSTRIES,
  JOBS,
  OTHER,
  PURPOSES,
  STATUS_LABEL,
  TOURS,
  TOUR_BY_ID,
  baseOption,
  clientSegment,
  formatDateShort,
  languageSummary,
  type VisitRequest,
} from '@/lib/visit'
import type { Sheet, SheetColumn } from '@/lib/xlsx'

/** 기간(월/연) 한 줄의 집계값 */
export interface PeriodRow {
  label: string
  total: number
  pending: number
  approved: number
  rejected: number
  /** 처리(승인+거절) 대비 승인 비율, 0~1 */
  approvalRate: number | null
  visitors: number
  combined: number
  center: number
  lab: number
  internal: number
  existing: number
  newClient: number
  korean: number
  foreign: number
  interpreter: number
}

export type MetricKey = Exclude<keyof PeriodRow, 'label'>

export interface MetricColumn {
  key: MetricKey
  label: string
  group: string
  percent?: boolean
}

export const METRIC_COLUMNS: MetricColumn[] = [
  { key: 'total', label: '신청', group: '처리 현황' },
  { key: 'pending', label: '대기', group: '처리 현황' },
  { key: 'approved', label: '승인', group: '처리 현황' },
  { key: 'rejected', label: '거절', group: '처리 현황' },
  { key: 'approvalRate', label: '승인률', group: '처리 현황', percent: true },
  { key: 'visitors', label: '방문 인원(승인)', group: '처리 현황' },
  { key: 'combined', label: '종합', group: '투어 종류' },
  { key: 'lab', label: 'Lab', group: '투어 종류' },
  { key: 'center', label: '센터', group: '투어 종류' },
  { key: 'internal', label: '내부 방문', group: '방문 유형' },
  { key: 'existing', label: '고객·기존', group: '방문 유형' },
  { key: 'newClient', label: '고객·신규', group: '방문 유형' },
  { key: 'korean', label: '한국어', group: '투어 언어' },
  { key: 'foreign', label: '외국어', group: '투어 언어' },
  { key: 'interpreter', label: '통역 동반', group: '투어 언어' },
]

export function summarize(label: string, requests: VisitRequest[]): PeriodRow {
  const count = (test: (request: VisitRequest) => boolean) => requests.filter(test).length
  const approvedList = requests.filter((request) => request.status === 'approved')
  const rejected = count((request) => request.status === 'rejected')
  return {
    label,
    total: requests.length,
    pending: count((request) => request.status === 'pending'),
    approved: approvedList.length,
    rejected,
    approvalRate: approvedList.length + rejected > 0 ? approvedList.length / (approvedList.length + rejected) : null,
    visitors: approvedList.reduce((sum, request) => sum + request.visitors.length, 0),
    combined: count((request) => request.tour === 'combined'),
    center: count((request) => request.tour === 'center'),
    lab: count((request) => request.tour === 'lab'),
    internal: count((request) => request.category === 'internal'),
    existing: count((request) => request.category === 'external' && request.clientType !== 'new'),
    newClient: count((request) => request.category === 'external' && request.clientType === 'new'),
    korean: count((request) => request.language !== 'foreign'),
    foreign: count((request) => request.language === 'foreign'),
    interpreter: count((request) => request.language === 'foreign' && request.interpreter),
  }
}

export function monthlyRows(requests: VisitRequest[], year: number) {
  const rows = Array.from({ length: 12 }, (_, index) => {
    const prefix = `${year}-${String(index + 1).padStart(2, '0')}-`
    return summarize(`${index + 1}월`, requests.filter((request) => request.date.startsWith(prefix)))
  })
  return [...rows, summarize('합계', requests.filter((request) => request.date.startsWith(`${year}-`)))]
}

export function yearlyRows(requests: VisitRequest[], years: number[]) {
  const rows = years.map((year) => summarize(`${year}년`, requests.filter((request) => request.date.startsWith(`${year}-`))))
  return [...rows, summarize('합계', requests.filter((request) => years.some((year) => request.date.startsWith(`${year}-`))))]
}

/* ---------------------------------------------------------- 엑셀 */

function periodSheet(name: string, firstHeader: string, rows: PeriodRow[]): Sheet {
  const columns: SheetColumn[] = [
    { header: firstHeader, width: 10 },
    ...METRIC_COLUMNS.map((column) => ({
      header: `${column.group} · ${column.label}`,
      width: Math.max(12, column.group.length + column.label.length + 6),
      percent: column.percent,
    })),
  ]
  return {
    name,
    columns,
    rows: rows.map((row) => [row.label, ...METRIC_COLUMNS.map((column) => row[column.key])]),
    totalRow: true,
  }
}

function distributionSheet(name: string, requests: VisitRequest[]): Sheet {
  const rows: (string | number)[][] = []
  const push = (group: string, counts: [string, number][], base: number) => {
    for (const [label, value] of counts) rows.push([group, label, value, base > 0 ? value / base : 0])
  }
  const tally = (keys: (request: VisitRequest) => string[], order: string[], list = requests) => {
    const map = new Map(order.map((key) => [key, 0]))
    for (const request of list) for (const key of new Set(keys(request))) map.set(key, (map.get(key) ?? 0) + 1)
    return [...map]
  }
  const external = requests.filter((request) => request.category === 'external')

  push('방문 목적', tally((request) => request.purposes.map(baseOption), [...PURPOSES, OTHER]), requests.length)
  push('방문 유형', tally((request) => [clientSegment(request)], ['고객 · 기존', '고객 · 신규', '내부 방문']), requests.length)
  push('투어 종류', tally((request) => [TOUR_BY_ID[request.tour].label], TOURS.map((tour) => tour.label)), requests.length)
  push(
    '투어 언어',
    tally((request) => [request.language === 'foreign' ? languageSummary(request) : '한국어'], ['한국어']),
    requests.length,
  )
  push('업종(고객 방문)', tally((request) => request.industries.map(baseOption), [...INDUSTRIES, OTHER], external), external.length)
  const visitorCount = requests.reduce((sum, request) => sum + request.visitors.length, 0)
  push(
    '방문자 직무',
    JOBS.map((job) => [
      job,
      requests.reduce((sum, request) => sum + request.visitors.filter((visitor) => visitor.jobs.includes(job)).length, 0),
    ]),
    visitorCount,
  )

  return {
    name,
    columns: [
      { header: '구분', width: 16 },
      { header: '항목', width: 22 },
      { header: '건수', width: 10 },
      { header: '비율', width: 10, percent: true },
    ],
    rows,
  }
}

function listSheet(name: string, requests: VisitRequest[]): Sheet {
  const sorted = [...requests].sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
  return {
    name,
    columns: [
      { header: '방문일', width: 16 },
      { header: '시간', width: 13 },
      { header: '투어', width: 13 },
      { header: '투어 언어', width: 18 },
      { header: '방문 유형', width: 12 },
      { header: '업체/조직', width: 22 },
      { header: '업종', width: 18 },
      { header: '방문 목적', width: 22 },
      { header: '담당자', width: 10 },
      { header: '담당자 조직', width: 22 },
      { header: '방문 인원', width: 10 },
      { header: '상태', width: 9 },
      { header: '관리자 메모', width: 30 },
    ],
    rows: sorted.map((request) => [
      formatDateShort(request.date),
      request.slot,
      TOUR_BY_ID[request.tour].label,
      languageSummary(request),
      clientSegment(request),
      request.company,
      request.industries.join(', '),
      request.purposes.join(', '),
      request.host.name,
      request.host.org,
      request.visitors.length,
      STATUS_LABEL[request.status],
      request.adminMemo,
    ]),
  }
}

export function buildStatsSheets({
  requests,
  periodRequests,
  scoped,
  year,
  years,
  periodLabel,
}: {
  /** 전체 예약 (상태 무관) */
  requests: VisitRequest[]
  /** 선택 기간의 예약 (상태 무관) */
  periodRequests: VisitRequest[]
  /** 선택 기간 · 집계 기준(전체/승인)이 적용된 예약 */
  scoped: VisitRequest[]
  year: number
  years: number[]
  periodLabel: string
}): Sheet[] {
  return [
    periodSheet(`${year}년 월별`, '월', monthlyRows(requests, year)),
    periodSheet('연도별', '연도', yearlyRows(requests, years)),
    distributionSheet(`항목별 분포(${periodLabel})`, scoped),
    listSheet(`예약 목록(${periodLabel})`, periodRequests),
  ]
}
