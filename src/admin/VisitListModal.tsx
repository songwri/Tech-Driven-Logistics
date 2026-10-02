import { useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { STATUS_LABEL, TOUR_BY_ID, formatDateShort, formatSlot, headcountLabel, headcountOf, isConfirmed, type VisitRequest } from '@/lib/visit'
import { StatusBadge, TourTag } from './status'

const MAX_ROWS = 200

/** 통계 막대를 눌렀을 때 뜨는 요약 팝업: 해당 방문 건의 합계와 목록. */
export function VisitListModal({
  title,
  periodLabel,
  requests,
  onClose,
}: {
  title: string
  periodLabel: string
  requests: VisitRequest[]
  onClose: () => void
}) {
  const rows = useMemo(
    () => [...requests].sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot)),
    [requests],
  )
  const confirmed = rows.filter((request) => isConfirmed(request.status))
  const people = confirmed.reduce((sum, request) => sum + headcountOf(request), 0)
  const byTour = Object.values(TOUR_BY_ID)
    .map((tour) => ({ tour, count: rows.filter((request) => request.tour === tour.id).length }))
    .filter((item) => item.count > 0)
  const byStatus = (Object.keys(STATUS_LABEL) as VisitRequest['status'][])
    .map((status) => ({ status, count: rows.filter((request) => request.status === status).length }))
    .filter((item) => item.count > 0)

  return (
    <Modal title={title} eyebrow={`방문 통계 · ${periodLabel}`} onClose={onClose} className="max-w-4xl">
      <div className="mt-4 grid grid-cols-2 gap-px border border-warm-300/50 bg-warm-300/40 sm:grid-cols-3">
        {[
          { label: '방문 건수', value: `${rows.length}건` },
          { label: '방문 인원 (승인·완료)', value: `${people}명` },
          { label: '건당 평균 인원', value: confirmed.length ? `${Math.round((people / confirmed.length) * 10) / 10}명` : '-' },
        ].map((item) => (
          <div key={item.label} className="bg-white px-4 py-3">
            <p className="text-[12px] text-warm-600">{item.label}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-warm-800">{item.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-warm-600">
        {byTour.map(({ tour, count }) => (
          <span key={tour.id} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: tour.color }} aria-hidden />
            {tour.short} {count}
          </span>
        ))}
        <span className="h-3 w-px bg-warm-300/60" />
        {byStatus.map(({ status, count }) => (
          <span key={status}>
            {STATUS_LABEL[status]} {count}
          </span>
        ))}
      </p>

      <div className="mt-4 max-h-[50vh] overflow-auto border border-warm-300/50">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead className="sticky top-0 bg-cream text-left text-[12px] text-warm-600">
            <tr>
              <th className="py-2 pl-3 pr-2 font-semibold">방문일</th>
              <th className="px-2 py-2 font-semibold">투어</th>
              <th className="px-2 py-2 font-semibold">방문 기관</th>
              <th className="px-2 py-2 font-semibold">담당자</th>
              <th className="px-2 py-2 text-right font-semibold">인원</th>
              <th className="py-2 pl-2 pr-3 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, MAX_ROWS).map((request) => (
              <tr key={request.id} className="border-t border-warm-300/30 align-top">
                <td className="whitespace-nowrap py-2 pl-3 pr-2 font-mono tabular-nums">
                  {formatDateShort(request.date)}
                  <span className="block text-[11px] text-warm-600">{request.slot ? formatSlot(request.slot) : '시간 미정'}</span>
                </td>
                <td className="px-2 py-2">
                  <TourTag tour={request.tour} />
                </td>
                <td className="px-2 py-2 font-medium text-warm-800">{request.company || '-'}</td>
                <td className="px-2 py-2 text-warm-600">
                  {request.host.name || '-'}
                  {request.host.division && <span className="block text-[11px]">{request.host.division}</span>}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{headcountLabel(request)}</td>
                <td className="py-2 pl-2 pr-3">
                  <StatusBadge status={request.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > MAX_ROWS && (
        <p className="mt-2 text-[12px] text-warm-600">방문일 순으로 앞의 {MAX_ROWS}건만 표시합니다.</p>
      )}
    </Modal>
  )
}
