import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from './Field'

const PICK_FROM = 7 * 60
const PICK_TO = 19 * 60
const STEP = 15

const pad = (value: number) => String(value).padStart(2, '0')
const label = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

/** '930' · '9:30' · '0930' · '14' → 'HH:mm'. 해석할 수 없으면 null. */
export function parseTimeText(text: string): string | null {
  const digits = text.replace(/[^\d]/g, '')
  if (!digits || digits.length > 4) return null
  const hour = digits.length <= 2 ? Number(digits) : Number(digits.slice(0, digits.length - 2))
  const minute = digits.length <= 2 ? 0 : Number(digits.slice(-2))
  if (hour > 23 || minute > 59) return null
  return `${pad(hour)}:${pad(minute)}`
}

/**
 * 시간 입력. 칸에 숫자로 직접 입력할 수 있고(930 → 09:30), 시계 버튼을 누르면 15분 단위 목록에서 고른다.
 * 값은 'HH:mm', 비어 있으면 ''.
 */
export function TimeField({
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  'aria-label'?: string
}) {
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => setText(value), [value])

  const options = useMemo(() => {
    const items: string[] = []
    for (let minutes = PICK_FROM; minutes <= PICK_TO; minutes += STEP) items.push(label(minutes))
    return items
  }, [])

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useEffect(() => {
    if (!open || !list.current) return
    const target = list.current.querySelector<HTMLElement>('[aria-selected=true]') ?? list.current.querySelector<HTMLElement>('[data-default]')
    target?.scrollIntoView({ block: 'center' })
  }, [open])

  const commit = () => {
    if (!text.trim()) return onChange('')
    const parsed = parseTimeText(text)
    if (parsed) {
      setText(parsed)
      onChange(parsed)
    } else {
      setText(value) // 해석할 수 없으면 이전 값으로 되돌린다
    }
  }

  return (
    <div ref={root} className={cn('relative', className)}>
      <Input
        value={text}
        inputMode="numeric"
        autoComplete="off"
        placeholder="10:00"
        maxLength={5}
        aria-label={ariaLabel}
        className="pr-10"
        onChange={(event) => setText(event.target.value.replace(/[^\d:]/g, ''))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          } else if (event.key === 'Escape' && open) {
            event.stopPropagation()
            setOpen(false)
          }
        }}
      />
      <button
        type="button"
        aria-label="시간 목록 열기 (15분 단위)"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-warm-600 transition hover:text-brand"
      >
        <Clock width={15} height={15} />
      </button>
      {open && (
        <ul
          ref={list}
          role="listbox"
          aria-label="시간 선택 (15분 단위)"
          className="absolute left-0 top-full z-30 mt-1 max-h-56 w-full min-w-[7rem] overflow-y-auto border border-warm-300/70 bg-white py-1 shadow-lg"
        >
          {options.map((option) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              data-default={option === '09:00' ? '' : undefined}
              onClick={() => {
                onChange(option)
                setText(option)
                setOpen(false)
              }}
              className={cn(
                'cursor-pointer px-3 py-1.5 font-mono text-[13px] tabular-nums transition hover:bg-brand/10',
                option === value ? 'bg-brand text-white hover:bg-brand' : 'text-warm-800',
              )}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
