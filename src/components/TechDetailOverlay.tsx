import type { TechItem } from '../data/techData'

interface TechDetailOverlayProps {
  tech: TechItem
  onClose: () => void
}

export default function TechDetailOverlay({ tech, onClose }: TechDetailOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-overlay-title"
      onClick={onClose}
    >
      <div
        className="glass-panel relative w-full max-w-3xl rounded-2xl p-6 md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 text-white/50 transition hover:text-white"
        >
          ✕
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-accent">
          {tech.englishName}
        </p>
        <h3 id="tech-overlay-title" className="mt-2 text-2xl font-bold text-white">
          {tech.name}
        </h3>
        <p className="mt-1 text-sm text-white/60">{tech.tagline}</p>

        <div className="relative mt-6 flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-navy-900/60">
          <p className="px-6 text-center text-sm text-white/50">{tech.mediaCaption}</p>
          <div className="hotspot-pulse absolute h-3 w-3 rounded-full bg-lime-accent" />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-white/90">핵심 기술 포인트</h4>
            <ul className="space-y-2 text-sm text-white/70">
              {tech.overlayPoints.map((point) => (
                <li key={point.label} className="flex gap-2">
                  <span className="font-medium text-cyan-accent">{point.label}</span>
                  <span>· {point.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-white/90">적용 효과</h4>
            <ul className="space-y-2 text-sm text-white/70">
              {tech.effects.map((effect) => (
                <li key={effect}>· {effect}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {tech.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
