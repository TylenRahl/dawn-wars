// What a unit is armed with, how well it is armoured, how hard it is to wound, and taking the casualties:
// weapon and profile look-ups, toWoundNeed, saveFor (armour, Ward and Untouchable saves) and applyWounds. Used by
// combat, shooting, magic, war machines and most army modules, and by the unit panel (ui/unitStats.js).
//
// Weapons come from src/data/weapons.js. A unit's kit is read from its army-list choices: the list's names
// ("Hand weapons, Halberds", "Shields", "Heavy armour, Barding") are matched to profiles.
//
// Hand weapon: every model has a hand weapon unless told otherwise.
// Armour value: light 6+, heavy 5+, full plate 4+.
// No armour: no armour counts as 7+ for anything that improves it.
// Shield: a shield improves armour by 1 (not with a Requires Two Hands weapon in combat).
// Barding: a barded mount improves its rider's armour by 1.
// Maximum Armour Value: infantry and cavalry never better than 2+; chariots, monsters and war machines never
//   better than 3+.
// To Wound in shooting: the To Wound chart (toWoundNeed below; rules.test.js checks every cell against the book).
// Casualties come off the back rank; wounds go on one model until it dies, then the next.
// Regeneration: a Regeneration save after the wound is lost.

import { unmadeWards } from './unmade.js'
import { shenWards, defensiveStance } from './shen.js'
import { cdWards } from './chaosdwarfs.js'
import { lizardWards } from './saurians.js'
import { tooHorribleToDie } from './gnawkin.js'
import { lightProtected } from './tombkings.js'
import { curseOfTheNecropolis, unboundSpirits } from './tombkings.js'
import { generalFalls, infested } from './vampires.js'
import { deWards, seaDragonCloak } from './darkelves.js'
import { woodWards } from './woodelves.js'
import { elfWards, lionCloak, arrowsOfSiriel, fromTheAshes, precisionStrikes } from './highelves.js'
import { ogreWards, stoneSkeleton } from './ogres.js'
import { inPrimalFury, beastWards } from './hornkin.js'
import { dominionWards, wyrdfireAura, ensorcelled, chainmaker, explosiveDemise } from './dominion.js'
import { spellHits as spellHitsLate } from './spells.js'
import { leadershipTest as leadershipTestLate } from './leadership.js'
import { bannersOf } from './items.js'
import { runesOf, runeWeapon, runeRanged } from './runes.js'
import { dwarfWards, deepsteelArmour, deepsteelWeapons } from './dwarfs.js'
import { troopType } from './troops.js'
import { friendDestroyed } from './shooting.js'
import { blessingWard, currentGame } from './lyonne.js'
import { orderWards } from './orders.js'
import { WEAPONS } from '../data/weapons.js'
import { alive, hasRule, ruleValue, modelCount, isDead, arcOf, centre as centreOf, distanceBetween } from './units.js'
import { say } from './game.js'
import { rollDice as rollDiceFn } from './dice.js'
import { syncJoined } from './joining.js'
import { concealerGone } from './whirlers.js'
import { itemArmour, itemWeapon, itemName as itemNameOf, EFFECTS as ITEM_EFFECTS, itemFlag, itemWith, spendItem, itemLeft } from './items.js'

export const isChariot = u => /Chariot/.test((u.troopType || []).join(' '))
// Howdah: a behemoth with a howdah has a split profile and follows Split Profile
// (Chariots) and Firing Platform — its crew fight and shoot as a chariot's do
export const hasCrewPlatform = u => isChariot(u) || hasRule(u, 'Howdah')

const SINGULAR = {
  'hand weapons': 'hand weapon', halberds: 'halberd', 'thrusting spears': 'thrusting spear', 'throwing spears': 'throwing spear',
  'great weapons': 'great weapon', lances: 'lance', 'cavalry spears': 'cavalry spear', handguns: 'handgun', crossbows: 'crossbow',
  hellblades: 'hellblade', plagueswords: 'rotsword', 'long spears': 'long spear', 'shenese lances': 'shenese lance', 'crane guns': 'crane gun', 'kite lantern crane guns': 'kite lantern crane gun', 'iron hail guns': 'iron hail gun', fireglaives: 'fireglaive', 'hailshot blunderbusses': 'hailshot blunderbuss', javelins: 'javelin', blowpipes: 'blowpipe', 'wyrdlock jezzails': 'wyrdlock jezzail', 'foul wind globe': 'foul wind globes', 'blight censers': 'blight censer', 'two hand weapons': 'additional hand weapon', 'repeater crossbows': 'repeater crossbow', 'repeater handbows': 'repeater handbow', 'dread halberds': 'dread halberd', 'ashvane kingsblades': 'ashvane kingsblade', 'lornefolk longbows': 'lornefolk longbow', 'lornefolk spears': 'lornefolk spear', 'blackbriar javelins': 'blackbriar javelin', "ranger's glaive": 'ranger’s glaive', "trickster's blades": 'trickster’s blades',
  longbows: 'longbow', shortbows: 'shortbow', bows: 'bow', warbows: 'warbow', 'additional hand weapons': 'additional hand weapon',
  'wolf hammers': 'wolf hammer', 'repeater handguns': 'repeater handgun', 'repeater pistols': 'repeater pistol', 'long rifles': 'long rifle', 'repeating rifles': 'repeating rifle', 'fernmark long rifles': 'fernmark long rifle', 'ogre pistols': 'ogre pistol', 'light cannons': 'light cannon', shields: 'shield', pistols: 'pistol', 'brace of pistols': 'brace of pistols', 'throwing weapons': 'throwing weapon', flails: 'flail',
  'great cannon': 'great cannon', mortar: 'mortar', 'stone thrower': 'stone thrower', 'bolt thrower': 'bolt thrower',
  'great hammers': 'great hammer', 'throwing axes': 'throwing axe', drakeguns: 'embergun', 'brimstone guns': 'brimstone gun', clatterguns: 'clattergun', 'rivet guns': 'rivet gun', 'shotbelly guns': 'shotbelly gun', 'harpoon launchers': 'harpoon launcher', 'great throwing spear': 'great throwing spears', 'swords of sorneth': 'sword of sorneth', 'ceremonial halberds': 'ceremonial halberd', 'thessan great blades': 'thessan great blade', 'bows of saelwood': 'bow of saelwood', "handmaiden's spear": 'handmaiden’s spear'
}

function words (s) {
  return (s || '').toLowerCase().split(/,| and /).map(x => x.trim()).filter(Boolean).map(x => SINGULAR[x] || x)
}

export function profileFor (name) {
  return WEAPONS[name] || WEAPONS[`${name} ranged`] || null
}
function meleeProfile (name) {
  if (name === 'herdstaff') return { ...(WEAPONS['great weapon'] || {}), name: 'Herdstaff (as a great weapon)' }
  if (name === 'additional hand weapon') return WEAPONS['two hand weapons/additional hand weapon'] || null
  return WEAPONS[`${name} combat`] || WEAPONS[name] || null
}

const parseNum = s => { const m = String(s).match(/-?\d+/); return m ? Number(m[0]) : 0 }

// "S+1" for a melee weapon, "4" for a missile weapon; "4(8)" keeps the first number.
function strengthOf (w, userS) {
  const s = String(w.S || 'S')
  if (/^S/.test(s)) return userS + (s.includes('+') ? parseNum(s.split('+')[1]) : 0)
  return parseNum(s)
}
function apOf (w, charged) {
  const a = String(w.AP || '-')
  if (a === '-' || a === '') return 0
  // "-1(-2)": the bracket applies when the wielder charged (halberd) — the notes say which
  const m = a.match(/(-?\d+)\((-?\d+)\)/)
  if (m) return charged ? Number(m[2]) : Number(m[1])
  return parseNum(a)
}

// Set u.kit: { melee, ranged, shield, armourBase, barding } from its choices.
export function equip (u) {
  u._kits = null // the Motley Crew kit twins are rebuilt from the new kit (kitTwin)
  const all = [...words(u.equipment), ...u.options.flatMap(o => words(o)), ...words(u.armour)]
  const text = (u.equipmentText || '').toLowerCase()
  // (Motley Crew: shields carried by some models count when most of the unit has them — Motley Crew, Different Armour)
  const shield = all.includes('shield') || /\bshields?\b/.test(u.equipment.toLowerCase()) || (u.shieldCount || 0) > u.models.length / 2
  const barding = /barding/.test(u.armour.toLowerCase())
  let armourBase = 7
  if (/full plate/.test(u.armour.toLowerCase()) || all.includes('full plate armour')) armourBase = 4
  else if (/heavy armour/.test(u.armour.toLowerCase())) armourBase = 5
  else if (/light armour/.test(u.armour.toLowerCase())) armourBase = 6
  // (Herdstaff: used offensively it counts as a great weapon — always so here, a guess at the choice)
  const meleeNames = ['bloodflail', 'lash of wrath', 'hellblade', 'rotsword', 'bilesword', 'piercing claws', 'unmade talons', 'shenese lance', 'long spear', 'fireglaive', 'great horns', 'thunderous bludgeon', 'venomous talons', 'bladewheel', 'wyrd grinder', 'things-catcher', 'blight censer', 'wyrdstone claws', 'paired great khopeshes', 'decapitating claws', 'ashvane kingsblade', 'dread halberd', 'lash & buckler', 'cavernous maw', 'serrated maws', 'ranger’s glaive', 'spear of lirrin', 'spear of thalwen', 'trickster’s blades', 'hunting spear', 'lornefolk spear', 'oaken fists', 'sword of sorneth', 'ceremonial halberd', 'thessan great blade', 'handmaiden’s spear', 'herdstaff', 'furnace hammer', 'wolf hammer', 'great hammer', 'great weapon', 'halberd', 'lance', 'cavalry spear', 'thrusting spear', 'additional hand weapon', 'flail', 'morning star']
  const melee = meleeNames.filter(n => all.includes(n)).map(n => ({ key: n, ...(meleeProfile(n) || { name: n, S: 'S', AP: '-', rules: [] }) }))
  const rangedNames = ['grand cannon', 'kite lantern crane gun', 'crane gun', 'iron hail gun', 'dragon fire pistol', 'dragon fire bombs', 'gunpowder bombs', 'groundbreaker mortar', 'demolition rockets', 'steam cannonade', 'hailshot blunderbuss', 'naptha bombs', 'fireglaive', 'giant bow', 'giant blowpipes', 'razor barbs', 'fireleech bolas', 'blowpipe', 'javelin', 'wyrd lightning cannon', 'blightclaw catapult', 'foul wind mortar', 'chatter gun', 'wyrdfire thrower', 'wyrdlock jezzail', 'wyrdlock musket', 'wyrdlock pistol', 'foul wind globes', 'wailing skull catapult', 'ravager harpoon', 'brace of repeater handbows', 'repeater handbow', 'repeater crossbow', 'petrifying gaze', 'lornefolk longbow', 'blackbriar javelin', 'strangleroots', 'repeater bolt thrower', 'bow of saelwood', 'cannon of the cloud-titans solid shot', 'junkflinger catapult', 'harpoon launcher', 'blood vulture', 'great throwing spears', 'hexfire', 'wyrdfire blast', 'blasting charges', 'brace of wyrmflame pistols', 'fire thrower', 'nipper-hewer', 'embergun', 'brimstone gun', 'clattergun', 'rivet gun', 'throwing axe', 'organ gun', 'bombard', 'field trebuchet', 'spidersilk lobber', 'steam cannon', 'skyfire rocket battery', 'grenade launching blunderbuss', 'blunderbuss', 'fernmark long rifle', 'long rifle', 'repeater handgun', 'repeating rifle', 'repeater pistol', 'ogre pistol', 'light cannon', 'handgun', 'crossbow', 'longbow', 'warbow', 'shortbow', 'bow', 'brace of pistols', 'pistol', 'throwing spear', 'throwing weapon', 'great cannon', 'cannon', 'mortar', 'stone thrower', 'bolt thrower', 'thunderclap volley gun']
  // (a howdah's crew carry their own missile weapons: 'Nipper Crew: Hand weapons, cavalry spears and shortbows')
  const crewText = hasRule(u, 'Howdah') ? text.split('\n').filter(l => /crew/.test(l)).join(' ') : ''
  const ranged0 = rangedNames.filter(n => all.includes(n) || (n.includes(' ') && text.includes(n) && /war machine/.test(u.category)) || (crewText && words(crewText.replace(/^[^:]*:/, '')).includes(n)) || words(u.crewEquipment).includes(n))
  // (a war machine's 'repeater bolt thrower' is not also a plain 'bolt thrower': a name inside a longer one matched is dropped)
  const ranged = ranged0.filter(n => !ranged0.some(o => o !== n && o.includes(n))).map(n => ({ key: n, ...(profileFor(n) || { name: n, range: '0', S: '3', AP: '-', rules: [] }) }))
  // magic armour replaces the mundane equivalent; a magic weapon is always used, and never
  // alongside an additional hand weapon (Magic armour, Magic weapons)
  const ia = itemArmour(u)
  if (ia.base) armourBase = ia.base
  const magicMelee = itemWeapon(u, 'combat')
  if (magicMelee) melee.unshift(magicMelee)
  const magicRanged = itemWeapon(u, 'ranged')
  if (magicRanged) ranged.unshift(magicRanged)
  // the Dwarfs' runic weapons: Weapon runes on the great weapon or hand weapon; Engineers' runes on a crossbow or handgun (runes.js)
  if (!magicMelee && runesOf(u, 'weapon-runes').length) {
    const gw = melee.find(w => w.key === 'great weapon' || /great hammer/.test(w.key))
    melee.unshift(runeWeapon(u, gw || { key: 'hand weapon', ...(WEAPONS['hand weapon'] || { name: 'Hand weapon', S: 'S', AP: '-', rules: [] }) }))
  }
  if (runesOf(u, 'ranged-weapon-runes').length) for (let i = 0; i < ranged.length; i++) ranged[i] = runeRanged(u, ranged[i])
  // Shotbelly Gun: two profiles, solid shot and scatter shot (the player picks one to shoot)
  if (all.includes('shotbelly gun') || /shotbelly gun/.test(text)) for (const k of ['shotbelly gun solid shot', 'shotbelly gun scatter shot']) if (WEAPONS[k] && !ranged.some(w => w.key === k)) ranged.push({ key: k, ...WEAPONS[k], name: WEAPONS[k].name })
  // Cannon of the Cloud-Titans: the Gutcannon's cannon, solid shot (Cannon Fire) — its scatter
  // shot is a Breath Weapon (below)
  if (/cannon of the cloud-titans/.test(text) && !ranged.some(w => w.key === 'cannon of the cloud-titans solid shot')) ranged.push({ key: 'cannon of the cloud-titans solid shot', ...WEAPONS['cannon of the cloud-titans solid shot'] })
  if (/junkflinger catapult/.test(text) && !ranged.some(w => w.key === 'junkflinger catapult')) ranged.push({ key: 'junkflinger catapult', ...WEAPONS['junkflinger catapult'] })
  // Master Rune of Flight: once a turn in the Shooting phase the runic hand weapon is thrown
  if ((u.items || []).includes('master-rune-of-flight')) ranged.push({ key: 'master rune of flight', name: 'Master Rune of Flight (thrown)', range: '12', S: 'S', AP: '-', rules: ['Magical Attacks', 'Move & Shoot', 'Quick Shot'], magic: true, page: 'magic-item__master-rune-of-flight.md' })
  // Breath Weapon: a weapon with the Breath Weapon rule named in its equipment (not in
  // a "(counts as ...)" item — the Troll Hag's swamp breath is her armour); the army's own version first
  const plain = [text, (u.mountEquipment || '').toLowerCase()].join('\n').split(/\n|,| and /).filter(x => !/counts as/.test(x)).join(',')
  // (the army's own: the key names the army by its id, 'fiery breath (vhar)', 'steam gun (concord realm)')
  const own = k => k.endsWith(`(${(u.army || '').replace(/-/g, ' ')})`)
  const breathKeys = Object.keys(WEAPONS).filter(k => (WEAPONS[k].rules || []).includes('Breath Weapon') && plain.includes(k.replace(/ \(.*\)$/, ''))).sort((a, b) => (own(b) ? 1 : 0) - (own(a) ? 1 : 0))
  if (/cannon of the cloud-titans/.test(text) && WEAPONS['cannon of the cloud-titans scatter shot'] && !breathKeys.includes('cannon of the cloud-titans scatter shot')) breathKeys.push('cannon of the cloud-titans scatter shot')
  // (one of each: 'steam gun (deephold clans)' and 'steam gun (concord realm)' are one weapon, the army's own kept)
  for (let i = breathKeys.length - 1; i > 0; i--) if (breathKeys.slice(0, i).some(k => k.replace(/ \(.*\)$/, '') === breathKeys[i].replace(/ \(.*\)$/, ''))) breathKeys.splice(i, 1)
  const breathKey = breathKeys[0]
  // (a weapon chosen in its place: a Rotorwing's brimstone guns or clattergun instead of its steam gun — Rotorwing)
  const breathSwapped = breathKey && !breathKey.startsWith('cannon of the cloud-titans') && u.equipment && ranged.length && !u.equipment.toLowerCase().includes(breathKey.replace(/ \(.*\)$/, ''))
  u.kit = { breaths: breathSwapped ? [] : breathKeys.map(k => ({ key: k, ...WEAPONS[k], name: WEAPONS[k].name.replace(/ \(.*\)$/, '') })), breath: breathKey && !breathSwapped ? { key: breathKey, ...WEAPONS[breathKey], name: WEAPONS[breathKey].name.replace(/ \(.*\)$/, '') } : null, melee, ranged, shield: shield || !!ia.shield, barding, armourBase, armourBonus: ia.bonus || 0, fixedArmour: ia.fixed || null, hand: { key: 'hand weapon', ...(WEAPONS['hand weapon'] || { name: 'Hand weapon', S: 'S', AP: '-', rules: [] }) } }
  u.ranged = ranged.length ? ranged[0] : null
  return u.kit
}

// The unit as its champion sees it: the champion's own magic items in place of the unit's (roster.js championMagic).
// Used for the champion's attacks and its saves in a challenge.
export function champView (u) {
  if (!u?.champItems?.length) return u
  if (!u._champ) { const v = Object.create(u); v.items = u.champItems; v.kit = null; equip(v); Object.defineProperty(u, '_champ', { value: v, enumerable: false }) }
  return u._champ
}

// A missile weapon as the shooting rules want it: range in inches, S, AP, special rules.
// the war machine weapons (warMachines.js), not shot as ordinary missile weapons
const MACHINE_KEYS = ['grand cannon', 'groundbreaker mortar', 'demolition rockets', 'wyrd lightning cannon', 'blightclaw catapult', 'foul wind mortar', 'chatter gun', 'wyrdfire thrower', 'wailing skull catapult', 'repeater bolt thrower', 'cannon of the cloud-titans solid shot', 'junkflinger catapult', 'hexfire', 'wyrdfire blast', 'fire thrower', 'nipper-hewer', 'organ gun', 'bombard', 'field trebuchet', 'spidersilk lobber', 'great cannon', 'cannon', 'mortar', 'stone thrower', 'bolt thrower', 'thunderclap volley gun', 'steam cannon', 'skyfire rocket battery']
export function rangedWeaponsOf (u) {
  if (!u.kit) equip(u)
  // (Arrows of Siriel: bows AP -1 and Armour Bane (1) — highelves.js)
  // Enchanted Arrows: a Lornefolk longbow with Arcane Bodkins AP -2; Hagbane Tips Poisoned
  // Attacks; Moonfire Shot Flaming and Magical Attacks; Swiftshiver Shards Multiple Shots (2); Trueflight Arrows Ignores
  // Cover and Quick Shot
  const arrows = (u.options || []).join(' ').toLowerCase()
  const enchant = w => {
    if (w.key !== 'lornefolk longbow' && !/^magic:(bow-of-lorne|sereths-bane)$/.test(w.key)) return w
    const add = [/hagbane tips/.test(arrows) && 'Poisoned Attacks', /moonfire shot/.test(arrows) && 'Flaming Attacks', /moonfire shot/.test(arrows) && 'Magical Attacks', /swiftshiver shards/.test(arrows) && 'Multiple Shots (2)', /trueflight arrows/.test(arrows) && 'Ignores Cover', /trueflight arrows/.test(arrows) && 'Quick Shot'].filter(Boolean)
    return { ...w, ...(/arcane bodkins/.test(arrows) ? { AP: '-2' } : {}), rules: [...new Set([...(w.rules || []), ...add])] }
  }
  return u.kit.ranged.filter(w => !MACHINE_KEYS.includes(w.key)).map(enchant).map(w => arrowsOfSiriel(u, w) ? { ...w, AP: '-1', rules: [...new Set([...(w.rules || []), 'Armour Bane (1)'])] } : w).map(w => ({
    // a chariot's crew shoot with their own Strength (Split Profile Chariots)
    // (Chalice of Dark Rain: an enemy's Chalice halves every missile range, rounding up)
    name: w.name, key: w.key, range: currentGame()?.darkRain && currentGame().darkRain.side !== u.side ? Math.ceil(parseNum(w.range) / 2) : parseNum(w.range), S: strengthOf(w, (hasCrewPlatform(u) ? u.crew?.[0]?.profile.S : alive(u)[0]?.profile.S) ?? 3), AP: apOf(w, false) - (precisionStrikes(u) ? 1 : 0), rules: w.rules || [], page: w.page, magic: !!w.magic, flags: w.flags || null, notes: w.notes || ''
  }))
}

// The weapon a model fights with this turn: the first special weapon that can be used, else
// the hand weapon. `charged`: the wielder charged this turn (lances, cavalry spears).
export function meleeWeaponOf (u, { charged = false, pick } = {}) {
  if (!u.kit) equip(u)
  // More Than One Combat Weapon: the weapon its player chose at Step 1.1
  // of this Choose & Fight sub-phase (rules/weaponChoice.js records it); `pick` forces one (to read its profile).
  // 'hand weapon' skips the special weapons; no choice recorded = the old default (the first special weapon).
  const chosen = pick ?? recordedWeapon(u)
  for (const w of u.kit.melee) {
    if (chosen) { if (chosen === 'hand weapon') break; if (w.key !== chosen) continue }
    // (Flail of Wrecks, Chalky's Pig-Sticker: some of the weapon's profile only in a turn it charged)
    // (Heartwood Lance: only in a turn it charged; otherwise its hand weapon)
    if (w.magic && w.flags?.chargeOnlyWeapon && !charged) continue
    if (w.magic) return { ...w, rules: w.chargeOnlyBane && !charged ? (w.rules || []).filter(r => !r.startsWith('Armour Bane')) : w.rules, ap: w.chargeOnlyAP && !charged ? 0 : apOf(w, charged), twoHanded: (w.rules || []).includes('Requires Two Hands') }
    if (w.key === 'lance' && !charged) continue // only on the charge (Lance)
    // Cavalry spear: its S and AP only in a turn the wielder charged.
    // Flail: its S and Armour Bane (1) only against models it charged (AP always).
    let ap = apOf(w, charged)
    let rules = w.rules || []
    if (w.key === 'cavalry spear' && !charged) ap = 0
    if (w.key === 'flail' && !charged) rules = rules.filter(r => !r.startsWith('Armour Bane'))
    return { ...w, rules, ap, twoHanded: (w.rules || []).includes('Requires Two Hands') }
  }
  // Foe Render: in Primal Fury, a single hand weapon AP -2 (hornkin.js)
  if (hasRule(u, 'Foe Render') && inPrimalFury(currentGame() || {}, u)) return { ...u.kit.hand, name: 'hand weapon (Foe Render)', ap: Math.min(-2, apOf(u.kit.hand, false)), rules: [...(u.kit.hand.rules || []), ...(ensorcelled(u) ? ['Magical Attacks'] : [])], twoHanded: false }
  // Ensorcelled Weapons: a single non-magical hand weapon, Magical Attacks and AP -1 (dominion.js)
  if (ensorcelled(u)) return { ...u.kit.hand, name: 'Ensorcelled hand weapon', ap: Math.min(-1, apOf(u.kit.hand, false)), rules: [...(u.kit.hand.rules || []), 'Magical Attacks'], twoHanded: false }
  // Deepsteel Weapons: a single ordinary hand weapon, AP -1 (dwarfs.js)
  if (deepsteelWeapons(u)) return { ...u.kit.hand, name: 'Deepsteel hand weapon', ap: Math.min(-1, apOf(u.kit.hand, false)), twoHanded: false }
  return { ...u.kit.hand, ap: apOf(u.kit.hand, false), twoHanded: false }
}
export const meleeStrength = (w, userS, charged) => {
  // cavalry spear: S and AP only on the charge
  if ((w.key === 'cavalry spear' || w.key === 'flail') && !charged) return userS
  // The Reeking Axe: its Strength modifier only against models it charged this turn
  if ((w.key === 'magic:the-reeking-axe' || w.chargeOnlyS) && !charged) return userS
  return strengthOf(w, userS)
}

// The To Wound chart: equal 4+, one higher 3+, two or more higher 2+, one lower 5+, two to
// five lower 6+, six or more lower cannot wound.
export function toWoundNeed (S, T) {
  const d = S - T
  if (d >= 2) return 2
  if (d === 1) return 3
  if (d === 0) return 4
  if (d === -1) return 5
  if (d >= -5) return 6
  return null
}

const BIG = /chariot|monster|monstrous creature|war machine|behemoth/i

// the magic armour's name, when the bearer wears magic armour that replaces its own
const itemArmourName = u => { const id = (u.items || []).find(id => ITEM_EFFECTS[id]?.armour?.base); return id ? itemNameOf(id) : null }

// The armour and ward a model of the unit saves with. `inCombat` with a two-handed weapon loses the shield.
// `phase`: 'shooting' for a ward that works only then; `flaming`: the attack has Flaming Attacks.
export function saveFor (u, { twoHanded = false, magical = false, phase = null, flaming = false, strength = null, fearsome = false, template = false } = {}) {
  if (!u.kit) equip(u)
  let av = u.kit.armourBase
  const bits = []
  if (u.kit.fixedArmour) {
    // Armour of Silvered Steel: an armour value that cannot be improved in any way
    av = u.kit.fixedArmour; bits.push(`magic armour ${av}+, cannot be improved`)
  } else if (u.armourValue && /^\d\+$/.test(u.armourValue)) { av = Number(u.armourValue[0]); bits.push(`armour value ${u.armourValue} from its rules`) } else {
    if (av < 7) bits.push(itemArmourName(u) || u.armour.split(',')[0])
    // (Levitating Shield: used alongside a weapon that Requires Two Hands)
    if (u.kit.shield && (!twoHanded || itemFlag(u, 'levitating', { personal: true }))) { av -= 1; bits.push('shield') }
    if (u.kit.barding) { av -= 1; bits.push('barding') }
    if (u.kit.armourBonus) { av -= u.kit.armourBonus; bits.push(`+${u.kit.armourBonus} magic item`) }
  }
  // (not over magic armour whose value 'cannot be improved in any way': Armour of Silvered Steel)
  if (u.mountArmour && u.mountArmour < av && !u.kit.fixedArmour) { av = u.mountArmour; bits.splice(0, bits.length, `its ${u.chariotMount ? 'chariot' : 'mount'} (${u.mountArmour}+), better than its own armour`) }
  const armoured = u.kit.fixedArmour ? 0 : hasRule(u, 'Armoured Hide') ? Number(ruleValue(u, 'Armoured Hide')) || 1 : 0
  if (armoured) { av -= armoured; bits.push(`Armoured Hide (${armoured})`) }
  // a Hex such as Plague of Rust makes armour worse (spells.js)
  // (Armour of Meteoric Iron: an armour value that cannot be reduced either)
  const apImmune = !!itemFlag(u, 'apImmune', { personal: true })
  if (u.armourMod && !apImmune) { av += u.armourMod; bits.push(`${u.armourMod} from a spell`) }
  const floor = BIG.test((u.troopType || []).join(' ') + ' ' + u.category) ? 3 : 2
  av = Math.max(floor, av)
  // Flammable: a Flammable model makes no Regeneration save against a Flaming attack
  // (Regeneration itself has no such limit)
  const regen = hasRule(u, 'Regeneration') && !(flaming && hasRule(u, 'Flammable')) ? Number((ruleValue(u, 'Regeneration') || '').replace('+', '')) || null : null
  // an Untouchable save from a spell or rule in effect (status.ward, e.g. Oaken Shield, spells.js)
  // the best Untouchable save in effect (u.wards, e.g. Oaken Shield, spells.js); they do not combine
  // (a ward 'against non-magical attacks' does not stop spells)
  // Feel No Pain: 6+ Ward against non-magical attacks, 5+ against those of Strength 5 or more
  const fnp = hasRule(u, 'Feel No Pain') && !magical ? [{ value: (strength ?? 0) >= 5 ? 5 : 6, item: null, fnp: true }] : []
  // Blessings of Varg: a 6+ Ward against Flaming Attacks
  if (hasRule(u, 'Blessings of Varg')) fnp.push({ value: 7, flaming: 6, prayer: 'Blessings of Varg' })
  // the Knightly Orders: the Pale Keeper's 6+ against non-magical attacks, the Winter Fang masters' 5+ against flames (orders.js)
  fnp.push(...orderWards(u))
  // the Dwarfs' runes and the Anvil of Ruin (dwarfs.js); Dominion Armour and the like (dominion.js)
  fnp.push(...dwarfWards(u))
  fnp.push(...dominionWards(u, { magical, flaming, category: currentGame()?.spellCategory }))
  fnp.push(...beastWards(u))
  fnp.push(...ogreWards(u))
  fnp.push(...elfWards(u))
  fnp.push(...woodWards(currentGame(), u))
  fnp.push(...deWards(u, strength))
  fnp.push(...lizardWards(u))
  fnp.push(...cdWards(u))
  fnp.push(...shenWards(u))
  fnp.push(...unmadeWards(u))
  // Vortex of Souls, Light of Protection: a 6+ Ward (tombkings.js)
  if (lightProtected(currentGame(), u, distanceBetween)) fnp.push({ value: 6, source: 'the Light of Protection' })
  // Master Rune of Hamrik: its unit 5+; friendly units within 6" of it 6+ in the Shooting phase
  if (bannersOf(u).includes('master-rune-of-hamrik')) fnp.push({ value: 5, source: 'the Master Rune of Hamrik' })
  else if (phase === 'shooting' && currentGame()?.units.some(c => c.side === u.side && c.placed && !c.status.removed && bannersOf(c).includes('master-rune-of-hamrik') && distanceBetween(c, u) <= 6)) fnp.push({ value: 6, source: 'the Master Rune of Hamrik' })
  // Rune of the Dishonoured: on its last Wound, a 3+ Ward
  if (itemFlag(u, 'dishonoured', { personal: true }) && (u.models[0]?.wounds ?? 0) === 1) fnp.push({ value: 3, source: 'the Rune of the Dishonoured' })
  // Blessed Knight: the Verdant Knight, 5+ Ward against any wounds
  if (hasRule(u, 'Blessed Knight')) fnp.push({ value: 5, source: 'Blessed Knight' })
  // Favour of the Mere (lyonne.js)
  const blessing = blessingWard(currentGame(), u, strength)
  if (blessing) fnp.push(blessing)
  // Shroud of Iron: the bearer and its unit, 6+ against wounds from a non-magical template
  if (template && !magical && [u, ...(u.joined || []).filter(c => !c.status?.removed)].some(c => itemFlag(c, 'shroudOfIron', { personal: true }))) fnp.push({ value: 6, source: 'the Shroud of Iron' })
  const wards = [...(u.wards || []), ...fnp].filter(w => !(magical && w.nonMagical) && !(w.magicalOnly && !magical) && !(w.shootingOnly && phase !== 'shooting')).map(w => ({ ...w, value: Math.min(flaming && w.flaming ? Math.min(w.value, w.flaming) : w.value, fearsome && w.vsFear ? w.vsFear : 7) })).filter(w => w.value <= 6)
  const best = wards.length ? wards.reduce((a, w) => w.value < a.value ? w : a) : null
  // Wyrdfire Aura: no Untouchable save within 3" of a Wyrdfire Dragon (dominion.js)
  const aura = wyrdfireAura(currentGame(), u)
  const ward = best && !aura ? best.value : null
  // (Rune of Oath and Steel, cast at 11+: armour value 1 better, but never better than 2+)
  if (u.status?.oathSteel?.plus && av > 2 && !u.kit.fixedArmour) { av -= 1; bits.push('Rune of Oath & Steel') }
  // Lion Cloak: +1 against non-magical shooting (to 2+)
  if (phase === 'shooting' && !magical && lionCloak(u) && av > 2) { av -= 1; bits.push('Lion Cloak') }
  // Sea Dragon Cloak: the same
  if (phase === 'shooting' && !magical && seaDragonCloak(u) && av > 2) { av -= 1; bits.push('Sea Dragon Cloak') }
  // The Fur of Gnarrok: +2 against non-magical shooting (to 2+)
  if (phase === 'shooting' && !magical && itemFlag(u, 'gnarrok', { personal: true }) && av > 2) { av = Math.max(2, av - 2); bits.push('the Fur of Gnarrok') }
  // Totem of Rust: every model within 6" of its carrier -1 to its Armour Rolls
  if (currentGame()?.units.some(c => c.placed && !c.status.removed && bannersOf(c).includes('totem-of-rust') && distanceBetween(c, u) <= 6)) { av += 1; bits.push('Totem of Rust -1') }
  return { apImmune, armour: av, armourText: bits.join(' + ') || 'no armour', ward, noWards: aura, wardText: best ? (best.item ? itemNameOf(best.item) : best.fnp ? 'Feel No Pain' : best.prayer || best.source || 'a spell') : '', regen }
}

// Save dice re-rolled by the bearer's magic items. `kind`: 'armour', 'ward' or 'regen'; `ok(d, i)`
// says whether a die passes. Natural 1s: Dawnstone (armour), Necklace of Blessed Teef (all
// three); a single failed Armour Roll once a game: Luckstone, Witch Hunter's Ward.
export function itemSaveRerolls (game, t, kind, dice, ok) {
  const notes = []
  // Re Rolls: no single dice is re-rolled more than once
  const done = dice.map(() => false)
  // Wangler's Curse: the cursed unit must re-roll any Armour Roll of a natural 6
  if (kind === 'armour' && t.status?.wanglersCurse && dice.includes(6)) {
    const again = rollDiceFn(game.rng, dice.filter(d => d === 6).length)
    let j = 0
    dice = dice.map((d, i) => { if (d !== 6) return d; done[i] = true; return again[j++] })
    notes.push(`Wangler's Curse: ${again.length} natural 6${again.length === 1 ? '' : 's'} re-rolled [${again.join(' ')}]`)
  }
  // Blasted Standard: in the Shooting phase, natural 1s on Armour Rolls re-rolled
  if (kind === 'armour' && game.phase === 'shooting' && itemFlag(t, 'blasted') && dice.some((d, i) => d === 1 && !done[i])) {
    const idx = dice.map((d, i) => i).filter(i => dice[i] === 1 && !done[i])
    const again = rollDiceFn(game.rng, idx.length)
    idx.forEach((i, k) => { dice[i] = again[k]; done[i] = true })
    notes.push(`${idx.length} natural 1${idx.length === 1 ? '' : 's'} re-rolled (Blasted Standard): [${again.join(' ')}]`)
  }
  // Rune of Oath and Steel: failed Armour Rolls re-rolled
  if (kind === 'armour' && t.status?.oathSteel && dice.some((d, i) => !ok(d, i) && !done[i])) {
    const idx = dice.map((d, i) => i).filter(i => !ok(dice[i], i) && !done[i])
    const again = rollDiceFn(game.rng, idx.length)
    idx.forEach((i, k) => { dice[i] = again[k]; done[i] = true })
    notes.push(`${idx.length} failed re-rolled (Rune of Oath & Steel): [${again.join(' ')}]`)
  }
  // Deepsteel Armour: natural 1s on an Armour Roll re-rolled (dwarfs.js)
  // (Defensive Stance: Jade Warriors the same in combat, unless they charged — shen.js)
  if (kind === 'armour' && (deepsteelArmour(t) || defensiveStance(game, t)) && dice.some((d, i) => d === 1 && !done[i])) {
    const k = dice.filter((d, i) => d === 1 && !done[i]).length
    const again = rollDiceFn(game.rng, k)
    let j = 0
    dice = dice.map((d, i) => { if (d !== 1 || done[i]) return d; done[i] = true; return again[j++] })
    notes.push(`${k} natural 1${k === 1 ? '' : 's'} re-rolled (${deepsteelArmour(t) ? 'Deepsteel Armour' : 'Defensive Stance'}): [${again.join(' ')}]`)
  }
  const flag = { armour: 'rerollArmour1', ward: 'rerollWard1', regen: 'rerollRegen1' }[kind]
  const ones = itemWith(t, flag)
  if (ones && itemFlag(t, flag, { personal: true }) && dice.some((d, i) => d === 1 && !done[i])) {
    const k = dice.filter((d, i) => d === 1 && !done[i]).length
    const again = rollDiceFn(game.rng, k)
    let j = 0
    dice = dice.map((d, i) => { if (d !== 1 || done[i]) return d; done[i] = true; return again[j++] })
    notes.push(`${k} natural 1${k === 1 ? '' : 's'} re-rolled (${itemNameOf(ones)}): [${again.join(' ')}]`)
  }
  // Armour of Dark Faith: failed Armour Rolls re-rolled, until the wearer has lost a Wound
  if (kind === 'armour' && itemFlag(t, 'darkFaith', { personal: true }) && !t.models.some(m => m.wounds < (m.startW || 1))) {
    const idx = dice.map((d, i) => i).filter(i => !done[i] && !ok(dice[i], i))
    if (idx.length) {
      const again = rollDiceFn(game.rng, idx.length)
      idx.forEach((i, k) => { dice[i] = again[k]; done[i] = true })
      notes.push(`${idx.length} failed re-rolled (Armour of Dark Faith): [${again.join(' ')}]`)
    }
  }
  const once = kind === 'armour' && itemFlag(t, 'armourRerollOnce', { personal: true }) && itemWith(t, 'armourRerollOnce')
  if (once) {
    // a failed save not already re-rolled, and one a 6 could still pass (no point spending it on a hopeless save)
    const i = dice.findIndex((d, k) => !done[k] && !ok(d, k) && ok(6, k))
    if (i >= 0) {
      const r = rollDiceFn(game.rng, 1)[0]
      notes.push(`${itemNameOf(once)} re-rolls a failed ${dice[i]}: ${r} (once a game)`)
      dice = dice.map((d, k) => k === i ? r : d)
      spendItem(t, once)
    }
  }
  return { dice, note: notes.length ? ' — ' + notes.join('; ') : '' }
}

// The order casualties are taken in. A Motley Crew loses them spread over its kinds of model (the most
// numerous kind first: Motley Crew, Casualty Removal); otherwise rank and file from
// the back.
function casualtyOrder (u) {
  const rank = alive(u).filter(m => m.role === 'rank')
  // (Chalice Reliquary: it loses no Wounds while any Battle Pilgrim remains: it goes last)
  if (!u.motley) return rank.reverse()
  const kind = m => `${m.type || ''}|${m.kit || ''}`
  const left = new Map()
  for (const m of [...rank].reverse()) { const k = kind(m); if (!left.has(k)) left.set(k, []); left.get(k).push(m) }
  const out = []
  while ([...left.values()].some(a => a.length)) {
    const k = [...left.entries()].filter(([, a]) => a.length).sort((x, y) => y[1].length - x[1].length)[0][0]
    out.push(left.get(k).shift())
  }
  return out
}
// The weapon key recorded for this unit (or, for a Motley Crew kit twin, for that kit) in the current turn's
// Choose & Fight sub-phase (rules/weaponChoice.js chooseCombatWeapon), or null.
function recordedWeapon (u) {
  const c = u.status?.weaponChoice
  if (!c) return null
  const g = currentGame()
  // no game in progress: nothing says which turn the choice was for, so it is not honoured
  if (!g || c.turn !== `${g.round}:${g.active}`) return null
  return u._kitName ? (c.kits?.[u._kitName] ?? null) : (c.unit ?? null)
}
// A Motley Crew model's own combat weapon (its per-model option), as meleeWeaponOf gives it.
// The unit as one kit of a Motley Crew's models sees it: a twin of the
// unit with that kit's option added. Cached in u._kits, which equip() clears when the kit is rebuilt.
export function kitTwin (u, kit) {
  u._kits = u._kits || {}
  if (!u._kits[kit]) { const twin = { ...u, options: [...u.options, kit], kit: null, motley: false, _kitName: kit, _kits: null }; equip(twin); u._kits[kit] = twin }
  return u._kits[kit]
}
export function meleeWeaponOfKit (u, kit, opts = {}) {
  if (!kit) return meleeWeaponOf(u, opts)
  return meleeWeaponOf(kitTwin(u, kit), opts)
}

// Take `n` wounds off the unit: rank and file from the back first, the command group last,
// a many-Wound model losing all of its Wounds before the next. Returns the Wounds taken.
export function applyWounds (game, u, n, source = '') {
  if (n <= 0) return 0
  // Monster Handlers: each unsaved wound on the monster, a D6 — 5+ a handler is removed instead
  if (u.handlers?.some(h => h.count > 0) && !/misfire|malfunction|its own|Furnace|Caged/i.test(source)) {
    const d = rollDiceFn(game.rng, n)
    let k = 0
    for (const x of d) { const h = u.handlers.find(h => h.count > 0); if (x >= 5 && h) { h.count--; k++ } }
    if (k) say(game, 'roll', `${u.name}'s handlers: [${d.join(' ')}] — ${k} handler${k === 1 ? '' : 's'} removed instead of the monster losing a Wound.`)
    n -= k
    if (n <= 0) return 0
  }
  const order = [...casualtyOrder(u), ...['musician', 'standard', 'monk', 'champion', 'reliquae'].map(r => alive(u).find(m => m.role === r)).filter(Boolean)]
  let left = n
  let killed = 0
  let taken = 0
  for (const m of order) {
    if (!left) break
    // Chalice Pendant: single use — losing its last Wound, a D6: 2+ and that Wound is not lost
    if (m.wounds === 1 && left >= 1 && chalicePendant(game, u)) { left--; continue }
    const t = Math.min(left, m.wounds)
    m.wounds -= t
    left -= t
    taken += t
    if (m.wounds <= 0) killed++
  }
  u.status.woundsTaken = (u.status.woundsTaken || 0) + taken
  const lostCmd = ['champion', 'standard', 'musician'].filter(r => u.models.some(m => m.role === r && m.wounds <= 0) && !u.status[`lost_${r}`])
  for (const r of lostCmd) u.status[`lost_${r}`] = true
  say(game, killed ? 'bad' : '', `${u.name} loses ${taken} Wound${taken === 1 ? '' : 's'}${source ? ` (${source})` : ''}: ${killed} model${killed === 1 ? '' : 's'} removed, ${modelCount(u)} left.${lostCmd.length ? ' Its ' + lostCmd.join(' and ') + ' fell.' : ''}`)
  if (isDead(u)) removeUnit(game, u, 'wiped out')
  return taken
}

// Take a unit off the table for good, and out of every combat it was in. The ONE way a unit
// leaves play: wiped out by wounds, run down, fled off the table, misfired, abandoned.
export function disengageAll (game, u) {
  // every unit that lists it, not only those it lists (the two records can differ after a
  // pursuit or a fall)
  for (const o of game.units) {
    if (o === u || !o.engagedWith?.[u.id]) continue
    delete o.engagedWith[u.id]
    if (!Object.keys(o.engagedWith).length) o.status.engaged = false
  }
  u.engagedWith = {}
  u.status.engaged = false
}
export function removeUnit (game, u, how) {
  if (u.status.removed) return
  // Aura of the Fay: slain, the Verdant Knight leaves the battle but may be awakened again, each
  // time at -1 to the roll and -1 Wounds (minimum 1); the enemy wins Victory Points only the first time (victory.js)
  if (hasRule(u, 'Aura of the Fay') && /wiped out|Killing Blow|slain|attacks|hits|Wound/i.test(how)) {
    u.status.faySlain = (u.status.faySlain || 0) + 1
    disengageAll(game, u)
    u.placed = false; u.reserve = true; u.status.arriving = false
    for (const m of u.models) { m.wounds = Math.max(1, (m.startW || 1) - u.status.faySlain); m.profile = { ...m.profile, W: m.wounds } }
    say(game, 'bad', `${u.name} is struck down — and fades from the battlefield. He may yet awaken again (-${u.status.faySlain} to the roll).`)
    syncJoined(game)
    return
  }
  // Escapology (Sorcerous Ruse): the first time the Wizard falls, a D6 — 4+ it recovers a Wound
  if (/wiped out/.test(how) && u.wizard?.ruse === 'escapology' && !u.wizard.ruseUsed) {
    u.wizard.ruseUsed = true
    const r = rollDiceFn(game.rng, 1)[0]
    say(game, r >= 4 ? 'good' : 'roll', `${u.name} uses its Sorcerous Ruse, Escapology: D6 = ${r} — ${r >= 4 ? 'it thwarts death and recovers a Wound!' : 'it must face its fate.'}`)
    if (r >= 4) { const m = u.models[0]; m.wounds = 1; u.status.woundsTaken = Math.max(0, (u.status.woundsTaken || 0) - 1); return }
  }
  // Too Horrible to Die: a Warren Abomination may rise again — before anything counts it gone (gnawkin.js)
  if (/wiped out/.test(how) && tooHorribleToDie(game, u)) return
  concealerGone(game, u)
  // (the Unit Mass it had: its models' as they stood at the start of the battle)
  const usBefore = u.models.length * (troopType(u).us === 'wounds' ? 1 : (troopType(u).us || 1))
  u._panicFrom = usBefore
  // Trophies of War Command Groups: a unit run down while fleeing, or destroyed in combat by an
  // enemy unit, gives up its standard as a trophy (not one destroyed by shooting, spells or the like)
  // (in combat: only while an enemy unit's blows are being resolved — combat.js sets game.combatKiller)
  const inCombat = game.phase === 'combat' && game.combatKiller != null && game.combatKiller !== u.side
  // (Peasantry: a Peasantry unit's standard is never a trophy of war)
  if ((/run down/i.test(how) || inCombat) && !hasRule(u, 'Peasantry') && u.models.some(m => m.role === 'standard') && !u.status.lost_standard && !u.status.trophyTaken) {
    u.status.trophyTaken = true
    game.trophies = game.trophies || [[], []]
    // Conqueror's Tapestry: a standard captured by its unit is worth 100
    const by = game.combatKillerUnit && game.combatKillerUnit.side !== u.side ? game.combatKillerUnit : null
    game.trophies[1 - u.side].push({ name: u.name, value: by && (itemFlag(by, 'tapestry') || chainmaker(by)) ? 100 : 50 })
    say(game, 'good', `${game.sides[1 - u.side].name} claims the standard of ${u.name} as a TROPHY OF WAR.`)
  }
  // the Bloodsworn Courts: the Death of a General; a Dreadwing Colossus's Infested (vampires.js)
  if (/wiped out/.test(how)) { generalFalls(game, u); infested(game, u, spellHitsLate, distanceBetween) }
  // the Sand Kings: the Curse of the Necropolis; a Urn of Souls' Unbound Spirits (tombkings.js)
  if (/wiped out/.test(how)) { curseOfTheNecropolis(game, u, leadershipTestLate, spellHitsLate); unboundSpirits(game, u, spellHitsLate, distanceBetween) }
  // Explosive Demise (dominion.js)
  if (/wiped out/.test(how)) explosiveDemise(game, u, spellHitsLate)
  // From the Ashes: a Emberwing Phoenix may be reborn (highelves.js)
  if (/wiped out/.test(how) && !u.status.ashesTried) { u.status.ashesTried = true; if (fromTheAshes(game, u, spellHitsLate)) { u.status.ashesTried = false; return } }
  // Look Out Below!: a falling behemoth — the winner of a roll-off picks an arc;
  // units there in base contact suffer D6 hits at its Strength, AP -1 (here: the arc is rolled)
  if (/wiped out/.test(how) && hasRule(u, 'Topple') && Object.keys(u.engagedWith || {}).length && !u.status.falling) {
    u.status.falling = true // it falls once, whatever its fall does to others
    const S = u.models[0]?.profile.S ?? 6
    // the arc it falls into: rolled (front, flank or rear), standing in for the roll-off winner's choice
    const fall = ['front', 'flank', 'rear'][Math.floor(game.rng() * 3)]
    say(game, 'roll', `${u.name} topples into its ${fall} arc.`)
    for (const id of Object.keys(u.engagedWith)) {
      const o = game.units.find(x => x.id === id)
      if (!o || o.status.removed || o.status.falling || isDead(o)) continue
      const arc = arcOf(u, centreOf(o))
      if (fall === 'flank' ? !(arc === 'left' || arc === 'right') : arc !== fall) continue
      const n = rollDiceFn(game.rng, 1)[0]
      const T = (alive(o).find(m => m.role === 'rank') || alive(o)[0])?.profile.T ?? 3
      const need = toWoundNeed(S, T)
      const d = rollDiceFn(game.rng, n)
      const w = need == null ? 0 : d.filter(x => x !== 1 && x >= need).length
      const sv = saveFor(o, { strength: S, fearsome: hasRule(u, 'Fear') || hasRule(u, 'Terror') })
      const ap = sv.apImmune ? 0 : 1 // (Armour of Meteoric Iron: not reduced)
      const okF = x => x !== 1 && sv.armour + ap <= 6 && x >= sv.armour + ap
      const sd = itemSaveRerolls(game, o, 'armour', rollDiceFn(game.rng, w), okF).dice
      let un = sd.filter(x => !okF(x)).length
      if (un && sv.ward) un -= rollDiceFn(game.rng, un).filter(x => x >= sv.ward).length
      if (un && sv.regen) un -= rollDiceFn(game.rng, un).filter(x => x >= sv.regen).length
      say(game, 'roll', `TOPPLE! ${u.name} falls on ${o.name}: D6 = ${n} Strength ${S} hits, AP -1: wounds [${d.join(' ')}] need ${need}+ — ${w}; saves [${sd.join(' ')}] — ${un} unsaved.`)
      if (un) applyWounds(game, o, un, `the falling ${u.name}`)
    }
  }
  // a unit cut down around its characters: they are still in base contact, and fight on
  const survivor = /wiped out/.test(how) && (u.joined || []).find(c => !c.status.removed && c.models.some(m => m.wounds > 0))
  if (survivor && Object.keys(u.engagedWith || {}).length) {
    survivor.engagedWith = {}
    survivor.status.engaged = true
    // (only both ways round: an enemy with no arc for the unit would get an undefined one)
    for (const [id, arc] of Object.entries(u.engagedWith)) {
      const o = game.units.find(x => x.id === id)
      if (!arc || !o?.engagedWith?.[u.id]) continue
      survivor.engagedWith[id] = arc
      o.engagedWith[survivor.id] = o.engagedWith[u.id]
    }
    if (!Object.keys(survivor.engagedWith).length) survivor.status.engaged = false
    survivor.status.keepEngaged = true
  }
  disengageAll(game, u)
  u.status.removed = true
  u.status.destroyed = how
  say(game, 'bad', `${u.name} is destroyed (${how}).`)
  syncJoined(game)
  // Common Causes of Panic: friends within 6" of it test for Panic (shooting.js)
  if (!u.status.whirler) friendDestroyed(game, u, usBefore)
}

// Multiple Damage: each unsaved wound is multiplied, but on ONE model only — excess Wounds do
// not spill over onto the next (Multiple Damage). `each` is the list of
// Wounds each unsaved wound causes.
function chalicePendant (game, u) {
  if (!itemFlag(u, 'chalicePendant', { personal: true }) || itemLeft(u, 'chalice-pendant') <= 0) return false
  spendItem(u, 'chalice-pendant')
  const r = rollDiceFn(game.rng, 1)[0]
  say(game, 'roll', `${u.name} would lose its last Wound — the Chalice Pendant (single use): ${r}, ${r >= 2 ? 'the Wound is not lost' : 'it falls'}.`)
  return r >= 2
}
// Charmed Shield: once a game, a 5+ Ward against a single wound — rolled at an Untouchable save, on the first
// unsaved wound, when the bearer has no better Ward and Untouchable saves are allowed; after that an ordinary shield.
// Returns the wounds it saved (0 or 1).
export function charmedWard (game, u, n, sv) {
  // Rune of Warding: single use, each rune a 2+ Ward against a single wound (runes.js)
  if (sv?.noWards) return 0 // (no Untouchable save at all: Rune of Banishment)
  let warded = 0
  const wardId = () => ['rune-of-warding', 'opal-amulet'].find(id => itemLeft(u, id) > 0)
  while (n - warded > 0 && wardId()) {
    const id = wardId()
    spendItem(u, id)
    const r = rollDiceFn(game.rng, 1)[0]
    say(game, 'roll', `${u.name}'s ${id === 'opal-amulet' ? 'Opal Amulet' : 'Rune of Warding'}: a 2+ Ward against a single wound (single use) — ${r}, ${r >= 2 ? 'saved' : 'not saved'}.`)
    if (r >= 2) warded++; else break
  }
  if (warded) return warded + charmedWard(game, u, n - warded, sv)
  if (!n || (sv?.ward && sv.ward <= 5) || !itemFlag(u, 'charmedShield', { personal: true }) || itemLeft(u, 'charmed-shield') <= 0) return 0
  spendItem(u, 'charmed-shield')
  const r = rollDiceFn(game.rng, 1)[0]
  say(game, 'roll', `${u.name}'s Charmed Shield: a 5+ Ward against a single wound, once a game — ${r}, ${r >= 5 ? 'saved' : 'not saved'}.`)
  return r >= 5 ? 1 : 0
}
export function applyMultipleDamage (game, u, each, source = '') {
  // Icon of Fortitude: immune to Multiple Damage (X): each such wound is a single wound
  // (a Killing Blow or Monster Slaying Blow is not Multiple Damage)
  // (Anointed Armour: so too while the wearer has the Favour of the Mere)
  if ((itemFlag(u, 'mwImmune', { personal: true }) || (itemFlag(u, 'anointed', { personal: true }) && blessingWard(currentGame(), u, 0))) && !/Killing Blow|Monster/.test(source) && each.some(w => w > 1)) { say(game, '', `${u.name}'s ${itemFlag(u, 'mwImmune', { personal: true }) ? 'magic item' : 'Anointed Armour'}: immune to Multiple Damage, each wound is a single wound.`); each = each.map(() => 1) }
  // Stone Skeleton: each Multiple Damage wound one fewer (to 1)
  if (stoneSkeleton(u) && each.some(w => w > 1) && !/Killing Blow|Monster/.test(source)) { each = each.map(w => Math.max(1, w - 1)); say(game, '', `${u.name}'s Stone Skeleton: each wound costs one Wound fewer.`) }
  // Monster Handlers: one D6 for each unsaved wound — 5+ a handler is removed instead of it
  if (u.handlers?.some(h => h.count > 0)) {
    const d = rollDiceFn(game.rng, each.length)
    const keep = []
    each.forEach((w, i) => { const h = u.handlers.find(h => h.count > 0); if (d[i] >= 5 && h) h.count--; else keep.push(w) })
    if (keep.length < each.length) say(game, 'roll', `${u.name}'s handlers: [${d.join(' ')}] — ${each.length - keep.length} handler${each.length - keep.length === 1 ? '' : 's'} removed instead.`)
    each = keep
  }
  let taken = 0
  for (const w of each) {
    const order = [...casualtyOrder(u), ...['musician', 'standard', 'monk', 'champion', 'reliquae'].map(r => alive(u).find(m => m.role === r)).filter(Boolean)]
    const m = order[0]
    if (!m) break
    if (m.wounds <= w && chalicePendant(game, u)) { const keep = m.wounds - 1; taken += keep; m.wounds = 1; continue }
    const t = Math.min(w, m.wounds)
    m.wounds -= t
    taken += t
  }
  u.status.woundsTaken = (u.status.woundsTaken || 0) + taken
  for (const r of ['champion', 'standard', 'musician']) if (u.models.some(m => m.role === r && m.wounds <= 0)) u.status[`lost_${r}`] = true
  say(game, 'bad', `${u.name} loses ${taken} Wound${taken === 1 ? '' : 's'}${source ? ` (${source})` : ''} — ${each.length} unsaved wound${each.length === 1 ? '' : 's'} of ${each.join(', ')} each; ${modelCount(u)} model${modelCount(u) === 1 ? '' : 's'} left.`)
  if (isDead(u)) removeUnit(game, u, 'wiped out')
  return taken
}
