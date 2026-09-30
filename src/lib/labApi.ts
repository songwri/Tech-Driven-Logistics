import { maskCompany, maskName } from './mask'
import type { BusySegment, VisitDraft } from './visit'

export interface GuestbookEntry {
  id: string
  /** Already masked — raw names never reach the public repository. */
  name: string
  company: string
  role: string
  rating: number
  message: string
  createdAt: string
}

export interface GuestbookDraft {
  name: string
  company: string
  role: string
  rating: number
  message: string
}

const API_BASE = (import.meta.env.VITE_LAB_API as string | undefined)?.replace(/\/$/, '')

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

/**
 * Apps Script web apps don't answer CORS preflights, so posts go out as
 * `text/plain` to stay a "simple request". The body is still JSON.
 */
async function post<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(API_BASE as string, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  })
  if (!response.ok) throw new Error(`요청에 실패했습니다 (${response.status})`)

  const data = (await response.json()) as T & { error?: string }
  if (data.error) throw new Error(data.error)
  return data
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

  const response = await fetch(API_BASE)
  if (!response.ok) throw new Error(`방명록을 불러오지 못했습니다 (${response.status})`)
  const data = (await response.json()) as Partial<LabSnapshot> & { error?: string }
  if (data.error) throw new Error(data.error)
  return {
    entries: data.entries ?? [],
    busy: data.busy ?? [],
    closedDays: data.closedDays ?? [],
  }
}

export async function submitGuestbook(draft: GuestbookDraft): Promise<GuestbookEntry> {
  if (!API_BASE) {
    const entry: GuestbookEntry = {
      id: crypto.randomUUID(),
      name: maskName(draft.name),
      company: maskCompany(draft.company),
      role: draft.role,
      rating: draft.rating,
      message: draft.message,
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
export const REQUIRED_API_LEVEL = 2

export interface ServerVersion {
  version: string
  /** apiLevel 이 없던 이전 서버는 1 로 본다 */
  apiLevel: number
}

/** 배포된 Apps Script 의 코드 버전 (?action=version) */
export async function fetchServerVersion(): Promise<ServerVersion> {
  const url = new URL(API_BASE as string)
  url.searchParams.set('action', 'version')
  url.searchParams.set('t', String(Date.now())) // 캐시된 응답 방지
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`서버 버전을 확인하지 못했습니다 (${response.status})`)
  const data = (await response.json()) as { version?: string; apiLevel?: number; error?: string }
  if (data.error) throw new Error(data.error)
  return { version: String(data.version ?? '알 수 없음'), apiLevel: Number(data.apiLevel ?? 1) }
}

export const outdatedServerMessage = (server: ServerVersion) =>
  `구글 Apps Script 서버가 이전 버전(${server.version})이라 이 기능을 쓸 수 없습니다. ` +
  '저장소의 apps-script/Code.gs 를 Apps Script 편집기에 붙여넣고 저장한 뒤, ' +
  '배포 관리 → 기존 배포(연필) → 버전: 새 버전 → 배포 로 다시 배포해 주세요.'

/** 관리자 API는 Apps Script의 ADMIN_KEY 스크립트 속성과 같은 키를 요구합니다. */
export async function adminRequest<T>(key: string, action: string, params: Record<string, unknown> = {}) {
  return post<T>({ type: 'admin', key, action, ...params })
}
