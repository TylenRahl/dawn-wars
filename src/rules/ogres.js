// The Gutlords' own army rules, as small functions and tables that the shared rules modules call at the right moment
// (combat, damage, Leadership, magic and others; each comment says where).

import { say } from './game.js'
import { hasRule, alive, isDead } from './units.js'

const live = c => !c.status?.removed && !isDead(c)

// Impact Hits (combat.js): Bull Charge AP -1 (not its mount's); Frostfang Charge AP -1 and
// Armour Bane (1) (the Bane not in yet); Thunderous Charge AP -2
export const ogreImpactAP = u => hasRule(u, 'Thunderous Charge') ? -2 : (hasRule(u, 'Frostfang Charge') || hasRule(u, 'Bull Charge')) ? -1 : 0

// Blessings of the Volcano God — 4+ Ward against Flaming Attacks (damage.js saveFor)
export const ogreWards = u => hasRule(u, 'Blessings of the Volcano God') ? [{ value: 7, flaming: 4, source: 'Blessings of the Volcano God' }] : []

// Largely Insignificant — never causes friendly Panic tests (shooting.js, combat.js); joined
// only by a character with it (joining.js)
export const insignificant = u => hasRule(u, 'Largely Insignificant')

// Numbing Chill — enemy models in base contact -1 WS and Initiative (to 1) (combat.js)
export const numbed = (game, a, b) => [b, ...(b.joined || [])].some(x => live(x) && hasRule(x, 'Numbing Chill')) && !!(a.engagedWith || {})[b.id]

// Running with the Pack — a Hunter with Sabretusks: he gains Swiftstride, they lose Impetuous
// (units.js rulesOf)
export const packHunter = (u, joined = []) => /^fangcat/.test(u.entryId || '') && joined.some(c => live(c) && hasRule(c, 'Running with the Pack'))

// Stone Skeleton — an unsaved Multiple Damage wound costs one Wound fewer (to 1) (damage.js)
export const stoneSkeleton = u => hasRule(u, 'Stone Skeleton')

// Traps and Snares — an enemy model ending its charge in contact with it tests Dangerous Terrain
// (charge.js; one test per charging model in contact — here, the whole front rank's models in contact)
export const traps = t => hasRule(t, 'Traps & Snares')

// Butcher's Cauldron — Impact Hits (D3+1) instead of (2); and in its Command sub-phase, not
// engaged, a Leadership test: passed, it and its unit Regeneration (5+) until the next Start of Turn; failed, a Wound lost
export const canCauldron = (game, c) => game.sub === 'command' && c.side === game.active && c.placed && live(c) && !c.status.engaged && (c.options || []).includes("Butcher's Cauldron") && c.status.cauldronTurn !== `${game.round}:${game.active}`
export function cauldron (game, c, { testLeadership, applyWounds, addEffect, host }) {
  c.status.cauldronTurn = `${game.round}:${game.active}`
  const ld = Math.max(...alive(c).map(m => m.profile.Ld ?? 7))
  const t = testLeadership(game.rng, ld)
  say(game, 'roll', `${c.name} makes an offering to the Hunger Below (Butcher's Cauldron): Leadership ${t.dice.join('+')} = ${t.total}, needs ${ld} — ${t.passed ? 'PASSED: Regeneration (5+) for it and its unit until the next Start of Turn' : 'FAILED: it loses a single Wound'}.`)
  if (!t.passed) { applyWounds(game, c, 1, "the Butcher's Cauldron"); return }
  // (a worse Regeneration it already has, Trollguts' 6+, is replaced for the while)
  const got = [c, host].filter(Boolean).map(x => ({ x, had: [...x.special].find(r => r.startsWith('Regeneration')) })).filter(({ had }) => !had || Number(had.match(/\d/)?.[0]) > 5)
  for (const { x, had } of got) { if (had) x.special.delete(had); x.special.add('Regeneration (5+)') }
  addEffect(game, { kind: 'cauldron', side: c.side, until: 'nextStartOfTurn', revert: () => { for (const { x, had } of got) { x.special.delete('Regeneration (5+)'); if (had) x.special.add(had) } }, say: "The Butcher's Cauldron cools." })
}

// At fielding (units.js): Butcher's Cauldron — Impact Hits (D3+1) instead of Impact Hits (2)
export function ogreOptions (unit) {
  if (!(unit.options || []).includes("Butcher's Cauldron")) return
  for (const r of [...unit.special]) if (r.startsWith('Impact Hits')) unit.special.delete(r)
  unit.special.add('Impact Hits (D3+1)')
}
