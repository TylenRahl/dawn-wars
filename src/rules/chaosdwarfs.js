// The Ashforged's own army rules, as small functions and tables that the shared rules modules call at the
// right moment (combat, damage, Leadership, magic and others; each comment says where).

import { say } from './game.js'
import { hasRule, alive, isDead } from './units.js'
import { rollDice } from './dice.js'
import { bannersOf } from './items.js'

const live = c => !c.status?.removed && !isDead(c)

// Blackshard Armour — a 5+ Ward against Flaming Attacks (damage.js saveFor); a Wizard with it
// may wear armour without penalty (magic.js armoured)
// (The Lammasu's Beard: its unit a 6+ Ward)
export const cdWards = u => [...(hasRule(u, 'Blackshard Armour') ? [{ value: 7, flaming: 5, source: 'Blackshard Armour' }] : []), ...(bannersOf(u).includes('the-lammasus-beard') ? [{ value: 6, source: "the Lammasu's Beard" }] : [])]
export const blackshardWizard = u => hasRule(u, 'Blackshard Armour')

// Backstab — engaged with an enemy's flank or rear: failed rolls To Hit against it re-rolled
// (combat.js)
export const backstabs = (a, b, host) => hasRule(a, 'Backstab') && ['left', 'right', 'rear'].includes(b.engagedWith?.[(host || a).id])

// Stampede — Impact Hits AP -2 (combat.js)
export const stampede = u => hasRule(u, 'Stampede')

// Blazing Body — at the start of every Combat phase, every model in base contact without it (friend
// or foe): a S3 Flaming hit (not counted in the Melee Outcome) (combat.js fightCombatInner; the enemy units it fights,
// each model of their front rank touching it read as one hit per model in its fighting rank)
export function blazingBody (game, u, units, spellHits) {
  if (!hasRule(u, 'Blazing Body') || u.status.blazedKey === `${game.round}:${game.active}`) return
  u.status.blazedKey = `${game.round}:${game.active}`
  for (const o of units.filter(o => o.side !== u.side && u.engagedWith?.[o.id] && live(o) && !hasRule(o, 'Blazing Body'))) {
    const n = Math.min(alive(o).length, Math.max(1, alive(u).length))
    say(game, 'roll', `${u.name}'s Blazing Bodies scorch ${o.name}: ${n} Strength 3 Flaming hit${n === 1 ? '' : 's'} (not counted in the Melee Outcome).`)
    // (Blazing Body: not towards the Melee Outcome — made before the blows, its wounds never reach it)
    spellHits(game, o, n, 3, 0, { flaming: true, nonMagical: true, label: 'Blazing Body: ' })
  }
}

// Quell Panic — friendly Levies within 6" of it (not fleeing) re-roll a failed Panic test
// (leadership.js)
export const quellsPanic = (game, u, distanceBetween) => hasRule(u, 'Levies') && game.units.some(c => c !== u && c.side === u.side && c.placed && live(c) && !c.status.fleeing && hasRule(c, 'Quell Panic') && distanceBetween(c, u) <= 6)

// Sorcerer's Curse — a backlash: a Toughness test; failed, it loses a Wound and gains +1 Toughness
// instead of rolling on the Backlash table; passed, the Backlash table as normal (magic.js backlash). Returns true when the
// table is skipped.
export function sorcerersCurse (game, u, applyWounds) {
  if (!hasRule(u, "Sorcerer's Curse")) return false
  const m = alive(u)[0]
  const T = m?.profile.T ?? 4
  const r = rollDice(game.rng, 1)[0]
  const passed = r === 1 || (r !== 6 && r <= T)
  say(game, 'roll', `${u.name}'s Sorcerer's Curse: Toughness test, rolled ${r}, needs ${T} or less — ${passed ? 'passed: the Backlash table as normal' : 'FAILED: its flesh hardens to stone'}.`)
  if (passed) return false
  for (const x of u.models) x.profile = { ...x.profile, T: Math.min(10, (x.profile.T ?? 4) + 1) }
  applyWounds(game, u, 1, "the Sorcerer's Curse")
  say(game, 'bad', `${u.name} loses a Wound and gains +1 Toughness instead of a Backlash.`)
  return true
}

// Storm of Ash — until the caster's next Start of Turn, enemy units within 9" of it -1 To Hit (natural 6s
// unaffected) (combat.js, shooting.js)
export const inStormOfAsh = (game, a, distanceBetween) => (game?.effects || []).some(e => e.kind === 'stormOfAsh' && e.side !== a.side && (() => { const c = game.units.find(x => x.id === e.casterId); return c && live(c) && c.placed && distanceBetween(c, a) <= 9 })())
