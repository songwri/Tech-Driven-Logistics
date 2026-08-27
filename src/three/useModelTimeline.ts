import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Cycles through `phaseCount` phases over `loopSeconds`, calling `onChange`
 * only when the active phase index actually changes (not every frame).
 */
export function useModelTimeline(phaseCount: number, loopSeconds: number, onChange?: (index: number) => void) {
  const [activeIndex, setActiveIndex] = useState(0)
  const lastIndex = useRef(0)
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    elapsed.current += delta
    const phaseDuration = loopSeconds / phaseCount
    const index = Math.floor((elapsed.current % loopSeconds) / phaseDuration)
    if (index !== lastIndex.current) {
      lastIndex.current = index
      setActiveIndex(index)
      onChange?.(index)
    }
  })

  return { activeIndex, elapsed }
}
