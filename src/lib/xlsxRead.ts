/**
 * 의존성 없는 최소 .xlsx 읽기 (관리자 '기존 이력 가져오기' 파일 업로드용).
 * - ZIP 은 브라우저 내장 DecompressionStream('deflate-raw') 으로 푼다.
 * - 셀 값은 모두 문자열로 돌려준다. 날짜 서식 숫자는 'YYYY-MM-DD' / 'HH:MM' 으로 바꾼다.
 */

export interface ReadSheet {
  name: string
  rows: string[][]
}

/* ------------------------------------------------------------------ ZIP */

async function inflateRaw(data: Uint8Array) {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** ZIP 중앙 디렉터리를 읽어 파일 이름 → 내용(압축 해제) */
async function unzip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end === -1) throw new Error('엑셀(.xlsx) 파일이 아니거나 손상되었습니다.')
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const files = new Map<string, string>()

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break
    const method = view.getUint16(offset + 10, true)
    const size = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const local = view.getUint32(offset + 42, true)
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
    offset += 46 + nameLength + extraLength + commentLength

    if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    const raw = bytes.subarray(start, start + size)
    if (method === 0) files.set(name, decoder.decode(raw))
    else if (method === 8) files.set(name, decoder.decode(await inflateRaw(raw)))
  }
  return files
}

/* ------------------------------------------------------------------ XML */

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&')
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]

/** <t> 조각을 이어 붙인 글자 (서식 있는 글자 <r><t> 포함, 윗주 <rPh> 제외) */
function textOf(xml: string) {
  const plain = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
  let out = ''
  for (const match of plain.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += match[1]
  return decodeXml(out)
}

/** 'AB12' → 27 (0부터) */
function columnIndex(ref: string) {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A'
  let index = 0
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64)
  return index - 1
}

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])

/** 스타일 번호 → 날짜/시간 서식 여부 */
function dateStyles(stylesXml: string | undefined) {
  if (!stylesXml) return [] as boolean[]
  const custom = new Map<number, string>()
  for (const match of stylesXml.matchAll(/<numFmt\b[^>]*>/g)) {
    const id = Number(attr(match[0], 'numFmtId'))
    custom.set(id, decodeXml(attr(match[0], 'formatCode') ?? ''))
  }
  const xfs = stylesXml.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/)?.[0] ?? ''
  return [...xfs.matchAll(/<xf\b[^>]*>/g)].map((match) => {
    const id = Number(attr(match[0], 'numFmtId') ?? 0)
    if (BUILTIN_DATE_FORMATS.has(id)) return true
    const code = (custom.get(id) ?? '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')
    return /[ymdhs]/i.test(code) && !/^general$/i.test(code)
  })
}

/** 엑셀 날짜 일련번호 → '2026-07-27' / '13:00' / '2026-07-27 13:00' */
function serialToText(serial: number) {
  const whole = Math.floor(serial)
  const minutes = Math.round((serial - whole) * 24 * 60)
  const time = minutes
    ? `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    : ''
  if (whole === 0) return time || '00:00'
  const date = new Date(Date.UTC(1899, 11, 30) + whole * 86400000)
  const key = date.toISOString().slice(0, 10)
  return time ? `${key} ${time}` : key
}

function sheetRows(xml: string, shared: string[], isDate: boolean[]) {
  const rows: string[][] = []
  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(attr(rowMatch[0], 'r')) || rows.length + 1
    const cells: string[] = []
    let next = 0
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const open = `<c${cellMatch[1]}>`
      const ref = attr(open, 'r')
      const col = ref ? columnIndex(ref) : next
      next = col + 1
      const body = cellMatch[2] ?? ''
      const type = attr(open, 't')
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      let value = ''
      if (type === 's') value = shared[Number(raw)] ?? ''
      else if (type === 'inlineStr') value = textOf(body)
      else if (type === 'b') value = raw === '1' ? 'TRUE' : raw === '0' ? 'FALSE' : ''
      else if (raw !== undefined) {
        value = decodeXml(raw)
        const style = Number(attr(open, 's') ?? 0)
        if ((type === undefined || type === 'n') && isDate[style] && value !== '' && !Number.isNaN(Number(value))) {
          value = serialToText(Number(value))
        }
      }
      while (cells.length < col) cells.push('')
      cells[col] = value
    }
    while (rows.length < rowNumber - 1) rows.push([])
    rows.push(cells)
  }
  return rows
}

/** .xlsx → 시트 목록 (통합 문서 순서대로) */
export async function readXlsx(buffer: ArrayBuffer): Promise<ReadSheet[]> {
  const files = await unzip(buffer)
  const shared = [...(files.get('xl/sharedStrings.xml') ?? '').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) =>
    textOf(m[1]),
  )
  const isDate = dateStyles(files.get('xl/styles.xml'))
  const workbook = files.get('xl/workbook.xml') ?? ''
  const rels = new Map<string, string>()
  for (const match of (files.get('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(match[0], 'Id')
    const target = attr(match[0], 'Target')
    if (id && target) rels.set(id, target.replace(/^\/?(xl\/)?/, 'xl/'))
  }
  const sheets: ReadSheet[] = []
  for (const match of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(attr(match[0], 'name') ?? '')
    const path = rels.get(attr(match[0], 'r:id') ?? '')
    const xml = path ? files.get(path) : undefined
    if (xml) sheets.push({ name, rows: sheetRows(xml, shared, isDate) })
  }
  if (sheets.length === 0) throw new Error('엑셀 파일에서 시트를 찾지 못했습니다.')
  return sheets
}
