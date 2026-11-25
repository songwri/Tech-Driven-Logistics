import { useContext, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { RelaxedFormContext } from './relaxed'

const controlStyles =
  'w-full border border-warm-300/70 bg-white px-3 py-2.5 text-sm text-warm-800 outline-none transition placeholder:text-warm-300 hover:border-warm-600/60 focus:border-brand focus:ring-2 focus:ring-brand/10'

const invalidStyles = 'border-brand/70 bg-brand/[0.03] hover:border-brand'

/** 입력 칸 이름. 필수는 *, 선택 항목은 '선택' 표시를 붙인다. */
export function Label({
  children,
  required,
  optional,
  strict,
}: {
  children: ReactNode
  required?: boolean
  optional?: boolean
  /** RelaxedFormContext 안에서도 필수 표시를 유지한다 */
  strict?: boolean
}) {
  const relaxed = useContext(RelaxedFormContext)
  if (relaxed && !strict) required = false
  return (
    <span className="text-[13px] font-semibold text-warm-800">
      {children}
      {required && <span className="ml-0.5 text-brand">*</span>}
      {optional && <span className="ml-1.5 text-[12px] font-normal text-warm-600">선택</span>}
    </span>
  )
}

export function Field({
  label,
  hint,
  required,
  optional,
  strict,
  error,
  children,
}: {
  label: string
  hint?: ReactNode
  required?: boolean
  optional?: boolean
  strict?: boolean
  /** 제출 시도 후 이 칸에 문제가 있으면 칸 아래에 바로 보여준다. */
  error?: string | null
  children: ReactNode
}) {
  return (
    <label className="block">
      <Label required={required} optional={optional} strict={strict}>
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-[12px] text-brand">{error}</p>
      ) : (
        hint && <p className="mt-1 text-[12px] text-warm-600">{hint}</p>
      )}
    </label>
  )
}

export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(controlStyles, invalid && invalidStyles, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(controlStyles, 'resize-none', invalid && invalidStyles, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}
