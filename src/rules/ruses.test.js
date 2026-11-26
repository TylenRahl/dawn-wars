// Sorcerous Ruses: the optional rule and its six ruses (ruses.js).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { checkList, unitCost, findEntry, unitByNames } from './roster.js'
import { castSpell } from './magic.js'
import { effects as spellEffects } from './spells.js'
import { removeUnit } from './damage.js'

const E = 'concord-realm'
const withRuse = (army = E, entry = 'master-mage') => DEFAULT_LISTS.map(l => l.army !== army ? l : { ...l, units: l.units.map(u => u.entryId === entry ? { ...u, ruse: true } : u) })

test('a Wizard buys a Ruse for 25 points; it is rolled before its spells; only Wizards may', () => {
  const sel = { ...unitByNames(E, 'master-mage', 1), ruse: true }
  assert.equal(unitCost(findEntry(E, 'master-mage'), sel).total, unitCost(findEntry(E, 'master-mage'), { ...sel, ruse: false }).total + 25)
  const g = createGame({ lists: withRuse(), seed: 3, terrain: false })
  const mage = g.units.find(u => u.entryId === 'master-mage')
  assert.ok(mage.wizard.ruse)
  const text = g.log.map(l => l.text).join('\n')
  assert.ok(text.indexOf('Sorcerous Ruse') < text.indexOf('rolls for spells'))
  const bad = { ...DEFAULT_LISTS[0], points: 3000, units: DEFAULT_LISTS[0].units.map(u => u.entryId === 'captain-of-the-realm' ? { ...u, ruse: true } : u) }
  assert.ok(checkList(bad).problems.some(p => /only a Wizard may buy a Sorcerous Ruse/.test(p)))
})

const battle = (ruse, seed = 4) => {
  const g = createGame({ lists: withRuse('rukka-firms', 'rukka-head-case'), seed, terrain: false })
  const mage = g.units.find(u => u.entryId === 'master-mage')
  const shaman = g.units.find(u => u.entryId === 'rukka-head-case')
  Object.assign(mage, { placed: true, pos: { x: 36, y: 30 }, facing: -Math.PI / 2 })
  Object.assign(shaman, { placed: true, pos: { x: 36, y: 20 }, facing: Math.PI / 2 })
  startBattle(g, 0); beginTurn(g)
  shaman.wizard.ruse = ruse; shaman.wizard.ruseUsed = false
  return { g, mage, shaman }
}

test('Spell Eater dispels a spell and feeds the next Casting roll', async () => {
  const { g, mage, shaman } = battle('spell-eater')
  const self = mage.wizard.spells[0]
  let done = false
  for (let i = 0; i < 20 && !done; i++) {
    mage.wizard.castThisTurn = []; mage.wizard.attempts = 0; mage.wizard.noMoreThisTurn = false
    const r = await castSpell(g, mage, self, mage, async (q, a) => a.find(x => /Spell Eater/.test(x[0]))?.[1] ?? a[a.length - 1][1], spellEffects)
    if (r.dispelled) done = true
  }
  assert.ok(done)
  assert.equal(shaman.wizard.ruseUsed, true)
  assert.equal(shaman.wizard.spellEaten, true)
})

test('Escapology: the first time the Wizard falls, a 4+ saves it with one Wound', () => {
  let saved = false
  for (let seed = 1; seed <= 20 && !saved; seed++) {
    const { g, shaman } = battle('escapology', seed)
    shaman.models[0].wounds = 0
    removeUnit(g, shaman, 'wiped out')
    if (!shaman.status.removed) { saved = true; assert.equal(shaman.models[0].wounds, 1) }
    assert.equal(shaman.wizard.ruseUsed, true)
  }
  assert.ok(saved)
})
