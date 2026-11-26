// Potions and other items used in the Command sub-phase (rules/commandItems.js).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { commandItems, useCommandItem } from './commandItems.js'
import { endEffects } from './spells.js'
import { hasRule } from './units.js'
import { join } from './joining.js'

const O = 'rukka-firms'
const game = (items, seed = 2) => {
  const lists = DEFAULT_LISTS.map(l => l.army !== O ? l : { ...l, units: l.units.map(u => u.entryId === 'rukka-gaffer' ? { ...u, items } : u) })
  const g = createGame({ lists, seed, terrain: false })
  const boss = g.units.find(u => u.entryId === 'rukka-gaffer')
  const mob = g.units.find(u => u.entryId === 'rukka-mob')
  Object.assign(boss, { placed: true, pos: { x: 20, y: 10 }, facing: Math.PI / 2 })
  Object.assign(mob, { placed: true, pos: { x: 36, y: 10 }, facing: Math.PI / 2 })
  startBattle(g, 1); beginTurn(g)
  g.sub = 'command'
  return { g, boss, mob }
}

test('potions: one a Command phase; +D3 until the end of the turn; two Healing Potions are two', () => {
  const { g, boss } = game(['potion-of-strength', 'healing-potion', 'healing-potion'])
  boss.models[0].wounds = 1
  const S = boss.models[0].profile.S
  assert.equal(useCommandItem(g, boss, 'potion-of-strength').ok, true)
  const now = boss.models[0].profile.S
  assert.ok(now > S && now <= S + 3)
  assert.match(commandItems(g, boss).find(x => x.id === 'healing-potion').why, /one potion/)
  endEffects(g, 'endOfTurn', g.active)
  assert.equal(boss.models[0].profile.S, S)
  g.round++
  assert.equal(useCommandItem(g, boss, 'healing-potion').ok, true)
  assert.ok(boss.models[0].wounds > 1)
  boss.models[0].wounds = 1
  g.round++
  assert.equal(useCommandItem(g, boss, 'healing-potion').ok, true, 'the second potion')
  g.round++
  assert.equal(commandItems(g, boss).length, 0)
})

test("the Elixir of Power lasts until the next Start of Turn, then costs a Wound; Guv'nor's Titfer makes the unit Unbreakable", () => {
  const { g, boss, mob } = game(['elixir-of-power', 'guvnors-titfer'])
  const before = { ...boss.models[0].profile }
  const W = boss.models[0].wounds
  useCommandItem(g, boss, 'elixir-of-power')
  assert.equal(boss.models[0].profile.A, before.A + 1)
  endEffects(g, 'startOfTurn', boss.side)
  assert.equal(boss.models[0].profile.A, before.A)
  assert.equal(boss.models[0].wounds, W - 1)
  // Guv'nor's Titfer, with the boss in the mob
  join(g, boss, mob, { deploying: true })
  for (let i = 0; i < 12 && !hasRule(mob, 'Unbreakable'); i++) { g.round++; useCommandItem(g, boss, 'guvnors-titfer') }
  assert.equal(hasRule(mob, 'Unbreakable'), true)
  assert.equal(hasRule(boss, 'Unbreakable'), true)
})
