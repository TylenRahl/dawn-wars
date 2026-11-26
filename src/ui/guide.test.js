// The "What now?" guide: what it lists in each step, and that asking every unit what it could do changes nothing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from '../rules/testLists.js'
import { createGame, deployUnit, startBattle, whoDeploys, deployable, deployZone } from '../rules/game.js'
import { beginTurn, nextStep } from '../rules/turn.js'
import { summariseActions, STEP_HELP } from './guide.js'
import { SUB_NAMES } from '../rules/turn.js'

// every unit put down on a grid inside its zone; characters join the first unit that takes them
function deployAll (g) {
  for (let i = 0; i < 200 && whoDeploys(g) != null; i++) {
    const side = whoDeploys(g)
    const u = deployable(g, side)[0]
    const z = deployZone(g, side)
    const xs = z.map(p => p.x); const ys = z.map(p => p.y)
    let ok = false
    if ((u.troopType || []).includes('Character')) for (const h of g.units.filter(h => h.side === side && h.placed && !(h.troopType || []).includes('Character'))) if (!ok) ok = deployUnit(g, u, { joinHost: h }).ok
    for (let y = Math.min(...ys) + 2; y < Math.max(...ys) && !ok; y += 2) for (let x = Math.min(...xs) + 3; x < Math.max(...xs) && !ok; x += 2) ok = deployUnit(g, u, { pos: { x, y }, facing: side === 0 ? -Math.PI / 2 : Math.PI / 2 }).ok
    assert.ok(ok, `could not deploy ${u.name}`)
  }
}
const snapshot = g => JSON.stringify(g.units.map(u => [u.id, u.pos, u.facing, u.status, u.models.map(m => m.wounds)])) + g.log.length + JSON.stringify(g.effects || [])

test('every step has help text', () => {
  for (const k of Object.keys(SUB_NAMES)) assert.ok(STEP_HELP[k], k)
  assert.ok(STEP_HELP.deploy)
})

test('Remaining moves lists units that can Move; Shoot lists the shooters; asking changes nothing', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 4, terrain: false })
  deployAll(g)
  startBattle(g, 0)
  beginTurn(g)
  const ui = { game: g, busy: false, fighting: false, actions: [], selected: null }
  for (let i = 0; i < 12 && g.sub !== 'remaining'; i++) nextStep(g)
  assert.equal(g.sub, 'remaining')
  const before = snapshot(g)
  const rows = summariseActions(ui)
  assert.equal(snapshot(g), before, 'the guide changed the game')
  assert.ok(rows.length > 0)
  assert.ok(rows.every(r => r.unit.side === g.active))
  assert.ok(rows.some(r => r.what.includes('Move')))
  nextStep(g)
  assert.equal(g.sub, 'shoot')
  const shots = summariseActions(ui)
  assert.ok(shots.some(r => r.what.some(w => /^Shoot/.test(w))), JSON.stringify(shots.map(r => [r.unit.name, r.what])))
})

test('in every step of two turns, the guide only reads', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 7, terrain: false })
  deployAll(g)
  startBattle(g, 1)
  beginTurn(g)
  const ui = { game: g, busy: false, fighting: false, actions: [], selected: null }
  const seen = new Set()
  for (let i = 0; i < 24 && g.phase !== 'over'; i++) {
    const before = snapshot(g)
    summariseActions(ui)
    assert.equal(snapshot(g), before, `the guide changed the game in ${g.sub}`)
    seen.add(g.sub)
    nextStep(g)
  }
  assert.ok(seen.size >= 8, [...seen].join(','))
})
