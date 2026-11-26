// The Knightly Orders, the Witch Hunter's specialisms (Suffer Not), Evasive, Fear of Elves, Hatred (X), wolf
// hammers, wicked claws, and the Lore of Bosher / Wangler swap with Gaze of Bosher and Wangler's Curse.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, rulesOf, hasRule } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip, saveFor, itemSaveRerolls } from './damage.js'
import { canJoin } from './joining.js'
import { chargeRoll } from './charge.js'
import { canEvade } from './shooting.js'
import { hates, orderOf, isOrderMaster } from './orders.js'
import { swapChoices, swapForSignature, generateSpells } from './magic.js'
import { effects } from './spells.js'
import { SPELLS } from '../data/spells.js'

const E = 'concord-realm'
const O = 'rukka-firms'
const field = (army, id, n, opts = {}, side = 0) => { const u = fieldUnit(army, unitByNames(army, id, n, opts), side); equip(u); return u }

test('Orders: each gives its models its rules; the masters (Inner Circle, Grand and Chapter Masters) get more', () => {
  const ic = field(E, 'inner-circle-leopard-knights', 5)
  assert.equal(orderOf(ic), 'panther'); assert.ok(isOrderMaster(ic))
  assert.ok(hasRule(ic, 'Magic Resistance') && rulesOf(ic).some(r => /^Hatred \(Dominion Hosts/.test(r)))
  const k = field(E, 'leopard-knights', 5)
  assert.ok(!hasRule(k, 'Magic Resistance') && !isOrderMaster(k))
  assert.ok(hasRule(field(E, 'realm-knights-winter-fang', 5), 'Furious Charge'))
  const sun = field(E, 'realm-knights-sunburst', 5)
  assert.ok(hasRule(sun, 'Evasive') && hasRule(sun, 'Flaming Attacks'))
  const thePaleKeeper = field(E, 'inner-circle-knights-the-pale-keeper', 5)
  assert.ok(hasRule(thePaleKeeper, 'Fear') && hasRule(thePaleKeeper, 'Magical Attacks'))
  assert.equal(saveFor(thePaleKeeper, {}).ward, 6)
  assert.equal(saveFor(thePaleKeeper, { magical: true }).ward, null)
  assert.equal(saveFor(field(E, 'inner-circle-knights-winter-fang', 5), { flaming: true }).ward, 5)
  const gm = field(E, 'grand-master', 1, { options: ['Order of the Ember Heart'] })
  assert.equal(orderOf(gm), 'ember-heart'); assert.ok(isOrderMaster(gm))
})

test('Hatred (X): enemy Wizards, Rukka & Nippers, armies by name', () => {
  const rukkas = field(O, 'rukka-mob', 10, {}, 1)
  const shaman = field(O, 'rukka-head-case', 1, {}, 1)
  shaman.wizard = { level: 1 }
  assert.ok(hates(['Hatred (enemy Wizards + Rukka & Nippers)'], rukkas))
  assert.ok(hates(['Hatred (enemy Wizards)'], shaman))
  assert.ok(!hates(['Hatred (enemy Wizards)'], rukkas))
  assert.ok(!hates(['Hatred (Undead models)'], rukkas))
  assert.ok(hates(['Hatred (all enemies)'], rukkas))
})

test('Witch Hunter: its specialism for itself and the unit it joins; one specialism in the list', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  const wh = field(E, 'witch-hunter', 1, { options: ['The Mutant'] })
  const st = field(E, 'march-troops', 20)
  assert.ok(hasRule(wh, 'Magic Resistance'))
  assert.ok(canJoin(g, wh, st, { deploying: true }).ok)
  st.joined = [wh]
  assert.ok(rulesOf(st).includes('Hatred (Dominion Hosts + Hornkin Herds)'))
  const list = { ...DEFAULT_LISTS[0], units: [...DEFAULT_LISTS[0].units, unitByNames(E, 'witch-hunter', 1, { options: ['The Witch', 'The Unmade'] })] }
  assert.ok(checkList(list).problems.some(p => /only one of/.test(p)))
})

test('Joining: Torvald only Leopard Knights; the Ember Heart only its masters and priests of Saint Halvar', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  const harald = field(E, 'torvald-brenner', 1)
  assert.match(canJoin(g, harald, field(E, 'realm-knights', 5), { deploying: true }).reason, /Leopard Knights/)
  assert.ok(canJoin(g, harald, field(E, 'leopard-knights', 5), { deploying: true }).ok)
  const fiery = field(E, 'realm-knights-ember-heart', 5)
  assert.match(canJoin(g, field(E, 'grand-master', 1, { options: ['Order of the Leopard Knights'] }), fiery, { deploying: true }).reason, /Ember Heart/)
  assert.ok(canJoin(g, field(E, 'grand-master', 1, { options: ['Order of the Ember Heart'] }), fiery, { deploying: true }).ok)
})

test('Leopard Knights re-roll a natural 1 on the Charge roll; others do not', () => {
  let seen = 0
  for (let seed = 1; seed <= 60; seed++) {
    const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
    const r = chargeRoll(g, field(E, 'leopard-knights', 5))
    if (r.panther != null) seen++
    const g2 = createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
    assert.equal(chargeRoll(g2, field(E, 'realm-knights', 5)).panther, null)
  }
  assert.ok(seen > 5, `a natural 1 came up ${seen} times in 60`)
})

test('Wolf hammers and wicked claws come from the data', () => {
  const ww = field(E, 'realm-knights-winter-fang', 5, { equipment: 'Hand weapons, Wolf hammers' })
  assert.equal(ww.kit.melee[0].key, 'wolf hammer')
  assert.equal(field(E, 'clawsteed-knights', 3).mount.claws, true)
  assert.equal(field(E, 'realm-knights', 5).mount.claws, false)
})

test('Evasive: offered once a turn in the enemy Shooting phase, not when engaged', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  const sun = field(E, 'realm-knights-sunburst', 5, {}, 0)
  Object.assign(sun, { placed: true, pos: { x: 30, y: 30 } })
  g.units.push(sun)
  g.phase = 'shooting'; g.active = 1; g.round = 2
  assert.ok(canEvade(g, sun))
  sun.status.evaded = '2:1'
  assert.ok(!canEvade(g, sun))
  sun.status.evaded = null; sun.status.engaged = true
  assert.ok(!canEvade(g, sun))
  g.active = 0; sun.status.engaged = false
  assert.ok(!canEvade(g, sun))
})

test('Lore of Bosher: swap for the signature spell or Gaze of Bosher; the line hits every model under it', async () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 3, terrain: false })
  const wb = field(O, 'rukka-head-case', 1, { lore: 'big-ruck-magic' }, 1)
  g.units.push(wb)
  generateSpells(g, wb)
  const takes = swapChoices(wb).map(s => s.slug)
  assert.ok(takes.includes('gaze-of-bosher'), takes.join())
  swapForSignature(g, wb, wb.wizard.spells[0], 'gaze-of-bosher')
  assert.ok(wb.wizard.spells.includes('gaze-of-bosher'))
  const st = field(E, 'march-troops', 20, {}, 0)
  for (const u of [wb, st]) u.placed = true
  wb.pos = { x: 30, y: 20 }; wb.facing = Math.PI / 2
  st.pos = { x: 30, y: 26 }; st.facing = -Math.PI / 2; st.files = 5
  g.units.push(st)
  const before = st.models.filter(m => m.wounds > 0).length
  await effects.resolve(g, wb, SPELLS['gaze-of-bosher'], st, {})
  assert.match(g.log.map(l => l.text).join('\n'), /Gaze of Bosher, \d+ models? under the line/)
  assert.ok(st.models.filter(m => m.wounds > 0).length <= before)
})

test("Wangler's Curse: natural 6 Armour Rolls are re-rolled", () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  const st = field(E, 'march-troops', 10)
  st.status.wanglersCurse = 1
  const r = itemSaveRerolls(g, st, 'armour', [6, 6, 3], d => d >= 5)
  assert.match(r.note, /Wangler's Curse: 2 natural 6s re-rolled/)
})
