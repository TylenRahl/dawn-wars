// The Troll Hag and Mick Bogwallop: troll mobs' Hunger, Motherly Love, Mind the Boss, Syphoned Strength and the
// Troll Calla. The functions are called by combat.js, shooting.js, magic.js, leadership.js and the battle screen
// (ui/phases.js).

import { say, onTable } from './game.js'
import { rollDice, d3, d6 } from './dice.js'
import { alive, isDead, hasRule, distanceBetween, centre } from './units.js'
import { applyWounds, applyMultipleDamage, saveFor } from './damage.js'
import { unitMass } from './troops.js'
import { addEffect, templateHits, spellHits } from './spells.js'
import { hostOf } from './joining.js'

export const isTrollMob = u => /troll-mob/.test(u?.entryId || '')
const turnKey = game => `${game.round}:${game.active}`

// A characteristic test against the rank and file's Initiative: a natural 6 always fails, a 1 always passes
function initiativeTest (game, t, why) {
  const I = (alive(t).find(m => m.role === 'rank') || alive(t)[0])?.profile.I ?? 1
  const r = rollDice(game.rng, 1)[0]
  const passed = r === 1 || (r !== 6 && r <= I)
  say(game, 'roll', `${why}: ${t.name} Initiative test, rolled ${r}, needs ${I} or less — ${passed ? 'passed' : 'FAILED'}.`)
  return passed
}

// Indiscriminate Hunger — in her own Command sub-phase, a Troll Hag engaged
// in combat may nominate an enemy unit it is engaged with; that unit takes an Initiative test, and failed,
// loses a single Wound, and the Hag recovers a lost Wound.
export function hungerTargets (game, u) {
  return onTable(game).filter(t => t.side !== u.side && u.engagedWith?.[t.id] && !isDead(t))
}
export function canHunger (game, u) {
  if (!hasRule(u, 'Indiscriminate Hunger') || u.side !== game.active || game.sub !== 'command') return false
  if (u.status.removed || isDead(u) || u.status.fleeing || u.status.hunger === turnKey(game)) return false
  return hungerTargets(game, u).length > 0
}
export function hunger (game, u, t) {
  if (!canHunger(game, u) || !hungerTargets(game, u).includes(t)) return { ok: false, reason: `${u.name} cannot make an Indiscriminate Hunger attack on ${t?.name || 'that'}` }
  u.status.hunger = turnKey(game)
  say(game, 'h', `${u.name} makes an INDISCRIMINATE HUNGER attack on ${t.name}.`)
  if (initiativeTest(game, t, 'Indiscriminate Hunger')) return { ok: true, lost: 0 }
  const lost = applyWounds(game, t, 1, 'Indiscriminate Hunger')
  const m = alive(u)[0]
  if (lost && m && m.wounds < (m.startW || 1)) { m.wounds += 1; say(game, 'good', `${u.name} recovers a Wound (${m.wounds}).`) }
  return { ok: true, lost }
}

// Motherly Love — instead of attacking normally, the Hag may make a Motherly Love
// attack on an enemy unit it is engaged with: D6, 1-2 Smother, 3-4 Mother, 5-6 Mither. Made at its own
// Initiative (combat.js: its player is asked when the combat is fought). Returns the wounds it caused
// the enemy, for the Melee Outcome.
export function motherlyLove (game, a, b) {
  const S = alive(a)[0]?.profile.S ?? 6
  const r = d6(game.rng)
  const enemyWounds = () => onTable(game).filter(o => o.side !== a.side).reduce((n, o) => n + o.models.reduce((k, m) => k + Math.max(0, m.wounds), 0), 0)
  const before = enemyWounds()
  const regen0 = game.regenCounted || 0
  if (r <= 2) {
    // Smother: a 5" blast template over the centre of the target unit; every model under it but the Hag,
    // friend or foe, risks a hit at the Hag's Strength, AP -2
    say(game, 'roll', `Motherly Love: D6 = ${r} — SMOTHER: a 5" template over the centre of ${b.name}, Strength ${S}, AP -2.`)
    templateHits(game, centre(b), 2.5, S, -2, { except: a, label: 'Smother: ', nonMagical: true })
  } else if (r <= 4) {
    // Mother: one model in the fighting rank suffers D3+1 wounds, no armour or Regeneration save (Ward as normal)
    const n = d3(game.rng) + 1
    say(game, 'roll', `Motherly Love: D6 = ${r} — MOTHER: one model of ${b.name} in the fighting rank suffers D3+1 = ${n} wounds, no armour or Regeneration save.`)
    const sv = saveFor(b, { strength: S })
    let saved = false
    if (sv.ward) { const w = d6(game.rng); saved = w >= sv.ward; say(game, 'roll', `${b.name} Untouchable save ${sv.ward}+: ${w} — ${saved ? 'saved' : 'not saved'}.`) }
    if (!saved) applyMultipleDamage(game, b, [n], 'Motherly Love')
  } else {
    // Mither: D6+1 hits at the Hag's Strength, no Armour Roll (Ward and Regeneration as normal); -1 Leadership
    // until the end of this turn
    const n = d6(game.rng) + 1
    say(game, 'roll', `Motherly Love: D6 = ${r} — MITHER: ${b.name} suffers D6+1 = ${n} Strength ${S} hits, no Armour Roll, and -1 Leadership this turn.`)
    spellHits(game, b, n, S, 0, { noArmour: true, nonMagical: true, label: 'Mither: ' })
    if (!isDead(b) && !b.status.removed) {
      const changed = alive(b).filter(m => typeof m.profile.Ld === 'number')
      for (const m of changed) m.profile = { ...m.profile, Ld: m.profile.Ld - 1 }
      addEffect(game, { kind: 'statMod', spell: 'Mither', side: a.side, unitId: b.id, until: 'endOfTurn', revert: () => { for (const m of changed) m.profile = { ...m.profile, Ld: m.profile.Ld + 1 } } })
    }
  }
  // (wounds recovered by Regeneration still count: Regeneration)
  return Math.max(0, before - enemyWounds()) + ((game.regenCounted || 0) - regen0)
}

// Mick Bogwallop: friendly Troll Mobs within 3" of him (not fleeing)
const trollsNear = (game, u, pred = () => true) => onTable(game).filter(t => t.side === u.side && isTrollMob(t) && !t.status.fleeing && pred(t) && distanceBetween(hostOf(game, u) || u, t) <= 3)

// Mind the Boss — he cannot be targeted by enemy shooting or enemy spells while
// up to 3" from a friendly Troll Mob, except when he is the closest target. `closest`: the shooter's closest target.
export const protectedBoss = (game, t, closest) => hasRule(t, 'Mind the Boss') && t !== closest && trollsNear(game, t).length > 0

// Syphoned Strength — +1 to his Casting rolls within 3" of a friendly Troll Mob of
// Unit Mass 6 or more that is not fleeing
export const syphonedStrength = (game, u) => hasRule(u, 'Syphoned Strength') && trollsNear(game, u, t => unitMass(t) >= 6).length > 0

// The Troll Whistler — while he is not fleeing, friendly Troll Mobs within his Command range
// may use his Leadership (leadership.js)
export function trollCalla (game, u, commandRange) {
  if (!isTrollMob(u)) return null
  const o = game.units.find(c => c.side === u.side && c.placed && !c.status.removed && !isDead(c) && hasRule(c, 'The Troll Whistler') && !(hostOf(game, c) || c).status.fleeing && !c.status.fleeing && distanceBetween(hostOf(game, c) || c, u) <= commandRange(c))
  if (!o) return null
  const ld = Math.max(0, ...alive(o).map(m => m.profile.Ld ?? 0))
  return { value: ld, from: `${o.name}'s Leadership ${ld} (The Troll Whistler)` }
}
