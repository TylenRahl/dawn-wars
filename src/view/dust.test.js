// Where the dust of a combat rises (view/dust.js): along the edge where two engaged units touch.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fieldUnit } from '../rules/units.js'
import { unitByNames } from '../rules/roster.js'
import { equip } from '../rules/damage.js'
import { engage } from '../rules/charge.js'
import { contactLines, puffsOf, starsOf } from './dust.js'

const O = 'rukka-firms'
const mob = (side, pos, facing, files = 5) => {
  const u = fieldUnit(O, unitByNames(O, 'iron-rukka-mob', 10), side)
  equip(u)
  return Object.assign(u, { placed: true, pos, facing, files })
}

test('two units front to front: one line along the front they share', () => {
  const a = mob(0, { x: 30, y: 20 }, Math.PI / 2)          // its front faces down the table, at y 20
  const b = mob(1, { x: 31, y: 20 }, -Math.PI / 2)         // faces up, front at y 20, an inch to the right
  engage({}, a, b, 'front')
  const lines = contactLines([a, b])
  assert.equal(lines.length, 1)
  const { from, to } = lines[0]
  assert.ok(Math.abs(from.y - 20) < 1e-6 && Math.abs(to.y - 20) < 1e-6, 'on the front line')
  // the shared stretch is the narrower overlap: both 5 files wide, offset by an inch
  const w = Math.abs(to.x - from.x)
  assert.ok(w > 3 && w < 9, `overlap ${w}`)
})

test('no engagement, no dust; a unit left out (still gliding) takes its line with it', () => {
  const a = mob(0, { x: 30, y: 20 }, Math.PI / 2)
  const b = mob(1, { x: 30, y: 20 }, -Math.PI / 2)
  assert.equal(contactLines([a, b]).length, 0)
  engage({}, a, b, 'front')
  assert.equal(contactLines([a, b], u => u === b).length, 0)
  b.status.removed = true
  assert.equal(contactLines([a, b]).length, 0)
})

test('puffs stay near the line, and the same moment draws the same puffs', () => {
  const line = { from: { x: 10, y: 10 }, to: { x: 16, y: 10 }, key: 'a|b' }
  const p1 = puffsOf(line, 3.7); const p2 = puffsOf(line, 3.7)
  assert.deepEqual(p1, p2)
  assert.ok(p1.length >= 4)
  for (const p of p1) {
    assert.ok(p.x > 8 && p.x < 18 && Math.abs(p.y - 10) < 3, `puff at ${p.x},${p.y}`)
    assert.ok(p.r > 0 && p.a >= 0 && p.a <= 0.8)
  }
})

test('a few stars, near the line, some showing and some waiting', () => {
  const line = { from: { x: 10, y: 10 }, to: { x: 16, y: 10 }, key: 'a|b' }
  let shown = 0; let waiting = 0
  for (let t = 0; t < 10; t += 0.05) {
    const st = starsOf(line, t)
    assert.ok(st.length >= 3 && st.length <= 6)
    for (const p of st) {
      if (p.a > 0) { shown++; assert.ok(p.x >= 9.9 && p.x <= 16.1 && Math.abs(p.y - 10) <= 0.81, `star at ${p.x},${p.y}`) } else waiting++
    }
  }
  assert.ok(shown > 0 && waiting > 0)
})
