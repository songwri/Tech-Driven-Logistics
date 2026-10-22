import { isConfirmed, type VisitRequest } from '@/lib/visit'

/** 방문 완료 시 방문자에게 보내는 만족도 · 개선 의견(방명록) 요청 메일의 결과 (서버 응답) */
export interface FeedbackMailResult {
  sent: number
  failed: number
  /** 보내지 않은 이유 */
  reason?: 'already' | 'noConsent' | 'before' | 'future' | 'noRecipients' | 'quota' | 'error'
}

/** 상태 변경 결과: 방문 완료로 바뀌었을 때 후기 요청 메일 처리 결과 (demo 는 실제 발송 없이 흉내 낸 것) */
export interface StatusOutcome {
  mail: FeedbackMailResult
  demo: boolean
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 메일을 받을 방문자 수 (이메일이 올바른 사람, 같은 주소는 한 번) */
export function feedbackRecipientCount(request: Pick<VisitRequest, 'visitors'>) {
  return new Set(request.visitors.map((visitor) => visitor.email.trim().toLowerCase()).filter((email) => EMAIL.test(email))).size
}

/** 데모 화면용: 서버 없이 같은 규칙으로 결과를 흉내 낸다 (실제 메일은 보내지 않는다). */
export function simulateFeedbackMail(request: VisitRequest, today: string): FeedbackMailResult {
  if (request.feedbackMailAt) return { sent: 0, failed: 0, reason: 'already' }
  if (request.source === 'manual') return { sent: 0, failed: 0, reason: 'noConsent' }
  if (request.date > today) return { sent: 0, failed: 0, reason: 'future' }
  const count = feedbackRecipientCount(request)
  return count === 0 ? { sent: 0, failed: 0, reason: 'noRecipients' } : { sent: count, failed: 0 }
}

/** 상태 변경 뒤 관리자에게 보여 줄 안내 문구 (없으면 null) */
export function feedbackMailMessage(result: FeedbackMailResult | null | undefined, demo = false): string | null {
  if (!result) return null
  if (result.sent > 0) {
    return `${demo ? '(데모) ' : ''}방문자 ${result.sent}명에게 만족도 · 개선 의견(방명록) 요청 메일을 ${demo ? '보낸 것으로 표시했습니다.' : '보냈습니다.'}${
      result.failed > 0 ? ` ${result.failed}명은 발송에 실패했습니다.` : ''
    }`
  }
  switch (result.reason) {
    case 'already':
      return '이미 만족도 요청 메일을 보낸 예약입니다.'
    case 'noConsent':
      return '수기 등록 예약이라(개인정보 동의 기록 없음) 만족도 요청 메일은 보내지 않았습니다.'
    case 'before':
      return '개인정보 동의 문구에 이 용도를 넣기 전에 신청한 예약이라 만족도 요청 메일은 보내지 않았습니다.'
    case 'future':
      return '방문일이 아직 지나지 않아 만족도 요청 메일은 보내지 않았습니다.'
    case 'noRecipients':
      return '방문자 이메일이 없어 만족도 요청 메일은 보내지 않았습니다.'
    case 'quota':
      return '오늘 메일 발송 한도가 부족해 만족도 요청 메일을 보내지 못했습니다.'
    case 'error':
      return '만족도 요청 메일을 보내는 중 오류가 났습니다. 완료 처리는 되었습니다.'
    default:
      return result.failed > 0 ? `만족도 요청 메일 ${result.failed}건 발송에 실패했습니다.` : null
  }
}

/** 방문 완료로 바뀌는 순간인지 */
export const becomesCompleted = (before: VisitRequest, nextStatus: VisitRequest['status']) =>
  nextStatus === 'completed' && before.status !== 'completed' && isConfirmed(nextStatus)
