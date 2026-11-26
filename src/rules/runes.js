// The Deephold Clans' runes: what each rune does (RUNE_EFFECTS), which runes a model carries, the runic weapon
// they make, and the list checks (runeProblems). Used by roster.js, damage.js and items.js.
// A rune is bought like an item (magicItems.js `rune: true`); the runes of one category on a model make one runic
// item: its weapon, armour, talisman, standard, war machine or tattoos. A runic weapon has Magical Attacks; here it
// is the model's own weapon (its great weapon if it has one, else its hand weapon) with the runes' changes on it.

import { ITEMS } from '../data/magicItems.js'

// What each rune does, in the terms of items.js EFFECTS (merged into it there), plus `rw` — changes to the runic
// weapon — and `rr` — changes to a runic crossbow or handgun.
export const RUNE_EFFECTS = {
  // ---- weapon runes ----
  'master-rune-of-smiting': { rw: { rules: ['Multiple Damage (D6)'] } },
  'master-rune-of-skeld-blackanvil': { rw: { woundOn: 2 } },
  'master-rune-of-odric-the-mad': { rw: { noArmour: true } },
  'master-rune-of-dragon-slaying': { rw: { woundOnBehemoth: 2 } },
  'master-rune-of-flight': { rw: {}, handOnly: true, flags: { runeFlight: true } },
  'master-rune-of-swiftness': { rw: {}, rules: ['Strike First'] },
  'master-rune-of-breaking': { rw: { flags: { breaksMagicWeapons: true } } },
  'rune-of-parrying': { rw: {}, flags: { hitPenalty: 1 } },
  'rune-of-banishment': { rw: { noWardWarp: true } },
  'rune-of-fury': { rw: {}, stats: { A: 1 } },
  'rune-of-reckoning': { rw: { grudge: 1 } },
  'rune-of-might': { rw: {}, stats: { S: 1 } },
  'rune-of-cleaving': { rw: { ap: 1 }, handOnly: true },
  'rune-of-striking': { rw: {}, stats: { WS: 1 } },
  'rune-of-fire': { rw: {}, rules: ['Flaming Attacks'] },
  'rune-of-speed': { rw: {}, handOnly: true, stats: { I: 1 } },
  // ---- Engineers' weapon runes: a crossbow or handgun (Engineers Weapon Runes) ----
  'master-rune-of-slaying': { rr: { rules: ['Multiple Damage (D3)'], woundOnBehemoth: 3 } },
  'master-rune-of-piercing': { rr: { S: 1, rules: ['Through & Through'] } },
  'master-rune-of-bursting-flame': { rr: { burst: true } },
  'rune-of-concussive-force': { rr: { concussive: true } },
  'rune-of-accuracy': { rr: { accuracy: true } },
  'rune-of-rapid-fire': { rr: { rules: ['Multiple Shots (2)', 'Quick Shot'] } },
  'rune-of-molten-steel': { rr: { rules: ['Flaming Attacks'] } },
  'enchanted-rune': { rr: { rules: ['Magical Attacks'] } },
  // ---- armour runes ----
  'master-rune-of-adamant': { stats: { T: 10 }, setStats: true, alone: true },
  'master-rune-of-deepsteel': { armour: { fixed: 2 } },
  'rune-of-iron': { stats: { W: 1 } },
  'rune-of-fortitude': { stats: { T: 1 } },
  'rune-of-preservation': { flags: { mwImmune: true, kbImmune: true } },
  'rune-of-shielding': { flags: { runeShielding: 1 } },
  'rune-of-stone': { flags: { armourRerollOnce: true } },
  // ---- talismanic runes ----
  'master-rune-of-calm': { bound: { spell: 'master-rune-of-calm', power: 2 } },
  'master-rune-of-balance': { only: { names: /^(Runesmith|Runelord|Anvil of Ruin)$/ }, flags: { runeBalance: true } },
  'master-rune-of-spite': { flags: { runeSpite: true } },
  'rune-of-spellbreaking': { only: { names: /^(Runesmith|Runelord|Anvil of Ruin)$/ }, flags: { spellbreaking: true } },
  'rune-of-warding': { flags: { runeWarding: true } },
  // (used here for a failed Armour Roll; the rune also allows a To Hit or To Wound roll — our guess at the use)
  'rune-of-luck': { flags: { armourRerollOnce: true } },
  'rune-of-the-furnace': { ward: { value: 7, flaming: 3 } },
  'rune-of-passage': { rules: ['Move Through Cover'], flags: { passage: true } },
  // ---- standard runes: on the unit's standard ----
  'master-rune-of-hamrik': { bannerOnlyBSB: true, flags: { hamrik: true } },
  'master-rune-of-storri-redmane': { flags: { stromni: true } },
  'master-rune-of-hesitation': { flags: { hesitation: true } },
  'rune-of-confusion': { flags: { confusion: true } },
  'rune-of-fear': { bannerRules: ['Fear'] },
  'rune-of-battle': { flags: { meleeOutcome: 1 } },
  'vorlags-rune': { bannerRules: ['Vanguard'] },
  'rune-of-courage': { flags: { courage: true } },
  // ---- engineering runes: on a war machine ----
  'master-rune-of-immolation': { only: { names: /^Cannon$/ }, flags: { immolation: true } },
  'master-rune-of-disguise': { flags: { disguise: true } },
  'rune-of-skewering': { only: { names: /^Bolt Thrower$/ }, flags: { skewering: true } },
  'rune-of-forging': { flags: { forging: true } },
  'rune-of-burning': { rules: ['Flaming Attacks'] },
  'rune-of-reloading': { flags: { reloading: true } },
  'stalwart-rune': { flags: { meleeOutcome: 1 } },
  // ---- runic tattoos (Slayers) ----
  'rune-of-the-dishonoured': { flags: { dishonoured: true } },
  'rune-of-endless-battle': { flags: { endlessBattle: true } },
  'rune-of-the-reckless': { rules: ['Frenzy'], flags: { reckless: true } },
  'rune-of-the-hateful': { rules: ['Hatred (all enemies)'] },
  'rune-of-grit': { stats: { T: 1 } },
  'rune-of-the-dauntless': { flags: { dauntless: true } },
  'rune-of-wrath': { stats: { A: 1 } },
  'warriors-rune': { stats: { WS: 1 } },
  'rune-of-blazing-fury': { rules: ['Flaming Attacks'] },
  // ---- the Dwarf named characters' own runic items ----
  // Grudge Settler: its profile, carrying two runes (Master Rune of Smiting; Rune of Parrying)
  'score-settler': { weapon: true, extraRules: ['Multiple Damage (D6)'], flags: { hitPenalty: 1 } },
  // The Armour of Hrafnir: heavy armour (its 4+ Ward against Killing Blow and Multiple Damage is not in yet)
  'the-armour-of-hrafnir': { armour: { base: 5 } },
  'the-axe-of-durri': { weapon: true }, // The Axe of Durri
  // The Slayer Crown: the armour value improved by 2, and a 5+ Ward
  'the-slayer-crown': { armour: { bonus: 2 }, ward: { value: 5 } },
  // Dragonblade: two runes, Fury and Grudge
  dragonblade: { weapon: true, stats: { A: 1 }, flags: { grudge: 1 } }
}

export const isRune = id => !!ITEMS[id]?.rune
export const runesOf = (u, type) => (u.items || []).filter(id => ITEMS[id]?.rune && (!type || ITEMS[id].type === type))
const RUNE_NAMES = { 'weapon-runes': 'Weapon', 'ranged-weapon-runes': "Engineers' weapon", 'armor-runes': 'Armour', 'talismanic-runes': 'Talismanic', 'banner-runes': 'Standard', 'engineering-runes': 'Engineering', 'runic-tattoos': 'tattoo' }
export const runeKind = type => RUNE_NAMES[type] || type

// The runic weapon: the model's great weapon (or hand weapon) with its Weapon runes (damage.js equip)
export function runeWeapon (u, base) {
  const ids = runesOf(u, 'weapon-runes')
  if (!ids.length) return null
  const ch = ids.map(id => RUNE_EFFECTS[id]?.rw || {})
  const rules = [...new Set([...(base.rules || []), 'Magical Attacks', ...ch.flatMap(c => c.rules || [])])]
  const ap = ch.reduce((a, c) => a + (c.ap || 0), 0)
  const apNow = String(base.AP || '-') === '-' ? 0 : Number(String(base.AP).match(/-?\d+/)?.[0] || 0)
  const flags = Object.assign({}, ...ch.map(c => c.flags || {}))
  const woundOn = Math.min(...ch.map(c => c.woundOn || 7))
  if (woundOn < 7) flags.woundOn = woundOn
  const beh = Math.min(...ch.map(c => c.woundOnBehemoth || 7))
  if (beh < 7) flags.woundOnBehemoth = beh
  if (ch.some(c => c.noArmour)) flags.noArmour = true
  if (ch.some(c => c.noWardWarp)) flags.noWardWarp = true
  const grudge = ch.reduce((a, c) => a + (c.grudge || 0), 0)
  if (grudge) flags.grudge = grudge
  const names = ids.map(id => ITEMS[id].name)
  return { ...base, key: 'rune:' + base.key, name: `${base.name} (${[...new Set(names)].map(n => `${n}${names.filter(x => x === n).length > 1 ? ' x' + names.filter(x => x === n).length : ''}`).join(', ')})`, AP: String(apNow - ap || '-'), rules, magic: true, rune: true, flags }
}

// The runic crossbow or handgun: its Engineers' weapon runes (damage.js equip)
export function runeRanged (u, w) {
  const ids = runesOf(u, 'ranged-weapon-runes')
  if (!ids.length || !/crossbow|handgun/.test(w.key)) return w
  const ch = ids.map(id => RUNE_EFFECTS[id]?.rr || {})
  const s = String(w.S)
  const S = ch.reduce((a, c) => a + (c.S || 0), 0)
  const flags = Object.assign({}, ...ch.map(c => ({ ...(c.burst ? { burst: true } : {}), ...(c.concussive ? { concussive: true } : {}), ...(c.accuracy ? { accuracy: true } : {}) })))
  const beh = Math.min(...ch.map(c => c.woundOnBehemoth || 7))
  if (beh < 7) flags.woundOnBehemoth = beh
  return { ...w, key: w.key, name: `${w.name} (${ids.map(id => ITEMS[id].name).join(', ')})`, S: /^\d+$/.test(s) ? String(Number(s) + S) : s, rules: [...new Set([...(w.rules || []), ...ch.flatMap(c => c.rules || [])])], magic: true, rune: true, flags }
}

// The Rules of the Runes, for a list (roster.js itemProblems). Returns problems.
export function runeProblems (list, findEntry) {
  const out = []
  const seen = {}
  const items = {}
  for (const u of list.units) {
    const e = findEntry(list.army, u.entryId)
    const all = [...(u.items || []), ...(u.champItems || [])].filter(id => ITEMS[id]?.rune)
    // (the unit's runes — its standard's, or a character's own — and its champion's are two models' items)
    const pools = [(u.items || []).filter(id => ITEMS[id]?.rune), (u.champItems || []).filter(id => ITEMS[id]?.rune)]
    const byType = {}
    for (const id of pools[0]) (byType[ITEMS[id].type] = byType[ITEMS[id].type] || []).push(id)
    for (const [type, ids] of [...Object.entries(byType), ...Object.entries(pools[1].reduce((a, id) => { (a[ITEMS[id].type] = a[ITEMS[id].type] || []).push(id); return a }, {})).map(([t, i]) => [t, i, true])]) {
      // 1. the Rule of Three
      if (ids.length > 3 && type !== 'runic-tattoos') out.push(`${e.name}: no more than three ${runeKind(type)} runes (${ids.length})`)
      // 4. the Rule of Jealousy: one Master rune an item
      const masters = ids.filter(id => ITEMS[id].master)
      if (masters.length > 1) out.push(`${e.name}: only one Master rune on an item (${masters.map(id => ITEMS[id].name).join(', ')})`)
      // 5. the Rule of Duplication
      for (const id of new Set(ids)) if (ids.filter(x => x === id).length > 1 && !ITEMS[id].duplicable) out.push(`${e.name}: ${ITEMS[id].name} may not be taken twice on one item`)
      // Master Rune of Adamant: not with any other Armour runes
      if (ids.includes('master-rune-of-adamant') && ids.length > 1) out.push(`${e.name}: the Master Rune of Adamant cannot be combined with other Armour runes`)
      // 3. the Rule of Pride: no two identical runic items in the army
      // (runic tattoos are marked on the model: not items the Rule of Pride speaks of — a reading)
      const sig = type + ':' + [...ids].sort().join('+')
      if (type !== 'runic-tattoos' && items[sig]) out.push(`${e.name}: the same runic item as ${items[sig]} (the Rule of Pride)`)
      items[sig] = e.name
    }
    // the Rule of Jealousy: each Master rune once in the army
    for (const id of all.filter(id => ITEMS[id].master)) { if (seen[id]) out.push(`${ITEMS[id].name}: only once in the army`); seen[id] = true }
    // 2. the Rule of Form: 'hand weapon only' runes
    const eq = [(e.equipment[u.equipment]?.name || ''), ...(u.options || []).map(i => e.options[i]?.name || '')].join(', ').toLowerCase()
    for (const id of (byType['weapon-runes'] || []).filter(id => RUNE_EFFECTS[id]?.handOnly)) if (/great weapon|great hammer|additional hand weapon/.test(eq)) out.push(`${e.name}: ${ITEMS[id].name} is for a hand weapon only`)
    // Engineers' weapon runes: on a crossbow or handgun
    if ((byType['ranged-weapon-runes'] || []).length && !/crossbow|handgun/.test(eq + ' ' + (u.options || []).map(i => e.options[i]?.name || '').join(' ').toLowerCase())) out.push(`${e.name}: Engineers' weapon runes need a crossbow or handgun`)
  }
  return out
}
