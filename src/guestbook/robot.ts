/**
 * 방명록 장면(로봇팔 + 컨베이어)의 기하와 움직임 계산.
 * 화면 좌표는 SVG viewBox(0 0 480 280) 기준, y 는 아래로 커진다.
 * 로봇팔은 2관절 팔이라 손목 위치만 정하면 관절 각도를 역기구학으로 구한다.
 */

export const VIEW = { width: 480, height: 280 }

/** 컨베이어 벨트 윗면: 앞 모서리 y, 뒤 모서리는 (DEPTH_X, -DEPTH_Y) 만큼 비스듬히 */
export const BELT = { y: 204, depthX: 22, depthY: 18, thickness: 14 }

export const ARM = {
  base: { x: 404, y: 252 },
  shoulder: { x: 404, y: 112 },
  upper: 124,
  fore: 112,
  /** 손목에서 집게 끝까지 */
  grip: 22,
  /** 손목에서 펜 끝까지 */
  pen: 40,
}

/** 휴식 자세의 손목 위치 */
export const REST = { x: 300, y: 138 }

/** 종이(누운 상태) 크기: 벨트 위 가로 · 깊이 */
export const SHEET = { width: 58, depth: 14 }

/** 집어 올린 종이(세운 상태) 크기 */
export const HANGING = { width: 46, height: 60 }

export interface Point {
  x: number
  y: number
}

export interface ArmPose {
  elbow: Point
  wrist: Point
}

/** 손목 목표 위치 → 팔꿈치 위치. 팔꿈치가 위로 접히는 해를 고른다. */
export function solveArm(target: Point): ArmPose {
  const { shoulder, upper, fore } = ARM
  let dx = target.x - shoulder.x
  let dy = target.y - shoulder.y
  let distance = Math.hypot(dx, dy)
  const reach = upper + fore - 0.5
  if (distance > reach) {
    dx = (dx / distance) * reach
    dy = (dy / distance) * reach
    distance = reach
  }
  const base = Math.atan2(dy, dx)
  const cos = (upper * upper + distance * distance - fore * fore) / (2 * upper * distance)
  const offset = Math.acos(Math.max(-1, Math.min(1, cos)))
  const candidates = [base + offset, base - offset].map((angle) => ({
    x: shoulder.x + Math.cos(angle) * upper,
    y: shoulder.y + Math.sin(angle) * upper,
  }))
  const elbow = candidates[0].y < candidates[1].y ? candidates[0] : candidates[1]
  return { elbow, wrist: { x: shoulder.x + dx, y: shoulder.y + dy } }
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** 부드럽게 출발 · 정지하는 곡선 */
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** t 가 [from, to] 구간에서 차지하는 진행률 (0~1, 구간 밖은 끝값) */
export const span = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const lerpPoint = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })

/** 시간표 [시각, 위치] 를 따라 손목이 움직인다. 구간마다 부드럽게 출발 · 정지한다. */
export function along(t: number, keys: [number, Point][]): Point {
  if (t <= keys[0][0]) return keys[0][1]
  for (let index = 1; index < keys.length; index++) {
    const [time, point] = keys[index]
    if (t <= time) {
      const [prevTime, prevPoint] = keys[index - 1]
      return lerpPoint(prevPoint, point, ease(span(t, prevTime, time)))
    }
  }
  return keys[keys.length - 1][1]
}

/**
 * 벨트 윗면의 한 점. u 는 종이 왼쪽→오른쪽(0~1), v 는 앞→뒤(0~1).
 * cx 는 종이 중심의 x.
 */
export function onSheet(cx: number, u: number, v: number): Point {
  const left = cx - SHEET.width / 2 - (BELT.depthX * SHEET.depth) / BELT.depthY / 2
  return {
    x: left + u * SHEET.width + v * ((BELT.depthX * SHEET.depth) / BELT.depthY),
    y: BELT.y - 2 - v * SHEET.depth,
  }
}

/** 종이 위 손글씨 경로: (u, v) 점들. 세 줄을 흘려 쓴다. */
export const SCRIPT: [number, number][] = (() => {
  const points: [number, number][] = []
  const lines = [
    { v: 0.78, from: 0.14, to: 0.86 },
    { v: 0.5, from: 0.14, to: 0.8 },
    { v: 0.22, from: 0.14, to: 0.58 },
  ]
  lines.forEach((line) => {
    const steps = 22
    for (let step = 0; step <= steps; step++) {
      const u = lerp(line.from, line.to, step / steps)
      const wobble = Math.sin(step * 1.9) * 0.08 + Math.sin(step * 0.7) * 0.04
      points.push([u, line.v + wobble])
    }
  })
  return points
})()

/** 손글씨 경로를 progress(0~1) 만큼 따라간 펜 끝(u, v)과, 그때까지 쓴 획들(u, v). 줄을 바꿀 때는 펜을 든다. */
export function scriptAt(progress: number) {
  const total = SCRIPT.length - 1
  const exact = clamp01(progress) * total
  const index = Math.min(Math.floor(exact), total)
  const strokes: [number, number][][] = [[]]
  for (let i = 0; i <= index; i++) {
    if (i > 0 && i % 23 === 0) strokes.push([])
    strokes[strokes.length - 1].push(SCRIPT[i])
  }
  const next = SCRIPT[Math.min(index + 1, total)]
  const local = exact - index
  const lifting = (index + 1) % 23 === 0 && index < total
  const tip: [number, number] = [lerp(SCRIPT[index][0], next[0], local), lerp(SCRIPT[index][1], next[1], local)]
  if (!lifting && local > 0) strokes[strokes.length - 1].push(tip)
  return { tip, strokes, lifting }
}

export type Corners = [Point, Point, Point, Point]

/** 종이의 네 모서리 (앞왼쪽, 앞오른쪽, 뒤오른쪽, 뒤왼쪽). lift 0 은 벨트에 누운 상태, 1 은 집게에 매달려 선 상태. */
export function sheetCorners(cx: number, lift: number, wrist: Point): Corners {
  const lying: Corners = [onSheet(cx, 0, 0), onSheet(cx, 1, 0), onSheet(cx, 1, 1), onSheet(cx, 0, 1)]
  if (lift <= 0) return lying
  const top = wrist.y + ARM.grip - 9
  const half = HANGING.width / 2
  const hanging: Corners = [
    { x: wrist.x - half, y: top + HANGING.height },
    { x: wrist.x + half, y: top + HANGING.height },
    { x: wrist.x + half, y: top },
    { x: wrist.x - half, y: top },
  ]
  const t = ease(clamp01(lift))
  return lying.map((corner, index) => lerpPoint(corner, hanging[index], t)) as Corners
}

/** 종이 위 (u, v) → 화면 좌표 */
export function bilinear([fl, fr, br, bl]: Corners, u: number, v: number): Point {
  return lerpPoint(lerpPoint(fl, fr, u), lerpPoint(bl, br, u), v)
}
