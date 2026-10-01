import type { Ref } from 'react'
import { ARM, BELT, VIEW, bilinear, lerp, scriptAt, sheetCorners, solveArm, type Point } from './robot'

/** 장면 한 프레임: 손목 목표 위치, 집게 닫힘(0~1), 도구, 종이 상태, 벨트 이동량(px) */
export interface SceneFrame {
  wrist: Point
  grip: number
  tool: 'pen' | 'gripper'
  sheet: { cx: number; lift: number; ink: number; stamp: number } | null
  belt: number
}

const INK = '#2b2522'
const LINE = '#534a47'
const BRAND = '#a72b2b'

const pointsOf = (points: Point[]) => points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')

function Belt({ offset }: { offset: number }) {
  const { y, depthX, depthY, thickness } = BELT
  const shift = ((offset % 26) + 26) % 26
  const seams = Array.from({ length: 22 }, (_, index) => index * 26 + shift - 26)
  // 바퀴살은 4방향 대칭이라 26px 마다 같은 모양 → 이동량에 맞춰 돌린다.
  const spin = (shift / 26) * 90
  return (
    <g>
      {/* 다리 */}
      {[44, 236].map((x) => (
        <g key={x} stroke={LINE} strokeWidth={1.5}>
          <line x1={x} y1={y + thickness} x2={x} y2={268} />
          <line x1={x - 10} y1={268} x2={x + 10} y2={268} />
        </g>
      ))}
      {/* 윗면 */}
      <polygon
        points={pointsOf([
          { x: -10, y },
          { x: VIEW.width + 10, y },
          { x: VIEW.width + 10 + depthX, y: y - depthY },
          { x: -10 + depthX, y: y - depthY },
        ])}
        fill="#efebe8"
        stroke={LINE}
        strokeWidth={1.25}
      />
      {seams.map((x) => (
        <line key={x} x1={x} y1={y} x2={x + depthX} y2={y - depthY} stroke="#d6cfcb" strokeWidth={1} />
      ))}
      {/* 옆면 + 롤러 */}
      <rect x={-10} y={y} width={VIEW.width + 20} height={thickness} fill="#ffffff" stroke={LINE} strokeWidth={1.25} />
      {Array.from({ length: 16 }, (_, index) => 14 + index * 32).map((x) => (
        <g key={x} transform={`rotate(${spin} ${x} ${y + thickness / 2})`}>
          <circle cx={x} cy={y + thickness / 2} r={4.5} fill="#ffffff" stroke={LINE} strokeWidth={1} />
          <line x1={x - 4.5} y1={y + thickness / 2} x2={x + 4.5} y2={y + thickness / 2} stroke={LINE} strokeWidth={0.75} />
          <line x1={x} y1={y + thickness / 2 - 4.5} x2={x} y2={y + thickness / 2 + 4.5} stroke={LINE} strokeWidth={0.75} />
        </g>
      ))}
    </g>
  )
}

function Sheet({ frame, sheetRef }: { frame: SceneFrame; sheetRef?: Ref<SVGPolygonElement> }) {
  const sheet = frame.sheet
  if (!sheet) return null
  const corners = sheetCorners(sheet.cx, sheet.lift, frame.wrist)
  const { strokes } = scriptAt(sheet.ink)
  const seal = bilinear(corners, 0.84, 0.26)
  const sealScale = lerp(0.55, 1.6, sheet.lift)
  return (
    <g>
      <polygon ref={sheetRef} points={pointsOf(corners)} fill="#ffffff" stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
      {/* 세웠을 때만 보이는 줄 간격 */}
      {sheet.lift > 0.6 &&
        [0.72, 0.56, 0.4].map((v) => {
          const a = bilinear(corners, 0.12, v)
          const b = bilinear(corners, 0.88, v)
          return (
            <line
              key={v}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#e6e0dc"
              strokeWidth={0.75}
              opacity={(sheet.lift - 0.6) / 0.4}
            />
          )
        })}
      {sheet.ink > 0 &&
        strokes.map((stroke, index) =>
          stroke.length > 1 ? (
            <polyline
              key={index}
              points={pointsOf(stroke.map(([u, v]) => bilinear(corners, u, v)))}
              fill="none"
              stroke={INK}
              strokeWidth={0.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null,
        )}
      {sheet.stamp > 0 && (
        <circle
          cx={seal.x}
          cy={seal.y}
          r={2.6 * sealScale * sheet.stamp}
          fill={BRAND}
          opacity={0.9}
        />
      )}
    </g>
  )
}

function Arm({ frame }: { frame: SceneFrame }) {
  const { elbow, wrist } = solveArm(frame.wrist)
  const { shoulder, base } = ARM
  return (
    <g>
      {/* 받침대 */}
      <path
        d={`M ${base.x - 22} 268 L ${base.x - 15} ${shoulder.y + 26} L ${base.x + 15} ${shoulder.y + 26} L ${base.x + 22} 268 Z`}
        fill="#ffffff"
        stroke={LINE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <rect x={base.x - 30} y={264} width={60} height={6} fill={INK} />
      <rect x={base.x - 20} y={shoulder.y + 14} width={40} height={12} rx={2} fill="#ffffff" stroke={LINE} strokeWidth={1.5} />

      {/* 위팔 · 아래팔: 테두리 있는 캡슐 */}
      {[
        [shoulder, elbow, 15],
        [elbow, wrist, 12],
      ].map(([from, to, width], index) => {
        const a = from as Point
        const b = to as Point
        return (
          <g key={index} strokeLinecap="round">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={(width as number) + 3} />
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeWidth={width as number} />
          </g>
        )
      })}

      {/* 관절 */}
      {[shoulder, elbow].map((joint, index) => (
        <g key={index}>
          <circle cx={joint.x} cy={joint.y} r={index === 0 ? 11 : 9} fill="#ffffff" stroke={INK} strokeWidth={1.5} />
          <circle cx={joint.x} cy={joint.y} r={3} fill={BRAND} />
        </g>
      ))}

      {/* 손목 + 도구 (항상 아래를 향한다) */}
      <Tool frame={frame} />
    </g>
  )
}

/**
 * 컨베이어 위에서 로봇팔이 종이를 다루는 선화 장면. 움직임은 frame 으로만 정해지고
 * (시간 계산은 scenes.ts), 이 컴포넌트는 그리기만 한다.
 */
export function ArmScene({
  frame,
  sheetRef,
  className,
  label,
}: {
  frame: SceneFrame
  sheetRef?: Ref<SVGPolygonElement>
  className?: string
  label: string
}) {
  const lifted = (frame.sheet?.lift ?? 0) > 0.05
  return (
    <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className={className} role="img" aria-label={label}>
      <line x1={0} y1={268.5} x2={VIEW.width} y2={268.5} stroke="#e6e0dc" strokeWidth={1} />
      <Arm frame={{ ...frame, sheet: null }} />
      <Belt offset={frame.belt} />
      {/* 벨트에 누운 종이는 팔 받침대보다 앞, 들어 올린 종이는 팔에 매달려 보이도록 팔과 함께 다시 그린다 */}
      {!lifted && <Sheet frame={frame} sheetRef={sheetRef} />}
      {(lifted || frame.wrist.y + ARM.pen > BELT.y - BELT.depthY - 4) && <ArmFront frame={frame} />}
      {lifted && <Sheet frame={frame} sheetRef={sheetRef} />}
      {lifted && <Tool frame={frame} />}
    </svg>
  )
}

/** 벨트 앞으로 내려온 아래팔과 도구 (벨트에 가려지지 않게 다시 그림) */
function ArmFront({ frame }: { frame: SceneFrame }) {
  const { elbow, wrist } = solveArm(frame.wrist)
  return (
    <g strokeLinecap="round">
      <line x1={elbow.x} y1={elbow.y} x2={wrist.x} y2={wrist.y} stroke={INK} strokeWidth={15} />
      <line x1={elbow.x} y1={elbow.y} x2={wrist.x} y2={wrist.y} stroke="#ffffff" strokeWidth={12} />
      <circle cx={elbow.x} cy={elbow.y} r={9} fill="#ffffff" stroke={INK} strokeWidth={1.5} />
      <circle cx={elbow.x} cy={elbow.y} r={3} fill={BRAND} />
      <Tool frame={frame} />
    </g>
  )
}

/** 손목 + 집게/펜만 */
function Tool({ frame }: { frame: SceneFrame }) {
  const { wrist } = solveArm(frame.wrist)
  const open = lerp(7, 2.5, frame.grip)
  return (
    <g>
      <rect x={wrist.x - 7} y={wrist.y - 5} width={14} height={11} rx={2} fill="#ffffff" stroke={INK} strokeWidth={1.5} />
      {frame.tool === 'gripper' ? (
        <g stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none">
          <path d={`M ${wrist.x - 3} ${wrist.y + 6} L ${wrist.x - open} ${wrist.y + 12} L ${wrist.x - open + 1} ${wrist.y + ARM.grip}`} />
          <path d={`M ${wrist.x + 3} ${wrist.y + 6} L ${wrist.x + open} ${wrist.y + 12} L ${wrist.x + open - 1} ${wrist.y + ARM.grip}`} />
        </g>
      ) : (
        <g>
          <rect x={wrist.x - 2.6} y={wrist.y + 6} width={5.2} height={ARM.pen - 12} fill={INK} rx={1} />
          <rect x={wrist.x - 2.6} y={wrist.y + 10} width={5.2} height={5} fill={BRAND} />
          <path d={`M ${wrist.x - 2.6} ${wrist.y + ARM.pen - 6} L ${wrist.x} ${wrist.y + ARM.pen} L ${wrist.x + 2.6} ${wrist.y + ARM.pen - 6} Z`} fill={INK} />
        </g>
      )}
    </g>
  )
}
