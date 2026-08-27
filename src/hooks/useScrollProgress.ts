import { useEffect, useState, type RefObject } from 'react'

/**
 * Tracks 0..1 progress of how far `ref`'s element has scrolled through the
 * viewport, based on its bounding box (used for pinned/scroll-jacked
 * sections rather than framer-motion's useScroll, which we found does not
 * reliably re-render style-bound opacity in this environment).
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0

    const update = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const value = total > 0 ? (-rect.top / total) : 0
      setProgress(Math.min(1, Math.max(0, value)))
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [ref])

  return progress
}

export function clampMap(value: number, [inMin, inMax]: [number, number], [outMin, outMax]: [number, number]) {
  const t = Math.min(1, Math.max(0, (value - inMin) / (inMax - inMin)))
  return outMin + (outMax - outMin) * t
}
