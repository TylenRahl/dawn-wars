// A character that joins a unit takes a place in its front rank, so fewer of the unit's own models stand in base
// contact and in the fighting rank (combat.js attackGroupsInner; joining.js joinedPlaces).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fieldUnit } from './units.js'
import { unitByNames } from './roster.js'
import { DEFAULT_LISTS } from './testLists.js'
import { equip } from './damage.js'
import { join, joinedPlaces } from './joining.js'
import { engage } from './charge.js'
import { attackGroups } from './combat.js'

const E = 'concord-realm'; const O = 'rukka-firms'
function scene (wide = 5) {
  const host = fieldUnit(E, DEFAULT_LISTS[0].units.find(u => u.entryId === 'march-troops'), 0)
  equip(host)
  Object.assign(host, { placed: true, pos: { x: 36, y: 30 }, facing: -Math.PI / 2, files: 5 })
  const gen = fieldUnit(E, unitByNames(E, 'general-of-the-realm', 1), 0)
  equip(gen)
  Object.assign(gen, { placed: true, pos: { x: 10, y: 10 }, facing: 0 })
  // a Rukka Mob `wide` files wide, front to front, centred on the March Troops
  const rukkas = fieldUnit(O, unitByNames(O, 'rukka-mob', 20), 1)
  equip(rukkas)
  Object.assign(rukkas, { placed: true, pos: { x: 36, y: 30 }, facing: Math.PI / 2, files: wide })
  const game = { units: [host, gen, rukkas], log: [], listeners: new Set(), round: 1, active: 1, phase: 'combat', effects: [], sides: [{ name: 'A' }, { name: 'B' }] }
  return { game, host, gen, rukkas }
}
const count = (gs, re) => gs.filter(g => re.test(g.label)).reduce((a, g) => a + g.n, 0)

test('the general holds a front-rank place beside the command', () => {
  const { game, host, gen } = scene()
  assert.ok(join(game, gen, host, { deploying: true }).ok)
  const p = joinedPlaces(host)
  assert.equal(p.front.length, 1)
  assert.equal(p.front[0].c, gen)
  assert.equal(p.front[0].model.role, 'rank')
})

test('fighting through its front: one fewer of the unit in base contact once he stands there', () => {
  const before = scene()
  engage(before.game, before.rukkas, before.host, 'front')
  const g0 = attackGroups(before.game, before.host, before.rukkas)
  const after = scene()
  assert.ok(join(after.game, after.gen, after.host, { deploying: true }).ok)
  engage(after.game, after.rukkas, after.host, 'front')
  const g1 = attackGroups(after.game, after.host, after.rukkas)
  const inContact = gs => count(gs, /in base contact/) + gs.filter(g => g.isChamp).length
  assert.equal(inContact(g1), inContact(g0) - 1, `before ${JSON.stringify(g0.map(g => g.label))} after ${JSON.stringify(g1.map(g => g.label))}`)
  // the rest of the unit is unchanged in number: the displaced trooper is behind now
  const total = gs => gs.filter(g => !g.isMount && !g.stomp).reduce((a, g) => a + g.n, 0)
  assert.ok(total(g1) <= total(g0))
})

test('nothing changes when nobody has joined', () => {
  const a = scene(); engage(a.game, a.rukkas, a.host, 'front')
  const b = scene(); engage(b.game, b.rukkas, b.host, 'front')
  assert.deepEqual(attackGroups(a.game, a.host, a.rukkas).map(g => [g.label, g.n]), attackGroups(b.game, b.host, b.rukkas).map(g => [g.label, g.n]))
})

test('an enemy touching only the left end: the general in the middle takes no place from those in contact', () => {
  const narrow = () => {
    const sc = scene(1)
    // a one-file Rukka Mob against the March Troops' left-most file (5 files of 25 mm, the unit centred on x 36)
    const w = sc.host.base.w
    sc.rukkas.pos = { x: 36 - 2 * w, y: 30 }
    return sc
  }
  const a = narrow(); engage(a.game, a.rukkas, a.host, 'front')
  const b = narrow(); assert.ok(join(b.game, b.gen, b.host, { deploying: true }).ok); engage(b.game, b.rukkas, b.host, 'front')
  const inContact = gs => count(gs, /in base contact/) + gs.filter(g => g.isChamp).length
  assert.equal(inContact(attackGroups(b.game, b.host, b.rukkas)), inContact(attackGroups(a.game, a.host, a.rukkas)))
  // but the fighting rank still has one place fewer for the unit's own models
  const rest = gs => count(gs, /more in the fighting rank/)
  assert.equal(rest(attackGroups(b.game, b.host, b.rukkas)), rest(attackGroups(a.game, a.host, a.rukkas)) - 1)
})

test('two characters take two front places, beside the command, never the command\'s own', () => {
  const { game, host, gen } = scene()
  const cap = fieldUnit(E, unitByNames(E, 'captain-of-the-realm', 1), 0)
  equip(cap); Object.assign(cap, { placed: true, pos: { x: 12, y: 10 }, facing: 0 })
  game.units.push(cap)
  assert.ok(join(game, gen, host, { deploying: true }).ok)
  assert.ok(join(game, cap, host, { deploying: true }).ok)
  const p = joinedPlaces(host)
  assert.equal(p.front.length, 2)
  assert.notEqual(p.front[0].file, p.front[1].file)
  for (const h of p.front) assert.equal(h.model.role, 'rank')
})

test('only the command group left: no rank and file to displace, so the character goes to the rear rank', () => {
  const { game, host, gen } = scene()
  for (const m of host.models.filter(m => m.role === 'rank')) m.wounds = 0
  assert.ok(join(game, gen, host, { deploying: true }).ok)
  const p = joinedPlaces(host)
  assert.equal(p.front.length, 0)
  assert.deepEqual(p.rear, [gen])
})

test('the general fights from his own place: an enemy touching only the far end gets no base-contact attacks from him', () => {
  const sc = scene(1)
  assert.ok(join(sc.game, sc.gen, sc.host, { deploying: true }).ok)
  const file = joinedPlaces(sc.host).front[0].file
  const w = sc.host.base.w
  // a one-file Rukka Mob against the end of the front farthest from his place
  const far = file >= 2 ? 0 : 4
  sc.rukkas.pos = { x: 36 + (far - 2) * w, y: 30 }
  engage(sc.game, sc.rukkas, sc.host, 'front')
  sc.gen.engagedWith = { ...sc.host.engagedWith }
  const gs = attackGroups(sc.game, sc.gen, sc.rukkas)
  assert.equal(count(gs, /in base contact/), 0, JSON.stringify(gs.map(g => g.label)))
  // squarely in front of him instead: in base contact
  const sc2 = scene(1)
  assert.ok(join(sc2.game, sc2.gen, sc2.host, { deploying: true }).ok)
  sc2.rukkas.pos = { x: 36 + (file - 2) * w, y: 30 }
  engage(sc2.game, sc2.rukkas, sc2.host, 'front')
  sc2.gen.engagedWith = { ...sc2.host.engagedWith }
  assert.ok(count(attackGroups(sc2.game, sc2.gen, sc2.rukkas), /in base contact/) >= 1)
})
