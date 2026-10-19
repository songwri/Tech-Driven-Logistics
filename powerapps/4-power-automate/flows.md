# Power Automate 흐름 4개

웹 버전의 Google Apps Script 메일 발송(`apps-script/Code.gs`)을 대신합니다.
모두 **표준 커넥터**(Power Apps · SharePoint · Office 365 Outlook · Microsoft Forms)만 써서 M365 기본 라이선스로 돌아갑니다.

| 흐름 | 언제 | 하는 일 |
| --- | --- | --- |
| A. `TDLVisitSubmitted` | 앱에서 [신청하기] | 신청자에게 접수 메일 + Forms 링크, (입력했다면) 참석자에게 링크, 센터 관리자에게 알림 |
| B. `TDLAttendeeCollect` **[PA 전용]** | 참석자가 Forms 제출 | 응답을 `VisitAttendees` 에 저장, 신청 건의 제출 인원(`AttendeeCount`) 갱신 |
| C. `TDLVisitDecision` | 관리자가 승인 · 거절 · 취소 (미리보기 창에서 [보내기]) | 신청자(와 제출한 참석자)에게 결과 메일. 승인 메일에는 센터별 오시는 길(약도) 포함 |
| D. `TDLRetention` **[PA 전용]** | 매월 1일 | 방문일 1년 지난 참석자 개인정보 삭제 |

> **[PA 전용]** = 웹(Apps Script)에는 없는 흐름. 고칠 때 `README.md` 14절 목록도 함께 고치세요.

> **흐름 이름을 표와 똑같이** 지으세요. 앱 수식이 `TDLVisitSubmitted.Run(...)` 처럼 이름으로 부릅니다.
> 흐름을 앱에 연결하는 방법은 가이드 7단계에 있습니다.

표기 약속: `[동적 콘텐츠: 이름]` = 입력칸을 누르면 뜨는 '동적 콘텐츠' 목록에서 고르기,
`[식: ...]` = 같은 목록의 '식(fx)' 탭에 그대로 붙여넣기.

---

## 흐름 A. TDLVisitSubmitted (신청 접수)

**만들기**: [make.powerautomate.com](https://make.powerautomate.com) → **만들기** → **인스턴트 클라우드 흐름** → 이름 `TDLVisitSubmitted`,
트리거 **Power Apps (V2)** → 만들기

1. **트리거 Power Apps (V2)** → `+ 입력 추가`
   - **숫자** → 이름 `RequestId`
   - **텍스트** → 이름 `AttendeeEmails`
   - 두 입력 모두 필수(기본값)로 둡니다. 앱이 참석자 메일이 없으면 `-` 를 보냅니다.

2. **+ 새 단계 → SharePoint `항목 가져오기`** (이름을 `신청건` 으로 바꾸기: 단계 `...` → 이름 바꾸기)
   - 사이트 주소: 목록을 만든 사이트 · 목록 이름: `VisitRequests`
   - ID: `[동적 콘텐츠: RequestId]`

3. **Office 365 Outlook `메일 보내기 (V2)`** — 신청자에게 접수 안내
   - 받는 사람: `[동적 콘텐츠: 신청건 > HostEmail]`
   - 제목: `[TDL 방문 신청 접수] ` + `Company` + ` · ` + `DateKey` + ` ` + `ScheduleText`
   - 본문: 오른쪽 `</>`(코드 보기)를 눌러 `mail-templates.md` 의 **A-1** 을 붙여넣고, `{{…}}` 자리를 동적 콘텐츠로 바꿉니다.
   - 고급 옵션 → **보낸 사람(다음 계정으로 보내기)** 을 공용 메일함으로 하려면 그 메일함의 '대신 보내기' 권한이 필요합니다. 없으면 비워 두세요(흐름 만든 사람 이름으로 나갑니다).

4. **조건** — 참석자 메일을 입력했는지
   - `[동적 콘텐츠: AttendeeEmails]` **같지 않음** `-`
   - **예** 쪽:
     1. **컨트롤 `각각에 적용`** → 이전 단계 출력: `[식: split(triggerBody()?['text'], ';')]`
        (입력 이름이 `text` 가 아니면: 식 입력창에서 `triggerBody()?[` 까지 친 뒤 목록에서 `AttendeeEmails` 를 고르세요)
     2. 그 안에 **조건**: `[식: trim(item())]` **같지 않음** (비워 두기)
     3. 예 쪽에 **메일 보내기 (V2)**
        - 받는 사람: `[식: trim(item())]`
        - 제목: `[LX판토스] 센터 방문 참석자 정보 입력 요청`
        - 본문: `mail-templates.md` 의 **A-2**
   - **아니요** 쪽: 비워 둡니다.

5. **SharePoint `항목 가져오기(복수)`** (이름 `관리자목록`) — 목록 `TourAdmins`

6. **데이터 작업 `배열 필터링`** (이름 `해당관리자`)
   - 보낸 사람: `[동적 콘텐츠: 관리자목록 > value]`
   - **고급 모드에서 편집** 을 누르고 붙여넣기:
     ```
     @or(and(equals(item()?['Site'], 'main'), equals(body('신청건')?['ForMain'], 'Y')), and(equals(item()?['Site'], 'mtv'), equals(body('신청건')?['ForMtv'], 'Y')))
     ```
     (단계 이름을 다르게 지었다면 `'신청건'` 을 그 이름으로, 띄어쓰기는 `_` 로 바꿉니다)

7. **데이터 작업 `선택`** (이름 `관리자메일`)
   - 보낸 사람: `[동적 콘텐츠: 해당관리자 > 본문]`
   - 매핑 오른쪽 아이콘으로 **텍스트 모드** 전환 → `[식: item()?['Title']]`

8. **메일 보내기 (V2)** — 센터 관리자에게
   - 받는 사람: `[식: join(body('관리자메일'), ';')]`
   - 제목: `[TDL 방문 요청] ` + `Company` + ` · ` + `DateKey` + ` · ` + `TourName`
   - 본문: **A-3** (앱 링크 `{{앱주소}}?requestNo={{Title}}` 를 누르면 관리자 화면에서 그 건이 바로 열립니다.
     앱 주소는 make.powerapps.com → 앱 `...` → **세부 정보** → **웹 링크**)

9. **저장** → 오른쪽 위 **테스트**는 앱에서 신청 1건을 넣어 확인하는 게 가장 쉽습니다.

---

## 흐름 B. TDLAttendeeCollect (참석자 응답 모으기)

**만들기**: **자동화된 클라우드 흐름** → 이름 `TDLAttendeeCollect` → 트리거 **Microsoft Forms `새 응답이 제출되는 경우`**

1. 트리거: 양식 ID = `TDL 센터 방문 · 참석자 정보 입력`
   - 트리거 `...` → **설정** → **동시성 제어 켜기, 병렬 처리 수준 1** (여러 명이 동시에 내도 인원 수가 꼬이지 않게)

2. **Microsoft Forms `응답 세부 정보 가져오기`** (이름 `응답`)
   - 양식 ID: 같은 양식 · 응답 ID: `[동적 콘텐츠: 응답 ID]`

3. **SharePoint `항목 가져오기(복수)`** (이름 `신청찾기`)
   - 목록 `VisitRequests` · 고급 옵션 → 필터 쿼리:
     `Title eq '` + `[식: trim(신청번호 답변)]` + `'`
     (식 입력창에 `trim(` 을 치고 동적 콘텐츠에서 '신청번호 (수정하지 마세요)' 를 고른 뒤 `)` 로 닫기)
   - 상위 개수: `1`

4. **조건**: `[식: length(body('신청찾기')?['value'])]` **보다 큼** `0`

   **예** 쪽:
   1. **SharePoint `항목 만들기`** — 목록 `VisitAttendees`
      | 열 | 값 |
      | --- | --- |
      | Title | `[동적 콘텐츠: 성함]` |
      | RequestNo | `[식: first(body('신청찾기')?['value'])?['Title']]` |
      | JobTitle | `[동적 콘텐츠: 직책]` |
      | Org | `[동적 콘텐츠: 회사 · 소속]` |
      | Email | `[동적 콘텐츠: 이메일]` |
      | CarNo | `[동적 콘텐츠: 차량번호]` |
      | Jobs | `[식: replace(replace(replace(string(직무 답변), '[', ''), ']', ''), '"', '')]` (값이 없으면 비어 있음) |
      | ConsentAt | `[식: utcNow()]` |
      | ResponseId | `[동적 콘텐츠: 응답 ID]` |
      | VisitDate | `[식: first(body('신청찾기')?['value'])?['VisitDate']]` |
   2. **SharePoint `항목 가져오기(복수)`** (이름 `제출목록`) — 목록 `VisitAttendees`,
      필터 쿼리 `RequestNo eq '` + `[식: first(body('신청찾기')?['value'])?['Title']]` + `'`
   3. **SharePoint `항목 업데이트`** — 목록 `VisitRequests`
      - ID: `[식: first(body('신청찾기')?['value'])?['ID']]`
      - Title: `[식: first(body('신청찾기')?['value'])?['Title']]` (필수 열이라 다시 넣어 줘야 합니다)
      - AttendeeCount: `[식: length(body('제출목록')?['value'])]`
      - 나머지 칸은 비워 둡니다 (비운 칸은 바뀌지 않습니다).

   **아니요** 쪽 (신청번호가 틀린 응답):
   1. **메일 보내기 (V2)** → 받는 사람: 운영 담당자 주소 ·
      제목 `[TDL] 신청번호를 찾을 수 없는 참석자 응답` ·
      본문 `입력된 신청번호: (신청번호 답변) / Forms 응답 ID: (응답 ID) — Forms 응답 탭에서 확인 후 수동 처리해 주세요.`
      (개인정보가 메일로 퍼지지 않게 이름 · 연락처는 넣지 않습니다)

---

## 흐름 C. TDLVisitDecision (승인 · 거절 · 취소 메일)

**만들기**: 인스턴트 클라우드 흐름 → 이름 `TDLVisitDecision` → 트리거 **Power Apps (V2)**

1. 입력: **숫자** `RequestId`, **텍스트** `Decision`, **텍스트** `Message`
2. **항목 가져오기** (이름 `신청건`) — 목록 `VisitRequests`, ID `RequestId`
3. **[PA 전용] 센터별 오시는 길 만들기** (승인일 때만 쓰지만 앞에 두어도 됩니다). 웹은 `Code.gs` 의 `visitGuideHtml_` 이 하는 일입니다.
   1. **SharePoint `항목 가져오기(복수)`** (이름 `안내목록`) — 목록 `CenterGuides`
   2. **데이터 작업 `배열 필터링`** (이름 `안내Main`) — 보낸 사람 `안내목록 > value`, 고급 모드: `@equals(item()?['Title'], 'main')`
   3. **배열 필터링** (이름 `안내Mtv`) — 같은 방식, `@equals(item()?['Title'], 'mtv')`
   4. **데이터 작업 `작성`** (이름 `블록Main`) — **본문에 `mail-templates.md` 의 `G-1`** 을 붙여넣기
   5. **작성** (이름 `블록Mtv`) — **`G-2`** 붙여넣기
   6. **작성** (이름 `시화먼저`) — 식: `@and(greaterOrEquals(body('신청건')?['MFrom'], 0), or(less(body('신청건')?['CFrom'], 0), less(body('신청건')?['MFrom'], body('신청건')?['CFrom'])), or(less(body('신청건')?['LFrom'], 0), less(body('신청건')?['MFrom'], body('신청건')?['LFrom'])))`
      (오전에 시화MTV 를 먼저 가는 투어는 시화MTV 안내를 위에 적습니다. 웹의 `mtvFirst` 와 같은 규칙)
   7. **작성** (이름 `오시는길`) — 식:
      ```
      @concat(
        if(and(equals(outputs('시화먼저'), true), equals(body('신청건')?['ForMtv'], 'Y')), outputs('블록Mtv'), ''),
        if(equals(body('신청건')?['ForMain'], 'Y'), outputs('블록Main'), ''),
        if(and(equals(outputs('시화먼저'), false), equals(body('신청건')?['ForMtv'], 'Y')), outputs('블록Mtv'), '')
      )
      ```
   - 센터 주소 · 약도 · 주차 안내를 바꿀 때는 **흐름이 아니라 `CenterGuides` 목록의 행만** 고칩니다. 시화MTV 는 행이 비어 있으면 '담당자가 별도로 안내' 문구가 나갑니다.
4. **컨트롤 `전환(Switch)`** — 켜기: `[동적 콘텐츠: Decision]`
   - **사례 `승인`**
     1. 메일 보내기 → 받는 사람 `HostEmail` · 제목 `[방문 확정] ` + `Company` + ` · ` + `DateKey` + ` ` + `ScheduleText` · 본문 **C-1** (`@{outputs('오시는길')}` 자리에 3번 결과)
     2. (권장) **항목 가져오기(복수)** (이름 `참석자`) — `VisitAttendees`, 필터 `RequestNo eq '` + `Title` + `'`
        → **각각에 적용** `[동적 콘텐츠: 참석자 > value]` → 메일 보내기: 받는 사람 `[식: items('각각에_적용')?['Email']]`, 본문 **C-2** (같은 `오시는길`)
   - **사례 `거절`** → 메일 보내기 → `HostEmail` · 제목 `[방문 요청 결과] ` + `Company` · 본문 **C-3** (`Message` 가 사유로 들어감)
   - **사례 `취소`** → 메일 보내기 → `HostEmail` · 제목 `[방문 일정 취소] ` + `Company` · 본문 **C-4**

> **[PA 전용] 미리보기와 같은 글이 나가야 합니다.** 앱 관리자 화면의 `conMail` 미리보기는 C-1 · C-3 · C-4 의 문구를 그대로 글로 옮긴 것입니다.
> 메일 문구를 바꾸면 `scrAdmin.yaml` 의 `txtMailPreview` 수식도 같이 고치세요 (README 14절).

---

## 흐름 D. TDLRetention (보관 기간 정리)

**만들기**: **예약된 클라우드 흐름** → 이름 `TDLRetention` → 반복: **1개월**, 시작 날짜 다음 달 1일 03:00

1. **항목 가져오기(복수)** (이름 `만료`) — 목록 `VisitAttendees`
   - 필터 쿼리: `VisitDate lt '` + `[식: addDays(utcNow(), -365, 'yyyy-MM-dd')]` + `'`
   - 고급 → **페이지 매김 켜기**, 임계값 5000
2. **각각에 적용** `[동적 콘텐츠: 만료 > value]` → **SharePoint `항목 삭제`** — ID `[식: items('각각에_적용')?['ID']]`
3. (선택) 같은 방식으로 `VisitRequests` 의 `HostPhone` 을 비우는 **항목 업데이트** 를 넣으면 신청자 연락처도 1년 뒤 지워집니다.
   통계용 기록(일정 · 업체 · 투어)은 남습니다.

---

## 자주 막히는 곳

- **흐름이 앱에서 안 보임**: 트리거가 반드시 `Power Apps (V2)` 여야 합니다. 앱 편집 화면 왼쪽 **Power Automate** 아이콘 → `흐름 추가` 에서 고릅니다.
- **흐름을 고쳤는데 앱에 반영 안 됨**: 입력(인자)을 바꿨다면 앱에서 흐름을 **제거 후 다시 추가**해야 합니다.
- **`body('신청건')` 오류**: 단계 이름에 띄어쓰기가 있으면 `body('신청_건')` 처럼 `_` 로 씁니다. 단계 이름은 짧은 한 단어로 지으면 편합니다.
- **외부(고객사) 주소로 메일이 안 감**: 회사 Exchange 정책 문제일 수 있습니다. IT 팀에 Power Automate 발신 외부 메일 허용 여부를 문의하세요.
- **흐름 소유자 퇴사 · 이동**: 흐름 `...` → **공유** 로 공동 소유자(팀 계정 · 다른 관리자)를 꼭 추가해 두세요.
- **[PA 전용] 흐름이 멈춘 걸 아무도 모름**: 앱은 흐름 A · C 가 실패하면 노란 경고를 띄우지만, 흐름 B(Forms) · D(보관 정리)는 앱과 상관없이 돕니다.
  흐름마다 맨 끝에 **병렬 분기 → 메일 보내기(운영 담당자)** 를 넣고, 그 단계 `...` → **실행 이후 구성** → `실패함` · `시간 초과됨` 만 체크하면
  실패할 때 바로 메일이 옵니다. 연결(Outlook · SharePoint) 만료도 이 메일로 알 수 있습니다.
