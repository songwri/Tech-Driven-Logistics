# TDL Lab API (Cloudflare Worker)

사이트는 GitHub Pages 정적 호스팅이라 서버가 없습니다. 이 워커가 자격증명을 보관하는
유일한 지점이며, 방명록 저장(GitHub 커밋)과 예약 알림(메일 발송)을 담당합니다.

| 엔드포인트 | 동작 |
| --- | --- |
| `GET /api/guestbook` | 저장소의 `data/guestbook.json`을 읽어 반환 |
| `POST /api/guestbook` | 이름·소속을 **마스킹한 뒤** 저장소에 커밋하고, 원본은 팀 메일로 발송 |
| `POST /api/reservation` | 팀 메일로 예약 신청 발송 (저장소에 기록하지 않음) |

> 예약 정보에는 전화번호·이메일이 포함되므로 **공개 저장소에 저장하지 않습니다.**
> 방명록도 저장소에는 마스킹된 값만 커밋되고, 원본 이름은 메일로만 전달됩니다.

## 배포 절차

```bash
cd worker
npm install -g wrangler        # 최초 1회
wrangler login
```

### 1. GitHub 토큰 발급

GitHub → Settings → Developer settings → **Fine-grained personal access tokens** →
Generate new token

- Repository access: `songwri/Tech-Driven-Logistics` 만 선택
- Permissions → Repository permissions → **Contents: Read and write**

### 2. Resend API 키 발급 (메일 발송)

[resend.com](https://resend.com) 가입 후 API Key 생성. 무료 티어로 하루 100통까지
발송됩니다. 자체 도메인을 인증하면 `MAIL_FROM`을 회사 주소로 바꿀 수 있습니다.

### 3. 시크릿 등록 후 배포

```bash
wrangler secret put GITHUB_TOKEN
wrangler secret put RESEND_API_KEY
wrangler deploy
```

배포되면 `https://tdl-lab-api.<계정명>.workers.dev` 주소가 출력됩니다.

### 4. 사이트에 워커 주소 연결

저장소 → Settings → Secrets and variables → Actions → **Variables** 탭에서
`VITE_LAB_API` 변수를 워커 주소로 추가하면, 다음 배포부터 사이트가 워커를 사용합니다.
(변수를 설정하기 전까지 사이트의 방명록은 브라우저 로컬 저장으로만 동작합니다.)

## 설정값

`wrangler.toml`의 `[vars]` 값은 공개되어도 무방한 설정입니다. 배포 브랜치나 수신
메일 주소가 바뀌면 이 파일을 수정한 뒤 다시 `wrangler deploy` 하세요.
