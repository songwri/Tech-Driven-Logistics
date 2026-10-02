/**
 * 대한민국 공휴일 (양력 고정일 + 음력 명절 + 대체공휴일).
 * 음력 날짜는 브라우저의 중국력(Intl) 으로 계산하므로 별도 데이터 파일이 필요 없다.
 * 법정 임시공휴일 · 선거일처럼 규칙으로 알 수 없는 날은 EXTRA_HOLIDAYS 에 추가한다.
 */

/** 규칙으로 계산되지 않는 공휴일 (임시공휴일 · 선거일 등). 'YYYY-MM-DD': 이름 */
export const EXTRA_HOLIDAYS: Record<string, string> = {
  '2025-01-27': '임시공휴일',
  '2025-06-03': '대통령선거일',
  '2026-06-03': '지방선거일',
}

const pad = (value: number) => String(value).padStart(2, '0')
const key = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

const SOLAR: { month: number; day: number; name: string; substitute?: 'weekend' }[] = [
  { month: 1, day: 1, name: '신정' },
  { month: 3, day: 1, name: '삼일절', substitute: 'weekend' },
  { month: 5, day: 5, name: '어린이날', substitute: 'weekend' },
  { month: 6, day: 6, name: '현충일' },
  { month: 8, day: 15, name: '광복절', substitute: 'weekend' },
  { month: 10, day: 3, name: '개천절', substitute: 'weekend' },
  { month: 10, day: 9, name: '한글날', substitute: 'weekend' },
  { month: 12, day: 25, name: '성탄절', substitute: 'weekend' },
]

const lunarFormat = new Intl.DateTimeFormat('en-u-ca-chinese', { month: 'long', day: 'numeric' })

/** 그 해 양력 날짜 중 음력 (월, 일) 에 해당하는 날. 윤달은 제외. */
function lunarDay(year: number, month: number, day: number): Date | null {
  const wanted = `${['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'][month - 1]} Month ${day}`
  for (let cursor = new Date(year, 0, 1); cursor.getFullYear() === year; cursor = addDays(cursor, 1)) {
    if (lunarFormat.format(cursor) === wanted) return cursor
  }
  return null
}

const cache = new Map<number, Map<string, string>>()

function compute(year: number) {
  const holidays = new Map<string, string>()
  /** 대체공휴일 판단용 묶음. 'sunday': 일요일·다른 공휴일과 겹칠 때만, 'weekend': 토요일도 포함 */
  const groups: { dates: Date[]; name: string; substitute: 'sunday' | 'weekend' }[] = []

  for (const item of SOLAR) {
    const date = new Date(year, item.month - 1, item.day)
    holidays.set(key(date), item.name)
    if (item.substitute) groups.push({ dates: [date], name: item.name, substitute: 'weekend' })
  }

  const buddha = lunarDay(year, 4, 8)
  if (buddha) {
    holidays.set(key(buddha), '부처님오신날')
    groups.push({ dates: [buddha], name: '부처님오신날', substitute: 'weekend' })
  }
  for (const [name, month, day] of [['설날', 1, 1], ['추석', 8, 15]] as const) {
    const center = lunarDay(year, month, day)
    if (!center) continue
    const dates = [addDays(center, -1), center, addDays(center, 1)]
    dates.forEach((date, index) => holidays.set(key(date), index === 1 ? name : `${name} 연휴`))
    groups.push({ dates, name, substitute: 'sunday' })
  }
  for (const [date, name] of Object.entries(EXTRA_HOLIDAYS)) {
    if (date.startsWith(`${year}-`)) holidays.set(date, name)
  }

  // 대체공휴일: 일요일(또는 토요일 · 다른 공휴일)과 겹치면 다음 평일 하루. 같은 날 겹친 공휴일끼리는 하루만 준다.
  const covered = new Set<string>()
  const overlapsOther = (date: Date, name: string) =>
    groups.some((other) => other.name !== name && other.dates.some((d) => key(d) === key(date)))
  groups
    .sort((a, b) => a.dates[0].getTime() - b.dates[0].getTime())
    .forEach((group) => {
      const needs = group.dates.some((date) => {
        const weekday = date.getDay()
        return weekday === 0 || (group.substitute === 'weekend' && weekday === 6) || (group.dates.length === 1 && overlapsOther(date, group.name))
      })
      const dayKey = key(group.dates[0])
      if (!needs || covered.has(dayKey)) return
      covered.add(dayKey)
      let next = addDays(group.dates[group.dates.length - 1], 1)
      while (next.getDay() === 0 || next.getDay() === 6 || holidays.has(key(next))) next = addDays(next, 1)
      holidays.set(key(next), `${group.name} 대체`)
    })

  return holidays
}

function yearMap(year: number) {
  let map = cache.get(year)
  if (!map) {
    map = compute(year)
    cache.set(year, map)
  }
  return map
}

/** 'YYYY-MM-DD' 가 공휴일이면 이름, 아니면 undefined */
export function holidayName(date: string): string | undefined {
  const year = Number(date.slice(0, 4))
  return Number.isFinite(year) ? yearMap(year).get(date) : undefined
}

export const isHoliday = (date: Date) => holidayName(key(date)) !== undefined
