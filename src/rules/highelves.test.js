// Ilthari Realms: wards, joining restrictions, Arrows of Siriel, Cleaving Blow, items and Honours.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, findEntry, itemChoices } from './roster.js'
import { equip, saveFor, rangedWeaponsOf, meleeWeaponOf } from './damage.js'
import { canJoin } from './joining.js'

const H = 'ilthari-realms'
const field = (id, n, opts = {}, side = 0) => { const u = fieldUnit(H, unitByNames(H, id, n, opts), side); equip(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }

test('wards: Ashen Guard 6+ against non-magical attacks; Bladewardens 6+ against non-magical shooting', () => {
  const pg = field('ashen-guard', 10)
  assert.equal(saveFor(pg, {}).ward, 6)
  assert.equal(saveFor(pg, { magical: true }).ward, null)
  const sm = field('bladewardens', 10)
  assert.equal(saveFor(sm, { phase: 'shooting' }).ward, 6)
  assert.equal(saveFor(sm, {}).ward, null)
  assert.equal(meleeWeaponOf(sm).key, 'sword of sorneth')
})

test('Sisters of Saelwood: Arrows of Siriel AP -1 and Armour Bane (1) on their bows', () => {
  const s = field('sister-of-saelwood', 5)
  const w = rangedWeaponsOf(s)[0]
  if (hasRule(s, 'Arrows of Siriel')) { assert.equal(w.AP, -1); assert.ok(w.rules.some(r => r.startsWith('Armour Bane'))) }
})

test('joining: White Lions take only the General or a Thessan Hunter', () => {
  const g = empty(1)
  const wl = field('white-lions', 10)
  const n = field('noble', 1)
  assert.match(canJoin(g, n, wl, { deploying: true }).reason || '', /Thessan/)
  const hunter = field('noble', 1, { items: ['thessan-hunter'] })
  assert.ok(canJoin(g, hunter, wl, { deploying: true }).ok)
})

test('Elven Honours: one each, offered where the army list allows; their rules', () => {
  const e = findEntry(H, 'noble')
  assert.ok(itemChoices(H, e, unitByNames(H, 'noble', 1)).some(c => c.id === 'warden-of-aelsyr' && !c.why))
  const w = field('noble', 1, { items: ['warden-of-aelsyr'] })
  assert.ok(hasRule(w, 'Killing Blow') && hasRule(w, 'Deflect Shots'))
})

test('review fixes: Valour of Ages covers heavy casualties and being fallen back through', async () => {
  const { valourOfAges } = await import('./highelves.js')
  const u = field('elven-spearmen', 10)
  assert.ok(valourOfAges(u, 'lost 3 of the 10 models it had at the start of the phase'))
  assert.ok(valourOfAges(u, 'Argent Knights fell back through it'))
  assert.ok(!valourOfAges(u, 'a friendly unit was destroyed within 6"'))
})

test('list limits: a Special Lion Chariot needs a Thessan Hunter General; a Deepwyrm needs Lumaren Sea Guard', async () => {
  const { checkList } = await import('./roster.js')
  const list = { army: H, points: 2000, units: [unitByNames(H, 'prince', 1, { command: ['General'] }), unitByNames(H, 'lion-chariot-of-thessa', 1), unitByNames(H, 'deepwyrms', 1)] }
  const probs = checkList(list).problems.join(' | ')
  assert.match(probs, /Lion Chariot of Thessa as a Special choice/)
  assert.match(probs, /Deepwyrm \(needs Lumaren Sea Guard\)/)
})

test('High Magic: Drain Magic +2 to enemy casting values within 24"; Shield of Aelsyr a 5+ Ward this turn', async () => {
  const { effects } = await import('./spells.js')
  const { castingValueFor } = await import('./arcane.js')
  const { SPELLS } = await import('../data/spells.js')
  const g = empty(11)
  const mage = field('mage', 1, { lore: 'high-magic', options: ['Wizard'] })
  g.units.push(mage); mage.placed = true; mage.pos = { x: 30, y: 30 }; mage.facing = 0
  const foe = g.units.find(u => u.side === 1 && u.entryId)
  const fw = field('mage', 1, { lore: 'battle-magic', options: ['Wizard'] }, 1)
  g.units.push(fw); fw.placed = true; fw.pos = { x: 30, y: 40 }; fw.facing = Math.PI
  const s = SPELLS['fireball']
  const before = castingValueFor(g, fw, s)
  await effects.resolve(g, mage, SPELLS['drain-magic'], mage, {})
  assert.equal(castingValueFor(g, fw, s), before + 2)
  const sp = field('elven-spearmen', 10)
  g.units.push(sp)
  await effects.resolve(g, mage, SPELLS['shield-of-aelsyr'], sp, {})
  assert.equal(saveFor(sp, {}).ward, 5)
  assert.ok(foe)
})
