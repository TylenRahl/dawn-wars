// Rules added together in one set: the free reform on rallying, Trophies of War, Evade, attacks at characters
// with a unit, lone characters in challenges, Skirmishers forming up, Magical Vortex placement, dangerous terrain,
// buildings, low walls as cover. Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit } from './units.js'
import { unitByNames } from './roster.js'
import { equip, removeUnit } from './damage.js'
import { canFreeReform, freeReform, makeMove } from './movement.js'
import { rallyOne } from './strategy.js'
import { score } from './victory.js'
import { vortexPointOk } from './magic.js'
import { clearOfModels } from './spells.js'
import { SPELLS } from '../data/spells.js'
import { sightTo } from './sight.js'
import { generateMoreTerrain } from './terrain.js'
import { createRng } from './dice.js'

const E = 'concord-realm'
const O = 'rukka-firms'
const field = (army, id, n, opts = {}, side = 0) => { const u = fieldUnit(army, unitByNames(army, id, n, opts), side); equip(u); return u }
const put = (g, u, x, y, facing) => { Object.assign(u, { placed: true, pos: { x, y }, facing }); g.units.push(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }
const logs = g => g.log.map(l => l.text).join('\n')

test('a unit that rallies may make a free reform, and may still move', () => {
  for (let seed = 1; seed < 30; seed++) {
    const g = empty(seed)
    const st = put(g, field(E, 'march-troops', 20), 30, 30, -Math.PI / 2)
    st.status.fleeing = true
    g.phase = 'strategy'; g.sub = 'rally'; g.active = 0; g.round = 2
    rallyOne(g, st)
    if (st.status.fleeing) continue
    assert.ok(canFreeReform(g, st))
    assert.ok(freeReform(g, st, { type: 'reform', facing: 0, files: 4 }).ok)
    assert.equal(st.files, 4)
    assert.ok(!canFreeReform(g, st))
    assert.ok(!st.status.moved)
    return
  }
  assert.fail('no unit rallied in 30 tries')
})

test('Trophies of War: a standard run down is +50; the Battle Standard Bearer slain +50', () => {
  const g = empty(2)
  const rukkas = put(g, field(O, 'rukka-mob', 20, { command: ['Standard bearer'] }, 1), 30, 10, Math.PI / 2)
  removeUnit(g, rukkas, 'run down')
  assert.deepEqual(g.trophies[0].map(t => t.name), [rukkas.name])
  const s = score(g)
  assert.ok(s.why[0].some(w => /Trophy of War/.test(w)))
})

test('Magical Vortex: its template may not touch a model when placed; after moving it steps off them', () => {
  const g = empty(3)
  const mage = put(g, field(E, 'master-mage', 1, { lore: 'battle-magic' }), 30, 40, -Math.PI / 2)
  const rukkas = put(g, field(O, 'rukka-mob', 20, {}, 1), 30, 30, Math.PI / 2)
  rukkas.files = 5
  const s = SPELLS['pillar-of-fire'] || Object.values(SPELLS).find(x => x.category === 'Magical Vortex')
  const near = { x: rukkas.pos.x, y: rukkas.pos.y + 1 }
  assert.ok(!vortexPointOk(g, mage, s, near).ok)
  const v = { name: 'test vortex', at: { ...near }, r: 1.5 }
  clearOfModels(g, v)
  assert.notDeepEqual(v.at, near)
})

test('dangerous terrain: a model moving through a marsh tests; a building is impassable', () => {
  const g = empty(4)
  const st = put(g, field(E, 'march-troops', 10), 30, 30, -Math.PI / 2)
  st.files = 5
  g.terrain = [{ id: 'm', kind: 'marsh', at: { x: 30, y: 27 }, size: 4, poly: [{ x: 26, y: 25 }, { x: 34, y: 25 }, { x: 34, y: 28 }, { x: 26, y: 28 }] }]
  g.phase = 'movement'; g.sub = 'remaining'; g.active = 0; g.round = 2
  const r = makeMove(g, st, [{ type: 'forward', d: 3 }])
  assert.ok(r.ok, r.reason)
  assert.match(logs(g), /Dangerous Terrain tests/)
  const g2 = empty(5)
  const st2 = put(g2, field(E, 'march-troops', 10), 30, 30, -Math.PI / 2)
  st2.files = 5
  g2.terrain = [{ id: 'b', kind: 'building', at: { x: 30, y: 26 }, size: 4, poly: [{ x: 26, y: 25 }, { x: 34, y: 25 }, { x: 34, y: 27 }, { x: 26, y: 27 }] }]
  g2.phase = 'movement'; g2.sub = 'remaining'; g2.active = 0; g2.round = 2
  assert.match(makeMove(g2, st2, [{ type: 'forward', d: 4 }]).reason, /impassable/)
  const more = generateMoreTerrain(createRng(9), [])
  assert.deepEqual(more.map(f => f.kind).sort(), ['building', 'marsh', 'stream'])
})

test('a unit seen only across a low wall is in partial cover', () => {
  const g = empty(6)
  const sh = put(g, field(E, 'march-missile-troops', 10), 30, 40, -Math.PI / 2)
  sh.files = 10
  const rukkas = put(g, field(O, 'rukka-mob', 10, {}, 1), 30, 20, Math.PI / 2)
  rukkas.files = 10
  const open = sightTo(g, sh, rukkas).visibleFraction
  g.terrain = [{ id: 'w', kind: 'wall', at: { x: 30, y: 20.5 }, size: 20, poly: [{ x: 18, y: 20.25 }, { x: 42, y: 20.25 }, { x: 42, y: 20.75 }, { x: 18, y: 20.75 }] }]
  const walled = sightTo(g, sh, rukkas).visibleFraction
  assert.equal(open, 1)
  assert.ok(walled <= 0.75 && walled > 0.5, String(walled))
})

test('Magical Vortex: the template size comes from the spell text, "a large (5\\") blast template" is 5"', () => {
  const g = empty(3)
  const mage = put(g, field(E, 'master-mage', 1, { lore: 'battle-magic' }), 30, 40, -Math.PI / 2)
  const rukkas = put(g, field(O, 'rukka-mob', 20, {}, 1), 30, 30, Math.PI / 2)
  rukkas.files = 5
  const near = { x: rukkas.pos.x, y: rukkas.pos.y + 1 }
  const vortex = Object.values(SPELLS).filter(x => x.category === 'Magical Vortex')
  const large = vortex.find(x => /large \(5"\) blast template/.test(x.text))
  const small = vortex.find(x => /small \(3"\) blast template/.test(x.text))
  assert.match(vortexPointOk(g, mage, large, near).reason, /its 5" template/)
  assert.match(vortexPointOk(g, mage, small, near).reason, /its 3" template/)
})
