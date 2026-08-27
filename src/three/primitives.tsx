import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface WireProps {
  color?: string
  opacity?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function WireBox({
  size,
  color = '#22d3ee',
  opacity = 1,
  position,
  rotation,
}: WireProps & { size: [number, number, number] }) {
  const sizeKey = size.join(',')
  const geometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sizeKey],
  )
  return (
    <lineSegments geometry={geometry} position={position} rotation={rotation}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  )
}

export function WireCylinder({
  radiusTop,
  radiusBottom,
  height,
  segments = 16,
  color = '#22d3ee',
  opacity = 1,
  position,
  rotation,
}: WireProps & {
  radiusTop: number
  radiusBottom: number
  height: number
  segments?: number
}) {
  const geometry = useMemo(
    () =>
      new THREE.EdgesGeometry(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
      ),
    [radiusTop, radiusBottom, height, segments],
  )
  return (
    <lineSegments geometry={geometry} position={position} rotation={rotation}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  )
}

export function WireSphere({
  radius,
  segments = 12,
  color = '#22d3ee',
  opacity = 1,
  position,
  rotation,
}: WireProps & { radius: number; segments?: number }) {
  const geometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(radius, segments > 12 ? 2 : 1)),
    [radius, segments],
  )
  return (
    <lineSegments geometry={geometry} position={position} rotation={rotation}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  )
}

export function WireTorus({
  radius,
  tube,
  color = '#22d3ee',
  opacity = 1,
  position,
  rotation,
}: WireProps & { radius: number; tube: number }) {
  const geometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.TorusGeometry(radius, tube, 8, 24)),
    [radius, tube],
  )
  return (
    <lineSegments geometry={geometry} position={position} rotation={rotation}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  )
}

export function PulseRing({
  active,
  position,
  color = '#a3e635',
  radius = 0.8,
  flat = true,
}: {
  active: boolean
  position: [number, number, number]
  color?: string
  radius?: number
  flat?: boolean
}) {
  const ref = useRef<THREE.LineSegments>(null)
  const geometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.TorusGeometry(radius, 0.015, 6, 32)),
    [radius],
  )

  useFrame(({ clock }) => {
    const line = ref.current
    if (!line) return
    if (!active) {
      line.visible = false
      return
    }
    line.visible = true
    const t = (clock.elapsedTime % 1.6) / 1.6
    line.scale.setScalar(0.5 + t * 1.1)
    const material = line.material as THREE.LineBasicMaterial
    material.opacity = 1 - t
  })

  return (
    <lineSegments
      ref={ref}
      geometry={geometry}
      position={position}
      rotation={flat ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
    >
      <lineBasicMaterial color={color} transparent opacity={0} />
    </lineSegments>
  )
}

export function HotspotDot({
  position,
  color = '#a3e635',
  scale = 1,
}: {
  position: [number, number, number]
  color?: string
  scale?: number
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  )
}
