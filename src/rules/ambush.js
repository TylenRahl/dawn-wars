// Ambushers and other units held in reserve: who is waiting off the table, the Start of Turn arrival roll, and
// placing an arriving unit on a battlefield edge. Used by the battle screens (ui/phases.js, ui/battle.js),
// magic.js and movement.js.
//
// Ambushers: a unit may stay off the table at deployment. From round two, each Start of Turn rolls a D6 per waiting
//   unit: 1-3 it waits another turn, 4+ it arrives in Compulsory Moves, on any edge its player picks, not within 8"
//   of an enemy. Any still waiting at the start of round five arrive anyway.
// Reinforcements: the unit is set with its rear against the edge, facing the centre; it may not march and counts
//   as having moved for shooting, but otherwise moves as usual.
// Skirmishers as Reinforcements: every model must be within 1" of the edge (a block set against the edge is).
// All Sneaky Like: with Titch Toothnicker in the list, one Nipper Wolf Rider Mob may take Ambushers for free, and
//   its player may add or take 1 from its arrival roll.

import { say, onTable, onTheTable, solid, TABLE } from './game.js'
import { rollDice } from './dice.js'
import { add, mul, dirOf, polysOverlap, pointInPoly } from './geometry.js'
import { corners, depth, distanceBetween, hasRule, isDead } from './units.js'
import { onImpassable } from './terrain.js'

export const inReserve = u => !!u.reserve && !u.placed && !u.status.removed
// Guardian of the Sacred Sites: the Verdant Knight slumbers instead of being deployed; any Start
// of Turn he is not on the battlefield, a D6 — 3+ he awakens (Aura of the Fay: -1 for each time he
// has been slain); at the start of round five he wakes regardless. He is set up wholly inside a 'natural'
// terrain feature (woods, difficult or dangerous ground; not hills, vortices, walls or buildings), not within 1" of
// an enemy unit
export const isVerdantKnight = u => hasRule(u, 'Guardian of the Sacred Sites')
export const NATURAL = ['wood', 'marsh', 'stream']
export const naturalFeatures = game => (game.terrain || []).filter(f => NATURAL.includes(f.kind))
const whollyIn = (u, f) => corners(u).every(p => pointInPoly(p, f.poly))
export const touchingNatural = (game, u) => naturalFeatures(game).some(f => corners(u).some(p => pointInPoly(p, f.poly)) || f.poly.some(p => pointInPoly(p, corners(u))))
export const featureHolding = (game, u) => naturalFeatures(game).find(f => whollyIn(u, f)) || null
// Place the Verdant Knight at p, wholly within a natural feature (not `not`). { ok, reason }
export function placeInNature (game, u, p, not = null) {
  const was = { pos: u.pos, facing: u.facing, placed: u.placed }
  u.pos = { x: p.x, y: p.y + depth(u) / 2 * (u.side === 0 ? -1 : 1) }
  u.facing = u.side === 0 ? -Math.PI / 2 : Math.PI / 2
  u.placed = true
  const f = featureHolding(game, u)
  let reason = null
  if (!f) reason = 'he must stand completely within a wood, marsh or stream'
  else if (not && f === not) reason = 'it must be a different natural feature'
  else if (solid(game).some(o => o !== u && polysOverlap(corners(u), corners(o), 0.02))) reason = 'there is a unit there'
  else { const near = onTable(game).find(o => o.side !== u.side && o !== u && distanceBetween(u, o) < 1); if (near) reason = `it is within 1" of ${near.name}` }
  if (reason) Object.assign(u, was)
  return { ok: !reason, reason, feature: f }
}

// May this unit be held in reserve now (its turn to deploy, not yet placed)?
export const canReserve = u => hasRule(u, 'Ambushers') && !u.placed && !u.status.removed && !u.status.joinedTo

// Titch's packmates: the arrival roll may be modified by one either way
export const sneaky = (game, u) => (u.entryId === 'nipper-wolf-rider-mob' && game.units.some(c => c.side === u.side && hasRule(c, 'All Sneaky Like'))) ||
  // Peerless Raider: with Brannoc as the General, her or a Marauder unit's arrival roll +1 or -1
  // (Horn of the Great Hunt: its bearer on the field and not fleeing)
  game.units.some(c => c.side === u.side && c.placed && !c.status.removed && !c.status.fleeing && (c.items || []).includes('horn-of-the-great-hunt')) ||
  ((hasRule(u, 'Peerless Raider') || /^(dominion-marauders|marauder-)/.test(u.entryId || '')) && game.units.some(c => c.side === u.side && c.isGeneral && hasRule(c, 'Peerless Raider')))

// Start of Turn: the reserves' rolls. Returns [{ unit, roll, auto }] — the caller decides any modifier
// and calls arrive() with the final result.
// (`again`: Herdhorn — a second roll this turn for those still in reserve that did not arrive)
export function ambushRolls (game, side, { again = false } = {}) {
  const key = `${game.round}:${side}${again ? ':herdhorn' : ''}`
  return game.units.filter(u => u.side === side && inReserve(u) && !u.status.arriving && u.status.ambushRolled !== key && (game.round >= 2 || isVerdantKnight(u))).map(u => {
    u.status.ambushRolled = key
    // (Guardian of the Sacred Sites: he comes on in round five only if he has not yet been awakened —
    // not once slain and gone again)
    if (game.round >= 5 && !u.status.faySlain) return { unit: u, roll: null, auto: true }
    return { unit: u, roll: rollDice(game.rng, 1)[0], auto: false, green: isVerdantKnight(u) }
  })
}
export function decideArrival (game, { unit: u, roll, auto }, mod = 0) {
  if (auto) {
    u.status.arriving = true
    say(game, 'roll', `${u.name}: round ${game.round} — Ambushers still in reserve arrive automatically.`)
    return true
  }
  if (isVerdantKnight(u)) {
    const slain = u.status.faySlain || 0
    const ok = roll - slain >= 3
    say(game, 'roll', `${u.name} slumbers: D6 = ${roll}${slain ? ` -${slain} (slain ${slain} time${slain === 1 ? '' : 's'})` : ''}, needs 3+ — ${ok ? 'he AWAKENS: he appears in the Compulsory Moves sub-phase' : 'he sleeps on'}.`)
    if (ok) u.status.arriving = true
    return ok
  }
  const r = roll + mod
  const arrives = r >= 4
  say(game, 'roll', `${u.name} (Ambushers, in reserve): D6 = ${roll}${mod ? ` ${mod > 0 ? '+' : ''}${mod} (All Sneaky Like) = ${r}` : ''}, needs 4+ — ${arrives ? 'it ARRIVES in the Compulsory Moves sub-phase' : 'delayed until next turn'}.`)
  if (arrives) u.status.arriving = true
  return arrives
}
export const arrivals = (game, side) => game.units.filter(u => u.side === side && inReserve(u) && u.status.arriving)

// Where the unit would stand if put on the battlefield edge nearest point p, rear on the edge, facing the centre.
function edgePlacement (u, p) {
  const edges = [
    { d: p.y, facing: Math.PI / 2, back: { x: p.x, y: 0 } },
    { d: TABLE.h - p.y, facing: -Math.PI / 2, back: { x: p.x, y: TABLE.h } },
    { d: p.x, facing: 0, back: { x: 0, y: p.y } },
    { d: TABLE.w - p.x, facing: Math.PI, back: { x: TABLE.w, y: p.y } }
  ].sort((a, b) => a.d - b.d)
  const e = edges[0]
  return { facing: e.facing, pos: add(e.back, mul(dirOf(e.facing), depth(u))) }
}

// Put an arriving unit on the edge nearest the clicked point. { ok, reason }
export function placeReinforcement (game, u, p) {
  if (!inReserve(u) || !u.status.arriving) return { ok: false, reason: `${u.name} is not arriving` }
  if (game.sub !== 'compulsory' || game.active !== u.side) return { ok: false, reason: 'reinforcements arrive in their Compulsory Moves sub-phase' }
  if (isVerdantKnight(u)) {
    const r = placeInNature(game, u, p)
    if (!r.ok) return r
    u.reserve = false; u.status.arriving = false
    say(game, 'h', `${u.name} AWAKENS, bursting from the ${r.feature.kind}.`)
    return { ok: true }
  }
  const was = { pos: u.pos, facing: u.facing, placed: u.placed }
  Object.assign(u, edgePlacement(u, p), { placed: true })
  let reason = null
  if (!onTheTable(u)) reason = 'it would not be wholly on the battlefield there'
  else if (onImpassable(game, u)) reason = 'it would stand on impassable terrain'
  else if (solid(game).some(o => o !== u && polysOverlap(corners(u), corners(o), 0.02))) reason = 'it would stand on another unit'
  else {
    const near = onTable(game).find(o => o.side !== u.side && !isDead(o) && distanceBetween(u, o) < 8)
    if (near) reason = `it would be within 8" of ${near.name} (${distanceBetween(u, near).toFixed(1)}")`
  }
  if (reason) { Object.assign(u, was); return { ok: false, reason } }
  u.reserve = false
  u.status.arriving = false
  u.status.countsAsMoved = true
  u.status.noMarch = true
  say(game, 'h', `${u.name} ARRIVES as reinforcements on the battlefield edge (Ambushers): it cannot march and counts as having moved.`)
  return { ok: true }
}
