// Motley Crew per-model options and the Gobbler Herd (Gobblers Go Wild).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { fieldUnit } from './units.js'
import { unitByNames, unitCost, findEntry, checkList } from './roster.js'
import { equip, applyWounds } from './damage.js'
import { combatsToFight, fightCombat } from './combat.js'
import { engage } from './charge.js'

const O = 'rukka-firms'
const field = (id, n, opts) => { const u = fieldUnit(O, unitByNames(O, id, n, opts), 1); equip(u); return u }

test('per-model options cost per model and are checked against the unit', () => {
  const sel = unitByNames(O, 'iron-rukka-mob', 20, { counts: { 'Great weapons': 5, Shields: 10 } })
  const e = findEntry(O, 'iron-rukka-mob')
  assert.equal(unitCost(e, sel).total, unitCost(e, unitByNames(O, 'iron-rukka-mob', 20)).total + 5 * 2 + 10 * 1)
  const tooMany = { ...DEFAULT_LISTS[1], points: 3000, units: DEFAULT_LISTS[1].units.map(u => u.entryId === 'iron-rukka-mob' ? { ...u, counts: { ...u.counts, [e.options.findIndex(o => o.name === 'Great weapons')]: 15, [e.options.findIndex(o => o.name === 'Additional hand weapons')]: 10 } } : u) }
  assert.ok(checkList(tooMany).problems.some(p => /but only \d+ models/.test(p)))
})

test('a Gobbler Herd: Cave Gobblers and Gobbler Minders fight with their own profiles; casualties are shared', async () => {
  const herd = field('gloom-nipper-gobbler-herd', 10, { counts: { 'Gobbler Minder': 4 } })
  assert.equal(herd.models.filter(m => /Cave Gobbler/.test(m.name)).length, 10)
  assert.equal(herd.models.filter(m => /Minder/.test(m.name)).length, 4)
  const g = createGame({ lists: DEFAULT_LISTS, seed: 3, terrain: false })
  g.units.push(herd)
  applyWounds(g, herd, 4)
  assert.equal(herd.models.filter(m => m.wounds > 0 && /Minder/.test(m.name)).length, 4) // the most numerous kind first
  const halb = g.units.find(u => u.entryId === 'march-troops')
  for (const u of [herd, halb]) u.placed = true
  halb.pos = { x: 30, y: 30 }; halb.facing = -Math.PI / 2; halb.files = 10
  herd.pos = { x: 30, y: 30 }; herd.facing = Math.PI / 2; herd.files = 7
  startBattle(g, 1); beginTurn(g)
  engage(g, herd, halb, 'front')
  g.phase = 'combat'; g.sub = 'fight'
  await fightCombat(g, combatsToFight(g)[0], async (q, a) => a[a.length - 1][1])
  assert.match(g.log.map(l => l.text).join('\n'), /Cave Gobblers? in base contact/)
})

test('a broken Gobbler Herd goes wild: hits on every unit within 2D6", then it is gone', async () => {
  let wild = false
  for (let seed = 1; seed <= 40 && !wild; seed++) {
    const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
    const herd = field('gloom-nipper-gobbler-herd', 14, { counts: { 'Gobbler Minder': 1 } })
    g.units.push(herd)
    const gs = g.units.find(u => u.entryId === 'kingsblades')
    for (const u of [herd, gs]) u.placed = true
    gs.pos = { x: 30, y: 30 }; gs.facing = -Math.PI / 2; gs.files = 5
    herd.pos = { x: 30, y: 30 }; herd.facing = Math.PI / 2; herd.files = 6
    startBattle(g, 0); beginTurn(g)
    engage(g, gs, herd, 'front'); gs.status.charged = true; gs.status.chargeDistance = 4
    g.phase = 'combat'; g.sub = 'fight'
    await fightCombat(g, combatsToFight(g)[0], async (q, a) => a[a.length - 1][1])
    if (g.log.some(l => /THE GOBBLERS GO WILD/.test(l.text))) { wild = true; assert.equal(herd.status.removed, true) }
  }
  assert.ok(wild, 'no seed broke the herd')
})
