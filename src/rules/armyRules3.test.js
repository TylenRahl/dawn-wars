// Concord Realm and Rukka & Nipper army rules, part three: the Iron Kettle, War Wagon, War Altar of Saint
// Halvar, Skyfire Rocket Battery, Flung Nipper, Breath Weapons, Pigeon Bombs, Troll Vomit, Mercenaries and Konrad
// von Falkenrode. Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, firstTurnWinner, strategist } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames } from './roster.js'
import { equip } from './damage.js'
import { checkMove, movementOf } from './movement.js'
import { steamPowerRoll, temperamental, isHalted } from './vehicles.js'
import { weaponChoices, breathe, pigeonBomb } from './specialShots.js'
import { machineShoot } from './warMachines.js'
import { commandRange, holyFervour, leadershipFor } from './leadership.js'
import { canJoin } from './joining.js'
import { misbehavingMercenaries } from './mercenaries.js'

const E = 'concord-realm'
const O = 'rukka-firms'
const field = (army, id, n, opts = {}, side = 0) => { const u = fieldUnit(army, unitByNames(army, id, n, opts), side); equip(u); return u }
const put = (g, u, x, y, facing) => { Object.assign(u, { placed: true, pos: { x, y }, facing }); g.units.push(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }
const logs = g => g.log.map(l => l.text).join('\n')

test('Iron Kettle: no marching; Steam Power adds the higher dice; Temperamental on a 1', () => {
  const g = empty(1)
  const st = put(g, field(E, 'iron-kettle', 1), 30, 30, -Math.PI / 2)
  g.active = 0; g.round = 2; g.phase = 'movement'; g.sub = 'remaining'
  assert.match(checkMove(g, st, [], { march: true }).reason, /cannot march/)
  const r = steamPowerRoll(g, st)
  assert.equal(r.kept, Math.max(...r.dice))
  st.status.steamBonus = r.kept
  assert.equal(movementOf(st), 4 + r.kept)
  const w = st.models[0].wounds
  assert.equal(temperamental(g, st, 1, 'bang'), false)
  assert.equal(st.models[0].wounds, w - 1)
  assert.equal(temperamental(g, st, 1, 'phweee'), true)
  assert.ok(isHalted(g, st))
  assert.match(checkMove(g, st, []).reason, /halted/)
  assert.deepEqual(weaponChoices(st).map(x => x.id), ['machine', 'breath'])
})

test('Breath Weapon: the Steam Gun allows no Armour Roll; once a round', () => {
  const g = empty(2)
  const st = put(g, field(E, 'iron-kettle', 1), 30, 30, -Math.PI / 2)
  const rukkas = put(g, field(O, 'rukka-mob', 20, {}, 1), 30, 24.5, Math.PI / 2)
  rukkas.files = 5
  g.active = 0; g.round = 2; g.phase = 'shooting'; g.sub = 'shoot'
  breathe(g, st, rukkas)
  assert.match(logs(g), /Steam Gun \(Breath Weapon, Strength 2, no Armour Roll\)/)
  assert.match(logs(g), /no Armour Roll allowed/)
  breathe(g, st, rukkas)
  assert.match(logs(g), /once a round/)
})

test('Steam Cannon shoots only into the front arc', async () => {
  const g = empty(3)
  const st = put(g, field(E, 'iron-kettle', 1), 30, 30, -Math.PI / 2)
  const behind = put(g, field(O, 'rukka-mob', 10, {}, 1), 30, 45, Math.PI / 2)
  g.active = 0; g.round = 2; g.phase = 'shooting'; g.sub = 'shoot'
  await machineShoot(g, st, behind, null)
  assert.match(logs(g), /front arc/)
})

test('Pigeon bombs: a roll on the table', () => {
  const g = empty(4)
  const eng = put(g, field(E, 'realm-engineer', 1, { options: ['Pigeon bombs'] }), 30, 30, -Math.PI / 2)
  const rukkas = put(g, field(O, 'rukka-mob', 10, {}, 1), 30, 15, Math.PI / 2)
  assert.ok(weaponChoices(eng).some(x => x.id === 'pigeon'))
  pigeonBomb(g, eng, rukkas)
  assert.match(logs(g), /Pigeon bomb at Rukka Mob: D6 = \d/)
})

test('Skyfire Rocket Battery: D3 rockets, no line of sight needed', async () => {
  const g = empty(5)
  const h = put(g, field(E, 'helstrom-rocket-battery', 1), 30, 40, -Math.PI / 2)
  const rukkas = put(g, field(O, 'rukka-mob', 20, {}, 1), 30, 15, Math.PI / 2)
  g.active = 0; g.round = 2; g.phase = 'shooting'; g.sub = 'shoot'
  await machineShoot(g, h, rukkas, null)
  assert.match(logs(g), /Skyfire: D3 = \d rocket/)
})

test('Flung Nipper: the template may be steered D3"', async () => {
  const g = empty(6)
  const dd = put(g, field(O, 'nipper-flinger', 1, {}, 1), 30, 5, Math.PI / 2)
  const st = put(g, field(E, 'march-troops', 20, {}, 0), 30, 40, -Math.PI / 2)
  g.active = 1; g.round = 2; g.phase = 'shooting'; g.sub = 'shoot'
  await machineShoot(g, dd, st, async (q, a) => a[a.length - 1][1])
  assert.match(logs(g), /Flung Nipper: D3 = \d"/)
})

test('War Altar of Saint Halvar: Holy Fervour, Symbol of Might, Witch Bane; War Wagon as a mount', () => {
  const g = empty(7)
  const lector = put(g, field(E, 'lector-of-saint-halvar', 1, { mount: 'War Altar of Saint Halvar' }), 30, 30, -Math.PI / 2)
  const st = put(g, field(E, 'march-troops', 20), 34, 30, -Math.PI / 2)
  assert.ok(holyFervour(g, st))
  assert.equal(commandRange(lector), 12)
  assert.ok(hasRule(lector, 'Witch Bane'))
  const eng = field(E, 'realm-engineer', 1, { mount: 'Realm War Wagon' })
  assert.ok(eng.crew.some(c => c.count === 6))
  assert.ok(weaponChoices(eng).some(x => x.id === 'crew'))
})

test('Mercenaries: no Inspiring Presence or joining, but with Konrad as General', () => {
  const g = empty(8)
  const ogres = put(g, field(E, 'crownsworn-ogres', 3), 30, 30, -Math.PI / 2)
  const cap = field(E, 'captain-of-the-realm', 1)
  assert.match(canJoin(g, cap, ogres, { deploying: true }).reason, /Mercenaries/)
  const konrad = put(g, field(E, 'general-konrad-von-lowenhacke', 1, { command: ['General'] }), 31, 26, -Math.PI / 2)
  konrad.isGeneral = true
  assert.ok(canJoin(g, konrad, ogres, { deploying: true }).ok)
  assert.match(leadershipFor(g, ogres).from || '', /Inspiring Presence/)
  konrad.isGeneral = false
  assert.doesNotMatch(leadershipFor(g, ogres).from || '', /Inspiring Presence/)
  misbehavingMercenaries(g)
  assert.match(logs(g), /Crownsworn Ogres \(Mercenaries\): D6 = \d/)
  assert.ok(strategist(g, 0))
  g.deploy.finishedFirst = null
  assert.equal(firstTurnWinner(g, { a: 3, b: 3 }, [1, 0]), 0)
  assert.equal(firstTurnWinner(g, { a: 3, b: 3 }, [0, 0]), null)
})
