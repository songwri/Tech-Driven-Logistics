import { lazy, Suspense, useEffect, useState } from 'react'
import type { TechItem } from '../data/techData'
import BlueprintFrame from './BlueprintFrame'

const TechShowcase = lazy(() => import('../three/TechShowcase'))

interface TechDetailOverlayProps {
  tech: TechItem
  onClose: () => void
}

export default function TechDetailOverlay({ tech, onClose }: TechDetailOverlayProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-warm-800/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-overlay-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl border border-warm-300/50 bg-white p-6 md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <BlueprintFrame size={20} />
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 font-mono text-warm-600 transition hover:text-brand"
        >
          [X]
        </button>

        <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand">
          {tech.englishName}
        </p>
        <h3 id="tech-overlay-title" className="mt-2 text-2xl font-bold text-warm-800">
          {tech.name}
        </h3>
        <p className="mt-1 text-sm text-warm-600">{tech.tagline}</p>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="relative aspect-video overflow-hidden border border-warm-300/40 bg-cream">
            <BlueprintFrame size={14} />
            <Suspense fallback={null}>
              <TechShowcase
                techId={tech.id}
                onActiveIndexChange={setActiveIndex}
                className="h-full w-full"
              />
            </Suspense>
            <p className="pointer-events-none absolute bottom-3 left-4 right-4 font-mono text-[11px] text-warm-600">
              {tech.sceneCaption} · 드래그로 회전해 보세요
            </p>
          </div>

          <div>
            <h4 className="mb-2 font-mono text-xs uppercase tracking-wide text-warm-600">
              핵심 기술 포인트
            </h4>
            <ul className="space-y-1.5 text-sm">
              {tech.overlayPoints.map((point, index) => (
                <li
                  key={point.label}
                  className={`flex gap-2.5 px-2.5 py-1.5 transition ${
                    index === activeIndex ? 'bg-brand/10 text-warm-800' : 'text-warm-600'
                  }`}
                >
                  <span
                    className={`font-mono text-xs ${
                      index === activeIndex ? 'text-brand' : 'text-warm-300'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className={`font-medium ${index === activeIndex ? 'text-brand' : 'text-warm-800'}`}>
                      {point.label}
                    </span>{' '}
                    · {point.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 font-mono text-xs uppercase tracking-wide text-warm-600">
              적용 효과
            </h4>
            <ul className="space-y-2 text-sm text-warm-600">
              {tech.effects.map((effect) => (
                <li key={effect}>· {effect}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-mono text-xs uppercase tracking-wide text-warm-600">
              기술 키워드
            </h4>
            <div className="flex flex-wrap gap-2">
              {tech.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="border border-warm-300/50 px-2.5 py-1 font-mono text-xs text-warm-600"
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
