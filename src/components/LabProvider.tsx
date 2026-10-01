import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchLab, type GuestbookEntry } from '@/lib/labApi'
import { LabContext } from '@/lib/labContext'

const GuestbookDialog = lazy(() => import('./GuestbookDialog'))

/** 방명록 데이터와 방명록 작성창을 제공한다. (방명록 페이지 /guestbook/ 과 소개 사이트가 함께 쓴다) */
export default function LabProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guestbookOpen, setGuestbookOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLab()
      .then((snapshot) => {
        if (!cancelled) setEntries(snapshot.entries)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : '방명록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openGuestbook = useCallback(() => setGuestbookOpen(true), [])
  const closeGuestbook = useCallback(() => setGuestbookOpen(false), [])

  const value = useMemo(
    () => ({ entries, loading, error, openGuestbook }),
    [entries, loading, error, openGuestbook],
  )

  return (
    <LabContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        {guestbookOpen && (
          <GuestbookDialog
            onClose={closeGuestbook}
            onSubmitted={(entry) => setEntries((current) => [entry, ...current])}
          />
        )}
      </Suspense>
    </LabContext.Provider>
  )
}
