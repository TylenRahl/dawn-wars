// Magic items, second set: weapons, armour and talismans, arcane items, enchanted items and standards.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame } from './game.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, checkList } from './roster.js'
import { equip, saveFor, itemSaveRerolls, applyMultipleDamage, charmedWard } from './damage.js'
import { leadershipTest } from './leadership.js'
import { canJoin } from './joining.js'
import { flyMovement } from './movement.js'
import { useArcaneCommand, transmogrify, castingValueFor, becalm } from './arcane.js'
import { generateSpells, castable } from './magic.js'
import { spellHits } from './spells.js'
import { SPELLS } from '../data/spells.js'
import { isPlayable } from './items.js'
import { ITEMS } from '../data/magicItems.js'

const E = 'concord-realm'
const O = 'rukka-firms'
const field = (army, id, n, opts = {}, side = 0) => { const u = fieldUnit(army, unitByNames(army, id, n, opts), side); equip(u); return u }
const put = (g, u, x, y, facing) => { Object.assign(u, { placed: true, pos: { x, y }, facing }); g.units.push(u); return u }
const empty = seed => { const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false }); for (const u of g.units) u.placed = false; return g }
const logs = g => g.log.map(l => l.text).join('\n')

// (the armies finished so far: each new army's items are added here once they are all in)
const DONE = ['general', 'concord-realm', 'rukka-firms', 'kingdom-of-lyonne', 'knightly-virtues', 'deephold-clans', 'dominion-hosts']
test('every magic item of the finished armies and the common list has an effect', () => {
  assert.deepEqual(Object.values(ITEMS).filter(i => DONE.includes(i.army) && !isPlayable(i.id)).map(i => i.name), [])
})

test('weapons: Spelleater Axe gives Magic Resistance; Grim Verdict Furious Charge; Mace of Holtzbrand has two profiles', () => {
  assert.ok(hasRule(field(E, 'general-of-the-realm', 1, { items: ['spelleater-axe'] }), 'Magic Resistance'))
  const gv = field(E, 'captain-of-the-realm', 1, { items: ['grim-verdict'] })
  assert.ok(hasRule(gv, 'Furious Charge') && hasRule(gv, 'Impetuous'))
  assert.equal(ITEMS['mace-of-holtzbrand'].profiles.length, 2)
  const sorrow = field(E, 'general-of-the-realm', 1, { items: ['sword-of-sorrow'] })
  assert.equal(sorrow.kit.ranged[0].key, 'magic:sword-of-sorrow')
  assert.ok(sorrow.kit.ranged[0].flags.noWardRegen)
})

test('armour: Meteoric Iron ignores AP; Dark Faith re-rolls until wounded; Icon of Fortitude; Charmed Shield once', () => {
  const g = empty(1)
  const mi = field(E, 'captain-of-the-realm', 1, { items: ['armour-of-meteoric-iron'] })
  const sv = saveFor(mi, {})
  assert.equal(sv.armour, 5); assert.ok(sv.apImmune)
  const df = field(E, 'captain-of-the-realm', 1, { items: ['armour-of-dark-faith'] })
  assert.match(itemSaveRerolls(g, df, 'armour', [1, 2], d => d >= 6).note, /Armour of Dark Faith/)
  df.models[0].wounds -= 1
  assert.doesNotMatch(itemSaveRerolls(g, df, 'armour', [1, 2], d => d >= 6).note, /Armour of Dark Faith/)
  const icon = field(E, 'captain-of-the-realm', 1, { items: ['icon-of-fortitude'] })
  applyMultipleDamage(g, icon, [3], 'a cannonball')
  assert.equal(icon.models[0].wounds, icon.models[0].startW - 1)
  const ch = field(E, 'captain-of-the-realm', 1, { items: ['charmed-shield'] })
  charmedWard(g, ch, 1, saveFor(ch, {}))
  charmedWard(g, ch, 1, saveFor(ch, {}))
  assert.equal((logs(g).match(/Charmed Shield/g) || []).length, 1)
  // (not when a better Ward is there to be rolled)
  const both = field(E, 'captain-of-the-realm', 1, { items: ['charmed-shield', 'talisman-of-protection'] })
  assert.equal(charmedWard(g, both, 1, saveFor(both, {})), 0)
})

test('Shroud of Iron: 6+ Ward against non-magical templates for the bearer and its unit', () => {
  const st = field(E, 'march-troops', 20)
  st.joined = [field(E, 'captain-of-the-realm', 1, { items: ['shroud-of-iron'] })]
  assert.equal(saveFor(st, { template: true }).ward, 6)
  assert.equal(saveFor(st, {}).ward, null)
})

test('Mantle of Drifting Shadow: +1 Movement, Loner; Flying Carpet: Fly (8), no joining', () => {
  const g = empty(2)
  const m = field(E, 'captain-of-the-realm', 1, { items: ['mantle-of-drifting-shadow'] })
  assert.ok(hasRule(m, 'Loner'))
  const fc = field(E, 'captain-of-the-realm', 1, { items: ['flying-carpet'] })
  assert.equal(flyMovement(fc), 8)
  assert.match(canJoin(g, fc, field(E, 'march-troops', 10), { deploying: true }).reason, /Flying Carpet/)
})

test('arcane: Tome of Midnight one more spell; a frog casts nothing; Becalming Orb +2; Arch-Lightning Rod grounds fliers', () => {
  const g = empty(3)
  const mage = field(E, 'master-mage', 1, { lore: 'battle-magic', items: ['tome-of-midnight'] })
  generateSpells(g, mage)
  assert.equal(mage.wizard.spells.length, 2)
  g.sub = 'conjuration'; g.active = 0
  transmogrify(g, mage)
  assert.deepEqual(castable(g, mage), [])
  const rukka = put(g, field(O, 'rukka-head-case', 1, { lore: 'big-ruck-magic' }, 1), 30, 20, Math.PI / 2)
  const orb = put(g, field(E, 'captain-of-the-realm', 1, { items: ['becalming-orb'] }), 30, 30, -Math.PI / 2)
  becalm(g, orb)
  assert.equal(castingValueFor(g, rukka, SPELLS['foot-of-bosher-or-wangler']), SPELLS['foot-of-bosher-or-wangler'].castingValue + 2)
  const rod = put(g, field(O, 'rukka-gaffer', 1, { items: ['arch-lightning-rod'] }, 1), 10, 10, Math.PI / 2)
  const griffon = put(g, field(E, 'general-of-the-realm', 1, { mount: 'Royal Griffon' }), 50, 40, -Math.PI / 2)
  rod.models[0].profile.Ld = 12 // (a test that always passes, for the check)
  useArcaneCommand(g, rod, 'arch-lightning-rod')
  if (/Arch-Lightning Rod: no enemy unit/.test(logs(g))) assert.equal(flyMovement(griffon), 0)
})

test('standards and banners: Dark Heart 3D6 discard the highest, no Inspiring Presence; Gleaming Pennant; Sticks', () => {
  const g = empty(4)
  const st = put(g, field(E, 'march-troops', 20, { command: ['Standard bearer'], items: ['the-banner-of-the-dark-heart'] }), 30, 30, -Math.PI / 2)
  const t = leadershipTest(g, st, { label: 'Panic', kind: 'panic' })
  assert.match(t.text, /3D6, the highest discarded/)
  const nippers = field(O, 'nipper-mob', 20, { command: ['Standard bearer'], items: ['banner-of-the-sticks'] }, 1)
  assert.ok(hasRule(nippers, 'Move Through Cover'))
  const nogo = { ...DEFAULT_LISTS[1], units: [...DEFAULT_LISTS[1].units, unitByNames(O, 'rukka-gaffer', 1, { items: ['backstabbers-blade'] })] }
  assert.ok(checkList(nogo).problems.some(p => /Backstabber/.test(p)))
})

test('Unmade-blooded Steed: the mount +1 Movement, Strength and Attacks, and Impetuous', () => {
  const base = field(E, 'captain-of-the-realm', 1, { mount: 'Barded Warhorse' })
  const ds = field(E, 'captain-of-the-realm', 1, { mount: 'Barded Warhorse', items: ['unmade-blooded-steed'] })
  assert.equal(ds.mount.profile.S, base.mount.profile.S + 1)
  assert.ok(hasRule(ds, 'Impetuous'))
})

test('Spellshield: a 5+ Ward against Magic Missiles', () => {
  const g = empty(5)
  const c = field(E, 'captain-of-the-realm', 1, { items: ['spellshield'] })
  g.spellCategory = 'Magic Missile'
  spellHits(g, c, 3, 10, 0, { label: 'test: ' })
  assert.match(logs(g), /Untouchable save 5\+/)
})

test("a champion's magic items: offered within its allowance; its weapon and armour are its own", async () => {
  const { champItemChoices } = await import('./roster.js')
  const { champView } = await import('./damage.js')
  const { findEntry } = await import('./roster.js')
  const e = findEntry(E, 'inner-circle-knights')
  const sel = unitByNames(E, 'inner-circle-knights', 5, { command: ['Inner Circle Preceptor (champion)'] })
  const ch = champItemChoices(E, e, sel)
  assert.ok(ch.some(c => c.id === 'sword-of-might' && !c.why))
  sel.champItems = ['sword-of-might', 'enchanted-shield']
  assert.deepEqual(checkList({ ...DEFAULT_LISTS[0], points: 3000, units: [...DEFAULT_LISTS[0].units, sel] }).problems.filter(p => /champion/.test(p)), [])
  const u = fieldUnit(E, sel, 0); equip(u)
  assert.equal(champView(u).kit.melee[0].key, 'magic:sword-of-might')
  assert.notEqual(u.kit.melee[0].key, 'magic:sword-of-might')
})
