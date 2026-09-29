import { cn } from '@/lib/utils'
import { METRIC_COLUMNS, type PeriodRow } from './statsData'

function formatValue(value: number | null, percent?: boolean) {
  if (value === null) return '-'
  return percent ? `${Math.round(value * 100)}%` : value.toLocaleString('ko-KR')
}

/**
 * 기간 × 지표 그리드. 열마다 값이 클수록 진한 파랑으로 칠해(히트맵)
 * 어느 달/해에 몰렸는지 한눈에 보이게 합니다. 마지막 줄은 합계.
 */
export function StatsGrid({ rows, firstHeader }: { rows: PeriodRow[]; firstHeader: string }) {
  const body = rows.slice(0, -1)
  const total = rows[rows.length - 1]
  const peaks = Object.fromEntries(
    METRIC_COLUMNS.map((column) => [column.key, Math.max(0, ...body.map((row) => row[column.key] ?? 0))]),
  )
  const groups = METRIC_COLUMNS.reduce<{ label: string; span: number }[]>((acc, column) => {
    const last = acc[acc.length - 1]
    if (last && last.label === column.group) last.span += 1
    else acc.push({ label: column.group, span: 1 })
    return acc
  }, [])

  const shade = (value: number | null, peak: number) => {
    if (!value || peak <= 0) return undefined
    return `rgba(42, 120, 214, ${(0.06 + 0.42 * (value / peak)).toFixed(3)})`
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-[12px]">
        <thead>
          <tr className="font-mono text-[11px] text-warm-600">
            <th rowSpan={2} className="sticky left-0 z-10 border border-warm-300/40 bg-cream px-3 py-1.5 text-left font-semibold">
              {firstHeader}
            </th>
            {groups.map((group) => (
              <th key={group.label} colSpan={group.span} className="border border-warm-300/40 bg-cream px-2 py-1.5 font-semibold">
                {group.label}
              </th>
            ))}
          </tr>
          <tr className="text-[11px] text-warm-800">
            {METRIC_COLUMNS.map((column) => (
              <th key={column.key} className="whitespace-nowrap border border-warm-300/40 bg-white px-2 py-1.5 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row) => (
            <tr key={row.label}>
              <th className="sticky left-0 z-10 whitespace-nowrap border border-warm-300/40 bg-white px-3 py-1.5 text-left font-semibold text-warm-800">
                {row.label}
              </th>
              {METRIC_COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'border border-warm-300/40 px-2 py-1.5 text-right font-mono text-warm-800',
                    row.total === 0 && 'text-warm-300',
                  )}
                  style={{ background: shade(row[column.key], peaks[column.key]) }}
                >
                  {formatValue(row[column.key], column.percent)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="font-bold">
            <th className="sticky left-0 z-10 border border-warm-300/60 bg-cream px-3 py-1.5 text-left text-warm-800">
              {total.label}
            </th>
            {METRIC_COLUMNS.map((column) => (
              <td key={column.key} className="border border-warm-300/60 bg-cream px-2 py-1.5 text-right font-mono text-warm-800">
                {formatValue(total[column.key], column.percent)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
