// The Unmade: their Ward and universal rules, Unmade Instability, Unmade Alignment joining and Hatred,
// the gods' marks, the Lore of the Unmade, Unmade Gifts and Icons, and the list. Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, findEntry, itemChoices, checkList } from './roster.js'
import { equip, saveFor, meleeWeaponOf, applyWounds, removeUnit } from './damage.js'
import { canJoin } from './joining.js'
import { swapChoices } from './magic.js'
import { unmadeInstability, godOf } from './unmade.js'

const DC = 'the-unmade'
const field = (id, n, opts = {}, side = 1) => { const u = fieldUnit(DC, unitByNames(DC, id, n, opts), side); equip(u); return u }
const dcGame = seed => createGame({ lists: [DEFAULT_LISTS[0], MORE_LISTS.find(l => l.army === DC)], seed, terrain: false })

test('the default list is legal; Wrath core needs a General of Wrath', () => {
  assert.deepEqual(checkList(MORE_LISTS.find(l => l.army === DC)).problems, [])
  const wrong = { army: DC, points: 1500, units: [unitByNames(DC, 'unmade-herald-of-endurance', 1, { command: ['General'] }), unitByNames(DC, 'gorehewers-of-wrath', 20), unitByNames(DC, 'rotbearers-of-endurance', 20)] }
  assert.ok(checkList(wrong).problems.some(p => /General an Unmade of Wrath/.test(p)))
})

test('Unmade: a 5+ Ward against non-magical attacks and the universal rules; Hatred of the rival god; hellblades', () => {
  const b = field('gorehewers-of-wrath', 10)
  assert.equal(saveFor(b, {}).ward, 5)
  assert.equal(saveFor(b, { magical: true }).ward, null)
  for (const r of ['Fear', 'Immune to Psychology', 'Unbreakable', 'Magical Attacks', 'Unmade Instability']) assert.ok(hasRule(b, r), r)
  assert.equal(godOf(b), 'Wrath')
  assert.ok(hasRule(b, 'Hatred (Unmade of Rapture)'))
  assert.equal(meleeWeaponOf(b).key, 'hellblade')
})

test('Unmade Alignment: a Herald of Endurance cannot join Gorehewers', () => {
  const g = dcGame(1)
  assert.match(canJoin(g, field('unmade-herald-of-endurance', 1), field('gorehewers-of-wrath', 10), { deploying: true }).reason || '', /Unmade of Endurance/)
  assert.ok(canJoin(g, field('unmade-herald-of-wrath', 1), field('gorehewers-of-wrath', 10), { deploying: true }).ok)
})

test('Unmade Instability: a failed test costs Wounds; a natural double 6 removes the unit', () => {
  let lost = false; let gone = false
  for (let seed = 1; seed <= 80 && !(lost && gone); seed++) {
    const g = dcGame(seed)
    const u = g.units.find(x => x.entryId === 'gorehewers-of-wrath')
    const n = u.models.filter(m => m.wounds > 0).length
    unmadeInstability(g, u, 3, applyWounds, removeUnit)
    if (u.status.removed) gone = true
    else if (u.models.filter(m => m.wounds > 0).length < n) lost = true
  }
  assert.ok(lost && gone)
})

test('the Lore of the Unmade offers its own god\'s spells; Unmade Gifts by god', () => {
  const g = dcGame(2)
  const h = field('unmade-herald-of-cipher', 1, { options: ['Wizard'] })
  g.units.push(h)
  h.wizard = { level: 1, lore: 'unmade-rites', spells: [], castThisTurn: [], attempts: 0 }
  const slugs = swapChoices(h).map(s => s.slug)
  if (hasRule(h, 'Lore of the Unmade')) { assert.ok(slugs.includes('gleeful-fire')); assert.ok(!slugs.includes('plague-wind')) }
  const wrath = itemChoices(DC, findEntry(DC, 'unmade-herald-of-wrath'), unitByNames(DC, 'unmade-herald-of-wrath', 1))
  assert.ok(wrath.some(c => c.id === 'might-of-wrath'))
  assert.ok(!wrath.some(c => c.id === 'twin-heads'))
})

test('an Unmade of Wrath hates the Unmade of Rapture, not the Unmade of Endurance', async () => {
  const { hates } = await import('./orders.js')
  const { rulesOf } = await import('./units.js')
  const b = field('gorehewers-of-wrath', 10)
  assert.ok(hates(rulesOf(b), field('enthrallers-of-rapture', 10, {}, 0)))
  assert.ok(!hates(rulesOf(b), field('rotbearers-of-endurance', 10, {}, 0)))
})
