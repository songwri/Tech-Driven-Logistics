import { maskCompany, maskName } from './mask'

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

export interface ReservationDraft {
  date: string
  headcount: number
  company: string
  leadName: string
  phone: string
  email: string
  note?: string
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

export async function fetchGuestbook(): Promise<GuestbookEntry[]> {
  if (!API_BASE) return readLocal()

  const response = await fetch(API_BASE)
  if (!response.ok) throw new Error(`방명록을 불러오지 못했습니다 (${response.status})`)
  const data = (await response.json()) as { entries?: GuestbookEntry[]; error?: string }
  if (data.error) throw new Error(data.error)
  return data.entries ?? []
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

export async function submitReservation(draft: ReservationDraft): Promise<void> {
  if (!API_BASE) {
    // Nothing to send to — surfaced by the form so nobody assumes it was booked.
    throw new Error('예약 접수 서버가 아직 연결되지 않았습니다.')
  }

  await post<{ ok: true }>({ type: 'reservation', ...draft })
}
