# 개발자 버전(TDL_VISITOR 1.0.0.1) 업데이트 — 수정 요청서 반영본

개발자가 보내 준 솔루션 `TDL_VISITOR_1_0_0_1` (앱 저장 10/18, 화면 7개 · 흐름 4개)를 **그 구조 그대로** 두고
수정 요청서(34건 + 기능 추가)를 반영한 소스입니다. 컨트롤 이름 · 이름 붙인 수식 · 데이터 규칙은 개발자 방식을 유지했습니다.

| 파일 | 내용 |
| --- | --- |
| `Src/App.pa.yaml` | App 의 Formulas · OnStart · StartScreen (개발자 원본에서 바뀐 부분만 고침) |
| `Src/scrBook · scrDone · scrMy · scrAdmin · scrCalendar · scrStats · scrData .pa.yaml` | 기존 화면 7개 수정본 |
| `Src/scrGuest · scrGuestAdmin · scrGuides .pa.yaml` | 새 화면 3개 (방명록 · 방명록 관리 · 가이드 배정) |

> 공개 저장소라 회사 주소(SharePoint 사이트 · Forms 링크)는 자리표시로 바꿔 두었습니다. `FormsPrefillUrl` 은 개발자 앱의 실제 값을 그대로 두고, `GuestbookListUrl` 은 실제 Guestbook 목록 주소로 바꿔 주세요.

각 파일 맨 위 `#` 주석에 그 화면에서 **바뀐 곳**과 `[PA 전용]` 목록이 있습니다.

---

## 1. 적용 순서

1. **백업**: 지금 앱을 솔루션째 내보내 두거나 '다른 이름으로 저장'.
2. **설정 → 표시**: '화면에 맞게 크기 조정' 끄기, '가로 세로 비율 잠금' 끄기.
   본문은 1366 폭 그대로 두고, 창이 낮으면 본문만 스크롤합니다 (글자가 줄어들지 않음).
3. **SharePoint** (지금 앱이 쓰는 같은 사이트)
   - `VisitRequests` 열 추가: `PartnerName`(한 줄 텍스트), `Guides`(여러 줄 텍스트), `FeedbackMailAt`(날짜 및 시간)
   - 새 목록: `Guestbook` · `GuestbookPublic` · `GuideRoster` — `../1-sharepoint/` 의 CSV 로 만들고 권한은 `../README.md` 3-4절
     (`Guestbook` 은 관리자만, `GuestbookPublic` 은 전 직원 읽기, `GuideRoster` 는 실제 명단이라 행을 지우지 않음)
   - `TourAdmins`: 데이터 관리 화면을 쓸 사람을 `Title = 메일(소문자)`, `Site = data` 행으로 추가
     (지금 App.Formulas 의 varIsDataAdmin 에 적힌 메일 주소를 이 행으로 옮겨 주세요)
4. **데이터 추가**: `Guestbook`, `GuestbookPublic`, `GuideRoster` 연결. 흐름 `TDLGuestbookAdd`(아래 3절)를 만든 뒤 앱에 추가.
5. **App**: 트리 뷰 App → `Formulas` · `OnStart` 를 `Src/App.pa.yaml` 의 값으로 바꿈 (StartScreen 은 그대로).
   업종 · 고객 유형 · 디자인 색 · 화면 크기(sw · sh · ox) · 방명록 / 가이드 배정 값이 들어 있습니다.
6. **기존 화면 7개 교체**: 컨트롤 이름이 앱 전체에서 겹치면 안 되므로, 화면마다 **옛 화면을 지운 뒤** 새 YAML 을 붙여넣습니다.
   (트리 뷰 빈 곳 오른쪽 클릭 → 붙여넣기, 또는 화면 추가 후 코드 붙여넣기). 순서: scrDone → scrMy → scrCalendar → scrStats → scrData → scrAdmin → scrBook
7. **새 화면 3개 붙여넣기**: scrGuest → scrGuestAdmin → scrGuides. 화면 순서는 개발자 원본 뒤에.
8. **흐름**: 3절대로 고치고 새로 만듦.
9. App → `...` → **OnStart 실행** 후 4절 테스트.

> 붙여넣을 때 컨트롤 버전 오류가 나면: 개발자 앱에 이미 있는 버전(`Label@2.5.1`, `Classic/Button@2.2.0`, `Gallery@2.15.0` 등)을 그대로 썼고,
> 새로 쓰는 것은 **컨테이너 `GroupContainer@1.3.0`**(본문 스크롤 · 창)과 **타이머 `Timer@2.1.0`**(방명록 띠) 두 가지입니다.
> 버전이 다르면 같은 컨트롤을 하나 직접 넣어 '코드 보기'로 번호를 확인하고 바꿔 주세요.

---

## 2. 요청서 항목별 반영 위치

| No | 반영 | 위치 |
| --- | --- | --- |
| C-1 · C-2 · C-9 | 짙은 머리말 + 빨간 띠, 탭 메뉴. 임직원 메뉴 3개(방문 신청 · 내 신청 · 방명록) + 오른쪽 관리자 묶음(예약 관리 · 달력 · 통계 · 가이드 배정 · 방명록 관리 · 데이터 관리) | 모든 화면 `hdrBar? · nav*? · hdrAdmZone? · hdrAdmLabel?` (? = 화면 약자 Bk · Dn · My · Ad · Cl · St · Da · Gb · Ga · Gd) |
| C-3 | 오른쪽 위 '이름 · 부서' 한 줄, 길면 … | `hdrUser?` = OnStart `gMeShort` |
| C-4 · C-6 · C-7 | 브랜드 빨강 주 버튼, 웹과 같은 글자 · 바탕색, 상태 배지(대기 주황 · 승인 초록 · 완료 파랑 · 거절/취소 회색) | App.Formulas 2번 디자인 토큰 · `StatusStyle` |
| C-5 | 카드 · 버튼 · 입력칸 각지게, 상태 배지만 2 | 모든 화면 Radius |
| C-8 | 이름의 괄호 영문명 · /부서를 떼고 한 줄 | `txtHostName`(기본값 `gMeName`) · `myr1V` · `lblAdmSub` · `ar3V` · 달력 오른쪽 목록 |
| B-1 · B-2 | 선택일 빨강, 선택 카드 빨간 테두리 + 옅은 빨강, 선택됨 배지 초록 | scrBook `recCell` · `recTour` · `lblTourName` · `recSlot` · `tagSlot` |
| B-3 (F-07) | 예약 가능한 날 강조, 범례, 'n월 예약 가능 n일' | scrBook `recCell` · `lblLegOk` · `lblMonthAvail` |
| B-4 (F-08) | 여러 날짜 동시 신청 경고 | scrBook `lblMultiWarn` |
| F-01 | 업종 9종 + 기타(직접 입력 칸 삭제) | App `Industries` · `IndustryLegacy`, scrBook `galIndustry` (`txtIndOther` · `lblIndOther` 삭제) |
| F-02 | 고객 유형 3택 + 파트너사명(필수) | scrBook `btnClientPartner` · `txtPartner` (저장 `PartnerName`), 내 신청 `myr2V`, 관리자 `ar5V` |
| A-1 | 승인 버튼 초록 | scrAdmin `btnApprove` |
| A-2 | 승인 · 거절 · 일정 취소 · 방문 완료 → 메일 미리보기 창에서 [보내기], 거절 · 취소 사유 필수 | scrAdmin `conMail` (거절 사유 → AdminMemo, 취소 사유 → CancelReason, 승인 안내 → AdminMemo) |
| A-3 | 목록 둘째 줄 한 줄 '이름 직책 · 참석자 3/5' | scrAdmin `lblAdmSub` |
| A-4 | 참석자 표 머리글 선명하게, '구분' → '비고'(추가 인원 표시) | scrAdmin `th0~th6` |
| F-06 | [방문 완료] → 후기(방명록) 요청 메일 | scrAdmin `btnComplete` (상태 완료 저장) + 흐름 C 사례 완료 (3절) |
| F-03 | 고객 구분 빠른 변경, 통계 파트너사별 실적 | scrAdmin `btnOpenClient` · `conClient`, scrStats `galPartner` |
| F-04 | 관리자 정보 수정 · 수기 등록 (당일 · 익일 · 지난 날짜 허용, 승인 건은 달력 자리 이동 · 겹치면 저장 안 함) | scrAdmin `btnOpenEdit` · `btnOpenManual` · `conEdit` |
| K-1 · K-4 | 칩 바탕 = 상태 · 왼쪽 띠 = 투어 색, '대기 n' 배지 (개발자 구현 유지, 색만 웹과 같게), 운영 안 하는 날 옅은 바탕 | scrCalendar `galCalMonth`(Op) · `recDay` |
| K-2 | 약칭 센터 · Lab · 센터+Lab | App `Tours.Short`, 막기 칩 |
| K-3 | 오늘 = 빨간 원, 선택 칸 = 빨간 테두리 | scrCalendar `btnDayNo` (예전 `lblDayNo`) · `recDay` |
| T-1 | 탭 없이 한 화면 세로 스크롤 | scrStats (`btnTab1~3` · `gStatTab` 삭제) |
| T-2 | 막대 값 큰 순 · 1위만 강조 · 비율(%) | scrStats 모든 막대 갤러리 |
| T-3 · T-4 | 방문 유형 한 체계(고객 · 기존 / 신규 / 파트너사 · 내부 · 미분류), 업종 9종 + 기타(예전 값 변환 · 0건 숨김) | scrStats `galType` · `galInd` |
| N-1 · N-2 · N-3 | 방명록 · 방명록 관리 · 외부 방문객 Forms | 새 화면 `scrGuest` · `scrGuestAdmin`, `../2-forms/guestbook-form.md` |
| F-05 | 가이드 배정 · 주간 배정표 · 월간 / 연간 M/M | 새 화면 `scrGuides` |

---

## 3. 흐름 (개발자 흐름 4개 기준)

개발자 흐름은 **목록 항목이 바뀌면 흐름이 메일을 보내는 방식**(VisitDecision 이 Status 를 보고, MailedStatus 로 중복 발송 방지)입니다.
앱도 이 방식 그대로 상태 · 사유만 저장합니다.

| 흐름 | 변경 |
| --- | --- |
| TDLVisitSubmitted | 트리거 설정 → 트리거 조건 추가 `@not(startsWith(triggerOutputs()?['body/Title'], 'M'))` — 관리자 **수기 등록**(신청번호 M…)은 접수 메일을 보내지 않음 |
| TDLVisitDecision | ① 트리거 조건의 `or(...)` 에 `equals(triggerOutputs()?['body/field_17'], '완료')` 추가 ② Switch 에 사례 **완료** 추가 (아래) ③ 마지막 Update_item(MailedStatus) 은 그대로 |
| TDLRetention | 등록 1년 지난 `Guestbook` 항목 삭제 추가 (`../4-power-automate/flows.md` D) |
| TDLAttendeeCollect | 변경 없음 |
| TDLGuestbookAdd (신규) | 앱 방명록 등록 → Guestbook 저장. 입력 순서 Name · Company · Team · Role · Rating(숫자) · Tour · Message (회사 · 팀 · 직책은 비면 앱이 `-` 를 보냄 → 빈 칸으로 저장). `flows.md` E |
| TDLGuestbookForms (신규) | 외부 방문객 방명록 Forms → Guestbook. `flows.md` F |
| TDLGuestbookPublish (신규) | Guestbook 새 행 → 가명 처리 → GuestbookPublic. `flows.md` G |

**사례 '완료' (방문 후 방명록 요청 메일, F-06)** — 웹 `sendFeedbackMail_` 와 같은 조건
1. 조건: `FeedbackMailAt` 비어 있음 **그리고** `ConsentAt` 이 2026-10-22 이후 (동의 문구에 이 용도를 넣은 날) **그리고** 방문일이 오늘 이전
2. `항목 가져오기` VisitAttendees: `RequestNo eq '신청번호'` (Status 가 미매칭인 행 제외) → 이메일 형식이 맞는 주소만, 같은 주소는 1번
3. 한 사람씩 메일: 한국어 투어는 `../4-power-automate/mail-templates.md` F-1, 외국어 투어는 F-2 (영문 위 · 한국어 아래), 방명록 Forms 링크에 투어 · 신청번호 미리 채움
4. 한 명이라도 보냈으면 `FeedbackMailAt` = 지금 (같은 예약에 다시 보내지 않음). 실패해도 상태 '완료' 는 유지

---

## 4. 테스트 (바뀐 곳 위주)

- [ ] 일반 직원: 머리말에 방문 신청 · 내 신청 · 방명록만, 오른쪽 위 '이름 · 부서' 한 줄. 관리자: 오른쪽 관리자 묶음
- [ ] 창을 1366×650 으로 줄여도 글자 크기 그대로, 본문만 스크롤, 신청 화면 [이전] · [다음] 은 아래에 고정
- [ ] 신청: 경고 줄, 가능한 날 빨간 테두리, 'n월 예약 가능 n일', 업종 10칸(기타 입력 칸 없음), [파트너사 소개] → 파트너사명 비우면 [다음] 잠김 → 저장 후 PartnerName 확인
- [ ] 관리자: [승인] → 미리보기 창 → [보내기] → 확정 메일 (흐름) · [거절] 사유 비우면 [보내기] 잠김 · 승인 건 [일정 취소] · 지난 승인 건 [방문 완료] → 참석자에게 방명록 요청 메일 1통
- [ ] 관리자 [정보 수정] 으로 승인 건을 다른 날 · 시간으로 → 신청 달력에서 옛 시간 풀리고 새 시간 마감 · [수기 등록] 으로 지난 '완료' 1건 → 메일 안 감
- [ ] 방문 유형 [변경] → 파트너사 소개 + 이름 → 통계 맨 아래 파트너사별 실적
- [ ] 달력: 오늘 빨간 원, 화 · 목 · 주말 옅은 바탕 · 통계: 탭 없음, 막대 1위만 빨강 + %, 업종 9종 + 기타
- [ ] 방명록 남기기(회사 · 직책 비워도 등록) → 띠에 가명 · 방명록 관리 숨기기 / 다시 표시 / 삭제 · 가이드 배정 저장 → Guides 열
- [ ] 데이터 관리: TourAdmins 에 Site = data 행이 있는 계정만 탭이 보임, 신청 3쪽에 PartnerName · Guides 칸

---

## 5. 개발자 방식에서 그대로 둔 것 · 최적화 · 확인 부탁

**그대로 둔 것**: 컨트롤 이름 규칙(화면 약자 접미사), 이름 붙인 수식(CalDays · SlotRows · SiteReqs · Kpi* 등), 빈 값은 `-`,
일정 막기 종류 `막힘`, 승인된 예약만 TourBusy `예약` 으로 자리 차지, 메일은 흐름이 상태 변경을 보고 보냄(MailedStatus),
담당(실) 드롭다운(DivisionChoices), 참석자 '미매칭' 처리, 새로고침 버튼 · 마지막 갱신 시각, 데이터 관리 화면과 변경 기록(DataAdminLog).
개발자 좌표(X · Y)도 바꾸지 않았습니다 — 본문 스크롤 컨테이너가 화면 맨 위부터 시작하고 머리말이 그 위를 덮는 방식.

**최적화**
- 관리자 상세 영역: 컨트롤 약 40개가 각자 계산하던 표시 조건(`galAdm.AllItems` 를 다시 거르는 식)을 컨테이너 `conAdmDetail` 한 번으로
- 승인 · 거절 · 취소 · 완료를 메일 창 하나(`conMail`)와 저장 식 하나로 모음 (승인 · 거절 저장 식은 개발자 것 그대로 재사용)
- 업종 변환표 `IndustryLegacy` 하나를 통계 · 관리자 수정 창이 같이 씀 (옛 데이터를 고치지 않아도 통계가 새 분류로 맞음)
- 데이터 관리 계정: 수식의 메일 주소 → `TourAdmins` 목록 (사람이 바뀌어도 앱 수정 · 재게시 불필요)
- 통계 탭 상태(`gStatTab`) 제거, 막대 갤러리 계산을 한 식(값순 · 최대 · 합계)으로 통일

**확인 부탁 (회신 필요)**
1. **대기 신청의 시간 점유**: 개발자 버전은 승인된 예약만 시간을 막습니다(대기는 막지 않음). 웹은 대기도 그 시간을 차지합니다(같은 시간 중복 신청 방지). 바꿀지 결정 필요 — 이번 수정에서는 개발자 방식을 유지했습니다.
2. **Studio 붙여넣기**: 이 환경에는 Power Apps 가 없어 YAML 구조 · 괄호 · 컨트롤 이름 중복 · 없는 컨트롤 참조 · Set 하지 않은 변수만 스크립트로 검사했습니다 (문제 0건). 붙여넣기에서 막히는 오류 문구를 알려 주시면 바로 고치겠습니다.
3. **목록 열 이름**: 개발자 목록은 CSV 로 만들어 내부 이름이 `field_N` 입니다. 앱은 표시 이름(PartnerName 등)을 쓰고, 흐름 식에서는 새 열의 내부 이름을 확인해 넣어 주세요.
