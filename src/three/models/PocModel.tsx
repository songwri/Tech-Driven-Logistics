import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { WireSphere, WireBox, PulseRing } from '../primitives'
import { useModelTimeline } from '../useModelTimeline'
import type { TechModelProps } from './types'

const PHASE_COUNT = 3
const LOOP_SECONDS = 6

const NODE_POSITIONS: [number, number, number][] = [
  [1.1, 0.5, 0.3],
  [-1, 0.3, -0.6],
  [0.6, -0.4, -1],
  [-0.7, -0.5, 0.8],
]

export default function PocModel({ onActiveIndexChange, paused }: TechModelProps) {
  const coreRef = useRef<THREE.Group>(null)
  const dataDotRefs = useRef<(THREE.Mesh | null)[]>([])

  const { activeIndex, elapsed } = useModelTimeline(PHASE_COUNT, LOOP_SECONDS, onActiveIndexChange)

  const nodeVectors = useMemo(() => NODE_POSITIONS.map((p) => new THREE.Vector3(...p)), [])

  useFrame(() => {
    if (paused) return
    const t = elapsed.current

    if (coreRef.current) {
      const pulse = activeIndex === 0 ? 1 + Math.sin(t * 4) * 0.12 : 1 + Math.sin(t * 1.2) * 0.03
      coreRef.current.scale.setScalar(pulse)
      coreRef.current.rotation.y = t * 0.3
    }

    dataDotRefs.current.forEach((dot, i) => {
      if (!dot) return
      const speed = activeIndex === 1 ? 0.9 : 0.25
      const progress = (t * speed + i * 0.25) % 1
      dot.position.lerpVectors(nodeVectors[i], new THREE.Vector3(0, 0, 0), progress)
      dot.visible = activeIndex === 1
    })
  })

  const coreColor = activeIndex === 0 ? '#a3e635' : '#22d3ee'
  const nodeColor = activeIndex === 1 ? '#a3e635' : '#3b82f6'

  return (
    <group position={[0, 0, 0]}>
      <group ref={coreRef}>
        <WireSphere radius={0.55} segments={16} color={coreColor} />
      </group>
      <PulseRing active={activeIndex === 2} position={[0, 0, 0]} radius={0.9} color="#a3e635" flat={false} />

      {NODE_POSITIONS.map((position, i) => (
        <group key={i}>
          <WireBox size={[0.22, 0.22, 0.22]} color={nodeColor} position={position} />
          <Line points={[position, [0, 0, 0]]} color="#22d3ee" transparent opacity={0.25} />
          <mesh ref={(el) => { dataDotRefs.current[i] = el }} visible={false}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshBasicMaterial color="#a3e635" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
