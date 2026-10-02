import { maskCompany, maskName } from './mask'
import type { BusySegment, GuestbookTour, VisitDraft } from './visit'

export interface GuestbookEntry {
  id: string
  /** Already masked — raw names never reach the public repository. */
  name: string
  company: string
  /** 팀명 (선택 입력, 이전 기록에는 없다) */
  team?: string
  role: string
  rating: number
  message: string
  createdAt: string
  /** 어떤 투어 후기인지 (이전 기록에는 없다) */
  tour?: GuestbookTour
}

export interface GuestbookDraft {
  name: string
  company: string
  team: string
  role: string
  rating: number
  message: string
  tour: GuestbookTour
}

const API_BASE = (import.meta.env.VITE_LAB_API as string | undefined)?.replace(/\/$/, '')

/** 사이트가 연결된 Apps Script 웹앱 주소 (VITE_LAB_API). 공개 번들에 들어가는 값이라 화면에 보여줘도 된다. */
export const SERVER_URL = API_BASE ?? ''

/** With no worker configured the forms still work, but only in this browser. */
export const isLiveBackend = Boolean(API_BASE)

const LOCAL_KEY = 'tdl-lab-guestbook'

function readLocal(): GuestbookEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as GuestbookEntry[]) : []
  } catch {
    return []
  }
}

function writeLocal(entries: GuestbookEntry[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries))
  } catch {
    /* private mode or storage disabled — the entry just isn't kept */
  }
}

/** 서버(Apps Script)가 이 시간 안에 답하지 않으면 멈춰 있지 않고 오류로 알린다. */
const TIMEOUT_MS = 60000

const ACCESS_HINT =
  'Apps Script 배포 관리에서 기존 배포의 "액세스 권한이 있는 사용자"가 "모든 사용자"인지, ' +
  '사이트에 등록된 웹앱 주소(VITE_LAB_API)가 지금 배포의 주소와 같은지 확인해 주세요.'

/**
 * Apps Script 웹앱 호출 공통. 응답 없음 · 접근 거부(로그인 필요, 404) · JSON 이 아닌 응답을
 * 원인을 알 수 있는 메시지로 바꾼다.
 */
async function callServer<T>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, { ...init, redirect: 'follow', signal: controller.signal })
  } catch (fetchError) {
    if (controller.signal.aborted) {
      throw new Error(
        `서버(Apps Script)가 ${TIMEOUT_MS / 1000}초 동안 응답하지 않습니다. 잠시 후 다시 시도하고, ` +
          '계속되면 Apps Script 편집기의 [실행] 기록에서 오류를 확인해 주세요.',
      )
    }
    // 로그인 페이지로 돌려보내지는 경우(액세스 권한 제한) 브라우저가 CORS 로 막아 여기로 온다.
    throw new Error(`서버에 연결하지 못했습니다. ${ACCESS_HINT}`, { cause: fetchError })
  } finally {
    clearTimeout(timer)
  }
  if (response.status === 404 || response.status === 401 || response.status === 403) {
    throw new Error(`서버 웹앱에 접근할 수 없습니다 (${response.status}). ${ACCESS_HINT}`)
  }
  if (!response.ok) throw new Error(`요청에 실패했습니다 (${response.status})`)

  const text = await response.text()
  let data: T & { error?: string }
  try {
    data = JSON.parse(text) as T & { error?: string }
  } catch {
    throw new Error(`서버가 데이터 대신 웹페이지를 돌려줬습니다 (로그인 요구 또는 스크립트 오류). ${ACCESS_HINT}`)
  }
  if (data.error) throw new Error(data.error)
  return data
}

/**
 * Apps Script web apps don't answer CORS preflights, so posts go out as
 * `text/plain` to stay a "simple request". The body is still JSON.
 */
function post<T>(payload: Record<string, unknown>): Promise<T> {
  return callServer<T>(API_BASE as string, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })
}

export interface LabSnapshot {
  entries: GuestbookEntry[]
  /** 승인된 예약·휴무가 점유한 시간 구간. 개인정보는 담기지 않습니다. */
  busy: BusySegment[]
  /** 종일 휴무일 */
  closedDays: string[]
}

export async function fetchLab(): Promise<LabSnapshot> {
  if (!API_BASE) return { entries: readLocal(), busy: [], closedDays: [] }

  const data = await callServer<Partial<LabSnapshot>>(API_BASE, { method: 'GET' })
  return {
    entries: data.entries ?? [],
    busy: data.busy ?? [],
    closedDays: data.closedDays ?? [],
  }
}

export interface Schedule {
  busy: BusySegment[]
  closedDays: string[]
}

const SCHEDULE_CACHE_KEY = 'tdl-schedule-v1'
/** 이 시간 안에 받아 둔 일정은 예약 화면을 열자마자 바로 보여준다 (그동안 새 일정을 받아 교체). */
const SCHEDULE_CACHE_MS = 10 * 60 * 1000

/** 마지막으로 받은 '신청 불가' 일정 (개인정보 없음: 날짜 · 공간 · 시간만). 오래됐으면 null. */
export function readCachedSchedule(): Schedule | null {
  try {
    const raw = localStorage.getItem(SCHEDULE_CACHE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Schedule & { savedAt: number }
    if (!(Date.now() - saved.savedAt < SCHEDULE_CACHE_MS)) return null
    return { busy: saved.busy ?? [], closedDays: saved.closedDays ?? [] }
  } catch {
    return null
  }
}

/** 예약 화면용: 방명록 없이 일정만 받는다 (서버 캐시). 이전 서버는 action 을 몰라 전체 응답을 주지만 busy 는 같다. */
export async function fetchSchedule(): Promise<Schedule> {
  if (!API_BASE) return { busy: [], closedDays: [] }
  const data = await callServer<Partial<Schedule>>(`${API_BASE}?action=schedule`, { method: 'GET' })
  const schedule = { busy: data.busy ?? [], closedDays: data.closedDays ?? [] }
  try {
    localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify({ ...schedule, savedAt: Date.now() }))
  } catch {
    /* 저장 불가 — 다음에 다시 받을 뿐 */
  }
  return schedule
}

/** 서버(Apps Script)를 미리 깨운다. 첫 요청의 시동 지연을 사용자가 기다리지 않게 하기 위함. 결과는 버린다. */
export function wakeServer() {
  if (!API_BASE) return
  void fetch(`${API_BASE}?action=version`, { method: 'GET', redirect: 'follow' }).catch(() => {})
}

export async function submitGuestbook(draft: GuestbookDraft): Promise<GuestbookEntry> {
  if (!API_BASE) {
    const entry: GuestbookEntry = {
      id: crypto.randomUUID(),
      name: maskName(draft.name),
      company: maskCompany(draft.company),
      team: maskCompany(draft.team),
      role: draft.role,
      rating: draft.rating,
      message: draft.message,
      tour: draft.tour,
      createdAt: new Date().toISOString(),
    }
    writeLocal([entry, ...readLocal()])
    return entry
  }

  const data = await post<{ entry: GuestbookEntry }>({ type: 'guestbook', ...draft })
  return data.entry
}

export async function submitReservation(draft: VisitDraft): Promise<void> {
  if (!API_BASE) {
    // Nothing to send to — surfaced by the form so nobody assumes it was booked.
    throw new Error('예약 접수 서버가 아직 연결되지 않았습니다.')
  }

  await post<{ ok: true }>({ type: 'reservation', ...draft })
}

/**
 * 관리자 페이지가 필요로 하는 서버(Apps Script) 기능 수준. apps-script/Code.gs 의 API_LEVEL 과 맞춘다.
 * 배포된 서버가 이보다 낮으면 Code.gs 를 새 버전으로 재배포해야 한다.
 */
export const REQUIRED_API_LEVEL = 7

export interface ServerVersion {
  version: string
  /** apiLevel 이 없던 이전 서버는 1 로 본다 */
  apiLevel: number
}

/**
 * 코드 버전 → 기능 수준. 관리자 확인(health) 응답에 apiLevel 이 없던 서버용.
 * 2026-09-30.legacy-import 부터 2, 2026-10-01.division(담당(실) 열)부터 3.
 * 그 이후 버전은 health 가 apiLevel 을 직접 알려준다.
 */
function levelOf(version: string) {
  if (version === '2026-10-01.division') return 3
  const date = version.slice(0, 10)
  if (date > '2026-09-30') return 2
  return version === '2026-09-30.legacy-import' ? 2 : 1
}

/**
 * 배포된 Apps Script 의 코드 버전. 관리자 목록과 같은 경로(POST · 관리자 키)로 묻는다.
 * (별도 GET 주소는 배포 권한 설정에 따라 사이트에서만 막힐 수 있어 쓰지 않는다)
 */
export async function fetchServerVersion(key: string): Promise<ServerVersion> {
  try {
    const data = await adminRequest<{ version?: string; apiLevel?: number }>(key, 'health', { light: true })
    const version = String(data.version ?? '알 수 없음')
    return { version, apiLevel: Number(data.apiLevel ?? levelOf(version)) }
  } catch (healthError) {
    // health 요청조차 모르는 아주 오래된 서버는 요청을 예약 조회로 처리해 이 메시지를 낸다.
    if (healthError instanceof Error && healthError.message.includes('예약을 찾을 수 없습니다')) {
      return { version: '확인 불가 (오래된 버전)', apiLevel: 1 }
    }
    throw healthError
  }
}

export const outdatedServerMessage = (server: ServerVersion) =>
  `사이트가 연결된 Apps Script 배포가 이전 버전(${server.version})이라 이 기능을 쓸 수 없습니다. ` +
  `연결된 주소: ${SERVER_URL} — 배포 관리에서 이 주소(배포 ID)의 배포를 연필로 열어 버전: 새 버전 → 배포 해 주세요. ` +
  '(주소 끝이 /dev 인 테스트 배포는 항상 최신 코드로 돌아가 테스트가 통과해도, 사이트가 쓰는 /exec 배포는 고른 버전에 고정됩니다)'

/** 관리자 API는 Apps Script의 ADMIN_KEY 스크립트 속성과 같은 키를 요구합니다. */
export async function adminRequest<T>(key: string, action: string, params: Record<string, unknown> = {}) {
  return post<T>({ type: 'admin', key, action, ...params })
}
