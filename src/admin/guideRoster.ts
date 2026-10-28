import { holidayName } from '@/lib/holidays'
import { TOUR_BY_ID, isConfirmed, legsOf, parseDateKey, toDateKey, type VisitRequest } from '@/lib/visit'

/**
 * TDL Lab 투어 가이드 명단.
 * 인솔자는 전원 가능, 운영 인원은 canOperate 인 사람만 (팀장은 운영 인원으로 넣지 않는다).
 */
export interface GuideMember {
  name: string
  title: string
  canOperate: boolean
}

export const GUIDE_ROSTER: GuideMember[] = [
  { name: '이길호', title: '팀장', canOperate: false },
  { name: '권요한', title: '책임', canOperate: true },
  { name: '김대현', title: '책임', canOperate: true },
  { name: '박상원', title: '책임', canOperate: true },
  { name: '최창현', title: '책임', canOperate: true },
  { name: '이원식', title: '선임', canOperate: true },
  { name: '진호현', title: '선임', canOperate: true },
  { name: '도영민', title: '사원', canOperate: true },
]

export const OPERATORS = GUIDE_ROSTER.filter((member) => member.canOperate)

export const memberLabel = (member: GuideMember) => `${member.name} ${member.title}`

const MAIN_MARK = '(인솔자)'
// 이전에 '(메인)' 으로 저장한 기록도 인솔자로 읽는다.
const MAIN_PATTERN = /[([]\s*(?:인솔자?|메인)\s*[)\]]|(?:인솔자?|메인)\s*[:：]/

/** 예약의 가이드 배정. 인솔자는 여러 명일 수 있다. others 는 명단에 없는 사람 등 그대로 남겨 둘 기존 기록 줄. */
export interface GuideAssignment {
  leads: string[]
  operators: string[]
  others: string[]
}

const findMember = (line: string) => GUIDE_ROSTER.find((member) => line.includes(member.name))

/** 명단 순서로 정렬 (저장 · 표시 순서를 고정한다) */
const inRosterOrder = (names: string[]) => GUIDE_ROSTER.map((member) => member.name).filter((name) => names.includes(name))

/**
 * 가이드 칸(줄바꿈 · 쉼표 구분 텍스트)을 배정으로 읽는다.
 * '권요한 책임 (인솔자)' 처럼 표시된 줄은 모두 인솔자(여러 명 가능), 나머지 명단 인원은 운영 인원.
 * 표시 없이 적힌 이전 기록의 팀장은 운영 인원이 될 수 없으므로 인솔자로 본다.
 */
export function parseGuides(text: string | undefined): GuideAssignment {
  const leads: string[] = []
  const unmarked: string[] = []
  const others: string[] = []
  for (const raw of (text ?? '').split(/[\n,]+/)) {
    const line = raw.trim()
    if (!line) continue
    const member = findMember(line)
    if (!member) others.push(line)
    else if (MAIN_PATTERN.test(line)) leads.push(member.name)
    else unmarked.push(member.name)
  }
  const operators: string[] = []
  for (const name of unmarked) {
    const member = GUIDE_ROSTER.find((item) => item.name === name)!
    if (leads.includes(name) || operators.includes(name)) continue
    if (member.canOperate) operators.push(name)
    else leads.push(name)
  }
  return { leads: inRosterOrder(leads), operators: inRosterOrder(operators), others }
}

/** 배정을 가이드 칸 텍스트로: 인솔자(여러 명이면 줄마다) → 운영 인원(명단 순) → 그 밖의 기존 기록 */
export function formatGuides({ leads, operators, others }: GuideAssignment) {
  const lines: string[] = []
  for (const member of GUIDE_ROSTER) {
    if (leads.includes(member.name)) lines.push(`${memberLabel(member)} ${MAIN_MARK}`)
  }
  for (const member of OPERATORS) {
    if (!leads.includes(member.name) && operators.includes(member.name)) lines.push(memberLabel(member))
  }
  return [...lines, ...others].join('\n')
}

/**
 * 가이드 배정 대상: 승인 · 완료된 방문 중 TDL Lab 이 들어간 투어.
 * 메가와이즈 센터 · 시화MTV 만 도는 투어는 Lab 인원이 맡지 않으므로 뺀다.
 * 기타 방문(수기 등록)은 어느 공간인지 모르므로 포함한다.
 */
export const isAssignable = (request: VisitRequest) =>
  isConfirmed(request.status) && (request.tour === 'other' || TOUR_BY_ID[request.tour].places.includes('lab'))

/** 투어 한 타임 = 반일(4시간). 하루는 오전 · 오후 두 타임이다. */
export const SESSION_HOURS = 4

/**
 * M/M 계산용 투입 시간(시간). 실제 투어 길이와 관계없이 한 타임(반일 4시간)으로 본다.
 * 복합 투어도 Lab 인원은 Lab 구간 한 타임만 맡으므로 같다.
 */
export function tourHours(_request: VisitRequest) {
  return SESSION_HOURS
}

/** 그 달의 근무일(주말 · 공휴일 제외) */
export function workingDays(year: number, month: number) {
  let days = 0
  for (let day = 1; day <= new Date(year, month, 0).getDate(); day++) {
    const date = new Date(year, month - 1, day)
    if (date.getDay() !== 0 && date.getDay() !== 6 && !holidayName(toDateKey(date))) days++
  }
  return days
}

export const HOURS_PER_DAY = 8

export interface GuideLoad {
  member: GuideMember
  main: number
  operator: number
  hours: number
  /** 투입 시간 ÷ (그 달 근무일 × 8시간) */
  manMonth: number
}

/** 그 사람이 이 방문에서 맡은 역할 */
export function roleOf(request: VisitRequest, name: string): 'main' | 'operator' | null {
  if (!isAssignable(request)) return null
  const assignment = parseGuides(request.guides)
  if (assignment.leads.includes(name)) return 'main'
  return assignment.operators.includes(name) ? 'operator' : null
}

/** 사람별 투입 집계. requests 는 한 달 치 방문이어야 M/M 이 맞다. */
export function guideLoads(requests: VisitRequest[], year: number, month: number): GuideLoad[] {
  return tallyLoads(requests, workingDays(year, month) * HOURS_PER_DAY)
}

/** 사람별 투입 집계. manMonth 자리에는 투입 시간 ÷ capacity(기간의 근무 시간)를 넣는다. */
export function tallyLoads(requests: VisitRequest[], capacity: number): GuideLoad[] {
  return GUIDE_ROSTER.map((member) => {
    let main = 0
    let operator = 0
    let hours = 0
    for (const request of requests) {
      if (!isAssignable(request)) continue
      const assignment = parseGuides(request.guides)
      const isMain = assignment.leads.includes(member.name)
      const isOperator = !isMain && assignment.operators.includes(member.name)
      if (!isMain && !isOperator) continue
      if (isMain) main++
      else operator++
      hours += tourHours(request)
    }
    return { member, main, operator, hours, manMonth: capacity > 0 ? hours / capacity : 0 }
  })
}

export const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-`

/** 그 날이 속한 주의 월요일 */
export function mondayOf(key: string) {
  const date = parseDateKey(key)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return toDateKey(date)
}

/** 월요일부터 7일의 날짜 키 */
export function weekDates(monday: string) {
  const start = parseDateKey(monday)
  return Array.from({ length: 7 }, (_, index) => toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)))
}

export const isWorkingDay = (key: string) => {
  const weekday = parseDateKey(key).getDay()
  return weekday !== 0 && weekday !== 6 && !holidayName(key)
}

/** 이름(성 + 이름) → '권요한 책임'. 명단에 없으면 이름 그대로 */
export function nameLabel(name: string) {
  const member = GUIDE_ROSTER.find((item) => item.name === name)
  return member ? memberLabel(member) : name
}

/**
 * Lab 인원이 움직이는 시간대. 복합 투어는 Lab 구간(센터 → Lab, 3개 센터 투어의 센터+Lab 구간)만 보고,
 * Lab 투어 · 기타 방문은 방문 시간을 쓴다. 시간이 정해지지 않았으면 빈 문자열.
 */
export function labSlot(request: VisitRequest) {
  const leg = legsOf(request.tour, request.slot)?.find((item) => item.tour === 'lab' || item.tour === 'combined')
  return leg?.slot ?? request.slot
}

export type Half = 'am' | 'pm' | 'tbd'

/** 12시 이전 시작이면 오전, 이후면 오후 */
export function halfOf(request: VisitRequest): Half {
  const slot = labSlot(request)
  if (!slot) return 'tbd'
  return Number(slot.slice(0, 2)) < 12 ? 'am' : 'pm'
}
