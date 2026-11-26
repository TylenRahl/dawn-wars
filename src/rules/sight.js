// Line of sight and cover between units (sightTo, canSee). Used by shooting, charges, Leadership, war machines and
// the battle screen.
//
// A model sees another if a line can run from inside its vision arc to some part of that model; terrain and models
// block it, so normally only the front rank sees. If any model in a unit sees any model of another, the unit sees
// that unit. Up to half hidden is partial cover; more than half is full cover.
// The vision arc is taken to be the front arc (units.js arcOf), which is what the charge and shooting rules ask for.

import { terrainOf, TERRAIN_KINDS } from './terrain.js'
import { add, sub, mul, dirOf, rightOf, dot, segDist } from './geometry.js'
import { corners, centre, filesOf, hasRule } from './units.js'
import { onTable } from './game.js'
import { terrainBlocks, onHill, shareInWoods } from './terrain.js'

// The eyes of the front rank: the middle of each front-rank model's front edge.
export function eyes (u) {
  const [fl, fr] = corners(u)
  const n = filesOf(u)
  const out = []
  for (let i = 0; i < n; i++) out.push(add(fl, mul(sub(fr, fl), (i + 0.5) / n)))
  return out
}

// Points on the target to look at: its corners, the middles of its edges and its centre.
export function targetPoints (t) {
  const cs = corners(t)
  const mids = cs.map((p, i) => mul(add(p, cs[(i + 1) % 4]), 0.5))
  return [...cs, ...mids, centre(t)]
}

function inVision (u, p) {
  // a chariot's crew see all round (Firing Platform)
  if (/Chariot/.test((u.troopType || []).join(' ')) || [...(u.special || [])].includes('Howdah')) return true
  // Facing and Line of Sight Skirmishers: Skirmishers see all round
  // (Dispersed Formation: these Skirmishers see only to their front, 90°)
  if (u.formation === 'skirmish' && ![...(u.special || [])].includes('Dispersed Formation')) return true
  const f = dirOf(u.facing); const r = rightOf(u.facing)
  const [fl, fr] = corners(u)
  const a = dot(sub(p, fl), f)
  return a >= -1e-6 && dot(sub(p, fl), r) >= -a - 1e-6 && dot(sub(p, fr), r) <= dot(sub(p, fr), f) + 1e-6
}

function blocked (game, a, b, except, cache) {
  const [u, t] = except
  const tb = terrainBlocks(game, a, b, u, t, cache)
  if (tb) return { name: 'terrain' }
  // Vantage Point: a unit wholly on a hill sees over units not on a
  // hill, and is seen over them
  const high = cache.u || cache.t
  // Large Target: sight to or from a Large Target passes over other units
  // that are not Large Targets themselves
  const large = cache.large
  for (const o of onTable(game)) {
    if (except.includes(o) || o.status.whirler) continue // (a whirling Whirler is no screen)
    // Chariot Runners: friendly chariots see over or through Chariot Runners
    if (/Chariot/.test((u.troopType || []).join(' ')) && o.side === u.side && hasRule(o, 'Chariot Runners')) continue
    if (high && !cache.others(o)) continue
    if (large && !hasRule(o, 'Large Target')) continue
    const cs = corners(o)
    // a segment crossing (or touching) the other unit's footprint is blocked by it
    for (let i = 0; i < 4; i++) {
      if (segDist(a, b, cs[i], cs[(i + 1) % 4]) < 1e-6) return o
    }
  }
  return null
}

// { sees, visibleFraction, blockers } — the fraction of the target's points some eye can see.
export function sightTo (game, u, t) {
  const tp = targetPoints(t)
  const es = eyes(u)
  // hill positions worked out once for this look, not once per ray
  const memo = new Map()
  const cache = { large: hasRule(u, 'Large Target') || hasRule(t, 'Large Target'), u: onHill(game, u, true), t: onHill(game, t, true), others: o => { if (!memo.has(o)) memo.set(o, onHill(game, o, true)); return memo.get(o) } }
  let seen = 0
  let behindWall = 0
  const blockers = new Set()
  const walls = terrainOf(game).filter(f => TERRAIN_KINDS[f.kind]?.linear)
  // (a wall the target stands behind: within 1" of the point seen — not one at the shooter's feet)
  const crossesWall = (a, b) => walls.some(f => f.poly.some((q, i) => segDist(a, b, q, f.poly[(i + 1) % f.poly.length]) < 1e-6) && f.poly.some((q, i) => segDist(b, b, q, f.poly[(i + 1) % f.poly.length]) <= 1))
  for (const p of tp) {
    let ok = false
    let clear = false
    for (const e of es) {
      if (!inVision(u, p)) continue
      const b = blocked(game, e, p, [u, t], cache)
      if (!b) { ok = true; if (!crossesWall(e, p)) { clear = true; break } continue }
      blockers.add(b)
    }
    if (ok) seen++
    if (ok && !clear) behindWall++
  }
  // Woodland Boundaries: over half its models in a wood: partial cover
  let frac = seen / tp.length
  // Target Behind Partial Cover: models obscured by terrain — those seen only across a
  // low wall are taken as obscured; most of them so: partial cover (a guess at how much a low wall hides)
  if (seen > 0 && behindWall > seen / 2) frac = Math.min(frac, 0.75)
  if (seen > 0 && shareInWoods(game, t) > 0.5) frac = Math.min(frac, 0.75)
  // Large Targets get no benefit from cover, partial or full
  if (seen > 0 && hasRule(t, 'Large Target')) frac = 1
  return { sees: seen > 0, visibleFraction: frac, blockers: [...blockers] }
}

export const canSee = (game, u, t) => sightTo(game, u, t).sees
