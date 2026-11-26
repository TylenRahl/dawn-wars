// Hornkin Herds: Primal Fury, Hornstone, Drunken, Lore of Beasts, items.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, checkList, findEntry, itemChoices } from './roster.js'
import { equip, saveFor, meleeWeaponOf } from './damage.js'
import { primalFury, inPrimalFury, hornstoneController, dtp, drunken } from './hornkin.js'
import { swapChoices, generateSpells } from './magic.js'

const B = 'hornkin-herds'
const field = (id, n, opts = {}, side = 0) => { const u = fieldUnit(B, unitByNames(B, id, n, opts), side); equip(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }

test('Primal Fury: a Leadership test when its combat is chosen; Foe Render AP -2 while it lasts', () => {
  const g = empty(1)
  g.phase = 'combat'; g.round = 2; g.active = 0
  const lord = field('herdlord', 1)
  for (let i = 0; i < 20 && !inPrimalFury(g, lord); i++) { lord.status.furyTested = null; primalFury(g, lord) }
  assert.ok(inPrimalFury(g, lord))
  if (hasRule(lord, 'Foe Render')) assert.equal(meleeWeaponOf(lord).ap, -2)
})

test('the Hornstone: placed as terrain; held by the closest unit of Unit Mass 5+', () => {
  const list = MORE_LISTS.find(l => l.army === B)
  const g = createGame({ lists: [list, DEFAULT_LISTS[0]], seed: 3 })
  const f = g.terrain.find(t => t.kind === 'hornstone')
  assert.ok(f, 'a Hornstone on the table')
  assert.ok(!g.units.some(u => u.entryId === 'hornstone'))
  const hornkin = g.units.find(u => u.entryId === 'hornkin-herds')
  Object.assign(hornkin, { placed: true, pos: { x: f.at.x, y: f.at.y + 4 }, facing: -Math.PI / 2 })
  assert.equal(hornstoneController(g, f, dtp), hornkin)
})

test('Drunken: a D6 at the Start of Turn for Centigors not Frenzied', () => {
  const g = empty(4)
  const c = field('hoofrunner-herds', 5)
  Object.assign(c, { placed: true, pos: { x: 30, y: 30 } }); g.units.push(c)
  drunken(g, 0)
  assert.match(g.log.map(l => l.text).join('\n'), /Drunken: D6 = \d/)
})

test('Lore of Beasts swap; Dominion Mutations within their allowance', () => {
  const g = empty(5)
  const s = field('herdseer', 1, { lore: 'elementalism', options: ['Wizard'] })
  generateSpells(g, s)
  assert.ok(swapChoices(s).some(x => x.slug === 'mantle-of-garrow'))
  const e = findEntry(B, 'herdlord')
  assert.ok(itemChoices(B, e, unitByNames(B, 'herdlord', 1, { command: ['General'] })).some(c => c.id === 'uncanny-senses' && !c.why))
  const l = { name: 't', army: B, points: 2000, units: [unitByNames(B, 'herdlord', 1, { command: ['General'], items: ['slug-skin', 'uncanny-senses'] })] }
  assert.ok(checkList(l).problems.some(p => /Dominion Mutations, over/.test(p)))
  const hc = field('hornchief', 1, { items: ['heavy-dominion-armour'] })
  assert.equal(saveFor(hc, {}).ward, 5)
})
