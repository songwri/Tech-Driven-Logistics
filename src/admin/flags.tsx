import { Globe } from 'lucide-react'

/**
 * 투어 언어 국기. 국기 이모지는 윈도우에서 'KR' · 'US' 같은 글자로 보이므로 작은 SVG 로 그린다.
 * 30 × 20 비율, 막대그래프 옆에 붙이는 크기(20 × 14)를 기준으로 단순화했다.
 */
const frame = 'h-[14px] w-5 shrink-0 rounded-[2px] ring-1 ring-black/15'

/** 5각 별의 꼭짓점 좌표 */
function star(cx: number, cy: number, radius: number, rotate = 0) {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = (Math.PI / 5) * index - Math.PI / 2 + (rotate * Math.PI) / 180
    const r = index % 2 === 0 ? radius : radius * 0.382
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`
  }).join(' ')
}

/** 태극기의 괘: 가운데를 향해 기울인 세 줄 (broken[i] 가 true 면 가운데가 끊긴 줄) */
function Trigram({ x, y, rotate, broken }: { x: number; y: number; rotate: number; broken: [boolean, boolean, boolean] }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} fill="#111">
      {broken.map((gap, index) => {
        const top = -2.2 + index * 1.5
        return gap ? (
          <g key={index}>
            <rect x={-2.6} y={top} width={1.1} height={0.9} />
            <rect x={1.5} y={top} width={1.1} height={0.9} />
          </g>
        ) : (
          <rect key={index} x={-2.6} y={top} width={5.2} height={0.9} />
        )
      })}
    </g>
  )
}

function KoreaFlag() {
  return (
    <svg viewBox="0 0 30 20" className={frame} role="img" aria-label="대한민국">
      <rect width="30" height="20" fill="#fff" />
      <path d="M10 10a5 5 0 0 1 10 0z" fill="#cd2e3a" />
      <path d="M10 10a5 5 0 0 0 10 0z" fill="#0047a0" />
      <circle cx="12.5" cy="10" r="2.5" fill="#cd2e3a" />
      <circle cx="17.5" cy="10" r="2.5" fill="#0047a0" />
      <Trigram x={5.2} y={4.6} rotate={-33.7} broken={[false, false, false]} />
      <Trigram x={24.8} y={4.6} rotate={33.7} broken={[true, false, true]} />
      <Trigram x={5.2} y={15.4} rotate={33.7} broken={[false, true, false]} />
      <Trigram x={24.8} y={15.4} rotate={-33.7} broken={[true, true, true]} />
    </svg>
  )
}

function UsaFlag() {
  const stripe = 20 / 7
  return (
    <svg viewBox="0 0 30 20" className={frame} role="img" aria-label="미국">
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6].map((index) => (
        <rect key={index} y={index * stripe} width="30" height={stripe} fill="#b22234" />
      ))}
      <rect width="13" height={stripe * 4} fill="#3c3b6e" />
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => <circle key={`${row}${col}`} cx={2.6 + col * 4} cy={2.4 + row * 3.4} r="0.9" fill="#fff" />),
      )}
    </svg>
  )
}

function ChinaFlag() {
  return (
    <svg viewBox="0 0 30 20" className={frame} role="img" aria-label="중국">
      <rect width="30" height="20" fill="#de2910" />
      <polygon points={star(5, 5.2, 3.4)} fill="#ffde00" />
      <polygon points={star(10, 2, 1.1, 20)} fill="#ffde00" />
      <polygon points={star(12, 4.2, 1.1, 40)} fill="#ffde00" />
      <polygon points={star(12, 7.2, 1.1, 10)} fill="#ffde00" />
      <polygon points={star(10, 9.4, 1.1, 30)} fill="#ffde00" />
    </svg>
  )
}

function OtherLanguage() {
  return (
    <span className="flex h-[14px] w-5 shrink-0 items-center justify-center text-warm-600" aria-hidden>
      <Globe width={15} height={15} strokeWidth={1.6} />
    </span>
  )
}

/** 통계의 '투어 언어' 항목 이름 → 국기. 한국어(통역 동반 포함) · 영어 · 중국어, 그 밖의 외국어는 지구본. */
export function LanguageFlag({ label }: { label: string }) {
  if (label.startsWith('한국어')) return <KoreaFlag />
  if (label === '영어') return <UsaFlag />
  if (label === '중국어') return <ChinaFlag />
  return <OtherLanguage />
}
