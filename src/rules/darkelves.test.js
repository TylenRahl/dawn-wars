// Vhar: Hatred (Ilthari) and Eternal Hatred, Murderous, wards, Sea Dragon Cloak, the War Hydra, Abyssal
// Howl, Dance of Death, Goad Beast, Cursed Coven, Sesketh's Blessing, the Lore of Vharnest, items, Gifts and Poisons.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule, rulesOf, distanceBetween } from './units.js'
import { unitByNames, findEntry, itemChoices, checkList } from './roster.js'
import { equip, saveFor, rangedWeaponsOf, meleeWeaponOf } from './damage.js'
import { hates } from './orders.js'
import { leadershipFor, commandRange } from './leadership.js'
import { swapChoices, boundSpellsOf } from './magic.js'
import { effects as spellEffects } from './spells.js'
import { eternalHatred, murderous, ownExtraAttacks, goad, goaded, goadTargets, danceOfDeath, dancedOn } from './darkelves.js'
import { rankBonus } from './combat.js'
import { SPELLS } from '../data/spells.js'

const X = 'vhar'
const field = (id, n, opts = {}, side = 1) => { const u = fieldUnit(X, unitByNames(X, id, n, opts), side); equip(u); return u }
const game = seed => createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
const put = (u, x, y, facing, files) => { u.placed = true; u.pos = { x, y }; u.facing = facing; if (files) u.files = files }

test('the default list is legal', () => {
  assert.deepEqual(checkList(MORE_LISTS.find(l => l.army === X)).problems, [])
})

test('Hatred (Ilthari) hates only the Ilthari Realms; Eternal Hatred against them in every round', () => {
  const w = field('vhar-warriors', 10)
  const he = fieldUnit('ilthari-realms', unitByNames('ilthari-realms', 'elven-spearmen', 10), 0)
  const we = fieldUnit('lornefolk-of-lorne-wood', unitByNames('lornefolk-of-lorne-wood', 'grove-guard', 10), 0)
  assert.ok(hates(rulesOf(w), he))
  assert.ok(!hates(rulesOf(w), we))
  const lord = field('vhar-dreadlord', 1)
  assert.ok(eternalHatred(lord, he) && !eternalHatred(lord, we) && !eternalHatred(w, he))
})

test('weapons and saves: repeater crossbows, Ashvane kingsblades, dread halberds; Dark Runes, Sea Dragon Cloak', () => {
  assert.equal(rangedWeaponsOf(field('repeater-crossbowmen', 10))[0].key, 'repeater crossbow')
  assert.equal(meleeWeaponOf(field('ashvane-executioners', 10)).key, 'ashvane kingsblade')
  assert.equal(meleeWeaponOf(field('black-guard-of-karvesh', 10)).key, 'dread halberd')
  const dw = field('hexfire-warlocks', 5)
  assert.equal(saveFor(dw, {}).ward, 5)
  assert.equal(saveFor(dw, { magical: true }).ward, null)
  const cors = field('dread-ark-corsairs', 10)
  assert.equal(saveFor(cors, { phase: 'shooting' }).armour, saveFor(cors, {}).armour - 1)
})

test('Murderous: a single non-magical hand weapon only; a War Hydra +Attacks for its Wounds left', () => {
  const w = field('bloodmaidens', 10)
  assert.ok(murderous(w, { weapon: 'Hand weapon' }))
  assert.ok(!murderous(w, { weapon: 'Two hand weapons/additional hand weapon' }))
  assert.ok(!murderous(w, { weapon: 'Hand weapon', itemId: 'sword-of-ruin' }))
  const g = game(1)
  const h = field('war-hydra', 1)
  const W = h.models.find(m => m.role !== 'handler').wounds
  assert.equal(ownExtraAttacks(g, h, () => 1), W)
})

test('Abyssal Howl: enemy units within 6" of an Abyssmaw -1 Leadership', () => {
  const g = game(2)
  const k = field('abyssmaw', 1)
  g.units.push(k)
  const t = g.units.find(u => u.side === 0 && u.entryId === 'march-troops')
  put(t, 30, 30, 0, 10)
  const before = leadershipFor(g, t).value
  put(k, 30, 34, Math.PI)
  assert.equal(leadershipFor(g, t).value, before - 1)
})

test('Dance of Death: the charge target -1 to its Maximum Rank Bonus this turn', () => {
  const g = game(3)
  g.round = 1; g.active = 1
  const s = field('sisters-of-the-lash', 10)
  const t = g.units.find(u => u.side === 0 && u.entryId === 'march-troops')
  put(t, 30, 30, 0, 5)
  const before = rankBonus(g, t)
  danceOfDeath(g, s, t)
  assert.ok(dancedOn(g, t))
  assert.equal(rankBonus(g, t), Math.max(0, before - 1))
})

test('Goad Beast: a High Beastmaster gives a monster in his Command range +D3 Attacks this turn', () => {
  const g = game(4)
  g.round = 1; g.active = 1
  const bm = field('high-beastmaster', 1, { mount: 'Manticore' })
  const h = field('war-hydra', 1)
  g.units.push(bm, h)
  put(bm, 30, 30, 0); put(h, 34, 30, 0)
  const ts = goadTargets(g, bm, distanceBetween, commandRange)
  assert.ok(ts.includes(h) && ts.includes(bm))
  goad(g, bm, h)
  assert.ok(goaded(g, h) >= 1 && goaded(g, h) <= 3)
  goad(g, bm, bm)
  assert.equal(goaded(g, bm), 0)
  assert.ok(goaded(g, bm, true) >= 1)
})

test('Cursed Coven: the Warlocks know a spell and cast it Bound; the Lore of Vharnest swap; Cursing Word', async () => {
  const lists = [{ ...MORE_LISTS.find(l => l.army === X), units: [...MORE_LISTS.find(l => l.army === X).units, unitByNames(X, 'hexfire-warlocks', 5, { command: ['Master (champion)'] })], points: 2000 }, DEFAULT_LISTS[0]]
  const g = createGame({ lists, seed: 5, terrain: false })
  const dw = g.units.find(u => u.entryId === 'hexfire-warlocks')
  assert.ok(dw.covenSpell)
  assert.equal(boundSpellsOf(dw)[0].power, 2) // a Master and Unit Mass 10 (five cavalry, 2 each)
  const so = g.units.find(u => u.entryId === 'sorceress')
  assert.ok(swapChoices(so).some(s => s.slug === 'cursing-word') && swapChoices(so).some(s => s.slug === 'black-horror'))
  const t = g.units.find(u => u.side === 1 && u.entryId === 'march-troops')
  const ws = t.models[0].profile.WS
  await spellEffects.resolve(g, so, SPELLS['cursing-word'], t, {})
  assert.ok(t.models[0].profile.WS === ws - 1 || t.models[0].profile.BS < 3)
})

test('items, Gifts of the Bloodied God and Forbidden Poisons: offered where the army list allows, their rules', () => {
  const hag = findEntry(X, 'blood-crone')
  assert.ok(itemChoices(X, hag, unitByNames(X, 'blood-crone', 1)).some(c => c.id === 'rune-of-the-bloodied-god' && !c.why))
  assert.ok(!itemChoices(X, findEntry(X, 'sorceress'), unitByNames(X, 'sorceress', 1)).some(c => c.id === 'rune-of-the-bloodied-god'))
  const two = { army: X, points: 2000, units: [unitByNames(X, 'vhar-dreadlord', 1, { command: ['General'] }), unitByNames(X, 'blood-crone', 1, { items: ['rune-of-the-bloodied-god', 'witchbrew'] }), unitByNames(X, 'vhar-warriors', 10)] }
  assert.ok(checkList(two).problems.some(p => /only one Gift of the Bloodied God/.test(p)))
  const as = field('assassin-of-the-bloodied-god', 1, { items: ['dark-venom'] })
  assert.ok(hasRule(as, 'Killing Blow'))
  const dl = field('vhar-dreadlord', 1, { items: ['pendant-of-vaelith'] })
  assert.equal(saveFor(dl, { strength: 3 }).ward, 5)
  assert.equal(saveFor(dl, { strength: 6 }).ward, 4)
  assert.equal(meleeWeaponOf(field('vhar-dreadlord', 1, { items: ['executioners-axe'] })).flags.woundOn, 2)
  assert.ok(itemChoices(X, findEntry(X, 'vhar-dreadlord'), unitByNames(X, 'vhar-dreadlord', 1)).some(c => c.id === 'sword-of-ruin' && !c.why))
})
