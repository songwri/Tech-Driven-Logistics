import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/visit'
import type { PartnerRow } from './statsData'

const TOP = 10

/**
 * 파트너사별 실적: 파트너사가 소개해 함께 온 고객 방문을 파트너사마다 묶어 보여 준다.
 * 건수가 많은 순, 막대는 1등 대비 길이. 줄을 누르면 그 파트너사가 소개한 방문 목록을 볼 수 있다.
 */
export function PartnerPerformance({ rows, onSelect }: { rows: PartnerRow[]; onSelect: (row: PartnerRow) => void }) {
  const [all, setAll] = useState(false)
  const shown = all ? rows : rows.slice(0, TOP)
  const peak = Math.max(1, ...rows.map((row) => row.count))
  const sum = rows.reduce((total, row) => total + row.count, 0)

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-warm-300">해당 기간에 파트너사가 소개한 방문이 없습니다.</p>
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="text-left text-[12px] font-semibold text-warm-600">
              <th className="w-10 border-b-2 border-warm-800 px-2 pb-2 text-center">순위</th>
              <th className="border-b-2 border-warm-800 px-2 pb-2">파트너사 · 소개 방문 건수</th>
              <th className="w-20 border-b-2 border-warm-800 px-2 pb-2 text-right">방문 인원</th>
              <th className="w-24 border-b-2 border-warm-800 px-2 pb-2 text-right">소개 고객사</th>
              <th className="w-32 border-b-2 border-warm-800 px-2 pb-2 text-right">최근 방문</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row, index) => (
              <tr
                key={row.name}
                tabIndex={0}
                role="button"
                aria-label={`${row.name} 소개 방문 ${row.count}건 목록 보기`}
                onClick={() => onSelect(row)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(row)
                  }
                }}
                className="group cursor-pointer hover:bg-cream/60"
              >
                <td className="border-b border-warm-300/40 px-2 py-2.5 text-center font-mono font-bold text-warm-800">{index + 1}</td>
                <td className="border-b border-warm-300/40 px-2 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className={cn('font-bold', row.name.startsWith('(') ? 'text-warm-300' : 'text-warm-800')}>{row.name}</span>
                    <span className="ml-auto font-mono text-[14px] font-bold tabular-nums text-warm-800">{row.count}건</span>
                    <span className="w-9 text-right font-mono text-[11px] tabular-nums text-warm-600">{Math.round((row.count / sum) * 100)}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-[3px] bg-cream">
                    <div
                      className="h-full rounded-[3px] bg-[#3f8f8a] transition-[filter] group-hover:brightness-90"
                      style={{ width: `${(row.count / peak) * 100}%`, minWidth: 3 }}
                    />
                  </div>
                </td>
                <td className="border-b border-warm-300/40 px-2 py-2.5 text-right font-mono tabular-nums">{row.visitors}명</td>
                <td className="border-b border-warm-300/40 px-2 py-2.5 text-right font-mono tabular-nums">{row.companies}곳</td>
                <td className="border-b border-warm-300/40 px-2 py-2.5 text-right text-[12px] text-warm-600">{formatDateShort(row.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > TOP && (
        <button
          type="button"
          onClick={() => setAll((current) => !current)}
          className="mt-3 border border-warm-300/60 px-3 py-1.5 text-[12px] font-semibold text-warm-600 transition hover:border-warm-800 hover:text-warm-800"
        >
          {all ? '상위 10곳만 보기' : `전체 ${rows.length}곳 보기`}
        </button>
      )}
    </div>
  )
}
