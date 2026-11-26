// Dominion Hosts: Marks, Dominion Armour, Ensorcelled Weapons, the Gaze of the Gods, Cults, monsters, items.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, checkList, findEntry, itemChoices } from './roster.js'
import { equip, saveFor, meleeWeaponOf, applyWounds } from './damage.js'
import { gaze, canGaze, undividedReroll } from './dominion.js'
import { addEffect } from './spells.js'
import { weaponChoices } from './specialShots.js'
import { machineWeapon } from './warMachines.js'
import { swapChoices, generateSpells } from './magic.js'

const C = 'dominion-hosts'
const field = (id, n, opts = {}, side = 0) => { const u = fieldUnit(C, unitByNames(C, id, n, opts), side); equip(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }

test('Dominion Warriors: Dominion Armour (6+) Ward, Ensorcelled hand weapons, Mark of the Unbound re-rolls panic', () => {
  const w = field('dominion-warriors', 10)
  assert.equal(saveFor(w, {}).ward, 6)
  const hw = meleeWeaponOf(w)
  assert.equal(hw.ap, -1); assert.ok(hw.rules.includes('Magical Attacks'))
  assert.ok(undividedReroll(w, 'panic'))
})

test('a Mark of a god replaces Undivided and gives its rules', () => {
  const k = field('dominion-warriors', 10, { optionSub: undefined, options: ['Mark of the Dominion'] })
  const e = findEntry(C, 'dominion-warriors')
  const sel = unitByNames(C, 'dominion-warriors', 10)
  const mi = e.options.findIndex(o => o.name === 'Mark of the Dominion')
  sel.options = [mi]; sel.optionSub = { [mi]: e.options[mi].options.findIndex(o => o.name === 'Mark of Wrath') }
  const u = fieldUnit(C, sel, 0)
  assert.ok(hasRule(u, 'Mark of Wrath') && hasRule(u, 'Frenzy') && !hasRule(u, 'Mark of the Unbound'))
  void k
})

test('the Gaze of the Gods: once a Command sub-phase, a D6 on the table', () => {
  const g = empty(1)
  const lord = field('dominion-lord', 1)
  Object.assign(lord, { placed: true, pos: { x: 30, y: 30 } }); g.units.push(lord)
  g.sub = 'command'; g.active = 0; g.round = 2
  assert.ok(canGaze(g, lord))
  gaze(g, lord, addEffect)
  assert.ok(!canGaze(g, lord))
  assert.match(g.log.map(l => l.text).join('\n'), /Gaze of the Gods: D6 = \d/)
})

test('the Soulfire Cannon: its handlers take wounds on a 5+; Hexfire is a 3" Bombardment', () => {
  const g = empty(2)
  const h = field('soulfire-cannon', 1)
  assert.equal(h.handlers[0].count, 3)
  assert.equal(machineWeapon(h).kind, 'bombard')
  const before = h.models[0].wounds
  applyWounds(g, h, 6, 'test')
  assert.equal(before - h.models[0].wounds + (3 - h.handlers[0].count), 6)
})

test('Vaelgrath: two breaths and the Breath of Change; a Dominion Dragon mount breathes too', () => {
  const gal = field('vaelgrath', 1)
  const ids = weaponChoices(gal).map(w => w.id)
  assert.ok(ids.includes('breath:0') && ids.includes('breath:1') && ids.includes('breath:change'), ids.join(' '))
  const lord = field('dominion-lord', 1, { mount: 'Dominion Dragon' })
  assert.ok(lord.kit.breaths.length === 2)
})

test('items: Gifts within their allowance, Chaotic Traits for units, the Lore of the Dominion swap', () => {
  const e = findEntry(C, 'dominion-lord')
  const sel = unitByNames(C, 'dominion-lord', 1, { command: ['General'] })
  assert.ok(itemChoices(C, e, sel).some(c => c.id === 'extra-arm' && !c.why))
  const ew = findEntry(C, 'dominion-warriors')
  assert.ok(itemChoices(C, ew, unitByNames(C, 'dominion-warriors', 10)).some(c => c.id === 'brazen-will'))
  const l = { name: 't', army: C, points: 2000, units: [unitByNames(C, 'dominion-lord', 1, { command: ['General'], items: ['extra-arm', 'dark-majesty'] })] }
  assert.ok(checkList(l).problems.some(p => /Gifts of Dominion, over/.test(p)))
  const g = empty(3)
  const s = field('exalted-sorcerer', 1, { lore: 'dark-magic', options: ['Wizard'] })
  generateSpells(g, s)
  assert.ok(swapChoices(s).some(x => x.slug === 'winds-of-the-dominion'))
})
