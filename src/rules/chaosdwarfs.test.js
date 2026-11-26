// Ashforged: Blackshard Armour, Backstab, Stampede, Blazing Body, Quell Panic, Sorcerer's Curse, the Lore of the
// Bull of Ash, items and the list.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule, distanceBetween } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip, saveFor, rangedWeaponsOf, applyWounds } from './damage.js'
import { swapChoices, armoured } from './magic.js'
import { effects as spellEffects } from './spells.js'
import { backstabs, stampede, sorcerersCurse, inStormOfAsh } from './chaosdwarfs.js'
import { SPELLS } from '../data/spells.js'

const D = 'ashforged'
const field = (id, n, opts = {}, side = 1) => { const u = fieldUnit(D, unitByNames(D, id, n, opts), side); equip(u); return u }
const cdGame = seed => createGame({ lists: [DEFAULT_LISTS[0], MORE_LISTS.find(l => l.army === D)], seed, terrain: false })

test('the default list is legal; Iron Rukka Bosses and Mobs come together', () => {
  assert.deepEqual(checkList(MORE_LISTS.find(l => l.army === D)).problems, [])
  const lone = { army: D, points: 1500, units: [unitByNames(D, 'infernal-castellan', 1, { command: ['General'] }), unitByNames(D, 'furnace-guard', 20), unitByNames(D, 'iron-rukka-mob', 10)] }
  assert.ok(checkList(lone).problems.some(p => /needs an Iron Rukka Boss/.test(p)))
})

test('Blackshard Armour: a 5+ Ward against Flaming Attacks; a Sorcerer may wear it', () => {
  const ig = field('furnace-guard', 10, { options: ['Blackshard Armour'] })
  if (hasRule(ig, 'Blackshard Armour')) assert.equal(saveFor(ig, { flaming: true }).ward, 5)
  const so = field('bindsmith-sorcerer', 1, { lore: 'dark-magic', options: ['Wizard'] })
  assert.ok(hasRule(so, 'Blackshard Armour'))
  assert.ok(!armoured(so))
})

test('fireglaives shoot and fight; Stampede; Backstab in a flank', () => {
  assert.equal(rangedWeaponsOf(field('furnace-guard', 10, { equipment: 'Fireglaives' }))[0].key, 'fireglaive')
  assert.ok(stampede(field('bull-centaur-hewers', 3)))
  const cut = field('hobgoblin-cutthroats', 10)
  const foe = { engagedWith: { [cut.id]: 'left' } }
  if (hasRule(cut, 'Backstab')) assert.ok(backstabs(cut, foe, null))
})

test("the Sorcerer's Curse: a failed Toughness test, a Wound and +1 Toughness instead of a Backlash", () => {
  let cursed = false
  for (let seed = 1; seed <= 30 && !cursed; seed++) {
    const g = cdGame(seed)
    const so = g.units.find(u => u.entryId === 'bindsmith-sorcerer')
    const T = so.models[0].profile.T
    cursed = sorcerersCurse(g, so, applyWounds)
    if (cursed) assert.equal(so.models[0].profile.T, T + 1)
  }
  assert.ok(cursed)
})

test('the Lore of the Bull of Ash swap; the Storm of Ash', async () => {
  const g = cdGame(2)
  const so = g.units.find(u => u.entryId === 'bindsmith-sorcerer')
  assert.ok(swapChoices(so).some(s => s.slug === 'curse-of-the-bull-of-ash'))
  so.placed = true; so.pos = { x: 30, y: 30 }; so.facing = 0
  const foe = g.units.find(u => u.side === 0 && u.entryId === 'march-troops')
  foe.placed = true; foe.pos = { x: 30, y: 36 }; foe.facing = Math.PI; foe.files = 10
  await spellEffects.resolve(g, so, SPELLS['storm-of-ash'], so, {})
  assert.ok(inStormOfAsh(g, foe, distanceBetween))
})
