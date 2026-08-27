import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'

interface WireframeStageProps {
  children: ReactNode
  cameraPosition?: [number, number, number]
  fov?: number
  className?: string
}

export default function WireframeStage({
  children,
  cameraPosition = [3, 2, 4],
  fov = 40,
  className,
}: WireframeStageProps) {
  return (
    <Canvas
      className={className}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: cameraPosition, fov }}
    >
      {children}
    </Canvas>
  )
}
