import { OrbitControls } from '@react-three/drei'
import WireframeStage from './WireframeStage'
import { techModels } from './models'

interface TechPreviewProps {
  techId: string
  className?: string
}

export default function TechPreview({ techId, className }: TechPreviewProps) {
  const Model = techModels[techId]
  if (!Model) return null

  return (
    <WireframeStage className={className} cameraPosition={[2.6, 1.8, 3.4]} fov={45}>
      <Model />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={1.4}
      />
    </WireframeStage>
  )
}
