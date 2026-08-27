# TDL · Tech Driven Logistics

Tech Innovation Team의 기술 방향성과 TDL 전략을 인터랙티브 기술 체험으로 보여주는 소개 사이트입니다.

## 스택

- React + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)

## 개발

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## 구조

- `src/data/techData.ts` — 로봇팔, AMR/AGV, 자율주행, 자동화 설비, 신기술 PoC 등 기술 항목 데이터
- `src/components/TechMap.tsx` — 인터랙티브 기술 맵 (기술 카드 클릭 시 상세 오버레이 표시)
- `src/components/TechDetailOverlay.tsx` — 기술별 핵심 포인트/적용 효과 오버레이
- 기타 섹션 컴포넌트: `Hero`, `TdlStrategy`, `TeamIntro`, `CaseStudy`, `Roadmap`, `ContactCta`

## 참고

실제 동작 영상/GIF, 사례 데이터, PoC 결과 등 콘텐츠는 아직 플레이스홀더 상태이며 추후 실제 자산으로 교체가 필요합니다.
