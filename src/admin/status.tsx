import type { CSSProperties } from 'react'
import { Ban, CheckCheck, CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, TOUR_BY_ID, type TourType, type VisitStatus } from '@/lib/visit'
import { STATUS_TONE } from './statusTone'

const STATUS_ICON = { pending: CircleDashed, approved: CheckCircle2, completed: CheckCheck, rejected: XCircle, cancelled: Ban }

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

/**
 * 투어 구분 배지: 투어 색으로 꽉 채운 사각 배지 + 흰 글씨. 상태 배지(둥근 알약 · 연한 색)와 모양부터 달라 한눈에 구분된다.
 * 취소 · 거절 건처럼 흐리게 보일 때는 className 으로 opacity 를 준다.
 */
export function TourTag({ tour, className }: { tour: TourType; className?: string }) {
  const definition = TOUR_BY_ID[tour]
  return (
    <span
      className={cn('inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-[12px] font-bold leading-5 text-white', className)}
      style={{ background: definition.color }}
    >
      {definition.label}
    </span>
  )
}

/**
 * 요청 부서 · 팀(업체명) 칸의 투어 색 음영: 투어 색 연한 배경 + 굵은 왼쪽 띠.
 * 상태 색(행 배경)과 겹치지 않도록 칸 안에서만 쓴다.
 */
export function tourTint(tour: TourType): CSSProperties {
  const color = TOUR_BY_ID[tour].color
  // 흰 바탕 위에 투어 색을 얹어, 행의 상태 배경색(초록 · 회색 등)과 섞여 탁해지지 않게 한다.
  return { backgroundColor: '#fff', backgroundImage: `linear-gradient(${color}26, ${color}26)`, borderLeft: `5px solid ${color}` }
}
