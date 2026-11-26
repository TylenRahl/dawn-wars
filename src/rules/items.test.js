// Magic items: the data, the list rules, and what the items in play do.
// Run with npm test (node:test).
import { test } from 'node:test'
import { isPlayable } from './items.js'
import assert from 'node:assert/strict'
import { ITEMS, ALLOWANCE } from '../data/magicItems.js'
import { EFFECTS, bannersOf, itemFlag } from './items.js'
import { unitByNames, checkList, unitCost, findEntry, itemChoices } from './roster.js'
import { DEFAULT_LISTS } from './testLists.js'
import { fieldUnit, hasRule } from './units.js'
import { equip, saveFor, meleeWeaponOf, meleeStrength } from './damage.js'
import { rankBonus } from './combat.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { castSpell } from './magic.js'
import { effects as spellEffects } from './spells.js'

const E = 'concord-realm'
const O = 'rukka-firms'
const listWith = (army, extra, replace = null) => {
  const base = DEFAULT_LISTS.find(l => l.army === army)
  const units = base.units.map(u => replace && u.entryId === replace.entryId ? replace : u)
  return { ...base, units: [...units, ...extra] }
}
const field = (army, sel, side = 0) => { const u = fieldUnit(army, sel, side); equip(u); return u }

test('every item with an effect is in the data, and every magic weapon has a profile from its page', () => {
  for (const [id, e] of Object.entries(EFFECTS)) {
    assert.ok(ITEMS[id], `no item ${id}`)
    if (e.weapon || e.ranged) assert.ok(ITEMS[id].profiles.length, `${id} has no profile`)
  }
  assert.deepEqual(ITEMS['ogre-blade'].profiles[0], { range: 'Combat', S: 'S+2', AP: '-2', rules: ['Armour Bane (1)', 'Magical Attacks', 'Multiple Damage (D3)'] })
  assert.equal(ALLOWANCE['captain-of-the-realm'].character, 50)
  assert.equal(ALLOWANCE['general-of-the-realm'].character, 100)
  assert.equal(ALLOWANCE['rukka-mob'].standard, 50)
})

test('the list rules: allowance, one per category, one per army, standards, Wizards only', () => {
  const ok = listWith(E, [unitByNames(E, 'captain-of-the-realm', 1, { items: ['sword-of-might', 'enchanted-shield', 'luckstone'] })])
  const cap = ok.units[ok.units.length - 1]
  assert.equal(unitCost(findEntry(E, cap.entryId), cap).total, 45 + 20 + 10 + 15)
  assert.deepEqual(checkList({ ...ok, points: 3000 }).problems.filter(p => /Captain/.test(p)), [])
  const over = checkList({ ...listWith(E, [unitByNames(E, 'captain-of-the-realm', 1, { items: ['ogre-blade'] })]), points: 3000 }).problems
  assert.ok(over.some(p => /over its 50-point allowance/.test(p)), over.join('; '))
  const twoWeapons = checkList({ ...listWith(E, [unitByNames(E, 'general-of-the-realm', 1, { items: ['biting-blade', 'sword-of-swiftness'] })]), points: 3000 }).problems
  assert.ok(twoWeapons.some(p => /only one weapon/.test(p)), twoWeapons.join('; '))
  // extremely common items may share a category with another
  const common = checkList({ ...listWith(E, [unitByNames(E, 'captain-of-the-realm', 1, { items: ['sword-of-might', 'burning-blade'] })]), points: 3000 }).problems
  assert.ok(!common.some(p => /only one weapon/.test(p)), common.join('; '))
  const twice = checkList({ ...listWith(E, [unitByNames(E, 'captain-of-the-realm', 1, { items: ['biting-blade'] }), unitByNames(E, 'captain-of-the-realm', 1, { items: ['biting-blade'] })]), points: 3000 }).problems
  assert.ok(twice.some(p => /only one in the army/.test(p)), twice.join('; '))
  const arcane = checkList({ ...listWith(E, [unitByNames(E, 'captain-of-the-realm', 1, { items: ['unweaving-scroll'] })]), points: 3000 }).problems
  assert.ok(arcane.some(p => /only Wizards/.test(p)), arcane.join('; '))
  // a magic standard: the BSB, or a unit with a standard bearer and an allowance
  const bsb = DEFAULT_LISTS.find(l => l.army === E).units.find(u => u.entryId === 'captain-of-the-realm')
  const withBanner = { ...bsb, items: ['griffon-standard'] }
  assert.deepEqual(checkList({ ...listWith(E, [], withBanner), points: 3000 }).problems.filter(p => /standard/i.test(p)), [])
  const noBearer = checkList({ ...listWith(O, [unitByNames(O, 'rukka-mob', 10, { items: ['war-banner'] })]), points: 3000 }).problems
  assert.ok(noBearer.some(p => /needs a standard bearer/.test(p)), noBearer.join('; '))
  // (any item still without an effect is offered as not playable; once all are in, there is none)
  const notPlayable = itemChoices(E, findEntry(E, 'general-of-the-realm'), unitByNames(E, 'general-of-the-realm', 1)).find(c => !isPlayable(c.id))
  if (notPlayable) assert.equal(notPlayable.why, 'not playable yet')
})

test('magic armour replaces the mundane, and wards work only where they say', () => {
  const gen = field(E, unitByNames(E, 'general-of-the-realm', 1, { items: ['armour-of-destiny'] }))
  let sv = saveFor(gen)
  assert.equal(sv.armour, 5) // heavy armour 5+ (it replaces the general's own armour)
  assert.equal(sv.ward, 4)
  const cap = field(E, unitByNames(E, 'captain-of-the-realm', 1, { items: ['enchanted-shield'] }))
  sv = saveFor(cap)
  assert.equal(sv.armour, 5) // light armour 6+ and a shield
  assert.equal(sv.ward, 6)
  assert.equal(saveFor(cap, { magical: true }).ward, null)
  const cap2 = field(E, unitByNames(E, 'captain-of-the-realm', 1, { items: ['shield-of-the-warrior-true'] }))
  assert.equal(saveFor(cap2).ward, null)
  assert.equal(saveFor(cap2, { phase: 'shooting' }).ward, 5)
  const cloak = field(E, unitByNames(E, 'captain-of-the-realm', 1, { items: ['the-white-cloak'] }))
  assert.equal(saveFor(cloak).ward, 5)
  assert.equal(saveFor(cloak, { flaming: true }).ward, 3)
  const steel = field(E, unitByNames(E, 'general-of-the-realm', 1, { mount: 'Barded Warhorse', items: ['armour-of-silvered-steel'] }))
  assert.equal(saveFor(steel).armour, 3) // cannot be improved, not even by barding
  const boss = field(O, unitByNames(O, 'rukka-gaffer', 1, { items: ['dead-ard-clobba'] }), 1)
  assert.equal(boss.models[0].profile.T, 6) // T5 on its page, +1
  assert.equal(saveFor(boss).armour, 4)
})

test('a magic weapon is always the one used; its profile and rules come from the item data', () => {
  const gen = field(E, unitByNames(E, 'general-of-the-realm', 1, { equipment: 'Great weapon', items: ['ogre-blade'] }))
  const w = meleeWeaponOf(gen)
  assert.equal(w.name, 'Ogre Blade')
  assert.equal(meleeStrength(w, 4, false), 6)
  assert.equal(w.ap, -2)
  assert.ok(w.rules.includes('Multiple Damage (D3)'))
  const axe = field(O, unitByNames(O, 'rukka-gaffer', 1, { items: ['the-reeking-axe'] }), 1)
  assert.equal(meleeStrength(meleeWeaponOf(axe), 5, false), 5) // its +1 only on the charge
  assert.equal(meleeStrength(meleeWeaponOf(axe, { charged: true }), 5, true), 6)
})

test('a magic standard works while its bearer stands', () => {
  const mob = field(O, unitByNames(O, 'rukka-mob', 20, { command: ['Standard bearer'], items: ['banner-of-iron-resolve'] }), 1)
  assert.deepEqual(bannersOf(mob), ['banner-of-iron-resolve'])
  assert.equal(hasRule(mob, 'Stubborn'), true)
  mob.models.find(m => m.role === 'standard').wounds = 0
  mob.status.lost_standard = true
  assert.equal(hasRule(mob, 'Stubborn'), false)
  // a Battle Standard Bearer's magic standard counts for the unit it has joined
  const bsb = field(O, unitByNames(O, 'rukka-top-lad', 1, { command: ['Battle Standard Bearer'], items: ['the-angry-ladz-flag'] }), 1)
  const ladz = field(O, unitByNames(O, 'rukka-mob', 20), 1)
  ladz.joined = [bsb]
  assert.equal(hasRule(ladz, 'Frenzy'), true)
  // the Griffon Standard doubles the Rank Bonus
  const g = createGame({ lists: DEFAULT_LISTS, seed: 2, terrain: false })
  const st = field(E, unitByNames(E, 'realm-knights', 5, { command: ['Standard bearer'] }))
  st.items = []
  const halb = field(E, unitByNames(E, 'march-troops', 20, { command: ['Standard bearer'] }))
  halb.files = 5; halb.placed = true
  const plain = rankBonus(g, halb)
  halb.banner = 'griffon-standard'
  assert.equal(itemFlag(halb, 'griffon'), true)
  assert.equal(rankBonus(g, halb), plain * 2)
})

test('arcane items change the Casting roll, and say so in the log', async () => {
  const lists = DEFAULT_LISTS.map(l => l.army !== E ? l : { ...l, units: l.units.map(u => u.entryId === 'master-mage' ? { ...u, items: ['rod-of-might'] } : u) })
  const g = createGame({ lists, seed: 9, terrain: false })
  startBattle(g, 0); beginTurn(g)
  const mage = g.units.find(u => u.entryId === 'master-mage')
  assert.deepEqual(mage.items, ['rod-of-might'])
  mage.placed = true; mage.pos = { x: 36, y: 30 }
  const s = mage.wizard.spells[0]
  await castSpell(g, mage, s, mage, async (q, a) => a[a.length - 1][1], spellEffects)
  assert.match(g.log.map(l => l.text).join('\n'), /\+ 1 Rod of Might =/)
})

test('item restrictions found in review: trophy rack, Dragon Bow, Wizards and armour, 0-1 per Wizard', () => {
  const why = (army, entry, id, opts = {}) => itemChoices(army, findEntry(army, entry), unitByNames(army, entry, 1, opts)).find(c => c.id === id)?.why
  assert.equal(why(O, 'rukka-gaffer', 'grisly-trophy-rack'), null)
  assert.equal(why(E, 'captain-of-the-realm', 'dragon-bow'), null)
  assert.ok(why(E, 'master-mage', 'dragon-bow'))
  assert.ok(why(O, 'rukka-head-case', 'armour-of-destiny'))
  assert.equal(why(E, 'master-mage', 'armour-of-aschenbrand'), null)
  const two = checkList({ ...listWith(E, [unitByNames(E, 'master-mage', 1, { items: ['wizards-familiar', 'wizards-familiar'] })]), points: 3000 }).problems
  assert.ok(two.some(p => /at most 1 Wizard's Familiar/.test(p)), two.join('; '))
})
