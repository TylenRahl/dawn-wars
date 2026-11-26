// Regiments and their detachments in battle: which detachments may support a charged regiment, and the Supporting
// Fire and Supporting Charge they make. Used by the battle screen (ui/phases.js).
// The list rules (size, no command, two per regiment) are in roster.js; deployment within 3" in game.js; Regimental
// Leadership in leadership.js; Regimental Psychology in units.js rulesOf.
// When an enemy declares a charge on a regimental unit that does not flee, each of its detachments within 3" that is
//   neither engaged nor fleeing may make one Supporting Action a turn:
// Supporting Fire: a detachment with missile weapons Stands & Shoots at once as if it were the one charged; if it
//   cannot, it does nothing.
// Supporting Charge: at the end of Charge Moves, if still free, it charges one enemy unit that charged its regiment
//   this turn, out of the usual order (the enemy, already in combat, holds).

import { say } from './game.js'
import { distanceBetween, isDead } from './units.js'
import { canStandAndShoot, declareCharge, resolveCharge } from './charge.js'
import { standAndShoot } from './shooting.js'

const turnKey = game => `${game.round}:${game.active}`

// The detachments of `reg` able to support it now.
// (a detachment that is itself being charged this turn answers its own charge instead)
export function supporters (game, reg) {
  return (reg.detachments || []).filter(d => d.placed && !d.status.removed && !isDead(d) && !d.status.engaged && !d.status.fleeing &&
    distanceBetween(d, reg) <= 3 && d.status.supportTurn !== turnKey(game) &&
    !game.units.some(c => c.side !== d.side && c.status.declaredCharge?.target === d.id))
}

// What a detachment may do for its regiment charged by `charger`: 'fire' (it has missile weapons),
// 'charge', or 'none'.
export function supportOptions (game, d, charger) {
  const out = []
  if (d.ranged) out.push('fire')
  out.push('charge', 'none')
  return out
}

export async function supportingAction (game, d, reg, charger, choice) {
  if (choice === 'none') return
  d.status.supportTurn = turnKey(game)
  if (choice === 'fire') {
    if (!canStandAndShoot(game, d, charger)) { say(game, '', `${d.name} declares Supporting Fire but cannot Stand & Shoot at ${charger.name}: it stands idly by.`); return }
    say(game, '', `${d.name} gives SUPPORTING FIRE for ${reg.name}.`)
    d.status.stoodAndShot = true
    await standAndShoot(game, d, charger)
    return
  }
  d.status.supportCharge = reg.id
  say(game, '', `${d.name} will make a SUPPORTING CHARGE for ${reg.name} at the end of the Charge Moves.`)
}

// The enemies a supporting charger may go for: units that charged into contact with its regiment.
export function supportChargeTargets (game, d) {
  const reg = game.units.find(u => u.id === d.status.supportCharge)
  if (!reg || d.status.engaged || d.status.fleeing || d.status.removed) return []
  return game.units.filter(e => e.side !== d.side && e.status.charged && e.status.declaredCharge?.target === reg.id && !e.status.removed && e.engagedWith?.[reg.id])
}

// The out-of-sequence charge itself: declared and resolved at once (its target holds).
export function supportingCharge (game, d, t) {
  d.status.supportCharge = null
  say(game, 'h', `${d.name} makes a SUPPORTING CHARGE at ${t.name}.`)
  // declared as any charge (Fear and Terror tests included), then made at once
  const c = declareCharge(game, d, t)
  if (!c.ok) { say(game, 'bad', `${d.name} cannot make its Supporting Charge at ${t.name}: ${c.reason}.`); return { ok: false } }
  if (c.failedFear) return { ok: false }
  const result = resolveCharge(game, d)
  d.status.declaredCharge = null
  return { ok: true, result }
}
