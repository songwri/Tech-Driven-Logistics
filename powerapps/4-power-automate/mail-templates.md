# 메일 본문 템플릿

`메일 보내기 (V2)` 본문 칸 오른쪽 위 **`</>`(코드 보기)** 를 누른 뒤 붙여넣습니다.
`{{이름}}` 자리는 지우고 같은 이름의 **동적 콘텐츠**를 넣으세요. (예: `{{Company}}` → 동적 콘텐츠 `신청건 > Company`)
앱 화면과 같은 단색 · 얇은 테두리 스타일입니다.

---

## A-1. 신청자에게: 접수 + Forms 링크

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#534A47;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 4px">방문 신청이 접수되었습니다</p>
  <p style="color:#736662;margin:0 0 20px">신청번호 {{Title}}</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662;width:110px">방문 기관</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{Company}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662">투어</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{TourName}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662">일정</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{DateKey}} {{ScheduleText}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662">예상 인원</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{ExpectedHeadcount}}명</td></tr>
  </table>
  <p style="margin:24px 0 8px;font-weight:600">참석자 정보 입력을 부탁드립니다</p>
  <p style="margin:0 0 12px">아래 링크를 참석자 분들께 전달해 주세요. 참석자가 직접 정보를 입력하고 개인정보 수집에 동의합니다.</p>
  <p style="margin:0 0 20px"><a href="{{FormsLink}}" style="display:inline-block;background:#A72B2B;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:0">참석자 정보 입력 링크</a></p>
  <p style="font-size:12px;color:#ACA8A7;margin:0">센터 담당자가 확인 후 승인하면 확정 메일을 다시 보내드립니다. 제출 현황은 앱의 [내 신청]에서 볼 수 있습니다.</p>
</div>
```

## A-2. 참석자에게: 정보 입력 요청 (외부 발송)

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#534A47;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 12px">LX판토스 센터 방문 안내</p>
  <p style="margin:0 0 4px">{{HostName}} {{HostTitle}}님이 아래 일정으로 센터 방문을 신청했습니다.</p>
  <p style="margin:0 0 20px;color:#736662">{{TourName}} · {{DateKey}} {{ScheduleText}}</p>
  <p style="margin:0 0 12px">출입 등록을 위해 아래 링크에서 참석자 정보를 입력해 주세요. 1분 정도 걸립니다.</p>
  <p style="margin:0 0 20px"><a href="{{FormsLink}}" style="display:inline-block;background:#A72B2B;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:0">참석자 정보 입력</a></p>
  <p style="font-size:12px;color:#ACA8A7;margin:0">입력하신 정보는 출입 등록과 방문 안내에만 쓰이며 방문일로부터 1년 뒤 삭제됩니다.</p>
</div>
```

## A-3. 센터 관리자에게: 새 요청

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#534A47;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 16px">새 방문 요청</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662;width:110px">방문 기관</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{Company}} ({{Category}} {{ClientType}})</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662">일정</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{TourName}} · {{DateKey}} {{ScheduleText}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662">신청자</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{HostName}} {{HostTitle}} · {{HostDivision}} {{HostOrg}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662">목적 · 언어</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{Purpose}} · {{Language}}</td></tr>
  </table>
  <p style="margin:20px 0 0"><a href="{{앱주소}}?requestNo={{Title}}" style="display:inline-block;background:#A72B2B;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:0">관리자 화면에서 열기</a></p>
</div>
```

## C-1. 신청자에게: 방문 확정 (오시는 길 · 약도 포함)

`{{오시는길}}` 자리는 흐름 C 의 `작성` 단계 `오시는길` 결과(동적 콘텐츠 > 출력)입니다. `{{Message}}` 가 `-` 이면 '담당자 안내' 줄은 지웁니다
(흐름에서는 `if(equals(트리거 Message, '-'), '', ...)` 로 줄 전체를 조건 처리). 도착 시간 `{{도착전}}` 은 `CenterGuides` main 행의 `ArriveBefore`(없으면 10).

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#534A47;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 4px">방문이 확정되었습니다</p>
  <p style="color:#736662;margin:0 0 20px">신청번호 {{Title}}</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662;width:110px">일정</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{TourName}} · {{DateKey}} {{ScheduleText}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662">참석자</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{AttendeeCount}}명 정보 제출 완료 (예상 {{ExpectedHeadcount}}명)</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #E3E0DE;color:#736662">담당자 안내</td><td style="padding:8px 0;border-bottom:1px solid #E3E0DE">{{Message}}</td></tr>
  </table>
  {{오시는길}}
  <div style="margin-top:22px;background:#FAF9F8;border:1px solid #E3E0DE;padding:14px 16px;font-size:13px;color:#534A47;line-height:1.8">
    · 투어 시작 <b>{{도착전}}분 전</b>까지 도착해 주세요.<br>
    · (두 센터를 가는 투어만) 두 센터는 떨어져 있어 오전 투어가 끝나면 오후 투어 장소로 이동해 주셔야 합니다.<br>
    · 문의나 일정 변경 · 취소는 <b>최소 1일 전</b>까지 담당자와 직접 소통해 주세요.
  </div>
  <p style="font-size:12px;color:#ACA8A7;margin:20px 0 0">아직 정보를 내지 않은 참석자가 있다면 방문 전까지 입력 링크로 제출해 주세요.</p>
</div>
```

## C-2. 정보를 제출한 참석자에게: 방문 확정 (오시는 길 포함)

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#534A47;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 12px">LX판토스 센터 방문이 확정되었습니다</p>
  <p style="margin:0 0 4px">{{TourName}}</p>
  <p style="margin:0 0 4px;color:#736662">{{DateKey}} {{ScheduleText}}</p>
  {{오시는길}}
  <p style="font-size:13px;color:#534A47;margin:20px 0 0">투어 시작 {{도착전}}분 전까지 도착해 주세요.</p>
</div>
```

## C-3. 신청자에게: 거절 (취소는 문구만 바꿔 사용)

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#534A47;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 12px">요청하신 일정으로는 방문이 어렵습니다</p>
  <p style="margin:0 0 4px">{{Company}} · {{TourName}} · {{DateKey}} {{ScheduleText}}</p>
  <p style="margin:16px 0 4px;color:#736662">사유</p>
  <p style="margin:0 0 20px">{{Message}}</p>
  <p style="font-size:13px;margin:0">다른 날짜로 다시 신청해 주시거나, 이 메일에 회신해 문의해 주세요.</p>
</div>
```

---

## C-4. 신청자에게: 일정 취소 (흐름 C · 사례 `취소`)

관리자 화면 미리보기(`scrAdmin` `txtMailPreview` 의 '취소')와 같은 문구입니다.

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#534A47;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 12px">방문 일정이 취소되었습니다</p>
  <p style="margin:0 0 4px">{{Company}} · {{TourName}} · {{DateKey}} {{ScheduleText}}</p>
  <p style="margin:16px 0 4px;color:#736662">사유</p>
  <p style="margin:0 0 20px">{{Message}}</p>
  <p style="font-size:13px;margin:0">다시 방문을 원하시면 새로 신청해 주세요.</p>
</div>
```

## G-1. 오시는 길 블록 · 메가와이즈 청라 (흐름 C 의 `블록Main`)

웹 `Code.gs` 의 `megawiseGuideHtml_` 와 같은 내용입니다. `작성` 단계 본문에 그대로 붙여넣습니다 (`@{...}` 는 식이라 그대로 둡니다).
`M` = `first(body('안내Main'))` 입니다. 미팅 장소 줄은 `MeetingTours` 에 그 투어가 들어 있을 때만 나옵니다 (기본: TDL Lab 투어).

```html
<div style="margin-top:26px;font-size:15px;font-weight:700;color:#3d3532;">오시는 길@{if(equals(body('신청건')?['ForMtv'], 'Y'), ' · 메가와이즈 청라', '')}</div>
<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
  <tr><td style="padding:11px 0;width:96px;vertical-align:top;font-size:12px;color:#aca8a7;border-bottom:1px solid #f1efee;">위치</td>
      <td style="padding:11px 0;font-size:14px;color:#3d3532;line-height:1.6;border-bottom:1px solid #f1efee;">@{first(body('안내Main'))?['Address']}<br>
      <a href="@{first(body('안내Main'))?['MapUrl']}" style="color:#a72b2b;font-size:13px;font-weight:700;">네이버 지도에서 보기 →</a></td></tr>
  <tr><td style="padding:11px 0;width:96px;vertical-align:top;font-size:12px;color:#aca8a7;border-bottom:1px solid #f1efee;">주차</td>
      <td style="padding:11px 0;font-size:14px;color:#3d3532;line-height:1.6;border-bottom:1px solid #f1efee;">@{first(body('안내Main'))?['Parking']}</td></tr>
  @{if(contains(string(first(body('안내Main'))?['MeetingTours']), body('신청건')?['Tour']), concat('<tr><td style="padding:11px 0;width:96px;vertical-align:top;font-size:12px;color:#aca8a7;border-bottom:1px solid #f1efee;">미팅 장소</td><td style="padding:11px 0;font-size:14px;color:#3d3532;line-height:1.6;border-bottom:1px solid #f1efee;">', first(body('안내Main'))?['Meeting'], '</td></tr>'), '')}
</table>
<a href="@{first(body('안내Main'))?['MapUrl']}" style="display:block;margin-top:14px;"><img src="@{first(body('안내Main'))?['MapImageUrl']}" alt="주차 위치 안내 지도" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:1px solid #e3e0de;"></a>
```

## G-2. 오시는 길 블록 · 시화MTV (흐름 C 의 `블록Mtv`)

`CenterGuides` 의 `mtv` 행 주소가 비어 있으면 웹과 같이 '담당자가 별도로 안내' 문구만 나갑니다.

```html
<div style="margin-top:26px;font-size:15px;font-weight:700;color:#3d3532;">오시는 길@{if(equals(body('신청건')?['ForMain'], 'Y'), ' · 시화MTV', '')}</div>
@{if(empty(first(body('안내Mtv'))?['Address']),
  '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;"><tr><td style="padding:11px 0;width:96px;font-size:12px;color:#aca8a7;border-bottom:1px solid #f1efee;">위치 · 주차</td><td style="padding:11px 0;font-size:14px;color:#3d3532;border-bottom:1px solid #f1efee;">시화MTV 위치와 주차 안내는 담당자가 별도로 안내드립니다.</td></tr></table>',
  concat('<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;"><tr><td style="padding:11px 0;width:96px;font-size:12px;color:#aca8a7;border-bottom:1px solid #f1efee;">위치</td><td style="padding:11px 0;font-size:14px;color:#3d3532;border-bottom:1px solid #f1efee;">', first(body('안내Mtv'))?['Address'], '</td></tr><tr><td style="padding:11px 0;width:96px;font-size:12px;color:#aca8a7;border-bottom:1px solid #f1efee;">주차</td><td style="padding:11px 0;font-size:14px;color:#3d3532;border-bottom:1px solid #f1efee;">', first(body('안내Mtv'))?['Parking'], '</td></tr></table>'))}
```

## F-1. 방문객에게: 만족도 · 개선 의견(방명록) 요청 — 한국어 투어 (흐름 C · 사례 `완료`)

웹 `Code.gs` 의 `feedbackMailHtml_` 과 같은 문구 · 같은 틀(빨간 머리띠 · 각진 카드)입니다. 버튼 링크 `{{후기링크}}` = 흐름 C 의 `후기링크` 출력.

```html
<div style="margin:0;padding:24px 12px;background:#f3f2f1;font-family:'Malgun Gothic','Apple SD Gothic Neo',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e0de;">
  <div style="background:#a72b2b;padding:20px 28px;">
    <div style="color:#ffffff;font-size:12px;letter-spacing:3px;">TDL LAB</div>
    <div style="color:#ffffff;font-size:19px;font-weight:700;margin-top:6px;">방문해 주셔서 감사합니다</div>
  </div>
  <div style="padding:28px;">
    <p style="margin:0 0 22px;font-size:14px;line-height:1.75;color:#534a47;"><b>{{DateKey}}</b> 투어에 방문해 주셔서 감사합니다.<br>
      이번 방문은 어떠셨나요? 만족하신 점과 더 나아졌으면 하는 점을 남겨 주시면 서비스를 개선하는 데 큰 도움이 됩니다.</p>
    <div style="border:1px solid #e3e0de;border-left:3px solid #a72b2b;background:#faf9f8;padding:16px 18px;margin-bottom:24px;">
      <span style="display:inline-block;padding:4px 12px;font-size:14px;font-weight:700;color:#ffffff;background:#534a47;">{{TourName}}</span>
      <div style="font-size:17px;font-weight:700;color:#3d3532;margin-top:10px;">{{DateKey}} &nbsp;{{ScheduleText}}</div>
    </div>
    <div style="font-size:14px;line-height:1.9;color:#3d3532;margin:0 0 6px;">방명록에서 아래 내용을 남겨 주세요.</div>
    <ul style="margin:0 0 22px;padding-left:18px;font-size:13px;line-height:1.9;color:#534a47;">
      <li>투어 전반에 대한 <b>만족도</b> (별점)</li><li>특히 <b>좋았던 점</b></li><li><b>개선했으면 하는 점</b>이나 바라는 점</li>
    </ul>
    <div style="margin:0 0 18px;"><a href="{{후기링크}}" style="background:#a72b2b;color:#ffffff;border:1px solid #a72b2b;display:inline-block;padding:12px 22px;font-size:13px;font-weight:700;text-decoration:none;">방명록에 후기 남기기</a></div>
    <p style="margin:0;font-size:12px;line-height:1.8;color:#aca8a7;">1분이면 충분합니다. 방명록에는 이름과 소속이 일부만 공개되며, 이 메일은 방문 예약 시 입력하신 이메일로 방문 종료 후 한 번만 발송됩니다.<br>
      본 메일은 <b>발신 전용</b>입니다. 회신하셔도 확인할 수 없으니, 문의는 방문을 담당한 센터 담당자에게 직접 연락해 주세요.</p>
  </div>
  <div style="padding:16px 28px;border-top:1px solid #eeecea;font-size:11px;color:#aca8a7;line-height:1.6;">Tech Driven Logistics · Tech Innovation Team</div>
</div></div>
```

## F-2. 방문객에게: 만족도 요청 — 외국어 투어 (영문 위 · 한국어 아래, 웹과 같음)

F-1 의 머리띠 제목을 `Thank you for visiting`, 본문 첫 단락 · 목록 · 버튼을 아래 영문으로 바꾸고, 그 아래에
`<hr style="border:0;border-top:1px solid #e3e0de;margin:26px 0;">` 를 넣은 뒤 F-1 의 한국어 단락 · 목록 · 버튼(흰 바탕 버튼)을 그대로 붙입니다.

```html
<p style="margin:0 0 22px;font-size:14px;line-height:1.75;color:#534a47;">Dear Visitor,<br>Thank you for visiting us on <b>{{DateKey}}</b>.
  How was your tour? Tell us what you were happy with and what we could do better — it helps us improve.</p>
<div style="font-size:14px;line-height:1.9;color:#3d3532;margin:0 0 6px;">Please share the following in our guestbook.</div>
<ul style="margin:0 0 22px;padding-left:18px;font-size:13px;line-height:1.9;color:#534a47;">
  <li>Your overall <b>satisfaction</b> (star rating)</li><li>What you <b>liked most</b></li><li>What we could <b>improve</b></li>
</ul>
<div style="margin:0 0 18px;"><a href="{{후기링크}}" style="background:#a72b2b;color:#ffffff;border:1px solid #a72b2b;display:inline-block;padding:12px 22px;font-size:13px;font-weight:700;text-decoration:none;">Leave your feedback</a></div>
<p style="margin:0;font-size:12px;line-height:1.8;color:#aca8a7;">It takes about a minute. Only part of your name and company is shown publicly. This email is sent once, after your visit, to the address you gave when booking.<br>
  This is a <b>send-only</b> mailbox, so replies are not monitored. Please contact your host at the center directly with any questions.</p>
```

