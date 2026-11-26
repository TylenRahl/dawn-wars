// Vanguard moves: after deployment, units with Vanguard may make one move as in Basic Movement (they may manoeuvre
// but not march). If both armies have some, a roll-off decides who goes first and the players then alternate one
// unit at a time. A unit that made a Vanguard move may not declare a charge in its first turn. Here it happens after
// both armies are deployed and before the roll for the first turn (the rules leave the moment open).
// Exports the steps the battle screens call (ui/battle.js, ui/phases.js).

import { say, sideName, rollOff } from './game.js'
import { hasRule } from './units.js'
import { makeMove } from './movement.js'

export const vanguardUnits = (game, side) => game.units.filter(u => u.side === side && u.placed && !u.status.removed && !u.status.joinedTo && hasRule(u, 'Vanguard') && !u.status.vanguardDone)

// Begin the Vanguard moves; returns false when no unit has the rule.
export function startVanguard (game) {
  const a = vanguardUnits(game, 0).length; const b = vanguardUnits(game, 1).length
  if (!a && !b) return false
  const first = a && b ? rollOff(game, 'to make the first Vanguard move') : a ? 0 : 1
  game.vanguard = { turn: first }
  say(game, 'h', `VANGUARD MOVES: ${sideName(game, first)} first, then alternating, one unit at a time.`)
  return true
}

function next (game) {
  const t = game.vanguard.turn
  if (vanguardUnits(game, 1 - t).length) game.vanguard.turn = 1 - t
  else if (!vanguardUnits(game, t).length) { game.vanguard = null; say(game, '', 'The Vanguard moves are done.') }
}

// Move one Vanguard unit (forward, wheels, turns, reforms... no march). Returns makeMove's check.
export function vanguardMove (game, u, plan) {
  if (!game.vanguard || u.side !== game.vanguard.turn) return { ok: false, reason: 'it is not its turn for a Vanguard move' }
  if (!vanguardUnits(game, u.side).includes(u)) return { ok: false, reason: 'it has no Vanguard move to make' }
  const r = makeMove(game, u, plan)
  if (!r.ok) return r
  Object.assign(u.status, { moved: false, reformed: false, vanguardDone: true, vanguarded: true })
  next(game)
  return r
}
// It (or the player) gives up its Vanguard move.
export function vanguardPass (game, u) {
  u.status.vanguardDone = true
  say(game, '', `${u.name} makes no Vanguard move.`)
  next(game)
}
