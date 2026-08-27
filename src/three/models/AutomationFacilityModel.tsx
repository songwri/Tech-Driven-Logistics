import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { WireBox } from '../primitives'
import { useModelTimeline } from '../useModelTimeline'
import type { TechModelProps } from './types'

const PHASE_COUNT = 3
const LOOP_SECONDS = 6
const CONVEYOR_LENGTH = 3.2
const PACKAGE_COUNT = 4

const RACK_LEVELS = [-0.6, -0.1, 0.4]

export default function AutomationFacilityModel({ onActiveIndexChange, paused }: TechModelProps) {
  const packageRefs = useRef<(Group | null)[]>([])
  const sorterArmRef = useRef<Group>(null)
  const shuttleRef = useRef<Group>(null)

  const { activeIndex, elapsed } = useModelTimeline(PHASE_COUNT, LOOP_SECONDS, onActiveIndexChange)

  const packageOffsets = useMemo(
    () => Array.from({ length: PACKAGE_COUNT }, (_, i) => (i / PACKAGE_COUNT) * CONVEYOR_LENGTH),
    [],
  )

  useFrame(() => {
    if (paused) return
    const t = elapsed.current
    const speed = 0.6

    packageRefs.current.forEach((pkg, i) => {
      if (!pkg) return
      const raw = (t * speed + packageOffsets[i]) % CONVEYOR_LENGTH
      pkg.position.x = raw - CONVEYOR_LENGTH / 2
    })

    if (sorterArmRef.current) {
      sorterArmRef.current.rotation.z = activeIndex === 1 ? Math.sin(t * 3) * 0.35 : Math.sin(t * 0.8) * 0.08
    }
    if (shuttleRef.current) {
      const cycle = (Math.sin(t * (activeIndex === 2 ? 1.4 : 0.5)) + 1) / 2
      shuttleRef.current.position.y = RACK_LEVELS[0] + cycle * (RACK_LEVELS[2] - RACK_LEVELS[0])
    }
  })

  const conveyorColor = activeIndex === 0 ? '#A72B2B' : '#736662'
  const sorterColor = activeIndex === 1 ? '#A72B2B' : '#ACA8A7'
  const shuttleColor = activeIndex === 2 ? '#A72B2B' : '#736662'

  return (
    <group position={[0, -0.2, 0]}>
      <WireBox size={[CONVEYOR_LENGTH, 0.06, 0.7]} color={conveyorColor} position={[0, 0, 0]} />
      {Array.from({ length: PACKAGE_COUNT }).map((_, i) => (
        <group key={i} ref={(el) => { packageRefs.current[i] = el }} position={[0, 0.18, 0]}>
          <WireBox size={[0.22, 0.22, 0.22]} color="#736662" />
        </group>
      ))}

      <group ref={sorterArmRef} position={[CONVEYOR_LENGTH / 2 - 0.2, 0.1, -0.35]}>
        <WireBox size={[0.5, 0.06, 0.06]} color={sorterColor} position={[0.25, 0, 0]} />
      </group>
      <WireBox size={[0.9, 0.06, 0.5]} color={sorterColor} position={[CONVEYOR_LENGTH / 2 + 0.4, 0, -0.7]} />

      <group position={[-CONVEYOR_LENGTH / 2 - 0.7, 0, 0.4]}>
        {RACK_LEVELS.map((y, i) => (
          <WireBox key={i} size={[0.5, 0.02, 0.5]} color="#ACA8A7" position={[0, y, 0]} />
        ))}
        <WireBox size={[0.5, 1.1, 0.02]} color="#ACA8A7" position={[-0.24, -0.1, -0.24]} />
        <WireBox size={[0.5, 1.1, 0.02]} color="#ACA8A7" position={[0.24, -0.1, -0.24]} />
        <group ref={shuttleRef}>
          <WireBox size={[0.4, 0.16, 0.4]} color={shuttleColor} />
        </group>
      </group>
    </group>
  )
}
