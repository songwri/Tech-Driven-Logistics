import { cn } from '@/lib/utils'

/**
 * TDL brand lockup. The wordmark is baked into the image, so the alt text
 * carries the name for screen readers and the mark stays pixel-faithful.
 *
 * `tone="light"` swaps in the white-wordmark artwork for dark backdrops
 * (the hero video); the red mark itself is identical in both.
 */
export function Logo({
  tone = 'dark',
  className,
}: {
  tone?: 'dark' | 'light'
  className?: string
}) {
  const src = `${import.meta.env.BASE_URL}${tone === 'light' ? 'tdl-logo-light.png' : 'tdl-logo.png'}`
  return (
    <img
      src={src}
      alt="TDL · Tech Driven Logistics"
      width={265}
      height={96}
      className={cn('h-8 w-auto select-none', className)}
      draggable={false}
    />
  )
}

/** Square mark on its own, for tight spots where the wordmark would not fit. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}tdl-mark.png`}
      alt=""
      aria-hidden
      width={128}
      height={128}
      className={cn('h-8 w-8 select-none', className)}
      draggable={false}
    />
  )
}
