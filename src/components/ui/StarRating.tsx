import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: number
  className?: string
}

const SCORES = [1, 2, 3, 4, 5]

export function StarRating({ value, onChange, size = 24, className }: StarRatingProps) {
  const readOnly = !onChange

  return (
    <div className={cn('flex items-center gap-1', className)} role={readOnly ? 'img' : 'radiogroup'} aria-label={`5점 만점에 ${value}점`}>
      {SCORES.map((score) => {
        const filled = score <= value
        const star = (
          <Star
            width={size}
            height={size}
            className={filled ? 'fill-brand text-brand' : 'text-warm-300'}
            strokeWidth={1.5}
          />
        )

        if (readOnly) return <span key={score}>{star}</span>

        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            aria-label={`${score}점`}
            aria-pressed={value === score}
            className="transition hover:scale-110"
          >
            {star}
          </button>
        )
      })}
    </div>
  )
}
