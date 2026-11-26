// Random Movement, Random Attacks and the Wrecker Gobbler (its spiked ball and Ker Splat).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { fieldUnit } from './units.js'
import { unitByNames } from './roster.js'
import { equip } from './damage.js'
import { checkMove, makeMove, movementOf } from './movement.js'
import { canDeclareCharge } from './charge.js'
import { rollRandomMove, randomContactTargets, randomMoveIntoContact, randomMovers } from './randomMovement.js'
import { combatsToFight, fightCombat } from './combat.js'

const O = 'rukka-firms'
const setup = (id, n, seed = 4) => {
  const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
  startBattle(g, 1); beginTurn(g)
  for (const u of g.units) { u.placed = false; u.status.removed = false; u.status.destroyed = null }
  const sq = fieldUnit(O, unitByNames(O, id, n), 1); equip(sq); g.units.push(sq)
  const halb = g.units.find(u => u.entryId === 'march-troops')
  Object.assign(sq, { placed: true, pos: { x: 36, y: 14 }, facing: Math.PI / 2 })
  Object.assign(halb, { placed: true, pos: { x: 36, y: 40 }, facing: -Math.PI / 2, files: 10 })
  g.active = 1; g.sub = 'compulsory'
  return { g, sq, halb }
}

test('a Random Movement unit has no Movement, cannot charge, and moves only its rolled distance, forward and wheeling', () => {
  const { g, sq, halb } = setup('gloom-nipper-gobbler-hopper-mob', 5)
  assert.equal(movementOf(sq), 0)
  assert.equal(canDeclareCharge(g, sq, halb).ok, false)
  assert.match(checkMove(g, sq, [{ type: 'forward', d: 1 }]).reason, /random distance/)
  assert.deepEqual(randomMovers(g), [sq])
  const r = rollRandomMove(g, sq)
  assert.ok(r >= 3 && r <= 18)
  assert.match(g.log.map(l => l.text).join('\n'), /Random Movement 3D6\): \d\+\d\+\d = \d+"/)
  assert.equal(checkMove(g, sq, [{ type: 'forward', d: r + 0.5 }], { random: true }).ok, false)
  assert.match(checkMove(g, sq, [{ type: 'back', d: 1 }], { random: true }).reason, /forward and wheel/)
  const m = makeMove(g, sq, [{ type: 'forward', d: Math.min(2, r) }], { random: true })
  assert.equal(m.ok, true, m.reason)
  assert.equal(sq.status.randomMove.done, true)
  assert.equal(randomMovers(g).length, 0)
})

test('it may bound into an enemy it can reach: it counts as charging and the enemy must Hold', () => {
  for (let seed = 1; seed < 30; seed++) {
    const { g, sq, halb } = setup('gloom-nipper-gobbler-hopper-mob', 5, seed)
    halb.pos = { x: 36, y: 24 }
    const r = rollRandomMove(g, sq)
    const ts = randomContactTargets(g, sq)
    if (r < 10) continue
    assert.ok(ts.some(x => x.t === halb), `seed ${seed}: rolled ${r}`)
    assert.equal(randomMoveIntoContact(g, sq, halb).ok, true)
    assert.equal(sq.status.charged, true)
    assert.equal(halb.status.reaction, 'hold')
    assert.ok(sq.engagedWith[halb.id])
    return
  }
  assert.fail('no seed rolled 10 or more')
})

test('a Wrecker Gobbler rolls its Random Attacks, its Impact Hits are AP -3, and it stomps', async () => {
  const { g, sq, halb } = setup('wrecker-gobblers', 1, 6)
  halb.pos = { x: 36, y: 24 }
  sq.status.randomMove = { rolled: 18, done: false }
  sq.models[0].wounds = 40 // it lives to stomp
  assert.equal(randomMoveIntoContact(g, sq, halb).ok, true)
  g.phase = 'combat'; g.sub = 'fight'
  await fightCombat(g, combatsToFight(g)[0], async (q, a) => a[0][1])
  const text = g.log.map(l => l.text).join('\n')
  assert.match(text, /Random Attacks \(D6\) = \d/)
  assert.match(text, /Impact Hits \(D6\) = \d+ = \d+ Strength 6, AP -3 hits/)
  // and it stomps last (Stomp Attacks), AP -2 as a behemoth
  assert.match(text, /Stomp Attacks \(D3\) = \d+ automatic Strength 6 hits, AP -2/)
})
