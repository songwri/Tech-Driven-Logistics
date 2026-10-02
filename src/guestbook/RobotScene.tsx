import type { Ref } from 'react'
import { ARM, BELT, BODY, VIEW, bilinear, clamp01, lerp, scriptAt, sheetCorners, solveArm, type Point } from './robot'

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

const PANEL = '#f3f0ee'

/** 몸에서 떨어진 둥근 캡슐(팔 한 마디): 잉크 테두리 + 흰 면 */
function Limb({ from, to, width }: { from: Point; to: Point; width: number }) {
  return (
    <g strokeLinecap="round">
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={INK} strokeWidth={width + 3} />
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#ffffff" strokeWidth={width} />
    </g>
  )
}

function Joint({ at, r }: { at: Point; r: number }) {
  return (
    <g>
      <circle cx={at.x} cy={at.y} r={r} fill="#ffffff" stroke={INK} strokeWidth={1.5} />
      <circle cx={at.x} cy={at.y} r={Math.max(1.6, r * 0.32)} fill={BRAND} />
    </g>
  )
}

/** 머리: 둥근 헬멧 + 어두운 바이저. 눈은 손(펜 · 집게)이 있는 쪽을 바라본다. */
function Head({ look }: { look: Point }) {
  const { x, y } = BODY.head
  // 시선: 손목이 머리에서 얼마나 떨어져 있는지에 따라 눈을 바이저 안에서 옮긴다.
  const dx = clamp01((look.x - x + 140) / 280) * 2 - 1
  const dy = clamp01((look.y - y + 60) / 160) * 2 - 1
  const eyeX = x + dx * 4.5
  const eyeY = y + 1 + dy * 1.8
  return (
    <g>
      {/* 목 */}
      <rect x={x - 5} y={y + 16} width={10} height={12} fill={PANEL} stroke={LINE} strokeWidth={1.25} />
      {[y + 20, y + 24].map((line) => (
        <line key={line} x1={x - 5} y1={line} x2={x + 5} y2={line} stroke={LINE} strokeWidth={0.75} />
      ))}
      {/* 귀 센서 */}
      {[-1, 1].map((side) => (
        <g key={side}>
          <rect x={x + side * 19 - 3} y={y - 6} width={6} height={12} rx={2} fill="#ffffff" stroke={INK} strokeWidth={1.25} />
          <circle cx={x + side * 19} cy={y} r={1.4} fill={BRAND} />
        </g>
      ))}
      {/* 헬멧 */}
      <rect x={x - 17} y={y - 19} width={34} height={37} rx={13} fill="#ffffff" stroke={INK} strokeWidth={1.5} />
      <path d={`M ${x - 9} ${y - 19} Q ${x} ${y - 23} ${x + 9} ${y - 19}`} fill="none" stroke={LINE} strokeWidth={1} />
      {/* 바이저 */}
      <rect x={x - 13} y={y - 7} width={26} height={15} rx={7} fill={INK} />
      {[-1, 1].map((side) => (
        <rect key={side} x={eyeX + side * 5 - 2.4} y={eyeY - 2.2} width={4.8} height={4.4} rx={2.2} fill="#ffffff" />
      ))}
      {/* 턱선 */}
      <line x1={x - 7} y1={y + 13} x2={x + 7} y2={y + 13} stroke={LINE} strokeWidth={1} strokeLinecap="round" />
    </g>
  )
}

/** 몸통 · 쉬는 팔 · 다리. 컨베이어 뒤에 서 있어 허리는 벨트에 가려지고 다리는 벨트 아래로 보인다. */
function Body({ look }: { look: Point }) {
  const cx = BODY.x
  const restShoulder = { x: cx + 24, y: ARM.shoulder.y }
  const restElbow = { x: cx + 34, y: 150 }
  const restHand = { x: cx + 31, y: 184 }
  const ground = BODY.ground
  return (
    <g strokeLinejoin="round">
      {/* 다리 (벨트 아래로 보이는 부분) */}
      {[-1, 1].map((side) => {
        const lx = cx + side * 9
        return (
          <g key={side}>
            <rect x={lx - 6} y={190} width={12} height={ground - 196} rx={4} fill="#ffffff" stroke={INK} strokeWidth={1.5} />
            <circle cx={lx} cy={236} r={4.5} fill="#ffffff" stroke={INK} strokeWidth={1.25} />
            <path
              d={`M ${lx - 8 + side * 1} ${ground} L ${lx - 7} ${ground - 7} L ${lx + 7} ${ground - 7} L ${lx + 10 + side * 1} ${ground} Z`}
              fill={INK}
            />
          </g>
        )
      })}
      {/* 골반 */}
      <rect x={cx - 17} y={170} width={34} height={22} rx={6} fill={PANEL} stroke={INK} strokeWidth={1.5} />

      {/* 쉬는 팔 (몸통 뒤) */}
      <Limb from={restShoulder} to={restElbow} width={10} />
      <Limb from={restElbow} to={restHand} width={9} />
      <Joint at={restElbow} r={5} />
      <rect x={restHand.x - 6} y={restHand.y - 3} width={12} height={10} rx={3} fill="#ffffff" stroke={INK} strokeWidth={1.5} />

      {/* 몸통: 어깨가 넓고 허리로 좁아지는 판 */}
      <path
        d={`M ${cx - 28} ${102} Q ${cx - 30} ${94} ${cx - 20} ${93} L ${cx + 20} ${93} Q ${cx + 30} ${94} ${cx + 28} ${102}
            L ${cx + 18} ${172} L ${cx - 18} ${172} Z`}
        fill="#ffffff"
        stroke={INK}
        strokeWidth={1.5}
      />
      {/* 가슴판 · 복부 마디 */}
      <path
        d={`M ${cx - 17} 104 L ${cx + 17} 104 L ${cx + 13} 140 L ${cx - 13} 140 Z`}
        fill={PANEL}
        stroke={LINE}
        strokeWidth={1}
      />
      {[150, 158].map((line) => (
        <line key={line} x1={cx - 14 + (line - 150) * 0.2} y1={line} x2={cx + 14 - (line - 150) * 0.2} y2={line} stroke={LINE} strokeWidth={0.9} />
      ))}
      {/* 가슴 코어: 브랜드 색 한 점 */}
      <circle cx={cx} cy={120} r={6} fill="#ffffff" stroke={INK} strokeWidth={1.25} />
      <circle cx={cx} cy={120} r={2.6} fill={BRAND} />

      <Head look={look} />

      {/* 어깨 (쉬는 팔) */}
      <Joint at={restShoulder} r={8} />
    </g>
  )
}

/** 일하는 팔: 어깨 → 팔꿈치 → 손. 손에는 펜이나 집게(손가락)를 든다. */
function Arm({ frame }: { frame: SceneFrame }) {
  const { elbow, wrist } = solveArm(frame.wrist)
  const { shoulder } = ARM
  return (
    <g>
      <Body look={wrist} />
      <Limb from={shoulder} to={elbow} width={11} />
      <Limb from={elbow} to={wrist} width={10} />
      <Joint at={shoulder} r={9} />
      <Joint at={elbow} r={6} />
      <Tool frame={frame} />
    </g>
  )
}

/**
 * 컨베이어 뒤에 선 휴머노이드 로봇이 종이를 다루는 선화 장면. 움직임은 frame 으로만 정해지고
 * (시간 계산은 scenes.ts), 이 컴포넌트는 그리기만 한다.
 */
export function RobotScene({
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

/** 벨트 앞으로 내려온 아래팔과 손 (벨트에 가려지지 않게 다시 그림) */
function ArmFront({ frame }: { frame: SceneFrame }) {
  const { elbow, wrist } = solveArm(frame.wrist)
  return (
    <g>
      <Limb from={elbow} to={wrist} width={10} />
      <Joint at={elbow} r={6} />
      <Tool frame={frame} />
    </g>
  )
}

/** 손 + 펜, 또는 손가락 집게 */
function Tool({ frame }: { frame: SceneFrame }) {
  const { wrist } = solveArm(frame.wrist)
  const open = lerp(7, 2.5, frame.grip)
  return (
    <g>
      {frame.tool === 'gripper' ? (
        <g stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d={`M ${wrist.x - 3} ${wrist.y + 6} L ${wrist.x - open} ${wrist.y + 12} L ${wrist.x - open + 1} ${wrist.y + ARM.grip}`} />
          <path d={`M ${wrist.x + 3} ${wrist.y + 6} L ${wrist.x + open} ${wrist.y + 12} L ${wrist.x + open - 1} ${wrist.y + ARM.grip}`} />
        </g>
      ) : (
        <g>
          <rect x={wrist.x - 2.6} y={wrist.y + 6} width={5.2} height={ARM.pen - 12} fill={INK} rx={1} />
          <rect x={wrist.x - 2.6} y={wrist.y + 12} width={5.2} height={5} fill={BRAND} />
          <path d={`M ${wrist.x - 2.6} ${wrist.y + ARM.pen - 6} L ${wrist.x} ${wrist.y + ARM.pen} L ${wrist.x + 2.6} ${wrist.y + ARM.pen - 6} Z`} fill={INK} />
        </g>
      )}
      {/* 손바닥: 펜 · 손가락보다 앞에 그려 쥐고 있는 것처럼 보이게 */}
      <rect x={wrist.x - 7} y={wrist.y - 5} width={14} height={12} rx={4} fill="#ffffff" stroke={INK} strokeWidth={1.5} />
      <line x1={wrist.x - 4} y1={wrist.y + 3} x2={wrist.x + 4} y2={wrist.y + 3} stroke={LINE} strokeWidth={0.9} strokeLinecap="round" />
    </g>
  )
}
