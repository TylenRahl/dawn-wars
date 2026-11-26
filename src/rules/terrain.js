// Terrain on the table: woods, hills, low walls, marsh, streams, buildings and impassable rocks. Exports the
// terrain kinds, the random terrain generator and the questions every rule asks (is this unit in difficult
// ground, on a hill, behind a wall, is sight blocked). Used by movement, charges, combat, shooting, sight, magic,
// the setup screen and the map editor.
//
// Categories of terrain: open ground, difficult, dangerous,
//   impassable, linear obstacles, woods, hills.
// How much terrain: one feature per 12" of the longest edge — six.
// Not within 12" of the centre.
//   (The players normally take turns to place them; here they are placed at random from the
//   game's seed, our own method. A battle can also be set up with none.)
// The Size of Things: 2" to 8" across counts as one feature.
// Difficult terrain: any part of a unit moving through it: -1
//   Movement (minimum 1); charging through it, discard the HIGHEST Charge dice; ending a move, or
//   starting a Combat phase, with a quarter or more of its models in it: Disrupted.
// Woods: woods count as difficult terrain here (the players may agree
//   otherwise); Arboreal Gloom: if neither model is in the wood, no line of
//   sight through it; Woodland Boundaries: over half the models in the wood: partial cover.
// Hills: open ground; Vantage Point: one more rank shoots from a
//   hill, and a unit wholly on a hill sees (and is seen) over other units; Beyond the Crest: if
//   neither model is on the hill, no line of sight through it.
// The High Ground: the fighting rank higher than the enemy's: +1.
// Low linear obstacles: difficult terrain for movement; straddling one
//   in combat: Disrupted. Defended Low Linear Obstacles: charging a unit defending one (its
//   front rank against it) is a disordered charge.
// Impassable terrain: cannot be crossed.

import { pointInPoly, segDist, dist, add, mul, polysOverlap, dirOf, rightOf, normAngle } from './geometry.js'
import { corners, modelSlots, centre, hasRule as hasRuleT } from './units.js'

export const TERRAIN_KINDS = {
  wood: { name: 'Wood', difficult: true, blocksSight: 'wood', cover: true },
  hill: { name: 'Hill', difficult: false, blocksSight: 'hill', cover: false },
  wall: { name: 'Low wall', difficult: true, blocksSight: false, cover: true, linear: true },
  rocks: { name: 'Rocks', impassable: true, blocksSight: 'solid', cover: false },
  // Dangerous Terrain: hinders movement as difficult terrain; a model beginning, passing
  // through or ending its move in it tests (D6, a 1 loses a Wound), once for each such feature
  marsh: { name: 'Marsh', difficult: true, dangerous: true, blocksSight: false, cover: false },
  // a shallow stream: difficult terrain (Random Terrain Generator)
  stream: { name: 'Stream', difficult: true, blocksSight: false, cover: false },
  // Buildings: "usually treated as impassable terrain" (occupiable buildings, an
  // option the players may agree, are not in the game)
  building: { name: 'Building', impassable: true, blocksSight: 'solid', cover: false },
  // Hornstones: a Hornstone is an impassable special feature (hornkin.js)
  hornstone: { name: 'Hornstone', impassable: true, blocksSight: 'solid', cover: false },
  spiritVortex: { name: 'Elemental Spirit', difficult: true, blocksSight: 'solid', cover: false },
  // a Magical Vortex its spell calls difficult terrain (Pillar of Fire, Foot of Bosher), not blocking sight
  vortexGround: { name: 'a Magical Vortex', difficult: true, blocksSight: null, cover: false }
}

// Six features, from the seeded rng: two woods, two hills, a wall and a rocky outcrop.
// More of the battlefield: a marsh (dangerous terrain), a shallow stream (difficult) and a building (impassable),
// placed clear of what is there already — with their own generator, so the first six features of a seeded battle
// are the same as before they were added
export function generateMoreTerrain (rng, existing, table = { w: 72, h: 48 }) {
  const out = []
  const centreP = { x: table.w / 2, y: table.h / 2 }
  const all = () => [...existing, ...out]
  for (const kind of ['marsh', 'stream', 'building']) {
    for (let tries = 0; tries < 200; tries++) {
      const size = kind === 'stream' ? 10 + rng() * 4 : 4 + rng() * 3
      const at = { x: 8 + rng() * (table.w - 16), y: 14 + rng() * (table.h - 28) }
      if (kind !== 'stream' && dist(at, centreP) < 10 + size / 2) continue
      if (all().some(f => dist(f.at, at) < (f.size + size) / 2 + 3)) continue
      const a = rng() * Math.PI
      let poly
      if (kind === 'stream') {
        // a strip 1.5" wide, bending once in the middle
        const bend = (rng() - 0.5) * 0.6
        const d1 = { x: Math.cos(a), y: Math.sin(a) }; const d2 = { x: Math.cos(a + bend), y: Math.sin(a + bend) }
        const half = size / 2
        const p0 = { x: at.x - d1.x * half, y: at.y - d1.y * half }; const p2 = { x: at.x + d2.x * half, y: at.y + d2.y * half }
        const n1 = { x: -d1.y * 0.75, y: d1.x * 0.75 }; const n2 = { x: -d2.y * 0.75, y: d2.x * 0.75 }
        poly = [{ x: p0.x - n1.x, y: p0.y - n1.y }, { x: at.x - n1.x, y: at.y - n1.y }, { x: p2.x - n2.x, y: p2.y - n2.y }, { x: p2.x + n2.x, y: p2.y + n2.y }, { x: at.x + n1.x, y: at.y + n1.y }, { x: p0.x + n1.x, y: p0.y + n1.y }]
      } else if (kind === 'building') {
        const w = size / 2; const d = size / 2 * 0.7
        const c = Math.cos(a); const s = Math.sin(a)
        poly = [[-w, -d], [w, -d], [w, d], [-w, d]].map(([x, y]) => ({ x: at.x + x * c - y * s, y: at.y + x * s + y * c }))
      } else {
        const n = 10
        const rx = size / 2; const ry = size / 2 * (0.6 + rng() * 0.4)
        poly = []
        for (let i = 0; i < n; i++) {
          const t = i / n * Math.PI * 2
          const k = 0.85 + rng() * 0.3
          const x = Math.cos(t) * rx * k; const y = Math.sin(t) * ry * k
          poly.push({ x: at.x + x * Math.cos(a) - y * Math.sin(a), y: at.y + x * Math.sin(a) + y * Math.cos(a) })
        }
      }
      out.push({ id: `t${existing.length + out.length + 1}`, kind, at, size, poly })
      break
    }
  }
  return out
}

export function generateTerrain (rng, table = { w: 72, h: 48 }) {
  const kinds = ['wood', 'hill', 'wood', 'hill', 'wall', 'rocks']
  const out = []
  const centreP = { x: table.w / 2, y: table.h / 2 }
  for (const kind of kinds) {
    for (let tries = 0; tries < 200; tries++) {
      const size = 4 + rng() * 4 // 4" to 8" across
      const at = { x: 6 + rng() * (table.w - 12), y: 6 + rng() * (table.h - 12) }
      if (dist(at, centreP) < 12 + size / 2) continue
      if (out.some(f => dist(f.at, at) < (f.size + size) / 2 + 3)) continue
      let poly
      if (kind === 'wall') {
        const a = rng() * Math.PI
        const half = size / 2
        const dx = Math.cos(a) * half; const dy = Math.sin(a) * half
        const nx = -Math.sin(a) * 0.25; const ny = Math.cos(a) * 0.25
        poly = [{ x: at.x - dx - nx, y: at.y - dy - ny }, { x: at.x + dx - nx, y: at.y + dy - ny }, { x: at.x + dx + nx, y: at.y + dy + ny }, { x: at.x - dx + nx, y: at.y - dy + ny }]
      } else {
        // a lumpy oval
        const n = 10
        const rx = size / 2; const ry = size / 2 * (0.6 + rng() * 0.4)
        const rot = rng() * Math.PI
        poly = []
        for (let i = 0; i < n; i++) {
          const t = i / n * Math.PI * 2
          const k = 0.85 + rng() * 0.3
          const x = Math.cos(t) * rx * k; const y = Math.sin(t) * ry * k
          poly.push({ x: at.x + x * Math.cos(rot) - y * Math.sin(rot), y: at.y + x * Math.sin(rot) + y * Math.cos(rot) })
        }
      }
      out.push({ id: `t${out.length + 1}`, kind, at, size, poly })
      break
    }
  }
  return out
}

const inside = (p, f) => pointInPoly(p, f.poly)
// Overlapping by more than a whisker (merely touching an edge is not being in it). The features
// are not all convex, so test both ways round with points and edges as well as the separating axis.
function polyTouches (cs, f) {
  if (cs.some(p => inside(p, f)) || f.poly.some(p => pointInPoly(p, cs))) return true
  for (let i = 0; i < cs.length; i++) for (let j = 0; j < f.poly.length; j++) if (segDist(cs[i], cs[(i + 1) % cs.length], f.poly[j], f.poly[(j + 1) % f.poly.length]) < 1e-6 && polysOverlap(cs, f.poly, 0.02)) return true
  return false
}

// The table's terrain, plus spells that act as terrain for a while (an Elemental Spirit blocks sight)
export const terrainOf = game => {
  // (Tree Singing: its template is a woodland terrain feature)
  const extra = (game.effects || []).filter(e => e.kind === 'vortex' && (e.blocksSight || e.difficult || e.woodland)).map(e => ({ id: 'v' + e.casterId, kind: e.woodland ? 'wood' : e.blocksSight ? 'spiritVortex' : 'vortexGround', side: e.side, at: e.at, poly: Array.from({ length: 12 }, (_, i) => ({ x: e.at.x + Math.cos(i / 12 * Math.PI * 2) * e.r, y: e.at.y + Math.sin(i / 12 * Math.PI * 2) * e.r })) }))
  return extra.length ? [...(game.terrain || []), ...extra] : (game.terrain || [])
}

// Does the unit's footprint touch a feature of this sort?
export function touching (game, u, pred) {
  const cs = corners(u)
  return terrainOf(game).filter(f => pred(TERRAIN_KINDS[f.kind], f) && polyTouches(cs, f))
}
export const inDifficult = (game, u) => touching(game, u, k => k.difficult).length > 0
export const dangerousHere = (game, u) => touching(game, u, k => k.dangerous)
export const onImpassable = (game, u) => touching(game, u, k => k.impassable).length > 0

// The share of the unit's models standing in difficult terrain (by their centres).
// The share of the unit's models whose centres stand in difficult AREA terrain (woods).
export function shareInDifficult (game, u) {
  const slots = modelSlots(u)
  if (!slots.length) return 0
  const diff = terrainOf(game).filter(f => TERRAIN_KINDS[f.kind].difficult && !TERRAIN_KINDS[f.kind].linear)
  const n = slots.filter(s => diff.some(f => inside(s.at, f))).length
  return n / slots.length
}

// Low linear obstacles: straddling a low linear obstacle in combat —
// any model's base across the wall.
export function straddlingWall (game, u) {
  const walls = terrainOf(game).filter(f => f.kind === 'wall')
  if (!walls.length) return false
  return modelSlots(u).some(s => walls.some(f => polysOverlap(slotSquare(u, s.at), f.poly, 0.01)))
}
function slotSquare (u, at) {
  const f = dirOf(u.facing); const r = rightOf(u.facing)
  const hw = u.base.w / 2; const hd = u.base.d / 2
  return [add(add(at, mul(r, -hw)), mul(f, hd)), add(add(at, mul(r, hw)), mul(f, hd)), add(add(at, mul(r, hw)), mul(f, -hd)), add(add(at, mul(r, -hw)), mul(f, -hd))]
}

// The High Ground: the FIGHTING RANK's position — most of the front rank on a hill.
export function frontRankOnHill (game, u) {
  const hills = terrainOf(game).filter(f => f.kind === 'hill')
  if (!hills.length) return false
  const front = modelSlots(u).filter(s => s.rank === 0)
  return front.filter(s => hills.some(f => inside(s.at, f))).length > front.length / 2
}

export function onHill (game, u, wholly = false) {
  const hills = terrainOf(game).filter(f => f.kind === 'hill')
  const slots = modelSlots(u)
  const on = slots.filter(s => hills.some(f => inside(s.at, f))).length
  return wholly ? on === slots.length && on > 0 : on > slots.length / 2
}

export function shareInWoods (game, u) {
  const slots = modelSlots(u)
  const woods = terrainOf(game).filter(f => f.kind === 'wood')
  return slots.length ? slots.filter(s => woods.some(f => inside(s.at, f))).length / slots.length : 0
}

// Is the line from a to b blocked by terrain, for a viewer `u` looking at target `t`?
export function terrainBlocks (game, a, b, u, t, high = null) {
  for (const f of terrainOf(game)) {
    const k = TERRAIN_KINDS[f.kind]
    if (!k.blocksSight) continue
    const crosses = f.poly.some((p, i) => segDist(a, b, p, f.poly[(i + 1) % f.poly.length]) < 1e-6) || inside(a, f) || inside(b, f)
    if (!crosses) continue
    if (k.blocksSight === 'solid') return f
    // woods and hills block only when neither model is in (on) them
    if (inside(a, f) || inside(b, f)) continue
    if (k.blocksSight === 'hill' && (high ? high.u || high.t : (onHill(game, u, true) || onHill(game, t, true)))) continue
    return f
  }
  return null
}

// Charging: does the unit's footprint, swept from where it is to where it makes contact, cross
// difficult terrain (or impassable terrain)? Sampled every half inch or so.
export function chargePathTerrain (game, u, place) {
  const from = { pos: u.pos, facing: u.facing }
  const steps = Math.max(2, Math.ceil(dist(u.pos, place.pos) / 0.5))
  const turn = normAngle(place.facing - u.facing)
  let difficult = false; let impassable = false
  const dangerous = new Set()
  const chariotWall = !onWall(game, u) // one already against a wall may drive off it
  for (let i = 0; i <= steps; i++) {
    const k = i / steps
    u.pos = { x: from.pos.x + (place.pos.x - from.pos.x) * k, y: from.pos.y + (place.pos.y - from.pos.y) * k }
    u.facing = from.facing + turn * k
    if (!difficult && inDifficult(game, u)) difficult = true
    for (const f of dangerousHere(game, u)) dangerous.add(f)
    if (!impassable && i > 0 && onImpassable(game, u)) impassable = true
    // Iron Shod Wheels: linear obstacles are impassable to a chariot
    // (Grinding Wheels: open terrain to an Iron Kettle; Crushing Weight: dangerous — not
    // impassable — to a War Wagon: its dangerous terrain test is not made on a charge here, a known gap)
    if (!impassable && i > 0 && chariotWall && /Chariot/.test((u.troopType || []).join(' ')) && !hasRuleT(u, 'Grinding Wheels') && !hasRuleT(u, 'Crushing Weight') && onWall(game, u)) impassable = true
  }
  Object.assign(u, from)
  return { difficult, impassable, dangerous: [...dangerous] }
}
export const chargePathDifficult = (game, u, place) => chargePathTerrain(game, u, place).difficult

export const onWall = (game, u) => touching(game, u, k => k.linear).length > 0
