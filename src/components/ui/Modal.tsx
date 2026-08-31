import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import BlueprintFrame from '../BlueprintFrame'

interface ModalProps {
  title: string
  eyebrow?: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Modal({ title, eyebrow, description, onClose, children, className }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-warm-800/60 p-4 backdrop-blur-sm md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-modal-title"
      onClick={onClose}
    >
      <div
        className={cn('relative my-auto w-full max-w-3xl border border-warm-300/50 bg-white p-6 md:p-8', className)}
        onClick={(event) => event.stopPropagation()}
      >
        <BlueprintFrame size={20} />
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 font-mono text-sm text-warm-600 transition hover:text-brand"
        >
          [X]
        </button>

        {eyebrow && (
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand">{eyebrow}</p>
        )}
        <h3 id="lab-modal-title" className="mt-2 text-2xl font-bold text-warm-800">
          {title}
        </h3>
        {description && <p className="mt-1 text-sm text-warm-600">{description}</p>}

        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
