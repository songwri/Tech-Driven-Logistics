interface BlueprintFrameProps {
  className?: string
  size?: number
}

/** Viewfinder-style corner brackets — the site's recurring "in focus" mark. */
export default function BlueprintFrame({ className, size = 16 }: BlueprintFrameProps) {
  const corner = 'absolute border-brand'
  const style = { width: size, height: size }

  return (
    <div className={`pointer-events-none absolute inset-0 ${className ?? ''}`}>
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} style={style} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} style={style} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} style={style} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} style={style} />
    </div>
  )
}
