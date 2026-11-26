// More Than One Combat Weapon: which combat weapon a unit fights with, chosen by its player. Exports the choice
// points for a unit (combatWeaponChoices, weaponChoicePoints), recording and reading the choice, and
// askCombatWeapons; used by combat.js, the fighting-with panel (ui/fightingWith.js) and the sprite map.
//
// A unit in combat with two or more combat weapons picks one each time its combat is chosen (Step 1.1 of Choose
//   & Fight). The whole unit, command included, uses the same weapon; Motley Crew units may differ. A character
//   always picks on its own, whatever the unit it joined uses. A champion who may be equipped differently may also
//   pick separately (not built: no champion in the data has a different mundane option; see below).
// Hand weapon: every model has one unless told otherwise, so it is always a choice unless the unit's equipment
//   names other weapons in its place (Crocbrutes: great weapons only).
// Additional hand weapon: Extra Attacks (+1), Requires Two Hands.
// Great weapon: Strike Last, Requires Two Hands, S+2, AP -2, Armour Bane (1).
// Shields: no shield alongside a Requires Two Hands weapon in combat, so choosing the hand
//   weapon keeps the shield and the other two lose it.
// Motley Crew: each kind of model in a Motley Crew may fight with its own weapon - an Iron Rukka
//   Mob's models with great weapons choose among hand weapon / great weapon, those with additional hand weapons among
//   hand weapon / additional hand weapons, each kit on its own.
//
// Our readings (the rules leave these open):
//  1. Motley Crew: each KIT of an Iron Rukka Mob (great weapons / additional hand weapons) is asked on its own,
//     since its models are different "types".
//  2. The Boss (champion) of a Motley Crew is not asked separately and fights with the unit's plain weapon.
//  3. A choice is offered only when the unit's OWN rank and file carry both weapons: never for crew, mount or beast
//     weapons (Hornback, War Hydra, Abyssmaw...), chariots, Giants, Howdahs, or a magic weapon (always used).
//  4. A lance or cavalry spear is only offered in a turn the unit charged (out of a charge a cavalry spear is
//     just a hand weapon).
// The engine never picks: chooseCombatWeapon records what the player said. Where there is only one weapon
// (combatWeaponChoices(...).length === 1) there is no choice and nothing is asked. Not built: magic weapons
// (a magic weapon is always used - items.js), a champion equipped differently (no data), a joined character
// swapping within the unit's rank (characters are separate units here and are asked on their own).

import { meleeWeaponOf, equip, kitTwin } from './damage.js'
import { hasRule } from './units.js'

const turnKey = game => `${game.round}:${game.active}`

function describe (u, key, charged) {
  const w = meleeWeaponOf(u, { charged, pick: key })
  const hand = key === 'hand weapon'
  return {
    id: key,
    name: hand ? 'Hand weapon' : (w.name || key),
    S: w.S, ap: w.ap ?? 0,
    armourBane: (w.rules || []).find(r => r.startsWith('Armour Bane')) || null,
    extraAttacks: (w.rules || []).find(r => r.startsWith('Extra Attacks')) || null,
    rules: w.rules || [],
    twoHanded: !!w.twoHanded,
    // a shield is not used with a Requires Two Hands weapon in combat
    keepsShield: !!u.kit.shield && !w.twoHanded,
    page: w.page || null
  }
}

// Units whose attacks do not come from the rank and file's own weapons (combat.js attackGroupsInner)
function ownWeapons (u) {
  return !(u.crew?.length || hasRule(u, 'Howdah') || hasRule(u, 'Giant Attacks') || hasRule(u, 'Motherly Love') ||
    /Chariot/.test((u.troopType || []).join(' ')) || /monster|behemoth/i.test((u.troopType || []).join(' ') + ' ' + u.category))
}

// The combat weapons `u` (a unit, or a Motley Crew's `kit` of models) may fight with: [{ id, name, S, ap,
// armourBane, extraAttacks, rules, twoHanded, keepsShield }]. One entry = no choice, so nothing is asked.
export function combatWeaponChoices (u, { charged = false, kit = null } = {}) {
  if (kit) u = kitTwin(u, kit)
  if (!u.kit) equip(u)
  const melee = u.kit.melee
  // a magic weapon is always the one used (items.js): nothing to choose
  if (melee.some(w => w.magic)) return [describe(u, melee.find(w => w.magic).key, charged)]
  // only a unit's own rank-and-file weapons are a choice: not a crew's, a mount's, a chariot's or a Giant's
  if (!ownWeapons(u)) return [describe(u, 'hand weapon', charged)]
  const text = [u.equipment, ...(u.options || [])].join(' ').toLowerCase().replace(/additional hand weapons?/g, '')
  const keys = []
  // lances and cavalry spears only on the charge; otherwise a cavalry spear is only a hand weapon (damage.js)
  const special = melee.filter(w => !((w.key === 'lance' || w.key === 'cavalry spear') && !charged))
  if (/hand weapon/.test(text) || !special.length) keys.push('hand weapon')
  for (const w of special) if (!keys.includes(w.key)) keys.push(w.key)
  return keys.map(k => describe(u, k, charged))
}
// Every choice a unit makes at Step 1.1: [{ kit|null, label, options }] - one entry for the unit, plus one for
// each kit of a Motley Crew. Only entries with 2+ options need asking.
export function weaponChoicePoints (u, { charged = false } = {}) {
  const pts = [{ kit: null, label: u.name, options: combatWeaponChoices(u, { charged }) }]
  if (u.motley) {
    const kits = [...new Set((u.models || []).filter(m => m.wounds > 0 && m.role === 'rank' && m.kit).map(m => m.kit))]
    for (const k of kits) pts.push({ kit: k, label: `${u.name}, models with ${k.toLowerCase()}`, options: combatWeaponChoices(u, { charged, kit: k }) })
  }
  return pts
}

// Record the player's choice for this turn's Choose & Fight sub-phase. `weapon` must be one of the ids
// from combatWeaponChoices; returns false (recording nothing) when it is not.
export function chooseCombatWeapon (game, u, weapon, { kit = null, charged = false } = {}) {
  if (!combatWeaponChoices(u, { charged, kit }).some(o => o.id === weapon)) return false
  u.status = u.status || {}
  const key = turnKey(game)
  if (!u.status.weaponChoice || u.status.weaponChoice.turn !== key) u.status.weaponChoice = { turn: key, unit: null, kits: {} }
  if (kit) u.status.weaponChoice.kits[kit] = weapon
  else u.status.weaponChoice.unit = weapon
  return true
}

// Has this unit's player already chosen this sub-phase? (Asked once per turn, not once per enemy unit.)
export const weaponChosenThisTurn = (game, u) => u.status?.weaponChoice?.turn === turnKey(game)

// The weapon used now (what combat resolves with): the recorded choice, else the old default.
export const chosenCombatWeapon = (u, { charged = false, kit = null } = {}) => meleeWeaponOf(kit ? kitTwin(u, kit) : u, { charged })

// Step 1.1 in a combat: ask the player (via `ask(question, [[label, value]...])`, as the rest of combat.js does)
// for every weapon choice the unit has and record it. With no `ask` nothing is recorded (the old default stands).
export async function askCombatWeapons (game, u, ask, say = () => {}) {
  if (weaponChosenThisTurn(game, u)) return
  const charged = !!u.status?.charged && !u.status?.hesitated
  const twoHandedShield = o => o.twoHanded && (u.kit?.shield || (u.shieldCount || 0) > 0)
  for (const pt of weaponChoicePoints(u, { charged })) {
    if (pt.options.length < 2) continue
    const used = () => chosenCombatWeapon(u, { charged, kit: pt.kit }).name || 'hand weapon'
    const label = o => `${o.name}: S ${o.S}, AP ${o.ap || '-'}${o.rules.length ? ', ' + o.rules.join(', ') : ''}${twoHandedShield(o) ? ' (no shield)' : ''}`
    const pick = ask ? await ask(`${pt.label}: which combat weapon for this combat? (Choose & Fight, Step 1.1)`, pt.options.map(o => [label(o), o.id])) : undefined
    if (chooseCombatWeapon(game, u, pick, { kit: pt.kit, charged })) say(game, '', `${pt.label} fight with ${pt.options.find(o => o.id === pick).name.toLowerCase()}.`)
    // never silent: no answer (or one that is not a weapon on offer) is said out loud, with the weapon that stands in
    else say(game, 'bad', `${pt.label}: ${ask ? `"${String(pick)}" is not one of its combat weapons` : 'no choice made'} - fighting with ${used().toLowerCase()} (the default, not a choice).`)
  }
}
