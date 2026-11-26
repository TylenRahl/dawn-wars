// Vanguard: the free move before the first turn (vanguard.js).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { unitByNames } from './roster.js'
import { startVanguard, vanguardMove, vanguardUnits, vanguardPass } from './vanguard.js'
import { canDeclareCharge } from './charge.js'

const E = 'concord-realm'
test('Vanguard: a move after deployment, alternating, no march, and no charge in the first turn', () => {
  const lists = [{ ...DEFAULT_LISTS[0], units: [...DEFAULT_LISTS[0].units, unitByNames(E, 'realm-archers', 10)] }, DEFAULT_LISTS[1]]
  const g = createGame({ lists, seed: 2, terrain: false })
  const archers = g.units.find(u => u.entryId === 'realm-archers')
  const rukkas = g.units.find(u => u.entryId === 'rukka-mob')
  for (const u of g.units) { u.placed = false }
  Object.assign(archers, { placed: true, pos: { x: 36, y: 40 }, facing: -Math.PI / 2 })
  Object.assign(rukkas, { placed: true, pos: { x: 36, y: 22 }, facing: Math.PI / 2 })
  assert.equal(startVanguard(g), true)
  assert.equal(g.vanguard.turn, 0)
  assert.equal(vanguardMove(g, archers, [{ type: 'forward', d: 20 }]).ok, false) // more than its Movement
  const r = vanguardMove(g, archers, [{ type: 'forward', d: 4 }])
  assert.equal(r.ok, true, r.reason)
  assert.equal(g.vanguard, null) // nobody has another
  assert.equal(archers.status.moved, false)
  startBattle(g, 0); beginTurn(g)
  assert.match(canDeclareCharge(g, archers, rukkas).reason, /Vanguard/)
  assert.deepEqual(vanguardUnits(g, 0), [])
  assert.equal(typeof vanguardPass, 'function')
})
