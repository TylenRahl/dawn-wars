// The Jade Dominion of Shen's own army rules, as small functions and tables that the shared rules modules call at the
// right moment (combat, damage, Leadership, magic and others; each comment says where).

import { hasRule, ruleValue, isDead } from './units.js'

const live = c => !c.status?.removed && !isDead(c)
const turnKey = game => `${game.round}:${game.active}`

// Celestial Forged Armour X — an Untouchable save of X+ (damage.js saveFor); a Wizard with it may wear
// armour without penalty (magic.js armoured)
export function shenWards (u) {
  if (!hasRule(u, 'Celestial Forged Armour')) return []
  const v = Number(String(ruleValue(u, 'Celestial Forged Armour') || '5').replace('+', '')) || 5
  return [{ value: v, source: 'Celestial Forged Armour' }]
}
export const celestialWizard = u => hasRule(u, 'Celestial Forged Armour')

// Defensive Stance — unless it charged (or counts as having charged), natural 1s on Armour
// Saves in the Combat phase re-rolled (damage.js itemSaveRerolls)
export const defensiveStance = (game, t) => hasRule(t, 'Defensive Stance') && !t.status?.charged && game?.phase === 'combat'

// Shenese Cataphracts — a follow up move: it counts as having charged in the next turn
// (combat.js, as a unit that pursued into a fight)
export const cataphracts = u => hasRule(u, 'Shenese Cataphracts')

// Grand Strategist — unless fleeing, friendly units in its Command range (not the General) may
// use its Leadership (leadership.js)
export function grandStrategist (game, u, distanceBetween, commandRange, hostOf) {
  // ("except your General": nor a unit the General leads)
  if (u.isGeneral || (u.joined || []).some(c => live(c) && c.isGeneral)) return null
  return game.units.filter(c => c !== u && c.side === u.side && c.placed && live(c) && !c.status.fleeing && hasRule(c, 'Grand Strategist') && distanceBetween(hostOf(game, c) || c, u) <= commandRange(c))
    .map(c => ({ c, ld: Math.max(0, ...c.models.filter(m => m.wounds > 0).map(m => m.profile.Ld ?? 0), ...(c.crew || []).map(x => x.profile?.Ld ?? 0)) }))
    .sort((a, b) => b.ld - a.ld)[0] || null
}

// Heavenly Beacon — friendly units within 12" of a Kite Lantern (not fleeing) re-roll a failed
// Panic or Rally test (leadership.js)
export const beaconNear = (game, u, distanceBetween) => game.units.some(c => c !== u && c.side === u.side && c.placed && live(c) && !c.status.fleeing && hasRule(c, 'Heavenly Beacon') && distanceBetween(c, u) <= 12)

// Will of the Dragons — a failed Panic test re-rolled when a friendly unit within 6" is destroyed,
// or when fled through (leadership.js)
export const willOfDragons = (u, why) => hasRule(u, 'Will of the Dragons') && /destroyed|wiped out|fled through|flees through|fell back through/i.test(why || '')

// Mastery of the Elemental Winds — once a turn, a Wizard with it within 6" of another friendly
// Wizard with it: +1 to a Casting roll (magic.js)
export function elementalMastery (game, u, distanceBetween, hostOf) {
  if (!hasRule(u, 'Mastery of the Elemental Winds') || u.status.masteryTurn === turnKey(game)) return false
  const from = hostOf(game, u) || u
  const near = game.units.some(c => c !== u && c.side === u.side && c.placed && live(c) && c.wizard && hasRule(c, 'Mastery of the Elemental Winds') && distanceBetween(hostOf(game, c) || c, from) <= 6)
  if (near) u.status.masteryTurn = turnKey(game)
  return near
}
