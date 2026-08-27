import { useEffect, useRef, useState, type RefObject } from 'react'
import BlueprintFrame from './BlueprintFrame'
import { useScrollProgress, clampMap } from '../hooks/useScrollProgress'

const points = [
  '자동화 설비 검토 및 적용',
  '물류로봇 도입 및 운영 최적화',
  '자율주행 기술 검증',
  '신기술 PoC 설계 및 사업화 검토',
  '현장 적용 가능한 기술만 선별하여 실증',
]

/** How far the horizontal track overflows the viewport, measured live so it
 *  stays correct across breakpoints instead of guessing card/gap widths. */
function useMaxScrollX(trackRef: RefObject<HTMLDivElement | null>) {
  const [maxScrollX, setMaxScrollX] = useState(0)

  useEffect(() => {
    const update = () => {
      const el = trackRef.current
      if (!el) return
      setMaxScrollX(Math.max(0, el.scrollWidth - window.innerWidth))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [trackRef])

  return maxScrollX
}

export default function TeamIntro() {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const progress = useScrollProgress(containerRef)
  const maxScrollX = useMaxScrollX(trackRef)

  const panX = progress * maxScrollX
  const hintOpacity = clampMap(progress, [0, 0.12], [1, 0])

  return (
    <section id="team" ref={containerRef} className="relative bg-cream" style={{ height: '240vh' }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="px-6 md:px-16">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">
            Tech Innovation Team
          </p>
          <h2 className="max-w-xl text-2xl font-bold text-warm-800 md:text-4xl">
            우리는 기술을 검토하는 팀이 아니라,
            <br />
            기술을 현장에 구현하는 팀입니다
          </h2>
          <p style={{ opacity: hintOpacity }} className="mt-4 font-mono text-xs text-warm-600">
            SCROLL TO EXPLORE →
          </p>
        </div>

        <div
          ref={trackRef}
          className="mt-10 flex gap-6 px-6 will-change-transform md:px-16"
          style={{ transform: `translateX(${-panX}px)` }}
        >
          {points.map((point, i) => (
            <div
              key={point}
              className="relative flex h-56 w-72 shrink-0 flex-col justify-end border border-warm-300/50 bg-white p-6 md:w-80"
            >
              <BlueprintFrame size={14} />
              <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, '0')}</span>
              <p className="mt-2 text-base font-semibold text-warm-800">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
