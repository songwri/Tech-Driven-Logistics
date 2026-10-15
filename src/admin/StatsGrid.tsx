import { cn } from '@/lib/utils'
import { METRIC_COLUMNS, type MetricColumn, type PeriodRow } from './statsData'

function formatValue(value: number | null, percent?: boolean) {
  if (value === null) return '–'
  return percent ? `${Math.round(value * 100)}%` : value.toLocaleString('ko-KR')
}

/* 히트맵 색: 한 가지 남색 계열(순차)만 쓰고 값이 클수록 진하게. 글자색은 배경과의 대비가 높은 쪽(흰색 / 진한 갈색)을 고른다. */
const SLATE: [number, number, number] = [48, 64, 95]
const INK: [number, number, number] = [59, 54, 52]

const mix = (alpha: number): [number, number, number] =>
  SLATE.map((channel) => Math.round(255 - alpha * (255 - channel))) as [number, number, number]

function luminance([r, g, b]: [number, number, number]) {
  const [R, G, B] = [r, g, b].map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** 0~1 비율 → { 배경, 글자색 } */
function heat(ratio: number) {
  const background = mix(0.08 + 0.82 * Math.min(1, Math.max(0, ratio)))
  const text = contrast(background, [255, 255, 255]) >= contrast(background, INK) ? '#ffffff' : `rgb(${INK.join(',')})`
  return { background: `rgb(${background.join(',')})`, color: text }
}

/** 지표 그룹 사이에 둘 빈 칸(간격) */
const GAP = 'gap' as const
type Slot = MetricColumn | typeof GAP

/**
 * 기간 × 지표 그리드. 열마다 값이 클수록 진한 남색으로 칠해(히트맵) 어느 달/해에 몰렸는지 한눈에 보이게 하고,
 * 지표 그룹(처리 현황 · 투어 종류 · 방문 유형 · 투어 언어) 사이에는 빈 간격을 둬서 경계를 분명히 합니다.
 * 셀마다 테두리를 두르지 않고 행 구분선만 둬서 숫자에 집중하게 합니다. 마지막 줄은 합계.
 */
export function StatsGrid({
  rows,
  firstHeader,
  columns = METRIC_COLUMNS,
}: {
  rows: PeriodRow[]
  firstHeader: string
  /** 보여줄 지표 열 (관리자 페이지별 투어 종류) */
  columns?: MetricColumn[]
}) {
  const body = rows.slice(0, -1)
  const total = rows[rows.length - 1]
  const peaks = Object.fromEntries(
    columns.map((column) => [column.key, Math.max(0, ...body.map((row) => row[column.key] ?? 0))]),
  )

  // 그룹이 바뀔 때마다 간격 칸을 끼워 넣는다.
  const slots = columns.reduce<Slot[]>((acc, column, index) => {
    if (index > 0 && columns[index - 1].group !== column.group) acc.push(GAP)
    acc.push(column)
    return acc
  }, [])
  const groups = slots.reduce<{ label: string; span: number }[]>((acc, slot) => {
    if (slot === GAP) {
      acc.push({ label: GAP, span: 1 })
    } else {
      const last = acc[acc.length - 1]
      if (last && last.label === slot.group) last.span += 1
      else acc.push({ label: slot.group, span: 1 })
    }
    return acc
  }, [])

  const stickyHead = 'sticky left-0 z-10 shadow-[2px_0_0_0_rgba(48,64,95,0.10)]'

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th rowSpan={2} className={cn(stickyHead, 'bg-white px-4 pb-2 text-left align-bottom text-[12px] font-semibold text-warm-600')}>
                {firstHeader}
              </th>
              {groups.map((group, index) =>
                group.label === GAP ? (
                  <th key={`gap-${index}`} className="w-3 min-w-3 p-0" aria-hidden />
                ) : (
                  <th
                    key={group.label}
                    colSpan={group.span}
                    className="bg-warm-800 px-2 py-1.5 text-center text-[12px] font-bold tracking-wide text-white first:rounded-tl-sm"
                  >
                    {group.label}
                  </th>
                ),
              )}
            </tr>
            <tr>
              {slots.map((slot, index) =>
                slot === GAP ? (
                  <th key={`gap-${index}`} className="w-3 min-w-3 p-0" aria-hidden />
                ) : (
                  <th
                    key={slot.key}
                    className="min-w-14 border-b-2 border-warm-800 bg-white px-1.5 pb-2 pt-2 text-center align-bottom text-[12px] font-semibold leading-tight text-warm-800"
                  >
                    {slot.color && (
                      <span className="mx-auto mb-1 block h-1.5 w-6 rounded-full" style={{ background: slot.color }} aria-hidden />
                    )}
                    {slot.label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {body.map((row) => (
              <tr key={row.label} className="group">
                <th
                  className={cn(
                    stickyHead,
                    'whitespace-nowrap border-b border-warm-300/40 bg-white px-3 py-2.5 text-left text-[13px] font-bold group-hover:bg-cream',
                    row.total === 0 ? 'text-warm-300' : 'text-warm-800',
                  )}
                >
                  {row.label}
                </th>
                {slots.map((slot, index) => {
                  if (slot === GAP) return <td key={`gap-${index}`} className="w-3 min-w-3 p-0" aria-hidden />
                  const value = row[slot.key]
                  const empty = !value
                  // 승인률처럼 비율 열은 0~100% 그대로, 건수 열은 그 열의 최댓값 대비
                  const ratio = slot.percent ? (value ?? 0) : peaks[slot.key] > 0 ? (value ?? 0) / peaks[slot.key] : 0
                  // 승인률은 '많을수록 진한' 건수가 아니므로 색을 칠하지 않는다.
                  const tone = empty || slot.percent ? undefined : heat(ratio)
                  return (
                    <td
                      key={slot.key}
                      title={`${row.label} · ${slot.group} ${slot.label}: ${formatValue(value, slot.percent)}`}
                      className={cn(
                        'border-b border-warm-300/40 px-1.5 py-2.5 text-center font-mono text-[13px] tabular-nums transition-[filter] group-hover:brightness-[0.94]',
                        empty ? 'text-warm-300' : 'font-semibold text-warm-800',
                        slot.key === 'total' && !empty && 'text-[14px] font-bold',
                      )}
                      style={tone}
                    >
                      {empty && !slot.percent ? '–' : formatValue(value, slot.percent)}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr>
              <th className={cn(stickyHead, 'whitespace-nowrap border-t-2 border-warm-800 bg-cream px-4 py-3 text-left text-[13px] font-bold text-warm-800')}>
                {total.label}
              </th>
              {slots.map((slot, index) =>
                slot === GAP ? (
                  <td key={`gap-${index}`} className="w-3 min-w-3 p-0" aria-hidden />
                ) : (
                  <td
                    key={slot.key}
                    className="border-t-2 border-warm-800 bg-cream px-1.5 py-3 text-center font-mono text-[14px] font-bold tabular-nums text-warm-800"
                  >
                    {total[slot.key] === 0 && !slot.percent ? '–' : formatValue(total[slot.key], slot.percent)}
                  </td>
                ),
              )}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-warm-600">
        <span className="inline-flex items-center gap-1.5">
          적음
          <span
            className="inline-block h-2.5 w-24 rounded-full"
            style={{ background: `linear-gradient(to right, ${heat(0).background}, ${heat(1).background})` }}
            aria-hidden
          />
          많음
        </span>
        <span>건수는 열마다 가장 큰 값을 기준으로 진하게 칠합니다 · 승인률은 색 없이 숫자만 · 0건은 – 로 표시</span>
      </p>
    </div>
  )
}
