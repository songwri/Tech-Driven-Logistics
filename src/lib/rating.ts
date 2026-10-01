/** 방명록 별점: 5점 만점, 0.5점 단위 (10단계). 서버(Code.gs addGuestbook_)의 검사와 같아야 한다. */
export const RATING_MIN = 0.5
export const RATING_MAX = 5
export const RATING_STEP = 0.5

/** 0.5 단위로 맞추고 0.5 ~ 5 범위로 자른다. */
export function snapRating(value: number) {
  const snapped = Math.round(value / RATING_STEP) * RATING_STEP
  return Math.min(RATING_MAX, Math.max(RATING_MIN, snapped))
}

/** 4.5 · 5.0 처럼 소수 한 자리로 표시한다. */
export function formatRating(value: number) {
  return value.toFixed(1)
}

/** 입력하는 사람에게 점수의 의미를 알려주는 짧은 말 */
export function ratingLabel(value: number) {
  if (value <= 1.5) return '아쉬웠어요'
  if (value <= 3) return '보통이에요'
  if (value <= 4) return '좋았어요'
  return '아주 만족해요'
}
