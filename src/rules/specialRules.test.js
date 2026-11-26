// A set of special rules: Loner, The Ladz, Feel No Pain, Poisoned Attacks, Move Through Cover,
// Ignore Nipper Panic. Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { fieldUnit } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip, saveFor } from './damage.js'
import { canJoin } from './joining.js'
import { checkMove } from './movement.js'
import { isNipperUnit, combatsToFight, fightCombat } from './combat.js'
import { engage } from './charge.js'

const E = 'concord-realm'
const O = 'rukka-firms'
const field = (army, id, n, opts = {}, side = 0) => { const u = fieldUnit(army, unitByNames(army, id, n, opts), side); equip(u); return u }

test('Loner: no joining a unit without it; The Ladz: an Iron Rukka boss for every Iron Rukka Mob', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  const herd = field(O, 'gloom-nipper-gobbler-hopper-mob', 5, {}, 1)
  const boss = field(O, 'gloom-nipper-top-lad', 1, {}, 1)
  assert.match(canJoin(g, boss, herd, { deploying: true }).reason, /Loner/)
  const two = { ...DEFAULT_LISTS[1], points: 3000, units: [...DEFAULT_LISTS[1].units, unitByNames(O, 'iron-rukka-mob', 10)] }
  assert.ok(checkList(two).problems.some(p => /The Ladz/.test(p)))
  assert.deepEqual(checkList(DEFAULT_LISTS[1]).problems, [])
})

test('Feel No Pain: 6+ Ward against non-magical attacks, 5+ against Strength 5 or more', () => {
  const f = field(E, 'flagellants', 10)
  assert.equal(saveFor(f, { strength: 3 }).ward, 6)
  assert.equal(saveFor(f, { strength: 5 }).ward, 5)
  assert.equal(saveFor(f, { strength: 5, magical: true }).ward, null)
})

test('Move Through Cover: no Movement lost to difficult terrain', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  startBattle(g, 1); beginTurn(g)
  for (const u of g.units) { u.placed = false; u.status.removed = false }
  const sp = field(O, 'nipper-spider-rider-mob', 5, {}, 1)
  g.units.push(sp)
  Object.assign(sp, { placed: true, pos: { x: 36, y: 10 }, facing: Math.PI / 2 })
  g.terrain = [{ id: 'w', kind: 'wood', poly: [{ x: 30, y: 12 }, { x: 42, y: 12 }, { x: 42, y: 20 }, { x: 30, y: 20 }] }]
  g.active = 1; g.sub = 'remaining'
  const M = sp.mount?.profile.M ?? 7
  assert.equal(checkMove(g, sp, [{ type: 'forward', d: M }]).ok, true)
})

test('Poisoned Attacks: natural 6s To Hit get +2 To Wound (logged); a Nipper unit is a Nipper unit', async () => {
  assert.equal(isNipperUnit(field(O, 'nipper-spider-rider-mob', 5, {}, 1)), true)
  assert.equal(isNipperUnit(field(O, 'rukka-mob', 10, {}, 1)), false)
  let seen = false
  for (let seed = 1; seed <= 12 && !seen; seed++) {
    const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
    const sp = field(O, 'nipper-spider-rider-mob', 10, {}, 1); g.units.push(sp)
    const halb = g.units.find(u => u.entryId === 'march-troops')
    for (const u of [sp, halb]) u.placed = true
    halb.pos = { x: 30, y: 30 }; halb.facing = -Math.PI / 2; halb.files = 10
    sp.pos = { x: 30, y: 30 }; sp.facing = Math.PI / 2; sp.files = 5
    startBattle(g, 1); beginTurn(g)
    engage(g, sp, halb, 'front')
    g.phase = 'combat'; g.sub = 'fight'
    await fightCombat(g, combatsToFight(g)[0], async (q, a) => a[a.length - 1][1])
    seen = g.log.some(l => /poisoned hit/.test(l.text))
  }
  assert.ok(seen)
})

test('Master of Battle, Zealot and Fanatical Zeal, Levies, Blessings of Varg', async () => {
  const { join } = await import('./joining.js')
  const { hasRule } = await import('./units.js')
  const { leadershipFor } = await import('./leadership.js')
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  const gm = field(E, 'grand-master', 1, { mount: 'Barded Warhorse' })
  const knights = field(E, 'realm-knights', 6)
  g.units.push(gm, knights)
  Object.assign(knights, { placed: true, pos: { x: 30, y: 40 } })
  Object.assign(gm, { placed: true, pos: { x: 30, y: 42 } })
  assert.equal(hasRule(knights, 'Immune to Psychology'), false)
  assert.equal(join(g, gm, knights, { deploying: true }).ok, true)
  assert.equal(hasRule(knights, 'Immune to Psychology'), true)
  const flag = field(E, 'flagellants', 10); const harb = field(E, 'harbinger-of-doom', 1); const cap = field(E, 'captain-of-the-realm', 1); const priest = field(E, 'priest-of-saint-halvar', 1)
  g.units.push(flag, harb, cap, priest)
  Object.assign(flag, { placed: true, pos: { x: 50, y: 40 } })
  for (const c of [harb, cap, priest]) Object.assign(c, { placed: true, pos: { x: 50, y: 42 } })
  assert.match(canJoin(g, cap, flag, { deploying: true }).reason, /Lector or Priest of Saint Halvar/)
  assert.equal(canJoin(g, harb, flag, { deploying: true }).ok, true)
  assert.equal(join(g, priest, flag, { deploying: true }).ok, true)
  assert.equal(hasRule(priest, 'Unbreakable'), true)
  const levy = field(E, 'freeholder-militia', 10)
  g.units.push(levy); Object.assign(levy, { placed: true, pos: { x: 10, y: 40 } })
  const gen = g.units.find(u => u.isGeneral && u.side === 0)
  Object.assign(gen, { placed: true, pos: { x: 14, y: 40 } })
  const halb = g.units.find(u => u.entryId === 'march-troops')
  Object.assign(halb, { placed: true, pos: { x: 18, y: 46 } })
  for (const m of halb.models) m.profile = { ...m.profile, Ld: 5 }
  assert.match(leadershipFor(g, halb).from || '', /Inspiring/) // an ordinary unit there uses the General's
  assert.doesNotMatch(leadershipFor(g, levy).from || '', /Inspiring/) // Levies do not
  const tg = field(E, 'greyfang-guard', 5)
  assert.equal(saveFor(tg).ward, null)
  assert.equal(saveFor(tg, { flaming: true }).ward, 6)
})
