import { holidayName } from '@/lib/holidays'
import { TOUR_BY_ID, isConfirmed, toDateKey, type VisitRequest } from '@/lib/visit'

/**
 * TDL Lab 투어 가이드 명단.
 * 메인 가이드는 전원 가능, 운영 인원은 canOperate 인 사람만 (팀장은 운영 인원으로 넣지 않는다).
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

const MAIN_MARK = '(메인)'
const MAIN_PATTERN = /[([]\s*메인\s*[)\]]|메인\s*[:：]/

/** 예약의 가이드 배정. others 는 명단에 없는 사람 등 그대로 남겨 둘 기존 기록 줄. */
export interface GuideAssignment {
  main: string | null
  operators: string[]
  others: string[]
}

const findMember = (line: string) => GUIDE_ROSTER.find((member) => line.includes(member.name))

/**
 * 가이드 칸(줄바꿈 · 쉼표 구분 텍스트)을 배정으로 읽는다.
 * '권요한 책임 (메인)' 처럼 표시된 줄이 메인 가이드, 나머지 명단 인원은 운영 인원.
 * 표시 없이 적힌 이전 기록의 팀장은 운영 인원이 될 수 없으므로 메인으로 본다(메인이 따로 없을 때).
 */
export function parseGuides(text: string | undefined): GuideAssignment {
  const result: GuideAssignment = { main: null, operators: [], others: [] }
  const unmarked: string[] = []
  for (const raw of (text ?? '').split(/[\n,]+/)) {
    const line = raw.trim()
    if (!line) continue
    const member = findMember(line)
    if (!member) {
      result.others.push(line)
    } else if (MAIN_PATTERN.test(line) && !result.main) {
      result.main = member.name
    } else {
      unmarked.push(member.name)
    }
  }
  for (const name of unmarked) {
    const member = GUIDE_ROSTER.find((item) => item.name === name)!
    if (name === result.main || result.operators.includes(name)) continue
    if (member.canOperate) result.operators.push(name)
    else if (!result.main) result.main = name
  }
  return result
}

/** 배정을 가이드 칸 텍스트로: 메인 → 운영 인원(명단 순) → 그 밖의 기존 기록 */
export function formatGuides({ main, operators, others }: GuideAssignment) {
  const lines: string[] = []
  const mainMember = GUIDE_ROSTER.find((member) => member.name === main)
  if (mainMember) lines.push(`${memberLabel(mainMember)} ${MAIN_MARK}`)
  for (const member of OPERATORS) {
    if (member.name !== main && operators.includes(member.name)) lines.push(memberLabel(member))
  }
  return [...lines, ...others].join('\n')
}

/** 가이드 배정 대상: 승인 · 완료된 방문 */
export const isAssignable = (request: VisitRequest) => isConfirmed(request.status)

const minutesOf = (time: string) => {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

/** 투어 진행 시간(시간). 시간이 정해지지 않은 방문은 그 투어의 기본 시간, 그것도 없으면 1시간. */
export function tourHours(request: VisitRequest) {
  const slot = request.slot || TOUR_BY_ID[request.tour].slots[0] || ''
  const [start, end] = slot.split('-')
  if (!start || !end) return 1
  const minutes = minutesOf(end) - minutesOf(start)
  return minutes > 0 ? minutes / 60 : 1
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

/** 사람별 투입 집계. requests 는 한 달 치 방문이어야 M/M 이 맞다. */
export function guideLoads(requests: VisitRequest[], year: number, month: number): GuideLoad[] {
  const capacity = workingDays(year, month) * HOURS_PER_DAY
  return GUIDE_ROSTER.map((member) => {
    let main = 0
    let operator = 0
    let hours = 0
    for (const request of requests) {
      if (!isAssignable(request)) continue
      const assignment = parseGuides(request.guides)
      const isMain = assignment.main === member.name
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
