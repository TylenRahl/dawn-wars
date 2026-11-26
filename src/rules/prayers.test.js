// Warrior Priests' prayers (Prayers of Saint Halvar, Prayers of Varg).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { fieldUnit } from './units.js'
import { unitByNames } from './roster.js'
import { equip, saveFor } from './damage.js'
import { canPray, pray, prayerTargets } from './prayers.js'
import { endEffects } from './spells.js'
import { engage } from './charge.js'

const E = 'concord-realm'
const setup = (priestId, seed = 2) => {
  const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
  const priest = fieldUnit(E, unitByNames(E, priestId, 1), 0); equip(priest); g.units.push(priest)
  const halb = g.units.find(u => u.entryId === 'march-troops')
  Object.assign(priest, { placed: true, pos: { x: 30, y: 40 }, facing: -Math.PI / 2 })
  Object.assign(halb, { placed: true, pos: { x: 36, y: 40 }, facing: -Math.PI / 2 })
  startBattle(g, 0); beginTurn(g)
  g.sub = 'command'
  return { g, priest, halb }
}

test('Shield of Faith: a 5+ Ward in the Shooting phase for the priest and one unit, until the next Start of Turn', async () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { g, priest, halb } = setup('priest-of-saint-halvar', seed)
    assert.equal(canPray(g, priest), true)
    assert.ok(prayerTargets(g, priest, 'shield').includes(halb))
    const r = await pray(g, priest, 'shield', halb)
    assert.equal(canPray(g, priest), false) // one prayer a turn
    if (!r.passed) continue
    assert.equal(saveFor(halb, { phase: 'shooting' }).ward, 5)
    assert.equal(saveFor(halb).ward, null)
    endEffects(g, 'startOfTurn', priest.side)
    assert.equal(saveFor(halb, { phase: 'shooting' }).ward, null)
    return
  }
  assert.fail('no seed passed the test')
})

test('Soulfire hits an engaged enemy; Wrath of Winter gives Multiple Damage (2)', async () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { g, priest } = setup('priest-of-saint-halvar', seed)
    const rukkas = g.units.find(u => u.entryId === 'rukka-mob')
    Object.assign(rukkas, { placed: true, pos: { x: 30, y: 39 }, facing: Math.PI / 2 })
    engage(g, priest, rukkas, 'front')
    const r = await pray(g, priest, 'soulfire', rukkas)
    if (!r.passed) continue
    assert.match(g.log.map(l => l.text).join('\n'), /Soulfire: D6 = \d Strength 3 hits, AP -2/)
    break
  }
  const { g, priest } = setup('priest-of-varg', 3)
  for (let i = 0; i < 20 && !priest.status.wrathOfWinter; i++) { priest.status.prayedTurn = null; await pray(g, priest, 'wrath') }
  assert.equal(priest.status.wrathOfWinter, true)
})
