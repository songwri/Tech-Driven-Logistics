import { useState, type HTMLAttributes, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RATING_MAX, RATING_MIN, RATING_STEP, formatRating, snapRating } from '@/lib/rating'

interface StarRatingProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** 0.5 단위 값 (0이면 아직 고르지 않음) */
  value: number
  /** 있으면 입력용: 별의 왼쪽 절반은 0.5점 낮게, 방향키는 0.5점씩 */
  onChange?: (value: number) => void
  size?: number
}

const STARS = [1, 2, 3, 4, 5]

/** n번째 별이 얼마나 채워지는지: 1(가득) · 0.5(반) · 0(빈 별) */
function fillOf(shown: number, n: number) {
  if (shown >= n) return 1
  if (shown >= n - 0.5) return 0.5
  return 0
}

function StarGlyph({ size, fill }: { size: number; fill: number }) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
      <Star width={size} height={size} className="text-warm-300" strokeWidth={1.5} />
      {fill > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <Star width={size} height={size} className="fill-brand text-brand" strokeWidth={1.5} />
        </span>
      )}
    </span>
  )
}

/** 별점 표시 · 입력. 입력은 role=slider 하나로 키보드 · 스크린리더가 다루고, 마우스와 터치는 별의 좌우 절반으로 고른다. */
export function StarRating({ value, onChange, size = 24, className, ...rest }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value

  if (!onChange) {
    return (
      <div
        className={cn('flex items-center gap-1', className)}
        role="img"
        aria-label={`5점 만점에 ${formatRating(value)}점`}
        {...rest}
      >
        {STARS.map((n) => (
          <StarGlyph key={n} size={size} fill={fillOf(value, n)} />
        ))}
      </div>
    )
  }

  const halfOf = (event: MouseEvent | PointerEvent, n: number) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientX - rect.left < rect.width / 2 ? n - 0.5 : n
  }

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = value || 0
    let next: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = snapRating(current + RATING_STEP)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = snapRating(current - RATING_STEP)
    else if (event.key === 'Home') next = RATING_MIN
    else if (event.key === 'End') next = RATING_MAX
    if (next === null) return
    event.preventDefault()
    onChange(next)
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="별점"
      aria-valuemin={RATING_MIN}
      aria-valuemax={RATING_MAX}
      aria-valuenow={value || undefined}
      aria-valuetext={value ? `5점 만점에 ${formatRating(value)}점` : '선택 안 함'}
      onKeyDown={handleKey}
      onPointerLeave={() => setHover(null)}
      className={cn(
        'flex w-max items-center gap-1 rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-brand',
        className,
      )}
      {...rest}
    >
      {STARS.map((n) => (
        <span
          key={n}
          className="cursor-pointer transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-110 active:scale-95"
          onPointerMove={(event) => {
            if (event.pointerType === 'mouse') setHover(halfOf(event, n))
          }}
          onClick={(event) => onChange(halfOf(event, n))}
        >
          <StarGlyph size={size} fill={fillOf(shown, n)} />
        </span>
      ))}
    </div>
  )
}
