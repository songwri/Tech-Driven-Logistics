import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { CLIENT_TYPE_LABEL, type ClientType } from '@/lib/visit'

type Choice = ClientType | 'none'

const CHOICES: { id: Choice; label: string }[] = [
  { id: 'existing', label: CLIENT_TYPE_LABEL.existing },
  { id: 'new', label: CLIENT_TYPE_LABEL.new },
  { id: 'partner', label: CLIENT_TYPE_LABEL.partner },
  { id: 'none', label: '미분류' },
]

/**
 * 이미 들어와 있는 예약의 고객 구분을 바로 바꾸는 작은 편집기.
 * 전체 수정 화면을 열지 않고 기존 · 신규 · 파트너사 소개 · 미분류를 고르고, 파트너사면 이름을 적는다.
 * 이름 칸은 이미 쓴 파트너사 이름을 제안해 같은 곳이 다르게 적히지 않게 한다.
 */
export function ClientTypeEditor({
  clientType,
  partnerName,
  suggestions,
  pending,
  onSave,
  onCancel,
}: {
  clientType: ClientType | undefined
  partnerName: string
  /** 이미 기록된 파트너사 이름 (많이 쓴 순) */
  suggestions: string[]
  pending: boolean
  onSave: (clientType: ClientType | undefined, partnerName: string) => void
  onCancel: () => void
}) {
  const [choice, setChoice] = useState<Choice>(clientType ?? 'none')
  const [name, setName] = useState(partnerName)
  const needsName = choice === 'partner'
  const missingName = needsName && !name.trim()

  return (
    <div className="space-y-3 border border-warm-300/60 bg-cream/40 p-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-warm-600">고객 구분 변경</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="고객 구분">
        {CHOICES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={choice === item.id}
            onClick={() => setChoice(item.id)}
            className={cn(
              'border px-3 py-1.5 text-[13px] font-semibold transition',
              choice === item.id ? 'border-warm-800 bg-warm-800 text-white' : 'border-warm-300/60 bg-white text-warm-600 hover:border-warm-800 hover:text-warm-800',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {needsName && (
        <div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="tdl-partner-name-options"
            placeholder="소개한 파트너사명"
            maxLength={40}
            aria-label="파트너사명"
            invalid={missingName}
          />
          <datalist id="tdl-partner-name-options">
            {suggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <p className={cn('mt-1 text-[12px]', missingName ? 'text-brand' : 'text-warm-600')}>
            {missingName ? '파트너사명을 입력해 주세요.' : '이미 쓴 이름은 입력하면 제안됩니다. 같은 파트너사는 같은 이름으로 적어 주세요.'}
          </p>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={pending}>
          취소
        </Button>
        <Button
          size="sm"
          disabled={pending || missingName}
          onClick={() => onSave(choice === 'none' ? undefined : choice, choice === 'partner' ? name.trim().replace(/,/g, ' ') : '')}
        >
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  )
}
