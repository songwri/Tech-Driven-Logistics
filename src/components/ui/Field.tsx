import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const controlStyles =
  'w-full border border-warm-300/60 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition placeholder:text-warm-300 focus:border-brand'

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: ReactNode
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wider text-warm-600">
        {label}
        {required && <span className="text-brand"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 font-mono text-[11px] text-warm-300">{hint}</p>}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlStyles, className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlStyles, 'resize-none', className)} {...props} />
}
