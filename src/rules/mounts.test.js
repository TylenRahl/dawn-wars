// Characters on ridden monsters and on the Giant Cave Gobbler, and the Fly rule.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip, saveFor } from './damage.js'
import { checkMove, flyMovement, movementOf } from './movement.js'
import { maxChargeRange } from './charge.js'
import { canJoin } from './joining.js'
import { hasRandomMovement } from './randomMovement.js'

const E = 'concord-realm'
const O = 'rukka-firms'
const field = (army, id, opts, side = 0) => { const u = fieldUnit(army, unitByNames(army, id, 1, opts), side); equip(u); return u }

test('a General on a Royal Griffon: a behemoth in Close Order, its Toughness and Wounds raised, the better save', () => {
  const g = field(E, 'general-of-the-realm', { mount: 'Griffon', armor: 'Light armour' })
  assert.equal(g.category, 'monster')
  assert.deepEqual(g.troopType, ['Behemoth', 'Character'])
  assert.equal(g.formation, 'close')
  assert.equal(g.models[0].profile.W, 3 + 4)
  assert.equal(g.models[0].profile.T, 4 + 1)
  assert.ok(hasRule(g, 'Large Target') && hasRule(g, 'Terror'))
  assert.equal(movementOf(g), 6)
  assert.equal(flyMovement(g), 9)
  assert.equal(saveFor(g).armour, 5) // the griffon's pelt (heavy armour) beats light armour
  const list = { ...DEFAULT_LISTS[0], points: 3000, units: [...DEFAULT_LISTS[0].units, unitByNames(E, 'general-of-the-realm', 1, { mount: 'Griffon' })] }
  assert.ok(!checkList(list).problems.some(p => /not playable/.test(p)))
})

test('a Rukka Gaffer on a Wyvern and a Gloom Nipper Gaffer on a Giant Cave Gobbler', () => {
  const w = field(O, 'rukka-gaffer', { mount: 'Wyvern' }, 1)
  assert.deepEqual(w.troopType, ['Monstrous Creature', 'Character'])
  assert.equal(flyMovement(w), 9)
  const s = field(O, 'gloom-nipper-gaffer', { mount: 'Giant Cave Gobbler' }, 1)
  assert.equal(hasRandomMovement(s), true)
  assert.equal(movementOf(s), 0)
})

test('flying: over a unit in the way, its Fly Movement, the charge range, and no joining a unit that cannot fly', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 2, terrain: false })
  startBattle(g, 0); beginTurn(g)
  for (const u of g.units) { u.placed = false; u.status.removed = false }
  const gen = field(E, 'general-of-the-realm', { mount: 'Pegasus' })
  g.units.push(gen)
  const rukkas = g.units.find(u => u.entryId === 'rukka-mob')
  const halb = g.units.find(u => u.entryId === 'march-troops')
  Object.assign(gen, { placed: true, pos: { x: 36, y: 40 }, facing: -Math.PI / 2 })
  Object.assign(rukkas, { placed: true, pos: { x: 32, y: 37 }, facing: Math.PI / 2, files: 10 }) // 34" to 37", across its path
  Object.assign(halb, { placed: true, pos: { x: 10, y: 40 }, facing: -Math.PI / 2 })
  g.sub = 'remaining'
  const over = [{ type: 'forward', d: 10 }]
  assert.equal(checkMove(g, gen, over).ok, false)
  const fly = checkMove(g, gen, over, { fly: true })
  assert.equal(fly.ok, true, fly.reason + JSON.stringify(gen.status))
  assert.equal(fly.allowance, 10)
  assert.equal(maxChargeRange(gen, g), 10 + 6 + 3) // Fly 10 + 6, Swiftstride +3
  assert.match(canJoin(g, gen, halb, { deploying: true }).reason, /Fly/)
})

test('a character on a chariot: its Wounds added, the higher Toughness, the better armour, and it fights with its own weapon', async () => {
  const { combatsToFight, fightCombat } = await import('./combat.js')
  const { engage } = await import('./charge.js')
  const w = field(O, 'rukka-gaffer', { mount: 'Boar Chariot', command: ['General'] }, 1)
  assert.equal(w.category, 'chariot')
  assert.deepEqual(w.troopType, ['Heavy Chariot', 'Character'])
  assert.equal(w.models[0].wounds, 4 + 3)
  assert.equal(w.models[0].profile.T, 5)
  assert.equal(saveFor(w).armour, 4)
  assert.equal(w.crew[0].character, true)
  const g = createGame({ lists: DEFAULT_LISTS, seed: 4, terrain: false })
  g.units.push(w)
  const halb = g.units.find(u => u.entryId === 'march-troops')
  for (const u of [w, halb]) u.placed = true
  halb.pos = { x: 30, y: 30 }; halb.facing = -Math.PI / 2; halb.files = 10
  w.pos = { x: 30, y: 30 }; w.facing = Math.PI / 2
  startBattle(g, 1); beginTurn(g)
  engage(g, w, halb, 'front'); w.status.charged = true; w.status.chargeDistance = 6
  g.phase = 'combat'; g.sub = 'fight'
  await fightCombat(g, combatsToFight(g)[0], async (q, a) => a[a.length - 1][1])
  assert.match(g.log.map(l => l.text).join('\n'), /Rukka Gaffer \(Hand weapon\)|Initiative \d+: Rukka Gaffer — Rukka Gaffer/)
})

test("a chariot rider keeps its items' bonuses on its own profile; Toughness is the higher of the two, counted once", () => {
  const w = field(O, 'rukka-gaffer', { mount: 'Boar Chariot', armor: 'Heavy armour', items: ['tommos-best-basher', 'dead-ard-clobba'] }, 1)
  assert.equal(w.crew[0].profile.WS, 6 + 1)
  assert.equal(w.crew[0].profile.I, 5 + 1)
  assert.equal(w.models[0].profile.T, 6) // max(chariot 5, Gaffer 5 + 1 for Dead 'Ard Clobba), not 5 + 1 on top of the chariot's
})
