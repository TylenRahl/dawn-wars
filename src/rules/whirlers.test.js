// Gloom Nipper Whirlers (Release the Whirlers!, Whirler Ball and Chain).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle, onTable } from './game.js'
import { beginTurn } from './turn.js'
import { unitByNames, checkList, unitCost, findEntry, armyEntries } from './roster.js'
import { canRelease, releaseWhirler, moveWhirler, isWhirler } from './whirlers.js'
import { canDeclareCharge } from './charge.js'
import { checkMove, makeMove } from './movement.js'
import { centre } from './units.js'

const O = 'rukka-firms'
const withWhirlers = n => DEFAULT_LISTS.map(l => l.army !== O ? l : { ...l, units: l.units.map(u => u.entryId === 'gloom-nipper-mob' ? { ...u, whirlers: n } : u) })

test('Whirlers are bought with a Gloom Nipper Mob: one per 10 Gloom Nippers, at most 3, 25 points each', () => {
  assert.ok(!armyEntries(O).some(e => e.id === 'whirlers'))
  const mob = unitByNames(O, 'gloom-nipper-mob', 20, { whirlers: 2 })
  assert.equal(unitCost(findEntry(O, 'gloom-nipper-mob'), mob).total, unitCost(findEntry(O, 'gloom-nipper-mob'), { ...mob, whirlers: 0 }).total + 50)
  const list = { ...DEFAULT_LISTS[1], points: 3000, units: [...DEFAULT_LISTS[1].units, unitByNames(O, 'gloom-nipper-mob', 20, { whirlers: 3 })] }
  assert.ok(checkList(list).problems.some(p => /at most 2 Whirlers/.test(p)))
})

const battle = (seed = 3) => {
  const g = createGame({ lists: withWhirlers(2), seed, terrain: false })
  const mob = g.units.find(u => u.entryId === 'gloom-nipper-mob')
  const halb = g.units.find(u => u.entryId === 'march-troops')
  Object.assign(mob, { placed: true, pos: { x: 36, y: 14 }, facing: Math.PI / 2, files: 7 })
  Object.assign(halb, { placed: true, pos: { x: 36, y: 24 }, facing: -Math.PI / 2, files: 10 })
  startBattle(g, 1); beginTurn(g)
  g.sub = 'start'
  return { g, mob, halb }
}

test('a Whirler is released within 3" of its mob, cannot be charged, and does not move in Remaining Moves', () => {
  const { g, mob, halb } = battle()
  assert.equal(mob.whirlersHidden, 2)
  assert.equal(canRelease(g, mob).ok, true)
  assert.equal(releaseWhirler(g, mob, { x: 36, y: 18.5 }).ok, false) // too far (the mob's front is at y 14)
  const r = releaseWhirler(g, mob, { x: 36, y: 16 })
  assert.equal(r.ok, true, r.reason)
  assert.equal(mob.whirlersHidden, 1)
  const f = r.whirler
  assert.ok(isWhirler(f) && onTable(g).includes(f))
  assert.equal(canDeclareCharge(g, halb, f).ok, false)
  assert.match(checkMove(g, f, [{ type: 'forward', d: 1 }]).reason, /Compulsory/)
})

test('a Whirler spins through a unit, hitting it with D6 Strength 5 AP -3 hits, and ends clear of it', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const { g, mob, halb } = battle(seed)
    const f = releaseWhirler(g, mob, { x: 36, y: 16 }).whirler
    const before = halb.status.woundsTaken || 0
    const r = moveWhirler(g, f, Math.PI / 2) // straight down the table at the halberdiers
    const text = g.log.map(l => l.text).join('\n')
    if (r.distance >= 8) { // far enough to reach them (8" from the Whirler's centre)
      assert.ok(r.victims.includes(halb), `seed ${seed}: ${r.distance}"`)
      assert.match(text, /Strength 5 hits, AP -3/)
      if (!f.status.removed) assert.ok(centre(f).y > 27.4, `seed ${seed}: ended at ${centre(f).y}`)
    }
    assert.ok((halb.status.woundsTaken || 0) >= before)
  }
})

test('a unit that moves through a Whirler suffers its hits; a double or another Whirler removes it', () => {
  const { g, mob, halb } = battle(5)
  const f = releaseWhirler(g, mob, { x: 36, y: 16 }).whirler
  f.pos = { x: 36, y: 22 } // just in front of the halberdiers
  g.active = 0; g.sub = 'remaining'
  halb.status.moved = false
  const chk = makeMove(g, halb, [{ type: 'forward', d: 3 }])
  assert.equal(chk.ok, true, chk.reason)
  assert.match(g.log.map(l => l.text).join('\n'), /moves through a Whirler/)
  // two Whirlers meeting are both removed
  g.active = 1; g.sub = 'start'
  const f2 = releaseWhirler(g, mob, { x: 33, y: 16 }).whirler
  if (f2 && !f.status.removed) {
    f.pos = { x: 33, y: 19 }
    moveWhirler(g, f2, Math.PI / 2)
    assert.ok(f.status.removed || f2.status.removed)
  }
})

test('a charge through a Whirler takes its hits; Whirlers score no victory points', async () => {
  const { score } = await import('./victory.js')
  const { sweptThroughWhirlers } = await import('./whirlers.js')
  const { g, mob, halb } = battle(8)
  const f = releaseWhirler(g, mob, { x: 36, y: 16 }).whirler
  f.pos = { x: 36, y: 21 }
  const from = { pos: { ...halb.pos }, facing: halb.facing }
  halb.pos = { x: 36, y: 18.5 } // as if it had charged up the table past the Whirler
  sweptThroughWhirlers(g, halb, from)
  assert.match(g.log.map(l => l.text).join('\n'), /March Troops moves through a Whirler/)
  f.status.removed = true
  assert.ok(!score(g).why[0].some(w => /Whirler/.test(w)))
})
