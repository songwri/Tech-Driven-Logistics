import { useCallback, useEffect, useState } from 'react'
import { adminRequest, isLiveBackend } from '@/lib/labApi'
import { busyFromRequests, isSlotBusy, type VisitRequest, type VisitStatus } from '@/lib/visit'
import { buildSampleRequests } from './sampleData'

const DEMO_KEY = 'tdl-lab-admin-demo-v3'
const SESSION_KEY = 'tdl-lab-admin-key'

function readDemo(): VisitRequest[] {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return JSON.parse(raw) as VisitRequest[]
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
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (adminKey: string) => {
    if (!isLiveBackend) return true
    setLoading(true)
    setError(null)
    try {
      const data = await adminRequest<{ requests: VisitRequest[] }>(adminKey, 'list')
      setRequests(data.requests)
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
    adminRequest<{ requests: VisitRequest[] }>(savedKey, 'list')
      .then((data) => {
        if (!cancelled) setRequests(data.requests)
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
      if (status === 'approved' && isSlotBusy(target.tour, target.date, target.slot, busyFromRequests(requests, id))) {
        throw new Error('이미 승인된 다른 예약과 시간이 겹쳐 승인할 수 없습니다. 일정을 먼저 조정해 주세요.')
      }
      if (!isLiveBackend) {
        replace({ ...target, status })
        return
      }
      const data = await adminRequest<{ request: VisitRequest }>(key, 'setStatus', { id, status })
      replace(data.request)
    },
    [key, replace, requests],
  )

  const update = useCallback(
    async (next: VisitRequest) => {
      if (next.status === 'approved' && isSlotBusy(next.tour, next.date, next.slot, busyFromRequests(requests, next.id))) {
        throw new Error('변경한 일정이 이미 승인된 다른 예약과 겹칩니다.')
      }
      if (!isLiveBackend) {
        replace(next)
        return
      }
      const data = await adminRequest<{ request: VisitRequest }>(key, 'update', { id: next.id, request: next })
      replace(data.request)
    },
    [key, replace, requests],
  )

  const resetDemo = useCallback(() => {
    const fresh = buildSampleRequests()
    writeDemo(fresh)
    setRequests(fresh)
  }, [])

  const logout = useCallback(() => {
    saveKey('')
    setKey('')
    setRequests([])
  }, [])

  return {
    mode,
    authenticated: mode === 'demo' || Boolean(key),
    requests,
    loading,
    error,
    login: load,
    reload: () => load(key),
    logout,
    setStatus,
    update,
    resetDemo,
  } as const
}
