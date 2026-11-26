// The game's ready-made armies: one per army, each 500 points and legal.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './defaultLists.js'
import { checkList, ARMY_NAMES } from './roster.js'

test('a 500-point list for every army, each legal', () => {
  const all = [...DEFAULT_LISTS, ...MORE_LISTS]
  assert.deepEqual(all.map(l => l.army).sort(), Object.keys(ARMY_NAMES).sort())
  for (const l of all) {
    assert.equal(l.points, 500, l.name)
    const c = checkList(l)
    assert.deepEqual(c.problems, [], l.name)
    assert.ok(c.total <= 500 && c.total >= 400, `${l.name}: ${c.total}`)
  }
  assert.equal(DEFAULT_LISTS[0].army, 'concord-realm')
  assert.equal(DEFAULT_LISTS[1].army, 'rukka-firms')
})
