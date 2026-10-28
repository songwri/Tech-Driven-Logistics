import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, ShieldCheck, X } from 'lucide-react'
import { Button } from './ui/Button'
import { Field, Input, Label, Textarea } from './ui/Field'
import { StarRating } from './ui/StarRating'
import { maskCompany, maskName } from '@/lib/mask'
import { formatRating, ratingLabel } from '@/lib/rating'
import { GUESTBOOK_TOURS, TOUR_BY_ID, type GuestbookTour, type Resource } from '@/lib/visit'
import { cn } from '@/lib/utils'
import { submitGuestbook, type GuestbookEntry } from '@/lib/labApi'
import { RobotScene } from '@/guestbook/RobotScene'
import { introFrame, outroFrame, useTimeline } from '@/guestbook/scenes'

const MESSAGE_LIMIT = 100
const EASE = [0.32, 0.72, 0, 1] as const
const INTRO_MS = 2100
const OUTRO_MS = 1900

interface GuestbookDialogProps {
  onClose: () => void
  onSubmitted: (entry: GuestbookEntry) => void
}

type Errors = Partial<Record<'tour' | 'rating' | 'message' | 'name' | 'company' | 'role' | 'consent', string>>
/** intro: 로봇이 빈 용지를 집어 올림 → form: 용지가 커져 작성 화면 → outro: 다 쓴 용지를 컨베이어로 보냄 */
type Phase = 'intro' | 'form' | 'outro'
/** 장면 속 용지의 화면 위치. 작성 화면이 여기서 커져 나오고, 등록하면 여기로 돌아간다. */
type Spot = { x: number; y: number; scale: number } | null

function validate(values: { tour: GuestbookTour | ''; rating: number; message: string; name: string; company: string; role: string; consent: boolean }) {
  const errors: Errors = {}
  if (!values.tour) errors.tour = '참여하신 투어를 선택해 주세요.'
  if (!values.rating) errors.rating = '별점을 선택해 주세요.'
  if (!values.message.trim()) errors.message = '방문 소감을 한 줄 남겨 주세요.'
  if (!values.name.trim()) errors.name = '이름을 입력해 주세요.'
  if (!values.company.trim()) errors.company = '회사명을 입력해 주세요.'
  if (!values.role.trim()) errors.role = '직책을 입력해 주세요.'
  if (!values.consent) errors.consent = '개인정보 수집 · 이용에 동의해 주세요.'
  return errors
}

/* ---------------------------------------------------------------- 투어 고르기 */

/** 화면에 보여 줄 순서: 종합 투어 → TDL Lab 투어 → 메가와이즈 센터 투어 → (열려 있다면) 시화MTV가 들어간 투어 */
const TOUR_ORDER: GuestbookTour[] = ['combined', 'lab', 'center', 'center_mtv', 'mtv', 'all3']

const PLACE_LABEL: Record<Resource, string> = { lab: 'TDL Lab', center: '메가와이즈', mtv: '시화MTV' }
const PLACE_COLOR: Record<Resource, string> = {
  lab: TOUR_BY_ID.lab.color,
  center: TOUR_BY_ID.center.color,
  mtv: TOUR_BY_ID.mtv.color,
}

/** 투어마다 이름과 '어디를 둘러봤는지'를 한눈에: 이름 · 다녀온 곳 배지 · 한 줄 설명 */
function tourCard(id: GuestbookTour) {
  const places = [...TOUR_BY_ID[id].places].sort((a, b) => (a === 'lab' ? -1 : b === 'lab' ? 1 : 0)) as Resource[]
  const title = id === 'combined' ? '종합 투어' : TOUR_BY_ID[id].label
  const hint =
    id === 'combined'
      ? '센터와 Lab을 함께 둘러봤어요'
      : id === 'lab'
        ? 'TDL Lab만 둘러봤어요'
        : id === 'center'
          ? '메가와이즈 센터만 둘러봤어요'
          : TOUR_BY_ID[id].description
  return { id, title, places, hint }
}

const SORTED_TOURS = [...GUESTBOOK_TOURS].sort((a, b) => TOUR_ORDER.indexOf(a) - TOUR_ORDER.indexOf(b))

const today = () => {
  const now = new Date()
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
}

/** 로봇 장면을 담는 무대. 작성 전후의 짧은 연출에만 보인다. */
function Stage({
  phase,
  onDone,
  sheetRef,
  onSkip,
}: {
  phase: 'intro' | 'outro'
  onDone: () => void
  sheetRef: React.Ref<SVGPolygonElement>
  onSkip?: () => void
}) {
  const t = useTimeline({ duration: phase === 'intro' ? INTRO_MS : OUTRO_MS, playing: true, onDone })
  const frame = phase === 'intro' ? introFrame(t) : outroFrame(t)
  return (
    <motion.div
      className="relative w-[min(560px,calc(100vw-32px))] border border-warm-300/60 bg-white px-4 pb-3 pt-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.4, ease: EASE }}
      onClick={(event) => event.stopPropagation()}
    >
      <RobotScene
        frame={frame}
        sheetRef={sheetRef}
        className="h-auto w-full"
        label={phase === 'intro' ? '휴머노이드 로봇이 컨베이어에서 빈 방명록 용지를 집어 올리는 장면' : '작성한 방명록 용지가 컨베이어를 따라 나가는 장면'}
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-[13px]">
        <p className="text-warm-600" aria-live="polite">
          {phase === 'intro' ? '빈 방명록 용지를 준비하고 있어요' : '방명록을 보내는 중이에요'}
        </p>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full px-3 py-1 font-semibold text-warm-600 transition hover:bg-cream hover:text-ink"
          >
            건너뛰기
          </button>
        )}
      </div>
    </motion.div>
  )
}

/**
 * 방명록 작성. 로봇이 컨베이어에서 빈 용지를 집어 들면 그 용지가 커져 작성 화면이 되고,
 * 등록하면 용지가 다시 작아져 컨베이어로 나간다. 움직임 줄이기 설정이면 연출 없이 바로 열고 닫는다.
 */
export default function GuestbookDialog({ onClose, onSubmitted }: GuestbookDialogProps) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(true)
  const [phase, setPhase] = useState<Phase>(reduce ? 'form' : 'intro')
  const [spot, setSpot] = useState<Spot>(null)
  const [tour, setTour] = useState<GuestbookTour | ''>('')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [team, setTeam] = useState('')
  const [role, setRole] = useState('')
  const [consent, setConsent] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [tried, setTried] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending'>('idle')
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<SVGPolygonElement>(null)
  const sent = useRef<GuestbookEntry | null>(null)
  const opener = useRef<Element | null>(document.activeElement)

  const errors = tried ? validate({ tour, rating, message, name, company, role, consent }) : {}

  /** 장면 속 용지 위치를 작성 화면(가운데 정렬) 기준의 이동 · 배율로 바꿔 둔다. */
  const measureSheet = useCallback(() => {
    const sheet = sheetRef.current?.getBoundingClientRect()
    if (!sheet || sheet.width === 0) return null
    const cardWidth = Math.min(520, window.innerWidth - 32)
    return {
      x: sheet.left + sheet.width / 2 - window.innerWidth / 2,
      y: sheet.top + sheet.height / 2 - window.innerHeight / 2,
      scale: Math.max(0.06, sheet.width / cardWidth),
    }
  }, [])

  const finishIntro = useCallback(() => {
    setSpot(measureSheet())
    setPhase('form')
  }, [measureSheet])

  const skipIntro = useCallback(() => {
    setSpot(null)
    setPhase('form')
  }, [])

  const finishOutro = useCallback(() => {
    if (sent.current) onSubmitted(sent.current)
    sent.current = null
    setOpen(false)
  }, [onSubmitted])

  const cancel = useCallback(() => setOpen(false), [])

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
    if (phase === 'form') cardRef.current?.focus()
    else rootRef.current?.focus()
  }, [phase])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 연출 중 ESC 는 건너뛰기, 작성 중 ESC 는 닫기. 보내는 중에는 끝까지 둔다.
        if (phase === 'intro') skipIntro()
        else if (phase === 'form') cancel()
        return
      }
      if (event.key !== 'Tab' || !rootRef.current) return
      const focusable = rootRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, textarea, [tabindex="0"]',
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !rootRef.current.contains(active) || active === cardRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [phase, skipIntro, cancel])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (Object.keys(validate({ tour, rating, message, name, company, role, consent })).length > 0 || !tour) return
    setStatus('sending')
    setError(null)
    try {
      const entry = await submitGuestbook({
        name: name.trim(),
        company: company.trim(),
        team: team.trim(),
        role: role.trim(),
        rating,
        tour,
        message: message.trim(),
        consent: true,
      })
      if (reduce) {
        onSubmitted(entry)
        setOpen(false)
        return
      }
      sent.current = entry
      setPhase('outro')
    } catch (submitError) {
      setStatus('idle')
      setError(submitError instanceof Error ? submitError.message : '방명록 등록에 실패했습니다.')
    }
  }

  const fast = { duration: reduce ? 0 : 0.55, ease: EASE }
  const fromSpot = spot ? { opacity: 0.4, x: spot.x, y: spot.y, scale: spot.scale } : { opacity: 0, y: 16, scale: 0.98 }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {open && (
        <motion.div
          ref={rootRef}
          tabIndex={-1}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gb-title"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.3 } }}
        >
          <motion.div
            className="absolute inset-0 bg-warm-800/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fast}
            onClick={phase === 'intro' ? skipIntro : phase === 'form' ? cancel : undefined}
          />
          <h2 id="gb-title" className="sr-only">
            방명록 남기기
          </h2>

          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <Stage key="intro" phase="intro" onDone={finishIntro} onSkip={skipIntro} sheetRef={sheetRef} />
            )}

            {phase === 'form' && (
              <motion.div
                key="form"
                ref={cardRef}
                tabIndex={-1}
                className="relative flex max-h-[calc(100dvh-32px)] w-full max-w-[520px] origin-center flex-col bg-white shadow-[0_32px_80px_-32px_rgba(43,37,34,0.55)] outline-none"
                initial={fromSpot}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={spot ? { opacity: 0.4, x: spot.x, y: spot.y, scale: spot.scale } : { opacity: 0, scale: 0.96 }}
                transition={fast}
              >
                <header className="flex items-start justify-between gap-4 border-b border-dashed border-warm-300/70 px-6 pb-4 pt-5">
                  <div>
                    <p className="font-mono text-[11px] tracking-wide text-warm-600">TDL LAB · GUESTBOOK · {today()}</p>
                    <p className="mt-1 text-lg font-bold tracking-tight text-ink" aria-hidden>
                      방명록 남기기
                    </p>
                    <p className="mt-0.5 text-[13px] text-warm-600">이름과 회사명은 가명 처리(일부 가림)되어 공개됩니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={cancel}
                    aria-label="닫기"
                    className="-mr-2 -mt-1 rounded-full p-2 text-warm-600 transition hover:bg-cream hover:text-ink"
                  >
                    <X width={18} height={18} />
                  </button>
                </header>

                <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <div>
                      <Label required>어떤 투어에 참여하셨나요?</Label>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="참여한 투어">
                        {SORTED_TOURS.map((id) => {
                          const card = tourCard(id)
                          const active = tour === id
                          return (
                            <button
                              key={id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setTour(id)}
                              className={cn(
                                'relative flex flex-col items-start gap-2 border-2 p-3 text-left transition',
                                active
                                  ? 'border-brand bg-brand/5'
                                  : errors.tour
                                    ? 'border-brand/50 hover:border-brand'
                                    : 'border-warm-300/60 hover:border-warm-800',
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border-[1.5px]',
                                  active ? 'border-brand bg-brand text-white' : 'border-warm-300',
                                )}
                                aria-hidden
                              >
                                {active && <Check width={12} height={12} strokeWidth={3} />}
                              </span>
                              <span className={cn('pr-6 text-[14px] font-bold leading-snug', active ? 'text-brand' : 'text-ink')}>{card.title}</span>
                              {/* 다녀온 곳: 센터 · Lab 색 배지 (종합 투어는 두 곳을 + 로 잇는다) */}
                              <span className="flex flex-wrap items-center gap-1">
                                {card.places.map((place, index) => (
                                  <span key={place} className="contents">
                                    {index > 0 && <span className="text-[11px] font-bold text-warm-600">+</span>}
                                    <span
                                      className="rounded-sm px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
                                      style={{ background: PLACE_COLOR[place] }}
                                    >
                                      {PLACE_LABEL[place]}
                                    </span>
                                  </span>
                                ))}
                              </span>
                              <span className="text-[12px] leading-snug text-warm-600">{card.hint}</span>
                            </button>
                          )
                        })}
                      </div>
                      {errors.tour && <p className="mt-1 text-[12px] text-brand">{errors.tour}</p>}
                    </div>

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
                        <p className="text-[12px] text-warm-600">공개 표시 · 가명 처리되어 이렇게 보입니다</p>
                        <p className="mt-1 text-sm text-ink">
                          <span className="font-semibold">{maskName(name) || '홍**'}</span>
                          <span className="ml-2 text-warm-600">
                            {[maskCompany(company) || 'L**', maskCompany(team), role.trim()].filter(Boolean).join(' · ')}
                          </span>
                        </p>
                        <p className="mt-2 flex items-start gap-1.5 border-t border-warm-300/40 pt-2 text-[12px] leading-relaxed text-warm-600">
                          <ShieldCheck width={14} height={14} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                          <span>방명록은 가명 처리해 관리합니다. 실명과 실제 회사명은 공개하지 않으며, 담당 관리자만 확인합니다.</span>
                        </p>
                      </div>
                    </div>

                    {error && (
                      <p className="border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand" role="alert">
                        {error}
                      </p>
                    )}
                  </div>

                  {/* 개인정보 동의: 맨 아래, 등록 버튼 바로 위에 한 줄로 */}
                  <div className="border-t border-dashed border-warm-300/70 px-6 pt-3">
                    <div className="flex items-center gap-2">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[13px] text-ink">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="h-4 w-4 shrink-0 accent-[#a72b2b]"
                          aria-invalid={Boolean(errors.consent) || undefined}
                        />
                        <span>
                          개인정보 수집 · 이용에 동의합니다 <span className="font-semibold text-brand">(필수)</span>
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowConsent((current) => !current)}
                        aria-expanded={showConsent}
                        className="inline-flex shrink-0 items-center gap-0.5 text-[12px] text-warm-600 underline decoration-warm-300 underline-offset-2 hover:text-brand"
                      >
                        자세히 <ChevronDown width={12} height={12} className={cn('transition', showConsent && 'rotate-180')} />
                      </button>
                    </div>
                    {showConsent && (
                      <p className="mt-2 bg-cream/70 px-3 py-2 text-[12px] leading-relaxed text-warm-600">
                        · 항목: 이름, 회사명, 팀명(선택), 직책, 별점 · 소감 · 참여 투어<br />
                        · 목적: 방명록 등록 · 게시(이름과 회사명은 가명 처리해 공개), 방문 서비스 개선<br />
                        · 가명 처리: 공개 화면에는 가명(예: 홍**, L**처럼 일부만 표시)만 보이고, 실명 · 실제 회사명은 공개하지 않으며 담당 관리자만 접근해 관리<br />
                        · 보관: 등록일로부터 1년 후 파기, 삭제를 원하시면 담당자에게 요청<br />
                        · 동의를 거부할 수 있으나, 거부하시면 방명록을 남기실 수 없습니다.
                      </p>
                    )}
                    {errors.consent && <p className="mt-1 text-[12px] text-brand">{errors.consent}</p>}
                  </div>

                  <footer className="flex justify-end gap-3 px-6 py-4">
                    <Button type="button" variant="outline" onClick={cancel}>
                      취소
                    </Button>
                    <Button type="submit" disabled={status === 'sending'}>
                      {status === 'sending' ? '등록 중…' : '등록하기'}
                    </Button>
                  </footer>
                </form>
              </motion.div>
            )}

            {phase === 'outro' && <Stage key="outro" phase="outro" onDone={finishOutro} sheetRef={sheetRef} />}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
