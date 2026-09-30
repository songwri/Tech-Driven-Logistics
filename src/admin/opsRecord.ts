import type { VisitRequest } from '@/lib/visit'

export const splitComma = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** 운영 기록: 방문 전후로 관리자가 남기는 정보 (웹 예약 · 수기 등록 공통) */
export interface OpsValue {
  keyPersons: string
  guides: string
  departments: string
  followUp: string
}

export const opsFromRequest = (request: Partial<VisitRequest>): OpsValue => ({
  keyPersons: request.keyPersons ?? '',
  guides: request.guides ?? '',
  departments: (request.departments ?? []).join(', '),
  followUp: request.followUp ?? '',
})

export const opsToRequest = (ops: OpsValue) => ({
  keyPersons: ops.keyPersons.trim(),
  guides: ops.guides.trim(),
  departments: splitComma(ops.departments),
  followUp: ops.followUp.trim(),
})
