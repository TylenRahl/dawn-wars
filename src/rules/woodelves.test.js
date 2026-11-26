// Lornefolk of Lorne Wood: wards, the Dances of Lirrin, Guardians of the Wildwood, Tree Spirits and Tree Whack,
// enchanted arrows, the Arrow of Talorn, Vessa the Eye Thief, Hernath, the Lores of Lorne Wood and of the Wilds,
// Shadewood Coven, items and Spites.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { fieldUnit, hasRule } from './units.js'
import { unitByNames, findEntry, itemChoices, checkList, armyEntries } from './roster.js'
import { equip, saveFor, rangedWeaponsOf, meleeWeaponOf } from './damage.js'
import { canJoin } from './joining.js'
import { combatsToFight, fightCombat } from './combat.js'
import { engage } from './charge.js'
import { leadershipFor } from './leadership.js'
import { shootingTargets } from './shooting.js'
import { swapChoices, boundSpellsOf, spellTargets } from './magic.js'
import { effects as spellEffects } from './spells.js'
import { terrainOf } from './terrain.js'
import { arrowOfTalorn, skaryn, cloakOfSiriel, soundHorn, hornEnds, danceOf } from './woodelves.js'
import { spellHits } from './spells.js'
import { distanceBetween } from './units.js'
import { commandRange } from './leadership.js'

const W = 'lornefolk-of-lorne-wood'
const field = (id, n, opts = {}, side = 1) => { const u = fieldUnit(W, unitByNames(W, id, n, opts), side); equip(u); return u }
const game = seed => createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
const put = (u, x, y, facing, files) => { u.placed = true; u.pos = { x, y }; u.facing = facing; if (files) u.files = files }
const pick = (want) => async (q, a) => (a.find(o => want.test(String(o[0]))) || a[a.length - 1])[1]

test('the default list is legal; the Beast Pack\'s beasts are not units of their own', () => {
  const l = MORE_LISTS.find(x => x.army === W)
  assert.deepEqual(checkList(l).problems, [])
  assert.ok(!armyEntries(W).some(e => /^(deepwood-hounds|forest-cat|sylvan-boar|bear-of-lorne)$/.test(e.id)))
})

test('wards: Sisters of the Bramble 4+, Wilddancers 6+ (Talismanic Tattoos), Faelan 5+, Hernath 5+ (Cloak of Siriel)', () => {
  assert.equal(saveFor(field('sisters-of-the-bramble', 5), {}).ward, 4)
  assert.equal(saveFor(field('wilddancers', 5), {}).ward, 6)
  assert.equal(saveFor(field('faelan', 1), {}).ward, 5)
  assert.equal(saveFor(field('hernath', 1), {}).ward, 5)
})

test('weapons: the Lornefolk longbow on Grove Guard and characters; Ranger\'s glaive; enchanted arrows', () => {
  assert.equal(rangedWeaponsOf(field('grove-guard', 10))[0].key, 'lornefolk longbow')
  assert.equal(rangedWeaponsOf(field('pathstalker', 1))[0].key, 'lornefolk longbow')
  assert.equal(meleeWeaponOf(field('briarwood-rangers', 10)).key, 'ranger’s glaive')
  assert.equal(rangedWeaponsOf(field('grove-guard', 10, { options: ['Arcane Bodkins'] }))[0].AP, -2)
  assert.ok(rangedWeaponsOf(field('grove-guard', 10, { options: ['Swiftshiver Shards'] }))[0].rules.includes('Multiple Shots (2)'))
  const moon = rangedWeaponsOf(field('grove-guard', 10, { options: ['Moonfire Shot'] }))[0].rules
  assert.ok(moon.includes('Flaming Attacks') && moon.includes('Magical Attacks'))
  const tf = rangedWeaponsOf(field('grove-guard', 10, { options: ['Trueflight Arrows'] }))[0].rules
  assert.ok(tf.includes('Ignores Cover') && tf.includes('Quick Shot'))
})

test('Hernath: the Spear of Talorn in combat, Hawk\'s Talon shot; Open Order; no Hound models, so he can be shot', () => {
  const o = field('hernath', 1)
  assert.equal(meleeWeaponOf(o).key, 'magic:the-spear-of-talorn')
  assert.equal(meleeWeaponOf(o).range, 'Combat')
  assert.equal(rangedWeaponsOf(o)[0].key, 'magic:hawks-talon')
  assert.ok(hasRule(o, 'Open Order'))
  const g = game(2)
  g.units.push(o)
  put(o, 36, 30, -Math.PI / 2)
  const hg = g.units.find(u => u.side === 0 && rangedWeaponsOf(u).length && !/war machine/i.test(u.category))
  put(hg, 36, 20, Math.PI / 2, 5)
  assert.ok(shootingTargets(g, hg).some(t => t.unit === o))
})

test('Tree Spirit: a Barkwraith joins only Dryads; a Dryad unit takes no Leadership from an Elf General', () => {
  const g = game(3)
  const dryads = field('dryads', 10)
  const bw = field('barkwraith', 1)
  const capt = field('grove-captain', 1)
  assert.ok(canJoin(g, bw, dryads, { deploying: true }).ok)
  assert.match(canJoin(g, capt, dryads, { deploying: true }).reason || '', /Tree Spirit/)
  assert.match(canJoin(g, bw, field('grove-guard', 10), { deploying: true }).reason || '', /Tree Spirit/)
  const lord = field('grove-lord', 1, { command: ['General'] })
  g.units.push(dryads, lord)
  put(dryads, 30, 30, 0, 5); put(lord, 30, 36, 0)
  assert.ok(!/Inspiring Presence/.test(leadershipFor(g, dryads).from || ''))
  const anc = field('treeman-ancient', 1)
  g.units.push(anc); put(anc, 36, 30, 0)
  assert.match(leadershipFor(g, dryads).from || '', /Tree Spirit/)
})

test('a Treeman makes a Tree Whack (an Initiative test, then D3 hits with no Armour Roll)', async () => {
  const g = game(4)
  const tm = field('treeman', 1)
  g.units.push(tm)
  const halb = g.units.find(u => u.entryId === 'march-troops')
  put(halb, 30, 30, -Math.PI / 2, 10); put(tm, 30, 30, Math.PI / 2)
  startBattle(g, 1); beginTurn(g)
  engage(g, tm, halb, 'front')
  g.phase = 'combat'; g.sub = 'fight'
  await fightCombat(g, combatsToFight(g)[0], pick(/x/))
  assert.match(g.log.map(l => l.text).join('\n'), /TREE WHACK at March Troops — Initiative test/)
})

test('Wilddancers: the Dance chosen when the combat is fought — Whirling Death AP, Storm of Blades +1 A, Coil 4+ ward', async () => {
  for (const [dance, check] of [['Whirling Death', u => meleeWeaponOf(u).ap], ['The Shadows Coil', u => saveFor(u, {}).ward]]) {
    const g = game(5)
    const wd = field('wilddancers', 8)
    g.units.push(wd)
    const halb = g.units.find(u => u.entryId === 'march-troops')
    put(halb, 30, 30, -Math.PI / 2, 10); put(wd, 30, 30, Math.PI / 2, 8)
    startBattle(g, 1); beginTurn(g)
    engage(g, wd, halb, 'front')
    g.phase = 'combat'; g.sub = 'fight'
    await fightCombat(g, combatsToFight(g)[0], pick(new RegExp(dance)))
    const text = g.log.map(l => l.text).join('\n')
    assert.match(text, new RegExp(`perform a Dance of Lirrin: ${dance}`))
    if (dance === 'The Shadows Coil') assert.equal(check(wd), 4)
    if (dance === 'Whirling Death') assert.equal(danceOf(g, wd), 'whirling')
  }
})

test('Guardians of the Wildwood: +1 Attack and Multiple Damage (2) against a unit that causes Fear', async () => {
  const { guardians } = await import('./woodelves.js')
  const r = field('briarwood-rangers', 10)
  const tm = field('treeman', 1, {}, 0)
  assert.ok(hasRule(tm, 'Terror'))
  assert.ok(guardians(r, tm))
  assert.ok(!guardians(r, field('grove-guard', 10, {}, 0)))
})

test('the Arrow of Talorn: a S3 hit on the enemy General and +1 to the opponent\'s roll-off', () => {
  const g = game(6)
  const lord = field('grove-lord', 1, { command: ['General'] })
  g.units.push(lord)
  const gen = g.units.find(u => u.side === 0 && u.isGeneral)
  put(gen, 30, 10, Math.PI / 2); put(lord, 30, 40, -Math.PI / 2)
  const mods = arrowOfTalorn(g, spellHits, distanceBetween, () => true)
  assert.deepEqual(mods, [1, 0])
  assert.match(g.log.map(l => l.text).join('\n'), /THE ARROW OF TALORN/)
})

test('Vessa the Eye Thief: 3+ a S4 AP -1 hit; Hernath\'s Cloak heals; the Horn Frenzies for a turn', () => {
  let struck = false
  for (let seed = 1; seed <= 10 && !struck; seed++) {
    const g = game(seed)
    const a = field('faelan', 1)
    g.units.push(a); g.active = 1
    const t = g.units.find(u => u.side === 0 && u.entryId === 'march-troops')
    put(a, 30, 30, 0); put(t, 30, 40, 0, 10)
    skaryn(g, a, t, spellHits)
    struck = g.log.some(l => /Vessa strikes at/.test(l.text))
  }
  assert.ok(struck)
  const g = game(7)
  const o = field('hernath', 1)
  g.units.push(o); put(o, 30, 30, 0)
  o.models[0].wounds = 1
  for (let k = 0; k < 20; k++) cloakOfSiriel(g, o)
  assert.ok(o.models[0].wounds > 1)
  g.active = 1; g.round = 1
  const gg = field('grove-guard', 10); g.units.push(gg); put(gg, 34, 30, 0, 5)
  soundHorn(g, o, commandRange, distanceBetween)
  assert.ok(hasRule(gg, 'Frenzy'))
  g.active = 0
  hornEnds(g)
  assert.ok(!hasRule(gg, 'Frenzy'))
})

test('the Lore of Lorne Wood swap; Tree Singing makes a wood; Sapping Blight may target an engaged unit', async () => {
  const g = game(8)
  const sw = field('elder-weavesinger', 1, { lore: 'battle-magic', options: ['Wizard'] })
  g.units.push(sw)
  sw.wizard = { level: 1, lore: 'battle-magic', spells: [], castThisTurn: [], attempts: 0 }
  const slugs = swapChoices(sw).map(s => s.slug)
  for (const s of ['flock-of-doom-lornefolk', 'forest-walker', 'tree-singing']) assert.ok(slugs.includes(s), s)
  put(sw, 30, 30, 0)
  await spellEffects.resolve(g, sw, { slug: 'tree-singing', name: 'Tree Singing', category: 'Magical Vortex' }, { x: 30, y: 36 }, { result: 9 })
  assert.ok(terrainOf(g).some(f => f.kind === 'wood' && f.side === 1))
  const t = g.units.find(u => u.side === 0 && u.entryId === 'march-troops')
  put(t, 30, 38, Math.PI, 10); t.status.engaged = true
  const { SPELLS } = await import('../data/spells.js')
  assert.ok(spellTargets(g, sw, SPELLS['sapping-blight']).includes(t))
  assert.ok(!spellTargets(g, sw, SPELLS['fury-of-lorne-wood']).includes(t))
})

test('Shadewood Coven: the Sisters know one spell, cast Bound at Power Level 0, 1 or 2', () => {
  const g = createGame({ lists: [MORE_LISTS.find(x => x.army === W), DEFAULT_LISTS[0]], seed: 9, terrain: false })
  const s = g.units.find(u => u.entryId === 'sisters-of-the-bramble')
  assert.ok(s.covenSpell)
  const b = boundSpellsOf(s).find(x => x.slug === s.covenSpell)
  assert.equal(b.power, 2) // a Handmaiden and a standard bearer
  const plain = field('sisters-of-the-bramble', 5)
  plain.covenSpell = s.covenSpell
  assert.equal(boundSpellsOf(plain)[0].power, 0)
})

test('items and Forest Spites: allowances, one each per army, their rules', () => {
  const e = findEntry(W, 'grove-captain')
  const ch = itemChoices(W, e, unitByNames(W, 'grove-captain', 1))
  assert.ok(ch.some(c => c.id === 'a-haunting-of-dreads' && !c.why))
  assert.ok(ch.some(c => c.id === 'spear-of-twilight' && !c.why))
  const twice = { army: W, points: 2000, units: [unitByNames(W, 'grove-lord', 1, { command: ['General'], items: ['a-cackle-of-sprites'] }), unitByNames(W, 'grove-captain', 1, { items: ['a-cackle-of-sprites'] }), unitByNames(W, 'grove-guard', 10)] }
  assert.ok(checkList(twice).problems.some(p => /only one in the army/.test(p)))
  const over = { army: W, points: 2000, units: [unitByNames(W, 'grove-lord', 1, { command: ['General'], items: ['a-haunting-of-dreads', 'a-cackle-of-sprites'] }), unitByNames(W, 'grove-guard', 10)] }
  assert.ok(checkList(over).problems.some(p => /Forest Spites, over its 50-point allowance/.test(p)))
  const c = field('grove-captain', 1, { items: ['a-haunting-of-dreads'] })
  assert.ok(hasRule(c, 'Terror'))
  const gg = field('grove-guard', 10)
  gg.joined = [c]
  assert.ok(hasRule(gg, 'Terror'))
  assert.equal(meleeWeaponOf(field('grove-lord', 1, { items: ['spear-of-twilight'] })).flags.woundOn, 3)
  assert.ok(hasRule(field('grove-lord', 1, { items: ['mantle-of-rebirth'] }), 'Regeneration'))
})
