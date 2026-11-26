// The Broken Crowns' own army rules (the Infamous Origins and the units' upgrades), as small functions and tables
// that the shared rules modules call at the right moment (combat, damage, Leadership, magic and others; each
// comment says where).

import { say } from './game.js'
import { hasRule } from './units.js'

// The Origins of the Infamous — a character's Infamous Origin: its characteristic modifiers
// (The Might of Varezza, The Renegade Knight, The Noble Outlaw, The Wandering Diestro), and
// the other army whose magic item lists it may buy from. Its rules come from the option's `grants` (the data build).
export const ORIGINS = {
  'The Might of Varezza': { mods: { Ld: 1 } },
  'The Renegade Knight': { mods: { WS: 1, S: 1 }, items: 'kingdom-of-lyonne' },
  'The Noble Outlaw': { mods: { BS: 1, Ld: 1 }, items: 'concord-realm' },
  'The Wandering Diestro': { mods: { WS: 2 } }
}
export const originOf = optionNames => Object.keys(ORIGINS).find(o => optionNames.includes(o)) || null
// the armies whose magic items this selection may buy (roster.js itemChoices)
export const itemArmies = (armyId, optionNames) => [armyId, ORIGINS[originOf(optionNames)]?.items].filter(Boolean)

const bump = (p, mods) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, mods[k] && typeof v === 'number' ? Math.min(10, v + mods[k]) : v]))

// At fielding (units.js fieldUnit), from the options chosen:
export function renegadeOptions (unit, entry, sel) {
  const chosen = (sel.options || []).map(i => entry.options[i]).filter(Boolean)
  for (const o of chosen) for (const r of o.grants || []) unit.special.add(r)
  const origin = originOf(unit.options)
  if (origin) for (const m of unit.models) m.profile = bump(m.profile, ORIGINS[origin].mods)
  // The Wandering Duelists: +1 Weapon Skill for the Brigands (and the once-per-game re-roll:
  // Feint & Dodge, as the Diestro's)
  if (unit.options.includes('+1 to Weapon Skill')) {
    for (const m of unit.models) m.profile = bump(m.profile, { WS: 1 })
    unit.special.add('Feint & Dodge')
  }
  // Marchlord Brigands: may swap Open Order for Close Order or Skirmishers
  if (unit.options.includes('Close Order') || unit.options.includes('Skirmishers')) {
    unit.special.delete('Open Order')
    unit.formation = unit.options.includes('Close Order') ? 'close' : 'skirmish'
  }
  // The Mercenary Hosts: the troop type becomes heavy infantry, and the Phalanx rule
  if (unit.options.includes('Heavy Infantry, Phalanx')) {
    unit.troopType = unit.troopType.map(t => t === 'Regular Infantry' ? 'Heavy Infantry' : t)
    unit.special.delete('Heavy Infantry') // (not a rule: the option's name, split at its comma by fieldUnit)
  }
  // The Outcast Knights: Lance Formation and Noble Disdain (the option's name splits into both)
}

// Noble Disdain — Cavalry with it does not test for Panic when a friendly infantry unit is
// destroyed within 6" or flees through it (shooting.js panicFromFriend)
export const disdains = (f, source) => hasRule(f, 'Noble Disdain') && /Cavalry/.test((f.troopType || []).join(' ')) && /Infantry/.test((source?.troopType || []).join(' '))

// Phalanx — a Close Order unit of Phalanx models deeper than it is wide is still in Combat
// Order while each rank has enough models for a rank bonus; it then cannot march at triple Movement. Charged by a
// unit with First Charge, it is not Disrupted.
export const isPhalanx = u => u.formation === 'close' && hasRule(u, 'Phalanx')

// Untutored Arcanist — a Backlash table roll: an extra D6, the highest discarded (magic.js)
export const untutored = u => hasRule(u, 'Untutored Arcanist')

// Feint and Dodge (and The Wandering Duelists) — once per game, an enemy model directing
// its attacks against the model re-rolls its successful To Hit rolls. (Used the first time it can be: the game asks
// no question in the middle of a round of blows — our own choice.)
export function feintAndDodge (game, target) {
  if (![...(target?.special || [])].includes('Feint & Dodge') || target.status.feintUsed) return false
  target.status.feintUsed = true
  say(game, '', `${target.name}: Feint & Dodge (once per game) — the attacker re-rolls its successful rolls To Hit.`)
  return true
}

// Tilean Stoicism — a joined unit is Stubborn while the character has made no Break test yet
export const stoicHost = (joined = []) => joined.some(c => !c.status?.removed && [...(c.special || [])].includes('Tilean Stoicism') && !c.status?.brokeTested)
