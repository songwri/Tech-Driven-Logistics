import { isHoliday } from './holidays'

/**
 * 방문 예약 도메인 — 투어 종류, 시간대, 중복 판정, 입력 항목 목록.
 * 예약 화면과 관리자 대시보드가 같은 규칙을 쓰도록 한곳에 모았습니다.
 * (apps-script/Code.gs 의 TOURS 정의와 값이 같아야 합니다.)
 */

/**
 * 투어 종류.
 * - 한 곳: lab(TDL Lab) · center(메가와이즈 센터) · mtv(시화MTV)
 * - 여러 곳: combined(메가와이즈 + TDL Lab, 기존 '종합 투어') · center_mtv(메가와이즈 + 시화MTV) · all3(3개 센터)
 * - other: 기존 방문 이력 · 수기 등록처럼 정해진 투어 시간표 밖의 방문 (웹 예약에서는 선택 불가)
 * TDL Lab + 시화MTV(메가와이즈 없이) 조합은 운영하지 않는다.
 */
export type TourType = 'lab' | 'center' | 'mtv' | 'combined' | 'center_mtv' | 'all3' | 'other'
/** 복합 투어를 이루는 한 구간의 투어 (종합 투어는 메가와이즈 → Lab 이 붙어 있어 한 구간으로 본다) */
export type LegTour = 'lab' | 'center' | 'mtv' | 'combined'
/** completed: 방문 완료 / cancelled: 일정 취소. 거절 · 취소는 통계에서 제외한다. */
export type VisitStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled'
/** web: 예약 페이지 신청 / manual: 관리자 수기 등록 · 기존 이력 가져오기 */
export type VisitSource = 'web' | 'manual'
export type VisitCategory = 'internal' | 'external'
export type ClientType = 'existing' | 'new'
export type TourLanguage = 'ko' | 'foreign'
/** 투어 공간. 공간마다 한 번에 한 팀만 안내합니다. 메가와이즈 센터와 TDL Lab 은 같은 건물, 시화MTV 는 떨어진 센터. */
export type Resource = 'center' | 'lab' | 'mtv'
/**
 * 관리 단위(관리자 페이지). main = 메가와이즈 센터 + TDL Lab 담당자가 함께 쓰는 /admin/, mtv = 시화MTV 담당자의 /admin-mtv/.
 * 서로의 단독 예약은 보지 않고, 두 곳이 모두 들어간 복합 투어만 양쪽에 함께 보인다.
 */
export type Site = 'main' | 'mtv'
/** 관리자 페이지 종류: 센터별 두 곳 + 전체를 보기 전용으로 보는 통합 관제(/admin-hq/) */
export type AdminSite = Site | 'hq'
/** 복합 투어에서 각 센터의 승인 결정 */
export type Decision = 'pending' | 'approved' | 'rejected'
export type SiteApprovals = Partial<Record<Site, Decision>>

/** 복합 투어의 한 구간: 어느 투어를 몇 시에 */
export interface TourLeg {
  tour: LegTour
  /** 'HH:mm-HH:mm' */
  slot: string
}

export interface TourDefinition {
  id: TourType
  label: string
  short: string
  description: string
  duration: string
  /** 'HH:mm-HH:mm'. 복합 투어는 하루 일정 전체(첫 구간 시작 ~ 마지막 구간 끝)이고 순서마다 값이 다르다. */
  slots: string[]
  /** 투어 색: 상태 색(주황 · 초록 · 파랑 · 회색)과 겹치지 않게 고른다. */
  color: string
  /** 들르는 공간 */
  places: Resource[]
  /** 예약 화면의 묶음: 한 곳만 / 여러 곳 함께 */
  group?: 'single' | 'multi'
  /** 복합 투어: slots 의 값마다 오전 · 오후 구간 */
  legs?: Record<string, TourLeg[]>
  /** 이전 이름 (시트 · 엑셀에 남은 투어 이름을 읽을 때) */
  aliases?: string[]
}

/**
 * 시화MTV 예약을 열지 여부. false 면 예약 화면 · 방명록 · 관리자 화면에서 시화MTV 가 들어간 투어를 숨기고,
 * 시화MTV · 통합 관제 관리자 페이지는 '준비 중' 안내만 보여준다. 코드는 그대로 두고 이 값만 true 로 바꾸면 다시 열린다.
 * apps-script/Code.gs 의 MTV_ENABLED 도 함께 바꾼다.
 */
export const MTV_ENABLED = false

/** 지금 운영하는 투어인지 (시화MTV 를 닫아 두면 시화MTV 가 들어간 투어는 운영하지 않는다) */
export const isTourOpen = (tour: Pick<TourDefinition, 'places'>) => MTV_ENABLED || !tour.places.includes('mtv')

/** 시화MTV 투어 시작 시간 (오전 · 오후). 바꿀 때는 apps-script/Code.gs 의 TOURS 도 같이 고친다. */
const MTV_AM = '10:00-11:00'
const MTV_PM = '14:00-15:00'

/**
 * 화면 표시 순서: 한 곳(TDL Lab → 메가와이즈 → 시화MTV) → 여러 곳(메가와이즈+Lab → 메가와이즈+시화 → 3개 센터)
 * - TDL Lab 투어: 10:30–11:30, 14:00–15:00
 * - 메가와이즈 센터 투어: 10:00–11:00, 13:00–14:00, 15:00–16:00. 종합 투어의 센터 구간(09:30–10:30, 13:00–14:00)과 겹치면
 *   먼저 확정된 예약이 상대 시간대를 막는다.
 * - 시화MTV 투어: 10:00–11:00, 14:00–15:00
 * - 메가와이즈 + TDL Lab(기존 종합 투어): 센터 1시간 → TDL Lab 1시간. 09:30–11:30, 13:00–15:00
 * - 메가와이즈 + 시화MTV: 두 센터가 떨어져 있어 오전에 한 곳, 오후에 다른 한 곳 (이동 · 점심 포함)
 *     오전 메가와이즈 10:00 → 오후 시화MTV 14:00 / 오전 시화MTV 10:00 → 오후 메가와이즈 13:00
 * - 3개 센터: 메가와이즈 + TDL Lab 과 시화MTV 를 오전 · 오후로 나눈다
 *     오전 메가와이즈+Lab 09:30 → 오후 시화MTV 14:00 / 오전 시화MTV 10:00 → 오후 메가와이즈+Lab 13:00
 * 한쪽 센터의 오전(또는 오후)이 이미 차 있으면 그 순서만 막히고 반대 순서는 고를 수 있다.
 */
export const TOURS: TourDefinition[] = [
  {
    id: 'lab',
    label: 'TDL Lab 투어',
    short: 'Lab',
    description: 'TDL Lab만',
    duration: '약 1시간',
    slots: ['10:30-11:30', '14:00-15:00'],
    color: '#7c5cc4',
    places: ['lab'],
    group: 'single',
  },
  {
    id: 'center',
    label: '메가와이즈 센터 투어',
    short: '센터',
    description: '메가와이즈 물류센터만',
    duration: '약 1시간',
    slots: ['10:00-11:00', '13:00-14:00', '15:00-16:00'],
    color: '#1a8fa0',
    places: ['center'],
    group: 'single',
    aliases: ['센터 투어'],
  },
  {
    id: 'mtv',
    label: '시화MTV 투어',
    short: '시화',
    description: '시화MTV 센터만',
    duration: '약 1시간',
    slots: [MTV_AM, MTV_PM],
    color: '#3d5a80',
    places: ['mtv'],
    group: 'single',
  },
  {
    id: 'combined',
    label: '메가와이즈 + TDL Lab',
    short: '센터+Lab',
    description: '메가와이즈 센터 → TDL Lab (기존 종합 투어)',
    duration: '약 2시간',
    slots: ['09:30-11:30', '13:00-15:00'],
    color: '#dc2626',
    places: ['center', 'lab'],
    group: 'multi',
    aliases: ['종합 투어', '종합'],
  },
  {
    id: 'center_mtv',
    label: '메가와이즈 + 시화MTV',
    short: '센터+시화',
    description: '오전 · 오후로 나눠 두 센터 방문',
    duration: '하루 일정 · 이동 · 점심 포함',
    slots: ['10:00-15:00', '10:00-14:00'],
    color: '#9c6644',
    places: ['center', 'mtv'],
    group: 'multi',
    legs: {
      '10:00-15:00': [
        { tour: 'center', slot: '10:00-11:00' },
        { tour: 'mtv', slot: MTV_PM },
      ],
      '10:00-14:00': [
        { tour: 'mtv', slot: MTV_AM },
        { tour: 'center', slot: '13:00-14:00' },
      ],
    },
  },
  {
    id: 'all3',
    label: '3개 센터 전체',
    short: '3곳',
    description: '메가와이즈 + TDL Lab + 시화MTV',
    duration: '하루 일정 · 이동 · 점심 포함',
    slots: ['09:30-15:00', '10:00-15:00'],
    color: '#343a40',
    places: ['center', 'lab', 'mtv'],
    group: 'multi',
    legs: {
      '09:30-15:00': [
        { tour: 'combined', slot: '09:30-11:30' },
        { tour: 'mtv', slot: MTV_PM },
      ],
      '10:00-15:00': [
        { tour: 'mtv', slot: MTV_AM },
        { tour: 'combined', slot: '13:00-15:00' },
      ],
    },
  },
  {
    id: 'other',
    label: '기타 방문',
    short: '기타',
    description: '수기 등록 · 기존 이력',
    duration: '시간 자유',
    slots: [],
    color: '#8a8f98',
    places: [],
  },
]

/** 구간 투어가 열리는 곳의 이름 (예약 화면 · 메일 · 관리자 화면 공통) */
export const LEG_PLACE: Record<LegTour, { label: string; short: string }> = {
  center: { label: '메가와이즈 센터', short: '센터' },
  lab: { label: 'TDL Lab', short: 'Lab' },
  combined: { label: '메가와이즈 + TDL Lab', short: '센터+Lab' },
  mtv: { label: '시화MTV', short: '시화' },
}

export const SITES: Record<Site, { label: string; places: Resource[] }> = {
  main: { label: '메가와이즈 · TDL Lab', places: ['center', 'lab'] },
  mtv: { label: '시화MTV', places: ['mtv'] },
}

export const ADMIN_SITE_LABEL: Record<AdminSite, string> = {
  main: '메가와이즈 · TDL Lab',
  mtv: '시화MTV',
  hq: '통합 관제',
}

export const siteOf = (resource: Resource): Site => (resource === 'mtv' ? 'mtv' : 'main')

/** 투어를 관리하는 곳. 기타 방문(수기 · 기존 이력)은 메가와이즈 · Lab 기록으로 본다. */
export function sitesOf(tour: TourType): Site[] {
  if (tour === 'other') return ['main']
  return [...new Set(TOUR_BY_ID[tour].places.map(siteOf))]
}

/** 두 관리 단위(메가와이즈 · Lab 과 시화MTV)가 모두 들어간 투어 */
export const isCrossSite = (tour: TourType) => sitesOf(tour).length > 1

/** 이 관리자 페이지에서 보고 다룰 수 있는 투어인지 (통합 관제는 전체) */
export const inSite = (tour: TourType, site: AdminSite) => site === 'hq' || sitesOf(tour).includes(site)

export const toursForSite = (site: AdminSite) => TOURS.filter((tour) => isTourOpen(tour) && inSite(tour.id, site))

/**
 * 관리자 보기 범위.
 * - /admin/: 센터 담당자와 TDL Lab 담당자가 각자 관련된 실적만 볼 수 있게 나눈다.
 *   center = 메가와이즈 센터가 들어간 투어, lab = TDL Lab 이 들어간 투어 (+ 투어 종류가 없는 수기 · 기존 이력)
 * - /admin-hq/: 센터별로 나눠 본다. main = 메가와이즈 · Lab, mtv = 시화MTV
 */
export type AdminScope = 'all' | 'center' | 'lab' | Site

export const ADMIN_SCOPES: Record<AdminSite, { id: AdminScope; label: string; hint: string }[]> = {
  main: [
    { id: 'all', label: '전체', hint: '메가와이즈 · TDL Lab 이 들어간 모든 투어' },
    { id: 'center', label: '센터 관리자용', hint: '메가와이즈 센터가 들어간 투어' },
    { id: 'lab', label: 'Lab 관리자용', hint: 'TDL Lab 이 들어간 투어 · 기타 방문' },
  ],
  mtv: [],
  hq: [
    { id: 'all', label: '전체', hint: '3개 센터 모든 투어' },
    { id: 'main', label: '메가와이즈 · Lab', hint: '메가와이즈 센터 · TDL Lab 이 들어간 투어' },
    { id: 'mtv', label: '시화MTV', hint: '시화MTV 가 들어간 투어' },
  ],
}

export const inAdminScope = (tour: TourType, scope: AdminScope) => {
  if (scope === 'all') return true
  if (scope === 'main' || scope === 'mtv') return inSite(tour, scope)
  if (scope === 'lab' && tour === 'other') return true
  return TOUR_BY_ID[tour].places.includes(scope)
}

/** 방명록에서 방문자가 고르는 투어 (기타 방문 제외) */
export type GuestbookTour = Exclude<TourType, 'other'>
const ALL_GUESTBOOK_TOURS: GuestbookTour[] = ['lab', 'center', 'mtv', 'combined', 'center_mtv', 'all3']
/** 방명록에서 고를 수 있는 투어 (운영 중인 투어만) */
export const GUESTBOOK_TOURS = ALL_GUESTBOOK_TOURS.filter((id) => isTourOpen(TOURS.find((tour) => tour.id === id)!))
export const isGuestbookTour = (value: unknown): value is GuestbookTour =>
  ALL_GUESTBOOK_TOURS.includes(value as GuestbookTour)

/** 예약 페이지에서 고를 수 있는 투어 (기타 방문 제외) */
export const BOOKABLE_TOURS = TOURS.filter((tour) => tour.id !== 'other' && isTourOpen(tour))

export const TOUR_BY_ID = Object.fromEntries(TOURS.map((tour) => [tour.id, tour])) as Record<
  TourType,
  TourDefinition
>

/** 투어 이름(현재 · 이전 이름 · 짧은 이름) → id. 모르는 이름은 null */
export function tourFromLabel(value: string): TourType | null {
  const text = value.trim()
  return (
    TOURS.find((tour) => tour.id === text || tour.label === text || tour.short === text || tour.aliases?.includes(text))
      ?.id ?? null
  )
}

/** 운영 요일 (월·수·금). 공간마다 다르게 바꿀 수 있다. apps-script/Code.gs 의 PLACE_WEEKDAYS 와 같아야 합니다. */
export const PLACE_WEEKDAYS: Record<Resource, number[]> = {
  center: [1, 3, 5],
  lab: [1, 3, 5],
  mtv: [1, 3, 5],
}
/** 어느 공간이든 운영하는 요일 (관리자 달력 표시용) */
export const OPEN_WEEKDAYS = [...new Set(Object.values(PLACE_WEEKDAYS).flat())].sort()
export const CLOSED_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6].filter((day) => !OPEN_WEEKDAYS.includes(day))

/** 투어가 열리는 요일: 들르는 모든 공간이 운영하는 요일 */
export function tourWeekdays(tour: TourType) {
  const places = TOUR_BY_ID[tour].places
  if (places.length === 0) return OPEN_WEEKDAYS
  return OPEN_WEEKDAYS.filter((day) => places.every((place) => PLACE_WEEKDAYS[place].includes(day)))
}

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

/**
 * 고객 방문 업종 분류. 순서가 곧 화면 표시 순서입니다.
 * 여기에 속하지 않는 업종(공공 · 대학교 · 물류 등)은 '기타'를 고르고 직접 입력합니다. (apps-script/Code.gs 의 INDUSTRIES_ 와 같아야 한다)
 */
export const INDUSTRIES = ['리테일', '화학', '헬스케어', '패션&뷰티', '전자', '식품용품', '오토(Auto)', '기계&금속', '건자재']

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

/**
 * 시화MTV 가 들어간 투어는 준비 기간이 더 필요해 방문일 3영업일 전까지만 신청받는다 (주말 · 공휴일은 영업일이 아님).
 * 예) 월요일 신청 → 목요일부터, 금요일 신청 → 다음 주 수요일부터. apps-script/Code.gs 의 MTV_LEAD_BUSINESS_DAYS 와 같아야 합니다.
 */
export const MTV_LEAD_BUSINESS_DAYS = 3

/** from 에서 영업일(주말 · 공휴일 제외)로 days 만큼 뒤의 날짜 */
export function addBusinessDays(from: Date, days: number) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let left = days
  while (left > 0) {
    date.setDate(date.getDate() + 1)
    if (date.getDay() !== 0 && date.getDay() !== 6 && !isHoliday(date)) left -= 1
  }
  return date
}

/** 시화MTV 가 들어간 투어인지 (신청 기한이 다르다) */
export const includesMtv = (tour: TourType) => TOUR_BY_ID[tour].places.includes('mtv')

/**
 * 투어별 신청 가능한 가장 이른 날짜. leadDays 가 0 이면(관리자 수정) 제한하지 않는다.
 * 시화MTV 가 들어간 투어는 기본 기한(당일 · 익일 불가)과 3영업일 중 더 늦은 날부터.
 */
export function earliestDateFor(tour: TourType, leadDays = MIN_LEAD_DAYS) {
  const base = earliestBookableDate(leadDays)
  if (leadDays === 0 || !includesMtv(tour)) return base
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const mtv = addBusinessDays(today, MTV_LEAD_BUSINESS_DAYS)
  return mtv > base ? mtv : base
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
  /** 신청자가 방문자 명단의 분들께 안내하고 동의를 받았음을 확인 (웹 예약 필수, 이전 기록 · 수기 등록에는 없다) */
  visitorConsent?: boolean
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
  /** 관리자가 정한 실제 방문 인원 (예: '홍길동 외 9명' 단체). 있으면 명단 인원보다 우선 */
  actualHeadcount?: number
  /** 주요 인원 (예: '홍길동 상무, 김철수 이사') */
  keyPersons?: string
  /** 안내 가이드 (줄바꿈 구분) */
  guides?: string
  /** 유관 부서 */
  departments?: string[]
  /** 후속 진행 현황 */
  followUp?: string
  /** 복합 투어(메가와이즈 · Lab + 시화MTV)의 센터별 승인. 두 곳이 모두 승인해야 확정된다. */
  approvals?: SiteApprovals
}

type HeadcountSource = Pick<VisitRequest, 'visitors' | 'headcount' | 'actualHeadcount'>

/** 방문 인원: 관리자가 정한 실제 인원 → 명단 인원 → 기록된 인원수 순 */
export function headcountOf(request: HeadcountSource) {
  if (request.actualHeadcount != null) return request.actualHeadcount
  return request.visitors.length > 0 ? request.visitors.length : (request.headcount ?? 0)
}

/** '6명' / 인원 미정인 수기 기록은 '미정' */
export function headcountLabel(request: HeadcountSource) {
  return request.actualHeadcount == null && request.visitors.length === 0 && request.headcount == null
    ? '미정'
    : `${headcountOf(request)}명`
}

/** 확정된 예약 또는 휴무가 점유하는 구간 (개인정보 없음). */
export interface BusySegment {
  date: string
  /** 'all' 은 메가와이즈 센터와 TDL Lab 을 함께 막는 경우 (기타 방문 · 전체 휴무). 떨어진 시화MTV 는 막지 않는다. */
  resource: Resource | 'all'
  from: string
  to: string
}

/** 관리자가 미리 막아 둔 일정 (센터 · Lab 담당자 사정 등). slot 이 비면 종일. */
export type BlockTarget = Resource | 'all'

export interface TourBlock {
  id: string
  date: string
  /** 'HH:mm-HH:mm', 비우면 종일 */
  slot: string
  resource: BlockTarget
  reason: string
}

export const BLOCK_TARGETS: { id: BlockTarget; label: string; hint: string; site: Site }[] = [
  { id: 'center', label: '메가와이즈 센터', hint: '메가와이즈 센터가 들어간 투어 불가', site: 'main' },
  { id: 'lab', label: 'TDL Lab', hint: 'TDL Lab 이 들어간 투어 불가', site: 'main' },
  { id: 'all', label: '센터 · Lab 전체', hint: '메가와이즈 · TDL Lab 투어 모두 불가', site: 'main' },
  { id: 'mtv', label: '시화MTV', hint: '시화MTV 가 들어간 투어 불가', site: 'mtv' },
]

export const blockTargetLabel = (target: BlockTarget) => BLOCK_TARGETS.find((item) => item.id === target)?.label ?? '전체'

export const blockSite = (target: BlockTarget): Site => (target === 'mtv' ? 'mtv' : 'main')

/** 막힌 일정이 점유하는 구간 (종일은 00:00–24:00). 신청 화면의 busy 와 같은 형태. */
export function blockSegment(block: TourBlock): BusySegment {
  const [from, to] = block.slot ? block.slot.split('-') : ['00:00', '24:00']
  return { date: block.date, resource: block.resource, from, to }
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

/** 준비 시간(분). 종합 투어의 Lab, 수기 등록 방문은 사용 시작 이만큼 전부터 공간을 점유한다. */
export const PREP_MINUTES = 60

/** 복합 투어의 오전 · 오후 구간. 한 곳 투어는 그 자체가 한 구간. 정해진 시간표 밖(수기 등록)의 복합 투어는 null */
export function legsOf(tour: TourType, slot: string): TourLeg[] | null {
  const definition = TOUR_BY_ID[tour]
  if (definition.legs) return definition.legs[slot] ?? null
  if (tour === 'other') return null
  return [{ tour: tour as LegTour, slot }]
}

/**
 * 투어 한 건이 어떤 공간을 언제 점유하는지. (apps-script/Code.gs 의 segmentsOf_ 와 같아야 한다)
 * - 종합 투어: 센터 1시간 → Lab. Lab 은 준비를 위해 종합 투어 시작부터 점유 (센터 시간 = Lab 준비 시간)
 * - 복합 투어(메가와이즈 + 시화MTV, 3개 센터): 오전 · 오후 구간마다 위 규칙
 * - manual(수기 등록): 웹 예약 시간표 밖의 방문이라, 모든 공간을 사용 시작 1시간 전부터 점유 (준비 여유)
 */
export function segmentsOf(tour: TourType, date: string, slot: string, manual = false): BusySegment[] {
  const [from, to] = slot.split('-')
  if (!from || !to) return [] // 시간 미정
  const start = toMinutes(from)
  const prep = (minutes: number) => fromMinutes(Math.max(0, manual ? minutes - PREP_MINUTES : minutes))
  // 기타 방문(수기 등록)은 어느 공간을 쓰는지 모르므로 그 시간의 센터 · Lab 을 모두 막는다.
  if (tour === 'other') return [{ date, resource: 'all', from: prep(start), to }]
  const definition = TOUR_BY_ID[tour]
  if (definition.legs) {
    const legs = definition.legs[slot]
    if (legs) return legs.flatMap((leg) => segmentsOf(leg.tour, date, leg.slot, manual))
    // 시간표 밖의 복합 투어(수기 등록): 들르는 공간을 그 시간 동안 모두 막는다.
    return definition.places.map((resource) => ({ date, resource, from: prep(start), to }))
  }
  if (tour === 'combined') {
    const handoff = start + 60
    return [
      { date, resource: 'center', from: prep(start), to: fromMinutes(handoff) },
      { date, resource: 'lab', from: fromMinutes(Math.max(0, handoff - PREP_MINUTES)), to },
    ]
  }
  return [{ date, resource: tour as Resource, from: prep(start), to }]
}

/** 'all'(센터 · Lab 전체)은 메가와이즈 센터 · TDL Lab 과 겹치고, 떨어진 시화MTV 와는 겹치지 않는다. */
function sameSpace(a: BusySegment['resource'], b: BusySegment['resource']) {
  if (a === b) return true
  if (a === 'all') return b !== 'mtv'
  if (b === 'all') return a !== 'mtv'
  return false
}

function overlaps(a: BusySegment, b: BusySegment) {
  if (a.date !== b.date) return false
  if (!sameSpace(a.resource, b.resource)) return false
  return toMinutes(a.from) < toMinutes(b.to) && toMinutes(b.from) < toMinutes(a.to)
}

export function isSlotBusy(tour: TourType, date: string, slot: string, busy: BusySegment[], manual = false) {
  const wanted = segmentsOf(tour, date, slot, manual)
  return busy.some((segment) => wanted.some((part) => overlaps(part, segment)))
}

/** 승인된 예약들이 점유한 구간 (관리자 화면에서 승인 전 중복 확인용). */
export function busyFromRequests(requests: VisitRequest[], excludeId?: string) {
  return requests
    .filter((request) => isConfirmed(request.status) && request.id !== excludeId)
    .flatMap((request) => segmentsOf(request.tour, request.date, request.slot, request.source === 'manual'))
}

/* ------------------------------------------------------- 일정 표시 */

const halfOf = (slot: string) => (toMinutes(slot.split('-')[0] ?? '00:00') < 12 * 60 ? '오전' : '오후')

/** '오전 메가와이즈 센터 10:00 – 11:00 → 오후 시화MTV 14:00 – 15:00'. 한 곳 투어는 시간만. */
export function formatSchedule(tour: TourType, slot: string) {
  const legs = TOUR_BY_ID[tour].legs ? legsOf(tour, slot) : null
  if (!legs) return formatSlot(slot)
  return legs.map((leg) => `${halfOf(leg.slot)} ${LEG_PLACE[leg.tour].label} ${formatSlot(leg.slot)}`).join(' → ')
}

/** 목록용 짧은 표기: '10:00 센터 → 14:00 시화'. 한 곳 투어는 '10:00 – 11:00' */
export function formatScheduleShort(tour: TourType, slot: string) {
  const legs = TOUR_BY_ID[tour].legs ? legsOf(tour, slot) : null
  if (!legs) return formatSlot(slot)
  return legs.map((leg) => `${leg.slot.slice(0, 5)} ${LEG_PLACE[leg.tour].short}`).join(' → ')
}

/* ------------------------------------------------- 복합 투어 센터별 승인 */

/** 센터별 승인을 받는 예약: 두 관리 단위가 모두 들어간 웹 예약 (수기 등록은 관리자가 상태를 바로 정한다) */
export const needsSiteApproval = (request: Pick<VisitRequest, 'tour' | 'source'>) =>
  isCrossSite(request.tour) && request.source !== 'manual'

export const siteDecision = (request: Pick<VisitRequest, 'approvals'>, site: Site): Decision =>
  request.approvals?.[site] ?? 'pending'

const isDecision = (status: VisitStatus): status is Decision =>
  status === 'pending' || status === 'approved' || status === 'rejected'

/**
 * 관리자가 상태를 바꿀 때의 결과. (apps-script/Code.gs 의 applyDecision_ 과 같아야 한다)
 * 복합 투어의 승인 · 거절 · 대기는 그 관리자 센터의 결정으로 기록하고, 전체 상태는
 * 한 곳이라도 거절 → 거절, 모두 승인 → 승인, 그 밖에는 대기. 거절 · 취소된 예약을 다시 열면 두 센터 모두 처음부터 결정한다.
 * 완료 · 취소는 어느 센터든 전체 상태를 바로 바꾼다.
 */
export function applyDecision(
  request: Pick<VisitRequest, 'tour' | 'source' | 'status' | 'approvals'>,
  site: AdminSite,
  status: VisitStatus,
): { status: VisitStatus; approvals?: SiteApprovals } {
  if (!needsSiteApproval(request) || site === 'hq' || !isDecision(status)) return { status, approvals: request.approvals }
  const reopened = request.status === 'rejected' || request.status === 'cancelled'
  const approvals: SiteApprovals = { ...(reopened ? {} : request.approvals), [site]: status }
  const decisions = sitesOf(request.tour).map((each) => approvals[each] ?? 'pending')
  const next: VisitStatus = decisions.includes('rejected')
    ? 'rejected'
    : decisions.every((decision) => decision === 'approved')
      ? 'approved'
      : 'pending'
  return { status: next, approvals }
}

/** 시트 '센터별승인' 열 값: 'main:approved,mtv:pending' (apps-script/Code.gs 의 approvalsText_ 와 같다) */
export function approvalsText(approvals?: SiteApprovals) {
  return (Object.entries(approvals ?? {}) as [Site, Decision][]).map(([site, decision]) => `${site}:${decision}`).join(',')
}

/** 이 센터는 승인했고 상대 센터의 승인을 기다리는 복합 투어 */
export const awaitingPartner = (request: VisitRequest, site: AdminSite) =>
  site !== 'hq' && request.status === 'pending' && needsSiteApproval(request) && siteDecision(request, site) === 'approved'

/** 이 관리자가 승인 · 거절해야 하는 요청 */
export const needsDecisionBy = (request: VisitRequest, site: AdminSite) =>
  site !== 'hq' && request.status === 'pending' && !awaitingPartner(request, site)

export function isOpenWeekday(date: Date) {
  return OPEN_WEEKDAYS.includes(date.getDay())
}

/** '기타: 직접입력' → '기타' (통계 집계용) */
export function baseOption(value: string) {
  return value.startsWith(OTHER) ? OTHER : value
}

/** 예전 업종(14가지) → 현재 분류. 물류처럼 맞는 분류가 없는 값은 normalizeIndustry 에서 '기타' 가 된다. */
const LEGACY_INDUSTRY: Record<string, string> = {
  전자: '전자',
  가전: '전자',
  자동차: '오토(Auto)',
  오토: '오토(Auto)',
  화학: '화학',
  식품: '식품용품',
  화장품: '패션&뷰티',
  의류: '패션&뷰티',
  '제약/헬스케어': '헬스케어',
  유통: '리테일',
  이커머스: '리테일',
  'CVS/편의점': '리테일',
  제조: '기계&금속',
  '가구/인테리어': '건자재',
}

/** 업종 한 칸을 현재 분류로 맞춘다. 현재 분류면 그대로, 예전 업종은 옮기고, 그 밖의 값('기타: 공공' 등 세부 표기 포함)은 '기타' 로 통일한다. */
export function normalizeIndustry(value: string) {
  const text = value.trim()
  if (!text) return text
  if ((INDUSTRIES as readonly string[]).includes(text)) return text
  return LEGACY_INDUSTRY[text] ?? OTHER
}

/** 업종은 주 업종 한 가지만 쓴다. 예전에 여러 개를 쉼표로 적은 기록은 첫 번째(옮긴 뒤 기준)만 남긴다. */
export const normalizeIndustries = (values: string[]) => values.map(normalizeIndustry).filter(Boolean).slice(0, 1)

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
    : draft.date < toDateKey(earliestDateFor(draft.tour))
      ? includesMtv(draft.tour)
        ? `시화MTV 가 들어간 투어는 방문일 ${MTV_LEAD_BUSINESS_DAYS}영업일 전까지 신청할 수 있습니다. ${formatDateShort(toDateKey(earliestDateFor(draft.tour)))} 이후 날짜를 선택해 주세요.`
        : '당일 · 익일 방문은 신청할 수 없습니다. 모레 이후 날짜를 선택해 주세요.'
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
    consent: !draft.consent
      ? '개인정보 수집 · 이용에 동의해 주세요.'
      : !draft.visitorConsent
        ? '방문자 분들께 안내하고 동의를 받았음을 확인해 주세요.'
        : null,
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
 *     · visitor.<번호>.name|title|org|email · consent · visitorConsent
 */
export function missingFields(draft: VisitDraft): Set<string> {
  const missing = new Set<string>()
  const mark = (key: string, bad: boolean) => bad && missing.add(key)
  mark('date', !draft.date || draft.date < toDateKey(earliestDateFor(draft.tour)))
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
  mark('industries', external && draft.industries.length === 0)
  mark('purposes', draft.purposes.length === 0 || draft.purposes.includes(OTHER))
  mark('language', draft.language === 'foreign' && (!draft.foreignLanguage || draft.foreignLanguage === OTHER))
  draft.visitors.forEach((visitor, index) => {
    mark(`visitor.${index}.name`, blank(visitor.name))
    mark(`visitor.${index}.title`, blank(visitor.title))
    mark(`visitor.${index}.org`, blank(visitor.org))
    mark(`visitor.${index}.email`, !EMAIL.test(visitor.email.trim()))
  })
  mark('consent', !draft.consent)
  mark('visitorConsent', !draft.visitorConsent)
  return missing
}

export function validateVisitDraft(draft: VisitDraft): string | null {
  return firstProblem(draft)?.message ?? null
}
