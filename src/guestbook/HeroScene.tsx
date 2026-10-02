import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { RobotScene } from './RobotScene'
import { heroFrame, useTimeline } from './scenes'

/** 머리말 오른쪽 장면: 휴머노이드 로봇이 방명록을 쓰고 컨베이어로 보내는 반복 애니메이션. 화면 밖이나 탭이 숨으면 멈춘다. */
export function HeroScene({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([item]) => setVisible(item.isIntersecting))
    observer.observe(node)
    const onVisibility = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const t = useTimeline({ duration: 9000, loop: true, playing: visible && !reduce })
  // 움직임 줄이기 설정이면 글을 쓰는 중간 장면에서 멈춰 둔다.
  const frame = heroFrame(reduce ? 0.5 : t)

  return (
    <div ref={ref} className={className}>
      <RobotScene frame={frame} label="휴머노이드 로봇이 컨베이어 위 종이에 펜으로 방명록을 쓰는 그림" className="h-auto w-full" />
    </div>
  )
}
