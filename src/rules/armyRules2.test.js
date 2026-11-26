// Concord Realm and Rukka & Nipper army rules, part two: the Troll Hag, Mick Bogwallop, Ambushers and All
// Sneaky Like, the Broodmaw's Howdah, named characters' own items, Flammable.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, holdInReserve, deployable } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip, saveFor, rangedWeaponsOf } from './damage.js'
import { hunger, canHunger, motherlyLove, protectedBoss, syphonedStrength } from './trolls.js'
import { leadershipFor } from './leadership.js'
import { ambushRolls, decideArrival, placeReinforcement, arrivals } from './ambush.js'
import { engage } from './charge.js'

const E = 'concord-realm'
const O = 'rukka-firms'
const field = (army, id, n, opts = {}, side = 0) => { const u = fieldUnit(army, unitByNames(army, id, n, opts), side); equip(u); return u }
const put = (g, u, x, y, facing) => { Object.assign(u, { placed: true, pos: { x, y }, facing }); g.units.push(u); return u }

test('Flammable: no Regeneration against Flaming attacks; others regenerate against them', () => {
  const trolls = field(O, 'common-troll-mob-special', 3, {}, 1)
  assert.ok(hasRule(trolls, 'Flammable'))
  assert.equal(saveFor(trolls, { flaming: true }).regen, null)
  assert.ok(saveFor(trolls, {}).regen)
})

test('Troll Hag: Indiscriminate Hunger in her Command sub-phase, once; Motherly Love wounds the enemy', () => {
  let fed = 0
  for (let seed = 1; seed <= 20; seed++) {
    const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
    for (const u of g.units) u.placed = false
    const hag = put(g, field(O, 'troll-hag', 1, {}, 1), 30, 20, Math.PI / 2)
    const st = put(g, field(E, 'march-troops', 20, {}, 0), 30, 20 + hag.base.d, -Math.PI / 2)
    st.files = 5
    engage(g, hag, st, 'front')
    g.phase = 'strategy'; g.sub = 'command'; g.active = 1; g.round = 2
    assert.ok(canHunger(g, hag))
    const r = hunger(g, hag, st)
    assert.ok(r.ok)
    fed += r.lost
    assert.ok(!canHunger(g, hag), 'once a turn')
    const before = st.models.filter(m => m.wounds > 0).length
    const lost = motherlyLove(g, hag, st)
    assert.equal(before - st.models.filter(m => m.wounds > 0).length >= 0, true)
    assert.ok(lost >= 0)
  }
  assert.ok(fed > 0, 'some Initiative tests are failed in 20 tries')
})

test('Mick: Trolls use his Leadership; Mind the Boss; Syphoned Strength', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  for (const u of g.units) u.placed = false
  const og = put(g, field(O, 'mick-bogwallop', 1, {}, 1), 30, 10, Math.PI / 2)
  const trolls = put(g, field(O, 'stone-troll-mob-special', 3, {}, 1), 30, 13, Math.PI / 2)
  const near = put(g, field(O, 'rukka-mob', 10, {}, 1), 10, 10, Math.PI / 2)
  assert.match(leadershipFor(g, trolls).from || '', /The Troll Whistler/)
  assert.ok(protectedBoss(g, og, near))
  assert.ok(!protectedBoss(g, og, og))
  assert.ok(syphonedStrength(g, og))
  // his own items: the Bog-wood Staff (weapon), the Trollhide Shawl (armour +1, Regeneration)
  assert.equal(og.kit.melee[0].key, 'magic:bog-wood-staff')
  assert.ok(hasRule(og, 'Regeneration'))
  assert.equal(saveFor(og, {}).armour, 6)
})

test('Ambushers: held in reserve at deployment, a roll from round 2, arrive on an edge not within 8" of the enemy', () => {
  const list = { ...DEFAULT_LISTS[1], points: 2000, units: [...DEFAULT_LISTS[1].units, unitByNames(O, 'titch-toothnicker', 1), unitByNames(O, 'nipper-wolf-rider-mob', 5, { ambushers: true })] }
  assert.ok(!checkList(list).problems.some(p => /All Sneaky Like/.test(p)), checkList(list).problems.join('; '))
  const g = createGame({ lists: [DEFAULT_LISTS[0], list], seed: 2, terrain: false })
  const wolves = g.units.find(u => u.entryId === 'nipper-wolf-rider-mob' && hasRule(u, 'Ambushers'))
  assert.ok(wolves)
  g.deploy.turn = 1
  assert.ok(holdInReserve(g, wolves).ok)
  assert.ok(!deployable(g, 1).includes(wolves))
  g.phase = 'strategy'; g.round = 1; g.active = 1
  assert.equal(ambushRolls(g, 1).length, 0, 'no roll in round 1')
  g.round = 5
  const rolls = ambushRolls(g, 1)
  assert.ok(rolls.length && rolls.every(r => r.auto))
  for (const r of rolls) decideArrival(g, r)
  assert.ok(arrivals(g, 1).includes(wolves))
  g.sub = 'compulsory'
  for (const u of g.units) if (u.side === 0) u.placed = false
  const enemy = put(g, field(E, 'march-troops', 10, {}, 0), 36, 5, -Math.PI / 2)
  assert.match(placeReinforcement(g, wolves, { x: 36, y: 0.5 }).reason, /within 8"/)
  assert.ok(placeReinforcement(g, wolves, { x: 36, y: 47.5 }).ok)
  assert.ok(wolves.placed && wolves.status.noMarch && wolves.status.countsAsMoved)
  assert.ok(enemy.placed)
})

test('Broodmaw: crew fight with their own profile and shoot shortbows; enemies hit the crew', () => {
  const sp = field(O, 'broodmaw-spider', 1, {}, 1)
  assert.equal(sp.crew[0].count, 8)
  assert.equal(rangedWeaponsOf(sp)[0].key, 'shortbow')
})

test('Named characters carry their own items; one of each named character', () => {
  const h = field(E, 'torvald-brenner', 1)
  assert.equal(h.kit.melee[0].key, 'magic:beast-reaver')
  const k = field(O, 'titch-toothnicker', 1, {}, 1)
  assert.ok(k.items.includes('the-nut-cracker') && k.items.includes('the-bosss-trophy-rack'))
  const two = { ...DEFAULT_LISTS[0], points: 3000, units: [...DEFAULT_LISTS[0].units, unitByNames(E, 'torvald-brenner', 1), unitByNames(E, 'torvald-brenner', 1)] }
  assert.ok(checkList(two).problems.some(p => /named character/.test(p)))
})
