# 기존 방문 이력 옮기기 (웹 '엑셀 이력 가져오기' 대신)

웹 관리자의 **엑셀 이력 가져오기**(`src/admin/ImportModal.tsx`)는 Power Apps 앱 안에 만들지 않았습니다.
캔버스 앱은 올린 엑셀 파일을 직접 읽지 못하고, 한 번만 하는 작업이라 SharePoint 목록에 바로 붙여 넣는 편이 빠르고 안전합니다.
한두 건은 앱의 관리자 화면 **[수기 등록]** 으로 넣으면 됩니다.

## 순서

1. 웹 예약 시트(또는 웹 관리자 '엑셀 내려받기' 파일)를 엑셀로 엽니다.
2. 아래 표대로 열 이름을 바꾸고 값을 맞춘 새 시트를 만듭니다. 표에 없는 열은 지웁니다.
3. SharePoint `VisitRequests` 목록 → **그리드 보기에서 편집** → 엑셀에서 복사한 행을 붙여 넣기 (한 번에 수백 행까지 무난)
4. 앱에서 통계 · 가이드 배정 화면을 열어 건수가 맞는지 확인

> 지난 방문만 옮길 때는 `TourBusy`(시간 점유)를 만들 필요가 없습니다. **앞으로 있을 승인 예약**을 옮긴다면,
> 그 건은 앱의 [수기 등록] 으로 넣어야 시간이 막힙니다 (수기 등록이 `TourBusy` 를 같이 만듭니다).

## 열 대응표 (웹 시트 → `VisitRequests`)

| 웹 시트 열 | 목록 열 | 값 바꾸기 |
| --- | --- | --- |
| id | Title | 그대로 (`V…` 신청번호) |
| 상태 | Status | `대기중` → `대기`, `승인됨` → `승인`, `완료` → `완료`, `거절됨` → `거절`, `취소됨` → `취소` |
| 투어 | Tour · TourName | 투어 id 는 `App.Formulas` `Tours` 의 Id (`lab` · `center` · `combined` · `mtv` · `center_mtv` · `all3`), 수기 기록은 `other`. TourName 은 같은 표의 Name |
| 방문일 | VisitDate · DateKey | VisitDate 는 날짜, DateKey 는 `yyyy-mm-dd` 글자 |
| 시간 | Slot · ScheduleText | Slot 은 `10:30-11:30` 형식 (`TourSlots` 의 Slot), ScheduleText 는 `10:30 – 11:30` |
| 방문구분 | Category | `고객 방문` / `내부 방문` |
| 고객구분 | ClientType | `기존 고객사` / `신규 고객사` / `파트너사 소개 고객` / 비움(미분류) |
| 파트너사명 | PartnerName | 그대로 |
| 업체명 | Company | 그대로 |
| 업종 | Industry | 9종 + 기타로 변환: 아래 '업종 변환' |
| 방문목적 | Purpose | 그대로 (`기타: …` 그대로) |
| 담당자 · 담당자직책 · 담당자조직 · 담당(실) | HostName · HostTitle · HostOrg · HostDivision | 그대로 |
| 담당자연락처 · 담당자이메일 | HostPhone · HostEmail · ApplicantEmail | ApplicantEmail 에도 담당자이메일 (내 신청 화면이 이 열로 찾음) |
| 담당자의견 | HostComment | 그대로 |
| 방문인원 | ExpectedHeadcount | 숫자 |
| 실제방문인원 | AttendeeCount | 숫자 (비면 0) |
| 투어언어 · 통역동반 · 통역언어 | Language · Interpreter · InterpreterLanguage | Language 는 `한국어` / `영어` / `중국어`, Interpreter 는 `Y` / `N` |
| 관리자메모 | AdminMemo | 그대로 |
| 가이드 | Guides | 그대로 (줄마다 한 명, `이름 직책 (인솔자)` 형식이 같음) |
| 후기메일발송 | FeedbackMailAt | 값이 있으면 그 날짜 (같은 예약에 다시 보내지 않게) |
| (없음) | ForMain · ForMtv | 투어에 메가와이즈 · Lab 이 들어가면 ForMain=`Y`, 시화MTV 가 들어가면 ForMtv=`Y` |
| (없음) | ApproveMain · ApproveMtv | 상태가 승인 · 완료면 해당 센터 칸을 `승인`, 아니면 `-` |
| (없음) | CFrom ~ MTo | `TourSlots` 의 같은 투어 · 시간 줄 값. 지난 방문만 옮기면 모두 `-1` 로 둬도 통계에는 영향 없음 |

방문자명단 · 방문자JSON · 개인정보동의 · 토큰 · 출처 등 개인정보 · 시스템 열은 옮기지 않습니다.
참석자 개인정보는 Power Apps 에서는 참석자 본인이 Forms 로 다시 입력하는 구조입니다 (지난 방문은 옮기지 않음).

## 업종 변환 (웹 `normalizeIndustry` 와 같음)

| 예전 값 | 바꿀 값 |
| --- | --- |
| 전자 · 가전 | 전자 |
| 자동차 · 오토 | 오토(Auto) |
| 화학 | 화학 |
| 식품 | 식품용품 |
| 화장품 · 의류 | 패션&뷰티 |
| 제약/헬스케어 | 헬스케어 |
| 유통 · 이커머스 · CVS/편의점 | 리테일 |
| 제조 | 기계&금속 |
| 가구/인테리어 | 건자재 |
| 그 밖의 값 (물류 · `기타: 공공` 등) | 기타 |

여러 업종을 쉼표로 적은 예전 기록은 첫 번째만 남깁니다. 앱의 통계는 바꾸지 않은 예전 값도 같은 표(`App.Formulas` `IndustryLegacy`)로 읽으므로,
이미 들어간 행을 다시 고치지 않아도 숫자는 맞게 나옵니다.
