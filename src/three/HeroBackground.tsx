import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { PerspectiveCamera } from '@react-three/drei'
import WireframeStage from './WireframeStage'
import AmrModel from './models/AmrModel'
import RobotArmModel from './models/RobotArmModel'

function DiveCamera({ progress }: { progress: number }) {
  const cameraRef = useRef<PerspectiveCameraImpl>(null)
  const progressRef = useRef(progress)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useFrame(() => {
    const camera = cameraRef.current
    if (!camera) return
    const p = progressRef.current
    camera.position.z = 9 - p * 4.5
    camera.position.y = 2.2 - p * 0.6
    camera.rotation.z = p * 0.02
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 2.2, 9]} fov={38} />
}

function AmbientScene() {
  const groupRef = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      <group position={[-2.6, -0.6, -1]} scale={0.9}>
        <AmrModel />
      </group>
      <group position={[2.4, 0.4, -1.5]} scale={0.85}>
        <RobotArmModel />
      </group>
    </group>
  )
}

interface HeroBackgroundProps {
  progress?: number
  className?: string
}

export default function HeroBackground({ progress = 0, className }: HeroBackgroundProps) {
  return (
    <WireframeStage className={className}>
      <DiveCamera progress={progress} />
      <AmbientScene />
    </WireframeStage>
  )
}
