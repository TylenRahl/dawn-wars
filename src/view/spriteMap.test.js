// Which picture a model wears when its unit has chosen one of its combat weapons for the fight - view/spriteMap.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fieldUnit } from '../rules/units.js'
import { unitByNames } from '../rules/roster.js'
import { equip } from '../rules/damage.js'
import { chooseCombatWeapon } from '../rules/weaponChoice.js'
import { kitsOf, spriteKey, chosenWeaponId } from './spriteMap.js'
import { fightingWith } from '../ui/fightingWith.js'

const O = 'rukka-firms'
const game = { round: 1, active: 0 }
const now = () => `${game.round}:${game.active}`
const mob = () => { const u = fieldUnit(O, unitByNames(O, 'iron-rukka-mob', 10, { counts: { 'Great weapons': 3, 'Additional hand weapons': 3 } }), 0); equip(u); return u }
const rank = (u, kit) => u.models.find(m => m.kit === kit)
const manifest = Object.fromEntries(['dw-og-iron-rukka', 'dw-og-iron-rukka-great', 'dw-og-iron-rukka-paired'].map(k => [k, {}]))

test('kitsOf: with no choice (or no turn given) it is what the unit was bought with', () => {
  const u = mob()
  assert.equal(kitsOf(u, rank(u, 'Great weapons'))[0], 'great')
  assert.equal(kitsOf(u, rank(u, 'Additional hand weapons'))[0], 'paired')
  chooseCombatWeapon(game, u, 'hand weapon', { kit: 'Great weapons' })
  assert.equal(kitsOf(u, rank(u, 'Great weapons'))[0], 'great') // no turn passed: the choice is not current
})

test('kitsOf: a current choice wins, per kit; the hand weapon is drawn plain', () => {
  const u = mob()
  chooseCombatWeapon(game, u, 'hand weapon', { kit: 'Great weapons' })
  chooseCombatWeapon(game, u, 'additional hand weapon', { kit: 'Additional hand weapons' })
  assert.deepEqual(kitsOf(u, rank(u, 'Great weapons'), now()), ['hand'])
  assert.deepEqual(kitsOf(u, rank(u, 'Additional hand weapons'), now()), ['paired'])
  assert.equal(chosenWeaponId(u, rank(u, 'Great weapons'), now()), 'hand weapon')
  // a model of no kit has the unit's own choice, none recorded here: back to what it was bought with
  assert.equal(chosenWeaponId(u, u.models.find(m => !m.kit), now()), null)
})

test('kitsOf: the choice expires with the turn (falls back to the bought kit)', () => {
  const u = mob()
  chooseCombatWeapon(game, u, 'hand weapon', { kit: 'Great weapons' })
  assert.equal(kitsOf(u, rank(u, 'Great weapons'), now())[0], 'hand')
  game.round = 2
  assert.equal(kitsOf(u, rank(u, 'Great weapons'), now())[0], 'great')
  game.round = 1
})

test('kitsOf: choosing the great weapon over the hand weapon on a unit bought with both', () => {
  const gs = fieldUnit('concord-realm', unitByNames('concord-realm', 'kingsblades', 5, { equipment: 'Hand weapons, Great weapons' }), 0)
  equip(gs)
  chooseCombatWeapon(game, gs, 'hand weapon')
  assert.ok(!kitsOf(gs, gs.models[0], now()).includes('great'))
  chooseCombatWeapon(game, gs, 'great weapon')
  assert.equal(kitsOf(gs, gs.models[0], now())[0], 'great')
})

test('spriteKey: picks the picture of the chosen weapon, then back when the choice expires', () => {
  const u = mob()
  const m = rank(u, 'Great weapons')
  assert.match(spriteKey(u, m, manifest, now()), /^dw-og-iron-rukka-great/)
  chooseCombatWeapon(game, u, 'hand weapon', { kit: 'Great weapons' })
  assert.match(spriteKey(u, m, manifest, now()), /^dw-og-iron-rukka(?!-great)/)
  game.round = 3
  assert.match(spriteKey(u, m, manifest, now()), /^dw-og-iron-rukka-great/)
  game.round = 1
})

test('fightingWith: names the chosen weapon only while the choice is current', () => {
  const u = mob()
  assert.equal(fightingWith(game, u), '')
  chooseCombatWeapon(game, u, 'great weapon', { kit: 'Great weapons' })
  chooseCombatWeapon(game, u, 'hand weapon', { kit: 'Additional hand weapons' })
  assert.equal(fightingWith(game, u), 'Great weapons: Great Weapon; Additional hand weapons: Hand weapon')
  game.round = 2
  assert.equal(fightingWith(game, u), '')
  game.round = 1
  const gs = fieldUnit('concord-realm', unitByNames('concord-realm', 'kingsblades', 5, { equipment: 'Hand weapons, Great weapons' }), 0)
  equip(gs); chooseCombatWeapon(game, gs, 'great weapon')
  assert.equal(fightingWith(game, gs), 'Great Weapon')
})
