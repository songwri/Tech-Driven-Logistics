import { OrbitControls } from '@react-three/drei'
import WireframeStage from './WireframeStage'
import { techModels } from './models'

interface TechShowcaseProps {
  techId: string
  onActiveIndexChange?: (index: number) => void
  className?: string
}

export default function TechShowcase({ techId, onActiveIndexChange, className }: TechShowcaseProps) {
  const Model = techModels[techId]
  if (!Model) return null

  return (
    <WireframeStage className={className} cameraPosition={[3.2, 2.2, 4.2]} fov={42}>
      <Model onActiveIndexChange={onActiveIndexChange} />
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
    </WireframeStage>
  )
}
