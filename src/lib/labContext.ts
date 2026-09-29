import { createContext, useContext } from 'react'
import type { GuestbookEntry } from './labApi'
import type { BusySegment } from './visit'

export interface LabContextValue {
  entries: GuestbookEntry[]
  busy: BusySegment[]
  closedDays: string[]
  loading: boolean
  error: string | null
  openReservation: () => void
  openGuestbook: () => void
}

export const LabContext = createContext<LabContextValue | null>(null)

export function useLab() {
  const value = useContext(LabContext)
  if (!value) throw new Error('useLab must be used inside <LabProvider>')
  return value
}
