// Sand Kings of Kheshet: Kheshite Undead, the Hierophant, Arise!, Arrows of Ishra, Khopesh, Dry as Dust, the Curse of
// the Necropolis, My Will Be Done, the Urn of Souls, the Lore of Kheshet, items and Incantation Scrolls.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule, alive, distanceBetween } from './units.js'
import { unitByNames, findEntry, itemChoices, checkList } from './roster.js'
import { equip, saveFor, meleeWeaponOf, rangedWeaponsOf, removeUnit } from './damage.js'
import { canJoin } from './joining.js'
import { leadershipTest } from './leadership.js'
import { swapChoices, boundSpellsOf } from './magic.js'
import { effects as spellEffects, spellHits, statModFor, addEffect } from './spells.js'
import { khopesh, dryAsDust, myWillBeDone, curseOfTheNecropolis, lightProtected } from './tombkings.js'
import { invokeNehek } from './vampires.js'
import { SPELLS } from '../data/spells.js'

const T = 'sand-kings-of-kheshet'
const field = (id, n, opts = {}, side = 1) => { const u = fieldUnit(T, unitByNames(T, id, n, opts), side); equip(u); return u }
const put = (u, x, y, facing, files) => { u.placed = true; u.pos = { x, y }; u.facing = facing; if (files) u.files = files }
const tkGame = seed => createGame({ lists: [MORE_LISTS.find(l => l.army === T), DEFAULT_LISTS[0]], seed, terrain: false })

test('the default list is legal; the Hierophant named on it', () => {
  assert.deepEqual(checkList(MORE_LISTS.find(l => l.army === T)).problems, [])
  const g = tkGame(1)
  assert.equal(g.units.find(u => u.isHierophant)?.entryId, 'mortuary-priest')
})

test('Kheshite Undead: the Undead rules; they join only their own kind', () => {
  const sk = field('skeleton-warriors', 20)
  for (const r of ['Fear', 'Immune to Psychology', 'Unbreakable', 'Unstable']) assert.ok(hasRule(sk, r), r)
  const g = tkGame(2)
  assert.ok(canJoin(g, field('royal-herald', 1), sk, { deploying: true }).ok)
  const vc = fieldUnit('bloodsworn-courts', unitByNames('bloodsworn-courts', 'necromantic-acolyte', 1), 1)
  assert.match(canJoin(g, vc, sk, { deploying: true }).reason || '', /Necromantic Undead/)
})

test('weapons: warbows for Skeleton Archers, Khopesh AP -1 on a hand weapon, the Wailing Skull Catapult', () => {
  assert.equal(rangedWeaponsOf(field('skeleton-archers', 10))[0].key, 'warbow')
  const k = field('sand-king', 1)
  assert.ok(khopesh(k, meleeWeaponOf(k)))
  assert.ok(!khopesh(k, { key: 'great weapon' }))
})

test('Dry as Dust: 4+ one more Wound for each unsaved flaming wound; not with the Relic of the Desert Sun', () => {
  const g = tkGame(3)
  const tk = field('sand-king', 1)
  let extra = 0
  for (let k = 0; k < 5; k++) extra += dryAsDust(g, tk, 4)
  assert.ok(extra > 0 && extra < 20)
  assert.equal(dryAsDust(g, field('sand-king', 1, { items: ['relic-of-the-desert-sun'] }), 4), 0)
})

test('the Hierophant falls: the Undead lose Regeneration and crumble', () => {
  const g = tkGame(4)
  const h = g.units.find(u => u.isHierophant)
  const sk = g.units.find(u => u.entryId === 'skeleton-warriors')
  put(h, 30, 30, 0); put(sk, 40, 30, 0, 5)
  for (const m of h.models) m.wounds = 0
  removeUnit(g, h, 'wiped out')
  assert.ok(!hasRule(sk, 'Regeneration'))
  assert.ok(g.vcFallen?.[h.side])
})

test('Arise!: a Grave Priest raises skeletons by its table; My Will Be Done', () => {
  const g = tkGame(5)
  const p = g.units.find(u => u.entryId === 'mortuary-priest')
  const sk = g.units.find(u => u.entryId === 'skeleton-warriors')
  g.active = p.side
  put(p, 30, 30, 0); put(sk, 30, 36, 0, 5)
  for (const m of sk.models.slice(0, 6)) m.wounds = 0
  let got = 0
  for (let k = 0; k < 6 && !got; k++) { p.status.nehekTurn = null; got = invokeNehek(g, p, sk, 2, () => 0) }
  assert.ok(got >= 3)
  const king = g.units.find(u => u.entryId === 'sand-king')
  put(king, 50, 30, 0)
  const wsOf = () => (king.crew?.[0] || king.models[0]).profile.WS
  const ws = wsOf()
  let moved = false
  for (let k = 0; k < 6 && !moved; k++) { king.status.willTurn = null; king.status.willOn = null; myWillBeDone(g, king, 'WS', statModFor, addEffect); moved = wsOf() === ws + 1 }
  assert.ok(moved)
})

test('the Curse of the Necropolis: the slayer tests Leadership; failed, D3 S2 hits', () => {
  let cursed = false
  for (let seed = 1; seed <= 20 && !cursed; seed++) {
    const g = tkGame(seed)
    const king = g.units.find(u => u.entryId === 'sand-king')
    const by = g.units.find(u => u.side === 1 && u.entryId === 'march-troops')
    put(by, 30, 30, 0, 10)
    g.combatKillerUnit = by; g.combatKiller = by.side // (while its blows are being struck)
    curseOfTheNecropolis(g, king, leadershipTest, spellHits)
    cursed = g.log.some(l => /The Curse of the Necropolis falls on/.test(l.text))
  }
  assert.ok(cursed)
})

test('the Urn of Souls: Light of Protection (6+ Ward, -1 to hit) and the Lore of Kheshet swap', async () => {
  const g = tkGame(6)
  const c = g.units.find(u => u.entryId === 'urn-of-souls')
  const sk = g.units.find(u => u.entryId === 'skeleton-warriors')
  put(c, 30, 30, 0); put(sk, 30, 40, 0, 5)
  assert.deepEqual(boundSpellsOf(c).map(b => b.slug).sort(), ['light-of-death', 'light-of-protection'])
  await spellEffects.resolve(g, c, SPELLS['light-of-protection'], c, {})
  assert.ok(lightProtected(g, sk, distanceBetween))
  const p = g.units.find(u => u.entryId === 'mortuary-priest')
  assert.ok(swapChoices(p).some(s => s.slug === 'incantation-of-desiccation'))
})

test('items and Incantation Scrolls: allowances, their rules', () => {
  const ch = itemChoices(T, findEntry(T, 'high-priest'), unitByNames(T, 'high-priest', 1))
  assert.ok(ch.some(c => c.id === 'warding-splint' && !c.why))
  assert.equal(saveFor(field('sand-king', 1, { items: ['the-scarab-brooch-of-nephrath'] }), {}).ward, 5)
  const too = { army: T, points: 2000, units: [unitByNames(T, 'sand-king', 1, { command: ['General'] }), unitByNames(T, 'mortuary-priest', 1, { items: ['scroll-of-urgency', 'scroll-of-withering', 'scroll-of-awakening'] }), unitByNames(T, 'skeleton-warriors', 20)] }
  assert.ok(checkList(too).problems.some(p => /at most 2 Incantation Scrolls/.test(p)))
})
