// The named maps (maps.js): on the table, nothing on top of anything else, both deployment zones usable, and a battle
// set up on a map gets exactly its features (game.js createGame { map }). Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAPS, mapTerrain } from './maps.js'
import { createGame, TABLE } from './game.js'
import { polysOverlap, pointInPoly } from './geometry.js'
import { TERRAIN_KINDS } from './terrain.js'
import { DEFAULT_LISTS } from './testLists.js'

for (const [id, m] of Object.entries(MAPS)) {
  test(`${m.name}: every feature is a known kind, on the table, and clear of the others`, () => {
    const fs = mapTerrain(id)
    assert.ok(fs.length >= 6)
    for (const f of fs) {
      assert.ok(TERRAIN_KINDS[f.kind], f.kind)
      for (const p of f.poly) assert.ok(p.x > 0 && p.x < TABLE.w && p.y > 0 && p.y < TABLE.h, `${f.kind} at ${p.x},${p.y}`)
    }
    for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) assert.ok(!polysOverlap(fs[i].poly, fs[j].poly, 0.01), `${fs[i].kind} and ${fs[j].kind} overlap`)
  })

  // Placing terrain: not within 12" of the centre
  test(`${m.name}: no feature within 12" of the table's centre`, () => {
    const c = { x: TABLE.w / 2, y: TABLE.h / 2 }
    for (const f of mapTerrain(id)) {
      assert.ok(!pointInPoly(c, f.poly))
      for (let i = 0; i < f.poly.length; i++) {
        const a = f.poly[i]; const b = f.poly[(i + 1) % f.poly.length]
        for (let k = 0; k <= 20; k++) { const p = { x: a.x + (b.x - a.x) * k / 20, y: a.y + (b.y - a.y) * k / 20 }; assert.ok(Math.hypot(p.x - c.x, p.y - c.y) >= 12, `${f.kind} at ${p.x.toFixed(1)},${p.y.toFixed(1)} is within 12" of the centre`) }
      }
    }
  })

  test(`${m.name}: each deployment zone is mostly open ground (no impassable terrain, at least 80% free)`, () => {
    const fs = mapTerrain(id)
    for (const [y0, y1] of [[36, 48], [0, 12]]) {
      let free = 0; let all = 0
      for (let x = 0.5; x < TABLE.w; x += 1) for (let y = y0 + 0.5; y < y1; y += 1) {
        all++
        const on = fs.filter(f => pointInPoly({ x, y }, f.poly))
        if (!on.length) free++
        assert.ok(!on.some(f => TERRAIN_KINDS[f.kind].impassable), `impassable ground in a deployment zone at ${x},${y}`)
      }
      assert.ok(free / all >= 0.8, `zone ${y0}-${y1}: ${(100 * free / all).toFixed(0)}% free`)
    }
  })

  test(`${m.name}: a battle set up on it has exactly its features, whatever the seed`, () => {
    for (const seed of [1, 7, 99]) {
      const g = createGame({ lists: [DEFAULT_LISTS[0], DEFAULT_LISTS[1]], seed, map: id })
      assert.deepEqual(g.terrain.map(f => [f.kind, f.at]), m.features.map(f => [f.kind, f.at]))
      assert.equal(g.map, id)
    }
    // the map's own record is not changed by a battle
    const g = createGame({ lists: [DEFAULT_LISTS[0], DEFAULT_LISTS[1]], seed: 3, map: id })
    g.terrain[0].at.x = -99
    assert.notEqual(MAPS[id].features[0].at.x, -99)
  })
}

test('an unknown map falls back to the random terrain', () => {
  const g = createGame({ lists: [DEFAULT_LISTS[0], DEFAULT_LISTS[1]], seed: 5, map: 'no-such-map' })
  assert.equal(g.map, null)
  assert.ok(g.terrain.length >= 6)
})
