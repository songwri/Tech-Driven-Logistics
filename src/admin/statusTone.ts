import type { VisitStatus } from '@/lib/visit'

/**
 * 상태별 톤: 대기중 = 흰색(주황 포인트), 승인됨 = 그린, 거절됨 = 회색.
 * 색만으로 구분하지 않도록 배지에는 항상 아이콘 + 라벨을 함께 씁니다.
 */
export const STATUS_TONE: Record<VisitStatus, { row: string; chip: string; badge: string }> = {
  pending: {
    row: 'bg-white hover:bg-[#fffaf3]',
    chip: 'border-[#f59f00]/60 bg-white text-warm-800',
    badge: 'border-[#ffc078] bg-[#fff4e6] text-[#c2410c]',
  },
  approved: {
    row: 'bg-[#ebfbee] hover:bg-[#dcf5e1]',
    chip: 'border-[#8ce99a] bg-[#ebfbee] text-[#1e6b2e]',
    badge: 'border-[#8ce99a] bg-[#d3f9d8] text-[#1e6b2e]',
  },
  rejected: {
    row: 'bg-[#f1f3f5] text-[#868e96] hover:bg-[#e9ecef]',
    chip: 'border-[#dee2e6] bg-[#f1f3f5] text-[#868e96] line-through',
    badge: 'border-[#dee2e6] bg-[#e9ecef] text-[#6c757d]',
  },
}
