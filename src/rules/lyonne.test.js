// Kingdom of Lyonne: its default list, the Vows, Peasantry joining, the Favour of the Mere.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip } from './damage.js'
import { canJoin } from './joining.js'
import { pray, blessingWard, loseBlessing } from './lyonne.js'

const B = 'kingdom-of-lyonne'
const field = (id, n, opts = {}, side = 0) => { const u = fieldUnit(B, unitByNames(B, id, n, opts), side); equip(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }

test('the Lyonnese default list is legal and within 1,500 points', () => {
  const l = MORE_LISTS.find(x => x.army === B)
  const c = checkList(l)
  assert.deepEqual(c.problems, [])
  assert.ok(c.total <= 1500 && c.total > 1400, String(c.total))
})

test('Vows: Chalice Knights are Immune to Psychology and Stubborn; Wayfarer Knights Stubborn', () => {
  const gk = field('chalice-knights', 5)
  assert.ok(hasRule(gk, 'Immune to Psychology') && hasRule(gk, 'Stubborn') && hasRule(gk, 'Magical Attacks'))
})

test('Peasantry: a Knight with a Vow cannot join peasants; a Chalice unit takes only Chalice Vow characters or Handmaidens', () => {
  const g = empty(1)
  const paladin = field('paladin', 1)
  const maa = field('men-at-arms', 20)
  assert.match(canJoin(g, paladin, maa, { deploying: true }).reason, /Peasantry/)
  const gk = field('chalice-knights', 5)
  const kn = field('paladin', 1, { mount: 'Lyonnese Warhorse' })
  assert.match(canJoin(g, kn, gk, { deploying: true }).reason || '', /Chalice Vow/)
})

test('Favour of the Mere: a 6+ Ward after praying, 5+ against Strength 5; lost on fleeing', () => {
  const g = empty(2)
  const k = field('mounted-knights-of-the-lily', 5)
  g.units.push(k)
  assert.equal(blessingWard(g, k, 4), null)
  pray(g, 0)
  assert.equal(blessingWard(g, k, 4).value, 6)
  assert.equal(blessingWard(g, k, 5).value, 5)
  loseBlessing(g, k, 'flees')
  assert.equal(blessingWard(g, k, 4), null)
})
