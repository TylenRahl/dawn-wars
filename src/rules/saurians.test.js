// Saurians: Cold Blooded, Obsidian Blades, Impervious Defence, Aquatic, Drop Rocks, Primeval Roar, the Lore of the
// Makers, items, Disciplines and the list.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, findEntry, itemChoices, checkList } from './roster.js'
import { equip, saveFor, meleeWeaponOf, rangedWeaponsOf } from './damage.js'
import { leadershipTest } from './leadership.js'
import { swapChoices } from './magic.js'
import { effects as spellEffects } from './spells.js'
import { obsidian, impervious, coldBlooded } from './saurians.js'
import { SPELLS } from '../data/spells.js'

const L = 'saurians'
const field = (id, n, opts = {}, side = 1) => { const u = fieldUnit(L, unitByNames(L, id, n, opts), side); equip(u); return u }
const lzGame = seed => createGame({ lists: [DEFAULT_LISTS[0], MORE_LISTS.find(l => l.army === L)], seed, terrain: false })

test('the default list is legal; one Starseer; Saurian Warriors required', () => {
  assert.deepEqual(checkList(MORE_LISTS.find(l => l.army === L)).problems, [])
  const none = { army: L, points: 1500, units: [unitByNames(L, 'saurian-oldblood', 1, { command: ['General'] }), unitByNames(L, 'shrine-guard', 10)] }
  assert.ok(checkList(none).problems.some(p => /Saurian Warriors/.test(p)))
})

test('Cold Blooded: Fear, Panic and Terror tests on three dice, the highest discarded', () => {
  const g = lzGame(1)
  const sw = g.units.find(u => u.entryId === 'saurian-warrior')
  assert.ok(coldBlooded(sw))
  const t = leadershipTest(g, sw, { kind: 'panic', label: 'Panic' })
  assert.match(t.text, /Cold Blooded/)
})

test('Obsidian Blades, Impervious Defence; javelins, blowpipes, a Hornback\'s giant bow; the Starseer\'s Arcane Shield', () => {
  const ol = field('saurian-oldblood', 1)
  assert.ok(obsidian(ol, meleeWeaponOf(ol)))
  assert.ok(impervious(field('shieldback', 1)))
  assert.equal(rangedWeaponsOf(field('scaleling-skirmishers', 10))[0].key, 'javelin')
  assert.ok(rangedWeaponsOf(field('hornback', 1)).some(w => w.key === 'giant bow'))
  assert.equal(saveFor(field('starseer-mage-priest', 1), {}).ward, 5)
})

test('the Lore of the Makers swap; Apotheosis heals and gives Fear', async () => {
  const g = lzGame(2)
  const p = g.units.find(u => u.entryId === 'scaleling-priest')
  p.special.add('Lore of the Makers')
  assert.ok(swapChoices(p).some(s => s.slug === 'monsoon'))
  const chief = g.units.find(u => u.entryId === 'scaleling-chief')
  chief.models[0].wounds = 1
  await spellEffects.resolve(g, p, SPELLS.apotheosis, chief, { result: 12 })
  assert.ok(chief.models[0].wounds > 1 && hasRule(chief, 'Fear'))
})

test('items and a Discipline of the Makers', () => {
  const ch = itemChoices(L, findEntry(L, 'starseer-mage-priest'), unitByNames(L, 'starseer-mage-priest', 1))
  assert.ok(ch.some(c => c.id === 'harrowing-scrutiny' && !c.why))
  assert.ok(hasRule(field('starseer-mage-priest', 1, { items: ['harrowing-scrutiny'] }), 'Terror'))
  assert.equal(saveFor(field('saurian-oldblood', 1, { items: ['glyph-necklace'] }), {}).ward, 5)
})
