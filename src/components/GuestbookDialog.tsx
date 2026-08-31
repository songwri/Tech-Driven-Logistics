import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Field, Input, Textarea } from './ui/Field'
import { StarRating } from './ui/StarRating'
import { maskCompany, maskName } from '@/lib/mask'
import { submitGuestbook, type GuestbookEntry } from '@/lib/labApi'

const MESSAGE_LIMIT = 100

interface GuestbookDialogProps {
  onClose: () => void
  onSubmitted: (entry: GuestbookEntry) => void
}

export default function GuestbookDialog({ onClose, onSubmitted }: GuestbookDialogProps) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [rating, setRating] = useState(5)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      const entry = await submitGuestbook({
        name: name.trim(),
        company: company.trim(),
        role: role.trim(),
        rating,
        message: message.trim(),
      })
      onSubmitted(entry)
      onClose()
    } catch (submitError) {
      setStatus('idle')
      setError(submitError instanceof Error ? submitError.message : '방명록 등록에 실패했습니다.')
    }
  }

  return (
    <Modal
      eyebrow="Guestbook"
      title="방명록 남기기"
      description="이름과 회사명은 공개 시 가려져서 표시됩니다."
      onClose={onClose}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="이름" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="홍길동" />
        </Field>
        <Field label="소속" required>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="LG전자" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="직함" required>
            <Input value={role} onChange={(e) => setRole(e.target.value)} required placeholder="물류혁신팀 책임" />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="평가" required>
            <StarRating value={rating} onChange={setRating} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="메시지"
            required
            hint={`${message.length} / ${MESSAGE_LIMIT}자`}
          >
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_LIMIT))}
              maxLength={MESSAGE_LIMIT}
              required
              placeholder="TDL Lab 방문 소감을 남겨주세요."
            />
          </Field>
        </div>

        {(name || company) && (
          <div className="sm:col-span-2 border border-warm-300/50 bg-cream px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-warm-600">공개 표시 미리보기</p>
            <p className="mt-1.5 text-sm text-warm-800">
              {maskName(name) || '—'}
              {role && <span className="ml-2 text-warm-600">{role}</span>}
              <span className="ml-2 font-mono text-[11px] text-warm-600">{maskCompany(company)}</span>
            </p>
          </div>
        )}

        {error && (
          <p className="sm:col-span-2 border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>
        )}

        <div className="sm:col-span-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? '등록 중…' : '방명록 남기기'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
