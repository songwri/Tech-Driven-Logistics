/**
 * 방문 예약 도메인 — 투어 종류, 시간대, 중복 판정, 입력 항목 목록.
 * 예약 화면과 관리자 대시보드가 같은 규칙을 쓰도록 한곳에 모았습니다.
 * (apps-script/Code.gs 의 TOURS 정의와 값이 같아야 합니다.)
 */

export type TourType = 'combined' | 'center' | 'lab'
export type VisitStatus = 'pending' | 'approved' | 'rejected'
export type VisitCategory = 'internal' | 'external'
export type ClientType = 'existing' | 'new'
export type TourLanguage = 'ko' | 'foreign'
/** 센터와 TDL Lab은 한 번에 한 팀만 안내합니다. */
export type Resource = 'center' | 'lab'

export interface TourDefinition {
  id: TourType
  label: string
  short: string
  description: string
  duration: string
  /** 'HH:mm-HH:mm' */
  slots: string[]
  color: string
}

/**
 * - TDL Lab 투어: 10:30–11:30, 14:00–15:00
 * - 센터 투어: 10:00–16:00 사이 1시간 단위 (점심 12:00–13:00 제외)
 * - 종합 투어: 센터 1시간 → TDL Lab 1시간. Lab 시간대 앞에 한 시간을 붙여
 *   09:30–11:30, 13:00–15:00
 */
export const TOURS: TourDefinition[] = [
  {
    id: 'combined',
    label: '종합 투어',
    short: '종합',
    description: '물류센터 + TDL Lab',
    duration: '약 2시간',
    slots: ['09:30-11:30', '13:00-15:00'],
    color: '#2a78d6',
  },
  {
    id: 'center',
    label: '센터 투어',
    short: '센터',
    description: '물류센터 현장',
    duration: '약 1시간',
    slots: ['10:00-11:00', '11:00-12:00', '13:00-14:00', '14:00-15:00', '15:00-16:00'],
    color: '#eb6834',
  },
  {
    id: 'lab',
    label: 'TDL Lab 투어',
    short: 'Lab',
    description: '기술 체험 공간',
    duration: '약 1시간',
    slots: ['10:30-11:30', '14:00-15:00'],
    color: '#1baf7a',
  },
]

export const TOUR_BY_ID = Object.fromEntries(TOURS.map((tour) => [tour.id, tour])) as Record<
  TourType,
  TourDefinition
>

/** 월·수·금만 운영합니다. */
export const OPEN_WEEKDAYS = [1, 3, 5]
export const CLOSED_WEEKDAYS = [0, 2, 4, 6]

export const STATUS_LABEL: Record<VisitStatus, string> = {
  pending: '대기중',
  approved: '승인됨',
  rejected: '거절됨',
}

export const CATEGORY_LABEL: Record<VisitCategory, string> = {
  internal: '내부 방문',
  external: '고객 방문',
}

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  existing: '기존 고객사',
  new: '신규 고객사',
}

/** 업종은 산업군별로 묶어 보여줍니다. 순서가 곧 화면 표시 순서입니다. */
export const INDUSTRY_GROUPS: { label: string; items: string[] }[] = [
  { label: '제조 · 산업재', items: ['제조', '전자', '가전', '자동차', '화학'] },
  { label: '소비재', items: ['식품', '화장품', '의류', '제약/헬스케어', '가구/인테리어'] },
  { label: '유통 · 물류', items: ['유통', '이커머스', 'CVS/편의점', '물류'] },
]
export const INDUSTRIES = INDUSTRY_GROUPS.flatMap((group) => group.items)

export const PURPOSES = ['기존 고객사 Lock-in', '신규 영업', '교육', '투어']

export const JOBS = [
  '경영진',
  '영업',
  '기획',
  '마케팅',
  '구매',
  '운영',
  '물류',
  '품질관리',
  'IT/개발',
  'R&D/연구개발',
]

export const TOUR_LANGUAGE_LABEL: Record<TourLanguage, string> = {
  ko: '한국어',
  foreign: '외국어',
}

/** 외국어 투어에서 고를 수 있는 언어 (그 외는 '기타: 직접입력') */
export const FOREIGN_LANGUAGES = ['영어', '중국어', '일본어', '베트남어']

export const MAX_VISITORS = 30
export const OTHER = '기타'

export interface Visitor {
  name: string
  title: string
  org: string
  email: string
  car: string
  jobs: string[]
}

export interface VisitHost {
  name: string
  title: string
  org: string
  phone: string
  email: string
}

export interface VisitDraft {
  tour: TourType
  /** 'YYYY-MM-DD' */
  date: string
  /** 'HH:mm-HH:mm' */
  slot: string
  category: VisitCategory
  /** 고객 방문일 때만 */
  clientType?: ClientType
  /** 투어 진행 언어 */
  language: TourLanguage
  /** 외국어 투어일 때 언어 ('영어', '기타: 태국어' 등) */
  foreignLanguage: string
  /** 방문 측(고객사)에서 통역이 동반되는지 */
  interpreter: boolean
  company: string
  /** '기타: 직접입력' 형태로 기타 항목이 들어올 수 있습니다. */
  industries: string[]
  purposes: string[]
  host: VisitHost
  hostComment: string
  visitors: Visitor[]
  note: string
  consent: boolean
}

export interface VisitRequest extends VisitDraft {
  id: string
  status: VisitStatus
  createdAt: string
  adminMemo: string
}

/** 확정된 예약 또는 휴무가 점유하는 구간 (개인정보 없음). */
export interface BusySegment {
  date: string
  /** 'all' 은 휴무 등 두 공간을 모두 막는 경우 */
  resource: Resource | 'all'
  from: string
  to: string
}

export const emptyVisitor = (): Visitor => ({ name: '', title: '', org: '', email: '', car: '', jobs: [] })

/* ------------------------------------------------------------ 날짜 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function weekdayOf(key: string) {
  return WEEKDAYS[parseDateKey(key).getDay()]
}

/** 2026-09-30 → 2026.09.30 (수) */
export function formatDateShort(key: string) {
  return `${key.replaceAll('-', '.')} (${weekdayOf(key)})`
}

/** 2026-09-30 → 2026년 9월 30일 (수) */
export function formatDateLong(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return `${year}년 ${month}월 ${day}일 (${weekdayOf(key)})`
}

export function formatSlot(slot: string) {
  return slot.replace('-', ' – ')
}

/* ------------------------------------------------------- 중복 판정 */

function toMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function fromMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** 투어 한 건이 어떤 공간을 언제 쓰는지. 종합 투어는 센터 1시간 → Lab 순서입니다. */
export function segmentsOf(tour: TourType, date: string, slot: string): BusySegment[] {
  const [from, to] = slot.split('-')
  if (tour === 'combined') {
    const handoff = fromMinutes(toMinutes(from) + 60)
    return [
      { date, resource: 'center', from, to: handoff },
      { date, resource: 'lab', from: handoff, to },
    ]
  }
  return [{ date, resource: tour, from, to }]
}

function overlaps(a: BusySegment, b: BusySegment) {
  if (a.date !== b.date) return false
  if (a.resource !== 'all' && b.resource !== 'all' && a.resource !== b.resource) return false
  return toMinutes(a.from) < toMinutes(b.to) && toMinutes(b.from) < toMinutes(a.to)
}

export function isSlotBusy(tour: TourType, date: string, slot: string, busy: BusySegment[]) {
  const wanted = segmentsOf(tour, date, slot)
  return busy.some((segment) => wanted.some((part) => overlaps(part, segment)))
}

/** 승인된 예약들이 점유한 구간 (관리자 화면에서 승인 전 중복 확인용). */
export function busyFromRequests(requests: VisitRequest[], excludeId?: string) {
  return requests
    .filter((request) => request.status === 'approved' && request.id !== excludeId)
    .flatMap((request) => segmentsOf(request.tour, request.date, request.slot))
}

export function isOpenWeekday(date: Date) {
  return OPEN_WEEKDAYS.includes(date.getDay())
}

/** '기타: 직접입력' → '기타' (통계 집계용) */
export function baseOption(value: string) {
  return value.startsWith(OTHER) ? OTHER : value
}

/** '한국어' 또는 '영어 · 통역 동반' 형태 */
export function languageSummary(request: Pick<VisitDraft, 'language' | 'foreignLanguage' | 'interpreter'>) {
  if (request.language !== 'foreign') return TOUR_LANGUAGE_LABEL.ko
  const name = request.foreignLanguage.replace(/^기타:\s*/, '') || TOUR_LANGUAGE_LABEL.foreign
  return `${name} · ${request.interpreter ? '통역 동반' : '통역 없음'}`
}

export function clientSegment(request: Pick<VisitDraft, 'category' | 'clientType'>) {
  if (request.category === 'internal') return '내부 방문'
  return request.clientType === 'new' ? '고객 · 신규' : '고객 · 기존'
}

/** 제출 전 칩 선택 항목 검사 (input required 로는 잡히지 않는 부분). */
export function validateVisitDraft(draft: VisitDraft): string | null {
  if (!draft.date) return '방문 희망일을 선택해 주세요. (월·수·금만 가능합니다)'
  if (!draft.slot) return '방문 시간을 선택해 주세요.'
  if (draft.category === 'external' && !draft.clientType) return '고객 유형(기존/신규)을 선택해 주세요.'
  if (draft.category === 'external' && draft.industries.length === 0) return '업종을 하나 이상 선택해 주세요.'
  if (draft.industries.includes(OTHER)) return '기타 업종을 입력해 주세요.'
  if (draft.language === 'foreign' && (!draft.foreignLanguage || draft.foreignLanguage === OTHER)) {
    return '투어 진행 언어를 선택해 주세요.'
  }
  if (draft.purposes.length === 0) return '방문 목적을 하나 이상 선택해 주세요.'
  if (draft.purposes.includes(OTHER)) return '기타 방문 목적을 입력해 주세요.'
  if (draft.visitors.length === 0) return '방문자를 한 명 이상 등록해 주세요.'
  if (!draft.consent) return '개인정보 수집 · 이용에 동의해 주세요.'
  return null
}
