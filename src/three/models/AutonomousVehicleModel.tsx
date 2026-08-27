import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import type { Group } from 'three'
import { WireBox, WireCylinder, WireTorus, PulseRing } from '../primitives'
import { useModelTimeline } from '../useModelTimeline'
import type { TechModelProps } from './types'

const PHASE_COUNT = 4
const LOOP_SECONDS = 6

const LANE_LEFT: [number, number, number][] = [
  [-2, -0.8, 0.5],
  [0, -0.8, 0.5],
  [2, -0.8, 0.5],
]
const LANE_RIGHT: [number, number, number][] = [
  [-2, -0.8, -0.5],
  [0, -0.8, -0.5],
  [2, -0.8, -0.5],
]
const PLANNED_PATH: [number, number, number][] = [
  [0, -0.6, 0],
  [0.6, -0.6, 0.15],
  [1.2, -0.6, -0.1],
  [1.8, -0.6, 0.2],
]

const WHEELS: [number, number, number][] = [
  [-0.75, -0.35, 0.55],
  [0.75, -0.35, 0.55],
  [-0.75, -0.35, -0.55],
  [0.75, -0.35, -0.55],
]

export default function AutonomousVehicleModel({ onActiveIndexChange, paused }: TechModelProps) {
  const bodyRef = useRef<Group>(null)
  const { activeIndex, elapsed } = useModelTimeline(PHASE_COUNT, LOOP_SECONDS, onActiveIndexChange)

  useFrame(() => {
    if (paused) return
    const t = elapsed.current
    if (bodyRef.current) {
      bodyRef.current.position.x = Math.sin(t * 0.35) * 0.8
      bodyRef.current.rotation.y = Math.sin(t * 0.35) * 0.05
    }
  })

  const sensorColor = activeIndex === 0 ? '#a3e635' : '#3b82f6'
  const laneColor = activeIndex === 1 ? '#a3e635' : '#22d3ee'
  const pathColor = activeIndex === 2 ? '#a3e635' : '#22d3ee'

  return (
    <group position={[0, 0.55, 0]}>
      <group ref={bodyRef}>
        <WireBox size={[1.7, 0.4, 0.95]} color="#22d3ee" position={[0, 0, 0]} />
        <WireBox size={[0.9, 0.35, 0.8]} color="#22d3ee" position={[-0.1, 0.35, 0]} />
        {WHEELS.map((position, i) => (
          <WireCylinder
            key={i}
            radiusTop={0.22}
            radiusBottom={0.22}
            height={0.14}
            color="#3b82f6"
            position={position}
            rotation={[0, 0, Math.PI / 2]}
          />
        ))}
        <WireTorus radius={0.15} tube={0.015} color={sensorColor} position={[0.85, 0, 0.45]} />
        <WireTorus radius={0.15} tube={0.015} color={sensorColor} position={[0.85, 0, -0.45]} />
        <WireTorus radius={0.15} tube={0.015} color={sensorColor} position={[-0.85, 0, 0]} />
        <PulseRing active={activeIndex === 3} position={[0, -0.2, 0]} radius={1.2} color="#a3e635" flat={false} />
      </group>

      <Line points={LANE_LEFT} color={laneColor} transparent opacity={activeIndex === 1 ? 0.9 : 0.3} />
      <Line points={LANE_RIGHT} color={laneColor} transparent opacity={activeIndex === 1 ? 0.9 : 0.3} />
      <Line
        points={PLANNED_PATH}
        color={pathColor}
        dashed
        dashSize={0.1}
        gapSize={0.06}
        transparent
        opacity={activeIndex === 2 ? 0.9 : 0.3}
      />
    </group>
  )
}
