// The foundations: dice, army lists, fielding a unit, its footprint and arcs, deployment.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRng, d6, d3, artilleryDie, scatterDie, testLeadership } from './dice.js'
import { DEFAULT_LISTS } from './testLists.js'
import { checkList, findEntry, unitCost } from './roster.js'
import { fieldUnit, corners, width, depth, arcOf, modelCount, ranksOf, distanceBetween } from './units.js'
import { createGame, deployUnit, whoDeploys, TABLE } from './game.js'

test('the same seed rolls the same dice', () => {
  const a = createRng(42); const b = createRng(42)
  const ra = Array.from({ length: 50 }, () => d6(a)); const rb = Array.from({ length: 50 }, () => d6(b))
  assert.deepEqual(ra, rb)
  assert.ok(ra.every(x => x >= 1 && x <= 6))
})

test('D3, artillery and scatter dice stay on their faces', () => {
  const r = createRng(3)
  for (let i = 0; i < 300; i++) {
    const x = d3(r); assert.ok(x >= 1 && x <= 3)
    const a = artilleryDie(r); assert.ok([2, 4, 6, 8, 10, 'misfire'].includes(a))
    const s = scatterDie(r); assert.ok(s.hit ? s.angle === null : s.angle >= 0 && s.angle < 360)
  }
})

test('a Leadership test passes on 2D6 at or under the value', () => {
  const r = createRng(9)
  for (let i = 0; i < 100; i++) {
    const t = testLeadership(r, 7)
    assert.equal(t.passed, t.total <= 7)
  }
})

test('both default lists are legal and within their points', () => {
  for (const l of DEFAULT_LISTS) {
    const c = checkList(l)
    assert.deepEqual(c.problems, [], l.name)
    assert.ok(c.total <= l.points)
  }
})

test('a unit costs its models plus its upgrades', () => {
  const l = DEFAULT_LISTS[0]
  const halberds = l.units.find(u => u.entryId === 'march-troops')
  const e = findEntry(l.army, halberds.entryId)
  // 30 March Troops at 5, halberds +1 each, sergeant/standard/musician 5 each
  assert.equal(unitCost(e, halberds).total, 30 * 5 + 30 + 15)
})

test('a fielded unit has its command and its footprint', () => {
  const u = fieldUnit('concord-realm', DEFAULT_LISTS[0].units.find(u => u.entryId === 'march-troops'), 0)
  assert.equal(modelCount(u), 30)
  assert.equal(u.models.filter(m => m.role === 'champion').length, 1)
  assert.equal(u.models.find(m => m.role === 'champion').name, 'Sergeant')
  u.files = 10
  u.pos = { x: 36, y: 40 }
  assert.equal(ranksOf(u), 3)
  assert.ok(Math.abs(width(u) - 10 * 25 / 25.4) < 1e-9)
  assert.ok(Math.abs(depth(u) - 3 * 25 / 25.4) < 1e-9)
  const c = corners(u)
  // facing up the table: the front edge is the top edge, at y 40
  assert.ok(Math.abs(c[0].y - 40) < 1e-9 && Math.abs(c[1].y - 40) < 1e-9)
  assert.ok(c[0].x < c[1].x)
})

test('arcs: in front, behind and to the sides', () => {
  const u = fieldUnit('concord-realm', DEFAULT_LISTS[0].units.find(u => u.entryId === 'march-troops'), 0)
  u.files = 10; u.pos = { x: 36, y: 40 }
  assert.equal(arcOf(u, { x: 36, y: 30 }), 'front')
  assert.equal(arcOf(u, { x: 36, y: 47 }), 'rear')
  assert.equal(arcOf(u, { x: 20, y: 41 }), 'left')
  assert.equal(arcOf(u, { x: 52, y: 41 }), 'right')
})

test('deployment alternates and refuses a unit outside its zone or on another', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1 })
  const blue = g.units.filter(u => u.side === 0)
  const st = blue.filter(u => u.entryId === 'march-troops')
  const red = g.units.filter(u => u.side === 1)
  const rukkas = red.find(u => u.entryId === 'rukka-mob')
  assert.equal(whoDeploys(g), 0)
  assert.equal(deployUnit(g, st[0], { pos: { x: 36, y: 20 }, facing: -Math.PI / 2 }).ok, false)
  assert.equal(deployUnit(g, red[0], { pos: { x: 36, y: 5 }, facing: Math.PI / 2 }).ok, false)
  assert.equal(deployUnit(g, blue[0], { pos: { x: 10, y: 38 }, facing: -Math.PI / 2 }).ok, false, 'characters go last')
  assert.equal(deployUnit(g, st[0], { pos: { x: 36, y: 38 }, facing: -Math.PI / 2 }).ok, true)
  // its detachment of handgunners goes down at once, within 3" (Regimental Deployment)
  const det = blue.find(u => u.regiment === st[0])
  assert.equal(whoDeploys(g), 0)
  assert.equal(deployUnit(g, det, { pos: { x: 55, y: 38 }, facing: -Math.PI / 2 }).ok, false)
  assert.equal(deployUnit(g, det, { pos: { x: 36 + width(st[0]) / 2 + 1 + width(det) / 2, y: 38 }, facing: -Math.PI / 2 }).ok, true)
  assert.equal(whoDeploys(g), 1)
  assert.equal(deployUnit(g, rukkas, { pos: { x: 36, y: 10 }, facing: Math.PI / 2 }).ok, true)
  assert.equal(deployUnit(g, st[1], { pos: { x: 36, y: 38.5 }, facing: -Math.PI / 2 }).ok, false)
  assert.ok(distanceBetween(st[0], rukkas) > 20)
  assert.equal(TABLE.w, 72)
})
