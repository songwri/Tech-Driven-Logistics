import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchLab, type GuestbookEntry } from '@/lib/labApi'
import { LabContext } from '@/lib/labContext'

const ReservationDialog = lazy(() => import('./ReservationDialog'))
const GuestbookDialog = lazy(() => import('./GuestbookDialog'))

export default function LabProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [blockedSlots, setBlockedSlots] = useState<string[]>([])
  const [blockedDays, setBlockedDays] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'reservation' | 'guestbook' | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLab()
      .then((snapshot) => {
        if (cancelled) return
        setEntries(snapshot.entries)
        setBlockedSlots(snapshot.blockedSlots)
        setBlockedDays(snapshot.blockedDays)
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

  const openReservation = useCallback(() => setDialog('reservation'), [])
  const openGuestbook = useCallback(() => setDialog('guestbook'), [])
  const closeDialog = useCallback(() => setDialog(null), [])

  const value = useMemo(
    () => ({ entries, blockedSlots, blockedDays, loading, error, openReservation, openGuestbook }),
    [entries, blockedSlots, blockedDays, loading, error, openReservation, openGuestbook],
  )

  return (
    <LabContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        {dialog === 'reservation' && (
          <ReservationDialog
            entries={entries}
            blockedSlots={blockedSlots}
            blockedDays={blockedDays}
            onClose={closeDialog}
          />
        )}
        {dialog === 'guestbook' && (
          <GuestbookDialog
            onClose={closeDialog}
            onSubmitted={(entry) => setEntries((current) => [entry, ...current])}
          />
        )}
      </Suspense>
    </LabContext.Provider>
  )
}
