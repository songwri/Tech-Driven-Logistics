import { useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STATUS_LABEL,
  TOURS,
  clientSegment,
  formatDateShort,
  formatSlot,
  type TourType,
  type VisitRequest,
  type VisitStatus,
} from '@/lib/visit'
import { STATUS_TONE } from './statusTone'
import { StatusBadge, TourTag } from './status'

interface RequestTableProps {
  requests: VisitRequest[]
  scopeLabel: string
  onOpen: (id: string) => void
  onSetStatus: (id: string, status: VisitStatus) => void
  busyId: string | null
}

type StatusFilter = 'all' | VisitStatus
const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'approved', 'rejected']

export function RequestTable({ requests, scopeLabel, onOpen, onSetStatus, busyId }: RequestTableProps) {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [tour, setTour] = useState<'all' | TourType>('all')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: requests.length, pending: 0, approved: 0, rejected: 0 }
    for (const request of requests) result[request.status] += 1
    return result
  }, [requests])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return requests
      .filter((request) => status === 'all' || request.status === status)
      .filter((request) => tour === 'all' || request.tour === tour)
      .filter(
        (request) =>
          !needle ||
          [request.company, request.host.name, request.host.org, ...request.visitors.map((visitor) => visitor.name)]
            .join(' ')
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
  }, [requests, status, tour, query])

  return (
    <div className="border border-warm-300/50 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-warm-300/40 px-4 py-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="상태 필터">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={status === filter}
              onClick={() => setStatus(filter)}
              className={cn(
                'inline-flex items-center gap-1.5 border px-3 py-1.5 text-[13px] font-semibold transition',
                status === filter
                  ? 'border-warm-800 bg-warm-800 text-white'
                  : 'border-warm-300/60 text-warm-600 hover:border-warm-800 hover:text-warm-800',
              )}
            >
              {filter === 'all' ? '전체' : STATUS_LABEL[filter]}
              <span className={cn('font-mono text-[11px]', status === filter ? 'text-white/70' : 'text-warm-300')}>
                {counts[filter]}
              </span>
            </button>
          ))}
        </div>
        <select
          value={tour}
          onChange={(e) => setTour(e.target.value as 'all' | TourType)}
          aria-label="투어 종류 필터"
          className="border border-warm-300/60 bg-white px-2 py-1.5 text-[13px] text-warm-800"
        >
          <option value="all">모든 투어</option>
          {TOURS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 border border-warm-300/60 px-2 py-1.5 focus-within:border-brand">
          <Search width={14} height={14} className="text-warm-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="업체명 · 담당자 · 방문자 검색"
            className="w-48 bg-transparent text-[13px] text-warm-800 outline-none placeholder:text-warm-300"
          />
        </label>
      </div>

      <p className="px-4 pt-3 font-mono text-[11px] text-warm-600">
        {scopeLabel} · {rows.length}건
      </p>

      <div className="overflow-x-auto p-4 pt-2">
        <table className="w-full min-w-[920px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b-2 border-warm-300/50 text-left font-mono text-[11px] text-warm-600">
              <th className="py-2 pl-3 pr-2 font-semibold">방문일</th>
              <th className="px-2 py-2 font-semibold">시간</th>
              <th className="px-2 py-2 font-semibold">투어</th>
              <th className="px-2 py-2 font-semibold">구분</th>
              <th className="px-2 py-2 font-semibold">업체 / 조직</th>
              <th className="px-2 py-2 font-semibold">담당자</th>
              <th className="px-2 py-2 text-right font-semibold">인원</th>
              <th className="px-2 py-2 font-semibold">상태</th>
              <th className="px-2 py-2 text-right font-semibold">처리</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-warm-600">
                  조건에 맞는 예약 요청이 없습니다.
                </td>
              </tr>
            )}
            {rows.map((request) => (
              <tr
                key={request.id}
                onClick={() => onOpen(request.id)}
                className={cn(
                  'cursor-pointer border-b border-warm-300/30 transition',
                  STATUS_TONE[request.status].row,
                  request.status === 'pending' && 'shadow-[inset_3px_0_0_#f59f00]',
                  request.status === 'approved' && 'shadow-[inset_3px_0_0_#2f9e44]',
                )}
              >
                <td className="whitespace-nowrap py-2.5 pl-3 pr-2 font-semibold">{formatDateShort(request.date)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 font-mono text-[12px]">{formatSlot(request.slot)}</td>
                <td className="px-2 py-2.5">
                  <TourTag tour={request.tour} className={request.status === 'rejected' ? 'opacity-60' : undefined} />
                </td>
                <td className="whitespace-nowrap px-2 py-2.5">{clientSegment(request)}</td>
                <td className="max-w-56 truncate px-2 py-2.5 font-semibold">{request.company}</td>
                <td className="whitespace-nowrap px-2 py-2.5">
                  {request.host.name}
                  <span className="ml-1 text-[11px] opacity-60">{request.host.title}</span>
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right font-mono">{request.visitors.length}명</td>
                <td className="px-2 py-2.5">
                  <StatusBadge status={request.status} />
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                  {request.status === 'pending' ? (
                    <span className="inline-flex gap-1">
                      <button
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() => onSetStatus(request.id, 'approved')}
                        className="inline-flex items-center gap-1 border border-[#2f9e44] bg-white px-2 py-1 text-[12px] font-semibold text-[#2b8a3e] transition hover:bg-[#2f9e44] hover:text-white disabled:opacity-50"
                      >
                        <Check width={12} height={12} /> 승인
                      </button>
                      <button
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() => onSetStatus(request.id, 'rejected')}
                        className="inline-flex items-center gap-1 border border-warm-300 bg-white px-2 py-1 text-[12px] font-semibold text-warm-600 transition hover:border-warm-800 hover:text-warm-800 disabled:opacity-50"
                      >
                        <X width={12} height={12} /> 거절
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpen(request.id)}
                      className="border border-warm-300/60 bg-white/70 px-2 py-1 text-[12px] font-semibold text-warm-600 transition hover:border-warm-800 hover:text-warm-800"
                    >
                      상세
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
