import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { Button } from './ui/Button'
import { Field, Input, Label, Textarea } from './ui/Field'
import { StarRating } from './ui/StarRating'
import { maskCompany, maskName } from '@/lib/mask'
import { formatRating, ratingLabel } from '@/lib/rating'
import { submitGuestbook, type GuestbookEntry } from '@/lib/labApi'

const MESSAGE_LIMIT = 100
const EASE = [0.32, 0.72, 0, 1] as const

interface GuestbookDialogProps {
  onClose: () => void
  onSubmitted: (entry: GuestbookEntry) => void
}

type Errors = Partial<Record<'rating' | 'message' | 'name' | 'company' | 'role', string>>

function validate(values: { rating: number; message: string; name: string; company: string; role: string }) {
  const errors: Errors = {}
  if (!values.rating) errors.rating = '별점을 선택해 주세요.'
  if (!values.message.trim()) errors.message = '방문 소감을 한 줄 남겨 주세요.'
  if (!values.name.trim()) errors.name = '이름을 입력해 주세요.'
  if (!values.company.trim()) errors.company = '회사명을 입력해 주세요.'
  if (!values.role.trim()) errors.role = '직책을 입력해 주세요.'
  return errors
}

/** 방명록 작성: 화면 오른쪽에서 열리는 드로어. 목록을 가리지 않고 소감부터 쓰고 신원은 뒤에서 받는다. */
export default function GuestbookDialog({ onClose, onSubmitted }: GuestbookDialogProps) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(true)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [team, setTeam] = useState('')
  const [role, setRole] = useState('')
  const [tried, setTried] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(document.activeElement)

  const errors = tried ? validate({ rating, message, name, company, role }) : {}
  const close = () => setOpen(false)

  // 열려 있는 동안 배경 스크롤을 막고, 닫으면 눌렀던 버튼으로 포커스를 돌려준다.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const returnTo = opener.current
    return () => {
      document.body.style.overflow = previous
      if (returnTo instanceof HTMLElement) returnTo.focus()
    }
  }, [])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, textarea, [tabindex="0"]',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (Object.keys(validate({ rating, message, name, company, role })).length > 0) return
    setStatus('sending')
    setError(null)
    try {
      const entry = await submitGuestbook({
        name: name.trim(),
        company: company.trim(),
        team: team.trim(),
        role: role.trim(),
        rating,
        message: message.trim(),
      })
      onSubmitted(entry)
      setStatus('done')
    } catch (submitError) {
      setStatus('idle')
      setError(submitError instanceof Error ? submitError.message : '방명록 등록에 실패했습니다.')
    }
  }

  const transition = { duration: reduce ? 0 : 0.5, ease: EASE }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="gb-title">
          <motion.div
            className="absolute inset-0 bg-warm-800/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={close}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-white outline-none"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={transition}
          >
            <header className="flex items-start justify-between gap-4 border-b border-warm-300/50 px-6 py-5">
              <div>
                <h2 id="gb-title" className="text-lg font-bold tracking-tight text-ink">
                  방명록 남기기
                </h2>
                <p className="mt-0.5 text-[13px] text-warm-600">이름과 회사명은 가려서 공개됩니다.</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="-mr-2 -mt-1 rounded-full p-2 text-warm-600 transition hover:bg-cream hover:text-ink"
              >
                <X width={18} height={18} />
              </button>
            </header>

            {status === 'done' ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Check width={22} height={22} strokeWidth={2.5} />
                </span>
                <p className="mt-5 text-lg font-bold text-ink">소중한 기록 감사합니다</p>
                <p className="mt-1.5 text-sm text-warm-600">방명록 맨 위에 바로 반영했습니다.</p>
                <Button className="mt-8" onClick={close}>
                  기록 보러 가기
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
                  <div>
                    <Label required>이번 방문은 어떠셨나요?</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <StarRating value={rating} onChange={setRating} size={30} aria-label="별점" />
                      <span className="min-w-[88px] text-sm tabular-nums text-warm-600" aria-live="polite">
                        {rating ? (
                          <>
                            <span className="font-semibold text-ink">{formatRating(rating)}</span> · {ratingLabel(rating)}
                          </>
                        ) : (
                          '0.5점 단위'
                        )}
                      </span>
                    </div>
                    {errors.rating && <p className="mt-1 text-[12px] text-brand">{errors.rating}</p>}
                  </div>

                  <Field
                    label="방문 소감"
                    required
                    error={errors.message}
                    hint={`${message.length} / ${MESSAGE_LIMIT}자`}
                  >
                    <Textarea
                      rows={3}
                      value={message}
                      invalid={Boolean(errors.message)}
                      onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_LIMIT))}
                      maxLength={MESSAGE_LIMIT}
                      placeholder="인상 깊었던 점을 남겨 주세요."
                    />
                  </Field>

                  <div className="grid gap-4 border-t border-warm-300/40 pt-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="이름" required error={errors.name}>
                        <Input
                          value={name}
                          invalid={Boolean(errors.name)}
                          autoComplete="name"
                          onChange={(e) => setName(e.target.value)}
                          placeholder="홍길동"
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="회사명" required error={errors.company}>
                        <Input
                          value={company}
                          invalid={Boolean(errors.company)}
                          autoComplete="organization"
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="LX판토스"
                        />
                      </Field>
                    </div>
                    <Field label="팀명" optional>
                      <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="물류혁신팀" />
                    </Field>
                    <Field label="직책" required error={errors.role}>
                      <Input
                        value={role}
                        invalid={Boolean(errors.role)}
                        autoComplete="organization-title"
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="책임"
                      />
                    </Field>
                  </div>

                  <div className="bg-cream/70 p-1">
                    <div className="border border-warm-300/40 bg-white px-4 py-3">
                      <p className="text-[12px] text-warm-600">공개 표시</p>
                      <p className="mt-1 text-sm text-ink">
                        <span className="font-semibold">{maskName(name) || '홍**'}</span>
                        <span className="ml-2 text-warm-600">
                          {[maskCompany(company) || 'L**', team.trim(), role.trim()].filter(Boolean).join(' · ')}
                        </span>
                      </p>
                    </div>
                  </div>

                  {error && (
                    <p className="border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand" role="alert">
                      {error}
                    </p>
                  )}
                </div>

                <footer className="flex justify-end gap-3 border-t border-warm-300/50 px-6 py-4">
                  <Button type="button" variant="outline" onClick={close}>
                    취소
                  </Button>
                  <Button type="submit" disabled={status === 'sending'}>
                    {status === 'sending' ? '등록 중…' : '등록하기'}
                  </Button>
                </footer>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
