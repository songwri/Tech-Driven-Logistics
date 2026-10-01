import { TOURS, emptyHost, type TourType, type Visitor, type VisitRequest, type VisitStatus } from '@/lib/visit'

/**
 * 방문 이력 가져오기 (붙여넣기 · .xlsx · .csv 파일). 두 가지 양식을 알아본다.
 *
 * 1) visit_requests 양식: 구글 시트 visit_requests 탭과 같은 제목 행 (id, 신청일시, 상태, 투어, 방문일, …)
 *    → 제목 이름으로 열을 찾으므로 열 순서가 달라도 되고, 필요한 열만 있어도 된다.
 *
 * 2) 기존 관리 양식 (엑셀에서 표를 복사하면 탭으로 구분되어 붙여넣어짐):
 *   순번 · 날짜 · 요일 · 시작시간 · 종료시간 · 구분 · 업체(기관)명 · 방문 목적 · 방문인원수 ·
 *   주요 인원 · 가이드 · 유관부서1~4 · 완료유무 · 후속 진행현황
 * - 순번은 비어 있거나 아예 빠져 있어도 된다 (날짜 칸을 기준으로 맞춘다).
 * - 제목 행을 함께 붙여넣으면 제목 이름으로 열 위치를 맞춘다.
 */

/** 서버로 보내는 수기 기록 (id · createdAt 은 서버가 붙인다) */
export type ManualInput = Omit<VisitRequest, 'id' | 'createdAt'>

export interface ParsedRow {
  /** 붙여넣은 표에서의 줄 번호 (1부터, 제목 행 포함) */
  line: number
  input?: ManualInput
  error?: string
}

/** 구분 문자(탭 · 쉼표) 텍스트 → 셀 2차원 배열. 따옴표로 감싼 셀 안의 줄바꿈 · 구분 문자 · "" 를 처리한다. */
export function parseDelimited(text: string, delimiter = '\t'): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let atCellStart = true
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"' && atCellStart) {
      quoted = true
      atCellStart = false
      continue
    }
    if (ch === delimiter) {
      row.push(cell)
      cell = ''
      atCellStart = true
      continue
    }
    if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      atCellStart = true
      continue
    }
    cell += ch
    atCellStart = false
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''))
}

type Field =
  | 'date'
  | 'start'
  | 'end'
  | 'category'
  | 'company'
  | 'purpose'
  | 'headcount'
  | 'keyPersons'
  | 'guides'
  | 'dept1'
  | 'dept2'
  | 'dept3'
  | 'dept4'
  | 'status'
  | 'followUp'

/** 날짜 칸 기준 기본 위치 (요일이 날짜 바로 다음 칸) */
const DEFAULT_OFFSETS: Record<Field, number> = {
  date: 0,
  start: 2,
  end: 3,
  category: 4,
  company: 5,
  purpose: 6,
  headcount: 7,
  keyPersons: 8,
  guides: 9,
  dept1: 10,
  dept2: 11,
  dept3: 12,
  dept4: 13,
  status: 14,
  followUp: 15,
}

const HEADER_MATCH: [Field, RegExp][] = [
  ['date', /^(방문)?날짜$|^방문일$/],
  ['start', /^시작/],
  ['end', /^종료/],
  ['category', /^구분$/],
  ['company', /업체|기관/],
  ['purpose', /목적/],
  ['headcount', /인원수|^인원$/],
  ['keyPersons', /주요/],
  ['guides', /가이드/],
  ['dept1', /유관부서\s*1|^유관부서$/],
  ['dept2', /유관부서\s*2/],
  ['dept3', /유관부서\s*3/],
  ['dept4', /유관부서\s*4/],
  ['status', /완료|상태/],
  ['followUp', /후속/],
]

const clean = (value: string | undefined) => {
  const text = (value ?? '').trim()
  return text === '-' || text === '–' ? '' : text
}

/** 2026-07-27 / 2026.7.27 / 2026. 7. 27 / 2026/7/27 → 2026-07-27 */
export function normalizeDate(value: string) {
  const match = value.trim().match(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\.?/)
  if (!match) return ''
  const [, y, m, d] = match
  const key = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  const date = new Date(`${key}T00:00:00`)
  return Number.isNaN(date.getTime()) || date.getDate() !== Number(d) ? '' : key
}

/** 8:30 → 08:30, TBD · 빈칸 → '' */
export function normalizeTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ''
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return ''
  return `${String(hour).padStart(2, '0')}:${match[2]}`
}

function statusFrom(value: string): VisitStatus {
  const text = value.trim()
  if (text.includes('완료')) return 'completed'
  if (text.includes('취소')) return 'cancelled'
  if (text.includes('거절')) return 'rejected'
  if (text.includes('대기')) return 'pending'
  return 'approved'
}

const isHeaderRow = (cells: string[]) =>
  cells.some((cell) => /날짜|방문일/.test(cell)) && cells.some((cell) => /업체|기관/.test(cell))

/**
 * 구글 시트 visit_requests 탭의 열 (apps-script/Code.gs 의 VISIT_HEADERS 와 같아야 합니다).
 * 가져오기 양식 파일의 제목 행으로도 쓴다.
 */
export const VISIT_SHEET_HEADERS = [
  'id', '신청일시', '상태', '투어', '방문일', '시간', '방문구분', '고객구분', '업체명', '업종',
  '방문목적', '담당자', '담당자직책', '담당자조직', '담당자연락처', '담당자이메일', '담당자의견',
  '방문인원', '방문자명단', '요청사항', '개인정보동의', '관리자메모', '토큰', '수정일시', '방문자JSON',
  '투어언어', '외국어', '통역동반', '출처', '주요인원', '가이드', '유관부서', '후속진행',
  // 새 열은 기존 시트와 맞도록 맨 뒤에 붙인다.
  '담당(실)',
] as const

/** 가져올 때 쓰지 않는 열 (시스템이 채움) */
export const SYSTEM_COLUMNS = ['id', '신청일시', '방문자명단', '개인정보동의', '토큰', '수정일시', '출처'] as const

export type TableFormat = 'visit_requests' | 'legacy'

export interface ParsedTable {
  format: TableFormat
  rows: ParsedRow[]
}

const isVisitSheetHeader = (cells: string[]) => {
  const names = new Set(cells.map((cell) => cell.trim()))
  return names.has('방문일') && names.has('업체명')
}

const splitComma = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** '13:00-14:00' / '13:00 ~ 14:00' / '8:30–10:00' → '13:00-14:00', 그 외 '' */
export function normalizeSlot(value: string) {
  const [from = '', to = ''] = value.split(/\s*[-~–]\s*/)
  const start = normalizeTime(from)
  const end = normalizeTime(to)
  return start && end && start < end ? `${start}-${end}` : ''
}

function tourFrom(value: string): TourType {
  const text = value.trim()
  return TOURS.find((tour) => tour.id === text || tour.label === text || tour.short === text)?.id ?? 'other'
}

function visitorsFrom(value: string): Visitor[] {
  if (!value.trim()) return []
  try {
    const list: unknown = JSON.parse(value)
    if (!Array.isArray(list)) return []
    return list
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        name: String(item.name ?? ''),
        title: String(item.title ?? ''),
        org: String(item.org ?? ''),
        email: String(item.email ?? ''),
        car: String(item.car ?? ''),
        jobs: Array.isArray(item.jobs) ? item.jobs.map(String) : [],
      }))
      .filter((visitor) => visitor.name)
  } catch {
    return []
  }
}

/** visit_requests 양식 (제목 이름으로 열을 찾는다) */
function parseVisitSheet(table: string[][], headerAt: number): ParsedRow[] {
  const col = new Map(table[headerAt].map((name, index) => [name.trim(), index]))
  const result: ParsedRow[] = []
  table.slice(headerAt + 1).forEach((cells, offset) => {
    const line = headerAt + offset + 2
    if (!cells.some((cell) => cell.trim())) return
    const get = (name: string) => {
      const index = col.get(name)
      return index === undefined ? '' : (cells[index] ?? '').trim()
    }
    const date = normalizeDate(get('방문일'))
    if (!date) {
      result.push({ line, error: '방문일이 비어 있거나 형식이 다릅니다 (예: 2026-07-27)' })
      return
    }
    const company = get('업체명')
    if (!company) {
      result.push({ line, error: '업체명이 비어 있습니다' })
      return
    }
    const category = get('방문구분').includes('내부') ? 'internal' : 'external'
    const clientText = get('고객구분')
    const foreignName = get('외국어')
    const foreign = get('투어언어') === '외국어' || Boolean(foreignName)
    const statusText = get('상태')
    const headcount = get('방문인원').match(/\d+/)
    result.push({
      line,
      input: {
        tour: tourFrom(get('투어')),
        date,
        slot: normalizeSlot(get('시간')),
        // 이력은 대부분 확정된 방문이므로 상태가 비어 있으면 승인으로 본다.
        status: statusText ? statusFrom(statusText) : 'approved',
        source: 'manual',
        category,
        clientType:
          category === 'external' && clientText
            ? clientText.includes('신규')
              ? 'new'
              : clientText.includes('기존')
                ? 'existing'
                : undefined
            : undefined,
        language: foreign ? 'foreign' : 'ko',
        foreignLanguage: foreign ? foreignName || '영어' : '',
        interpreter: foreign && get('통역동반') === '동반',
        company,
        industries: category === 'external' ? splitComma(get('업종')) : [],
        purposes: splitComma(get('방문목적')),
        host: {
          name: get('담당자'),
          title: get('담당자직책'),
          division: get('담당(실)'),
          org: get('담당자조직'),
          phone: get('담당자연락처'),
          email: get('담당자이메일'),
        },
        hostComment: get('담당자의견'),
        visitors: visitorsFrom(get('방문자JSON')),
        headcount: headcount ? Number(headcount[0]) : undefined,
        note: get('요청사항'),
        consent: false,
        adminMemo: get('관리자메모'),
        keyPersons: get('주요인원'),
        guides: get('가이드'),
        departments: splitComma(get('유관부서')),
        followUp: get('후속진행'),
      },
    })
  })
  return result
}

/** 셀 표 → 가져올 기록 목록. 양식을 자동으로 알아본다. */
export function parseTable(table: string[][]): ParsedTable {
  const headerAt = table.slice(0, 5).findIndex(isVisitSheetHeader)
  if (headerAt !== -1) return { format: 'visit_requests', rows: parseVisitSheet(table, headerAt) }
  return { format: 'legacy', rows: parseLegacyTable(table) }
}

/** 붙여넣은 표 (탭 구분) → 가져올 기록 목록 */
export function parseLegacy(text: string): ParsedRow[] {
  return parseTable(parseDelimited(text)).rows
}

/** 기존 관리 양식 (순번 · 날짜 · 요일 · 시작시간 …) */
function parseLegacyTable(table: string[][]): ParsedRow[] {
  let offsets = { ...DEFAULT_OFFSETS }
  const result: ParsedRow[] = []

  table.forEach((cells, index) => {
    const line = index + 1
    if (isHeaderRow(cells)) {
      const dateAt = cells.findIndex((cell) => HEADER_MATCH[0][1].test(cell.trim()))
      if (dateAt === -1) return
      const next = { ...DEFAULT_OFFSETS }
      for (const [field, pattern] of HEADER_MATCH) {
        const at = cells.findIndex((cell) => pattern.test(cell.trim()))
        if (at !== -1) next[field] = at - dateAt
      }
      offsets = next
      return
    }

    // 날짜 칸 찾기: 순번이 있으면 둘째 칸, 없으면 첫째 칸
    const dateAt = cells.slice(0, 3).findIndex((cell) => normalizeDate(cell) !== '')
    if (dateAt === -1) {
      result.push({ line, error: '날짜를 찾을 수 없습니다 (예: 2026-07-27)' })
      return
    }
    const get = (field: Field) => clean(cells[dateAt + offsets[field]])

    const company = get('company')
    if (!company) {
      result.push({ line, error: '업체(기관)명이 비어 있습니다' })
      return
    }
    const start = normalizeTime(get('start'))
    const end = normalizeTime(get('end'))
    const slot = start && end && start < end ? `${start}-${end}` : ''
    const headcountText = get('headcount')
    const headcountNumber = headcountText.match(/\d+/)
    const foreign = /\(\s*E\s*\)|영어|English/i.test(headcountText)
    const category = get('category').includes('내부') ? 'internal' : 'external'
    const purpose = get('purpose')

    result.push({
      line,
      input: {
        tour: 'other',
        date: normalizeDate(cells[dateAt]),
        slot,
        status: statusFrom(get('status')),
        source: 'manual',
        category,
        clientType: undefined,
        language: foreign ? 'foreign' : 'ko',
        foreignLanguage: foreign ? '영어' : '',
        interpreter: false,
        company,
        industries: [],
        purposes: purpose ? [purpose.replace(/,/g, ' ')] : [],
        host: emptyHost(),
        hostComment: '',
        visitors: [],
        headcount: headcountNumber ? Number(headcountNumber[0]) : undefined,
        note: '',
        consent: false,
        adminMemo: '',
        keyPersons: get('keyPersons'),
        guides: get('guides'),
        departments: (['dept1', 'dept2', 'dept3', 'dept4'] as const).map(get).filter(Boolean),
        followUp: get('followUp'),
      },
    })
  })
  return result
}

/** 같은 방문 판정 키 (서버의 visitKey_ 와 같은 규칙) */
export const visitKey = (request: Pick<VisitRequest, 'date' | 'company' | 'slot'>) =>
  [request.date, request.company.replace(/\s/g, '').toLowerCase(), request.slot].join('|')
