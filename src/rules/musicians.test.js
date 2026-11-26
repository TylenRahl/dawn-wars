// Musicians: Steadying Rhythm, Quick Time, Onwards to Victory, and the Cacophonous Dirge that silences them.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, distanceBetween } from './units.js'
import { unitByNames } from './roster.js'
import { equip } from './damage.js'
import { leadershipTest } from './leadership.js'
import { hostOf } from './joining.js'
import { musicianPlays, onwardsToVictory } from './musicians.js'

const game = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }
const put = (u, x, y) => { u.placed = true; u.pos = { x, y }; u.facing = 0 }
const withMusician = (g, side) => g.units.find(u => u.side === side && u.models.some(m => m.role === 'musician' && m.wounds > 0))

test('a musician +1 to Rally and march tests (to 10); none for other tests', () => {
  const g = game(1)
  const u = withMusician(g, 0)
  assert.ok(u, 'a unit with a musician')
  put(u, 20, 20)
  const r = leadershipTest(g, u, { kind: 'rally', label: 'rally' })
  const m = leadershipTest(g, u, { kind: 'march', label: 'march' })
  const p = leadershipTest(g, u, { kind: 'panic', label: 'panic' })
  assert.match(r.text, /the musician \+1/)
  assert.match(m.text, /the musician \+1/)
  assert.doesNotMatch(p.text, /musician/)
  for (const x of u.models) if (x.role === 'musician') x.wounds = 0
  assert.equal(musicianPlays(g, u, distanceBetween, hostOf), false)
})

test('Onwards to Victory: +1 to the side with a musician, neither when both have one', () => {
  const g = game(2)
  const a = withMusician(g, 0); const b = withMusician(g, 1)
  put(a, 20, 20); put(b, 20, 22)
  assert.equal(onwardsToVictory(g, [[a], [b]], distanceBetween, hostOf), null)
  for (const x of b.models) if (x.role === 'musician') x.wounds = 0
  assert.equal(onwardsToVictory(g, [[a], [b]], distanceBetween, hostOf), 0)
})

test('the Cacophonous Dirge: an enemy musician within 18" of its bearer does nothing', () => {
  const g = game(3)
  const a = withMusician(g, 0)
  put(a, 20, 20)
  const B = 'hornkin-herds'
  const bearer = fieldUnit(B, unitByNames(B, 'herdlord', 1, { items: ['cacophonous-dirge'] }), 1); equip(bearer)
  g.units.push(bearer)
  put(bearer, 20, 30)
  assert.equal(musicianPlays(g, a, distanceBetween, hostOf), false)
  put(bearer, 20, 60)
  assert.equal(musicianPlays(g, a, distanceBetween, hostOf), true)
})
