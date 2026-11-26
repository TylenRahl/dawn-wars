// Skirmishers and chariots: where a charger meets a Skirmish unit, a free move's path, chariots
// and walls, and the Skirmishers -1 To Hit with a character joined. Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { contactPlacement } from './charge.js'
import { checkMove } from './movement.js'
import { chargePathTerrain } from './terrain.js'
import { centre, fieldUnit } from './units.js'
import { unitByNames } from './roster.js'
import { equip } from './damage.js'
import { skirmishersPenalty } from './shooting.js'

const setup = () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 5, terrain: false })
  startBattle(g, 1); beginTurn(g)
  // nothing was deployed, so every unit left the battle; each test puts back the ones it uses
  for (const u of g.units) { u.placed = false; u.status.removed = false; u.status.destroyed = null }
  return g
}

test('a charger meets a lone character on the side it comes from, not on its front', () => {
  const g = setup()
  const mage = g.units.find(u => u.entryId === 'master-mage')
  const rukkas = g.units.find(u => u.entryId === 'rukka-mob')
  assert.equal(mage.formation, 'skirmish')
  Object.assign(mage, { placed: true, pos: { x: 36, y: 20 }, facing: -Math.PI / 2 }) // faces up the table
  Object.assign(rukkas, { placed: true, pos: { x: 36, y: 30 }, facing: -Math.PI / 2 }) // behind it, facing it
  const place = contactPlacement(rukkas, mage, 'front')
  // the Rukkas stop just behind the mage (larger y), never jump past it to y < 20
  assert.ok(place.pos.y > centre(mage).y, `placed at y ${place.pos.y.toFixed(2)}`)
})

test("a Skirmisher's free move cannot pass through an enemy unit", () => {
  const g = setup()
  g.active = 1
  const mage = g.units.find(u => u.entryId === 'master-mage')
  const rukkas = g.units.find(u => u.entryId === 'rukka-mob')
  Object.assign(mage, { placed: true, pos: { x: 36, y: 34 }, facing: -Math.PI / 2 })
  Object.assign(rukkas, { placed: true, pos: { x: 32, y: 30 }, facing: Math.PI / 2, files: 10 })
  const across = checkMove(g, mage, [{ type: 'free', to: { x: 36, y: 25 }, facing: -Math.PI / 2 }])
  assert.equal(across.ok, false)
  assert.match(across.reason, /through Rukka Mob/)
  // a short move that stays clear of the mob is allowed
  assert.equal(checkMove(g, mage, [{ type: 'free', to: { x: 36, y: 34.5 }, facing: 0 }]).ok, true)
})

test('a chariot cannot charge across a wall, and one already against a wall may drive off it', () => {
  const g = setup()
  const ch = fieldUnit('rukka-firms', unitByNames('rukka-firms', 'nipper-wolf-chariot', 1), 1)
  equip(ch); g.units.push(ch)
  Object.assign(ch, { placed: true, pos: { x: 36, y: 30 }, facing: -Math.PI / 2 })
  g.terrain = [{ id: 'w1', kind: 'wall', poly: [{ x: 30, y: 25 }, { x: 42, y: 25 }, { x: 42, y: 25.3 }, { x: 30, y: 25.3 }] }]
  assert.equal(chargePathTerrain(g, ch, { pos: { x: 36, y: 20 }, facing: -Math.PI / 2 }).impassable, true)
  assert.equal(chargePathTerrain(g, ch, { pos: { x: 36, y: 27 }, facing: -Math.PI / 2 }).impassable, false)
  // parked across the wall: it may still back off it
  ch.pos = { x: 36, y: 25 }
  assert.equal(chargePathTerrain(g, ch, { pos: { x: 36, y: 31 }, facing: -Math.PI / 2 }).impassable, false)
})

test('Skirmishers -1 To Hit still applies with a Unit Mass 1 character joined', () => {
  const g = setup()
  const mage = g.units.find(u => u.entryId === 'master-mage')
  assert.equal(skirmishersPenalty(mage), true)
  const host = { formation: 'skirmish', models: [], joined: [mage], special: new Set(), troopType: ['Regular Infantry'], status: {} }
  host.models = [{ wounds: 1, profile: { W: 1 } }, { wounds: 1, profile: { W: 1 } }]
  assert.equal(skirmishersPenalty(host), true)
})
