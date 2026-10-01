import { useEffect, useRef, useState } from 'react'
import type { SceneFrame } from './ArmScene'
import { ARM, REST, along, bilinear, ease, lerp, onSheet, scriptAt, sheetCorners, span, type Point } from './robot'

/** 종이가 멈춰 서는 위치(종이 중심 x) */
const STATION = 214
const ENTER = -50
const EXIT = 560

/** 손목이 종이 위 (u, v) 지점에 펜 끝을 대는 위치 */
const penOn = (cx: number, u: number, v: number, raise = 0): Point => {
  const tip = onSheet(cx, u, v)
  return { x: tip.x, y: tip.y - ARM.pen - raise }
}

/**
 * 머리말 장면 (반복): 빈 종이가 들어오고 → 로봇팔이 펜으로 글을 쓰고 → 도장을 찍고 → 컨베이어로 흘려보낸다.
 */
export function heroFrame(t: number): SceneFrame {
  const cx =
    t < 0.16 ? lerp(ENTER, STATION, ease(span(t, 0, 0.16))) : t < 0.68 ? STATION : lerp(STATION, EXIT, ease(span(t, 0.68, 1)) * 0.6 + span(t, 0.68, 1) * 0.4)

  const writing = span(t, 0.24, 0.58)
  const { tip, lifting } = scriptAt(writing)
  const start = penOn(STATION, 0.14, 0.78, 8)
  const seal = penOn(STATION, 0.84, 0.26, 0)

  let wrist: Point
  if (t < 0.12) wrist = REST
  else if (t < 0.24) wrist = along(t, [[0.12, REST], [0.21, start], [0.24, penOn(STATION, 0.14, 0.78)]])
  else if (t < 0.58) wrist = penOn(STATION, tip[0], tip[1], lifting ? 5 : 0)
  else if (t < 0.66)
    wrist = along(t, [
      [0.58, penOn(STATION, tip[0], tip[1], 0)],
      [0.61, { x: seal.x, y: seal.y - 8 }],
      [0.625, seal],
      [0.66, { x: seal.x, y: seal.y - 14 }],
    ])
  else wrist = along(t, [[0.66, { x: seal.x, y: seal.y - 14 }], [0.76, REST]])

  return {
    wrist,
    grip: 0,
    tool: 'pen',
    sheet: { cx, lift: 0, ink: writing, stamp: ease(span(t, 0.615, 0.64)) },
    belt: cx,
  }
}

/** 작성 시작: 빈 종이가 들어오고 → 집게로 집어 → 들어 올려 보여준다. */
export function introFrame(t: number): SceneFrame {
  const cx = lerp(ENTER, STATION, ease(span(t, 0, 0.34)))
  const center = bilinear(sheetCorners(STATION, 0, REST), 0.5, 0.5)
  const grab = { x: center.x, y: center.y - ARM.grip + 1 }
  const show = { x: 212, y: 86 }
  const wrist = along(t, [
    [0, REST],
    [0.3, { x: grab.x, y: grab.y - 34 }],
    [0.44, grab],
    [0.54, grab],
    [0.82, show],
  ])
  return {
    wrist,
    grip: ease(span(t, 0.44, 0.53)),
    tool: 'gripper',
    sheet: { cx, lift: span(t, 0.56, 0.82), ink: 0, stamp: 0 },
    belt: cx,
  }
}

/** 작성 완료: 다 쓴 종이를 벨트에 내려놓고 → 도장이 찍힌 채로 컨베이어를 따라 나간다. */
export function outroFrame(t: number): SceneFrame {
  const center = bilinear(sheetCorners(STATION, 0, REST), 0.5, 0.5)
  const place = { x: center.x, y: center.y - ARM.grip + 1 }
  const show = { x: 212, y: 86 }
  const wrist = along(t, [
    [0, show],
    [0.34, place],
    [0.44, place],
    [0.66, REST],
  ])
  const cx = t < 0.46 ? STATION : lerp(STATION, EXIT, ease(span(t, 0.46, 1)))
  return {
    wrist,
    grip: 1 - ease(span(t, 0.36, 0.44)),
    tool: 'gripper',
    sheet: { cx, lift: 1 - span(t, 0.06, 0.34), ink: 1, stamp: 1 },
    belt: cx,
  }
}

/**
 * 시간 진행률 t(0~1)를 매 프레임 돌려준다. loop 면 계속 반복, 아니면 끝에서 onDone.
 * playing 이 false 면 멈춘 자리에서 그대로 둔다.
 */
export function useTimeline({
  duration,
  playing,
  loop = false,
  onDone,
}: {
  duration: number
  playing: boolean
  loop?: boolean
  onDone?: () => void
}) {
  const [t, setT] = useState(0)
  const elapsed = useRef(0)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    let finished = false
    const tick = (now: number) => {
      elapsed.current += Math.min(now - last, 64)
      last = now
      let next = elapsed.current / duration
      if (loop) next %= 1
      else if (next >= 1) {
        next = 1
        finished = true
      }
      setT(next)
      if (finished) done.current?.()
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, duration, loop])

  return t
}
