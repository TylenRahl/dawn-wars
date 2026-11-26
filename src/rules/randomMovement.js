// Random Movement (Gobbler Hoppers, Wrecker Gobblers): rolling the move, moving, and moving into contact. Used by
// movement.js, charge.js, combat.js and the battle screen (ui/phases.js).
//
// A unit with Random Movement rolls dice (3D6) instead of having a Movement characteristic. It moves in Compulsory
//   Moves, the roll giving its maximum move; it may wheel but make no other manoeuvre, may not march and may not
//   declare a charge. If it can reach an enemy it may move into contact: that counts as a charge, it lines up with
//   the enemy and stops, and the unit it reached must Hold.
// Ker Splat: Wrecker Gobblers treat difficult terrain as dangerous terrain (movement.js kerSplat).
// Not yet: a unit whose models have different Random Movement dice (roll each, use the lowest); no unit in the
// game has that. Contact made while pursuing.

import { say, solid } from './game.js'
import { hasRule, isDead } from './units.js'
import { rollDice } from './dice.js'
import { canSee } from './sight.js'
import { inFrontArc, chargeDistance, engage } from './charge.js'
import { arcOfUnit } from './units.js'
import { isWhirler, sweptThroughWhirlers } from './whirlers.js'
import { kerSplat } from './movement.js'
import { chargePathTerrain } from './terrain.js'
import { polysOverlap } from './geometry.js'
import { corners } from './units.js'

// "3D6" from the model's (or its mount's) profile, or null.
export function randomMovementDice (u) {
  // (Spirit of Vaelgrath: while his spirit rebels, Random Movement (2D6))
  if (u.status?.spiritRebels) return '2D6'
  // (Drunken: Unsteady, Random Movement with a Movement of D6+2)
  if (u.status?.drunk === 'unsteady') return 'D6+2'
  if (!hasRule(u, 'Random Movement')) return null
  return [u.mount?.profile?.M, ...u.models.map(m => m.profile.M)].find(x => typeof x === 'string' && /D6/i.test(x)) || null
}
export const hasRandomMovement = u => !!randomMovementDice(u)

// Units of the active side still to make their random move this Compulsory Moves sub-phase.
export const randomMovers = game => solid(game).filter(u => u.side === game.active && hasRandomMovement(u) && !u.status.engaged && !u.status.fleeing && !u.status.randomMove)

export function rollRandomMove (game, u) {
  const spec = randomMovementDice(u)
  const n = Number((spec.match(/(\d*)D6/i)[1]) || 1)
  const dice = rollDice(game.rng, n)
  const total = dice.reduce((a, b) => a + b, 0) + Number((spec.match(/\+(\d+)/) || [])[1] || 0)
  u.status.randomMove = { rolled: total, done: false }
  say(game, 'roll', `${u.name} (Random Movement ${spec}): ${dice.join('+')} = ${total}" at most this turn.`)
  return total
}

// Enemy units it could reach: seen, in its front arc, within the rolled distance (as a charge
// is measured), and not through impassable terrain. Whirlers cannot be charged.
export function randomContactTargets (game, u) {
  const r = u.status.randomMove
  if (!r || r.done) return []
  return solid(game).filter(t => t.side !== u.side && !isWhirler(t) && !isDead(t) && !t.status.fleeing && inFrontArc(u, t) && canSee(game, u, t)).map(t => {
    const arc = arcOfUnit(t, u)
    const { place, needed } = chargeDistance(u, t, arc)
    return { t, arc, place, needed }
  }).filter(x => x.needed <= r.rolled + 1e-6 && !chargePathTerrain(game, u, x.place).impassable)
}

export function randomMoveIntoContact (game, u, t) {
  const opt = randomContactTargets(game, u).find(x => x.t === t)
  if (!opt) return { ok: false, reason: `${t.name} is out of reach` }
  const was = { pos: u.pos, facing: u.facing }
  Object.assign(u, opt.place)
  if (solid(game).some(o => o !== u && o !== t && polysOverlap(corners(u), corners(o), 0.02))) { Object.assign(u, was); return { ok: false, reason: 'another unit is in the way where it would align' } }
  // the way there: Whirlers on it hit it; difficult terrain is dangerous to a Wrecker Gobbler (Ker-splat)
  sweptThroughWhirlers(game, u, was)
  if (u.status.removed) return { ok: true }
  if (hasRule(u, 'Ker-splat') && chargePathTerrain(game, Object.assign(Object.create(u), was), opt.place).difficult) kerSplat(game, u)
  if (u.status.removed) return { ok: true }
  engage(game, u, t, opt.arc)
  u.status.charged = true
  u.status.chargeDistance = opt.needed
  u.status.moved = true
  u.status.randomMove.done = true
  t.status.reaction = 'hold'
  say(game, 'h', `${u.name} bounds ${opt.needed.toFixed(1)}" (of ${u.status.randomMove.rolled}") into ${t.name}'s ${opt.arc} — it counts as having charged; ${t.name} must Hold.`)
  return { ok: true }
}

// It stays where it is (the roll is only a maximum).
export function randomMoveStay (game, u) {
  if (u.status.randomMove) u.status.randomMove.done = true
  u.status.moved = true
  say(game, '', `${u.name} does not move.`)
}

