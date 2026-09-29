import { useState } from 'react'
import { cn } from '@/lib/utils'
import { rampColor } from './ramp'

export interface Datum {
  label: string
  value: number
  color?: string
  /** 월별 보기에서 선택된 달처럼 강조할 막대 */
  dim?: boolean
}

function niceMax(value: number) {
  // 중간 눈금(절반)이 정수로 떨어지는 값만 고른다.
  if (value <= 4) return 4
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const steps = [1, 2, 3, 4, 5, 6, 8, 10]
  for (const step of steps) if (step * magnitude >= value) return step * magnitude
  return 10 * magnitude
}

/**
 * 세로 막대 차트. 막대 위에 값을 직접 표기하고(색만으로 읽지 않도록),
 * 마우스를 올리면 비율까지 보여줍니다. 색을 따로 주지 않은 막대는
 * 값이 클수록 진한 파랑 그라데이션으로 칠합니다.
 */
export function ColumnChart({
  data,
  height = 180,
  unit = '건',
  color,
  total,
}: {
  data: Datum[]
  height?: number
  unit?: string
  color?: string
  /** 비율 계산 기준 (없으면 합계) */
  total?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const peak = Math.max(0, ...data.map((datum) => datum.value))
  const max = niceMax(peak)
  const sum = total ?? data.reduce((acc, datum) => acc + datum.value, 0)
  const ticks = [0, 0.5, 1]

  if (data.length === 0 || data.every((datum) => datum.value === 0)) {
    return (
      <div className="flex items-center justify-center text-sm text-warm-300" style={{ height: height + 28 }}>
        해당 기간 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="flex gap-2 pt-3">
      <div className="relative w-7 shrink-0 font-mono text-[10px] text-warm-300" style={{ height }}>
        {ticks.map((tick) => (
          <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${tick * 100}%` }}>
            {Math.round(max * tick)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {ticks.map((tick) => (
            <div
              key={tick}
              className={cn('absolute inset-x-0 border-t', tick === 0 ? 'border-warm-300/70' : 'border-dashed border-warm-300/30')}
              style={{ bottom: `${tick * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px] px-1">
            {data.map((datum, index) => {
              const pct = sum > 0 ? Math.round((datum.value / sum) * 100) : 0
              const barHeight = (datum.value / max) * 100
              return (
                <div
                  key={datum.label}
                  className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover === index && (
                    <div className="pointer-events-none absolute bottom-full z-20 mb-1 whitespace-nowrap border border-warm-300/60 bg-white px-2 py-1 text-[11px] shadow-md">
                      <b className="text-warm-800">{datum.label}</b>
                      <span className="ml-1.5 text-warm-600">
                        {datum.value}
                        {unit} · {pct}%
                      </span>
                    </div>
                  )}
                  <span
                    className={cn(
                      'mb-0.5 font-mono text-[11px] font-semibold',
                      datum.dim ? 'text-warm-300' : 'text-warm-800',
                    )}
                  >
                    {datum.value > 0 ? datum.value : ''}
                  </span>
                  <div
                    className="w-full max-w-12 rounded-t-[4px] transition-[filter,opacity]"
                    style={{
                      height: `${barHeight}%`,
                      minHeight: datum.value > 0 ? 2 : 0,
                      background: datum.color ?? color ?? rampColor(peak > 0 ? datum.value / peak : 0),
                      opacity: datum.dim ? 0.3 : 1,
                      filter: hover === index ? 'brightness(0.9)' : undefined,
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
        <div className="mt-1.5 flex gap-[2px] px-1">
          {data.map((datum) => (
            <span
              key={datum.label}
              className={cn(
                'min-w-0 flex-1 break-keep text-center text-[11px] leading-tight',
                datum.dim ? 'text-warm-300' : 'text-warm-600',
              )}
              title={datum.label}
            >
              {datum.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 도넛 차트 + 범례(색 · 라벨 · 건수 · 비율). */
export function DonutChart({ data, unit = '건' }: { data: Required<Pick<Datum, 'label' | 'value' | 'color'>>[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = data.reduce((acc, datum) => acc + datum.value, 0)
  const radius = 60
  const stroke = 22
  const circumference = 2 * Math.PI * radius
  const gap = total > 0 && data.filter((datum) => datum.value > 0).length > 1 ? 2 : 0

  const lengths = data.map((datum) => (total > 0 ? (datum.value / total) * circumference : 0))
  const arcs = data.map((datum, index) => ({
    ...datum,
    index,
    dash: Math.max(0, lengths[index] - gap),
    offset: lengths.slice(0, index).reduce((acc, length) => acc + length, 0),
  }))

  const focus = hover !== null ? data[hover] : null

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img" aria-label="고객 구분 비율">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#f3f2f1" strokeWidth={stroke} />
        {arcs.map((arc) =>
          arc.dash > 0 ? (
            <circle
              key={arc.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={hover === arc.index ? stroke + 4 : stroke}
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={-arc.offset}
              transform="rotate(-90 80 80)"
              onMouseEnter={() => setHover(arc.index)}
              onMouseLeave={() => setHover(null)}
              className="cursor-default transition-[stroke-width]"
            />
          ) : null,
        )}
        <text x="80" y="76" textAnchor="middle" className="fill-warm-800 text-[22px] font-bold">
          {focus ? focus.value : total}
        </text>
        <text x="80" y="96" textAnchor="middle" className="fill-warm-600 text-[11px]">
          {focus ? focus.label : `전체 ${unit}`}
        </text>
      </svg>
      <ul className="min-w-44 space-y-2">
        {data.map((datum, index) => {
          const pct = total > 0 ? Math.round((datum.value / total) * 100) : 0
          return (
            <li
              key={datum.label}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              className={cn('flex items-center gap-2 text-sm', hover !== null && hover !== index && 'opacity-50')}
            >
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: datum.color }} aria-hidden />
              <span className="flex-1 text-warm-800">{datum.label}</span>
              <span className="font-mono text-[13px] font-semibold text-warm-800">{datum.value}</span>
              <span className="w-10 text-right font-mono text-[11px] text-warm-600">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
