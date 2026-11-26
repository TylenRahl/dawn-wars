// The optional Arcane Magic rule and its ploys (ploys.js).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { PLOYS, canPloy, usePloy } from './ploys.js'
import { castSpell, spellTargets } from './magic.js'
import { effects as spellEffects } from './spells.js'
import { SPELLS } from '../data/spells.js'

test('six ploys each, within the per-player limits, only with the rule on', () => {
  const limits = Object.fromEntries(Object.values(PLOYS).filter(p => p.limit).map(p => [p.id, p.limit]))
  for (let seed = 1; seed <= 40; seed++) {
    const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false, arcane: true })
    for (const sd of [0, 1]) {
      assert.equal(g.ploys[sd].length, 6)
      for (const [id, n] of Object.entries(limits)) assert.ok(g.ploys[sd].filter(x => x === id).length <= n, `${id} over its limit`)
    }
  }
  assert.equal(createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false }).ploys, undefined)
})

const battle = ploys => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 5, terrain: false, arcane: true })
  const mage = g.units.find(u => u.entryId === 'master-mage')
  const shaman = g.units.find(u => u.entryId === 'rukka-head-case')
  const rukkas = g.units.find(u => u.entryId === 'rukka-mob')
  Object.assign(mage, { placed: true, pos: { x: 36, y: 40 }, facing: -Math.PI / 2 })
  Object.assign(shaman, { placed: true, pos: { x: 60, y: 8 }, facing: Math.PI / 2 })
  Object.assign(rukkas, { placed: true, pos: { x: 36, y: 6 }, facing: Math.PI / 2 })
  startBattle(g, 0); beginTurn(g)
  g.ploys = ploys
  return { g, mage, shaman, rukkas }
}

test('one ploy a phase for each player; a ploy played is gone', () => {
  const { g } = battle({ 0: ['fated', 'fated'], 1: ['dissolution'] })
  assert.equal(canPloy(g, 0, 'fated'), true)
  usePloy(g, 0, 'fated')
  assert.equal(canPloy(g, 0, 'fated'), false) // not twice in this phase
  assert.equal(g.ploys[0].length, 1)
  g.phase = 'shooting'
  assert.equal(canPloy(g, 0, 'fated'), true)
})

test('Towering Conjuration reaches any target; Dissolution dispels without a roll', async () => {
  const { g, mage, rukkas } = battle({ 0: ['towering'], 1: ['dissolution'] })
  const s = SPELLS[mage.wizard.spells.find(x => /^\d+"/.test(SPELLS[x].range) && /Missile|Hex/.test(SPELLS[x].category)) || 'fireball'] || SPELLS.fireball
  assert.equal(spellTargets(g, mage, s).includes(rukkas), false) // 30" off, beyond range
  assert.equal(spellTargets(g, mage, s, { anywhere: true }).includes(rukkas), true)
  // the other side answers every question with its first answer: a Wizardly dispel, then Dissolution
  let cast = false
  for (let i = 0; i < 20 && !cast; i++) {
    mage.wizard.castThisTurn = []; mage.wizard.attempts = 0; mage.wizard.noMoreThisTurn = false
    const r = await castSpell(g, mage, s.slug, rukkas, async (q, a) => /Play Dissolution/.test(a[0][0]) ? a[0][1] : /dispel/.test(q) ? a.find(x => /Fated/.test(x[0]))?.[1] ?? a[0][1] : a[a.length - 1][1], spellEffects)
    cast = r.dispelled || r.cast
    if (r.dispelled) assert.match(g.log.map(l => l.text).join('\n'), /DISPELLED \(Dissolution\)/)
  }
  assert.ok(cast)
})

test('Winds of Power: three dice, the lowest discarded', async () => {
  const { g, mage } = battle({ 0: ['power'], 1: [] })
  const self = mage.wizard.spells[0]
  await castSpell(g, mage, self, mage, async (q, a) => /Play Winds of Power/.test(a[0][0]) ? a[0][1] : a[a.length - 1][1], spellEffects)
  assert.match(g.log.map(l => l.text).join('\n'), /Casting roll \d, \d, \d \(Winds of Power, keeps \d\+\d\)/)
})
