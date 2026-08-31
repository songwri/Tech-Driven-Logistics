import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

/**
 * TDL Lab hero: a humanoid hands a case to an AMR, the AMR carries it out,
 * and the next one rolls in. One 16-second choreographed loop.
 */
const LOOP = 16

const HANDOFF_X = 0
const STACK = new THREE.Vector3(1.75, 0.62, 0.15)
const DECK = new THREE.Vector3(HANDOFF_X, 0.52, 0)

const STEEL = '#6f757e'
const STEEL_LIGHT = '#98a0aa'
const BRAND = '#a72b2b'
const CASE_COLOR = '#c9bfb4'

/** Eased 0..1 progress of the segment between `from` and `to`. */
function seg(t: number, from: number, to: number) {
  const raw = THREE.MathUtils.clamp((t - from) / (to - from), 0, 1)
  return raw * raw * (3 - 2 * raw)
}

function Panel({
  size,
  position,
  rotation,
  color = STEEL,
  metalness = 0.65,
  roughness = 0.35,
}: {
  size: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
  color?: string
  metalness?: number
  roughness?: number
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  )
}

function Humanoid({ phase }: { phase: React.RefObject<number> }) {
  const torso = useRef<THREE.Group>(null)
  const rightShoulder = useRef<THREE.Group>(null)
  const rightElbow = useRef<THREE.Group>(null)
  const leftShoulder = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = phase.current ?? 0
    const idle = Math.sin(clock.elapsedTime * 1.2) * 0.02

    // reach → lift → swing to the AMR → return
    const reach = seg(t, 0.16, 0.3)
    const carry = seg(t, 0.3, 0.46)
    const release = seg(t, 0.46, 0.6)

    const swing = carry - release
    if (torso.current) {
      torso.current.rotation.y = -swing * 0.75
      torso.current.position.y = 0.9 + idle - reach * 0.06 + release * 0.06
    }
    if (rightShoulder.current) {
      rightShoulder.current.rotation.x = -0.15 - reach * 1.15 + carry * 0.45 + release * 0.55
      rightShoulder.current.rotation.z = -0.12 - reach * 0.1
    }
    if (rightElbow.current) {
      rightElbow.current.rotation.x = -0.25 - reach * 0.5 + carry * 0.35 + release * 0.4
    }
    if (leftShoulder.current) {
      leftShoulder.current.rotation.x = -0.1 + idle * 2 - reach * 0.35 + release * 0.35
    }
    if (head.current) {
      head.current.rotation.y = -swing * 0.5 + reach * 0.25
    }
  })

  return (
    <group position={[1.15, 0, 0.1]} rotation={[0, -Math.PI / 2.4, 0]}>
      {/* legs stay planted */}
      <Panel size={[0.17, 0.9, 0.2]} position={[-0.14, 0.45, 0]} color={STEEL_LIGHT} />
      <Panel size={[0.17, 0.9, 0.2]} position={[0.14, 0.45, 0]} color={STEEL_LIGHT} />
      <Panel size={[0.42, 0.1, 0.26]} position={[0, 0.05, 0.02]} color={STEEL} />

      <group ref={torso} position={[0, 0.9, 0]}>
        <Panel size={[0.46, 0.6, 0.28]} position={[0, 0.3, 0]} />
        <Panel size={[0.5, 0.12, 0.3]} position={[0, 0.56, 0]} color={STEEL_LIGHT} />
        {/* chest indicator */}
        <mesh position={[0, 0.34, 0.15]}>
          <boxGeometry args={[0.12, 0.03, 0.01]} />
          <meshStandardMaterial color={BRAND} emissive={BRAND} emissiveIntensity={1.6} />
        </mesh>

        <group ref={head} position={[0, 0.78, 0]}>
          <Panel size={[0.26, 0.24, 0.24]} />
          <mesh position={[0, 0.02, 0.13]}>
            <boxGeometry args={[0.2, 0.06, 0.012]} />
            <meshStandardMaterial color={BRAND} emissive={BRAND} emissiveIntensity={2.2} />
          </mesh>
        </group>

        <group ref={leftShoulder} position={[-0.29, 0.5, 0]}>
          <Panel size={[0.12, 0.36, 0.13]} position={[0, -0.18, 0]} color={STEEL_LIGHT} />
          <Panel size={[0.1, 0.34, 0.11]} position={[0, -0.5, 0.02]} />
        </group>

        <group ref={rightShoulder} position={[0.29, 0.5, 0]}>
          <Panel size={[0.12, 0.36, 0.13]} position={[0, -0.18, 0]} color={STEEL_LIGHT} />
          <group ref={rightElbow} position={[0, -0.36, 0]}>
            <Panel size={[0.1, 0.34, 0.11]} position={[0, -0.17, 0]} />
            <Panel size={[0.12, 0.1, 0.14]} position={[0, -0.37, 0.01]} color={STEEL_LIGHT} />
          </group>
        </group>
      </group>
    </group>
  )
}

function Amr({ phase }: { phase: React.RefObject<number> }) {
  const body = useRef<THREE.Group>(null)
  const lidar = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    const t = phase.current ?? 0
    const arrive = seg(t, 0.02, 0.16)
    const depart = seg(t, 0.62, 0.84)
    if (body.current) body.current.position.x = -5.2 + arrive * 5.2 + depart * 5.6
    if (lidar.current) lidar.current.rotation.y += delta * 3.2
  })

  const wheels: [number, number, number][] = [
    [-0.42, 0.14, 0.33],
    [0.42, 0.14, 0.33],
    [-0.42, 0.14, -0.33],
    [0.42, 0.14, -0.33],
  ]

  return (
    <group ref={body}>
      <Panel size={[1.15, 0.22, 0.82]} position={[0, 0.34, 0]} />
      <Panel size={[1.2, 0.06, 0.86]} position={[0, 0.47, 0]} color={STEEL_LIGHT} />
      {wheels.map((position, i) => (
        <mesh key={i} position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 0.1, 20]} />
          <meshStandardMaterial color="#26292e" metalness={0.4} roughness={0.7} />
        </mesh>
      ))}
      <mesh ref={lidar} position={[0.44, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.085, 0.09, 18]} />
        <meshStandardMaterial color={STEEL_LIGHT} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.58, 0.36, 0]}>
        <boxGeometry args={[0.02, 0.05, 0.5]} />
        <meshStandardMaterial color={BRAND} emissive={BRAND} emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

/** The case being handed over: stack → hand → AMR deck → carried away. */
function Case({ phase }: { phase: React.RefObject<number> }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const t = phase.current ?? 0

    const lift = seg(t, 0.24, 0.34)
    const move = seg(t, 0.34, 0.5)
    const depart = seg(t, 0.62, 0.84)

    const from = STACK
    const to = DECK

    mesh.position.x = THREE.MathUtils.lerp(from.x, to.x, move) + depart * 5.6
    mesh.position.z = THREE.MathUtils.lerp(from.z, to.z, move)
    // arc: rises on lift, settles onto the deck
    const base = THREE.MathUtils.lerp(from.y, to.y, move)
    mesh.position.y = base + lift * 0.5 - move * 0.5 + Math.sin(move * Math.PI) * 0.22
    mesh.rotation.y = move * 0.4
    mesh.visible = t > 0.2
  })

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={[0.34, 0.26, 0.3]} />
      <meshStandardMaterial color={CASE_COLOR} metalness={0.15} roughness={0.8} />
    </mesh>
  )
}

function CaseStack() {
  return (
    <group position={[STACK.x, 0, STACK.z]}>
      <Panel size={[0.62, 0.5, 0.55]} position={[0, 0.25, 0]} color="#2f3238" metalness={0.5} />
      <Panel size={[0.34, 0.26, 0.3]} position={[0, 0.63, 0]} color={CASE_COLOR} metalness={0.15} roughness={0.8} />
      <Panel size={[0.34, 0.26, 0.3]} position={[0.02, 0.63, -0.34]} color={CASE_COLOR} metalness={0.15} roughness={0.8} />
    </group>
  )
}

function Stage() {
  const phase = useRef(0)
  const rig = useRef<THREE.Group>(null)

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime
    phase.current = (time % LOOP) / LOOP

    // slow cinematic drift; the look-at is offset so the action sits right of
    // centre and the headline keeps the left third to itself
    const angle = Math.sin(time * 0.08) * 0.24
    camera.position.set(Math.sin(angle) * 7.1 + 0.4, 2.15 + Math.sin(time * 0.22) * 0.1, Math.cos(angle) * 7.1)
    camera.lookAt(-1.05, 0.75, 0)

    if (rig.current) rig.current.rotation.y = Math.sin(time * 0.05) * 0.02
  })

  return (
    <group ref={rig}>
      <Humanoid phase={phase} />
      <Amr phase={phase} />
      <Case phase={phase} />
      <CaseStack />

      <ContactShadows position={[0, 0.001, 0]} opacity={0.55} scale={16} blur={2.4} far={4} color="#000000" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#111316" metalness={0.35} roughness={0.75} />
      </mesh>
    </group>
  )
}

export default function HeroLabScene({ className }: { className?: string }) {
  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 1.6]}
      gl={{ antialias: true }}
      camera={{ position: [7.1, 2.15, 0], fov: 40 }}
    >
      <color attach="background" args={['#0c0e11']} />
      <fog attach="fog" args={['#0c0e11', 12, 30]} />

      <ambientLight intensity={1.1} />
      <hemisphereLight args={['#9fb4d0', '#14171b', 1.2]} />
      <directionalLight
        position={[5, 7, 4]}
        intensity={3.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      {/* brand rim light picks the silhouettes out of the dark */}
      <directionalLight position={[-6, 2.5, -4]} intensity={3.4} color={BRAND} />
      <directionalLight position={[-2, 1.5, 6]} intensity={1.1} color="#8fa3c0" />

      <Stage />
    </Canvas>
  )
}
