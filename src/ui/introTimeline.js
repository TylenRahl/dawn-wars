// THE INTRO, AS NUMBERS: every cue time and every position of the opening film, as pure
// functions of the song's time. Exports CUES, END, the cube net (F, COLS, ROWS, FACES...) and the
// "...At(t)" functions; src/ui/intro.js and src/ui/introScenes.js draw from them, and
// introTimeline.test.js checks them.
//
// The story: a black screen and a tiny spinning cube that grows and unpacks (about 9 s) into a
// small world seen from above; the title at 10-11 s; an airship drops in at 13 s and flies north
// over lands and seas into the snowy mountains, landing by a castle at 51 s. Then the walk to the
// throne room, the reels, the clash on the table, and the world folding away until the buttons
// drop at 2:27.
//
// Against Imperio Antiguo (147.6 s, src/ui/music.js), which ends as the buttons come.
//
// HOW IT MOVES. The world is a CUBE NET: six squares of side F laid out flat as a T, three across
// the south row and a column of three going north from its middle. Folded, it is the spinning
// cube; unfolded, it is the ground the airship flies over, drawn as a flat map
// tilted away into the distance, with the airship a sprite near the middle of the screen. Every function here takes only the song's time, so
// a jump to any second (?intro=at:N) draws that second correctly. Nothing here draws:
// src/ui/intro.js does. Distances are world units ("u"); a field is about 9 u.

export const F = 64            // a cube face's side, in u
export const COLS = 3
export const ROWS = 4          // the net is 3 by 4 cells; row 0 is the north, row 3 the south

// The six faces of the T, as [column, row]. The base (the cube's bottom) is the south middle.
export const BASE = [1, 3]
export const FACES = [[0, 3], [1, 3], [2, 3], [1, 2], [1, 1], [1, 0]]
export const isFace = (c, r) => FACES.some(([a, b]) => a === c && b === r)

// ---- the cues, in seconds of the song --------------------------------------------------------
export const CUES = {
  cubeFrom: 0,          // black, the tiny cube spinning
  unfoldFrom: 7,        // grown, it starts to open
  unfolded: 9,          // the net lies flat
  title: 10.5,          // the game's name appears
  shipDrops: 13,
  shipInSlot: 15.5,     // the drop takes two and a half seconds
  cruise: 18,           // the camera has swung in behind the ship
  landingFrom: 46,      // slowing over the castle's open ground
  landed: 51,           // down by the castle
  // part 2: the walk to the castle and the throne room
  walkFrom: 51.8,       // down from the ship, between the two lines of halberdiers
  gate: 56.6,           // the gate's shadow at the top of the corridor; in they go
  throneFrom: 58,       // the throne room
  goodInPlace: 63.5,    // the good heroes have walked up and taken the right-hand side
  ballFrom: 65,         // the king starts to gather the energy
  ballBursts: 68.4,     // and lets it go
  energy: 70,           // the king's ball of energy fills the screen
  // part 3: the reels, the table, the clash
  reelsIn: 70.8,        // the white gives way to the split screen
  reelsStop: 90,        // 1:30, the last reel stops on the good side's head
  tableFrom: 91,        // the screen fades to the game table
  clash: 100,           // 1:40, the units charge
  meet: 102,            // the lines meet
  whiteOut: 104.8,      // and all goes to white
  flyAgain: 105,
  jets: 120,            // the airship lights its jets
  folded: 136,          // the world is a cube again
  jetOff: 141,
  shipGone: 145,
  buttons: 147          // 2:27, the menu buttons drop down
}
export const END = 148.5   // the buttons have landed; the song ended at 147.6

// ---- easing ------------------------------------------------------------------------------------
export const clamp01 = x => Math.max(0, Math.min(1, x))
export const smooth = x => { const k = clamp01(x); return k * k * (3 - 2 * k) }
const span = (t, a, b) => clamp01((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k

// ---- the cube ----------------------------------------------------------------------------------
// unfold: 0 folded, 1 flat. Each hinge stands up by 90 degrees times (1 - unfold).
export function unfoldAt (t) {
  if (t < CUES.unfoldFrom) return 0
  if (t < CUES.jets) return smooth(span(t, CUES.unfoldFrom, CUES.unfolded))
  return 1 - smooth(span(t, CUES.jets + 2, CUES.folded))
}

// Where a point (x, y) of the flat net is in 3-D (z up) at a given unfold, or null for a point
// off the six faces. The base lies flat; the west and east squares hinge on its sides; the
// column north of it is a chain of hinges, each one folding a further 90 degrees, so it becomes
// the north wall, the lid and the south wall.
export function netPoint (x, y, unfold) {
  const th = (1 - unfold) * Math.PI / 2
  const c = Math.floor(x / F), r = Math.floor(y / F)
  const cl = Math.min(COLS - 1, Math.max(0, c)), rl = Math.min(ROWS - 1, Math.max(0, r))
  if (!isFace(cl, rl)) return null
  const x0 = BASE[0] * F, x1 = x0 + F, yN = BASE[1] * F
  if (rl === BASE[1]) {
    if (cl === 0) { const d = x0 - x; return [x0 - d * Math.cos(th), y, d * Math.sin(th)] }
    if (cl === 2) { const d = x - x1; return [x1 + d * Math.cos(th), y, d * Math.sin(th)] }
    return [x, y, 0]
  }
  // the column north of the base
  let d = yN - y, py = yN, pz = 0, k = 1
  while (d > F) { py -= F * Math.cos(k * th); pz += F * Math.sin(k * th); d -= F; k++ }
  return [x, py - d * Math.cos(k * th), pz + d * Math.sin(k * th)]
}

// The folded cube's middle, and the base's middle on the ground
export const CUBE_CENTRE = [BASE[0] * F + F / 2, BASE[1] * F + F / 2, F / 2]

// ---- the airship -------------------------------------------------------------------------------
export const LAND = [1.5 * F, 36]          // the open ground south of the castle
const START = [1.5 * F, BASE[1] * F + F / 2]
const FLY_FROM = CUES.shipInSlot - 0.5, ACCEL = 3, DECEL = 5
// the distance flown, 0 to 1: speeding up, a steady cruise, slowing to land
function progress (t) {
  const T = CUES.landed - FLY_FROM
  const v = 1 / (T - ACCEL / 2 - DECEL / 2)
  const u = t - FLY_FROM
  if (u <= 0) return 0
  if (u < ACCEL) return v * u * u / (2 * ACCEL)
  if (u < T - DECEL) return v * (ACCEL / 2 + (u - ACCEL))
  if (u < T) { const w = T - u; return 1 - v * w * w / (2 * DECEL) }
  return 1
}
// the ground under the ship: north, swinging gently east and west on the way
function groundAt (t) {
  const s = progress(t)
  const y = lerp(START[1], LAND[1], s)
  const x = START[0] + 18 * Math.sin(s * Math.PI * 2.2) * Math.sin(s * Math.PI)
  return [x, y]
}
// part 4: round the world again, a wide circle over the farmland, the coast and the sea
const LOOP = { c: [1.5 * F, 2.6 * F], r: 52, from: -0.4, speed: 0.13 }   // radians a second
function loopAt (t) {
  const a = LOOP.from + LOOP.speed * (t - CUES.flyAgain)
  return [LOOP.c[0] + Math.cos(a) * LOOP.r, LOOP.c[1] + Math.sin(a) * LOOP.r]
}
export function shipAt (t) {
  const path = t >= CUES.flyAgain ? loopAt : groundAt
  const [x, y] = path(t)
  const [x2, y2] = path(t + 0.25)
  const moving = Math.hypot(x2 - x, y2 - y) > 1e-4
  const yaw = moving ? Math.atan2(x2 - x, -(y2 - y)) : 0
  // cruising height 10 u; down to the snow over the last three seconds
  const alt = t >= CUES.flyAgain ? 10 : 10 * (1 - smooth(span(t, CUES.landed - 3, CUES.landed)))
  // the drop from the top of the screen: 0 above the screen, 1 in its place
  const drop = smooth(span(t, CUES.shipDrops, CUES.shipInSlot))
  return { x, y, alt, yaw, drop, seen: t >= CUES.shipDrops }
}

// ---- the camera --------------------------------------------------------------------------------
// An orbit camera: it looks at `target` from `dist` away, along heading `yaw` (0 = north, the
// screen's up) and `pitch` below the horizontal (90 = straight down).
const TOP = { target: [START[0], START[1] - 2, 0], dist: 100, yaw: 0, pitch: Math.PI / 2 }
function chase (t) {
  const s = shipAt(t)
  const lead = 26
  return { target: [s.x + Math.sin(s.yaw) * lead, s.y - Math.cos(s.yaw) * lead, 0], dist: 82, yaw: s.yaw, pitch: 0.42 }
}
const LANDING = { target: [LAND[0], LAND[1] - 4, 0], dist: 74, yaw: 0, pitch: 0.95 }
const DOWN = { target: [LAND[0], LAND[1] + 6, 0], dist: 34, yaw: 0, pitch: 1.35 }   // in close over the ship, the castle out of sight above
function mix (a, b, k) {
  return { target: a.target.map((v, i) => lerp(v, b.target[i], k)), dist: lerp(a.dist, b.dist, k), yaw: lerp(a.yaw, b.yaw, k), pitch: lerp(a.pitch, b.pitch, k) }
}
// part 4's camera: behind the ship round the world, then back and up and away from the planet
// as it folds, going slowly round it; the folded cube flying off into the distance
const PULL_FROM = CUES.jets - 1, PULL_TO = CUES.jets + 4
function away (t) {
  const yaw0 = shipAt(PULL_FROM).yaw
  const far = smooth(span(t, CUES.folded, CUES.jetOff))
  return { target: CUBE_CENTRE, dist: 240 * Math.pow(7000 / 240, far), yaw: yaw0 + 0.22 * (t - PULL_FROM), pitch: 0.62 - 0.2 * smooth(span(t, PULL_TO, CUES.folded)) }
}
export function cameraAt (t) {
  if (t >= CUES.flyAgain) {
    if (t < PULL_FROM) return chase(t)
    // (the orbit starts from the chase's own heading, so the two never turn apart)
    const c = chase(t), a = away(t)
    return mix(c, a, smooth(span(t, PULL_FROM, PULL_TO)))
  }
  if (t < CUES.unfolded) {
    // the cube far off, spinning (the camera going round it three times), coming close; then
    // straight down over the base while it opens
    const grow = smooth(span(t, 0, CUES.unfoldFrom))
    const dist = 6000 * Math.pow(170 / 6000, Math.sqrt(grow))
    const spin = 6 * Math.PI * (1 - Math.pow(1 - clamp01(t / CUES.unfolded), 2))
    const tumble = 0.6 + 0.25 * Math.sin(t * 1.7)
    const orbit = { target: CUBE_CENTRE, dist, yaw: spin, pitch: tumble }
    return mix(orbit, TOP, smooth(span(t, CUES.unfoldFrom, CUES.unfolded)))
  }
  if (t < CUES.shipDrops) return { ...TOP, target: [TOP.target[0], TOP.target[1] - (t - CUES.unfolded) * 0.5, 0] }
  const top = { ...TOP, target: [TOP.target[0], TOP.target[1] - (CUES.shipDrops - CUES.unfolded) * 0.5, 0] }
  if (t < CUES.cruise) return mix(top, chase(t), smooth(span(t, CUES.shipInSlot - 1, CUES.cruise)))
  if (t < CUES.landingFrom) return chase(t)
  if (t < CUES.landed) return mix(chase(t), LANDING, smooth(span(t, CUES.landingFrom, CUES.landed)))
  return mix(LANDING, DOWN, smooth(span(t, CUES.landed, CUES.walkFrom + 0.8)))
}

// ---- part 2: the walk and the throne room (drawn in screen space, in tokens: one token is
// one 25 mm model's picture) -----------------------------------------------------------------
// how far each picture shows (0 to 1), the old over the new
export function sceneFade (t) {
  if (t < CUES.walkFrom) return { world: 1, walk: 0, throne: 0 }
  const walkIn = smooth(span(t, CUES.walkFrom, CUES.walkFrom + 0.8))
  const walkOut = smooth(span(t, CUES.gate + 0.6, CUES.throneFrom))   // the gate's dark swallows the picture
  const throneIn = smooth(span(t, CUES.throneFrom, CUES.throneFrom + 0.8))
  return { world: t >= CUES.flyAgain ? 1 : 1 - walkIn, walk: walkIn * (1 - walkOut), throne: throneIn }
}
export const CORRIDOR = 13    // tokens long, from the ship to the gate
// the heroes' walk: how many tokens up the corridor the leading pair is
export function walkAt (t) {
  const k = span(t, CUES.walkFrom, CUES.gate + 0.9)
  return { along: -1 + (CORRIDOR + 1) * k, step: t * 2.6, gate: smooth(span(t, CUES.gate - 2.4, CUES.gate)) }
}
// the throne room: the good heroes' entrance (along the carpet, then aside to the right, then
// turning to face the evil ones across the hall), and the king's ball of energy
export function throneAt (t) {
  const enter = span(t, CUES.throneFrom + 0.3, CUES.throneFrom + 3.6)
  const aside = smooth(span(t, CUES.throneFrom + 3.2, CUES.goodInPlace - 0.6))
  const turn = smooth(span(t, CUES.goodInPlace - 0.9, CUES.goodInPlace))
  const gather = smooth(span(t, CUES.ballFrom, CUES.ballBursts))
  const burst = span(t, CUES.ballBursts, CUES.energy)
  // the ball's radius in screen heights: small and crackling in his hands, then the whole screen
  const ball = gather * 0.07 + burst * burst * 1.4
  return { enter, aside, turn, gather, ball, white: smooth(span(t, CUES.energy - 0.7, CUES.energy)), zoom: 1 + 0.12 * smooth(span(t, CUES.throneFrom, CUES.energy)) }
}

// ---- the weather -------------------------------------------------------------------------------
// how hard it snows over ground y: none south of the mountains, full over the castle
export const snowAt = y => smooth((112 - y) / 60)
// the filler cells (the six squares of the 3 by 4 that are not faces) and the land beyond the
// net show only once the world has opened: 0 hidden in black, 1 seen
export const worldAt = t => t < CUES.jets ? smooth(span(t, CUES.unfolded, CUES.unfolded + 2)) : 1 - smooth(span(t, CUES.jets, CUES.jets + 2))

// ---- part 3: the reels, the table, the clash -------------------------------------------------
// Four reels a side, each flashing as it stops:
// eight stops, evil and good in turn, from 1:15 to 1:30, the last (the good side's head) at 1:30.
// A reel's position is in symbols: symbol i sits on the middle line when the position is i, and
// the symbols run down the screen as it grows.
export const REELS = 4                 // a side; the last of each side's is its head
export const FIRST_STOP = 75           // 1:15
const REEL_GAP = (CUES.reelsStop - FIRST_STOP) / (2 * REELS - 1)
// REEL_STOPS[side][reel]: side 0 evil, 1 good
export const REEL_STOPS = [0, 1].map(side => Array.from({ length: REELS }, (_, r) => FIRST_STOP + REEL_GAP * (r * 2 + side)))
const REEL_SPEED = 11, REEL_SLOW = 1.6   // symbols a second; seconds to slow to a stop
export function reelAt (t, reel, final, side = 0) {
  const ts = REEL_STOPS[side][reel]
  if (t >= ts) {
    // a small kick back on stopping, as a real reel's
    const k = t - ts
    return final - 0.12 * Math.sin(k * 14) * Math.exp(-k * 6)
  }
  if (t >= ts - REEL_SLOW) { const w = ts - t; return final - REEL_SPEED * w * w / (2 * REEL_SLOW) }
  return final - REEL_SPEED * REEL_SLOW / 2 - REEL_SPEED * (ts - REEL_SLOW - t)
}
// the flash when a reel stops: 1 at the moment it stops, gone in half a second
export const flashAt = (t, side, reel) => { const k = t - REEL_STOPS[side][reel]; return k < 0 || k > 0.6 ? 0 : 1 - k / 0.6 }
// a side's head, chosen: 0 until its reel stops, 1 once it has risen
export const chosenAt = (t, side) => smooth(span(t, REEL_STOPS[side][REELS - 1], REEL_STOPS[side][REELS - 1] + 0.4))
export function reelsAt (t) {
  return {
    show: smooth(span(t, CUES.energy, CUES.reelsIn)) * (1 - smooth(span(t, CUES.tableFrom - 0.2, CUES.tableFrom + 0.8))),
    white: 1 - smooth(span(t, CUES.energy, CUES.reelsIn))
  }
}
// the table: each side's units fade on one after another (evil and good in turn, the heads
// last), charge at 1:40, meet, and go to white
export const TABLE_UNITS = 8
export function tableAt (t) {
  const unit = j => smooth(span(t, CUES.tableFrom + 0.4 + j * 0.95, CUES.tableFrom + 1.3 + j * 0.95))
  return {
    show: smooth(span(t, CUES.tableFrom - 0.2, CUES.tableFrom + 0.8)),
    unit,
    charge: smooth(span(t, CUES.clash, CUES.meet)),
    fight: t >= CUES.meet ? t - CUES.meet : 0,
    white: smooth(span(t, CUES.meet + 0.6, CUES.whiteOut))
  }
}

// ---- part 4: the jets, the bubble, the fold, the jet-off, the buttons --------------------------
// At 2:00 the airship lights its jets and a bubble closes round it while the world folds back
// into a cube, folded by 2:16 and flying off among stars and planets. The airship jets off at
// 2:21, is gone to the right by 2:25, and the buttons drop at 2:27, still in space.
export const jetsAt = t => smooth(span(t, CUES.jets, CUES.jets + 0.8))
export const bubbleAt = t => smooth(span(t, CUES.jets + 0.4, CUES.jets + 2))
// the stars and planets: none in the black at the start; from the fold on, for good
export const spaceAt = t => t < CUES.jets ? 0 : smooth(span(t, CUES.jets + 1, CUES.jets + 4))
// the cube's way of drawing: from just after the jets light until the end
export const cubeView = t => t < CUES.unfolded || t >= CUES.jets + 2
// the ship on the screen once the world folds away: anchored in the lower middle (0 where the
// camera puts it, 1 anchored), then away to the right. x is in screen widths from the middle.
export function shipScreenAt (t) {
  const anchor = smooth(span(t, PULL_FROM + 0.5, PULL_TO - 1))
  const go = span(t, CUES.jetOff, CUES.shipGone)
  const x = go * go * go * 0.9           // speeding up all the way off the right edge
  const turn = smooth(span(t, CUES.jetOff - 0.8, CUES.jetOff + 0.4))
  return { anchor, x, turn, gone: t >= CUES.shipGone }
}
