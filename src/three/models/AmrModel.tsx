import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import type { Group } from 'three'
import { WireBox, WireCylinder, PulseRing } from '../primitives'
import { useModelTimeline } from '../useModelTimeline'
import type { TechModelProps } from './types'

const PHASE_COUNT = 4
const LOOP_SECONDS = 6
const PATH_POINTS: [number, number, number][] = [
  [-1.6, -0.79, 0],
  [-0.8, -0.79, 0.3],
  [0, -0.79, 0],
  [0.8, -0.79, -0.3],
  [1.6, -0.79, 0],
]

const WHEEL_OFFSETS: [number, number, number][] = [
  [-0.55, -0.3, 0.5],
  [0.55, -0.3, 0.5],
  [-0.55, -0.3, -0.5],
  [0.55, -0.3, -0.5],
]

export default function AmrModel({ onActiveIndexChange, paused }: TechModelProps) {
  const chassisRef = useRef<Group>(null)
  const lidarRef = useRef<Group>(null)

  const { activeIndex, elapsed } = useModelTimeline(PHASE_COUNT, LOOP_SECONDS, onActiveIndexChange)

  useFrame(() => {
    if (paused) return
    const t = elapsed.current
    if (chassisRef.current) {
      chassisRef.current.position.x = Math.sin(t * 0.5) * 1.1
      chassisRef.current.position.z = Math.cos(t * 0.5) * 0.25
      chassisRef.current.rotation.y = Math.cos(t * 0.5) * 0.15
    }
    if (lidarRef.current) {
      lidarRef.current.rotation.y = t * (activeIndex === 1 ? 4 : 1.2)
    }
  })

  const bodyColor = activeIndex === 0 ? '#A72B2B' : '#736662'
  const sensorColor = activeIndex === 1 ? '#A72B2B' : '#ACA8A7'

  return (
    <group position={[0, 0.4, 0]}>
      <group ref={chassisRef}>
        <WireBox size={[1.2, 0.35, 0.9]} color={bodyColor} position={[0, 0, 0]} />
        {WHEEL_OFFSETS.map((offset, i) => (
          <WireCylinder
            key={i}
            radiusTop={0.16}
            radiusBottom={0.16}
            height={0.12}
            color="#ACA8A7"
            position={offset}
            rotation={[0, 0, Math.PI / 2]}
          />
        ))}
        <group ref={lidarRef} position={[0, 0.28, 0]}>
          <WireCylinder radiusTop={0.12} radiusBottom={0.14} height={0.16} color={sensorColor} />
        </group>
        <PulseRing active={activeIndex === 0} position={[0, -0.18, 0]} radius={0.9} />
        <PulseRing active={activeIndex === 3} position={[0, -0.1, 0]} radius={1.05} color="#A72B2B" flat={false} />
      </group>

      <Line
        points={PATH_POINTS}
        color={activeIndex === 2 ? '#A72B2B' : '#736662'}
        dashed
        dashSize={0.12}
        gapSize={0.08}
        transparent
        opacity={activeIndex === 2 ? 0.9 : 0.35}
      />
    </group>
  )
}
