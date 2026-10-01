/**
 * 순차(sequential) 슬레이트 램프 — 값이 클수록 진하게.
 * 브랜드 빨강과 상태 색을 피해 한 계열(남색 회색)로만 쓴다.
 * 가장 옅은 단계도 흰 배경 대비 2:1 이상이 되도록 고른다.
 */
export const SEQUENTIAL_RAMP = ['#a3adbf', '#8e99ae', '#7a869d', '#67748c', '#56627b', '#47536b', '#3b4a6b', '#30405f', '#263552']

/** 0~1 비율 → 램프 색 */
export function rampColor(ratio: number) {
  const clamped = Math.min(1, Math.max(0, ratio))
  return SEQUENTIAL_RAMP[Math.round(clamped * (SEQUENTIAL_RAMP.length - 1))]
}
