// Gutlords: Impact Hits AP, Stone Skeleton, Largely Insignificant, weapons, the Cauldron, items.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, findEntry, itemChoices } from './roster.js'
import { equip, saveFor, applyMultipleDamage } from './damage.js'
import { ogreImpactAP } from './ogres.js'
import { canJoin } from './joining.js'
import { machineWeapon } from './warMachines.js'

const K = 'gutlords'
const field = (id, n, opts = {}, side = 0) => { const u = fieldUnit(K, unitByNames(K, id, n, opts), side); equip(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }

test('Impact Hits: Bull Charge AP -1, Thunderous Charge AP -2; Stone Skeleton one Wound fewer', () => {
  assert.equal(ogreImpactAP(field('tyrant', 1)), -1)
  const st = field('cragback-riders', 1)
  assert.equal(ogreImpactAP(st), -2)
  const g = empty(1)
  const w = st.models[0].wounds
  applyMultipleDamage(g, st, [3], 'a cannon')
  assert.equal(st.models[0].wounds, w - 2)
})

test('Grublings: Largely Insignificant — only Grubling characters join them', () => {
  const g = empty(2)
  assert.ok(hasRule(field('grubling-fighters', 20), 'Largely Insignificant'))
  assert.match(canJoin(g, field('bruiser', 1), field('grubling-fighters', 20), { deploying: true }).reason || '', /Largely Insignificant|troop type/)
})

test('weapons: Shotbellies carry both shots; the Gutcannon fires its cannon; Embergut breathes and resists fire', () => {
  const lb = field('shotbellies', 3)
  assert.deepEqual(lb.kit.ranged.map(w => w.key).sort(), ['shotbelly gun scatter shot', 'shotbelly gun solid shot'])
  assert.equal(machineWeapon(field('gutcannon', 1)).kind, 'cannon')
  const fb = field('embergut', 1)
  assert.ok(fb.kit.breath)
  assert.equal(saveFor(fb, { flaming: true }).ward, 4)
})

test('items: a single Big Name; the Kineater only for the General', () => {
  const e = findEntry(K, 'bruiser')
  const sel = unitByNames(K, 'bruiser', 1)
  const ch = itemChoices(K, e, sel)
  assert.ok(ch.some(c => c.id === 'giantbreaker' && !c.why))
  assert.match(ch.find(c => c.id === 'kineater').why || '', /General/)
})
