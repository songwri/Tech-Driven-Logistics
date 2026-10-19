# 메일 본문 템플릿

`메일 보내기 (V2)` 본문 칸 오른쪽 위 **`</>`(코드 보기)** 를 누른 뒤 붙여넣습니다.
`{{이름}}` 자리는 지우고 같은 이름의 **동적 콘텐츠**를 넣으세요. (예: `{{Company}}` → 동적 콘텐츠 `신청건 > Company`)
앱 화면과 같은 단색 · 얇은 테두리 스타일입니다.

---

## A-1. 신청자에게: 접수 + Forms 링크

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#2F3437;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 4px">방문 신청이 접수되었습니다</p>
  <p style="color:#787774;margin:0 0 20px">신청번호 {{Title}}</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774;width:110px">방문 기관</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{Company}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774">투어</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{TourName}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774">일정</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{DateKey}} {{ScheduleText}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774">예상 인원</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{ExpectedHeadcount}}명</td></tr>
  </table>
  <p style="margin:24px 0 8px;font-weight:600">참석자 정보 입력을 부탁드립니다</p>
  <p style="margin:0 0 12px">아래 링크를 참석자 분들께 전달해 주세요. 참석자가 직접 정보를 입력하고 개인정보 수집에 동의합니다.</p>
  <p style="margin:0 0 20px"><a href="{{FormsLink}}" style="display:inline-block;background:#111111;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:6px">참석자 정보 입력 링크</a></p>
  <p style="font-size:12px;color:#A3A29E;margin:0">센터 담당자가 확인 후 승인하면 확정 메일을 다시 보내드립니다. 제출 현황은 앱의 [내 신청]에서 볼 수 있습니다.</p>
</div>
```

## A-2. 참석자에게: 정보 입력 요청 (외부 발송)

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#2F3437;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 12px">LX판토스 센터 방문 안내</p>
  <p style="margin:0 0 4px">{{HostName}} {{HostTitle}}님이 아래 일정으로 센터 방문을 신청했습니다.</p>
  <p style="margin:0 0 20px;color:#787774">{{TourName}} · {{DateKey}} {{ScheduleText}}</p>
  <p style="margin:0 0 12px">출입 등록을 위해 아래 링크에서 참석자 정보를 입력해 주세요. 1분 정도 걸립니다.</p>
  <p style="margin:0 0 20px"><a href="{{FormsLink}}" style="display:inline-block;background:#111111;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:6px">참석자 정보 입력</a></p>
  <p style="font-size:12px;color:#A3A29E;margin:0">입력하신 정보는 출입 등록과 방문 안내에만 쓰이며 방문일로부터 1년 뒤 삭제됩니다.</p>
</div>
```

## A-3. 센터 관리자에게: 새 요청

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#2F3437;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 16px">새 방문 요청</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774;width:110px">방문 기관</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{Company}} ({{Category}} {{ClientType}})</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774">일정</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{TourName}} · {{DateKey}} {{ScheduleText}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774">신청자</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{HostName}} {{HostTitle}} · {{HostDivision}} {{HostOrg}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774">목적 · 언어</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{Purpose}} · {{Language}}</td></tr>
  </table>
  <p style="margin:20px 0 0"><a href="{{앱주소}}?requestNo={{Title}}" style="display:inline-block;background:#111111;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:6px">관리자 화면에서 열기</a></p>
</div>
```

## C-1. 신청자에게: 방문 확정 (오시는 길 · 약도 포함)

`{{오시는길}}` 자리는 흐름 C 의 `작성` 단계 `오시는길` 결과(동적 콘텐츠 > 출력)입니다. `{{Message}}` 가 `-` 이면 '담당자 안내' 줄은 지웁니다
(흐름에서는 `if(equals(트리거 Message, '-'), '', ...)` 로 줄 전체를 조건 처리). 도착 시간 `{{도착전}}` 은 `CenterGuides` main 행의 `ArriveBefore`(없으면 10).

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#2F3437;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 4px">방문이 확정되었습니다</p>
  <p style="color:#787774;margin:0 0 20px">신청번호 {{Title}}</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774;width:110px">일정</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{TourName}} · {{DateKey}} {{ScheduleText}}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774">참석자</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{AttendeeCount}}명 정보 제출 완료 (예상 {{ExpectedHeadcount}}명)</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #EAEAEA;color:#787774">담당자 안내</td><td style="padding:8px 0;border-bottom:1px solid #EAEAEA">{{Message}}</td></tr>
  </table>
  {{오시는길}}
  <div style="margin-top:22px;background:#F7F6F3;border:1px solid #EAEAEA;padding:14px 16px;font-size:13px;color:#5F5E5B;line-height:1.8">
    · 투어 시작 <b>{{도착전}}분 전</b>까지 도착해 주세요.<br>
    · (두 센터를 가는 투어만) 두 센터는 떨어져 있어 오전 투어가 끝나면 오후 투어 장소로 이동해 주셔야 합니다.<br>
    · 문의나 일정 변경 · 취소는 <b>최소 1일 전</b>까지 담당자와 직접 소통해 주세요.
  </div>
  <p style="font-size:12px;color:#A3A29E;margin:20px 0 0">아직 정보를 내지 않은 참석자가 있다면 방문 전까지 입력 링크로 제출해 주세요.</p>
</div>
```

## C-2. 정보를 제출한 참석자에게: 방문 확정 (오시는 길 포함)

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#2F3437;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 12px">LX판토스 센터 방문이 확정되었습니다</p>
  <p style="margin:0 0 4px">{{TourName}}</p>
  <p style="margin:0 0 4px;color:#787774">{{DateKey}} {{ScheduleText}}</p>
  {{오시는길}}
  <p style="font-size:13px;color:#5F5E5B;margin:20px 0 0">투어 시작 {{도착전}}분 전까지 도착해 주세요.</p>
</div>
```

## C-3. 신청자에게: 거절 (취소는 문구만 바꿔 사용)

```html
<div style="font-family:'Segoe UI','Malgun Gothic',sans-serif;color:#2F3437;max-width:600px;line-height:1.6">
  <p style="font-size:18px;font-weight:600;margin:0 0 12px">요청하신 일정으로는 방문이 어렵습니다</p>
  <p style="margin:0 0 4px">{{Company}} · {{TourName}} · {{DateKey}} {{ScheduleText}}</p>
  <p style="margin:16px 0 4px;color:#787774">사유</p>
  <p style="margin:0 0 20px">{{Message}}</p>
  <p style="font-size:13px;margin:0">다른 날짜로 다시 신청해 주시거나, 이 메일에 회신해 문의해 주세요.</p>
</div>
```
