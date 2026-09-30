import { downloadWorkbook, type Sheet } from '@/lib/xlsx'
import { SYSTEM_COLUMNS, VISIT_SHEET_HEADERS } from './importLegacy'

/** 열마다 채우는 법과 예시 (양식 파일의 '안내' 시트) */
const GUIDE: Record<(typeof VISIT_SHEET_HEADERS)[number], [string, string]> = {
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
  외국어: ['외국어 투어일 때 언어', '영어'],
  통역동반: ['동반 / 없음', '없음'],
  출처: ['비워 두세요 (자동: 수기)', ''],
  주요인원: ['줄바꿈 또는 쉼표로 구분', '김철수 상무'],
  가이드: ['안내한 인원, 줄바꿈으로 구분', '홍길동 책임\n김영희 선임'],
  유관부서: ['쉼표로 구분', '풀필먼트영업팀, SC품질팀'],
  후속진행: ['', 'PoC 논의'],
}

const WIDTHS: Partial<Record<(typeof VISIT_SHEET_HEADERS)[number], number>> = {
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

/** 기존 이력 가져오기 양식: 구글 시트 visit_requests 탭과 같은 열 + 안내 시트 */
export function downloadImportTemplate() {
  const system = new Set<string>(SYSTEM_COLUMNS)
  const sheets: Sheet[] = [
    {
      name: 'visit_requests',
      columns: VISIT_SHEET_HEADERS.map((header) => ({ header, width: WIDTHS[header] ?? (system.has(header) ? 10 : 12) })),
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
