// Deephold Clans: the army's special rules and its runes.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip, saveFor, meleeWeaponOf, itemSaveRerolls } from './damage.js'
import { canDispel, dispelRange, halfLevel } from './magic.js'
import { canJoin } from './joining.js'
import { resolute, standsBack, woundsOnFour, slayerMultiple, entrench } from './dwarfs.js'
import { maxChargeRange } from './charge.js'
import { score } from './victory.js'
import { hates } from './orders.js'
import { rulesOf } from './units.js'

const D = 'deephold-clans'
const field = (id, n, opts = {}, side = 0) => { const u = fieldUnit(D, unitByNames(D, id, n, opts), side); equip(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }
const put = (g, u, x, y, facing) => { Object.assign(u, { placed: true, pos: { x, y }, facing }); g.units.push(u); return u }

test('Dwarf warriors: Resolute -1 to Flee, Deepsteel hand weapons AP -1, Deepsteel Armour re-rolls 1s', () => {
  const w = field('dwarf-warriors', 10)
  assert.equal(resolute(w, 7), 6); assert.equal(resolute(w, 1), 1)
  const t = field('thane', 1)
  if (hasRule(t, 'Deepsteel Weapons')) assert.equal(meleeWeaponOf(t).ap, -1)
  if (hasRule(t, 'Deepsteel Armour')) {
    const g = empty(1)
    assert.match(itemSaveRerolls(g, t, 'armour', [1, 4], d => d >= 5).note || '', /Deepsteel Armour/)
  }
})

test('rune Untouchable saves: Ironwalls 6+ against non-magical; Embershots 5+ against flames', () => {
  const ib = field('ironwalls', 10)
  assert.equal(saveFor(ib, {}).ward, 6)
  assert.equal(saveFor(ib, { magical: true }).ward, null)
  const id = field('embershots', 10)
  assert.equal(saveFor(id, { flaming: true }).ward, 5)
  assert.equal(saveFor(id, {}).ward, null)
})

test('Rune Lore: a Runesmith dispels 18" +1, a Runelord 21" +2', () => {
  const rs = field('runesmith', 1); const rl = field('runelord', 1)
  assert.ok(canDispel(rs) && canDispel(rl))
  assert.equal(dispelRange(rs), 18); assert.equal(halfLevel(rs), 1)
  assert.equal(dispelRange(rl), 21); assert.equal(halfLevel(rl), 2)
})

test('characters: Ancestral Reckoning hates characters, and gives it to Greybeards; Forgefire to any unit', () => {
  const k = field('king', 1)
  const lb = field('long-beards', 10)
  lb.joined = [k]
  assert.ok(rulesOf(lb).includes('Hatred (enemy characters)'))
  assert.ok(hates(rulesOf(lb), { troopType: ['Heavy Infantry', 'Character'], name: 'x' }))
  const w = field('dwarf-warriors', 10); w.joined = [field('runesmith', 1)]
  assert.ok(hasRule(w, 'Flaming Attacks') && hasRule(w, 'Armour Bane'))
})

test('Slayers: 4+ To Wound, Multiple Damage against behemoths; the Deathwhirl scores for the enemy alive', () => {
  const ds = field('dragon-slayer', 1)
  assert.ok(woundsOnFour(ds))
  assert.ok(slayerMultiple(ds, { troopType: ['Behemoth'], special: new Set() }))
  assert.ok(!slayerMultiple(ds, { troopType: ['Heavy Infantry'], special: new Set() }))
  const g = empty(2)
  const doom = put(g, field('deathwhirl-merc', 1), 30, 30, 0)
  assert.equal(maxChargeRange(doom), Math.max(doom.models[0].profile.M) + 6 + 3)
  assert.ok(score(g).why[1].some(w => /seeks its doom/.test(w)))
})

test('Stand Back Chief: an Engineer by a war machine cannot be shot; Entrenchment', () => {
  const g = empty(3)
  const eng = put(g, field('engineer', 1), 30, 30, 0)
  const can = put(g, field('cannon', 1), 31.5, 30, 0)
  assert.ok(standsBack(g, eng))
  entrench(g, 0)
  assert.ok(can.status.entrenched)
})

test('composition: 0-1 King per 1,000; Kingshammers need a King or Thane; Durnak may join Kingshammers', () => {
  const base = [unitByNames(D, 'thane', 1, { command: ['General'] }), unitByNames(D, 'dwarf-warriors', 20), unitByNames(D, 'boltbeards', 10), unitByNames(D, 'firebeards', 10)]
  const l = units => ({ name: 't', army: D, points: 1000, units })
  assert.ok(checkList(l([...base, unitByNames(D, 'king', 1), unitByNames(D, 'king', 1)])).problems.some(p => /King, Anvil of Ruin or Runelord/.test(p)))
  assert.ok(checkList(l([...base, unitByNames(D, 'kingshammers', 10), unitByNames(D, 'kingshammers', 10)])).problems.some(p => /Kingshammers/.test(p)))
  const g = empty(4)
  const ung = field('durnak-ironhand', 1)
  const ham = field('kingshammers', 10)
  assert.equal(canJoin(g, ung, ham, { deploying: true }).ok, true, canJoin(g, ung, ham, { deploying: true }).reason)
})

test('runes: a runic weapon is magic with its runes; the Rules of the Runes are checked', async () => {
  const { runeProblems } = await import('./runes.js')
  const { findEntry } = await import('./roster.js')
  const k = field('king', 1, { items: ['rune-of-might', 'rune-of-might', 'rune-of-cleaving'] })
  const w = meleeWeaponOf(k)
  assert.ok(w.magic && w.rules.includes('Magical Attacks'), w.name)
  assert.equal(w.ap, -1)
  const plain = field('king', 1)
  assert.equal(k.models[0].profile.S, plain.models[0].profile.S + 2)
  const l = units => ({ name: 't', army: D, points: 2000, units })
  // the Rule of Duplication: a rune without * cannot be doubled; Jealousy: one Master rune an item
  assert.ok(runeProblems(l([unitByNames(D, 'king', 1, { items: ['rune-of-fire', 'rune-of-fire'] })]), findEntry).some(p => /may not be taken twice/.test(p)))
  assert.ok(runeProblems(l([unitByNames(D, 'king', 1, { items: ['master-rune-of-smiting', 'master-rune-of-swiftness'] })]), findEntry).some(p => /only one Master rune/.test(p)))
  // the Rule of Pride: two identical runic items
  assert.ok(runeProblems(l([unitByNames(D, 'thane', 1, { items: ['rune-of-fire'] }), unitByNames(D, 'thane', 1, { items: ['rune-of-fire'] })]), findEntry).some(p => /Rule of Pride/.test(p)))
  // the Rule of Three
  assert.ok(runeProblems(l([unitByNames(D, 'king', 1, { items: ['rune-of-might', 'rune-of-might', 'rune-of-might', 'rune-of-fury'] })]), findEntry).some(p => /no more than three/.test(p)))
})

test('runes: Shielding wards, Deepsteel 2+, Adamant T10, Skeld wounds on 2+', () => {
  const s = field('thane', 1, { items: ['rune-of-shielding', 'rune-of-shielding'] })
  assert.equal(saveFor(s, {}).ward, 5)
  const g = field('thane', 1, { items: ['master-rune-of-deepsteel'] })
  assert.equal(saveFor(g, {}).armour, 2)
  const a = field('king', 1, { items: ['master-rune-of-adamant'] })
  assert.equal(a.models[0].profile.T, 10)
  const sk = field('king', 1, { items: ['master-rune-of-skeld-blackanvil'] })
  assert.equal(meleeWeaponOf(sk).flags.woundOn, 2)
})

test('runes: a unit standard carries its Standard runes; a cannon its Engineering runes', async () => {
  const { itemFlag, bannersOf } = await import('./items.js')
  const w = field('dwarf-warriors', 20, { command: ['Standard bearer'], items: ['rune-of-battle', 'rune-of-courage'] })
  assert.deepEqual(bannersOf(w).sort(), ['rune-of-battle', 'rune-of-courage'])
  assert.ok(itemFlag(w, 'courage'))
  const c = field('cannon', 1, { items: ['rune-of-reloading'] })
  assert.ok(itemFlag(c, 'reloading'))
})
