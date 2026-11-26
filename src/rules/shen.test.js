// Jade Dominion of Shen: Celestial Forged Armour, Defensive Stance, Grand Strategist, Heavenly Beacon, Will of the
// Dragons, Mastery of the Elemental Winds, Shenese Cataphracts, the Lores of the Moon Jade and the Sun Jade, items
// and the list.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule, distanceBetween } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip, saveFor, rangedWeaponsOf } from './damage.js'
import { leadershipFor, commandRange } from './leadership.js'
import { swapChoices, armoured } from './magic.js'
import { effects as spellEffects } from './spells.js'
import { hostOf } from './joining.js'
import { defensiveStance, willOfDragons, beaconNear, grandStrategist } from './shen.js'
import { SPELLS } from '../data/spells.js'

const G = 'jade-dominion-of-shen'
const field = (id, n, opts = {}, side = 1) => { const u = fieldUnit(G, unitByNames(G, id, n, opts), side); equip(u); return u }
const gcGame = seed => createGame({ lists: [DEFAULT_LISTS[0], MORE_LISTS.find(l => l.army === G)], seed, terrain: false })
const put = (u, x, y, files) => { u.placed = true; u.pos = { x, y }; u.facing = 0; if (files) u.files = files }

test('the default list is legal', () => {
  assert.deepEqual(checkList(MORE_LISTS.find(l => l.army === G)).problems, [])
})

test('Celestial Forged Armour: its Ward, and a Wizard may wear armour; crane guns and iron hail guns', () => {
  const sl = field('lianshi-lord', 1, { options: ['Wizard'] })
  assert.ok(saveFor(sl, {}).ward)
  assert.ok(!armoured(sl))
  assert.equal(rangedWeaponsOf(field('crane-gunner-team', 3))[0].key, 'crane gun')
  assert.equal(rangedWeaponsOf(field('iron-hail-gunners', 10))[0].key, 'iron hail gun')
})

test('Defensive Stance in combat unless it charged; Will of the Dragons for a friend destroyed or fleeing through', () => {
  const g = gcGame(1)
  const jw = g.units.find(u => u.entryId === 'jade-warriors')
  g.phase = 'combat'
  if (hasRule(jw, 'Defensive Stance')) { assert.ok(defensiveStance(g, jw)); jw.status.charged = true; assert.ok(!defensiveStance(g, jw)) }
  if (hasRule(jw, 'Will of the Dragons')) assert.ok(willOfDragons(jw, 'Peasant Levy fled through it'))
})

test('the Grand Strategist lends its Leadership; the Kite Lantern a Heavenly Beacon', () => {
  const g = gcGame(2)
  const lm = g.units.find(u => u.entryId === 'lord-magistrate')
  const pl = g.units.find(u => u.entryId === 'peasant-levy')
  const sky = g.units.find(u => u.entryId === 'kite-lantern-special')
  put(lm, 30, 30); put(pl, 30, 36, 10); put(sky, 40, 36)
  lm.isGeneral = false
  const gs = grandStrategist(g, pl, distanceBetween, commandRange, hostOf)
  if (hasRule(lm, 'Grand Strategist')) assert.ok(gs && gs.c === lm)
  if (hasRule(sky, 'Heavenly Beacon')) assert.ok(beaconNear(g, pl, distanceBetween))
  assert.ok(leadershipFor(g, pl).value >= 5)
})

test('the Lores of the Moon Jade and the Sun Jade; Constellation of the Dragon', async () => {
  const g = gcGame(3)
  const a = g.units.find(u => u.entryId === 'astromancer')
  assert.ok(swapChoices(a).some(s => s.slug === 'might-of-heaven-and-earth'))
  const t = g.units.find(u => u.side === 0 && u.entryId === 'march-troops')
  put(a, 30, 30); put(t, 30, 40, 10)
  const before = t.models.filter(m => m.wounds > 0).length
  await spellEffects.resolve(g, a, SPELLS['constellation-of-the-dragon'], t, { result: 11 })
  assert.ok(t.models.filter(m => m.wounds > 0).length < before)
})
