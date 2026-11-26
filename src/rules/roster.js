// Army lists: what a player has bought, what it costs and whether it is legal (checkList). Used by the army and
// setup screens (ui/lists.js, ui/setup.js), and units.js when fielding a unit.
//
// The unit entries come from src/data/armies.js: points, options and stat lines. The shape of an entry's choices:
//   equipment, armor, mounts  — pick exactly one (the one marked `active` is the default)
//   options                   — any of them (a few carry `exclusive` groups; not enforced yet)
//   command                   — champion / standard bearer / musician for a unit, or
//                               General / Battle Standard Bearer for a character
// A choice's points are per model when it says `perModel`, otherwise once for the unit.

import { runeProblems } from './runes.js'
import { itemArmies } from './renegade.js'
import { EFFECTS as ITEM_EFFECTS } from './items.js'
import { IMPLEMENTED_LORES } from './spells.js'
import { ARMIES, MOUNTS } from '../data/armies.js'
import { beastPackProblems } from './beastPack.js'   // (and builds the Beast Pack entry at load)
import { ITEMS, ALLOWANCE } from '../data/magicItems.js'
import { isPlayable, mayTake } from './items.js'

import { isPlayableMountName } from './mounts.js'

export const PLAYABLE = ['concord-realm', 'rukka-firms', 'kingdom-of-lyonne', 'broken-crowns', 'deephold-clans', 'dominion-hosts', 'hornkin-herds', 'gutlords', 'ilthari-realms', 'lornefolk-of-lorne-wood', 'vhar', 'bloodsworn-courts', 'sand-kings-of-kheshet', 'gnawkin', 'saurians', 'ashforged', 'jade-dominion-of-shen', 'the-unmade']
export const ARMY_NAMES = { 'concord-realm': 'Concord Realm', 'rukka-firms': 'Rukka Firms', 'kingdom-of-lyonne': 'Kingdom of Lyonne', 'broken-crowns': 'Broken Crowns', 'deephold-clans': 'Deephold Clans', 'dominion-hosts': 'Dominion Hosts', 'hornkin-herds': 'Hornkin Herds', 'gutlords': 'Gutlords', 'ilthari-realms': 'Ilthari Realms', 'lornefolk-of-lorne-wood': 'Lornefolk of Lorne Wood', 'vhar': 'Vhar', 'bloodsworn-courts': 'Bloodsworn Courts', 'sand-kings-of-kheshet': 'Sand Kings of Kheshet', gnawkin: 'Gnawkin', saurians: 'Saurians', 'ashforged': 'Ashforged', 'jade-dominion-of-shen': 'Jade Dominion of Shen', 'the-unmade': 'The Unmade' }

const BEAST_PACK = ['deepwood-hounds', 'forest-cat', 'sylvan-boar', 'bear-of-lorne']
export function armyEntries (armyId) {
  const army = ARMIES[armyId]
  if (!army) throw new Error(`no army ${armyId}`)
  // the Grand Host only (the army data's armyComposition id equal to the army's own id); the
  // Field Journal compositions (Kessel, the Knightly Orders, Nomadic Big Ruck...) are not offered yet
  // The builder's separate '-detachment' entries are not offered: any unit with the Detachment
  // rule can be added to a regiment as its detachment (see detachmentProblems).
  // Whirlers are bought as an option of a Gloom Nipper Mob (fanaticsAllowed below), not as a unit
  // (Lornefolk Beast Pack: Deepwood Hounds, Forest Cats, Sylvan Boars and Bears of Lorne come only in a Beast
  // Pack with their Beast Keepers — a unit not in the game yet — and are not units of their own)
  return army.units.filter(u => u.profile && !/-detachment$/.test(u.id) && u.id !== 'whirlers' && !BEAST_PACK.includes(u.id) && (u.armyComposition.length === 0 || u.armyComposition.includes(armyId)))
}

export function findEntry (armyId, entryId) {
  return ARMIES[armyId]?.units.find(u => u.id === entryId) ?? null
}
// An entry from any army's list: a mount that is another army's unit (the Iron Rukka Gaffer's Boar Chariot is the Rukka
// Firms' Rukka Boar Chariot, also when he leads the Ashforged's contingent)
export function findEntryAnywhere (entryId) {
  for (const army of Object.values(ARMIES)) { const e = army.units.find(u => u.id === entryId); if (e) return e }
  return null
}

const activeIndex = list => Math.max(0, list.findIndex(o => o.active))

// A freshly added unit: the minimum size and every default choice.
export function newUnit (entry) {
  return {
    entryId: entry.id,
    count: Math.max(1, entry.minimum || 1),
    equipment: entry.equipment.length ? activeIndex(entry.equipment) : null,
    // armour the army data marks as the default; where it marks none (March Missile Troops' light
    // armour, a Head Case's Frenzy) the choice is an optional extra, not bought until asked for
    armor: entry.armor.some(o => o.active) ? activeIndex(entry.armor) : null,
    mount: entry.mounts.length ? activeIndex(entry.mounts) : null,
    // options the army data marks `active` are on from the start (a Wizard's "Wizard" option)
    options: entry.options.map((o, i) => o.active && !o.stackable ? i : -1).filter(i => i >= 0),
    // per-model options (the army data's 'stackable': Motley Crew weapons, Gobbler Minders...): how many models take each
    counts: Object.fromEntries(entry.options.map((o, i) => [i, o.stackable ? (o.minimum || 0) : null]).filter(([, v]) => v != null)),
    // the choice inside an option that has its own exclusive sub-options (Level 1 / Level 2 Wizard)
    optionSub: Object.fromEntries(entry.options.map((o, i) => [i, o.options ? Math.max(0, o.options.findIndex(x => x.active)) : null]).filter(([, v]) => v != null)),
    command: [],
    lore: entry.lores?.length ? entry.lores[0] : null,
    items: [] // magic item ids (data/magicItems.js); a unit's only item is its magic standard
  }
}

const isCharacter = entry => entry.category === 'characters'

function choiceCost (choice, count) {
  if (!choice) return 0
  return (choice.points || 0) * (choice.perModel ? count : 1)
}

// The points of one unit, item by item, so the list builder can show where they come from.
export function unitCost (entry, sel) {
  const n = sel.count
  const lines = [{ what: `${n} × ${entry.points}`, points: entry.points * n }]
  const add = (what, points) => { if (points) lines.push({ what, points }) }
  if (sel.equipment != null) add(entry.equipment[sel.equipment]?.name, choiceCost(entry.equipment[sel.equipment], n))
  if (sel.armor != null) add(entry.armor[sel.armor]?.name, choiceCost(entry.armor[sel.armor], n))
  if (sel.mount != null) add(entry.mounts[sel.mount]?.name, choiceCost(entry.mounts[sel.mount], 1))
  for (const [i, k] of Object.entries(sel.counts || {})) if (k) add(`${k} × ${entry.options[i]?.name}`, (entry.options[i]?.points || 0) * k)
  for (const i of sel.options) {
    if (entry.options[i]?.stackable) continue // (counted above)
    add(entry.options[i]?.name, choiceCost(entry.options[i], n))
    const sub = sel.optionSub?.[i]
    if (sub != null && entry.options[i]?.options?.[sub]) add(entry.options[i].options[sub].name, choiceCost(entry.options[i].options[sub], n))
  }
  for (const i of sel.command) add(entry.command[i]?.name, entry.command[i]?.points || 0)
  for (const id of sel.items || []) add(ITEMS[id]?.name, ITEMS[id]?.points || 0)
  for (const id of sel.champItems || []) add(`${ITEMS[id]?.name} (champion)`, ITEMS[id]?.points || 0)
  if (sel.whirlers) add(`${sel.whirlers} Whirler${sel.whirlers === 1 ? '' : 's'}`, sel.whirlers * WHIRLER_POINTS)
  // Sorcerous Ruses: each Wizard may buy one, for 25 points
  if (sel.ruse) add('Sorcerous Ruse', 25)
  return { total: lines.reduce((a, l) => a + l.points, 0), lines }
}

export function listCost (list) {
  return list.units.reduce((a, u) => a + unitCost(findEntry(list.army, u.entryId), u).total, 0)
}

// The Grand Host composition, as shares of the points limit: Core 25% or more; Characters and Special 50% or
// less each; Rare 25% or less; Mercenaries 20% or less.
export const COMPOSITION = {
  characters: { max: 0.5 },
  core: { min: 0.25 },
  special: { max: 0.5 },
  rare: { max: 0.25 },
  mercenaries: { max: 0.2 }
}
// Broken Crowns: Special up to 33%, Mercenaries up to 33%
const COMPOSITION_BY_ARMY = {
  'broken-crowns': { ...COMPOSITION, special: { max: 0.33 }, mercenaries: { max: 0.33 } }
}
export const compositionFor = armyId => COMPOSITION_BY_ARMY[armyId] || COMPOSITION

// ---- regiments and detachments ----
// Using Regiments and Detachments, Creating a Regimental Unit,
// Creating a Detachment: a unit with the Regimental Unit rule may be accompanied by up to two
// detachments (units with the Detachment rule), each of 5 models up to half the regiment's
// (rounded down), with no command group. In a list, a detachment has `detachmentOf` = the `key`
// of its regiment's entry.
const ruleNames = e => (e.specialRules || []).map(r => r?.name ?? r)
export const canBeRegiment = e => ruleNames(e).includes('Regimental Unit')
export const canBeDetachment = e => ruleNames(e).includes('Detachment')
export const detachmentChoices = armyId => armyEntries(armyId).filter(canBeDetachment)
export function nextKey (list) { return 'k' + (1 + Math.max(0, ...list.units.map(u => Number((u.key || 'k0').slice(1)) || 0))) }
function detachmentProblems (list) {
  const out = []
  for (const u of list.units.filter(x => x.detachmentOf)) {
    const e = findEntry(list.army, u.entryId)
    const reg = list.units.find(x => x.key === u.detachmentOf)
    if (!reg) { out.push(`${e.name} (detachment): its regimental unit is not in the list`); continue }
    const re = findEntry(list.army, reg.entryId)
    if (!canBeDetachment(e)) out.push(`${e.name} cannot be a detachment`)
    if (!canBeRegiment(re) || reg.detachmentOf) out.push(`${re.name} cannot be accompanied by detachments`)
    const max = Math.floor(reg.count / 2)
    if (u.count < 5 || u.count > max) out.push(`${e.name} (detachment of ${re.name}): 5 to ${max} models (half the regiment's ${reg.count})`)
    if (u.command.length) out.push(`${e.name} (detachment): no command group`)
  }
  for (const reg of list.units.filter(x => x.key)) {
    const n = list.units.filter(x => x.detachmentOf === reg.key).length
    if (n > 2) out.push(`${findEntry(list.army, reg.entryId).name}: at most two detachments (${n})`)
  }
  return out
}

// Gloom Nipper Mob: one Whirler for each 10 Gloom Nippers, three at most, 25 points apiece (the army data files
// them as a separate 'whirlers' detachment entry)
export const WHIRLER_POINTS = 25
export const whirlersAllowed = (entry, sel) => entry.id === 'gloom-nipper-mob' ? Math.min(3, Math.floor(sel.count / 10)) : 0

// An option offered in this army's Grand Host list: the army data repeats some under another composition
// (a Grand Master's Orders, once for the Knightly Order lists and once for the Grand Host)
export const optionOffered = (armyId, o) => !o.armyComposition || [].concat(o.armyComposition).includes(armyId)

// The lores this selection may take: its entry's, and those its magic items open — Wizarding Hat
// (a lore of its player's choosing: any in the game), The Hag's Brew (+ the Lore of Troll Magic)
export function loresFor (entry, sel) {
  const items = sel?.items || []
  const out = [...(entry.lores || [])]
  if (items.includes('wizarding-hat') && !out.length) out.push(...IMPLEMENTED_LORES)
  if (items.includes('the-hags-brew') && !out.includes('troll-magic')) out.push('troll-magic')
  // (Heartwood Pendant: + the Lore of the Wilds)
  if (items.includes('heartwood-pendant') && !out.includes('lore-of-the-wilds')) out.push('lore-of-the-wilds')
  return out
}

export function checkList (list) {
  const problems = []
  const byCat = {}
  for (const u of list.units) {
    const e = findEntry(list.army, u.entryId)
    byCat[e.category] = (byCat[e.category] || 0) + unitCost(e, u).total
    // (a detachment's size is 5 to half its regiment instead: Creating a Detachment)
    if (e.minimum && u.count < e.minimum && !u.detachmentOf) problems.push(`${e.name}: at least ${e.minimum} models`)
    if (e.maximum && u.count > e.maximum) problems.push(`${e.name}: at most ${e.maximum} models`)
  }
  const total = listCost(list)
  if (total > list.points) problems.push(`${total} points is over the ${list.points}-point limit`)
  for (const [cat, rule] of Object.entries(compositionFor(list.army))) {
    const p = byCat[cat] || 0
    if (rule.max != null && p > rule.max * list.points) problems.push(`${cat}: ${p} points is over ${Math.round(rule.max * 100)}% (${Math.floor(rule.max * list.points)})`)
    if (rule.min != null && p < rule.min * list.points) problems.push(`${cat}: ${p} points is under ${Math.round(rule.min * 100)}% (${Math.ceil(rule.min * list.points)})`)
  }
  problems.push(...limitProblems(list))
  problems.push(...itemProblems(list))
  // Rules of the Runes (runes.js)
  if (list.units.some(u => [...(u.items || []), ...(u.champItems || [])].some(id => ITEMS[id]?.rune))) problems.push(...runeProblems(list, findEntry))
  problems.push(...detachmentProblems(list))
  // per-model options: no more models than the unit has; the weapons are 'one of the following'
  for (const u of list.units) {
    const e = findEntry(list.army, u.entryId)
    const c = Object.entries(u.counts || {}).map(([i, k]) => ({ o: e.options[i], k })).filter(x => x.k)
    const extra = c.filter(x => isExtraModels(e, x.o))
    const herders = extra.reduce((a, x) => a + x.k, 0)
    for (const x of c) {
      if (x.o.minimum && x.k < x.o.minimum) problems.push(`${e.name}: at least ${x.o.minimum} ${x.o.name}`)
      if (x.o.maximum && x.k > x.o.maximum) problems.push(`${e.name}: at most ${x.o.maximum} ${x.o.name}`)
      if (!isExtraModels(e, x.o) && / for /i.test(x.o.name) && x.k > herders) problems.push(`${e.name}: more ${x.o.name} than there are models to carry them`)
      else if (!isExtraModels(e, x.o) && !/ for /i.test(x.o.name) && x.k > u.count) problems.push(`${e.name}: ${x.k} ${x.o.name} for ${u.count} models`)
    }
    problems.push(...beastPackProblems(e, u))
    const weapons = c.filter(x => /weapon|morning star|ironfist|cannon|pistol/i.test(x.o.name) && !/ for /i.test(x.o.name)).reduce((a, x) => a + x.k, 0)
    if (weapons > u.count) problems.push(`${e.name}: ${weapons} models with a special weapon, but only ${u.count} models (one each)`)
  }
  // Deephold Clans Army List: Greybeards as a Core choice only if the General is a King
  if (list.army === 'deephold-clans' && list.units.some(u => u.entryId === 'long-beards-core')) {
    const gen = list.units.find(u => { const e = findEntry(list.army, u.entryId); return u.command.some(i => /^general$/i.test(e.command[i]?.name || '')) })
    if (!gen || !['king', 'haldor-ullekson', 'durnak-ironhand'].includes(gen.entryId)) problems.push('Greybeards may be a Core choice only if the General is a King')
  }
  // The Ladz: one Iron Rukka Gaffer or Top Lad for every Iron Rukka Mob, and the other way round
  if (list.army === 'rukka-firms') {
    const bosses = list.units.filter(u => /^iron-rukka-(gaffer|top-lad)$/.test(u.entryId)).length
    const mobs = list.units.filter(u => /^iron-rukka-mob/.test(u.entryId)).length
    if (bosses !== mobs && (bosses || mobs)) problems.push(`The Ladz: one Iron Rukka Gaffer or Top Lad for every Iron Rukka Mob (${bosses} bosses, ${mobs} mobs)`)
  }
  // the army data's 'exclusive' options are one choice among them (a Grand Master's Order, a Witch
  // Hunter's specialism); options of another army composition are not on offer
  for (const u of list.units) {
    const e = findEntry(list.army, u.entryId)
    const ex = u.options.filter(i => e.options[i]?.exclusive)
    // (an option's `group` keeps separate choices apart: an Infamous Origin, and a Noble Outlaw's weapon)
    for (const g of new Set(ex.map(i => e.options[i].group || ''))) {
      const inG = ex.filter(i => (e.options[i].group || '') === g)
      if (inG.length > 1) problems.push(`${e.name}: only one of ${inG.map(i => e.options[i].name).join(', ')}`)
    }
    for (const i of u.options) if (e.options[i]?.needs && !u.options.some(j => e.options[j]?.name === e.options[i].needs)) problems.push(`${e.name}: ${e.options[i].name} only with ${e.options[i].needs}`)
    for (const i of u.options) if (e.options[i] && !optionOffered(list.army, e.options[i])) problems.push(`${e.name}: ${e.options[i].name} is not offered in this army`)
    // Suffer Not: each Witch Hunter must have one specialism
    if (e.id === 'witch-hunter' && !ex.length) problems.push(`${e.name}: choose a specialism (The Witch, The Revenant, The Mutant or The Unmade)`)
  }
  // Named Characters Dawn Wars Armies: one of each named character
  for (const id of new Set(list.units.map(u => u.entryId))) {
    const e = findEntry(list.army, id)
    const n = list.units.filter(u => u.entryId === id).length
    if ((e.troopType || []).includes('Named Character') && n > 1) problems.push(`${e.name}: a named character, only one in an army (${n})`)
  }
  // Retinue of the Saints: up to one Chalice Reliquary for every character or unit with the Chalice Vow
  if (list.army === 'kingdom-of-lyonne') {
    const reliquae = list.units.filter(u => { const e = findEntry(list.army, u.entryId); return u.command.some(i => /chalice reliquary/i.test(e.command[i]?.name || '')) }).length
    const chalice = list.units.filter(u => { const e = findEntry(list.army, u.entryId); return (e.specialRules || []).some(r => (r.name || r) === 'The Chalice Vow') || u.options.some(i => /^The Chalice Vow/.test(e.options[i]?.name || '')) }).length
    if (reliquae > chalice) problems.push(`Retinue of the Saints: ${reliquae} Chalice Reliquary, but only ${chalice} character${chalice === 1 ? '' : 's'} or unit${chalice === 1 ? '' : 's'} with the Chalice Vow`)
  }
  // Virtue of Duty, Virtue of the Ideal: its bearer cannot be the army's General
  for (const u of list.units) { const e = findEntry(list.army, u.entryId); if ((u.items || []).some(id => ITEM_EFFECTS[id]?.flags?.notGeneral) && u.command.some(i => /^General$/i.test(e.command[i]?.name || ''))) problems.push(`${e.name}: a character with that Virtue cannot be the General`) }
  // Loner: a Loner cannot be the General
  for (const u of list.units) { const e = findEntry(list.army, u.entryId); if ((e.specialRules || []).some(r => (r.name || r) === 'Loner') && u.command.some(i => /^General$/i.test(e.command[i]?.name || ''))) problems.push(`${e.name} is a Loner and cannot be the General`) }
  // All Sneaky Like: with Titch, 0-1 Nipper Wolf Rider Mob may have Ambushers for free
  const sneakers = list.units.filter(x => x.ambushers)
  if (sneakers.some(x => x.entryId !== 'nipper-wolf-rider-mob')) problems.push('only a Nipper Wolf Rider Mob may take Ambushers (All Sneaky Like)')
  if (sneakers.length && !list.units.some(x => x.entryId === 'titch-toothnicker')) problems.push('Ambushers for a Nipper Wolf Rider Mob needs Titch Toothnicker in the list (All Sneaky Like)')
  if (sneakers.length > 1) problems.push(`only one Nipper Wolf Rider Mob may take Ambushers (All Sneaky Like): ${sneakers.length}`)
  // a lore the selection may not take (its items changed since it was chosen)
  for (const u of list.units.filter(x => x.lore)) { const e = findEntry(list.army, u.entryId); if (!loresFor(e, u).includes(u.lore)) problems.push(`${e.name}: it cannot take ${u.lore.replace(/-/g, ' ')}`) }
  for (const u of list.units.filter(x => x.lore2)) { const e = findEntry(list.army, u.entryId); if (!(u.items || []).includes('arcane-familiar')) problems.push(`${e.name}: a second lore needs an Arcane Familiar`) }
  for (const u of list.units.filter(x => x.ruse)) { const e = findEntry(list.army, u.entryId); if (!isWizardSel(e, u)) problems.push(`${e.name}: only a Wizard may buy a Sorcerous Ruse`) }
  for (const u of list.units) {
    if (!u.whirlers) continue
    const e = findEntry(list.army, u.entryId)
    const max = whirlersAllowed(e, u)
    if (u.whirlers > max) problems.push(`${e.name}: at most ${max} Whirler${max === 1 ? '' : 's'} (one per 10 Gloom Nippers, up to 3)`)
  }
  // Minimum Three Units: at least three non-character units, not counting
  // swarms, war beasts or war machines
  const counted = list.units.filter(u => {
    const e = findEntry(list.army, u.entryId)
    return e.category !== 'characters' && !(e.troopType || []).some(t => /Swarm|War Beasts|War Machine/.test(t))
  })
  if (counted.length < 3) problems.push('at least three non-character units (not swarms, war beasts or war machines)')
  // only cavalry mounts are in the game yet (not monsters, chariots, or mounts that move a random distance)
  for (const u of list.units) {
    const e = findEntry(list.army, u.entryId)
    const m = u.mount != null ? e.mounts[u.mount]?.name : null
    if (m && !isPlayableMountName(m) && !(e.profile || []).some(r => r.Name === m || r.Name + 's' === m)) problems.push(`${e.name} on a ${m}: that mount is not playable yet`)
  }
  const generals = list.units.filter(u => {
    const e = findEntry(list.army, u.entryId)
    return isCharacter(e) && u.command.some(i => /general/i.test(e.command[i]?.name || '') && !/standard/i.test(e.command[i]?.name || ''))
  })
  if (generals.length !== 1) problems.push(generals.length ? 'only one General' : 'the army needs a General (a character with the General option)')
  return { total, byCat, problems }
}

// The choices a unit has made, as names: what the battle needs to know.
export function chosenNames (entry, sel) {
  return {
    equipment: sel.equipment != null ? entry.equipment[sel.equipment]?.name : null,
    armor: sel.armor != null ? entry.armor[sel.armor]?.name : null,
    mount: sel.mount != null ? entry.mounts[sel.mount]?.name : null,
    options: sel.options.filter(i => !entry.options[i]?.stackable).flatMap(i => [entry.options[i]?.name, sel.optionSub?.[i] != null ? entry.options[i]?.options?.[sel.optionSub[i]]?.name : null]).filter(Boolean),
    counts: Object.entries(sel.counts || {}).filter(([, k]) => k > 0).map(([i, k]) => ({ name: entry.options[i]?.name, n: k })),
    lore: sel.lore || null,
    command: sel.command.map(i => entry.command[i]?.name).filter(Boolean),
    items: [...(sel.items || [])],
    champItems: [...(sel.champItems || [])],
    whirlers: sel.whirlers || 0,
    ruse: !!sel.ruse,
    lore2: sel.lore2 || null,
    ambushers: !!sel.ambushers,
    key: sel.key || null,
    detachmentOf: sel.detachmentOf || null
  }
}

// A unit built by names rather than indices, for the default lists and the tests.
export function unitByNames (armyId, entryId, count, { equipment, armor, mount, options = [], command = [], lore = null, level = null, items = [], whirlers = 0, key = null, detachmentOf = null, ruse = false, ambushers = false, counts = {} } = {}) {
  const entry = findEntry(armyId, entryId)
  if (!entry) throw new Error(`no entry ${entryId} in ${armyId}`)
  const sel = newUnit(entry)
  sel.count = count
  const idx = (list, name) => {
    // (the one offered in this army, where the army data repeats a choice for another composition)
    const same = o => o.name.toLowerCase() === name.toLowerCase()
    let i = list.findIndex(o => same(o) && optionOffered(armyId, o))
    if (i < 0) i = list.findIndex(same)
    if (i < 0) throw new Error(`${entry.name} has no choice "${name}" (has: ${list.map(o => o.name).join(' | ')})`)
    return i
  }
  if (equipment) sel.equipment = idx(entry.equipment, equipment)
  if (armor) sel.armor = idx(entry.armor, armor)
  if (mount) sel.mount = idx(entry.mounts, mount)
  // (a per-model option named here is taken by every model of the unit)
  // (an 'exclusive' option named here replaces the default one: a Witch Hunter's specialism)
  const named = options.map(n => idx(entry.options, n))
  if (named.some(i => entry.options[i].exclusive)) sel.options = sel.options.filter(i => !entry.options[i].exclusive)
  for (const i of named) { if (entry.options[i].stackable) sel.counts[i] = count; else sel.options = [...new Set([...sel.options, i])] }
  sel.command = command.map(n => idx(entry.command, n))
  if (lore) sel.lore = lore
  for (const id of items) if (!ITEMS[id]) throw new Error(`no magic item ${id}`)
  sel.items = [...items]
  if (whirlers) sel.whirlers = whirlers
  if (key) sel.key = key
  if (ruse) sel.ruse = true
  if (ambushers) sel.ambushers = true
  for (const [name, k] of Object.entries(counts)) sel.counts[idx(entry.options, name)] = k
  if (detachmentOf) sel.detachmentOf = detachmentOf
  if (level) {
    const wi = entry.options.findIndex(o => o.name === 'Wizard')
    sel.optionSub[wi] = entry.options[wi].options.findIndex(o => o.name === `Level ${level} Wizard`)
  }
  return sel
}

// The Grand Host composition lists' limits on particular units.
// Concord Realm Army List, Rukka and Nipper Tribes Army List
// `per1000`: how many per 1,000 points; `needs`: only with at least one of these entries.
const LIMITS = {
  'concord-realm': [
    { ids: ['general-of-the-realm', 'grand-master'], per1000: 1, what: 'General of the Realm or Grand Master' },
    { ids: ['lector-of-saint-halvar', 'high-priest-of-varg'], per1000: 1, what: 'Lector of Saint Halvar or High Priest of Varg' },
    { ids: ['veteran-march-troops'], per1000: 1, what: 'unit of Veteran March Troops' },
    { ids: ['inner-circle-knights'], per1000: 1, what: 'unit of Inner Circle Knights' },
    { ids: ['realm-road-wardens'], per1000: 1, what: 'unit of Realm Road Wardens' },
    { ids: ['great-cannon', 'mortar'], per1000: 3, what: 'Great Cannon or Mortar' },
    { ids: ['thunderclap-volley-gun', 'helstrom-rocket-battery'], per1000: 1, what: 'Thunderclap Volley Gun or Skyfire Rocket Battery' },
    { ids: ['iron-kettle'], per1000: 1, what: 'Iron Kettle' },
    { ids: ['war-wagon'], per1000: 1, what: 'War Wagon' },
    { ids: ['harbinger-of-doom'], needs: ['flagellants'], what: 'Harbinger of Doom (needs Flagellants)' },
    { ids: ['greyfang-guard'], perEach: ['priest-of-varg', 'high-priest-of-varg'], what: 'unit of Greyfang Guard per Warrior Priest of Varg' }
  ],
  'rukka-firms': [
    { ids: ['iron-rukka-gaffer', 'rukka-gaffer', 'rukka-big-head-case'], per1000: 1, what: 'Iron Rukka Gaffer, Rukka Gaffer or Rukka Big Head Case' },
    { ids: ['gloom-nipper-mob'], perEach: ['gloom-nipper-gaffer', 'gloom-nipper-top-lad', 'gloom-nipper-big-odd-bod', 'gloom-nipper-odd-bod'], what: 'Gloom Nipper Mob per Gloom Nipper character' },
    { ids: ['gloom-nipper-gobbler-herd'], perEach: ['gloom-nipper-gaffer', 'gloom-nipper-top-lad', 'gloom-nipper-big-odd-bod', 'gloom-nipper-odd-bod'], what: 'Gloom Nipper Gobbler Herd per Gloom Nipper character' },
    { ids: ['gloom-nipper-gobbler-hopper-mob'], perEach: ['gloom-nipper-gaffer', 'gloom-nipper-top-lad', 'gloom-nipper-big-odd-bod', 'gloom-nipper-odd-bod'], what: 'Gobbler Hopper Mob per Gloom Nipper character' },
    { ids: ['wrecker-gobblers'], perEach: ['gloom-nipper-gaffer', 'gloom-nipper-top-lad', 'gloom-nipper-big-odd-bod', 'gloom-nipper-odd-bod'], what: 'Wrecker Gobbler per Gloom Nipper character' },
    { ids: ['nipper-bolt-chucka'], per1000: 2, what: 'Nipper Bolt Chucka' },
    { ids: ['nipper-rock-chucka'], per1000: 1, what: 'Nipper Rock Chucka' },
    { ids: ['nipper-flinger'], per1000: 1, what: 'Nipper Flinger' },
    { ids: ['troll-hag'], needs: ['common-troll-mob', 'river-troll-mob', 'stone-troll-mob', 'common-troll-mob-special', 'river-troll-mob-special', 'stone-troll-mob-special'], what: 'Troll Hag (needs a Troll Mob)' }
  ],
  // Kingdom of Lyonne Army List
  'kingdom-of-lyonne': [
    { ids: ['duke'], max: 1, what: 'Duke' },
    { ids: ['baron', 'prophetess'], per1000: 1, what: 'Baron or Prophetess' },
    { ids: ['knights-of-the-lily', 'mounted-knights-of-the-lily'], required: true, what: 'the army needs a unit of Knights of the Lily on Foot or Mounted Knights of the Lily' },
    { ids: ['men-at-arms', 'peasant-bowmen'], required: true, what: 'the army needs a unit of Men-at-Arms or Peasant Bowmen' },
    { ids: ['knights-errant'], perEach: ['knights-of-the-lily', 'mounted-knights-of-the-lily'], what: 'unit of Knights Errant for each unit of Knights of the Lily' },
    { ids: ['battle-pilgrims-special', 'battle-pilgrims'], per1000: 2, what: 'units of Battle Pilgrims' },
    { ids: ['field-trebuchet'], per1000: 1, what: 'Field Trebuchet' }
  ],
  // Deephold Clans Army List
  'deephold-clans': [
    { ids: ['king', 'anvil-of-ruin', 'runelord'], per1000: 1, what: 'King, Anvil of Ruin or Runelord' },
    { ids: ['rangers-core'], max: 1, what: 'unit of Rangers as a Core choice' },
    { ids: ['long-beards-core'], max: 1, what: 'unit of Greybeards as a Core choice' },
    // (Royal Guard: one unit of Kingshammers for every King or Thane)
    { ids: ['kingshammers'], perEach: ['king', 'thane', 'haldor-ullekson', 'durnak-ironhand'], what: 'unit of Kingshammers per King or Thane' },
    { ids: ['bolt-thrower', 'vengeance-thrower', 'cannon'], per1000: 3, what: 'Bolt Throwers, Grudge Throwers or Cannons' },
    { ids: ['organ-gun', 'flame-cannon'], per1000: 2, what: 'Organ Guns or Flame Cannons' },
    { ids: ['dwarf-cart'], max: 4, what: 'Dwarf Carts' },
    // (Nipper Hewer: "one or more Slayers of Legend" — read as an Unmade Slayer, Dragon Slayer or Durnak)
    { ids: ['nipper-hewer'], per1000: 1, needs: ['unmade-slayer', 'dragon-slayer', 'durnak-ironhand'], what: 'Nipper-hewer (needs a Slayer of Legend: an Unmade Slayer, Dragon Slayer or Durnak Ironhand)' }
  ],
  // Ilthari Realms Army List
  'ilthari-realms': [
    { ids: ['prince', 'archmage'], per1000: 1, what: 'Ilthari Prince or Archmage' },
    { ids: ['dragon-mage', 'handmaiden-of-the-dawnqueen'], per1000: 1, what: 'Dragon Mage or Handmaiden of the Dawnqueen' },
    { ids: ['storm-weaver'], per1000: 1, what: 'Storm Weaver' },
    { ids: ['sister-of-saelwood-core'], max: 1, general: ['handmaiden-of-the-dawnqueen'], what: 'Sisters of Saelwood as a Core choice (the General a Handmaiden)' },
    { ids: ['drakeborn'], per1000: 1, what: 'unit of Drakeborn' },
    { ids: ['emberwing-phoenix', 'rimewing-phoenix-'], per1000: 1, what: 'Flamespyre or Rimewing Phoenix' },
    { ids: ['great-eagle'], per1000: 2, what: 'Great Eagles' },
    { ids: ['talonstrike-bolt-thrower'], per1000: 2, what: 'Eagle-Claw Bolt Throwers' },
    { ids: ['war-lions'], max: 1, needs: ['white-lions'], what: 'unit of War Lions (needs White Lions of Thessa)' },
    { ids: ['lion-chariot-of-thessa'], per1000: 1, generalHas: 'thessan-hunter', what: 'Lion Chariot of Thessa as a Special choice (the General a Thessan Hunter)' },
    { ids: ['lumaren-skycutters'], max: 1, generalHas: 'sea-guard', what: 'Lumaren Skycutter as a Special choice (the General with the Sea Guard honour)' },
    { ids: ['deepwyrms'], max: 1, needs: ['lumaren-sea-guard'], what: 'Deepwyrm (needs Lumaren Sea Guard)' }
  ],
  // Lornefolk of Lorne Wood Army List
  'lornefolk-of-lorne-wood': [
    { ids: ['grove-lord', 'elder-weavesinger'], per1000: 1, what: 'Grove Lord or Elder Weavesinger' },
    { ids: ['treeman-ancient'], per1000: 1, what: 'Treeman Ancient' },
    { ids: ['grove-guard'], required: true, what: 'at least one unit of Grove Guard' },
    { ids: ['shadewood-scouts-core'], per1000: 1, what: 'unit of Shadewood Scouts as a Core choice' },
    { ids: ['treekin'], per1000: 2, what: 'units of Tree Kin' },
    { ids: ['pathwatchers'], perEach: ['pathstalker'], what: 'unit of Pathwatchers per Pathstalker' },
    { ids: ['giant-eagle'], per1000: 3, what: 'Great Eagles' }
  ],
  // Vhar Legacy Army List
  'vhar': [
    { ids: ['vhar-dreadlord', 'supreme-sorceress'], per1000: 1, what: 'Vhar Dreadlord or Supreme Sorceress' },
    { ids: ['bloodmaidens-core'], max: 1, needs: ['blood-crone'], what: 'unit of Bloodmaidens as a Core choice (needs a Blood Crone)' },
    { ids: ['black-guard-of-karvesh'], perEach: ['vhar-dreadlord', 'vhar-master'], what: 'unit of Black Guard of Karvesh per Vhar Noble' },
    { ids: ['coldscale-knights'], per1000: 1, what: 'unit of Coldscale Knights' },
    { ids: ['lashrunner-chariots', 'coldscale-chariots'], per1000: 2, what: 'Lashrunner or Coldscale Chariots' },
    { ids: ['war-hydra-special', 'abyssmaw-special'], max: 1, general: ['high-beastmaster'], what: 'War Hydra or Abyssmaw as a Special choice (the General a High Beastmaster)' },
    { ids: ['hexfire-warlocks'], per1000: 1, what: 'unit of Hexfire Warlocks' },
    { ids: ['reaper-bolt-throwers'], per1000: 2, what: 'Reaper Bolt Throwers' }
  ],
  // Bloodsworn Courts Legacy Army List (The Death of a General: the General
  // must be a Wizard)
  'bloodsworn-courts': [
    { ids: ['blood-count', 'vampire-thrall', 'master-necromancer', 'necromantic-acolyte', 'gravefiend-ghoul-king'], required: true, general: ['blood-count', 'vampire-thrall', 'master-necromancer', 'necromantic-acolyte', 'gravefiend-ghoul-king'], what: 'a Wizard as the General (a Vampire, Necromancer or Gravefiend Ghoul King)' },
    { ids: ['blood-count', 'master-necromancer', 'gravefiend-ghoul-king'], per1000: 1, what: 'Blood Count, Master Necromancer or Gravefiend Ghoul King' },
    { ids: ['wight-king', 'tomb-banshee'], per1000: 1, what: 'Wight King or Tomb Banshee' },
    { ids: ['gravesworn-guard-core', 'barrow-knights-core'], max: 1, needs: ['wight-king', 'wight-lord'], what: 'unit of Gravesworn Guard or Barrow Knights as a Core choice (needs a Wight)' },
    { ids: ['gravesworn-guard', 'barrow-knights'], per1000: 1, what: 'unit of Gravesworn Guard or Barrow Knights' },
    { ids: ['pit-horrors', 'dusk-bats'], per1000: 1, what: 'unit of Pit Horrors or Dusk Bats' },
    { ids: ['charnel-wagon'], max: 3, what: 'Corpse Carts' },
    { ids: ['spirit-hosts'], perEach: ['shroud-wraith', 'tomb-banshee'], what: 'unit of Spirit Hosts for each Shroud Wraith or Tomb Banshee' },
    { ids: ['duskwings', 'dreadwing-colossus'], max: 1, general: ['gravefiend-ghoul-king'], what: 'Duskwings or a Dreadwing Colossus as a Special choice (the General a Gravefiend Ghoul King)' },
    { ids: ['duskwings-rare'], per1000: 1, what: 'unit of Duskwings' },
    { ids: ['night-hearse'], max: 2, what: 'Black Coaches' },
    { ids: ['dreadwing-colossus-rare', 'gorewolf'], per1000: 1, what: 'Dreadwing Colossus or Gorewolf' },
    { ids: ['bloodsworn-knights'], per1000: 1, what: 'unit of Bloodsworn Knights' },
    { ids: ['cursewraiths'], perEach: ['shroud-wraith', 'tomb-banshee'], what: 'unit of Cursewraiths per Shroud Wraith or Tomb Banshee' }
  ],
  // Sand Kings of Kheshet Army List (The Hierophant: a Grave Priest)
  'sand-kings-of-kheshet': [
    { ids: ['sand-king', 'sand-prince', 'amenkhet-the-imperishable-the-great-king-of-kheshet'], required: true, what: 'at least one Sand King or Sand Prince' },
    { ids: ['high-priest', 'mortuary-priest'], required: true, what: 'at least one High Priest or Mortuary Priest (the Hierophant)' },
    { ids: ['sand-king', 'high-priest'], per1000: 1, what: 'Sand King or High Priest' },
    { ids: ['skeleton-warriors', 'skeleton-archers'], required: true, what: 'at least one unit of Skeleton Warriors or Skeleton Archers' },
    { ids: ['sand-guard-core', 'dune-stalkers-core'], max: 1, what: 'unit of Sand Guard or Dune Stalkers as a Core choice' },
    { ids: ['bone-scorpion'], per1000: 3, what: 'Tomb Scorpions' },
    { ids: ['kheshite-warsphinx'], per1000: 2, what: 'Kheshite Warsphinxes' },
    { ids: ['wailing-skull-catapult'], per1000: 2, what: 'Wailing Skull Catapults' },
    { ids: ['urn-of-souls'], per1000: 1, what: 'Urn of Souls' },
    { ids: ['winged-battle-sphinx'], per1000: 1, what: 'Winged Battle Sphinx' }
  ],
  // Gnawkin Army List (Rankrats, Ironvermin: "Have one weapon team" each)
  gnawkin: [
    { ids: ['gnawkin-warlord', 'pale-seer'], per1000: 1, what: 'Gnawkin Warlord or Pale Seer' },
    { ids: ['sparkwright', 'master-assassin', 'blight-priest'], per1000: 1, what: 'Sparkwright, Master Assassin or Blight Priest' },
    { ids: ['ironvermin-core'], per1000: 1, what: 'unit of Ironvermin' },
    { ids: ['rankrats'], requiredPer1000: 1, what: 'unit of Rankrats per 1,000 points' },
    { ids: ['weapon-team'], perEach: ['rankrats', 'ironvermin-core'], what: 'Weapon Team per unit of Rankrats or Ironvermin' },
    { ids: ['ratbrutes'], per1000: 2, what: 'units of Ratbrutes' },
    { ids: ['blight-monks'], perEach: ['blight-priest'], what: 'unit of Blight Monks per Blight Priest' },
    { ids: ['wyrdlock-jezzails'], perEach: ['sparkwright'], what: 'unit of Wyrdlock Jezzails per Sparkwright' },
    { ids: ['poisoned-wind-fumeslingers'], perEach: ['sparkwright'], what: 'unit of Poisoned Wind Fumeslingers per Sparkwright' },
    { ids: ['warren-abomination'], per1000: 1, what: 'Warren Abomination' },
    { ids: ['sparkwheel', 'wyrd-lightning-cannon'], per1000: 1, needs: ['sparkwright'], what: 'Sparkwheel or Wyrd Lightning Cannon (needs a Sparkwright)' },
    { ids: ['blightclaw-catapult', 'blight-censer-bearers'], per1000: 1, needs: ['blight-priest'], what: 'Blightclaw Catapult or unit of Blight Censer Bearers (needs a Blight Priest)' }
  ],
  // Saurians Army List
  saurians: [
    { ids: ['starseer-mage-priest'], max: 1, what: 'Starseer Mage-Priest' },
    { ids: ['saurian-oldblood', 'scaleling-priest'], per1000: 1, what: 'Saurian Oldblood or Scaleling Priest' },
    { ids: ['saurian-warrior'], required: true, what: 'at least one unit of Saurian Warriors' },
    { ids: ['shrine-guard'], max: 1, what: 'unit of Shrine Guard' },
    { ids: ['cliffwing-riders'], perEach: ['scaleling-chief', 'scaleling-priest'], what: 'unit of Cliffwing Riders per Scaleling Hero' },
    { ids: ['razorwing-riders'], perEach: ['scaleling-chief', 'scaleling-priest'], what: 'unit of Razorwing Riders per Scaleling Hero' },
    { ids: ['shieldback'], per1000: 2, what: 'Bastiladons' },
    { ids: ['salamander-packs', 'quillback-packs'], per1000: 1, what: 'Salamander or Quillback Pack' },
    { ids: ['hornback', 'ancient-hornback', 'mirecrawler'], per1000: 1, what: 'Hornback or Mirecrawler' }
  ],
  // Ashforged Army List (The Ladz: one Iron Rukka Boss per Iron Rukka Mob)
  'ashforged': [
    { ids: ['sorcerer-prophet', 'infernal-castellan'], per1000: 1, what: 'Sorcerer-Prophet or Infernal Castellan' },
    { ids: ['bull-centaur-ashtaur'], perEach: ['bull-centaur-hewers'], what: "Bull Centaur Ashtaur per unit of Bull Centaur Hewers" },
    { ids: ['iron-rukka-gaffer', 'iron-rukka-top-lad'], max: 1, needs: ['iron-rukka-mob'], what: 'Iron Rukka Top Lad or Gaffer (needs an Iron Rukka Mob)' },
    { ids: ['furnace-guard'], required: true, what: 'at least one unit of Furnace Guard' },
    { ids: ['iron-rukka-mob'], max: 1, needs: ['iron-rukka-gaffer', 'iron-rukka-top-lad'], what: 'Iron Rukka Mob (needs an Iron Rukka Boss)' },
    { ids: ['iron-behemoth'], per1000: 1, what: 'Iron Behemoth' },
    { ids: ['wailfire-rocket-launcher', 'magma-cannon'], per1000: 1, what: 'Wailfire Rocket Launcher or Magma Cannon' },
    { ids: ['hobgoblin-bolt-thrower'], per1000: 2, what: 'Hobgoblin Bolt Throwers' },
    { ids: ['groundbreaker-mortar', 'soulfire-cannon'], per1000: 1, what: 'Groundbreaker Mortar or Soulfire Cannon' }
  ],
  // Jade Dominion of Shen Army List
  'jade-dominion-of-shen': [
    { ids: ['mei-lan'], per1000: 1, what: 'Shenese Dragon' },
    { ids: ['lianshi-lord', 'gate-master', 'lord-magistrate', 'supreme-astromancer'], per1000: 1, what: 'Lianshi Lord, Gate Master, Lord Magistrate or Supreme Astromancer' },
    { ids: ['jade-lancers-core'], max: 1, general: ['gate-master', 'gate-keeper'], what: 'Jade Lancers as a Core choice (the General a Gate Master or Gate Keeper)' },
    { ids: ['fire-rain-rocket-battery', 'shenese-grand-cannon'], per1000: 2, what: 'Fire Rain Rocket Batteries or Grand Cannons' },
    { ids: ['shenese-sentinel-special'], max: 1, general: ['lianshi-lord', 'lianshi'], what: 'Shenese Sentinel as a Special choice (the General a Lianshi)' },
    { ids: ['kite-lantern-special'], max: 1, general: ['lord-magistrate', 'strategist'], what: 'Kite Lantern as a Special choice (the General a Magistrate or Strategist)' }
  ],
  // The Unmade Army List (generalGod: the General's Unmade Alignment)
  'the-unmade': [
    { ids: ['bloodtyrant', 'great-blighted-one', 'keeper-of-delights', 'lord-of-riddles'], max: 1, what: 'Greater Unmade' },
    { ids: ['unmade-lord'], per1000: 1, what: 'Unmade Lord' },
    { ids: ['unmade-herald-of-wrath'], perEach: ['gorehewers-of-wrath', 'gorehewers-of-wrath-special', 'flesh-hounds-of-wrath-core', 'flesh-hounds-of-wrath', 'ironcrushers-of-wrath', 'ironcrushers-of-wrath-rare', 'skull-cannon-of-wrath'], what: 'Herald of Wrath per unit of Wrath' },
    { ids: ['unmade-herald-of-endurance'], perEach: ['rotbearers-of-endurance', 'rotbearers-of-endurance-special', 'blightlings-core', 'blightlings', 'beasts-of-endurance', 'beasts-of-endurance-rare', 'plague-drones-of-endurance', 'plague-drones-of-endurance-rare'], what: 'Herald of Endurance per unit of Endurance' },
    { ids: ['unmade-herald-of-rapture'], perEach: ['enthrallers-of-rapture', 'enthrallers-of-rapture-special', 'seekers-of-rapture-core', 'seekers-of-rapture', 'fiends-of-rapture', 'fiends-of-rapture-rare', 'seeker-chariot-of-rapture', 'seeker-chariot-of-rapture-rare', 'hellflayer-of-rapture', 'hellflayer-of-rapture-rare'], what: 'Herald of Rapture per unit of Rapture' },
    { ids: ['unmade-herald-of-cipher'], perEach: ['gleeful-horrors-of-cipher-core', 'gleeful-horrors-of-cipher', 'sullen-horrors-of-cipher-core', 'sullen-horrors-of-cipher', 'cinder-horrors-of-cipher', 'cinder-horrors-of-cipher-special', 'screamers-of-cipher', 'screamers-of-cipher-rare', 'flamers-of-cipher', 'flamers-of-cipher-rare', 'burning-chariot-of-cipher'], what: 'Herald of Cipher per unit of Cipher' },
    { ids: ['gorehewers-of-wrath', 'flesh-hounds-of-wrath-core', 'ironcrushers-of-wrath'], generalGod: 'Wrath', what: 'Wrath units as Core or Special choices (the General an Unmade of Wrath)' },
    { ids: ['rotbearers-of-endurance', 'blightlings-core', 'beasts-of-endurance', 'plague-drones-of-endurance'], generalGod: 'Endurance', what: 'Endurance units as Core or Special choices (the General an Unmade of Endurance)' },
    { ids: ['enthrallers-of-rapture', 'seekers-of-rapture-core', 'fiends-of-rapture', 'hellflayer-of-rapture', 'seeker-chariot-of-rapture'], generalGod: 'Rapture', what: 'Rapture units as Core or Special choices (the General an Unmade of Rapture)' },
    { ids: ['gleeful-horrors-of-cipher-core', 'sullen-horrors-of-cipher-core', 'cinder-horrors-of-cipher', 'flamers-of-cipher', 'screamers-of-cipher'], generalGod: 'Cipher', what: 'Cipher units as Core or Special choices (the General an Unmade of Cipher)' },
    { ids: ['skull-cannon-of-wrath'], per1000: 1, what: 'Skull Cannon of Wrath' }
  ],
  // Gutlords Legacy Army List
  'gutlords': [
    { ids: ['tyrant', 'gorgemaster'], per1000: 1, what: 'Tyrant or Gorgemaster' },
    { ids: ['ogre-bulls'], required: true, what: 'the army needs a unit of Ogre Bulls' },
    { ids: ['maneaters'], per1000: 1, what: 'unit of Maneaters' },
    { ids: ['frostfang-cavalry'], per1000: 1, what: 'unit of Frostfang Cavalry' },
    { ids: ['gutcannon', 'grubling-junkflinger'], per1000: 1, what: 'Gutcannon or Grubling Junkflinger' },
    { ids: ['rimetusk-riders'], per1000: 1, what: 'Rimetusk Riders' },
    { ids: ['cragback-riders'], per1000: 1, what: 'Cragback Riders' },
    { ids: ['gorgers'], max: 3, what: 'Gorgers' }
  ],
  // Hornkin Brayherds Army List (`general`: only if the General is one of these)
  'hornkin-herds': [
    { ids: ['herdlord', 'great-herdseer', 'bloodbull'], per1000: 1, what: 'Herdlord, Great Herdseer or Bloodbull' },
    { ids: ['hornkin-herds', 'hornkin'], required: true, what: 'the army needs a Hornkin Herd' },
    { ids: ['greathorn-herds-core'], max: 1, general: ['herdlord', 'hornchief'], what: 'Greathorn Herd as a Core choice (the General a Herdlord or Hornchief)' },
    { ids: ['minotaur-herds-core'], max: 1, general: ['bloodbull', 'gorehorn'], what: 'Minotaur Herd as a Core choice (the General a Bloodbull or Gorehorn)' },
    { ids: ['gibberwyrm', 'gazehorn-special'], max: 1, general: ['great-herdseer', 'herdseer', 'mirefang'], what: 'Gibberwyrm or Gazehorn as a Special choice (the General a Herdseer)' },
    { ids: ['gorgemaw'], max: 1, general: ['bloodbull', 'gorehorn'], what: 'Gorgemaw as a Special choice (the General a Bloodbull or Gorehorn)' },
    { ids: ['peryton'], per1000: 1, what: 'Peryton' },
    { ids: ['hornstone'], max: 1, what: 'Hornstone' },
    { ids: ['gigantic-spawn-of-dominion'], per1000: 1, what: 'Gigantic Spawn of Dominion' }
  ],
  // Dominion Hosts Army List
  'dominion-hosts': [
    { ids: ['dominion-lord', 'unmade-lord'], max: 1, what: 'Dominion Lord or Unmade Lord' },
    { ids: ['exalted-champion', 'sorcerer-lord'], per1000: 1, what: 'Exalted Champion or Sorcerer Lord' },
    { ids: ['chosen-dominion-warriors'], max: 1, what: 'unit of Chosen Dominion Warriors' },
    { ids: ['chosen-dominion-knights'], max: 1, what: 'unit of Chosen Dominion Knights' },
    { ids: ['soulfire-cannon'], per1000: 1, what: 'Soulfire Cannon' },
    { ids: ['thunderwyrm-elder'], perEach: ['thunderwyrms'], what: 'Thunderwyrm Elder per unit of Thunderwyrms' },
    { ids: ['dominion-giant'], per1000: 1, what: 'Dominion Giant' },
    { ids: ['gigantic-spawn-of-dominion'], per1000: 1, what: 'Gigantic Spawn of Dominion' },
    { ids: ['wyrdfire-dragon'], max: 1, what: 'Wyrdfire Dragon' }
  ],
  // Broken Crowns
  // (one war machine for each 1,000 points from a short list: the Organ Gun, and the Bombard on the line after
  // it, read here as both being in the list)
  'broken-crowns': [
    { ids: ['renegade-prince'], per1000: 1, what: 'Renegade Prince' },
    { ids: ['veteran-sellswords'], per1000: 1, what: 'unit of Veteran Sellswords' },
    { ids: ['marchlord-mortar'], per1000: 2, what: 'Marchlords Mortars' },
    { ids: ['marchlords-organ-gun', 'marchlord-bombard'], per1000: 1, what: 'Marchlords Organ Gun or Bombard' }
  ]
}

// Options only some units may take: `per1000` units, or one unit for each character with an Infamous Origin
// (`perOrigin`: the Infamous Origins). `opts` are matched against
// the unit's chosen option names (an option's sub-choice included).
const OPTION_LIMITS = {
  'broken-crowns': [
    // Marchlord Brigands: for each 1,000 points, one unit may swap Open Order for Close Order or Skirmishers
    { ids: ['marchlord-brigands'], opts: ['Close Order'], per1000: 1, what: 'unit of Brigands in Close Order' },
    { ids: ['marchlord-brigands'], opts: ['Skirmishers'], per1000: 1, what: 'unit of Brigands as Skirmishers' },
    // Hireling Outriders: for each 1,000 points, one unit may take Feigned Flight, Reserve Move, Vanguard or a magic standard
    { ids: ['hireling-outriders'], opts: ['Feigned Flight', 'Reserve Move', 'Vanguard'], per1000: 1, what: 'unit of Hireling Outriders with Feigned Flight, Reserve Move or Vanguard' },
    // units granted by a character's Infamous Origin (one per such character)
    { ids: ['sellsword-infantry', 'veteran-sellswords'], opts: ['Heavy Infantry, Phalanx'], perOrigin: 'The Might of Varezza', what: 'unit with Heavy Infantry and Phalanx (one per character with the Might of Varezza)' },
    { ids: ['hedge-knights', 'veteran-hedge-knights'], opts: ['Lance Formation, Noble Disdain'], perOrigin: 'The Renegade Knight', what: 'unit with Lance Formation and Noble Disdain (one per character with the Renegade Knight)' },
    { ids: ['hireling-outriders'], opts: ['Ambushers'], perOrigin: 'The Noble Outlaw', what: 'unit of Hireling Outriders with Ambushers (one per character with the Noble Outlaw)' },
    { ids: ['marchlord-brigands'], opts: ['+1 to Weapon Skill'], perOrigin: 'The Wandering Diestro', what: 'unit of Brigands with +1 Weapon Skill (one per character with the Wandering Diestro)' }
  ]
}

function limitProblems (list) {
  const out = []
  const ids = list.units.map(u => u.entryId)
  const thousands = Math.max(1, Math.floor(list.points / 1000))
  for (const l of LIMITS[list.army] || []) {
    const n = ids.filter(id => l.ids.includes(id)).length
    if (l.required && !n) out.push(l.what)
    // ("1+ unit of Rankrats per 1,000 points": at least one for each full 1,000)
    if (l.requiredPer1000 && n < l.requiredPer1000 * thousands) out.push(`at least ${l.requiredPer1000 * thousands} ${l.what} (${n} taken)`)
    if (!n) continue
    if (l.max && n > l.max) out.push(`at most ${l.max} ${l.what} (${n} taken)`)
    if (l.generalGod) { const gen = list.units.find(x => (findEntry(list.army, x.entryId).command || []).some((c, i) => /^general$/i.test(c.name) && x.command.includes(i))); const names = gen ? (findEntry(list.army, gen.entryId).specialRules || []).map(r => r.name || r) : []; if (!names.some(r => r === `Unmade of ${l.generalGod}` || r === `Unmade of ${l.generalGod}`)) out.push(`${l.what}: not with this General`) }
    if (l.general || l.generalHas) { const gen = list.units.find(x => (findEntry(list.army, x.entryId).command || []).some((c, i) => /^general$/i.test(c.name) && x.command.includes(i))); if (!gen || (l.general && !l.general.includes(gen.entryId)) || (l.generalHas && !(gen.items || []).includes(l.generalHas))) out.push(`${l.what}: not with this General`) }
    if (l.per1000 && n > l.per1000 * thousands) out.push(`at most ${l.per1000 * thousands} ${l.what} at ${list.points} points (${n} taken)`)
    if (l.needs && !ids.some(id => l.needs.includes(id))) out.push(l.what)
    if (l.perEach) { const m = ids.filter(id => l.perEach.includes(id)).length; if (n > m) out.push(`at most one ${l.what} (${n} taken, ${m} allowed)`) }
  }
  const names = u => chosenNames(findEntry(list.army, u.entryId), u).options
  for (const l of OPTION_LIMITS[list.army] || []) {
    const n = list.units.filter(u => l.ids.includes(u.entryId) && names(u).some(o => l.opts.includes(o))).length
    if (!n) continue
    const m = l.per1000 ? l.per1000 * thousands : list.units.filter(u => names(u).includes(l.perOrigin)).length
    if (n > m) out.push(`at most ${m} ${l.what} (${n} taken)`)
  }
  return out
}

// ---- magic items ----

// A per-model option that adds models of another profile row (the Gobbler Herd's Gobbler Minders)
export const isExtraModels = (entry, o) => !!o?.stackable && (entry.profile || []).some(r => r.Name === o.name)

export const isWizardSel = (entry, sel) => sel.options.some(i => /Wizard$/i.test(entry.options[i]?.name || '')) || (entry.specialRules || []).some(r => /^Wizard/.test(r?.name ?? r))
// (a Wizard is never offered armour: Wizards and armour; the army data files a Head Case's
// Frenzy under armour)
const hasArmourOption = (entry, sel) => !isWizardSel(entry, sel) && (entry.armor.length > 0 || entry.options.some(o => /shield|armour|barding/i.test(o.name)) || /armour|shield|barding/i.test(entry.equipmentText || ''))
export const isBSBSel = (entry, sel) => sel.command.some(i => /battle standard/i.test(entry.command[i]?.name || ''))
export const hasStandardSel = (entry, sel) => sel.command.some(i => /standard bearer/i.test(entry.command[i]?.name || '') && !/battle standard/i.test(entry.command[i]?.name || ''))

// The items a unit could take: those of the general list and its own army, of a category it is
// allowed, with the reason any is not open to it. Returns [{ id, item, why }].
export function itemChoices (armyId, entry, sel) {
  const allow = ALLOWANCE[entry.id] || {}
  const character = entry.category === 'characters'
  const out = []
  // (The Renegade Knight / The Noble Outlaw: an Infamous Origin opens another army's items)
  const armies = itemArmies(armyId, chosenNames(entry, sel).options)
  for (const it of Object.values(ITEMS)) {
    if (it.army !== 'general' && !armies.includes(it.army)) continue
    if (it.unique) continue // a named character's own item, never bought (UNIQUE, units.js)
    // (Unmade Alignment: a god's Unmade Gifts and Icons only for its own Unmade)
    if (it.god && !(entry.specialRules || []).some(r => new RegExp(`^Unmade of ${it.god}$`, 'i').test(r.name || r))) continue
    // Rune Magic: Dwarfs buy runes, never the general magic items
    if (armyId === 'deephold-clans' && it.army === 'general') continue
    let why = null
    if (it.rune) {
      // a character's or war machine's runes (ALLOWANCE runes: the kinds, a total, or each kind's own cap); a unit's
      // Standard runes as its magic standard; a BSB's Standard runes
      const R = allow.runes
      if (it.type === 'banner-runes') {
        if (character) { if (!isBSBSel(entry, sel)) why = 'only the Battle Standard Bearer carries Standard runes' } else if (!allow.standard) continue
        else if (ITEM_EFFECTS[it.id]?.bannerOnlyBSB) why = 'Battle Standard Bearer only'
        else if (!hasStandardSel(entry, sel)) why = 'needs a standard bearer'
        else if (it.points > allow.standard) why = `over its ${allow.standard}-point limit`
      } else if (it.type === 'ranged-weapon-runes') {
        if (!R || !R.types.includes('weapon-runes')) continue
        // (Engineers Weapon Runes: on a crossbow or handgun — an Engineer's, a Thane's...)
      } else if (!R || !R.types.includes(it.type)) continue
      if (!why) why = mayTake(entry, sel, it.id, { wizard: false, armourOption: true })
      if (!why && R && (R.caps[it.type] ?? R.max) != null && it.points > (R.caps[it.type] ?? R.max)) why = `over its ${R.caps[it.type] ?? R.max}-point allowance`
      if (!why && !isPlayable(it.id)) why = 'not playable yet'
      out.push({ id: it.id, item: it, why })
      continue
    }
    // Gifts of Dominion: a character's Gifts, within their own allowance; Chaotic Traits:
    // the characters and units whose entries offer Chaotic Traits (a unit's trait is the whole unit's)
    // (Dominion Mutations: Hornkin characters' Dominion Mutations, the same way as Gifts)
    // (Forest Spites: bought the same way, up to N points in all)
    // (Vampiric Powers: bought the same way, up to N points in all)
    // (Unmade Gifts: "May purchase Unmade Gifts up to a total of N points", the same way)
    if (it.type === 'gift-of-dominion' || it.type === 'chaotic-trait' || it.type === 'dominion-mutation' || it.type === 'forest-spite' || it.type === 'vampiric-power' || it.type === 'unmade-gift') {
      const pool = it.type === 'gift-of-dominion' ? allow.gifts : it.type === 'dominion-mutation' ? allow.mutations : it.type === 'forest-spite' ? allow.spites : it.type === 'vampiric-power' ? allow.powers : it.type === 'unmade-gift' ? allow.dgifts : null
      if (it.type === 'chaotic-trait' ? !allow.traits : !(character && pool)) continue
      why = mayTake(entry, sel, it.id, { wizard: isWizardSel(entry, sel), armourOption: true })
      if (!why && pool != null && it.points > pool) why = `over its ${pool}-point allowance for ${it.type === 'dominion-mutation' ? 'Dominion Mutations' : it.type === 'forest-spite' ? 'Forest Spites' : it.type === 'vampiric-power' ? 'Vampiric Powers' : it.type === 'unmade-gift' ? 'Unmade Gifts' : 'Gifts'}`
      if (!why && !isPlayable(it.id)) why = 'not playable yet'
      out.push({ id: it.id, item: it, why })
      continue
    }
    // Big Names: "May take a single Big Name"; Elven Honours: "May take a single
    // Elven Honour" (each paid for apart from magic items)
    // (Blood Crone, Bloodied God Assassin: one Gift of the Bloodied God or one Forbidden Poison)
    // (High Priest...: "Purchase up to N Incantation Scrolls" — counted, apart from magic items)
    if (it.type === 'big-name' || it.type === 'elven-honour' || it.type === 'discipline-makers' || it.type === 'gift-of-the-bloodied-god' || it.type === 'forbidden-poison' || it.type === 'incantation-scroll') {
      if (!character || !({ 'big-name': allow.bigName, 'elven-honour': allow.honour, 'discipline-makers': allow.discipline, 'gift-of-the-bloodied-god': allow['the-bloodied-god'], 'forbidden-poison': allow.poison, 'incantation-scroll': allow.scrolls })[it.type]) continue
      why = mayTake(entry, sel, it.id, { wizard: isWizardSel(entry, sel), armourOption: true })
      if (!why && !isPlayable(it.id)) why = 'not playable yet'
      out.push({ id: it.id, item: it, why })
      continue
    }
    // Knightly Virtues: only where the unit's page says "May take a single Knightly Virtue"
    if (it.type === 'knightly-virtue') {
      if (!character || !allow.virtue) continue
      why = mayTake(entry, sel, it.id, { wizard: isWizardSel(entry, sel), armourOption: true })
    } else if (it.type === 'banner') {
      if (character) { if (!isBSBSel(entry, sel)) why = 'only the Battle Standard Bearer carries a magic standard' } else if (!allow.standard) continue
      else if (!hasStandardSel(entry, sel)) why = 'needs a standard bearer'
      else if (it.points > allow.standard) why = `over its ${allow.standard}-point limit`
    } else {
      if (!character) continue // a champion's items are not in the game yet
      if (!allow.character) continue
      why = mayTake(entry, sel, it.id, { wizard: isWizardSel(entry, sel), armourOption: hasArmourOption(entry, sel) })
    }
    if (!why && !isPlayable(it.id)) why = 'not playable yet'
    out.push({ id: it.id, item: it, why })
  }
  return out
}

// Limitations and Uniqueness, Extremely Common Magic Items,
// Purchasing Magic Items (see items.js for the rules in full)
// Purchasing Magic Items / Champions and Challenges: a unit's champion may
// buy magic items where its command option says so ('magic': the categories and points). The champion's weapon,
// armour and talisman act for the champion alone: its own attacks, and its saves in a challenge (combat.js). Its
// enchanted and arcane items are not in the game yet.
export function championMagic (entry, sel) {
  for (const i of sel.command || []) { const c = entry.command[i]; if (c?.magic && /champion|preceptor|boss|captain|crusher|sergeant|leader/i.test(c.name)) return c.magic }
  return null
}
export function champItemChoices (armyId, entry, sel) {
  const allow = ALLOWANCE[entry.id] || {}
  const hasChamp = (sel.command || []).some(i => /champion|preceptor|guardian|paragon|gallant|boss|crusher|sergeant|leader/i.test(entry.command[i]?.name || ''))
  // (where the army data gives no categories, the unit's entry says how many points)
  const m = championMagic(entry, sel) || (hasChamp && allow.champion ? { types: ['weapon', 'armor', 'talisman', 'enchanted-item'], maxPoints: allow.champion } : null) || (hasChamp && allow.champVirtue ? { types: [], maxPoints: 0 } : null)
  if (!m) return []
  if (allow.champVirtue && !m.types.includes('knightly-virtue')) m.types = [...m.types, 'knightly-virtue']
  const out = []
  for (const it of Object.values(ITEMS)) {
    if (it.army !== 'general' && it.army !== armyId) continue
    if (it.unique || it.type === 'banner' || !m.types.includes(it.type)) continue
    if (armyId === 'deephold-clans' && it.army === 'general') continue
    let why = ['weapon', 'armor', 'talisman', 'knightly-virtue', 'weapon-runes', 'talismanic-runes', 'armor-runes'].includes(it.type) ? mayTake(entry, sel, it.id, { wizard: false, armourOption: hasArmourOption(entry, sel) }) : 'not playable for a champion yet'
    if (!why && it.type !== 'knightly-virtue' && it.points > m.maxPoints) why = `over its champion's ${m.maxPoints}-point allowance`
    if (!why && !isPlayable(it.id)) why = 'not playable yet'
    out.push({ id: it.id, item: it, why })
  }
  return out
}

function itemProblems (list) {
  const out = []
  const seen = {}
  for (const u of list.units) {
    const e = findEntry(list.army, u.entryId)
    const items = u.items || []
    const allow = ALLOWANCE[e.id] || {}
    const choices = Object.fromEntries(itemChoices(list.army, e, u).map(c => [c.id, c]))
    // (runes: the Rules of the Runes and their own allowance, below — runes.js)
    const runes = items.filter(id => ITEMS[id]?.rune)
    if (runes.length) {
      const R = allow.runes
      const std = runes.filter(id => ITEMS[id].type === 'banner-runes')
      const stdPts = std.reduce((a, id) => a + ITEMS[id].points, 0)
      if (std.length && allow.standard && stdPts > allow.standard) out.push(`${e.name}: ${stdPts} points of Standard runes, over its ${allow.standard}-point limit`)
      const own = runes.filter(id => ITEMS[id].type !== 'banner-runes' && ITEMS[id].type !== 'runic-tattoos')
      if (R?.max != null && !Object.keys(R.caps).length) { const p = own.reduce((a, id) => a + ITEMS[id].points, 0); if (p > R.max) out.push(`${e.name}: ${p} points of runes, over its ${R.max}-point allowance`) }
      for (const [t, cap] of Object.entries(R?.caps || {})) { const p = own.filter(id => ITEMS[id].type === t || (t === 'weapon-runes' && ITEMS[id].type === 'ranged-weapon-runes')).reduce((a, id) => a + ITEMS[id].points, 0); if (p > cap) out.push(`${e.name}: ${p} points of ${t.replace('-', ' ')}, over its ${cap}-point allowance`) }
      const tat = runes.filter(id => ITEMS[id].type === 'runic-tattoos')
      if (tat.length > (R?.tattoos || 0)) out.push(`${e.name}: at most ${R?.tattoos || 0} runic tattoo${R?.tattoos === 1 ? '' : 's'}`)
      if (new Set(tat).size < tat.length) out.push(`${e.name}: the same runic tattoo twice`)
      for (const id of new Set(runes)) { const c = choices[id]; if (!c) out.push(`${e.name} may not take ${ITEMS[id].name}`); else if (c.why) out.push(`${e.name}: ${ITEMS[id].name} — ${c.why}`) }
    }
    // (Gifts of Dominion and Chaotic Traits: their own allowance, apart from magic items)
    const mutations = items.filter(id => ITEMS[id]?.type === 'dominion-mutation')
    const mutPts = mutations.reduce((a, id) => a + ITEMS[id].points, 0)
    if (mutations.length && mutPts > (allow.mutations || 0)) out.push(`${e.name}: ${mutPts} points of Dominion Mutations, over its ${allow.mutations || 0}-point allowance`)
    const gifts = items.filter(id => ITEMS[id]?.type === 'gift-of-dominion')
    const traits = items.filter(id => ITEMS[id]?.type === 'chaotic-trait')
    const giftPts = gifts.reduce((a, id) => a + ITEMS[id].points, 0)
    const dg = items.filter(id => ITEMS[id]?.type === 'unmade-gift')
    const dgPts = dg.reduce((a, id) => a + ITEMS[id].points, 0)
    if (dg.length && dgPts > (allow.dgifts || 0)) out.push(`${e.name}: ${dgPts} points of Unmade Gifts, over its ${allow.dgifts || 0}-point allowance`)
    const powers = items.filter(id => ITEMS[id]?.type === 'vampiric-power')
    const powPts = powers.reduce((a, id) => a + ITEMS[id].points, 0)
    if (powers.length && powPts > (allow.powers || 0)) out.push(`${e.name}: ${powPts} points of Vampiric Powers, over its ${allow.powers || 0}-point allowance`)
    if (new Set(powers).size < powers.length) out.push(`${e.name}: the same Vampiric Power twice`)
    const spites = items.filter(id => ITEMS[id]?.type === 'forest-spite')
    const spitePts = spites.reduce((a, id) => a + ITEMS[id].points, 0)
    if (spites.length && spitePts > (allow.spites || 0)) out.push(`${e.name}: ${spitePts} points of Forest Spites, over its ${allow.spites || 0}-point allowance`)
    if (gifts.length && giftPts > (allow.gifts || 0)) out.push(`${e.name}: ${giftPts} points of Gifts of Dominion, over its ${allow.gifts || 0}-point allowance`)
    if (items.filter(id => ITEMS[id]?.type === 'big-name').length > 1) out.push(`${e.name}: only a single Big Name`)
    if (items.filter(id => ITEMS[id]?.type === 'elven-honour').length > 1) out.push(`${e.name}: only a single Elven Honour`)
    if (items.filter(id => ITEMS[id]?.type === 'gift-of-the-bloodied-god').length > 1) out.push(`${e.name}: only one Gift of the Bloodied God`)
    if (items.filter(id => ITEMS[id]?.type === 'discipline-makers').length > 1) out.push(`${e.name}: only a single Discipline of the Makers`)
    if (items.filter(id => ITEMS[id]?.type === 'forbidden-poison').length > 1) out.push(`${e.name}: only one Forbidden Poison`)
    const scrolls = items.filter(id => ITEMS[id]?.type === 'incantation-scroll')
    if (scrolls.length > (allow.scrolls || 0)) out.push(`${e.name}: at most ${allow.scrolls || 0} Incantation Scroll${allow.scrolls === 1 ? '' : 's'}`)
    if (traits.length > (allow.traits || 0)) out.push(`${e.name}: at most ${allow.traits || 0} Chaotic Trait${allow.traits === 1 ? '' : 's'}`)
    if (new Set(traits).size < traits.length) out.push(`${e.name}: the same Chaotic Trait twice`)
    const banners = items.filter(id => ITEMS[id]?.type === 'banner')
    const others = items.filter(id => ITEMS[id]?.type !== 'banner' && !ITEMS[id]?.rune && ITEMS[id]?.type !== 'gift-of-dominion' && ITEMS[id]?.type !== 'chaotic-trait' && ITEMS[id]?.type !== 'dominion-mutation' && ITEMS[id]?.type !== 'forest-spite' && ITEMS[id]?.type !== 'vampiric-power' && ITEMS[id]?.type !== 'unmade-gift' && ITEMS[id]?.type !== 'incantation-scroll' && ITEMS[id]?.type !== 'discipline-makers' && ITEMS[id]?.type !== 'gift-of-the-bloodied-god' && ITEMS[id]?.type !== 'forbidden-poison' && ITEMS[id]?.type !== 'big-name' && ITEMS[id]?.type !== 'elven-honour')
    // (a Knightly Virtue is paid for apart from the magic item allowance, one to a model)
    const virtues = others.filter(id => ITEMS[id]?.type === 'knightly-virtue')
    if (virtues.length > 1) out.push(`${e.name}: only a single Knightly Virtue`)
    for (const id of items) {
      const it = ITEMS[id]
      if (!it) { out.push(`${e.name}: unknown magic item ${id}`); continue }
      if (it.rune) continue
      if (it.type === 'gift-of-dominion' || it.type === 'chaotic-trait' || it.type === 'dominion-mutation' || it.type === 'forest-spite' || it.type === 'vampiric-power' || it.type === 'unmade-gift' || it.type === 'incantation-scroll' || it.type === 'discipline-makers' || it.type === 'gift-of-the-bloodied-god' || it.type === 'forbidden-poison' || it.type === 'big-name' || it.type === 'elven-honour') { if (!choices[id]) out.push(`${e.name} may not take ${it.name}`); else if (choices[id].why) out.push(`${e.name}: ${it.name} — ${choices[id].why}`); if (it.onePerArmy) { if (seen[id]) out.push(`${it.name}: only one in the army`); seen[id] = true } continue }
      if (!choices[id]) out.push(`${e.name} may not take ${it.name}`)
      else if (choices[id].why) out.push(`${e.name}: ${it.name} — ${choices[id].why}`)
      if (it.onePerArmy) { if (seen[id]) out.push(`${it.name}: only one in the army`); seen[id] = true }
    }
    if (banners.length > 1) out.push(`${e.name}: only one magic standard`)
    const spend = others.filter(id => ITEMS[id]?.type !== 'knightly-virtue').reduce((a, id) => a + (ITEMS[id]?.points || 0), 0)
    if (others.length && spend > (allow.character || 0)) out.push(`${e.name}: ${spend} points of magic items, over its ${allow.character || 0}-point allowance`)
    // one item of each category per model, except extremely common items; an item marked 0-1 per model once
    const byType = {}
    for (const id of others) {
      const it = ITEMS[id]
      if (it.maxPerModel && others.filter(x => x === id).length > it.maxPerModel) out.push(`${e.name}: at most ${it.maxPerModel} ${it.name}`)
      if (it.extremelyCommon) continue
      // (a named character may carry more than one item of the same category)
      if (byType[it.type] && !(e.troopType || []).includes('Named Character')) out.push(`${e.name}: only one ${it.type.replace('armor', 'armour').replace('-', ' ')} (unless extremely common)`)
      byType[it.type] = true
    }
    // the champion's items: offered, paid for within its allowance, one of each category, one of each item per army
    const ch = u.champItems || []
    if (ch.length) {
      const cm = championMagic(e, u)
      const cc = Object.fromEntries(champItemChoices(list.army, e, u).map(c => [c.id, c]))
      if (!cm) out.push(`${e.name}: only a champion may carry those items (no champion)`)
      for (const id of ch) {
        const it = ITEMS[id]
        if (!it) continue
        if (!cc[id]) out.push(`${e.name}'s champion may not take ${it.name}`)
        else if (cc[id].why) out.push(`${e.name}'s champion: ${it.name} — ${cc[id].why}`)
        if (it.onePerArmy) { if (seen[id]) out.push(`${it.name}: only one in the army`); seen[id] = true }
      }
      const sp = ch.filter(id => ITEMS[id]?.type !== 'knightly-virtue').reduce((a, id) => a + (ITEMS[id]?.points || 0), 0)
      if (cm && sp > cm.maxPoints) out.push(`${e.name}'s champion: ${sp} points of magic items, over its ${cm.maxPoints}-point allowance`)
      const t = {}
      for (const id of ch) { const it = ITEMS[id]; if (!it || it.extremelyCommon) continue; if (t[it.type]) out.push(`${e.name}'s champion: only one ${it.type.replace('armor', 'armour')}`); t[it.type] = true }
    }
    // Obsidian Lodestone: up to three
    if (others.filter(x => x === 'obsidian-lodestone').length > 3) out.push(`${e.name}: at most three Obsidian Lodestones`)
  }
  return [...new Set(out)]
}
