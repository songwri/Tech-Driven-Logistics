# TDL · Tech Driven Logistics

Tech Innovation Team의 기술 방향성과 TDL 전략을, 직접 제작한 3D 와이어프레임 모델과
스크롤 스토리텔링으로 보여주는 인터랙티브 소개 사이트입니다.

## 스택

- React + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Three.js + React Three Fiber / drei — 3D 와이어프레임 모델
- Framer Motion — 스크롤 리빌 애니메이션
- Noto Sans / Noto Sans KR (Google Fonts)

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
