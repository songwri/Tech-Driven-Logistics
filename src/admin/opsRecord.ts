import type { VisitRequest } from '@/lib/visit'

export const splitComma = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** 운영 기록: 방문 전후로 관리자가 남기는 정보 (웹 예약 · 수기 등록 공통) */
export interface OpsValue {
  /** 실제 방문 인원 (비우면 명단 인원) */
  actualHeadcount: string
  keyPersons: string
  guides: string
  departments: string
  followUp: string
}

export const opsFromRequest = (request: Partial<VisitRequest>): OpsValue => ({
  actualHeadcount: request.actualHeadcount != null ? String(request.actualHeadcount) : '',
  keyPersons: request.keyPersons ?? '',
  guides: request.guides ?? '',
  departments: (request.departments ?? []).join(', '),
  followUp: request.followUp ?? '',
})

export const opsToRequest = (ops: OpsValue) => ({
  actualHeadcount: ops.actualHeadcount.trim() === '' ? undefined : Number(ops.actualHeadcount),
  keyPersons: ops.keyPersons.trim(),
  guides: ops.guides.trim(),
  departments: splitComma(ops.departments),
  followUp: ops.followUp.trim(),
})
