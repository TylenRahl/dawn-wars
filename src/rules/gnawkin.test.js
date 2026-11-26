// Gnawkin: Scurry Away, Wyrdstone Weapons, Weapon Teams and their parents, Too Horrible to Die, Cloud of Flies, the
// Lore of the Gnawing One, items and the list.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, distanceBetween } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip, saveFor, meleeWeaponOf, removeUnit } from './damage.js'
import { leadershipFor } from './leadership.js'
import { shootingTargets } from './shooting.js'
import { swapChoices } from './magic.js'
import { machineWeapon } from './warMachines.js'
import { scurries, wyrdstone, screenedTeam, tooHorribleToDie } from './gnawkin.js'

const S = 'gnawkin'
const field = (id, n, opts = {}, side = 1) => { const u = fieldUnit(S, unitByNames(S, id, n, opts), side); equip(u); return u }
const put = (u, x, y, facing, files) => { u.placed = true; u.pos = { x, y }; u.facing = facing; if (files) u.files = files }
const skGame = seed => createGame({ lists: [DEFAULT_LISTS[0], MORE_LISTS.find(l => l.army === S)], seed, terrain: false })

test('the default list is legal; Rankrats one per 1,000 points; one Weapon Team per Rankrats or Ironvermin', () => {
  assert.deepEqual(checkList(MORE_LISTS.find(l => l.army === S)).problems, [])
  const few = { army: S, points: 2000, units: [unitByNames(S, 'gnawkin-warlord', 1, { command: ['General'] }), unitByNames(S, 'rankrats', 20), unitByNames(S, 'weapon-team', 1), unitByNames(S, 'weapon-team', 1)] }
  const p = checkList(few).problems.join(' | ')
  assert.match(p, /at least 2 unit of Rankrats/)
  assert.match(p, /Weapon Team per unit/)
})

test('Scurry Away; Wyrdstone Weapons on a hand weapon', () => {
  assert.ok(scurries(field('rankrats', 20)))
  const w = field('gnawkin-warlord', 1)
  assert.ok(wyrdstone(w, meleeWeaponOf(w)))
})

test('a Weapon Team: a chatter gun shot as an organ gun; Leadership and cover from its parent within 3"', () => {
  const g = skGame(1)
  const wt = g.units.find(u => u.entryId === 'weapon-team' && /chatter/i.test(u.equipment))
  assert.equal(machineWeapon(wt).kind, 'organ')
  const rats = g.units.find(u => u.entryId === 'rankrats')
  put(rats, 30, 30, -Math.PI / 2, 10); put(wt, 37, 30, -Math.PI / 2)
  assert.ok(distanceBetween(rats, wt) <= 3)
  assert.match(leadershipFor(g, wt).from || '', /Rank Bonus/)
  assert.ok(screenedTeam(g, wt, distanceBetween))
  const hg = g.units.find(u => u.side === 0 && /handgun/i.test(u.equipment || ''))
  put(hg, 37, 10, Math.PI / 2, 5)
  const ts = shootingTargets(g, hg).map(t => t.unit)
  assert.ok(!ts.includes(wt) || ts[0] === wt)
})

test('Too Horrible to Die: the first time, a 6 brings the Abomination back', () => {
  let rose = false
  for (let seed = 1; seed <= 30 && !rose; seed++) {
    const g = skGame(seed)
    const h = g.units.find(u => u.entryId === 'warren-abomination')
    for (const m of h.models) m.wounds = 0
    rose = tooHorribleToDie(g, h)
    if (rose) assert.ok(h.models.some(m => m.wounds > 0))
    assert.equal(tooHorribleToDie(g, h), false) // only the first time
  }
  assert.ok(rose)
})

test('the Lore of the Gnawing One swap; items', () => {
  const g = skGame(2)
  const w = g.units.find(u => u.entryId === 'sparkwright')
  w.special.add('Lore of the Gnawing One')
  assert.ok(swapChoices(w).some(s => s.slug === 'wyrd-lightning'))
  assert.equal(saveFor(field('gnawkin-warlord', 1, { items: ['wyrdstone-amulet'] }), {}).ward, 4)
  assert.equal(saveFor(field('gnawkin-warlord', 1, { items: ['wyrdstone-amulet'] }), { magical: true }).ward, null)
})
