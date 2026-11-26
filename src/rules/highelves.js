// The Ilthari Realms' own army rules, as small functions and tables that the shared rules modules call at the right
// moment (combat, damage, Leadership, magic and others; each comment says where).

import { say } from './game.js'
import { hasRule, alive, isDead } from './units.js'
import { rollDice } from './dice.js'

const live = c => !c.status?.removed && !isDead(c)

// Untouchable saves (damage.js saveFor):
// Blessings of Solantar 5+ against Flaming Attacks; Deflect Shots 6+ against non-magical
// shooting; Dragon Armour 6+; Witness to Destiny 6+ against non-magical attacks
export function elfWards (u) {
  const out = []
  if (hasRule(u, 'Blessings of Solantar')) out.push({ value: 7, flaming: 5, source: 'the Blessings of Solantar' })
  if (hasRule(u, 'Deflect Shots')) out.push({ value: 6, nonMagical: true, shootingOnly: true, source: 'Deflect Shots' })
  if (hasRule(u, 'Dragon Armour')) out.push({ value: 6, source: 'Dragon Armour' })
  if (hasRule(u, 'Witness to Destiny')) out.push({ value: 6, nonMagical: true, source: 'Witness to Destiny' })
  return out
}
// (Dragon Armour, Moonsilver Armour Moonsilver Barding: a Wizard with it may wear armour without penalty — magic.js)
export const elfWizardArmour = u => hasRule(u, 'Dragon Armour') || hasRule(u, 'Moonsilver Armour')

// Elven Reflexes — +1 Initiative (not its mount) in the first round of any combat (combat.js)
export const elvenReflexes = u => hasRule(u, 'Elven Reflexes')
// Martial Prowess — +1 Weapon Skill in the first round of combat (its supporting attacks to the
// flank and rear are not in the game yet)
export const martialProwess = u => hasRule(u, 'Martial Prowess')
// Moonsilver Weapons — fighting with a single non-magical hand weapon, natural 1s To Hit re-rolled
export const moonsilverWeapons = u => hasRule(u, 'Moonsilver Weapons')
// Blizzard Aura — enemies in base contact Strike Last; Enfeebling Cold — -1 Strength (to 1)
export const blizzard = b => [b, ...(b.joined || [])].some(x => live(x) && hasRule(x, 'Blizzard Aura'))
export const enfeebling = b => [b, ...(b.joined || [])].some(x => live(x) && hasRule(x, 'Enfeebling Cold'))
// Lion Cloak — +1 armour value against non-magical shooting (to 2+) (damage.js)
export const lionCloak = u => hasRule(u, 'Lion Cloak')
// Abyssal Cloak — shooting at it at long range -2 rather than -1 (shooting.js)
export const abyssal = t => hasRule(t, 'Abyssal Cloak')
// Arrows of Siriel — a bow (long-, short-, warbow, Bow of Saelwood) AP -1 and Armour Bane (1)
export const arrowsOfSiriel = (u, w) => hasRule(u, 'Arrows of Siriel') && /bow/i.test(w.key || '') && !/crossbow/i.test(w.key || '')
// Mighty Constitution — Taeron +1 Strength in a turn he charged 3"+; immune to Poisoned Attacks
export const mightyConstitution = u => hasRule(u, 'Mighty Constitution')
// Valour of Ages — a failed Panic test for heavy casualties or being fled through re-rolled
export const valourOfAges = (u, why) => hasRule(u, 'Valour of Ages') && /casualties|lost \d+ of the|fled through|flees through|fell back through/i.test(why || '')
// Precision Strikes — Lumaren Sea Guard joined by Seriel Vane: weapons' AP improved by 1
export const precisionStrikes = a => /^lumaren-sea-guard/.test(a.entryId || '') && (a.joined || []).some(c => live(c) && hasRule(c, 'Precision Strikes'))
// Commanding Voice — Command range +3" (leadership.js)
export const commandingVoice = u => hasRule(u, 'Commanding Voice') ? 3 : 0
// King's Guard — White Lions joined by the General fight challenges as characters (combat.js)
export const kingsGuard = u => /^white-lions/.test(u.entryId || '') && (u.joined || []).some(c => live(c) && c.isGeneral)

// Joining (joining.js): Thessan Warriors (General or Thessan Hunter), Sons of Pyrrhan (General
// or Blood of Pyrrhan), Warriors of Umbreth (Shadow Stalker), Warriors of the Tower of Sorneth (an Ilthari Mage, or
// Warden of Aelsyr or Loremaster) — the Elven Honours are the characters' items
export function elfJoinProblem (c, host) {
  const honour = id => (c.items || []).includes(id)
  if (hasRule(host, 'Thessan Warriors') && !c.isGeneral && !honour('thessan-hunter')) return `${host.name} are Thessan Warriors: only the General or a Thessan Hunter may join them`
  if (hasRule(host, 'Sons of Pyrrhan') && !c.isGeneral && !honour('blood-of-pyrrhan')) return `${host.name} are Sons of Pyrrhan: only the General or a character with the Blood of Pyrrhan may join them`
  if (hasRule(host, 'Warriors of Umbreth') && !honour('shadow-stalker')) return `${host.name} are Warriors of Umbreth: only a Shadow Stalker may join them`
  if (hasRule(host, 'Warriors of the Tower of Sorneth') && !/^(archmage|mage)$/.test(c.entryId || '') && !honour('warden-of-aelsyr') && !honour('loremaster')) return `${host.name} are Warriors of the Tower of Sorneth: only a Mage, a Warden of Aelsyr or a Loremaster may join them`
  return null
}

// From the Ashes — a Emberwing Phoenix losing its last Wound, a D6: 1-2 gone; 3-5 it explodes,
// every enemy unit in base contact D6 S3 AP -1 Flaming hits, then gone; 6 reborn with D3 Wounds (damage.js removeUnit).
// Returns true if it is reborn.
export function fromTheAshes (game, u, spellHits) {
  if (!hasRule(u, 'From the Ashes')) return false
  const r = rollDice(game.rng, 1)[0]
  if (r === 6) {
    const w = Math.ceil(rollDice(game.rng, 1)[0] / 2)
    const m = u.models[0]
    m.wounds = Math.min(m.startW || w, w)
    say(game, 'good', `${u.name} — From the Ashes: D6 = 6 — consumed in flame and REBORN with ${m.wounds} Wound${m.wounds === 1 ? '' : 's'}.`)
    return true
  }
  if (r >= 3) {
    say(game, 'roll', `${u.name} — From the Ashes: D6 = ${r} — it explodes into flame.`)
    for (const id of Object.keys(u.engagedWith || {})) { const o = game.units.find(x => x.id === id); if (o && live(o) && o.side !== u.side) { const n = rollDice(game.rng, 1)[0]; spellHits(game, o, n, 3, -1, { flaming: true, nonMagical: true, label: `From the Ashes (${n} hits): ` }) } }
  } else say(game, 'roll', `${u.name} — From the Ashes: D6 = ${r} — it crumbles into cold ashes.`)
  return false
}

// Wake of Fire — flying over an enemy unit not engaged in the Remaining Moves sub-phase: D6 S4
// AP -1 Flaming hits on it (the first unit flown over — a guess at the player's choice) (movement.js, dwarfs.js bombsAway)
export const wakeOfFire = u => hasRule(u, 'Wake of Fire')
