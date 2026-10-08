import { downloadWorkbook, type CellValue, type Sheet } from '@/lib/xlsx'
import { TOUR_BY_ID, toDateKey, type VisitRequest, type VisitStatus } from '@/lib/visit'
import { SYSTEM_COLUMNS, VISIT_SHEET_HEADERS } from './importLegacy'

type Header = (typeof VISIT_SHEET_HEADERS)[number]

/** 열마다 채우는 법과 예시 (양식 파일의 '안내' 시트) */
const GUIDE: Record<Header, [string, string]> = {
  id: ['비워 두세요 (자동)', ''],
  신청일시: ['비워 두세요 (자동)', ''],
  상태: ['대기 / 승인 / 완료 / 거절 / 취소 — 비우면 승인. 거절 · 취소는 통계 제외', '완료'],
  투어: ['종합 투어 / TDL Lab 투어 / 센터 투어 / 기타 방문 — 비우면 기타 방문', '기타 방문'],
  방문일: ['필수. 2026-07-27 형식 (엑셀 날짜 서식도 가능)', '2026-07-27'],
  시간: ['시작-종료. 비우면 시간 미정', '13:00-14:00'],
  방문구분: ['내부 방문 / 고객 방문', '고객 방문'],
  고객구분: ['신규 고객사 / 기존 고객사 — 비우면 고객 · 미분류', '기존 고객사'],
  업체명: ['필수. 업체 또는 방문 조직명', 'ACME'],
  업종: ['쉼표로 구분', '이커머스, 유통'],
  방문목적: ['쉼표로 구분', '투어'],
  담당자: ['신청 · 내부 담당자 성함', '홍길동'],
  담당자직책: ['', '책임'],
  담당자조직: ['', '풀필먼트영업팀'],
  담당자연락처: ['', '010-0000-0000'],
  담당자이메일: ['', 'hong@example.com'],
  담당자의견: ['', ''],
  방문인원: ['숫자. 비우면 미정', '6'],
  방문자명단: ['비워 두세요 (자동)', ''],
  요청사항: ['', ''],
  개인정보동의: ['비워 두세요 (자동)', ''],
  관리자메모: ['', ''],
  토큰: ['비워 두세요 (자동)', ''],
  수정일시: ['비워 두세요 (자동)', ''],
  방문자JSON: ['비워 두세요 (웹 예약의 방문자 명단)', ''],
  투어언어: ['한국어 / 외국어', '외국어'],
  외국어: ['외국어 투어일 때 언어: 영어 / 중국어', '영어'],
  통역동반: ['방문 측 통역 동반: 동반 / 없음 (모든 언어)', '없음'],
  출처: ['비워 두세요 (자동: 수기)', ''],
  주요인원: ['줄바꿈 또는 쉼표로 구분', '김철수 상무'],
  가이드: ['안내한 인원, 줄바꿈으로 구분', '홍길동 책임\n김영희 선임'],
  유관부서: ['쉼표로 구분', '풀필먼트영업팀, SC품질팀'],
  '담당(실)': ['신청 담당자의 담당(실). 통계는 6개 주요 담당 + 기타로 집계', 'CL운영담당'],
  후속진행: ['', 'PoC 논의'],
  통역언어: ['통역 동반일 때 방문객 사용 언어 (선택)', ''],
  실제방문인원: ['단체 방문 등 명단과 다른 실제 인원 (비우면 명단 · 방문인원)', ''],
}

const WIDTHS: Partial<Record<Header, number>> = {
  id: 10,
  신청일시: 12,
  방문일: 12,
  시간: 13,
  업체명: 22,
  방문목적: 16,
  주요인원: 20,
  가이드: 18,
  유관부서: 24,
  후속진행: 22,
}

const system = new Set<string>(SYSTEM_COLUMNS)
const visitColumns = () =>
  VISIT_SHEET_HEADERS.map((header) => ({ header, width: WIDTHS[header] ?? (system.has(header) ? 10 : 12) }))

/** apps-script/Code.gs 의 STATUS_TEXT 와 같아야 합니다 (시트에 적히는 상태 글자). */
const STATUS_TEXT: Record<VisitStatus, string> = {
  pending: '대기',
  approved: '승인',
  completed: '완료',
  rejected: '거절',
  cancelled: '취소',
}

/** 예약 한 건 → visit_requests 탭 한 행 (Code.gs 의 fillVisitRow_ 와 같은 값) */
function toSheetRow(request: VisitRequest): CellValue[] {
  const foreign = request.language === 'foreign'
  const values: Record<Header, CellValue> = {
    id: request.id,
    신청일시: request.createdAt,
    상태: STATUS_TEXT[request.status],
    투어: TOUR_BY_ID[request.tour].label,
    방문일: request.date,
    시간: request.slot,
    방문구분: request.category === 'internal' ? '내부 방문' : '고객 방문',
    고객구분:
      request.category === 'internal' || !request.clientType
        ? ''
        : request.clientType === 'new'
          ? '신규 고객사'
          : '기존 고객사',
    업체명: request.company,
    업종: request.industries.join(', '),
    방문목적: request.purposes.join(', '),
    담당자: request.host.name,
    담당자직책: request.host.title,
    담당자조직: request.host.org,
    담당자연락처: request.host.phone,
    담당자이메일: request.host.email,
    담당자의견: request.hostComment,
    방문인원: request.visitors.length || request.headcount,
    방문자명단: request.visitors.map((v) => `${v.name}(${v.title}, ${v.org})`).join(' / '),
    요청사항: request.note,
    개인정보동의: request.consent ? '동의' : '',
    관리자메모: request.adminMemo,
    토큰: '', // 메일 링크용 비밀값은 내보내지 않는다
    수정일시: '',
    방문자JSON: JSON.stringify(request.visitors),
    투어언어: foreign ? '외국어' : '한국어',
    외국어: foreign ? request.foreignLanguage : '',
    통역동반: request.interpreter ? '동반' : '없음',
    통역언어: request.interpreter ? (request.interpreterLanguage ?? '') : '',
    출처: request.source === 'manual' ? '수기' : '웹',
    주요인원: request.keyPersons ?? '',
    가이드: request.guides ?? '',
    유관부서: (request.departments ?? []).join(', '),
    '담당(실)': request.host.division,
    후속진행: request.followUp ?? '',
    실제방문인원: request.actualHeadcount ?? '',
  }
  return VISIT_SHEET_HEADERS.map((header) => values[header])
}

/**
 * 예약 · 방문 기록을 visit_requests 양식 그대로 내려받는다.
 * 같은 파일을 [기존 이력 가져오기]로 다시 올릴 수 있다 (이미 있는 방문은 건너뜀).
 */
export function downloadVisitRequests(requests: VisitRequest[]) {
  const rows = [...requests]
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
    .map(toSheetRow)
  const stamp = toDateKey(new Date()).replace(/-/g, '')
  downloadWorkbook(`TDL_visit_requests_${stamp}.xlsx`, [{ name: 'visit_requests', columns: visitColumns(), rows }])
}

/** 기존 이력 가져오기 양식: 구글 시트 visit_requests 탭과 같은 열 + 안내 시트 */
export function downloadImportTemplate() {
  const sheets: Sheet[] = [
    {
      name: 'visit_requests',
      columns: visitColumns(),
      rows: [],
    },
    {
      name: '안내',
      columns: [
        { header: '열', width: 14 },
        { header: '채우는 법', width: 62 },
        { header: '예시', width: 26 },
      ],
      rows: [
        ['※ visit_requests 시트의 2행부터 한 줄에 방문 한 건씩 적고, 이 파일을 관리자 페이지의 [기존 이력 가져오기]에 올리세요.', '', ''],
        ['※ 방문일 · 업체명만 있으면 됩니다. 쓰지 않는 열은 비우거나 지워도 됩니다. 구글 시트 visit_requests 탭을 그대로 내려받은 파일도 올릴 수 있습니다.', '', ''],
        ['', '', ''],
        ...VISIT_SHEET_HEADERS.map((header) => [header, ...GUIDE[header]]),
      ],
    },
  ]
  downloadWorkbook('TDL_visit_import_template.xlsx', sheets)
}
