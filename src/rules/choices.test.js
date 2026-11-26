// Choices the engine used to make on a player's behalf: with a player present it asks (ctx.ask / ask); with none
// it falls back to the old default. Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit } from './units.js'
import { unitByNames } from './roster.js'
import { equip } from './damage.js'
import { effects } from './spells.js'
import { SPELLS } from '../data/spells.js'
import { loreSpells } from './magic.js'
import { covenOfDoom, covenChoices } from './darkelves.js'
import { soulMarked } from './tombkings.js'

const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }
const field = (army, id, n, opts = {}, side = 0) => { const u = fieldUnit(army, unitByNames(army, id, n, opts), side); equip(u); return u }
const put = (g, u, x, y) => { g.units.push(u); u.placed = true; u.pos = { x, y }; u.facing = 0 }

test('Cursing Word: the stat the player picks; the old default without a player', async () => {
  const g = empty(1)
  const caster = field('vhar', 'sorceress', 1); put(g, caster, 10, 10)
  const t = g.units.find(u => u.side === 1 && u.kit?.ranged?.length)
  put(g, t, 10, 20)
  const ws = t.models[0].profile.WS; const bs = t.models[0].profile.BS
  const asked = []
  await effects.resolve(g, caster, SPELLS['cursing-word'], t, { ask: async (q, a) => { asked.push(q); return 'WS' } })
  assert.match(asked[0], /Cursing Word/)
  assert.equal(t.models[0].profile.WS, ws - 1)
  assert.equal(t.models[0].profile.BS, bs)
})

test("Vesper's Danse Macabre at 12+: two different characteristics, both the player's", async () => {
  const g = empty(2)
  const caster = field('bloodsworn-courts', 'necromantic-acolyte', 1); put(g, caster, 10, 10)
  const t = g.units.find(u => u.side === 0 && u.models.length > 1); put(g, t, 12, 12)
  const before = { ...t.models[0].profile }
  const answers = ['M', 'I']
  await effects.resolve(g, caster, SPELLS['vespers-danse-macabre'], t, { result: 12, ask: async (q, a) => { const v = answers.shift(); assert.ok(a.some(x => x[1] === v)); return v } })
  assert.ok(t.models[0].profile.M > before.M)
  assert.ok(t.models[0].profile.I > before.I)
  assert.equal(t.models[0].profile.WS, before.WS)
})

test('Cursed Coven: the chosen spell (Unmade Rites too); Soul Reaper: the marked character', () => {
  const g = empty(3)
  const dw = field('vhar', 'hexfire-warlocks', 5)
  const d = covenChoices(loreSpells).find(x => x.lore === 'unmade-rites')
  covenOfDoom(g, dw, loreSpells, d.slug)
  assert.equal(dw.covenSpell, d.slug)
  const sphinx = field('sand-kings-of-kheshet', 'bonesphinx', 1, {}, 1)
  const gen = g.units.find(u => u.side === 0 && u.isGeneral)
  const other = g.units.find(u => u.side === 0 && (u.troopType || []).includes('Character') && !u.isGeneral)
  assert.ok(soulMarked(g, sphinx, gen))
  if (other) {
    sphinx.status.soulMark = other.id
    assert.ok(soulMarked(g, sphinx, other))
    assert.ok(!soulMarked(g, sphinx, gen))
  }
})

test('with no player: the old defaults (Gift of Mutation Toughness; Cursing Word the stat the target uses)', async () => {
  const g = empty(4)
  const caster = field('vhar', 'sorceress', 1); put(g, caster, 10, 10)
  const t = g.units.find(u => u.side === 1 && u.kit?.ranged?.length); put(g, t, 10, 20)
  const before = { ...t.models[0].profile }
  await effects.resolve(g, caster, SPELLS['gift-of-mutation'], t, {})
  assert.ok(t.models[0].profile.T < before.T)
  assert.equal(t.models[0].profile.WS, before.WS)
  const g2 = empty(5)
  const sorc = field('vhar', 'sorceress', 1); put(g2, sorc, 10, 10)
  const t2 = g2.units.find(u => u.side === 1 && u.kit?.ranged?.length); put(g2, t2, 10, 20)
  const bs = t2.models[0].profile.BS
  await effects.resolve(g2, sorc, SPELLS['cursing-word'], t2, { ask: async () => null })
  assert.equal(t2.models[0].profile.BS, bs - 1)
})

test('Hellish Vigour at 7+: the unit the player picks, not the nearest', async () => {
  const g = empty(6)
  const V = 'bloodsworn-courts'
  const caster = field(V, 'necromantic-acolyte', 1); put(g, caster, 30, 30)
  const near = field(V, 'zombies', 10); put(g, near, 30, 33)
  const far = field(V, 'skeleton-warriors', 10); put(g, far, 30, 26)
  let options
  await effects.resolve(g, caster, SPELLS['hellish-vigour'], caster, { result: 8, ask: async (q, a) => { options = a; return far } })
  assert.ok(options.length >= 2)
  assert.ok(far.special.has('Reserve Move'))
  assert.ok(!near.special.has('Reserve Move'))
})
