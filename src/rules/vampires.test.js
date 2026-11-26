// Bloodsworn Courts: Necromantic Undead, Indomitable and the Wight Banner, the Death of a General, the Invocation of
// the Risen, The Newly Dead, Raise Dead, the Lore of Undeath, Wailing Dirge, items and Vampiric Powers.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule, distanceBetween, alive } from './units.js'
import { unitByNames, findEntry, itemChoices, checkList } from './roster.js'
import { equip, saveFor, applyWounds, removeUnit } from './damage.js'
import { canJoin } from './joining.js'
import { commandRange, leadershipTest } from './leadership.js'
import { swapChoices } from './magic.js'
import { effects as spellEffects, spellHits } from './spells.js'
import { unstableReduction, recoverWounds, invokeNehek, nehekTargets, crumble, wailingDirge, undeadMarchProblem } from './vampires.js'
import { SPELLS } from '../data/spells.js'

const V = 'bloodsworn-courts'
const field = (id, n, opts = {}, side = 1) => { const u = fieldUnit(V, unitByNames(V, id, n, opts), side); equip(u); return u }
const game = seed => createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
const put = (u, x, y, facing, files) => { u.placed = true; u.pos = { x, y }; u.facing = facing; if (files) u.files = files }
const vcGame = seed => createGame({ lists: [MORE_LISTS.find(l => l.army === V), DEFAULT_LISTS[0]], seed, terrain: false })

test('the default list is legal; the General must be a Wizard', () => {
  const l = MORE_LISTS.find(x => x.army === V)
  assert.deepEqual(checkList(l).problems, [])
  const bad = { army: V, points: 1500, units: [unitByNames(V, 'wight-king', 1), unitByNames(V, 'skeleton-warriors', 30)] }
  assert.ok(checkList(bad).problems.some(p => /a Wizard as the General/.test(p)))
})

test('Necromantic Undead: Fear, Immune to Psychology, Unbreakable, Unstable; no marching; joining only the Undead', () => {
  const sk = field('skeleton-warriors', 20)
  for (const r of ['Fear', 'Immune to Psychology', 'Unbreakable', 'Unstable']) assert.ok(hasRule(sk, r), r)
  const g = game(1)
  assert.match(undeadMarchProblem(g, sk) || '', /cannot march/)
  assert.equal(undeadMarchProblem(g, field('blood-count', 1)), null) // Dark Vitality
  const acolyte = field('necromantic-acolyte', 1)
  assert.ok(canJoin(g, acolyte, sk, { deploying: true }).ok)
  const concordRealm = g.units.find(u => u.entryId === 'march-troops')
  assert.match(canJoin(g, field('necromantic-acolyte', 1, {}, concordRealm.side), concordRealm, { deploying: true }).reason || '', /Undead/)
})

test('Indomitable reduces Unstable wounds; a Wight Lord BSB in Command range D3 instead if higher', () => {
  const g = vcGame(2)
  const gg = field('gravesworn-guard', 10)
  g.units.push(gg); put(gg, 10, 10, 0, 5)
  assert.equal(unstableReduction(g, gg, distanceBetween, commandRange).n, 1)
  const sk = field('skeleton-warriors', 20, {}, 0)
  g.units.push(sk); put(sk, 60, 40, 0, 5)
  const bsb = g.units.find(u => u.isBSB && u.side === 0)
  put(bsb, 60, 36, 0)
  const r = unstableReduction(g, sk, distanceBetween, commandRange)
  assert.ok(r.n >= 1 && r.n <= 3)
})

test('the Invocation of the Risen and The Newly Dead: Zombies grow past their starting size', () => {
  const g = vcGame(3)
  const z = g.units.find(u => u.entryId === 'zombies')
  const acolyte = g.units.find(u => u.entryId === 'necromantic-acolyte')
  g.active = z.side
  put(z, 30, 30, 0, 10); put(acolyte, 30, 36, 0)
  const before = z.models.length
  assert.equal(recoverWounds(g, z, 3, 40), 3)
  assert.equal(z.models.length, before + 3)
  applyWounds(g, z, 5, 'test')
  assert.ok(nehekTargets(g, acolyte, distanceBetween).includes(z))
  let got = 0
  for (let k = 0; k < 6 && !got; k++) { acolyte.status.nehekTurn = null; got = invokeNehek(g, acolyte, z, 1, () => 40) }
  assert.ok(got >= 2)
})

test('the Death of a General: the Undead lose Regeneration and test, losing a Wound for each point failed', () => {
  const g = vcGame(4)
  const gen = g.units.find(u => u.side === 0 && u.isGeneral)
  const sk = g.units.find(u => u.entryId === 'skeleton-warriors')
  put(sk, 30, 30, 0, 5); put(gen, 40, 40, 0)
  assert.ok(hasRule(sk, 'Regeneration'))
  for (const m of gen.models) m.wounds = 0
  removeUnit(g, gen, 'wiped out')
  assert.ok(!hasRule(sk, 'Regeneration'))
  const n = alive(sk).length
  crumble(g, 0, leadershipTest, applyWounds)
  assert.ok(alive(sk).length <= n)
  assert.match(g.log.map(l => l.text).join('\n'), /the Death of a General/)
})

test('the Lore of Undeath swap; Raise Dead brings 2D3 Risen Zombies that cannot charge this turn', async () => {
  const g = vcGame(5)
  const vc = g.units.find(u => u.entryId === 'blood-count')
  put(vc, 30, 30, 0)
  const slugs = swapChoices(vc).map(s => s.slug)
  for (const s of ['hellish-vigour', 'raise-dead', 'vespers-danse-macabre']) assert.ok(slugs.includes(s), s)
  const n0 = g.units.length
  await spellEffects.resolve(g, vc, SPELLS['raise-dead'], null, {})
  assert.equal(g.units.length, n0 + 1)
  const z = g.units.at(-1)
  assert.ok(z.models.length >= 2 && z.models.length <= 6 && hasRule(z, 'Unstable') && z.status.cannotCharge)
})

test('Wailing Dirge: a Leadership test at -2, a wound for each point failed, no Armour Roll', () => {
  let hurt = false
  for (let seed = 1; seed <= 12 && !hurt; seed++) {
    const g = game(seed)
    const b = field('tomb-banshee', 1)
    g.units.push(b); g.active = 1
    const t = g.units.find(u => u.side === 0 && u.entryId === 'march-troops')
    put(t, 30, 30, 0, 10); put(b, 30, 36, Math.PI)
    const n = alive(t).length
    wailingDirge(g, b, t, leadershipTest, spellHits)
    hurt = alive(t).length < n
  }
  assert.ok(hurt)
})

test('items and Vampiric Powers: within the allowance, their rules', () => {
  const e = findEntry(V, 'blood-count')
  const ch = itemChoices(V, e, unitByNames(V, 'blood-count', 1))
  assert.ok(ch.some(c => c.id === 'supernatural-horror' && !c.why))
  assert.ok(!itemChoices(V, findEntry(V, 'wight-king'), unitByNames(V, 'wight-king', 1)).some(c => c.id === 'supernatural-horror'))
  assert.ok(hasRule(field('blood-count', 1, { items: ['supernatural-horror'] }), 'Terror'))
  const cr = field('blood-count', 1, { items: ['crown-of-the-damned'] })
  assert.equal(saveFor(cr, {}).ward, 4)
  assert.ok(hasRule(cr, 'Stupidity'))
})
