import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, TOUR_BY_ID, type TourType, type VisitStatus } from '@/lib/visit'
import { STATUS_TONE } from './statusTone'

const STATUS_ICON = { pending: CircleDashed, approved: CheckCircle2, rejected: XCircle }

export function StatusBadge({ status, className }: { status: VisitStatus; className?: string }) {
  const Icon = STATUS_ICON[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold',
        STATUS_TONE[status].badge,
        className,
      )}
    >
      <Icon width={12} height={12} strokeWidth={2.5} />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function TourTag({ tour, className }: { tour: TourType; className?: string }) {
  const definition = TOUR_BY_ID[tour]
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold', className)}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: definition.color }} aria-hidden />
      {definition.label}
    </span>
  )
}
