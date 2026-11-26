// Broken Crowns: the Infamous Origins, the units' upgrades, its rules and war machines.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, checkList, findEntry, itemChoices } from './roster.js'
import { equip } from './damage.js'
import { machineWeapon } from './warMachines.js'
import { inCombatOrder, rankBonus } from './combat.js'
import { isMarchingColumn } from './movement.js'
import { feintAndDodge } from './renegade.js'

const R = 'broken-crowns'
const field = (id, n, opts = {}, side = 0) => { const u = fieldUnit(R, unitByNames(R, id, n, opts), side); equip(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }
const list = units => ({ name: 't', army: R, points: 2000, units })
const prince = (o = {}) => unitByNames(R, 'renegade-prince', 1, { command: ['General'], ...o })

test('a Renegade Prince is a character; an Origin gives its rules and characteristics', () => {
  const plain = field('renegade-prince', 1)
  assert.ok(plain.troopType.includes('Character'))
  const k = field('renegade-prince', 1, { options: ['The Renegade Knight'] })
  assert.equal(k.models[0].profile.WS, plain.models[0].profile.WS + 1)
  assert.equal(k.models[0].profile.S, plain.models[0].profile.S + 1)
  assert.ok(hasRule(k, 'Noble Disdain') && hasRule(k, 'Veteran'))
  const m = field('renegade-captain', 1, { options: ['The Might of Varezza'] })
  assert.ok(hasRule(m, 'Stubborn') && hasRule(m, 'Tilean Stoicism'))
  const o = field('renegade-captain', 1, { options: ['The Noble Outlaw'] })
  assert.ok(hasRule(o, '"Hold the Line!"'))
})

test('Origins: one only; their choices need them; they open Lyonnese or Concord Realm items', () => {
  const two = checkList(list([prince({ options: ['The Renegade Knight', 'The Noble Outlaw'] })]))
  assert.ok(two.problems.some(p => /only one of The Renegade Knight, The Noble Outlaw/.test(p)), two.problems.join('; '))
  const gun = checkList(list([prince({ options: ['Handgun'] })]))
  assert.ok(gun.problems.some(p => /Handgun only with The Noble Outlaw/.test(p)))
  const e = findEntry(R, 'renegade-prince')
  const ids = sel => itemChoices(R, e, sel).map(c => c.item.army)
  assert.ok(!ids(prince()).includes('kingdom-of-lyonne'))
  assert.ok(ids(prince({ options: ['The Renegade Knight'] })).includes('kingdom-of-lyonne'))
  assert.ok(ids(prince({ options: ['The Noble Outlaw'] })).includes('concord-realm'))
})

test('unit upgrades: one per Origin character; Phalanx deep still in Combat Order', () => {
  const ph = unitByNames(R, 'sellsword-infantry', 20, { options: ['Heavy Infantry, Phalanx'] })
  assert.ok(checkList(list([prince(), ph])).problems.some(p => /Phalanx/.test(p)))
  assert.ok(!checkList(list([prince({ options: ['The Might of Varezza'] }), ph])).problems.some(p => /Phalanx/.test(p)))
  const u = field('sellsword-infantry', 20, { options: ['Heavy Infantry, Phalanx'] })
  assert.ok(u.troopType.includes('Heavy Infantry'))
  const g = empty(1)
  u.files = 4 // 5 ranks of 4: deeper than wide, but enough a rank for a rank bonus (Heavy Infantry: 4)
  assert.ok(inCombatOrder(u) && !isMarchingColumn(u))
  assert.ok(rankBonus(g, u) > 0)
  const plain = field('sellsword-infantry', 20); plain.files = 4
  assert.ok(!inCombatOrder(plain) && isMarchingColumn(plain))
})

test('limits: at most one Renegade Prince and one Organ Gun or Bombard for each 1,000 points', () => {
  const p = checkList({ ...list([prince(), unitByNames(R, 'renegade-prince', 1), unitByNames(R, 'renegade-prince', 1)]), points: 2000 })
  assert.ok(p.problems.some(x => /Renegade Prince/.test(x)))
  const w = checkList({ ...list([prince(), unitByNames(R, 'marchlords-organ-gun', 1), unitByNames(R, 'marchlord-bombard', 1)]), points: 1500 })
  assert.ok(w.problems.some(x => /Organ Gun or Bombard/.test(x)))
})

test('war machines: the Organ Gun shoots Multi-Barrelled, the Bombard as a cannon', () => {
  assert.equal(machineWeapon(field('marchlords-organ-gun', 1)).kind, 'organ')
  const b = machineWeapon(field('marchlord-bombard', 1))
  assert.equal(b.kind, 'cannon'); assert.equal(b.misfireTable, 'bombard')
  assert.equal(machineWeapon(field('marchlord-mortar', 1)).kind, 'bombard')
})

test('Feint & Dodge: once per game; Brigands with +1 Weapon Skill have it', () => {
  const g = empty(2)
  const d = field('renegade-captain', 1, { options: ['The Wandering Diestro'] })
  assert.ok(feintAndDodge(g, d))
  assert.ok(!feintAndDodge(g, d))
  const br = field('marchlord-brigands', 15, { options: ['+1 to Weapon Skill'] })
  assert.ok(hasRule(br, 'Feint & Dodge'))
  assert.equal(br.models[0].profile.WS, 4)
})

test('Tilean Stoicism: the joined unit is Stubborn until the character\'s first Break test', () => {
  const st = field('sellsword-infantry', 20)
  const c = field('renegade-captain', 1, { options: ['The Might of Varezza'] })
  st.joined = [c]
  assert.ok(hasRule(st, 'Stubborn'))
  c.status.brokeTested = true
  assert.ok(!hasRule(st, 'Stubborn'))
})
