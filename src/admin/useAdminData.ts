import { useCallback, useEffect, useState } from 'react'
import {
  REQUIRED_API_LEVEL,
  adminRequest,
  fetchServerVersion,
  isLiveBackend,
  outdatedServerMessage,
  type ServerVersion,
} from '@/lib/labApi'
import {
  busyFromRequests,
  isConfirmed,
  isSlotBusy,
  toDateKey,
  type BlockTarget,
  type TourBlock,
  type VisitRequest,
  type VisitStatus,
} from '@/lib/visit'
import { buildSampleRequests } from './sampleData'
import { visitKey, type ManualInput } from './importLegacy'
import { normalizeRequest, normalizeRequests } from './normalize'

export interface ServerHealth {
  version: string
  spreadsheet: { name: string; url: string }
  webAppUrl: string
  tabs: { name: string; rows: number; columns: number }[]
  visitSheet?: {
    headerOk: boolean
    missingColumns: string[]
    reservations: number
    withToken: number
    last: { row: number; id: string; hasToken: boolean; status: string; date: string } | null
  }
}

const DEMO_KEY = 'tdl-lab-admin-demo-v4'
const SESSION_KEY = 'tdl-lab-admin-key'
const DEMO_BLOCKS_KEY = 'tdl-lab-admin-blocks-v1'

function readDemoBlocks(): TourBlock[] {
  try {
    const raw = localStorage.getItem(DEMO_BLOCKS_KEY)
    if (raw) return normalizeBlocks(JSON.parse(raw))
  } catch {
    /* storage disabled */
  }
  return []
}

function writeDemoBlocks(blocks: TourBlock[]) {
  try {
    localStorage.setItem(DEMO_BLOCKS_KEY, JSON.stringify(blocks))
  } catch {
    /* 저장 불가 — 새로고침 시 초기화될 뿐 */
  }
}

function normalizeBlocks(value: unknown): TourBlock[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item): TourBlock => ({
      id: String(item.id ?? ''),
      date: String(item.date ?? ''),
      slot: String(item.slot ?? ''),
      reason: String(item.reason ?? ''),
      resource: item.resource === 'center' ? 'center' : item.resource === 'lab' ? 'lab' : 'all',
    }))
    .filter((block) => block.id && block.date)
}

export interface BlockInput {
  dates: string[]
  resource: BlockTarget
  /** 'HH:mm-HH:mm', 비우면 종일 */
  slot: string
  reason: string
}

function readDemo(): VisitRequest[] {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return normalizeRequests(JSON.parse(raw))
  } catch {
    /* storage disabled — fall through to fresh sample data */
  }
  return buildSampleRequests()
}

function writeDemo(requests: VisitRequest[]) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(requests))
  } catch {
    /* 저장 불가 — 새로고침 시 초기화될 뿐 */
  }
}

export interface ImportResult {
  created: VisitRequest[]
  skipped: { index: number; reason: string }[]
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

/**
 * 시간이 겹치는지는 오늘 이후 일정만 본다. 지난 이력끼리 겹치는 건(기존 방문 기록) 막지 않는다.
 * 서버(busy_)도 지난 날짜를 빼고 판단한다.
 */
function conflicts(request: Pick<VisitRequest, 'tour' | 'date' | 'slot' | 'status' | 'id'>, all: VisitRequest[]) {
  if (!isConfirmed(request.status) || request.date < toDateKey(new Date())) return false
  return isSlotBusy(request.tour, request.date, request.slot, busyFromRequests(all, request.id))
}

export function readSavedKey() {
  try {
    return sessionStorage.getItem(SESSION_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveKey(key: string) {
  try {
    if (key) sessionStorage.setItem(SESSION_KEY, key)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* 세션 저장 불가 — 새로고침 시 다시 입력 */
  }
}

/**
 * 관리자 데이터 소스.
 * - VITE_LAB_API 가 있으면 Apps Script 관리자 API (ADMIN_KEY 필요)
 * - 없으면 이 브라우저에만 저장되는 데모 데이터
 */
export function useAdminData() {
  const mode = isLiveBackend ? 'live' : 'demo'
  const [key, setKey] = useState(readSavedKey)
  const [requests, setRequests] = useState<VisitRequest[]>(() => (isLiveBackend ? [] : readDemo()))
  const [loading, setLoading] = useState(isLiveBackend && Boolean(key))
  const [blocks, setBlocks] = useState<TourBlock[]>(() => (isLiveBackend ? [] : readDemoBlocks()))
  const [error, setError] = useState<string | null>(null)
  const [server, setServer] = useState<ServerVersion | null>(null)

  useEffect(() => {
    // 배포된 서버 버전을 확인해, 이전 버전이면 관리자 화면에 재배포 안내를 띄운다.
    if (!isLiveBackend || !key) return
    let cancelled = false
    fetchServerVersion(key)
      .then((info) => {
        if (!cancelled) setServer(info)
      })
      .catch(() => {
        /* 버전 확인 실패는 무시 (기능 사용 시 다시 확인) */
      })
    return () => {
      cancelled = true
    }
  }, [key])

  /**
   * 새 관리자 기능을 쓰기 전에 서버가 지원하는지 확인한다 (재배포 직후에도 맞도록 매번 새로 확인).
   * 확인 자체가 실패하면 막지 않는다 — 실제 요청이 원인을 담은 오류를 낸다.
   */
  const requireServer = useCallback(async () => {
    if (!isLiveBackend) return
    let info: ServerVersion
    try {
      info = await fetchServerVersion(key)
    } catch {
      return
    }
    setServer(info)
    if (info.apiLevel < REQUIRED_API_LEVEL) throw new Error(outdatedServerMessage(info))
  }, [key])

  const load = useCallback(async (adminKey: string) => {
    if (!isLiveBackend) return true
    setLoading(true)
    setError(null)
    try {
      const data = await adminRequest<{ requests: VisitRequest[]; blocks?: unknown }>(adminKey, 'list')
      setRequests(normalizeRequests(data.requests))
      setBlocks(normalizeBlocks(data.blocks))
      saveKey(adminKey)
      setKey(adminKey)
      return true
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '예약 목록을 불러오지 못했습니다.')
      saveKey('')
      setKey('')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 저장된 키가 있으면 첫 진입 시 목록을 바로 불러온다.
    const savedKey = readSavedKey()
    if (!isLiveBackend || !savedKey) return
    let cancelled = false
    adminRequest<{ requests: VisitRequest[]; blocks?: unknown }>(savedKey, 'list')
      .then((data) => {
        if (cancelled) return
        setRequests(normalizeRequests(data.requests))
        setBlocks(normalizeBlocks(data.blocks))
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : '예약 목록을 불러오지 못했습니다.')
        saveKey('')
        setKey('')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const replace = useCallback((next: VisitRequest) => {
    setRequests((current) => {
      const updated = current.map((request) => (request.id === next.id ? next : request))
      if (!isLiveBackend) writeDemo(updated)
      return updated
    })
  }, [])

  /** 승인은 다른 승인 건과 시간이 겹치면 막습니다 (서버에서도 한 번 더 검사). */
  const setStatus = useCallback(
    async (id: string, status: VisitStatus) => {
      const target = requests.find((request) => request.id === id)
      if (!target) return
      if (!isConfirmed(target.status) && conflicts({ ...target, status }, requests)) {
        throw new Error('이미 승인된 다른 예약과 시간이 겹쳐 승인할 수 없습니다. 일정을 먼저 조정해 주세요.')
      }
      if (!isLiveBackend) {
        replace({ ...target, status })
        return
      }
      const data = await adminRequest<{ request: VisitRequest }>(key, 'setStatus', { id, status })
      replace(normalizeRequest(data.request))
    },
    [key, replace, requests],
  )

  const update = useCallback(
    async (next: VisitRequest) => {
      if (conflicts(next, requests)) {
        throw new Error('변경한 일정이 이미 승인된 다른 예약과 겹칩니다.')
      }
      if (!isLiveBackend) {
        replace(next)
        return
      }
      const data = await adminRequest<{ request: VisitRequest }>(key, 'update', { id: next.id, request: next })
      replace(normalizeRequest(data.request))
    },
    [key, replace, requests],
  )

  /** 예약을 완전히 삭제한다 (구글 시트의 행도 삭제, 되돌릴 수 없음). */
  const remove = useCallback(
    async (id: string) => {
      if (isLiveBackend) await adminRequest<{ deleted: string }>(key, 'delete', { id })
      setRequests((current) => {
        const next = current.filter((request) => request.id !== id)
        if (!isLiveBackend) writeDemo(next)
        return next
      })
    },
    [key],
  )

  /** 관리자 수기 등록 (웹 예약 규칙 밖의 방문: 화 · 목, 자유 시간, 명단 없음 등) */
  const create = useCallback(
    async (input: ManualInput) => {
      if (conflicts({ ...input, id: '' }, requests)) {
        throw new Error('이미 승인된 다른 예약과 시간이 겹칩니다. 시간을 확인해 주세요.')
      }
      await requireServer()
      const created = isLiveBackend
        ? normalizeRequest((await adminRequest<{ request: unknown }>(key, 'create', { request: input })).request)
        : { ...input, source: 'manual' as const, id: newId(), createdAt: new Date().toISOString() }
      setRequests((current) => {
        const next = [...current, created]
        if (!isLiveBackend) writeDemo(next)
        return next
      })
      return created
    },
    [key, requests, requireServer],
  )

  /** 기존 방문 이력 일괄 가져오기. 이미 있는 방문(날짜 + 업체 + 시간)은 건너뛴다. */
  const importMany = useCallback(
    async (inputs: ManualInput[]): Promise<ImportResult> => {
      let result: ImportResult
      if (isLiveBackend) {
        await requireServer()
        const data = await adminRequest<{ created?: unknown; skipped?: ImportResult['skipped'] }>(key, 'import', {
          requests: inputs,
        })
        result = { created: normalizeRequests(data.created), skipped: Array.isArray(data.skipped) ? data.skipped : [] }
      } else {
        const seen = new Set(requests.map(visitKey))
        const now = new Date().toISOString()
        result = { created: [], skipped: [] }
        inputs.forEach((input, index) => {
          if (seen.has(visitKey(input))) {
            result.skipped.push({ index, reason: '이미 등록된 방문' })
            return
          }
          seen.add(visitKey(input))
          result.created.push({ ...input, source: 'manual', id: newId(), createdAt: now })
        })
      }
      setRequests((current) => {
        const next = [...current, ...result.created]
        if (!isLiveBackend) writeDemo(next)
        return next
      })
      return result
    },
    [key, requests, requireServer],
  )

  /** 일정 막기: 날짜마다 한 건씩 저장한다 (구글 시트 blocked 탭). */
  const addBlocks = useCallback(
    async (input: BlockInput) => {
      if (isLiveBackend) {
        await requireServer()
        const data = await adminRequest<{ blocks?: unknown }>(key, 'blockAdd', { ...input })
        setBlocks((current) => [...current, ...normalizeBlocks(data.blocks)])
        return
      }
      const created = input.dates.map((date) => ({
        id: newId(),
        date,
        slot: input.slot,
        resource: input.resource,
        reason: input.reason,
      }))
      setBlocks((current) => {
        const next = [...current, ...created]
        writeDemoBlocks(next)
        return next
      })
    },
    [key, requireServer],
  )

  const removeBlocks = useCallback(
    async (ids: string[]) => {
      if (isLiveBackend) {
        await requireServer()
        await adminRequest<{ removed: string[] }>(key, 'blockRemove', { ids })
      }
      setBlocks((current) => {
        const next = current.filter((block) => !ids.includes(block.id))
        if (!isLiveBackend) writeDemoBlocks(next)
        return next
      })
    },
    [key, requireServer],
  )

  const resetDemo = useCallback(() => {
    const fresh = buildSampleRequests()
    writeDemo(fresh)
    setRequests(fresh)
  }, [])

  /** 서버가 어떤 시트에 무엇을 저장하고 있는지 확인 (Apps Script health) */
  const diagnose = useCallback(() => adminRequest<ServerHealth>(key, 'health'), [key])

  const logout = useCallback(() => {
    saveKey('')
    setKey('')
    setRequests([])
    setBlocks([])
  }, [])

  return {
    mode,
    authenticated: mode === 'demo' || Boolean(key),
    /** 관리자 키 (방명록 관리 등 별도 화면이 같은 키로 서버에 요청한다) */
    adminKey: key,
    requests,
    blocks,
    addBlocks,
    removeBlocks,
    loading,
    error,
    login: load,
    reload: () => load(key),
    logout,
    setStatus,
    update,
    resetDemo,
    diagnose,
    remove,
    create,
    importMany,
    /** 배포된 서버가 관리자 페이지보다 이전 버전이면 그 정보 */
    outdatedServer: server && server.apiLevel < REQUIRED_API_LEVEL ? server : null,
  } as const
}
