import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { WireBox, WireCylinder, HotspotDot } from '../primitives'
import { useModelTimeline } from '../useModelTimeline'
import type { TechModelProps } from './types'

const PHASE_COUNT = 5
const LOOP_SECONDS = 6

export default function RobotArmModel({ onActiveIndexChange, paused }: TechModelProps) {
  const baseRef = useRef<Group>(null)
  const shoulderRef = useRef<Group>(null)
  const elbowRef = useRef<Group>(null)
  const wristRef = useRef<Group>(null)
  const clawLeftRef = useRef<Group>(null)
  const clawRightRef = useRef<Group>(null)

  const { activeIndex, elapsed } = useModelTimeline(PHASE_COUNT, LOOP_SECONDS, onActiveIndexChange)

  useFrame(() => {
    if (paused) return
    const t = elapsed.current
    const amp = (index: number) => (activeIndex === index ? 1 : 0.25)

    if (baseRef.current) baseRef.current.rotation.y = Math.sin(t * 0.6) * 0.5 * amp(0)
    if (shoulderRef.current) shoulderRef.current.rotation.x = -0.3 + Math.sin(t * 0.8) * 0.25 * amp(1)
    if (elbowRef.current) elbowRef.current.rotation.x = 0.4 + Math.sin(t * 0.9 + 1) * 0.3 * amp(2)
    if (wristRef.current) wristRef.current.rotation.z = Math.sin(t * 1.1) * 0.4 * amp(3)

    const grip = activeIndex === 4 ? (Math.sin(t * 3) + 1) / 2 : 0.3
    if (clawLeftRef.current) clawLeftRef.current.rotation.z = 0.3 + grip * 0.4
    if (clawRightRef.current) clawRightRef.current.rotation.z = -0.3 - grip * 0.4
  })

  const colorFor = (index: number) => (activeIndex === index ? '#a3e635' : '#22d3ee')

  return (
    <group position={[0, -1.4, 0]}>
      <WireCylinder radiusTop={0.9} radiusBottom={0.9} height={0.3} color="#3b82f6" />

      <group ref={baseRef} position={[0, 0.15, 0]}>
        <WireCylinder radiusTop={0.45} radiusBottom={0.5} height={0.5} color={colorFor(0)} position={[0, 0.25, 0]} />
        {activeIndex === 0 && <HotspotDot position={[0, 0.5, 0.5]} />}

        <group ref={shoulderRef} position={[0, 0.5, 0]}>
          <WireBox size={[0.35, 1.4, 0.35]} color={colorFor(1)} position={[0, 0.7, 0]} />
          {activeIndex === 1 && <HotspotDot position={[0.3, 0.7, 0.3]} />}

          <group ref={elbowRef} position={[0, 1.4, 0]}>
            <WireBox size={[0.28, 1.1, 0.28]} color={colorFor(2)} position={[0, 0.55, 0]} />
            {activeIndex === 2 && <HotspotDot position={[0.25, 0.55, 0.25]} />}

            <group ref={wristRef} position={[0, 1.1, 0]}>
              <WireCylinder radiusTop={0.22} radiusBottom={0.22} height={0.25} color={colorFor(3)} />
              {activeIndex === 3 && <HotspotDot position={[0.3, 0, 0.2]} />}

              <group position={[0, 0.15, 0]}>
                <group ref={clawLeftRef} position={[-0.08, 0, 0]}>
                  <WireBox size={[0.06, 0.35, 0.12]} color={colorFor(4)} position={[0, 0.17, 0]} />
                </group>
                <group ref={clawRightRef} position={[0.08, 0, 0]}>
                  <WireBox size={[0.06, 0.35, 0.12]} color={colorFor(4)} position={[0, 0.17, 0]} />
                </group>
                {activeIndex === 4 && <HotspotDot position={[0, 0.4, 0]} />}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
