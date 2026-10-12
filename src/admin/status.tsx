import type { CSSProperties } from 'react'
import { Ban, CheckCheck, CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SITES,
  STATUS_LABEL,
  TOUR_BY_ID,
  needsSiteApproval,
  siteDecision,
  sitesOf,
  type AdminSite,
  type TourType,
  type VisitRequest,
  type VisitStatus,
} from '@/lib/visit'
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

const DECISION_TEXT = { pending: '승인 대기', approved: '승인', rejected: '거절' } as const
const DECISION_TONE = {
  pending: 'border-[#ffc078] text-[#c2410c]',
  approved: 'border-[#8ce99a] text-[#2b8a3e]',
  rejected: 'border-warm-300 text-warm-600',
} as const

/**
 * 복합 투어(메가와이즈 · Lab + 시화MTV)의 센터별 승인 현황. 두 곳이 모두 승인해야 확정된다.
 * 대기 중일 때만 보여준다 (확정 · 거절 뒤에는 전체 상태 배지로 충분하다).
 */
export function SiteApprovals({
  request,
  site,
  className,
}: {
  request: VisitRequest
  site: AdminSite
  className?: string
}) {
  if (!needsSiteApproval(request) || request.status !== 'pending') return null
  return (
    <span className={cn('inline-flex flex-wrap gap-1', className)}>
      {sitesOf(request.tour).map((each) => {
        const decision = siteDecision(request, each)
        return (
          <span
            key={each}
            className={cn(
              'inline-flex items-center whitespace-nowrap border bg-white px-1.5 text-[10.5px] font-semibold leading-[18px]',
              DECISION_TONE[decision],
              each === site && 'ring-1 ring-warm-800/30',
            )}
            title={each === site ? '이 페이지(우리 센터)의 결정' : '상대 센터의 결정'}
          >
            {SITES[each].label} {DECISION_TEXT[decision]}
          </span>
        )
      })}
    </span>
  )
}
