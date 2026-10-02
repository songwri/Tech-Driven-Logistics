import { STATUS_LABEL, TOUR_BY_ID, type VisitRequest, type VisitStatus, type TourType, type Visitor } from '@/lib/visit'

/**
 * 서버(구글 시트)에서 온 예약 한 건을 화면이 기대하는 모양으로 정리한다.
 * 시트를 직접 고치거나 이전 버전 서버가 만든 행에 값이 빠져 있어도 화면 전체가 멈추지 않게 한다.
 */
const text = (value: unknown) => (value === null || value === undefined ? '' : String(value))
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : [])

function visitor(value: unknown): Visitor {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return { name: text(v.name), title: text(v.title), org: text(v.org), email: text(v.email), car: text(v.car), jobs: list(v.jobs) }
}

export function normalizeRequest(value: unknown): VisitRequest {
  const r = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const host = (r.host && typeof r.host === 'object' ? r.host : {}) as Record<string, unknown>
  const tour = (text(r.tour) in TOUR_BY_ID ? text(r.tour) : 'other') as TourType
  const status = (text(r.status) in STATUS_LABEL ? text(r.status) : 'pending') as VisitStatus
  const headcount = Number(r.headcount)
  return {
    id: text(r.id),
    createdAt: text(r.createdAt),
    status,
    tour,
    date: text(r.date).slice(0, 10),
    slot: text(r.slot),
    category: r.category === 'internal' ? 'internal' : 'external',
    clientType: r.clientType === 'new' || r.clientType === 'existing' ? r.clientType : undefined,
    language: r.language === 'foreign' ? 'foreign' : 'ko',
    foreignLanguage: text(r.foreignLanguage),
    interpreter: r.interpreter === true,
    interpreterLanguage: text(r.interpreterLanguage),
    company: text(r.company),
    industries: list(r.industries),
    purposes: list(r.purposes),
    host: {
      name: text(host.name),
      title: text(host.title),
      division: text(host.division),
      org: text(host.org),
      phone: text(host.phone),
      email: text(host.email),
    },
    hostComment: text(r.hostComment),
    visitors: Array.isArray(r.visitors) ? r.visitors.map(visitor) : [],
    note: text(r.note),
    consent: r.consent === true,
    adminMemo: text(r.adminMemo),
    source: r.source === 'manual' ? 'manual' : 'web',
    headcount: r.headcount === null || r.headcount === undefined || r.headcount === '' || !Number.isFinite(headcount) ? undefined : headcount,
    keyPersons: text(r.keyPersons),
    guides: text(r.guides),
    departments: list(r.departments),
    followUp: text(r.followUp),
  }
}

export const normalizeRequests = (value: unknown) =>
  (Array.isArray(value) ? value.map(normalizeRequest) : []).filter((request) => request.id)
