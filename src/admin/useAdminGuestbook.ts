import { useCallback, useEffect, useState } from 'react'
import { adminRequest, fetchServerVersion, isLiveBackend, outdatedServerMessage } from '@/lib/labApi'
import { buildSampleGuestbook, normalizeGuestbook, type AdminGuestbookEntry } from './guestbookData'

/** 방명록 관리 기능이 들어 있는 Apps Script 기능 수준 (Code.gs 의 API_LEVEL 4) */
export const GUESTBOOK_ADMIN_API_LEVEL = 4

const DEMO_KEY = 'tdl-lab-admin-guestbook-demo-v1'

function readDemo(): AdminGuestbookEntry[] {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return normalizeGuestbook(JSON.parse(raw))
  } catch {
    /* 저장소를 못 읽으면 예시 데이터로 시작 */
  }
  return buildSampleGuestbook()
}

function writeDemo(entries: AdminGuestbookEntry[]) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(entries))
  } catch {
    /* 저장 불가: 새로고침하면 처음 상태로 돌아갈 뿐 */
  }
}

interface LoadResult {
  entries?: AdminGuestbookEntry[]
  /** 서버가 방명록 관리 기능이 없는 이전 버전일 때 보여줄 안내 */
  outdated?: string
}

/** 서버 버전부터 확인해, 이전 버전이면 '모르는 요청' 대신 재배포 안내를 돌려준다. */
async function requestEntries(adminKey: string): Promise<LoadResult> {
  try {
    const info = await fetchServerVersion(adminKey)
    if (info.apiLevel < GUESTBOOK_ADMIN_API_LEVEL) return { outdated: outdatedServerMessage(info) }
  } catch {
    /* 버전 확인 실패는 무시하고 실제 요청의 오류를 보여준다 */
  }
  const data = await adminRequest<{ entries: unknown }>(adminKey, 'guestbookList')
  return { entries: normalizeGuestbook(data.entries) }
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : '방명록을 불러오지 못했습니다.')

/**
 * 관리자 방명록 데이터.
 * - 서버(Apps Script)가 연결돼 있으면 관리자 API 로 조회 · 숨김 · 삭제 (서버가 방명록 관리를 지원해야 함)
 * - 아니면 이 브라우저에만 저장되는 예시 데이터
 */
export function useAdminGuestbook(adminKey: string) {
  const [entries, setEntries] = useState<AdminGuestbookEntry[]>(() => (isLiveBackend ? [] : readDemo()))
  const [loading, setLoading] = useState(isLiveBackend)
  const [error, setError] = useState<string | null>(null)
  const [outdated, setOutdated] = useState<string | null>(null)

  const apply = (result: LoadResult) => {
    setOutdated(result.outdated ?? null)
    if (result.entries) setEntries(result.entries)
  }

  useEffect(() => {
    if (!isLiveBackend) return
    let cancelled = false
    requestEntries(adminKey)
      .then((result) => {
        if (!cancelled) apply(result)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(errorText(loadError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adminKey])

  const reload = useCallback(async () => {
    if (!isLiveBackend) return
    setLoading(true)
    setError(null)
    try {
      apply(await requestEntries(adminKey))
    } catch (loadError) {
      setError(errorText(loadError))
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  const setHidden = useCallback(
    async (id: string, hidden: boolean) => {
      if (isLiveBackend) await adminRequest<{ id: string; hidden: boolean }>(adminKey, 'guestbookSetHidden', { id, hidden })
      setEntries((current) => {
        const next = current.map((entry) => (entry.id === id ? { ...entry, hidden } : entry))
        if (!isLiveBackend) writeDemo(next)
        return next
      })
    },
    [adminKey],
  )

  /** 방명록을 완전히 삭제한다 (구글 시트의 행도 삭제, 되돌릴 수 없음). */
  const remove = useCallback(
    async (id: string) => {
      if (isLiveBackend) await adminRequest<{ deleted: string }>(adminKey, 'guestbookDelete', { id })
      setEntries((current) => {
        const next = current.filter((entry) => entry.id !== id)
        if (!isLiveBackend) writeDemo(next)
        return next
      })
    },
    [adminKey],
  )

  const resetDemo = useCallback(() => {
    const fresh = buildSampleGuestbook()
    writeDemo(fresh)
    setEntries(fresh)
  }, [])

  return { entries, loading, error, outdated, reload, setHidden, remove, resetDemo, demo: !isLiveBackend } as const
}
