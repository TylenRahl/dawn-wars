// Display names: the rename tables are consistent, and no old word is left in anything the game shows from its
// data (unit, rule, item, spell and weapon names, and the rule and spell texts). Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EXACT, ARMY_TITLES, forDisplay } from './displayNames.js'
import { TABLES } from './names/index.js'
import { ARMIES } from '../data/armies.js'
import { SPELLS } from '../data/spells.js'
import { ITEMS } from '../data/magicItems.js'
import { WEAPONS } from '../data/weapons.js'
import { ARMY_NAMES, PLAYABLE } from './roster.js'

// (the copy's data and code carry the new names already, so most rows now map a new name to itself: allowed until the
// tables are pruned to the rows still needed)
test('every value is a non-empty string', () => {
  for (const t of TABLES) for (const [k, v] of Object.entries(t.names)) {
    assert.equal(typeof v, 'string', `${t.army}: ${k}`)
    assert.ok(v.trim(), `${t.army}: ${k} is empty`)
  }
})

test('every army has its new title', () => {
  for (const id of PLAYABLE) assert.ok(ARMY_TITLES[id], `${id} has no title`)
  for (const id of PLAYABLE) assert.ok(!/Dawn Wars/.test(forDisplay(ARMY_NAMES[id])), id)
})

test('a new name is never renamed again (forDisplay of a new name is itself)', () => {
  const bad = []
  for (const v of new Set(EXACT.values())) if (forDisplay(v) !== v) bad.push(`${v} -> ${forDisplay(v)}`)
  assert.deepEqual(bad.slice(0, 20), [])
})

test('the game title and the core words', () => {
  assert.equal(forDisplay('Dawn Wars, Broken Past'), 'Dawn Wars, Broken Past')
  assert.equal(forDisplay('Take a Leadership test'), 'Take a Resolve test')
  assert.equal(forDisplay('WS'), 'CM')
  assert.equal(forDisplay('WS4 BS3 S3 T3'), 'CM4 Mk3 Mi3 Re3')
  assert.equal(forDisplay('Shoot at A unit'), 'Fire at A unit')
  // (combat and shoot inside sentences take the phases' words)
  assert.equal(forDisplay('A unit that marched or is in combat cannot shoot.'), 'A unit that marched or is in melee cannot fire.')
  assert.equal(forDisplay('Cannot shoot: it has already shot'), 'Cannot fire: it has already fired')
  assert.equal(forDisplay('Close combat: every combat must be fought'), 'Melee: every melee must be fought')
  assert.equal(forDisplay('Stand & Shoot'), 'Stand & Fire')
  assert.equal(forDisplay('Combat Mastery'), 'Combat Mastery')
  assert.equal(forDisplay('Weapon Skill'), 'Combat Mastery')
  assert.equal(forDisplay('a shot from the cannon'), 'a shot from the cannon')
  assert.equal(forDisplay('No combats left to fight'), 'No clashes left to fight')
  assert.equal(forDisplay('it can be shot like a bolt thrower'), 'it can be fired like a bolt thrower')
  assert.equal(forDisplay('an Armour Roll'), 'an Armour Roll')
  assert.equal(forDisplay('Talvar Muster (blue) — SHOOTING PHASE.'), 'Talvar Muster (blue) — FIRE PHASE.')
  assert.equal(forDisplay('Kingsblades loses 1 Wound (shooting)'), 'Kingsblades loses 1 Hit Point (firing)')
})

// THE OLD WORDS that must never reach the screen: every table row whose name is not yet its own (an old word that forDisplay
// still swaps). They are read from the tables, not written out here, so this file names none of them. (Plain folklore
// words, Troll, Giant, Griffon, Minotaur, Dwarf, Elf, Ogre, Vampire, stay: rules/names/README.md.)
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const OLD_WORDS = [...EXACT].filter(([k, v]) => k !== v).map(([k]) => k).sort((a, b) => b.length - a.length)
export const OLD = OLD_WORDS.length ? new RegExp(`(?<![A-Za-z0-9])(?:${OLD_WORDS.map(escapeRe).join('|')})(?![A-Za-z0-9])`) : /(?!)/

const shown = () => {
  const out = []
  for (const id of PLAYABLE) out.push(['army', ARMY_NAMES[id]])
  for (const [id, army] of Object.entries(ARMIES)) for (const u of army.units) {
    out.push([id, u.name])
    for (const p of u.profile ?? []) out.push([id, p.Name])
    for (const r of u.specialRules ?? []) out.push([id, typeof r === 'string' ? r : r.name])
  }
  for (const s of Object.values(SPELLS)) out.push(['spell', s.name], ['lore', s.loreName], ['spell text', s.text])
  for (const i of Object.values(ITEMS)) out.push(['item', i.name], ['item text', i.text])
  for (const w of Object.values(WEAPONS)) out.push(['weapon', w.name])
  return out.filter(([, t]) => typeof t === 'string' && t)
}

test('no old word is left in any name or text the game shows from its data', () => {
  const left = []
  for (const [where, text] of shown()) {
    // (the data itself is renamed: an old word in it is a miss, whatever forDisplay would make of it)
    const m = text.match(OLD)
    if (m) left.push(`${where}: "${m[0]}" in "${text.slice(0, 120)}"`)
  }
  assert.deepEqual(left.slice(0, 40), [], `${left.length} left`)
})
