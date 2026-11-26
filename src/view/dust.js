// THE DUST OF A COMBAT. Exports contactLines, puffsOf, starsOf and drawDust, used by view/board.js.
// The intro's clash (ui/introScenes.js, table(): "the fighting") raises pale puffs where the two
// lines meet; this raises them on the battle table
// along the edge where two engaged units touch, for as long as they are engaged, with a few clash stars
// popping in it (starsOf).
//
// Drawing only. It reads the engine's own record of who is fighting whom (u.status.engaged and
// u.engagedWith, set by rules/charge.js and read by rules/combat.js combatsToFight) and decides
// nothing. Everything here is in inches; view/board.js scales the layer like the rest of the world.

import { corners, isDead } from '../rules/units.js'

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y })
const len = v => Math.hypot(v.x, v.y)

// The two units' facing edges, if they lie along each other: the stretch where they overlap.
// Edges count as touching when they run opposite ways (within ~10 degrees) less than half an inch apart.
function edgeContact (a, b) {
  const ca = corners(a); const cb = corners(b)
  let best = null
  for (let i = 0; i < 4; i++) {
    const p = ca[i]; const q = ca[(i + 1) % 4]
    const dv = sub(q, p); const L = len(dv)
    if (L < 1e-6) continue
    const u = { x: dv.x / L, y: dv.y / L }
    for (let j = 0; j < 4; j++) {
      const r = cb[j]; const s = cb[(j + 1) % 4]
      const ev = sub(s, r); const M = len(ev)
      if (M < 1e-6) continue
      if ((u.x * ev.x + u.y * ev.y) / M > -0.98) continue
      // how far b's edge sits off a's edge line
      const off = Math.abs(u.x * (r.y - p.y) - u.y * (r.x - p.x))
      if (off > 0.5) continue
      // where b's edge runs along a's edge, measured from p
      const t1 = u.x * (r.x - p.x) + u.y * (r.y - p.y)
      const t2 = u.x * (s.x - p.x) + u.y * (s.y - p.y)
      const lo = Math.max(0, Math.min(t1, t2)); const hi = Math.min(L, Math.max(t1, t2))
      if (hi - lo < 0.1) continue
      if (!best || hi - lo > best.hi - best.lo) best = { p, u, lo, hi }
    }
  }
  if (!best) return null
  const { p, u, lo, hi } = best
  return { from: { x: p.x + u.x * lo, y: p.y + u.y * lo }, to: { x: p.x + u.x * hi, y: p.y + u.y * hi } }
}

// A corner against an edge (a charge that hit at an angle): a short stretch round the nearest pair of corners.
function cornerContact (a, b) {
  const ca = corners(a); const cb = corners(b)
  let best = null
  for (const p of ca) for (const q of cb) {
    const d = len(sub(p, q))
    if (!best || d < best.d) best = { p, q, d }
  }
  if (!best || best.d > 1.5) return null
  const m = { x: (best.p.x + best.q.x) / 2, y: (best.p.y + best.q.y) / 2 }
  return { from: { x: m.x - 0.5, y: m.y }, to: { x: m.x + 0.5, y: m.y } }
}

// Every touching pair of engaged units, once each: [{ from, to }] in inches. `skip(u)` leaves out a
// unit (one still gliding into contact, so the dust waits for it to arrive).
export function contactLines (units, skip = () => false) {
  const live = units.filter(u => u.placed && !u.status?.removed && !isDead(u))
  const byId = new Map(live.map(u => [String(u.id), u]))
  const out = []
  const done = new Set()
  for (const a of live) {
    if (!a.status?.engaged || skip(a)) continue
    for (const id of Object.keys(a.engagedWith || {})) {
      const b = byId.get(id)
      if (!b || skip(b)) continue
      const key = [String(a.id), String(b.id)].sort().join('|')
      if (done.has(key)) continue
      done.add(key)
      const line = edgeContact(a, b) || cornerContact(a, b)
      if (line) out.push({ ...line, key })
    }
  }
  return out
}

// A cheap fixed noise so each puff keeps its own size, place and pace from frame to frame.
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const seedOf = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 100003; return h }

// The puffs of one contact line at time `t` (seconds): [{ x, y, r, a }] — centre and radius in inches,
// `a` the opacity. Each puff swells from about half an inch to about two inches over its
// life, drifts off the line to one side or the other and fades; then it starts again elsewhere on
// the line. About one puff per inch of contact, never fewer than four.
export function puffsOf (line, t) {
  const d = sub(line.to, line.from); const L = Math.max(0.01, len(d))
  const u = { x: d.x / L, y: d.y / L }; const n = { x: -u.y, y: u.x }
  const seed = seedOf(line.key || '')
  const count = Math.max(4, Math.min(16, Math.round(L * 1.1)))
  const out = []
  for (let i = 0; i < count; i++) {
    const s = seed + i * 17
    const period = 1.8 + hash(s) * 1.4
    const phase = (t / period + hash(s + 1)) % 1
    const cycle = Math.floor(t / period + hash(s + 1))
    // a fresh place along the line each time it starts again
    const along = (i + 0.5) / count * L + (hash(s + cycle * 13) - 0.5) * (L / count)
    const side = hash(s + cycle * 7) < 0.5 ? -1 : 1
    const drift = side * (0.15 + phase * (0.6 + hash(s + 3) * 0.8))
    const r = 0.45 + phase * (1.1 + hash(s + 4) * 0.6)
    // in fast, out slow
    const a = (phase < 0.2 ? phase / 0.2 : 1 - (phase - 0.2) / 0.8) * 0.75
    out.push({
      x: line.from.x + u.x * along + n.x * drift + (hash(s + 5) - 0.5) * 0.3,
      y: line.from.y + u.y * along + n.y * drift + (hash(s + 6) - 0.5) * 0.3,
      r, a
    })
  }
  return out
}

// THE STARS in the dust: the cartoon
// clash stars of a brawl. A few per contact line (one per 1.5" of contact, three to six), each popping
// up at a fresh spot for half to most of its period — swelling, a quick turn, then gone — and waiting a
// moment before the next. [{ x, y, r, a, spin }] in inches; `a` 0 while a star is waiting.
export function starsOf (line, t) {
  const d = sub(line.to, line.from); const L = Math.max(0.01, len(d))
  const u = { x: d.x / L, y: d.y / L }; const n = { x: -u.y, y: u.x }
  const seed = seedOf(line.key || '') + 9001
  const count = Math.max(3, Math.min(6, Math.round(L / 1.5)))
  const out = []
  for (let i = 0; i < count; i++) {
    const s = seed + i * 23
    const period = 0.9 + hash(s) * 0.8
    const phase = (t / period + hash(s + 1)) % 1
    const cycle = Math.floor(t / period + hash(s + 1))
    const life = 0.5 + hash(s + 2) * 0.3 // the share of its period a star is shown
    const k = phase / life
    const along = hash(s * 3 + cycle * 7.31 + 0.5) * L
    const off = (hash(s + cycle * 5) - 0.5) * 1.6
    out.push({
      x: line.from.x + u.x * along + n.x * off,
      y: line.from.y + u.y * along + n.y * off,
      r: (0.6 + hash(s + cycle * 3) * 0.5) * (k < 1 ? Math.sin(Math.min(1, k) * Math.PI) * 0.6 + 0.4 : 0),
      a: k < 1 ? (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3) : 0,
      spin: hash(s + cycle * 17) * Math.PI + k * 0.6
    })
  }
  return out
}

// a five-pointed star round (x, y): points at r, the inner corners at r * inner
function star (g, x, y, r, spin, inner = 0.45) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = spin + i * Math.PI / 5 - Math.PI / 2
    const q = i % 2 ? r * inner : r
    pts.push(x + Math.cos(a) * q, y + Math.sin(a) * q)
  }
  g.poly(pts)
}

// Draw onto a PixiJS Graphics: each puff a soft pale-earth disc over a darker shadow, like the
// intro's clouds (a shadow disc, then the lit disc a little up and in).
export function drawDust (g, lines, t) {
  g.clear()
  for (const line of lines) {
    for (const p of puffsOf(line, t)) {
      if (p.a <= 0.01) continue
      g.circle(p.x + p.r * 0.12, p.y + p.r * 0.18, p.r).fill({ color: 0x6f5f45, alpha: p.a * 0.5 })
      g.circle(p.x, p.y, p.r).fill({ color: 0xc9b994, alpha: p.a * 0.8 })
      g.circle(p.x - p.r * 0.15, p.y - p.r * 0.2, p.r * 0.62).fill({ color: 0xe6dcc0, alpha: p.a * 0.65 })
    }
  }
  // the stars over the dust: a soft yellow glow, a gold star, a white heart
  for (const line of lines) {
    for (const p of starsOf(line, t)) {
      if (p.a <= 0.01 || p.r <= 0.01) continue
      g.circle(p.x, p.y, p.r * 1.1).fill({ color: 0xffe9a0, alpha: p.a * 0.25 })
      star(g, p.x, p.y, p.r, p.spin); g.fill({ color: 0xffc53a, alpha: p.a })
      g.stroke({ width: p.r * 0.12, color: 0x7a4a10, alpha: p.a * 0.8 })
      star(g, p.x, p.y, p.r * 0.55, p.spin); g.fill({ color: 0xfffbe8, alpha: p.a })
    }
  }
}
