// Gloom Nipper Whirlers: releasing them from their mob, their moves, and the hits they deal to units they pass
// through. Used by movement, charges, combat, damage, Random Movement and the battle screen (ui/phases.js).
//
// Release the Whirlers!:
//   - Whirlers begin hidden inside their Gloom Nipper Mob (the 'concealing' unit). In any Start of Turn, if the
//     mob is neither fleeing nor in Marching Column, it may let out one or more: each is set down within 3" of it,
//     touching no other model.
//   - In the Compulsory Moves of the turn it came out it moves 2D6" in a direction its player picks; in every later
//     Compulsory Moves (both players' turns), 2D6" in a random direction. It moves THROUGH any unit, friend or
//     foe, and on until it can be placed clear of every model. It ignores the 1" rule.
//   - Any unit may move through a Whirler; a unit that ends its move on one pushes it out of the way
//     by the shortest route.
//   - Enemies cannot charge it; it can be shot at as a lone character; templates hit it as normal.
//   - It is removed when: two Whirlers meet (both); any natural double is rolled for its move; it
//     touches difficult, dangerous or impassable terrain or a linear obstacle; its mob is destroyed or
//     flees off the table before releasing it.
// Whirler Ball and Chain: a unit moved through by a moving Whirler, or that moves through one, suffers D6
//   Strength 5 hits, AP -3.
// Our own readings (the rules do not say): the random direction is a uniformly random angle from the dice (the
// scatter dice's arrow); a Whirler whose move would take it off the table is removed.

import { say, onTable, TABLE } from './game.js'
import { fieldUnit, corners, centre, distanceBetween, isDead, depth } from './units.js'
import { findEntry, newUnit } from './roster.js'
import { equip } from './damage.js'
import { rollDice } from './dice.js'
import { polysOverlap, dist, add, mul, dirOf, normAngle } from './geometry.js'
import { inDifficult, onImpassable, onWall } from './terrain.js'
import { resolveHits } from './shooting.js'
import { isMarchingColumn } from './movement.js'

export const isWhirler = u => !!u?.status?.whirler
const BALL = { name: 'Whirler ball & chain', S: 5, AP: -3, rules: [] }
const turnKey = game => `${game.round}:${game.active}`

export function canRelease (game, mob) {
  if (!mob.whirlersHidden) return { ok: false, reason: 'it hides no Whirlers' }
  if (mob.side !== game.active || game.sub !== 'start') return { ok: false, reason: 'Whirlers are released in its own Start of Turn sub-phase' }
  if (!mob.placed || mob.status.removed || isDead(mob)) return { ok: false, reason: 'it is not on the table' }
  if (mob.status.fleeing) return { ok: false, reason: 'it is fleeing' }
  if (isMarchingColumn(mob)) return { ok: false, reason: 'it is in Marching Column' }
  return { ok: true }
}

// Put a Whirler's footprint with its centre on `p`.
function placeAt (f, p, facing = f.facing) {
  f.facing = facing
  f.pos = add(p, mul(dirOf(facing), depth(f) / 2))
}
const touchingAny = (game, f) => onTable(game).filter(o => o !== f && polysOverlap(corners(f), corners(o), 0.01))

// Release one Whirler at point `p` (its base centre). Returns { ok, reason, whirler }.
export function releaseWhirler (game, mob, p) {
  const c = canRelease(game, mob)
  if (!c.ok) return c
  const f = fieldUnit(mob.army, newUnit(findEntry(mob.army, 'whirlers')), mob.side)
  equip(f)
  f.name = 'Whirler'
  f.formation = 'skirmish'
  f.status.whirler = { from: mob.id, released: turnKey(game) }
  placeAt(f, p, mob.facing)
  f.placed = true
  if (distanceBetween(f, mob) > 3 + 1e-6) return { ok: false, reason: `it must land within 3" of ${mob.name} (that is ${distanceBetween(f, mob).toFixed(1)}")` }
  game.units.push(f)
  const hit = touchingAny(game, f)
  if (hit.length || corners(f).some(q => q.x < 0 || q.y < 0 || q.x > TABLE.w || q.y > TABLE.h)) {
    game.units.pop()
    return { ok: false, reason: hit.length ? `it would touch ${hit[0].name}` : 'it would be off the table' }
  }
  mob.whirlersHidden--
  say(game, 'h', `${mob.name} RELEASES A WHIRLER! It lands ${distanceBetween(f, mob).toFixed(1)}" away. (${mob.whirlersHidden} still hidden.)`)
  return { ok: true, whirler: f }
}

// Units the Whirler passes through take D6 Strength 5 hits, AP -3, once each.
function ballAndChain (game, f, victims, how) {
  for (const v of victims) {
    if (v.status.removed || isDead(v)) continue
    const n = rollDice(game.rng, 1)[0]
    say(game, 'roll', `${how} ${v.name}: D6 = ${n} Strength 5 hits, AP -3 (Whirler ball & chain).`)
    resolveHits(game, f, v, n, BALL, { source: 'a Whirler' })
  }
}

function removeWhirler (game, f, why) {
  f.status.removed = true
  f.status.destroyed = why
  f.models.forEach(m => { m.wounds = 0 })
  say(game, 'bad', `The Whirler ${why} and is removed.`)
}

// The Compulsory move of one Whirler: 2D6" at `angle` (radians). Returns what happened.
export function moveWhirler (game, f, angle, label = '') {
  const dice = rollDice(game.rng, 2)
  const d = dice[0] + dice[1]
  const start = centre(f)
  const dir = dirOf(angle)
  say(game, 'roll', `Whirler${label}: 2D6 = ${dice.join('+')} = ${d}" ${f.status.whirler.chosen ? 'in the direction chosen' : `in a random direction (${Math.round(((angle * 180 / Math.PI) % 360 + 360) % 360)}°)`}${dice[0] === dice[1] ? ' — a double: it will come to a terminal stop' : ''}.`)
  const victims = new Set()
  let t = 0
  let ended = null
  const step = 0.25
  // it goes the full distance, and on beyond it while it is still on top of a unit
  for (let i = 1; i < 2000; i++) {
    t = i * step
    placeAt(f, add(start, mul(dir, t)), angle)
    if (corners(f).some(q => q.x < 0 || q.y < 0 || q.x > TABLE.w || q.y > TABLE.h)) { ended = 'spins off the table'; break }
    if (inDifficult(game, f) || onImpassable(game, f) || onWall(game, f)) { ended = 'hits rough ground and comes to a terminal stop'; break }
    const other = onTable(game).find(o => o !== f && isWhirler(o) && polysOverlap(corners(f), corners(o), 0.01))
    if (other) { ended = 'tangles chains with another Whirler'; removeWhirler(game, other, 'is caught in another Whirler\'s chains'); break }
    const on = touchingAny(game, f).filter(o => !isWhirler(o))
    for (const o of on) victims.add(o)
    if (t >= d && !on.length) break
  }
  say(game, '', `The Whirler moved ${t.toFixed(1)}"${victims.size ? `, through ${[...victims].map(v => v.name).join(', ')}` : ''}.`)
  ballAndChain(game, f, victims, 'The Whirler smashes through')
  if (ended) removeWhirler(game, f, ended)
  else if (dice[0] === dice[1]) removeWhirler(game, f, 'rolled a double and comes to a terminal stop')
  return { distance: d, victims: [...victims], ended }
}

// The Whirlers that move in this Compulsory Moves sub-phase: every Whirler on the table (both
// sides'), first released ones of the active side with a chosen direction.
export const whirlersToMove = game => onTable(game).filter(isWhirler)
export const choosesDirection = (game, f) => f.side === game.active && f.status.whirler.released === turnKey(game)
export function randomAngle (game) { return game.rng() * Math.PI * 2 }

// A unit has moved (its path of snapshots): any Whirler it passed through hits it; one it ended on
// top of is pushed out by the shortest route. Called by makeMove (movement.js).
export function movedThroughWhirlers (game, u, path, apply) {
  if (isWhirler(u)) return
  const fans = onTable(game).filter(o => isWhirler(o) && o !== u)
  if (!fans.length) return
  const final = { pos: u.pos, facing: u.facing, files: u.files, formation: u.formation }
  const hit = new Set()
  for (const snap of path) {
    apply(u, snap)
    for (const f of fans) if (polysOverlap(corners(u), corners(f), 0.01)) hit.add(f)
  }
  Object.assign(u, final)
  if (!hit.size) return
  // D6 hits for each Whirler it went through
  for (const f of hit) ballAndChain(game, f, [u], `${u.name} moves through a Whirler:`)
  for (const f of hit) {
    if (f.status.removed || u.status.removed || !polysOverlap(corners(u), corners(f), 0.01)) continue
    pushClear(game, f)
    say(game, '', `The Whirler is pushed out of ${u.name}'s way.`)
  }
}

// The shortest way out: the nearest spot, in any of 24 directions, where the Whirler touches no
// model and is on the table (searched outwards a tenth of an inch at a time).
function pushClear (game, f) {
  const c0 = centre(f)
  for (let k = 1; k <= 300; k++) {
    for (let a = 0; a < 24; a++) {
      placeAt(f, add(c0, mul(dirOf(a * Math.PI / 12), k * 0.1)))
      if (!touchingAny(game, f).length && corners(f).every(q => q.x >= 0 && q.y >= 0 && q.x <= TABLE.w && q.y <= TABLE.h)) return true
    }
  }
  placeAt(f, c0)
  return false
}

// A unit moved from `from` ({ pos, facing }) to where it is now by a charge, flee or pursuit:
// the Whirlers on the straight way between (charge.js, combat.js).
// `track`: the positions it actually went through, where it turned on the way (a flee round impassable terrain);
// otherwise the straight line from `from`
export function sweptThroughWhirlers (game, u, from, track = null) {
  if (!from || u.status.removed || !u.placed || !onTable(game).some(isWhirler)) return
  const to = { pos: { ...u.pos }, facing: u.facing }
  const n = Math.max(2, Math.ceil(dist(from.pos, to.pos) / 0.25))
  const path = track?.length ? track : Array.from({ length: n + 1 }, (_, i) => ({ pos: { x: from.pos.x + (to.pos.x - from.pos.x) * i / n, y: from.pos.y + (to.pos.y - from.pos.y) * i / n }, facing: from.facing + normAngle(to.facing - from.facing) * i / n }))
  movedThroughWhirlers(game, u, path, (x, sn) => { x.pos = sn.pos; x.facing = sn.facing })
}

// A mob destroyed or fled off the table with Whirlers still hidden: they are lost.
export function concealerGone (game, u) {
  if (!u.whirlersHidden) return
  say(game, 'bad', `${u.whirlersHidden} Whirler${u.whirlersHidden === 1 ? '' : 's'} hidden in ${u.name} ${u.whirlersHidden === 1 ? 'is' : 'are'} lost with it.`)
  u.whirlersHidden = 0
}
