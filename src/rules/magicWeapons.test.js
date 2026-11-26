// Magic weapons whose own special rules once did nothing: a misspelt Armour Bane (The Wrath of Lan Yao), a weapon's
// own Hatred (X) (The Sword of Hai Lun, Primeval Club) and Killing Blow against the Flammable only (Black Hammer of
// the Bull of Ash). Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS } from '../data/magicItems.js'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { fieldUnit } from './units.js'
import { unitByNames } from './roster.js'
import { equip, meleeWeaponOf } from './damage.js'
import { combatsToFight, fightCombat } from './combat.js'
import { engage } from './charge.js'
import { hates } from './orders.js'

const field = (army, id, n, opts = {}, side = 1) => { const u = fieldUnit(army, unitByNames(army, id, n, opts), side); equip(u); return u }
const put = (u, x, y, facing, files) => { u.placed = true; u.pos = { x, y }; u.facing = facing; if (files) u.files = files }
const pick = async (q, a) => a[a.length - 1][1]

// One round of combat: `a` charged `b`. Returns the log text.
async function fight (seed, a, b) {
  const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
  g.units = g.units.filter(u => u.side !== 1 && u.side !== 0)
  g.units.push(a, b)
  put(b, 30, 30, -Math.PI / 2, 5); put(a, 30, 30, Math.PI / 2)
  startBattle(g, 1); beginTurn(g)
  engage(g, a, b, 'front')
  a.status.charged = true
  g.phase = 'combat'; g.sub = 'fight'
  await fightCombat(g, combatsToFight(g)[0], pick)
  return g.log.map(l => l.text).join('\n')
}

test('no magic item has a misspelt rule: every weapon rule is spelt as the engine reads it', () => {
  for (const it of Object.values(ITEMS)) for (const p of it.profiles ?? []) for (const r of p.rules ?? []) assert.ok(!/^Amour /.test(r), `${it.name}: ${r}`)
  const lanYao = ITEMS['the-wrath-of-lan-yao'].profiles[0].rules
  assert.ok(lanYao.includes('Armour Bane (1)'))
})

test("a magic weapon's own Hatred counts: The Sword of Hai Lun re-rolls misses against the Dominion Hosts", async () => {
  const lord = () => field('jade-dominion-of-shen', 'lianshi-lord', 1, { items: ['the-sword-of-hai-lun'] })
  assert.ok(hates(meleeWeaponOf(lord()).rules, { army: 'dominion-hosts', name: 'Dominion Warriors' }))
  let seen = false
  for (let seed = 1; seed <= 12 && !seen; seed++) seen = /misses, Hatred/.test(await fight(seed, lord(), field('dominion-hosts', 'dominion-trolls', 3, {}, 0)))
  assert.ok(seen, 'a Hatred re-roll in twelve seeded combats')
})

test('Black Hammer of the Bull of Ash: Killing Blow against Flammable infantry, never against a unit that is not Flammable, nor a Flammable Behemoth', async () => {
  const smith = () => field('ashforged', 'infernal-castellan', 1, { items: ['black-hammer-of-the-bull-of-ash'] })
  let flammable = false, other = false, behemoth = false
  for (let seed = 1; seed <= 12; seed++) {
    if (/\d KILLING BLOW/.test(await fight(seed, smith(), field('lornefolk-of-lorne-wood', 'dryads', 10, {}, 0)))) flammable = true
    if (/KILLING BLOW/.test(await fight(seed, smith(), field('lornefolk-of-lorne-wood', 'grove-guard', 10, {}, 0)))) other = true
    if (/KILLING BLOW/.test(await fight(seed, smith(), field('lornefolk-of-lorne-wood', 'treeman', 1, {}, 0)))) behemoth = true
  }
  assert.ok(flammable, 'a Killing Blow on the Dryads (Flammable) in twelve seeded combats')
  assert.ok(!other, 'no Killing Blow on the Grove Guard')
  assert.ok(!behemoth, 'no Killing Blow on a Treeman: Flammable, but a Behemoth, not infantry or cavalry')
})

test('The Wrath of Lan Yao: its Armour Bane (1) is used in a fight', async () => {
  const lord = () => field('jade-dominion-of-shen', 'lianshi-lord', 1, { items: ['the-wrath-of-lan-yao'] })
  let seen = false
  for (let seed = 1; seed <= 12 && !seen; seed++) seen = /Armour Bane 1\)/.test(await fight(seed, lord(), field('lornefolk-of-lorne-wood', 'grove-guard', 10, {}, 0)))
  assert.ok(seen, 'an Armour Bane natural 6 in twelve seeded combats')
})
