// Units on the table: fielding a unit from its list entry, its models in ranks and files, its footprint, facing
// and arcs, and the rule look-ups every other module uses (rulesOf, hasRule, ruleValue). Everything in inches.
//
// A unit's position is the CENTRE OF ITS FRONT EDGE, `pos`, and the way its front faces, `facing` (radians,
// geometry.js). Its models stand in `files` columns, front rank first; an incomplete last rank is allowed and stands
// centred behind the rank in front of it.

import { UNMADE_RULES, godOf, RIVAL } from './unmade.js'
import { packHunter, ogreOptions } from './ogres.js'
import { slaughterersCall, tingle, dtp, hornkinOptions, crownedHost } from './hornkin.js'
import { dominionOptions, mutationRules, dominionItemsAtFielding } from './dominion.js'
import { dwarfJoinedRules } from './dwarfs.js'
import { lyonneseRules, reliquaeRules, currentGame } from './lyonne.js'
import { ITEMS, UNIQUE } from '../data/magicItems.js'
import { applyItemsToUnit, bannersOf, EFFECTS } from './items.js'
import { findEntry, findEntryAnywhere, chosenNames, unitCost, newUnit, WHIRLER_POINTS } from './roster.js'
import { mountFor, isPlayableMount, isRiddenMonster, chariotMountEntry, isShieldbearers } from './mounts.js'
import { grantedRules } from './orders.js'
import { renegadeOptions, stoicHost } from './renegade.js'
import { mmToIn, add, mul, dirOf, rightOf, sub, dot, polyDist, dist } from './geometry.js'

const num = v => (v === '-' || v == null || v === '' ? null : (Number.isNaN(+v) ? v : +v))
const toProfile = row => Object.fromEntries(['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'Ld'].map(k => [k, num(row[k])]))

let nextId = 1

// A unit from an army list, ready for the table. `side` is 0 or 1.
export function fieldUnit (armyId, sel, side, entryOverride = null) {
  const entry = entryOverride || findEntry(armyId, sel.entryId)
  if (!entry?.profile) throw new Error(`${sel.entryId} has no stat line`)
  const names = chosenNames(entry, sel)
  const special = new Set([
    // (a page's footnote marker — Hernath's 'Open Order*' — is not part of the rule's name)
    ...(entry.specialRules || []).map(r => r.name.replace(/\*+$/, '')),
    ...names.options.flatMap(o => o.split(',').map(s => s.trim())),
    // the army data files Frenzy among the 'armour' choices for some Rukka
    ...(names.armor && /^frenzy$/i.test(names.armor.trim()) ? ['Frenzy'] : [])
  ])
  // the entry's base size: one size, or a war machine's, or the first of several ('two wolves' / 'three wolves')
  const baseMm = entry.base?.model || entry.base?.['war machine'] || entry.base?.max || entry.base?.min || (entry.base && Object.values(entry.base)[0]) || [25, 25]
  const crewMm = entry.base?.crew || null
  // a Named Character is a character (Named Characters Dawn Wars Armies)
  const category = (entry.unitCategory?.[0] || 'Infantry').toLowerCase().replace(/^named character$/, 'character')
  const troopType = (entry.troopType || []).map(t => t === 'Named Character' ? 'Character' : t)
  // (some entries give the troop type alone, 'Regular Infantry', with Character as the unit category: Renegade Prince)
  if (category === 'character' && !troopType.includes('Character')) troopType.push('Character')

  // which profile row is the rank and file, which the champion, which the mount
  const rows = entry.profile
  const isMountRow = r => r.M != null && r.WS != null && r.Ld === '-' && r.T === '-'
  // (rows named by a per-model option are extra models — the Gobbler Herd's herders — not the rank and file)
  const extraRows = (names.counts || []).map(c => c.name)
  const rider = rows.find(r => !isMountRow(r) && !extraRows.includes(r.Name)) || rows[0]
  // (a unit choosing between its mount rows: Hedge Knights 'Replace Warhorses with Barded Warhorses')
  const rowFor = n => n && rows.find(r => isMountRow(r) && (r.Name === n || r.Name + 's' === n))
  const mountRow = rowFor(names.mount) || rows.find(isMountRow) || null
  const champRow = rows.find((r, i) => i > 0 && r !== mountRow && !isMountRow(r) && r !== rider && !extraRows.includes(r.Name) && !/crew/i.test(r.Name)) || null

  const command = names.command
  const has = re => command.some(c => re.test(c))
  const models = []
  for (let i = 0; i < sel.count; i++) {
    models.push({ name: rider.Name, profile: toProfile(rider), wounds: num(rider.W) || 1, startW: num(rider.W) || 1, role: 'rank' })
  }
  // champion, standard, musician are bought FROM the unit (they replace rank-and-file models)
  // Command Groups
  const promote = (role, name, row) => {
    const m = models.find(x => x.role === 'rank')
    if (!m) return
    m.role = role
    if (name) m.name = name
    if (row) { m.profile = toProfile(row); m.wounds = num(row.W) || 1; m.startW = m.wounds }
  }
  // (a champion bought by its own name, without the word: a Bladelord, a Keeper of the Flame, Lord's Bowmen for a Lord's
  // Bowman — the command entry that names the unit's champion profile row; Champions)
  const norm = n => String(n || '').toLowerCase().replace(/men\b/g, 'man').replace(/[^a-z]/g, '').replace(/s$/, '')
  const namedChamp = champRow && command.some(c => !/standard|musician|general|chalice/i.test(c) && norm(c) === norm(champRow.Name))
  if (has(/champion/i) || namedChamp) promote('champion', champRow?.Name || 'Champion', champRow)
  if (has(/standard bearer/i) && !has(/battle standard/i)) promote('standard')
  if (has(/musician/i)) promote('musician')
  // Chalice Monk: a second champion, with its own profile
  if (has(/chalice monk/i)) promote('monk', 'Chalice Monk', rows.find(r => /chalice monk/i.test(r.Name)))
  // Chalice Reliquary: the Battle Pilgrims' Chalice Reliquary (its own profile row)
  if (has(/chalice reliquary/i)) promote('reliquae', 'Chalice Reliquary', rows.find(r => /chalice reliquary/i.test(r.Name)))

  const unit = {
    id: `u${nextId++}`,
    cost: unitCost(entry, sel).total,
    side,
    army: armyId,
    entryId: entry.id,
    name: entry.name,
    category,                    // infantry, cavalry, monster, war machine, character, chariot...
    troopType,                   // e.g. ['Regular Infantry'] or ['Heavy Cavalry']
    base: { w: mmToIn(baseMm[0]), d: mmToIn(baseMm[1]) },
    crewBase: crewMm ? { w: mmToIn(crewMm[0]), d: mmToIn(crewMm[1]) } : null,
    models,
    // Wicked claws: a mount armed with wicked claws (S, AP -2) — the Clawsteed
    mount: mountRow ? { name: mountRow.Name, profile: toProfile(mountRow), claws: (entry.equipmentText || '').split('\n').some(l => l.toLowerCase().startsWith(mountRow.Name.replace(/\s*\(.*$/, '').toLowerCase()) && /wicked claws/i.test(l)) } : null,
    crew: rows.filter(r => /crew/i.test(r.Name)).map(r => ({ name: r.Name, profile: toProfile(r), count: Number((r.Name.match(/\(x(\d+)\)/) || [])[1] || 1) })),
    // Monster Handlers: the monster's handlers, its own profile row ("Ashforged Handlers (x3)")
    handlers: (entry.specialRules || []).some(r => (r.name || r) === 'Monster Handlers') ? rows.filter(r => /handler/i.test(r.Name)).map(r => ({ name: r.Name.replace(/\s*\(x\d+\)/, ''), profile: toProfile(r), count: Number((r.Name.match(/\(x(\d+)\)/) || [])[1] || 1) })) : null,
    // a chariot's beasts: how many draw each chariot ("Giant Wolves (x2)", +1 with the option for a third)
    beasts: mountRow ? Number((mountRow.Name.match(/\(x(\d+)\)/) || [])[1] || 1) + (names.options.some(o => /third/i.test(o)) || (names.counts || []).some(c => /third/i.test(c.name)) ? 1 : 0) : 0,
    files: defaultFiles(category, sel.count),
    pos: { x: 0, y: 0 },
    facing: side === 0 ? -Math.PI / 2 : Math.PI / 2,
    placed: false,
    equipment: names.equipment || '',
    armour: names.armor || '',
    mountChoice: names.mount || null,
    lore: names.lore || null,
    options: names.options,
    command,
    isGeneral: command.includes('General'),
    isBSB: command.includes('Battle Standard Bearer'),
    // (The Hierophant: a Sand Kings army names its Hierophant on the muster list — tombkings.js)
    isHierophant: command.includes('The Hierophant'),
    special,
    // Formation Types: the formation a unit's
    // special rules allow (Close Order first; Open Order; Skirmish is drawn and played as Open Order for now)
    // Characters and Formations: a Lone character is always in Skirmish formation
    formation: special.has('Close Order') ? 'close' : special.has('Open Order') ? 'open' : special.has('Skirmishers') ? 'skirmish' : (troopType.includes('Character') ? 'skirmish' : 'close'),
    armourValue: entry.armourValue || null,
    rulesPage: entry.rulesPage,
    equipmentText: entry.equipmentText || '',
    // the state of play
    status: { fleeing: false, engaged: false, charged: false, moved: false, marched: false, reformed: false, shot: false, dead: false, panicked: false }
  }
  // (a chariot is boarded after the character's magic items are fitted: their bonuses are the character's)
  // (a mount with no page of its own that is a row of the entry's profile — Titch's Nosher — is already
  // there, as a Grand Master's Barded Warhorse is)
  const ownRow = names.mount && rows.some(r => r.Name === names.mount || r.Name + 's' === names.mount) && !isPlayableMount(mountFor(names.mount))
  // Oathstone: a character standing on an Oathstone (a choice of mount, or an option)
  if (/^oathstone$/i.test(names.mount || '') || names.options.includes('Oathstone')) unit.special.add('Oathstone')
  else if (names.mount && !/on foot/i.test(names.mount) && !chariotMountEntry(names.mount) && !ownRow) mountUp(unit, names.mount)
  // magic items: a character carries its own (a Battle Standard Bearer's magic standard among
  // them); a unit's magic standard is its standard bearer's (rules/items.js)
  // Motley Crew: models of the unit with their own kit (per-model options) or of
  // another profile (Gobbler Minders among Cave Gobblers). Extra models go at the back; the first models
  // carry the special weapons.
  const counts = names.counts || []
  for (const c of counts) {
    const row = rows.find(r => r.Name === c.name)
    if (row) for (let i = 0; i < c.n; i++) unit.models.push({ name: row.Name, profile: toProfile(row), wounds: num(row.W) || 1, startW: num(row.W) || 1, role: 'rank', type: row.Name, ...(row.rules?.length ? { rules: row.rules } : {}) })
    // (a Beast Pack's Bears of Lorne cause Fear: the unit holding them does — beastPack.js)
    if (row?.rules?.includes('Fear') && c.n > 0) special.add('Fear')
  }
  let k = 0
  for (const c of counts.filter(c => !rows.some(r => r.Name === c.name) && /weapon|morning star|ironfist|cannon|pistol|spear/i.test(c.name))) {
    // 'X for Gobbler Minder': on those models; otherwise on the unit's own models, front first
    const forType = (c.name.match(/ for (.+)$/) || [])[1]
    const pool = unit.models.filter(m => m.role === 'rank' && !m.kit && (forType ? m.name === forType : !m.type))
    for (const m of pool.slice(0, c.n)) m.kit = forType ? c.name.replace(/ for .+$/, '') : c.name
    k += c.n
  }
  const shields = counts.find(c => /^shields?$/i.test(c.name))
  if (shields) unit.shieldCount = shields.n
  if (counts.length) unit.motley = true
  // a named character's own items, from its equipment (magicItems.js UNIQUE)
  const items = [...(names.items || []), ...(UNIQUE[entry.id] || [])]
  // a champion's own magic items (roster.js championMagic): its weapon, armour and talisman — combat.js champView
  unit.champItems = (names.champItems || []).length && unit.models.some(m => m.role === 'champion') ? [...names.champItems] : []
  if (category === 'characters' || troopType.includes('Character')) unit.items = items
  else {
    // (a war machine's Engineering runes are its own: Engineering runes)
    // (and a unit's Chaotic Trait is the whole unit's: Chaotic Traits)
    unit.items = items.filter(id => ITEMS[id]?.type === 'engineering-runes' || ITEMS[id]?.type === 'chaotic-trait')
    unit.banner = items.find(id => ITEMS[id]?.type === 'banner') || null
    // (a unit's standard may carry up to three Standard runes: Standard runes)
    unit.bannerRunes = items.filter(id => ITEMS[id]?.type === 'banner-runes')
  }
  // the Broken Crowns' Infamous Origins and their units' upgrades (renegade.js)
  if (armyId === 'broken-crowns' || entry.options.some(o => o.grants)) renegadeOptions(unit, entry, sel)
  // the Marks of Dominion, Cults, Forsaken and Spawn (dominion.js)
  dominionOptions(unit)
  dominionItemsAtFielding(unit)
  // Circlet of Talimar (+1 Toughness for infantry or cavalry), Banner of Resilience (its unit +1 Toughness)
  if (((unit.items || []).includes('circlet-of-talimar') && /Infantry|Cavalry/.test(troopType.join(' '))) || unit.banner === 'banner-of-resilience') for (const m of unit.models) m.profile = { ...m.profile, T: Math.min(10, (m.profile.T ?? 3) + 1) }
  hornkinOptions(unit)
  ogreOptions(unit)
  applyItemsToUnit(unit)
  // Unmade-Blooded Steed: the mount's Movement, Strength and Attacks +1 (to 10), and Impetuous
  if ((unit.items || []).includes('unmade-blooded-steed') && unit.mount) {
    const p = unit.mount.profile
    unit.mount.profile = { ...p, M: Math.min(10, (p.M ?? 0) + 1), S: Math.min(10, (p.S ?? 0) + 1), A: Math.min(10, (p.A ?? 0) + 1) }
    unit.special.add('Impetuous')
  }
  // Wizarding Hat: the wearer is a Level 1 Wizard (of the lore chosen in the list builder)
  if ((unit.items || []).includes('wizarding-hat') && ![...unit.special].some(r => /^Level \d Wizard$/.test(r) || r === 'Wizard')) unit.special.add('Level 1 Wizard')
  // Arcane Familiar: a second lore
  unit.lore2 = names.lore2 || null
  if (names.mount && chariotMountEntry(names.mount)) chariotMountUp(unit, armyId, chariotMountEntry(names.mount), side, names.mount)
  // Whirlers hidden in a Gloom Nipper Mob: released later (whirlers.js); their points are theirs
  unit.ruseBought = !!names.ruse
  // All Sneaky Like: Ambushers given by Titch (roster.js checks who may)
  if (names.ambushers) unit.special.add('Ambushers')
  if (names.whirlers) { unit.whirlersHidden = names.whirlers; unit.cost -= names.whirlers * WHIRLER_POINTS }
  return unit
}

// Split Profile Chariot Mount: a character on a chariot joins its crew. The model
// is the chariot (its troop type, base, Movement of its beasts, Impact Hits at its Strength), the
// character's Wounds added to the chariot's; enemies hit on the character's Weapon Skill and wound
// against the higher Toughness; it saves with the better armour; the character and crew and beasts
// fight with their own profiles (combat.js chariot branch; the character with its own weapon).
function chariotMountUp (u, armyId, chariotId, side, mountName) {
  // a chariot with no army-list entry of its own (the War Altar of Saint Halvar): an entry made from its mount page
  const entry = findEntry(armyId, chariotId) || findEntryAnywhere(chariotId) || mountEntry(chariotId, mountName)
  const ch = fieldUnit(armyId, newUnit(entry), side, entry)
  const rider = u.models[0]
  const chassis = ch.models[0]
  u.troopType = [ch.troopType[0], 'Character']
  // (a Broodmaw is a behemoth with a howdah: a monster, not a chariot)
  u.category = /Chariot/.test(ch.troopType[0]) ? 'chariot' : ch.category
  u.base = ch.base
  u.mount = ch.mount
  u.beasts = ch.beasts
  u.crew = [{ name: rider.name, profile: { ...rider.profile }, count: 1, character: true }, ...ch.crew]
  const W = (num(chassis.profile.W) || chassis.wounds) + (rider.wounds || 1)
  u.models = [{ name: `${rider.name} on ${ch.name.replace(/s$/, '')}`, profile: { ...chassis.profile, T: Math.max(chassis.profile.T ?? 0, rider.profile.T ?? 0), W }, wounds: W, startW: W, role: 'rank' }]
  for (const r of ch.special) u.special.add(r)
  u.formation = ch.formation
  u.equipmentText = [u.equipmentText, ch.equipmentText].filter(Boolean).join('\n')
  // the better of the character's armour and the chariot's own armour value
  if (ch.armourValue && /^\d\+$/.test(ch.armourValue)) u.mountArmour = Number(ch.armourValue[0])
  u.chariotMount = ch.name
  // (a War Wagon's crew keep their missile weapons when a character rides it: Assorted weapons)
  if (ch.entryId === 'war-wagon') u.crewEquipment = ch.equipment
}

function mountEntry (id, name) {
  // (by the id's words, the War Altar of Saint Halvar's page; the Rukka's Iron Rukka Boar Chariot in the Ashforged list by
  // the name the list gives it, its page's name. Only those two: a Tuskboar or Razorboar Chariot in the Dominion Hosts' list
  // finds no page, as before the renaming)
  const m = mountFor(id.replace(/-/g, ' ')) || (id === 'iron-rukka-boar-chariot' ? mountFor(name) : null)
  if (!m) throw new Error(`no mount ${id}`)
  return { id, name: m.name, category: 'rare', points: 0, minimum: 1, maximum: 1, armyComposition: [], command: [], equipment: [], armor: [], options: [], mounts: [], magic: null, lores: [], builderSpecialRules: [], rulesPage: m.page, profile: m.profile, troopType: m.troopType, unitCategory: [/Chariot/.test(m.troopType[0]) ? 'Chariot' : 'Monster'], base: m.base, armourValue: m.armourValue, equipmentText: m.equipmentText || '', specialRules: m.specialRules }
}

// Characters and Cavalry Mounts: a character on a cavalry mount is of the mount's
// troop type, moves with the mount's Movement, has a split profile, and some mounts improve its
// Toughness or Wounds (shown "(+1)" on the mount's profile).
export { mountFor, isCavalryMount } from './mounts.js'
function mountUp (u, name) {
  const m = mountFor(name)
  if (!isPlayableMount(m)) { u.unplayableMount = name; return }
  const monster = isRiddenMonster(m)
  const row = m.profile[0]
  u.mount = { name: row.Name, profile: toProfile(row), claws: /wicked claws/i.test(m.equipmentText || '') }
  const bonus = k => { const v = String(row[k] || ''); const b = v.match(/\(\+(\d+)\)/); return b ? Number(b[1]) : 0 }
  for (const md of u.models) {
    for (const k of ['T', 'W']) if (bonus(k) && typeof md.profile[k] === 'number') md.profile[k] += bonus(k)
    md.wounds = md.profile.W; md.startW = md.profile.W
  }
  u.troopType = [m.troopType[0], 'Character']
  u.category = monster ? 'monster' : isShieldbearers(m) ? 'infantry' : 'cavalry'
  // Characters and Formations: on a ridden monster it takes the mount's formation
  if (monster) u.formation = (m.specialRules || []).some(r => (r.name || r) === 'Open Order') ? 'open' : 'close'
  const b = m.base?.model || m.base?.min || [30, 60]
  u.base = { w: mmToIn(b[0]), d: mmToIn(b[1]) }
  // (rules the character did not have already are the mount's: e.g. its Poisoned Attacks — combat.js)
  u.mountRules = m.specialRules.map(r => r.name).filter(r => !u.special.has(r))
  for (const r of m.specialRules) u.special.add(r.name)
  if (/barding/i.test(m.equipmentText)) u.armour = [u.armour, 'Barding'].filter(Boolean).join(', ')
  // a ridden monster's hide 'counts as' armour: the model saves with the better of the two
  // (Split Profile Ridden Monster)
  const hide = (m.equipmentText || '').match(/counts as (light|heavy|full plate) armour/i)
  if (hide) u.mountArmour = { light: 6, heavy: 5, 'full plate': 4 }[hide[1].toLowerCase()]
  u.mountPage = m.page
  // (its own weapons — a Dominion Dragon's breath — are the rider's to use: damage.js equip)
  u.mountEquipment = m.equipmentText || ''
}

// The frontage a unit is deployed with until the player changes it: at least five wide (enough
// for a Rank Bonus), and never deeper than wide, so a block starts in Combat Order rather than
// as a Marching Column (Combat Order Close Order).
function defaultFiles (category, n) {
  if (n <= 1) return 1
  return Math.min(n, Math.max(5, Math.ceil(Math.sqrt(n))))
}

export const alive = u => u.models.filter(m => m.wounds > 0)
export const modelCount = u => alive(u).length
export const isDead = u => modelCount(u) === 0
// Forming the Lance: a Lance has one model in its front rank, two in the second, three in the
// third and so on (the last may be short). Its footprint here is the rectangle round it: as wide as its widest rank.
export function lanceRows (n) {
  const rows = []
  for (let k = 1, left = n; left > 0; k++) { rows.push(Math.min(k, left)); left -= k }
  return rows
}
export const ranksOf = u => u.formation === 'lance' ? lanceRows(modelCount(u)).length : Math.ceil(modelCount(u) / Math.max(1, Math.min(u.files, modelCount(u))))
export const filesOf = u => u.formation === 'lance' ? Math.max(1, ...lanceRows(modelCount(u))) : Math.max(1, Math.min(u.files, modelCount(u)))
// 1 Apart Skirmishers: Skirmishers stand loose, each within 1" of
// another — drawn and measured here as an even half-inch gap. In combat they form up base to base
// (Skirmishers in Combat), so the gap closes.
export const gapOf = u => u.formation === 'skirmish' && !u.status?.engaged && u.models.length > 1 ? 0.5 : 0
export const width = u => filesOf(u) * u.base.w + (filesOf(u) - 1) * gapOf(u)
export const depth = u => ranksOf(u) * u.base.d + (ranksOf(u) - 1) * gapOf(u)

// The four corners, front-left first, then front-right, rear-right, rear-left
// ("left" as the unit sees it, looking out of its front).
export function corners (u) {
  const f = dirOf(u.facing); const r = rightOf(u.facing)
  const hw = width(u) / 2; const d = depth(u)
  const fl = add(u.pos, mul(r, -hw)); const fr = add(u.pos, mul(r, hw))
  return [fl, fr, add(fr, mul(f, -d)), add(fl, mul(f, -d))]
}
export const centre = u => add(u.pos, mul(dirOf(u.facing), -depth(u) / 2))

// Measurement General Principles — "Measurement":
// always from the closest point of one base to the closest point of the other.
// A unit's name for a question's answers: with its place on the table when another in `among` has the same name
export const unitLabel = (u, among = []) => among.filter(x => x.name === u.name).length > 1 ? `${u.name} (at ${Math.round(u.pos?.x ?? 0)}", ${Math.round(u.pos?.y ?? 0)}")` : u.name
export const distanceBetween = (a, b) => polyDist(corners(a), corners(b))

// The model positions, for drawing and for working out who is in base contact.
// Rank 0 is the front. Command models stand in the middle of the front rank.
export function modelSlots (u) {
  const live = alive(u)
  const files = filesOf(u)
  const f = dirOf(u.facing); const r = rightOf(u.facing)
  if (u.formation === 'lance') {
    // command models at the point, the standard first (Forming the Lance, Command Group Models)
    const cmd = ['standard', 'champion', 'musician'].map(role => live.find(m => m.role === role)).filter(Boolean)
    const ordered = [...cmd, ...live.filter(m => !cmd.includes(m))]
    const slots = []
    let k = 0
    lanceRows(ordered.length).forEach((inRank, rank) => {
      const offset = (files - inRank) / 2
      for (let i = 0; i < inRank; i++) {
        const m = ordered[k++]
        const across = (offset + i) * u.base.w + u.base.w / 2 - width(u) / 2
        const back = rank * u.base.d + u.base.d / 2
        slots.push({ model: m, rank, file: offset + i, at: add(add(u.pos, mul(r, across)), mul(f, -back)), outside: i === 0 || i === inRank - 1 || rank === lanceRows(ordered.length).length - 1 })
      }
    })
    return slots
  }
  const ordered = orderForFront(live, files)
  const slots = []
  const ranks = Math.ceil(ordered.length / files)
  for (let rank = 0; rank < ranks; rank++) {
    const inRank = Math.min(files, ordered.length - rank * files)
    const offset = (files - inRank) / 2
    for (let i = 0; i < inRank; i++) {
      const m = ordered[rank * files + i]
      const g = gapOf(u)
      const across = (offset + i) * (u.base.w + g) + u.base.w / 2 - width(u) / 2
      const back = rank * (u.base.d + g) + u.base.d / 2
      slots.push({ model: m, rank, file: offset + i, at: add(add(u.pos, mul(r, across)), mul(f, -back)) })
    }
  }
  return slots
}

function orderForFront (live, files) {
  const cmd = ['champion', 'standard', 'musician']
  const command = cmd.map(role => live.find(m => m.role === role)).filter(Boolean)
  const rest = live.filter(m => !command.includes(m))
  const front = rest.slice(0, Math.max(0, files - command.length))
  const mid = Math.floor(front.length / 2)
  // standard in the very middle, champion to its right, musician to its left
  const row = [...front.slice(0, mid), ...(command.find(m => m.role === 'musician') ? [command.find(m => m.role === 'musician')] : []),
    ...(command.find(m => m.role === 'standard') ? [command.find(m => m.role === 'standard')] : []),
    ...(command.find(m => m.role === 'champion') ? [command.find(m => m.role === 'champion')] : []), ...front.slice(mid)]
  return [...row, ...rest.slice(front.length)]
}

// Which arc of `u` a point lies in: 'front', 'rear', 'left' or 'right'.
// Facing and arcs: the arcs are drawn from the unit's corners at 45 degrees
// outward, so the front arc is everything in front of the front edge between those lines.
export function arcOf (u, p) {
  // Skirmishers: every arc is their front (Facing and Line of Sight Skirmishers)
  if (u.formation === 'skirmish') return 'front'
  return sideOf(u, p)
}
// Which edge of the footprint a point faces, whatever the formation: where a charger is placed
// against a Skirmish unit (Formed Units Charging Skirmishers — the
// charger moves as directly as it can into contact, so it meets the side nearest it).
export function sideOf (u, p) {
  const f = dirOf(u.facing); const r = rightOf(u.facing)
  const c = corners(u)
  const fl = c[0]; const fr = c[1]; const rr = c[2]; const rl = c[3]
  const along = q => dot(sub(p, q), f)
  const across = q => dot(sub(p, q), r)
  // front: ahead of the front edge and inside the 45-degree lines from the front corners
  if (along(fl) >= 0 && across(fl) >= -along(fl) && across(fr) <= along(fr)) return 'front'
  // rear: behind the rear edge and inside the 45-degree lines from the rear corners
  if (along(rl) <= 0 && across(rl) >= along(rl) && across(rr) <= -along(rr)) return 'rear'
  return across(centre(u)) > 0 ? 'right' : 'left'
}

// Which arc of `target` most of `attacker` is in: its centre decides. (Charges decide this
// from where the charger starts: the charge arc.)
export const arcOfUnit = (target, attacker) => arcOf(target, centre(attacker))

export function unitSummary (u) {
  return `${u.name} (${modelCount(u)} models, ${filesOf(u)} wide × ${ranksOf(u)} deep)`
}

export const centreDistance = (a, b) => dist(centre(a), centre(b))

// A special rule by name, ignoring what is in brackets: hasRule(u, 'Armour Bane') matches
// 'Armour Bane (1)'. ruleValue(u, 'Regeneration') gives what is in the brackets, '5+'.
// The unit's special rules: its own, and those its magic standard (or a joined Battle Standard
// Bearer's) gives while it is carried (items.js). A unit that has lost its Frenzy keeps it lost.
export const rulesOf = u => {
  const out = [...u.special]
  // the Knightly Orders and the Witch Hunter's specialisms (orders.js)
  for (const r of grantedRules(u, u.joined || [])) if (!out.includes(r)) out.push(r)
  // Lyonne: the Vows, the Aura of the Mere, the Chalice Reliquary (lyonne.js)
  for (const r of [...lyonneseRules(u, u.joined || []), ...reliquaeRules(currentGame(), u)]) if (!out.includes(r)) out.push(r)
  // the Dwarfs: Ancestral Reckoning, Forgefire, King of the Slayer Hold (dwarfs.js)
  for (const r of dwarfJoinedRules(u, u.joined || [])) if (!out.includes(r)) out.push(r)
  if (u.status?.spiritRebels && !out.includes('Random Movement')) out.push('Random Movement') // (Spirit of Vaelgrath)
  if (u.status?.wilful && !out.includes('Frenzy')) out.push('Frenzy') // (Wilful Beast)
  // Necromantic Undead: Fear, Immune to Psychology, Unbreakable, Unstable (vampires.js)
  // (Kheshite Undead: the same)
  // Unmade: its universal rules; Unmade of a god: Hatred of the rival god's Unmade (unmade.js)
  if (u.special?.has('Unmade')) for (const r of UNMADE_RULES) if (!out.includes(r)) out.push(r)
  if (godOf(u) && !out.includes(`Hatred (${RIVAL[godOf(u)]})`)) out.push(`Hatred (${RIVAL[godOf(u)]})`)
  if (u.special?.has('Necromantic Undead') || u.special?.has('Kheshite Undead')) for (const r of ['Fear', 'Immune to Psychology', 'Unbreakable', 'Unstable']) if (!out.includes(r)) out.push(r)
  // (Banner of Arcane Protection: friendly units within 6" of it Magic Resistance (-1))
  if (!out.some(r => r.startsWith('Magic Resistance')) && u.placed && currentGame()?.units.some(c => c !== u && c.side === u.side && c.placed && !c.status.removed && bannersOf(c).includes('banner-of-arcane-protection') && distanceBetween(c, u) <= 6)) out.push('Magic Resistance (-1)')
  // the Hornkin: Slaughterer's Call, Drunken (hornkin.js)
  if ((slaughterersCall(u.joined || []) || u.status?.drunk === 'belligerent') && !out.includes('Frenzy')) out.push('Frenzy')
  if (u.status?.drunk === 'unsteady' && !out.includes('Random Movement')) out.push('Random Movement')
  if (crownedHost(u.joined || []) && !out.includes('Stubborn')) out.push('Stubborn')
  // (Running with the Pack: Sabretusks with a Hunter lose Impetuous; the Hunter has Swiftstride)
  if (packHunter(u, u.joined || [])) { const i = out.indexOf('Impetuous'); if (i >= 0) out.splice(i, 1) }
  if (u.special?.has('Running with the Pack') && /^fangcat/.test(u.joinedHost?.entryId || '') && u.status?.joinedTo && !out.includes('Swiftstride')) out.push('Swiftstride')
  // (Hornstones, "A Tingle in the Air": the unit controlling a Hornstone has Magic Resistance (-1))
  if (u.placed && !out.some(r => r.startsWith('Magic Resistance')) && tingle(currentGame(), u, dtp)) out.push('Magic Resistance (-1)')
  // the Forsaken's Rampant Mutation this Combat phase (dominion.js)
  for (const r of mutationRules(currentGame(), u)) if (!out.includes(r)) out.push(r)
  // Tilean Stoicism: Stubborn while its character has made no Break test (renegade.js)
  if (u.joined?.length && stoicHost(u.joined) && !out.includes('Stubborn')) out.push('Stubborn')
  if (u.bannerRules?.length || u.joined?.some(c => c.bannerRules?.length)) {
    for (const id of bannersOf(u)) for (const r of EFFECTS[id]?.bannerRules || []) out.push(r)
  }
  // Icon of the Pale Keeper: Fear, or Terror if it already causes Fear
  if ((u.banner === 'icon-of-the-pale-keeper' || u.items?.includes('icon-of-the-pale-keeper') || u.joined?.some(c => c.items?.includes('icon-of-the-pale-keeper'))) && bannersOf(u).includes('icon-of-the-pale-keeper')) out.push(out.includes('Fear') ? 'Terror' : 'Fear')
  // The Boss's Trophy Rack: in a turn it charged, Titch (and any Nipper Wolf Rider Mob he is with) causes Fear
  if (u.status?.charged && !out.includes('Fear') && (u.items?.includes('the-bosss-trophy-rack') || (u.entryId === 'nipper-wolf-rider-mob' && (u.joined || []).some(c => !c.status?.removed && c.items?.includes('the-bosss-trophy-rack'))))) out.push('Fear')
  // Banner of the Wildwood: Fear, or Terror if it already causes Fear
  // (The Shroud of Ameyo: the same)
  if (bannersOf(u).includes('banner-of-the-wildwood') || bannersOf(u).includes('the-shroud-of-ameyo')) out.push(out.includes('Fear') ? 'Terror' : 'Fear')
  // A Haunting of Dreads, A Glimmer of Wisps: the Spite's model and any unit it has
  // joined gain Terror (Magical Attacks)
  for (const c of (u.joined || []).filter(c => !c.status?.removed)) {
    if (c.items?.includes('a-haunting-of-dreads') && !out.includes('Terror')) out.push('Terror')
    if (c.items?.includes('a-glimmer-of-wisps') && !out.includes('Magical Attacks')) out.push('Magical Attacks')
    // (Pearl of Infinite Bleakness: and any unit it has joined, Immune to Psychology)
    if (c.items?.includes('pearl-of-infinite-bleakness') && !out.includes('Immune to Psychology')) out.push('Immune to Psychology')
    // (Amulet of the Serpent: and any unit it has joined, Poisoned Attacks)
    if (c.items?.includes('amulet-of-the-serpent') && !out.includes('Poisoned Attacks')) out.push('Poisoned Attacks')
  }
  // Master of Battle: a Knights unit joined by this character is Immune to Psychology
  if ((u.joined || []).some(c => !c.status?.removed && (c.special.has('Master of Battle'))) && /^(realm-knights|inner-circle-knights|clawsteed-knights|leopard-knights|inner-circle-leopard-knights|clawsteed-leopard-knights)/.test(u.entryId || '') && !out.includes('Immune to Psychology')) out.push('Immune to Psychology')
  // Fanatical Zeal: a Lector or Priest of Saint Halvar with Flagellants is Unbreakable
  if (u.status?.joinedTo && /^(lector|priest)-of-saint-halvar$/.test(u.entryId || '') && u.joinedHost?.special.has('Fanatical Zeal') && !out.includes('Unbreakable')) out.push('Unbreakable')
  // Regimental Psychology: within 3" of its regimental unit, a detachment
  // has the regiment's Frenzy, Hatred (X), Immune to Psychology and Stubborn
  const reg = u.regiment
  if (reg && reg.placed && !reg.status.removed && !isDead(reg) && u.placed && distanceBetween(u, reg) <= 3) {
    for (const r of rulesOf(reg)) if (/^(Frenzy|Hatred|Immune to Psychology|Stubborn)/.test(r) && !out.includes(r)) out.push(r)
  }
  return u.status?.frenzyLost ? out.filter(r => !r.startsWith('Frenzy')) : out
}
export const hasRule = (u, name) => rulesOf(u).some(s => s === name || s.startsWith(name + ' ('))
export function ruleValue (u, name) {
  const s = rulesOf(u).find(s => s.startsWith(name + ' ('))
  return s ? s.slice(name.length + 2, -1) : null
}

// The formations a unit may choose (Formation Types: models with more than
// one formation rule choose at deployment, and may change by reforming). War machines and
// characters are not offered a choice.
export function formationsOf (u) {
  if (/war machine|chariot|monster/i.test((u.troopType || []).join(' ') + u.category) || (u.troopType || []).includes('Character')) return [u.formation]
  const out = []
  if (u.special.has('Close Order')) out.push('close')
  if (u.special.has('Open Order')) out.push('open')
  if (u.special.has('Skirmishers')) out.push('skirmish')
  // Lance Formation
  if (u.special.has('Lance Formation')) out.push('lance')
  return out.length ? out : [u.formation]
}
export const FORMATION_NAMES = { close: 'Close Order', open: 'Open Order', skirmish: 'Skirmish', lance: 'Lance' }
