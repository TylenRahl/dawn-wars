// The player's own maps (rules/customMaps.js): pieces become the same terrain features the named maps hold.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newPiece, polyOf, featuresOf, checkMap, pieceFromFeature, validateRecord, newMapId, twinOf } from './customMaps.js'
import { MAPS, setCustomMaps, mapTerrain } from './maps.js'

test('a placed piece is a feature where it was put, the size it says', () => {
  const p = newPiece('building', { x: 10, y: 20 })
  const f = featuresOf({ pieces: [p] })[0]
  assert.equal(f.kind, 'building')
  assert.deepEqual(f.at, { x: 10, y: 20 })
  const xs = f.poly.map(q => q.x); const ys = f.poly.map(q => q.y)
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - p.w) < 1e-9)
  assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - p.d) < 1e-9)
})

test('mirrored: each piece has its twin turned half round the centre', () => {
  const p = newPiece('wood', { x: 10, y: 40 })
  const fs = featuresOf({ mirror: true, pieces: [p] })
  assert.equal(fs.length, 2)
  assert.deepEqual(fs[1].at, { x: 62, y: 8 })
  const a = polyOf(p); const b = polyOf(twinOf(p))
  a.forEach((q, i) => { assert.ok(Math.abs(72 - q.x - b[i].x) < 1e-9); assert.ok(Math.abs(48 - q.y - b[i].y) < 1e-9) })
})

test('a named map opened as pieces gives back the same outlines', () => {
  for (const m of Object.values(MAPS)) {
    for (const f of m.features) {
      const back = polyOf(pieceFromFeature(f))
      f.poly.forEach((q, i) => { assert.ok(Math.hypot(q.x - back[i].x, q.y - back[i].y) < 1e-9) })
    }
  }
})

test('the advice: the centre, overlaps, the table edge, how many', () => {
  const said = map => checkMap(map).map(c => c.text).join('\n')
  assert.match(said({ pieces: [newPiece('hill', { x: 36, y: 24 })] }), /within 12" of the centre/)
  assert.match(said({ pieces: [newPiece('hill', { x: 10, y: 10 }), newPiece('wood', { x: 11, y: 11 })] }), /overlap/)
  assert.match(said({ pieces: [newPiece('hill', { x: 1, y: 10 })] }), /over the table's edge/)
  assert.match(said({ pieces: [newPiece('hill', { x: 10, y: 10 })] }), /about 6 is usual/)
})

test('a saved map: checked on the way in, and laid by mapTerrain like a named one', () => {
  assert.ok(validateRecord({ id: 'x', pieces: [{ kind: 'lava', at: { x: 1, y: 1 }, w: 1, d: 1 }] }).error)
  const { record } = validateRecord({ id: 'my-test', name: 'Test', points: 1000, mirror: true, pieces: [newPiece('rocks', { x: 10, y: 40 })] })
  setCustomMaps([record], featuresOf)
  assert.equal(MAPS['my-test'].custom, true)
  const t = mapTerrain('my-test')
  assert.equal(t.length, 2)
  assert.equal(t[0].kind, 'rocks')
  setCustomMaps([], featuresOf)
  assert.equal(MAPS['my-test'], undefined)
  assert.ok(MAPS['field-1000'])
  assert.equal(newMapId('Bridge of Doom', ['my-bridge-of-doom']), 'my-bridge-of-doom-2')
})
