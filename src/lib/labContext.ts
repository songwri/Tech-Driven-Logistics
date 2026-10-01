import { createContext, useContext } from 'react'
import type { GuestbookEntry } from './labApi'

export interface LabContextValue {
  entries: GuestbookEntry[]
  loading: boolean
  error: string | null
  openGuestbook: () => void
  /** 방금 남긴 기록의 id. 목록에서 잠시 강조한다. */
  highlightId: string | null
}

export const LabContext = createContext<LabContextValue | null>(null)

export function useLab() {
  const value = useContext(LabContext)
  if (!value) throw new Error('useLab must be used inside <LabProvider>')
  return value
}
