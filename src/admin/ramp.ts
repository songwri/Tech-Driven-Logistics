/**
 * 순차(sequential) 파랑 램프 — 값이 클수록 진하게.
 * 가장 옅은 단계도 배경 대비 2:1 이상이 되도록 250 단계부터 씁니다.
 */
export const SEQUENTIAL_RAMP = ['#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281']

/** 0~1 비율 → 램프 색 */
export function rampColor(ratio: number) {
  const clamped = Math.min(1, Math.max(0, ratio))
  return SEQUENTIAL_RAMP[Math.round(clamped * (SEQUENTIAL_RAMP.length - 1))]
}
