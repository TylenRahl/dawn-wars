// The Gnawkin's own army rules, as small functions and tables that the shared rules modules call at the
// right moment (combat, damage, Leadership, magic and others; each comment says where).

import { say } from './game.js'
import { hasRule, alive, isDead } from './units.js'
import { rollDice } from './dice.js'

const live = c => !c.status?.removed && !isDead(c)
const hostIn = (game, c) => game?.units?.find(h => (h.joined || []).includes(c)) || null

// Scurry Away — +1 to the result of any Flee roll it makes (combat.js, charge.js)
export const scurries = u => [u, ...(u.joined || [])].every(c => !live(c) || hasRule(c, 'Scurry Away'))

// Wyrdstone Weapons — a single ordinary hand weapon has Magical Attacks and AP -1 (combat.js)
export const wyrdstone = (a, w) => hasRule(a, 'Wyrdstone Weapons') && !w.magic && /^hand weapon$/i.test(w.key || '')

// Cloud of Flies — attacks directed at this character in combat -1 To Hit (combat.js)
export const cloudOfFlies = x => !!x?.special && hasRule(x, 'Cloud of Flies') // (a unit or character, not a bare model)

// Crushing Bulk — a Sparkwheel's Stomp Attacks AP -1; a unit taking its Impact Hits takes a
// Leadership test, failed: Disrupted until the end of this Combat phase (combat.js)
export function crushingBulk (game, a, b, leadershipTest) {
  if (!hasRule(a, 'Crushing Bulk') || !live(b)) return
  const t = leadershipTest(game, b, { label: `${b.name} — the Sparkwheel's Crushing Bulk` })
  say(game, 'roll', t.text)
  if (!t.passed) { b.status.disruptedUntilEndOfCombat = true; say(game, 'bad', `${b.name} is Disrupted until the end of this Combat phase.`) }
}

// Weapon Teams: its 'parent' — taken here as the nearest friendly unit of Rankrats or
// Ironvermin (the units that may take one weapon team), not fleeing, within 3"
const isParent = x => /^(rankrats|ironvermin)/.test(x.entryId || '')
export function parentOf (game, u, distanceBetween) {
  if (!/^weapon-team/.test(u.entryId || '')) return null
  return game.units.filter(x => x.side === u.side && x.placed && live(x) && isParent(x) && distanceBetween(x, u) <= 3).sort((a, b) => distanceBetween(a, u) - distanceBetween(b, u))[0] || null
}
// Weapon Team Leadership — within 3" of its parent: + the parent's Rank Bonus (to 10)
// (leadership.js)
export const weaponTeamLd = (game, u, distanceBetween, rankBonus) => { const p = parentOf(game, u, distanceBetween); return p ? rankBonus(game, p) : 0 }
// Targeting Weapon Teams — within 3" of a parent of five or more models (not fleeing), not a
// target for enemy shooting or spells unless it is the closest (shooting.js, magic.js)
export function screenedTeam (game, t, distanceBetween) {
  const p = parentOf(game, t, distanceBetween)
  return !!p && !p.status.fleeing && alive(p).length >= 5
}

// Too Horrible to Die — the first time a Warren Abomination loses its last Wound, a D6: 1-3 it
// is gone; 4-5 a Rat Swarm of one model bursts forth (not in the game yet: it is gone); 6 it rises again with D3 Wounds
// (damage.js removeUnit). Returns true if it rises.
export function tooHorribleToDie (game, u) {
  if (!hasRule(u, 'Too Horrible to Die') || u.status.horribleTried) return false
  u.status.horribleTried = true
  const r = rollDice(game.rng, 1)[0]
  if (r === 6) {
    const m = u.models.find(x => x.role !== 'handler') || u.models[0]
    if (!m) return false
    m.wounds = Math.min(m.startW ?? 3, Math.ceil(rollDice(game.rng, 1)[0] / 2))
    u.status.woundsTaken = Math.max(0, (u.status.woundsTaken || 0) - m.wounds)
    say(game, 'good', `${u.name} is TOO HORRIBLE TO DIE: D6 = 6 — it rises anew with ${m.wounds} Wound${m.wounds === 1 ? '' : 's'}.`)
    return true
  }
  say(game, 'roll', `${u.name}, Too Horrible to Die: D6 = ${r} — ${r >= 4 ? 'a swarm of rats bursts from the corpse (the Rat Swarm is not in the game yet)' : 'it wheezes its last'}.`)
  return false
}

// Verminous Valour — a character with a unit of Unit Mass 10+, not in a challenge, may retire
// to its rear: no attacks by or at it, the unit still using its Leadership (combat.js, as Shield of the Mere)
export const verminousValour = c => hasRule(c, 'Verminous Valour')
