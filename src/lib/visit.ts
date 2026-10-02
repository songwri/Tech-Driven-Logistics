/**
 * 방문 예약 도메인 — 투어 종류, 시간대, 중복 판정, 입력 항목 목록.
 * 예약 화면과 관리자 대시보드가 같은 규칙을 쓰도록 한곳에 모았습니다.
 * (apps-script/Code.gs 의 TOURS 정의와 값이 같아야 합니다.)
 */

/** other: 기존 방문 이력 · 수기 등록처럼 정해진 투어 시간표 밖의 방문 (웹 예약에서는 선택 불가) */
export type TourType = 'combined' | 'center' | 'lab' | 'other'
/** completed: 방문 완료 / cancelled: 일정 취소. 거절 · 취소는 통계에서 제외한다. */
export type VisitStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled'
/** web: 예약 페이지 신청 / manual: 관리자 수기 등록 · 기존 이력 가져오기 */
export type VisitSource = 'web' | 'manual'
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
  /** 투어 색: 상태 색(주황 · 초록 · 파랑 · 회색)과 겹치지 않게 남색 · 보라 · 청록을 쓴다. */
  color: string
}

/**
 * 화면 표시 순서: 종합 → TDL Lab → 센터
 * - TDL Lab 투어: 10:30–11:30, 14:00–15:00
 * - 센터 투어: 오전 09:30–10:30 · 10:30–11:30, 오후 13:00–16:00 사이 1시간 단위 (점심 11:30–13:00 제외)
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
    color: '#3b4a6b',
  },
  {
    id: 'lab',
    label: 'TDL Lab 투어',
    short: 'Lab',
    description: '기술 체험 공간',
    duration: '약 1시간',
    slots: ['10:30-11:30', '14:00-15:00'],
    color: '#7c5cc4',
  },
  {
    id: 'center',
    label: '센터 투어',
    short: '센터',
    description: '물류센터 현장',
    duration: '약 1시간',
    slots: ['09:30-10:30', '10:30-11:30', '13:00-14:00', '14:00-15:00', '15:00-16:00'],
    color: '#1a8fa0',
  },
  {
    id: 'other',
    label: '기타 방문',
    short: '기타',
    description: '수기 등록 · 기존 이력',
    duration: '시간 자유',
    slots: [],
    color: '#8a8f98',
  },
]

/**
 * 관리자 보기 범위. 센터 담당자와 TDL Lab 담당자가 각자 관련된 실적만 볼 수 있게 한다.
 * - center: 센터 관리자용 = 종합 + 센터 투어
 * - lab: Lab 관리자용 = 종합 + Lab 투어 (+ 투어 종류가 없는 수기 · 기존 이력은 일단 여기에 포함)
 */
export type AdminScope = 'all' | 'center' | 'lab'

export const ADMIN_SCOPES: { id: AdminScope; label: string; hint: string }[] = [
  { id: 'all', label: '전체', hint: '모든 투어' },
  { id: 'center', label: '센터 관리자용', hint: '종합 + 센터 투어' },
  { id: 'lab', label: 'Lab 관리자용', hint: '종합 + Lab 투어 · 기타 방문' },
]

const SCOPE_TOURS: Record<AdminScope, TourType[] | null> = {
  all: null,
  center: ['combined', 'center'],
  lab: ['combined', 'lab', 'other'],
}

export const inAdminScope = (tour: TourType, scope: AdminScope) => {
  const tours = SCOPE_TOURS[scope]
  return !tours || tours.includes(tour)
}

/** 방명록에서 방문자가 고르는 투어 (기타 방문 제외) */
export type GuestbookTour = 'combined' | 'lab' | 'center'
export const GUESTBOOK_TOURS: GuestbookTour[] = ['combined', 'lab', 'center']
export const isGuestbookTour = (value: unknown): value is GuestbookTour =>
  value === 'combined' || value === 'lab' || value === 'center'

/** 예약 페이지에서 고를 수 있는 투어 (기타 방문 제외) */
export const BOOKABLE_TOURS = TOURS.filter((tour) => tour.id !== 'other')

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
  completed: '완료',
  rejected: '거절됨',
  cancelled: '취소됨',
}

/** 통계에 넣는 상태 (거절 · 취소 제외) */
export const isCounted = (status: VisitStatus) => status !== 'rejected' && status !== 'cancelled'
/** 성사된 방문 (승인 · 완료). 시간대를 점유하고 방문 인원 통계에 들어간다. */
export const isConfirmed = (status: VisitStatus) => status === 'approved' || status === 'completed'

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

/** 외국어 투어는 영어 · 중국어로 진행한다. 예약 화면은 한국어 · 영어 · 중국어 중 하나를 고른다. */
export const FOREIGN_LANGUAGES = ['영어', '중국어'] as const
export const FOREIGN_LANGUAGE = FOREIGN_LANGUAGES[0]

/** 예약 화면의 투어 진행 언어 선택지 (language + foreignLanguage 조합) */
export const LANGUAGE_CHOICES = [
  { id: 'ko', label: '한국어', language: 'ko' as TourLanguage, foreignLanguage: '' },
  { id: 'en', label: '영어', language: 'foreign' as TourLanguage, foreignLanguage: '영어' },
  { id: 'zh', label: '중국어', language: 'foreign' as TourLanguage, foreignLanguage: '중국어' },
]

/** 투어 진행 언어 이름: '한국어' · '영어' · '중국어' (이전 기록의 '기타: 태국어' 등은 그대로) */
export function tourLanguageName(request: Pick<VisitDraft, 'language' | 'foreignLanguage'>) {
  if (request.language !== 'foreign') return TOUR_LANGUAGE_LABEL.ko
  return request.foreignLanguage.replace(/^기타:\s*/, '') || TOUR_LANGUAGE_LABEL.foreign
}

/** 준비 시간 확보: 당일 · 익일은 신청 불가 (오늘 +2일부터). apps-script/Code.gs 의 MIN_LEAD_DAYS 와 같아야 합니다. */
export const MIN_LEAD_DAYS = 2

/** 신청 가능한 가장 이른 날짜 (자정 기준) */
export function earliestBookableDate(leadDays = MIN_LEAD_DAYS) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + leadDays)
  return date
}

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
  /** 담당(실): 팀보다 상위 조직. 예) CL운영담당. 이전 기록에는 비어 있을 수 있다. */
  division: string
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
  /** 방문 측(고객사)에서 통역이 동반되는지 (모든 진행 언어에서 선택) */
  interpreter: boolean
  /** 통역 동반일 때 방문객 사용 언어 (선택 입력, 예: 베트남어) */
  interpreterLanguage?: string
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
  /** 없으면 'web' */
  source?: VisitSource
  /** 방문 인원수 (방문자 명단이 없는 수기 기록용). 없으면 명단 인원 */
  headcount?: number
  /** 주요 인원 (예: '홍길동 상무, 김철수 이사') */
  keyPersons?: string
  /** 안내 가이드 (줄바꿈 구분) */
  guides?: string
  /** 유관 부서 */
  departments?: string[]
  /** 후속 진행 현황 */
  followUp?: string
}

/** 방문 인원: 명단이 있으면 명단 인원, 없으면 기록된 인원수 */
export function headcountOf(request: Pick<VisitRequest, 'visitors' | 'headcount'>) {
  return request.visitors.length > 0 ? request.visitors.length : (request.headcount ?? 0)
}

/** '6명' / 인원 미정인 수기 기록은 '미정' */
export function headcountLabel(request: Pick<VisitRequest, 'visitors' | 'headcount'>) {
  return request.visitors.length === 0 && request.headcount == null ? '미정' : `${headcountOf(request)}명`
}

/** 확정된 예약 또는 휴무가 점유하는 구간 (개인정보 없음). */
export interface BusySegment {
  date: string
  /** 'all' 은 휴무 등 두 공간을 모두 막는 경우 */
  resource: Resource | 'all'
  from: string
  to: string
}

export const emptyHost = (): VisitHost => ({ name: '', title: '', division: '', org: '', phone: '', email: '' })

/**
 * 내부 방문은 예약 화면에서 방문 조직명을 따로 받지 않는다.
 * 대신 신청 담당자의 담당(실) · 조직명으로 채워, 관리자 목록 · 검색 · 메일에서 어느 조직 방문인지 알 수 있게 한다.
 * 담당자 정보가 아직 비어 있으면 '내부 방문'.
 */
export function internalCompanyName(host: Pick<VisitHost, 'division' | 'org'>) {
  return [host.division, host.org].map((part) => part.trim()).filter(Boolean).join(' ') || '내부 방문'
}

/* ------------------------------------------------------- 담당(실) 분류 */

/** 방문 통계의 주요 담당 6개 + 나머지는 '기타' */
export const MAIN_DIVISIONS = [
  'CL전자담당',
  'CL LG/LX담당',
  'CL영업담당',
  'CL운영담당',
  'CL컨설팅담당',
  'EC사업담당',
] as const
export const OTHER_DIVISION = '기타'
export const DIVISION_GROUPS = [...MAIN_DIVISIONS, OTHER_DIVISION]

/** 비교용 키: 소문자 · 공백/기호 제거 · 앞의 'CL' 과 뒤의 '담당' 을 뗀다. 'CL LG/LX담당' → 'lglx' */
function divisionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s/·・.,_\-()]/g, '')
    .replace(/^cl/, '')
    .replace(/담당$/, '')
}

const DIVISION_ALIASES: Record<string, (typeof MAIN_DIVISIONS)[number]> = {
  전자: 'CL전자담당',
  lglx: 'CL LG/LX담당',
  lxlg: 'CL LG/LX담당',
  영업: 'CL영업담당',
  운영: 'CL운영담당',
  컨설팅: 'CL컨설팅담당',
  ec사업: 'EC사업담당',
  ec: 'EC사업담당',
}

/**
 * 입력된 담당(실) → 통계용 7개 분류.
 * '전자담당' · 'cl전자담당' → CL전자담당, 'LGLX담당' · 'lg/lx' → CL LG/LX담당.
 * 6개에 해당하지 않거나 비어 있으면 '기타'.
 */
export function divisionGroup(value: string | undefined): string {
  const key = divisionKey(String(value ?? ''))
  return (key && DIVISION_ALIASES[key]) || OTHER_DIVISION
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
  return slot ? slot.replace('-', ' – ') : '시간 미정'
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
  if (!from || !to) return [] // 시간 미정
  // 기타 방문(수기 등록)은 어느 공간을 쓰는지 모르므로 그 시간의 센터 · Lab 을 모두 막는다.
  if (tour === 'other') return [{ date, resource: 'all', from, to }]
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
    .filter((request) => isConfirmed(request.status) && request.id !== excludeId)
    .flatMap((request) => segmentsOf(request.tour, request.date, request.slot))
}

export function isOpenWeekday(date: Date) {
  return OPEN_WEEKDAYS.includes(date.getDay())
}

/** '기타: 직접입력' → '기타' (통계 집계용) */
export function baseOption(value: string) {
  return value.startsWith(OTHER) ? OTHER : value
}

/** '한국어' · '한국어 · 통역 동반(베트남어)' · '중국어 · 통역 없음' 형태. 한국어 · 통역 없음은 '한국어'만. */
export function languageSummary(
  request: Pick<VisitDraft, 'language' | 'foreignLanguage' | 'interpreter' | 'interpreterLanguage'>,
) {
  const name = tourLanguageName(request)
  if (request.interpreter) {
    const target = request.interpreterLanguage?.trim()
    return `${name} · 통역 동반${target ? `(${target})` : ''}`
  }
  return request.language === 'foreign' ? `${name} · 통역 없음` : name
}

/** 기본(한국어 · 통역 없음)이 아닌 언어 조건이 있는지: 목록 · 달력에서 따로 표시한다. */
export const hasLanguageNote = (request: Pick<VisitDraft, 'language' | 'interpreter'>) =>
  request.language === 'foreign' || request.interpreter

export function clientSegment(request: Pick<VisitDraft, 'category' | 'clientType'>) {
  if (request.category === 'internal') return '내부 방문'
  if (!request.clientType) return '고객 · 미분류' // 기존 방문 이력처럼 신규/기존 구분이 없는 기록
  return request.clientType === 'new' ? '고객 · 신규' : '고객 · 기존'
}

/* ------------------------------------------------------- 입력 검사 */

export type FormSection = 'schedule' | 'host' | 'company' | 'purpose' | 'visitors' | 'consent'

export const FORM_SECTIONS: { id: FormSection; label: string }[] = [
  { id: 'schedule', label: '투어 · 일정' },
  { id: 'host', label: '신청 담당자' },
  { id: 'company', label: '방문 기관' },
  { id: 'purpose', label: '방문 목적 · 언어' },
  { id: 'visitors', label: '방문자 명단' },
  { id: 'consent', label: '개인정보 동의' },
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const blank = (value: string) => !value.trim()

/** 섹션별 첫 번째 문제(없으면 null). 화면 안내와 제출 검사가 같은 규칙을 쓴다. */
export function sectionProblems(draft: VisitDraft): Record<FormSection, string | null> {
  const schedule = !draft.date
    ? '방문 희망일을 선택해 주세요. (월 · 수 · 금, 당일 · 익일 제외)'
    : draft.date < toDateKey(earliestBookableDate())
      ? '당일 · 익일 방문은 신청할 수 없습니다. 모레 이후 날짜를 선택해 주세요.'
      : !draft.slot
      ? '방문 시간을 선택해 주세요.'
      : null

  const { host } = draft
  const hostProblem =
    blank(host.name) || blank(host.title) || blank(host.division) || blank(host.org)
      ? '신청 담당자의 성함 · 직책 · 담당(실) · 조직명을 입력해 주세요.'
      : blank(host.phone)
        ? '신청 담당자 연락처를 입력해 주세요.'
        : !EMAIL.test(host.email.trim())
          ? '신청 담당자 이메일을 정확히 입력해 주세요. 승인 결과가 이 주소로 발송됩니다.'
          : null

  const external = draft.category === 'external'
  const company = external && !draft.clientType
    ? '고객 유형(기존 / 신규)을 선택해 주세요.'
    : blank(draft.company)
      ? external ? '업체명을 입력해 주세요.' : '방문 조직명을 입력해 주세요.'
      : external && draft.industries.length === 0
        ? '업종을 선택해 주세요.'
        : draft.industries.includes(OTHER)
          ? '기타 업종을 입력해 주세요.'
          : null

  const purpose = draft.purposes.length === 0
    ? '방문 목적을 선택해 주세요.'
    : draft.purposes.includes(OTHER)
      ? '기타 방문 목적을 입력해 주세요.'
      : draft.language === 'foreign' && (!draft.foreignLanguage || draft.foreignLanguage === OTHER)
        ? '투어 진행 언어를 선택해 주세요.'
        : null

  const missingIndex = draft.visitors.findIndex(
    (visitor) => blank(visitor.name) || blank(visitor.title) || blank(visitor.org) || !EMAIL.test(visitor.email.trim()),
  )
  const visitors =
    draft.visitors.length === 0
      ? '방문자를 한 명 이상 등록해 주세요.'
      : missingIndex >= 0
        ? `방문자 ${missingIndex + 1}번의 성함 · 직책 · 조직명 · 이메일을 확인해 주세요.`
        : null

  return {
    schedule,
    host: hostProblem,
    company,
    purpose,
    visitors,
    consent: draft.consent ? null : '개인정보 수집 · 이용에 동의해 주세요.',
  }
}

/** 제출 전 전체 검사: 첫 번째 문제의 섹션과 문구 */
export function firstProblem(draft: VisitDraft): { section: FormSection; message: string } | null {
  const problems = sectionProblems(draft)
  for (const { id } of FORM_SECTIONS) {
    const message = problems[id]
    if (message) return { section: id, message }
  }
  return null
}

/**
 * 비어 있거나 형식이 틀린 입력 칸 목록. 제출을 시도한 뒤 칸마다 빨간 테두리를 그리는 데 쓴다.
 * 키: date · slot · host.name … · clientType · company · industries · purposes · language
 *     · visitor.<번호>.name|title|org|email · consent
 */
export function missingFields(draft: VisitDraft): Set<string> {
  const missing = new Set<string>()
  const mark = (key: string, bad: boolean) => bad && missing.add(key)
  mark('date', !draft.date || draft.date < toDateKey(earliestBookableDate()))
  mark('slot', !draft.slot)
  mark('host.name', blank(draft.host.name))
  mark('host.title', blank(draft.host.title))
  mark('host.division', blank(draft.host.division))
  mark('host.org', blank(draft.host.org))
  mark('host.phone', blank(draft.host.phone))
  mark('host.email', !EMAIL.test(draft.host.email.trim()))
  const external = draft.category === 'external'
  mark('clientType', external && !draft.clientType)
  mark('company', blank(draft.company))
  mark('industries', external && (draft.industries.length === 0 || draft.industries.includes(OTHER)))
  mark('purposes', draft.purposes.length === 0 || draft.purposes.includes(OTHER))
  mark('language', draft.language === 'foreign' && (!draft.foreignLanguage || draft.foreignLanguage === OTHER))
  draft.visitors.forEach((visitor, index) => {
    mark(`visitor.${index}.name`, blank(visitor.name))
    mark(`visitor.${index}.title`, blank(visitor.title))
    mark(`visitor.${index}.org`, blank(visitor.org))
    mark(`visitor.${index}.email`, !EMAIL.test(visitor.email.trim()))
  })
  mark('consent', !draft.consent)
  return missing
}

export function validateVisitDraft(draft: VisitDraft): string | null {
  return firstProblem(draft)?.message ?? null
}
