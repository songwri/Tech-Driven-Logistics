# TDL · Tech Driven Logistics

Tech Innovation Team의 TDL Lab 방문 예약 · 방명록 · 관리자 사이트입니다.

## 운영 중인 페이지

| 주소 | 내용 |
| --- | --- |
| `/reserve/` | 방문 예약 신청 |
| `/guestbook/` | 방명록 (흐르는 최근 소감 10건, 별점 3점 이상만 표시 · 남기기) |
| `/admin/` | 관리자 (예약 대시보드 · 방문 통계 · 방명록 관리) |
| `/` | 바로가기 페이지: 방문 예약 · 방명록 버튼만 있고, 오른쪽 아래 구석의 작은 점이 관리자(`/admin/`) 링크입니다. 소개 사이트(랜딩)는 운영하지 않습니다 |

소개 사이트(3D 와이어프레임 · 스크롤 스토리텔링 · 영상 히어로)는 **운영하지 않기로 해서 빌드에서 뺐습니다.**
소스(`src/App.tsx`, `src/main.tsx`, `src/components/*`, `src/three/*`)는 지우지 않고 남겨 두었습니다.
아래 '개발 · 구조' 설명 중 3D · 스크롤 관련 항목은 이 소개 사이트에 대한 것입니다.

### 소개 사이트 다시 열기

1. `index.html`을 아래 내용으로 바꿉니다 (`git log -- index.html`의 이전 버전을 복원해도 됩니다).
   ```html
   <div id="root"></div>
   <script type="module" src="/src/main.tsx"></script>
   ```
   (meta · 폰트 · 파비콘 링크는 `reserve/index.html`을 참고해 `<head>`에 넣습니다)
2. 이 파일은 이미 `vite.config.ts`의 `notice` 입력으로 잡혀 있어 그대로 빌드됩니다.
3. 예약 · 방명록 페이지에서 소개 사이트로 가는 링크는 지금 없으므로, 필요하면 `src/lib/routes.ts`에 주소를 추가합니다.

## 스택

- React + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Three.js + React Three Fiber / drei — 3D 와이어프레임 모델 (소개 사이트, 현재 미운영)
- Framer Motion — 스크롤 리빌 애니메이션
- Pretendard(한글) + Geist / Geist Mono(영문 · 숫자). 외부 CDN 없이 번들에 포함

## 개발

```bash
npm install
npm run dev
```

## 빌드 / 린트

```bash
npm run build
npm run lint
```

## 구조

- `src/guestbook/` — 방명록 페이지 (`guestbook/index.html`). 로봇팔 · 컨베이어 장면, 흐르는 최근 기록(별점 3점 이상, 10건)
- `src/admin/GuestbookAdmin.tsx`, `useAdminGuestbook.ts`, `guestbookData.ts` — 관리자 방명록 관리 (조회 · 숨김 · 삭제 · 엑셀)
- `src/data/techData.ts` — 로봇팔, AMR/AGV, 자율주행, 자동화 설비, 신기술 PoC 기술 항목 데이터
  (라벨 순서가 각 3D 모델의 동작 페이즈 순서와 1:1로 매칭됩니다)
- `src/three/models/*` — 기술별 3D 와이어프레임 모델 (Three.js 프리미티브로 직접 제작한 아웃라인 모델).
  각 모델은 일정 주기로 부품별 동작 페이즈를 순환하며 현재 활성 부품 인덱스를 콜백으로 알립니다.
- `src/three/TechPreview.tsx` — 기술 맵 카드용 미니 프리뷰(자동 회전, 비인터랙티브)
- `src/three/TechShowcase.tsx` — 상세 오버레이용 프리뷰(드래그 회전 가능, 활성 인덱스를 상위로 전달)
- `src/components/TechDetailOverlay.tsx` — 3D 모델과 핵심 기술 포인트 리스트를 동기화해 보여주는 상세 오버레이
- `src/components/ScrollIntro.tsx` — Hero와 TDL 전략을 하나의 고정(pinned) 스크롤 영역에서
  카메라 디졸브 + 텍스트 크로스페이드로 연결하는 스크롤 스토리텔링 섹션
- `src/hooks/useScrollProgress.ts` — 스크롤 진행률(0~1)을 추적하는 훅
  (framer-motion의 `useScroll`/`useTransform` 배열 보간이 이 프로젝트 환경에서 정상 갱신되지 않는
  문제가 있어, 이 부분만 수동 스크롤 트래킹으로 대체했습니다)

## 배포 (GitHub Pages)

`.github/workflows/deploy.yml`이 이 브랜치(`claude/test-coverage-analysis-epu73z`)에 푸시될
때마다 lint → build → GitHub Pages 배포를 자동으로 실행합니다. 단, 저장소에서 아래 설정을
**한 번은 수동으로** 켜줘야 워크플로가 실제로 배포까지 성공합니다.

1. GitHub 저장소 → **Settings → Pages**
2. **Build and deployment → Source**를 `GitHub Actions`로 변경

이후 배포되는 주소는 `https://songwri.github.io/Tech-Driven-Logistics/` 형태입니다
(`vite.config.ts`의 `base` 옵션이 이 서브경로 기준으로 설정되어 있습니다 — 커스텀 도메인을
연결하게 되면 `base: '/'`로 되돌려야 합니다).

## TDL Lab 예약 · 방명록

> 아래 '배경 영상 · 영상 히어로' 설명은 운영하지 않는 소개 사이트(`src/components/LabGate.tsx`)에 대한 것입니다.

소개 사이트의 첫 화면은 전체화면 영상 히어로입니다. 배경 영상은 `public/media/tdl-lab-hero.{webm,mp4}`이며 포스터 이미지가 함께 있습니다.
원본(720p·11Mbps·14MB)을 웹용으로 재인코딩해 WebM 2.2MB / MP4 2.6MB로 줄였고,
WebM을 먼저 시도한 뒤 MP4로 폴백합니다. 영상 자체가 밝아 CSS 필터로 밝기를 낮추고
좌측에 짙은 스크림을 깔아 흰 글씨 대비를 확보했습니다. 영상을 교체할 때는 같은
파일명으로 바꿔 넣으면 됩니다.

백엔드는 **토큰이 필요 없는 Google Apps Script 웹앱**입니다. 설정 절차는
`apps-script/README.md`를 참고하세요. 저장소 변수 `VITE_LAB_API`에 웹앱 URL을 넣으면
연결되고, 그 전까지 방명록은 브라우저 로컬 저장으로만 동작합니다.

- 방명록 표시는 마스킹된 값만 사용합니다 (`홍길동 → 홍**`, `David Kim → D** K**`,
  `LX판토스 → L**`). 실명·연락처는 시트와 팀 메일에만 남습니다.
- 방명록은 `/guestbook/` 에서 읽고 남깁니다. 숨긴 글은 이 페이지에 나오지 않습니다.
- 관리자 `/admin/` 의 **방명록** 탭에서 실명 · 실제 소속을 보고, 부적절한 글은 **숨기기**(시트에는 남음) 또는
  **삭제**(시트에서도 삭제, 되돌릴 수 없음)합니다. 관리자 방명록 관리는 Apps Script 기능 수준 4 이상이 필요합니다
  (`apps-script/Code.gs`를 붙여넣고 기존 배포를 새 버전으로 재배포).

### 방문 예약 / 관리자 대시보드

- 예약 화면은 종합 투어 · TDL Lab 투어 · 센터 투어 중 하나를 고르고, 달력에서 날짜·시간을 정한 뒤
  신청 담당자 정보, 방문 정보(방문 유형 · 업체명 · 업종 · 방문 목적 · 투어 언어), 방문자 명단,
  개인정보 수집·이용 동의 순으로 입력합니다.
- 투어 시간대와 겹침 판정 규칙은 `src/lib/visit.ts` 한곳에 있습니다
  (백엔드 `apps-script/Code.gs` 의 `TOURS` 와 값이 같아야 합니다).
- 예약 신청 전용 페이지 `/reserve/` (`reserve/index.html` → `src/reserve/`)는 링크 · QR · 메일 서명 공유용입니다.
  폼은 `src/components/visit/ReservationForm.tsx` 입니다.
- 관리자 대시보드는 별도 페이지 `/admin/` (`admin/index.html` → `src/admin/`)로 빌드됩니다.
  달력 · 예약 요청 관리 · 월별/연도별 통계를 제공하며, 설정 방법은 `apps-script/README.md`를
  참고하세요.

## 참고

- 실제 사례 데이터, PoC 결과, 성과 지표, 파비콘 등 콘텐츠는 아직 플레이스홀더 상태이며 추후 실제
  자산으로 교체가 필요합니다.
- 3D 모델은 절차적으로 생성한 와이어프레임이며, 성능을 위해 각 모델은 저폴리곤 프리미티브로
  구성되어 있습니다.
- 3D/애니메이션 관련 컴포넌트(`HeroBackground`, `TechPreview`, `TechShowcase`)는
  `React.lazy` + `Suspense`로 코드 스플리팅되어 있고, three.js/framer-motion은
  `vite.config.ts`의 `manualChunks`로 별도 vendor 청크로 분리되어 초기 로드 용량을
  줄이고 캐싱 효율을 높입니다.
- 콘텐츠가 준비되어 공개 검색 노출을 허용하기 전까지는 `public/robots.txt`가 모든 크롤러를
  차단합니다. 공개 준비가 끝나면 이 파일을 완화하거나 제거하세요.
- Node 버전은 `.nvmrc`(22)로 고정되어 있고, CI 워크플로도 이 파일을 기준으로 Node를 설치합니다.
