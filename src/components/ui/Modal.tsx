import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import BlueprintFrame from '../BlueprintFrame'

/** 입력 중인 창을 닫으려 할 때 묻는 문구 */
export const DISCARD_MESSAGE = '입력 중인 내용이 저장되지 않고 사라집니다. 닫을까요?'

interface ModalProps {
  title: string
  eyebrow?: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  className?: string
  /**
   * 입력 중인 내용이 있는 입력 창. 켜면 Esc · 바깥 클릭 · [X] 로 닫기 전에 확인을 받고,
   * 새로고침 · 뒤로 가기로 페이지를 떠나려 할 때도 브라우저 확인을 띄운다.
   */
  dirty?: boolean
}

export function Modal({ title, eyebrow, description, onClose, children, className, dirty = false }: ModalProps) {
  const dirtyRef = useRef(dirty)
  const closeRef = useRef(onClose)
  useEffect(() => {
    dirtyRef.current = dirty
    closeRef.current = onClose
  })
  /** 입력 중이면 확인을 받고 닫는다 */
  const requestClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm(DISCARD_MESSAGE)) return
    closeRef.current()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 안쪽 목록(시간 선택 등)이 Esc 를 이미 썼으면 창은 닫지 않는다.
      if (event.key === 'Escape' && !event.defaultPrevented) requestClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [requestClose])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // 바깥(어두운 바탕) 클릭으로만 닫는다. 창 안에서 글자를 드래그해 바깥에서 놓은 경우는 닫지 않는다.
  const pressedOnBackdrop = useRef(false)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-warm-800/60 p-4 backdrop-blur-sm md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-modal-title"
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedOnBackdrop.current) requestClose()
        pressedOnBackdrop.current = false
      }}
    >
      <div
        className={cn('relative my-auto w-full max-w-3xl border border-warm-300/50 bg-white p-6 md:p-8', className)}
        onClick={(event) => event.stopPropagation()}
      >
        <BlueprintFrame size={20} />
        <button
          type="button"
          onClick={requestClose}
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
