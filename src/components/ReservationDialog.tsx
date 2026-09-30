import { Modal } from './ui/Modal'
import { GuestbookCard } from './ui/GuestbookColumns'
import { ReservationForm } from './visit/ReservationForm'
import type { GuestbookEntry } from '@/lib/labApi'
import type { BusySegment } from '@/lib/visit'

interface ReservationDialogProps {
  entries: GuestbookEntry[]
  /** 승인된 예약·휴무가 점유한 시간 구간 */
  busy: BusySegment[]
  /** 종일 휴무일 */
  closedDays: string[]
  onClose: () => void
}

const RESERVE_URL = `${import.meta.env.BASE_URL}reserve/`

export default function ReservationDialog({ entries, busy, closedDays, onClose }: ReservationDialogProps) {
  const recentEntries = entries.slice(0, 3)

  return (
    <Modal
      eyebrow="TDL Lab Visit"
      title="TDL 방문 예약 신청"
      description={
        <>
          종합 투어 · TDL Lab 투어 · 센터 투어 중 선택해 주세요. 방문은 월 · 수 · 금에 운영됩니다.{' '}
          <a href={RESERVE_URL} className="whitespace-nowrap text-brand underline underline-offset-2">
            전용 페이지로 열기 ↗
          </a>
        </>
      }
      onClose={onClose}
      className="max-w-6xl"
    >
      <ReservationForm
        variant="modal"
        busy={busy}
        closedDays={closedDays}
        onClose={onClose}
        intro={
          recentEntries.length > 0 && (
            <div className="hidden md:block">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-warm-600">
                먼저 다녀간 방문자들의 기록
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {recentEntries.map((entry) => (
                  <GuestbookCard key={entry.id} entry={entry} className="max-w-none" />
                ))}
              </div>
            </div>
          )
        }
      />
    </Modal>
  )
}
