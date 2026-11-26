// More Than One Combat Weapon: choosing which weapon a unit, a kit or a character fights with (rules/weaponChoice.js).
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { fieldUnit } from './units.js'
import { unitByNames } from './roster.js'
import { equip, meleeWeaponOf, saveFor } from './damage.js'
import { combatsToFight, fightCombat, attackGroups as attackGroupsOf } from './combat.js'
import { engage } from './charge.js'
import { PLAYABLE, armyEntries } from './roster.js'
import { askCombatWeapons, combatWeaponChoices, weaponChoicePoints, chooseCombatWeapon, chosenCombatWeapon } from './weaponChoice.js'

const O = 'rukka-firms'
const mob = (n, counts) => { const u = fieldUnit(O, unitByNames(O, 'iron-rukka-mob', n, { counts }), 1); equip(u); return u }
const ids = (u, o) => combatWeaponChoices(u, o).map(c => c.id)

test('a unit with a hand weapon and a great weapon chooses between them; the hand weapon is always there', () => {
  const gs = fieldUnit('concord-realm', unitByNames('concord-realm', 'kingsblades', 5, { equipment: 'Hand weapons, Great weapons' }), 0)
  equip(gs)
  const c = combatWeaponChoices(gs)
  assert.deepEqual(c.map(x => x.id), ['hand weapon', 'great weapon'])
  const gw = c[1]
  assert.equal(gw.ap, -2); assert.equal(gw.armourBane, 'Armour Bane (1)'); assert.equal(gw.twoHanded, true)
  assert.equal(c[0].ap, 0); assert.equal(c[0].armourBane, null)
})

test('the engine picks nothing - with no recorded choice the stand-in weapon is used (and said out loud); recording changes the weapon', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  const gs = g.units.find(u => u.entryId === 'kingsblades'); equip(gs)
  assert.equal(meleeWeaponOf(gs).key, 'great weapon') // stand-in when no choice was made (logged by askCombatWeapons)
  assert.equal(chooseCombatWeapon(g, gs, 'hand weapon'), true)
  assert.equal(meleeWeaponOf(gs).ap, 0)
  assert.equal(meleeWeaponOf(gs).key ?? 'hand weapon', 'hand weapon')
  assert.equal(chooseCombatWeapon(g, gs, 'great weapon'), true)
  assert.equal(meleeWeaponOf(gs).key, 'great weapon')
  assert.equal(chooseCombatWeapon(g, gs, 'halberd'), false) // not one of its weapons: nothing recorded
  assert.equal(meleeWeaponOf(gs).key, 'great weapon')
  g.round += 1 // "each and every" sub-phase: the choice does not carry over to the next turn
  assert.equal(gs.status.weaponChoice.turn === `${g.round}:${g.active}`, false)
  assert.equal(meleeWeaponOf(gs).key, 'great weapon') // old default again, until it is asked again
})

test('Motley Crew: Iron Rukka kits choose separately; additional hand weapons give Extra Attacks and lose the shield', () => {
  const m = mob(20, { 'Great weapons': 5, 'Additional hand weapons': 5, Shields: 20 })
  assert.deepEqual(ids(m), ['hand weapon']) // the unit's plain models: no choice
  const pts = weaponChoicePoints(m)
  assert.deepEqual(pts.map(p => p.kit), [null, 'Great weapons', 'Additional hand weapons'])
  assert.deepEqual(ids(m, { kit: 'Great weapons' }), ['hand weapon', 'great weapon'])
  assert.deepEqual(ids(m, { kit: 'Additional hand weapons' }), ['hand weapon', 'additional hand weapon'])
  const ahw = combatWeaponChoices(m, { kit: 'Additional hand weapons' })
  assert.equal(ahw[0].keepsShield, true)  // hand weapon + shield
  assert.equal(ahw[1].keepsShield, false) // Requires Two Hands
  assert.equal(ahw[1].extraAttacks, 'Extra Attacks (+1)')
  // the choice is recorded per kit and resolves with that kit's weapon
  assert.equal(chooseCombatWeapon(createGameFor(m), m, 'great weapon', { kit: 'Great weapons' }), true)
  assert.equal(chosenCombatWeapon(m, { kit: 'Great weapons' }).key, 'great weapon')
  assert.equal(chosenCombatWeapon(m, { kit: 'Additional hand weapons' }).key, 'additional hand weapon') // unchosen: default
})
function createGameFor (u) { const g = createGame({ lists: DEFAULT_LISTS, seed: 2, terrain: false }); g.units.push(u); return g }

test('a two-handed weapon loses the shield save, the hand weapon keeps it', () => {
  const m = mob(10, { 'Great weapons': 5, Shields: 10 })
  const kit = combatWeaponChoices(m, { kit: 'Great weapons' })
  const keep = saveFor(m, { twoHanded: kit[0].twoHanded }), lose = saveFor(m, { twoHanded: kit[1].twoHanded })
  assert.equal(keep.armour, lose.armour - 1) // full plate 4+, shield 3+ with the hand weapon, 4+ with the great weapon
})

test('Step 1.1 in a fought combat: the player is asked, the answer is recorded, and the rolls use that weapon', async () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 5, terrain: false })
  const gs = g.units.find(u => u.entryId === 'kingsblades')
  const foe = g.units.find(u => u.side !== gs.side && !u.crew?.length && u.entryId !== 'kingsblades')
  for (const u of [gs, foe]) { u.placed = true; equip(u) }
  gs.pos = { x: 30, y: 30 }; gs.facing = -Math.PI / 2; gs.files = 5
  foe.pos = { x: 30, y: 30 }; foe.facing = Math.PI / 2; foe.files = 5
  startBattle(g, gs.side); beginTurn(g)
  engage(g, gs, foe, 'front')
  g.phase = 'combat'; g.sub = 'fight'
  const asked = []
  await fightCombat(g, combatsToFight(g)[0], async (q, a) => { if (/which combat weapon/.test(q)) { asked.push(q); return 'hand weapon' } return a[a.length - 1][1] })
  assert.ok(asked.some(q => q.startsWith(gs.name)), 'the Kingsblades were asked which weapon')
  assert.equal(gs.status.weaponChoice.unit, 'hand weapon')
  assert.match(g.log.map(l => l.text).join('\n'), /fight with hand weapon/)
  assert.doesNotMatch(g.log.map(l => l.text).join('\n'), /Armour Bane/)
})

test('no ask, or an answer that is not on offer, is logged - never silent', async () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 3, terrain: false })
  const gs = g.units.find(u => u.entryId === 'kingsblades'); equip(gs)
  await askCombatWeapons(g, gs, null, (game, k, t) => game.log.push({ text: t }))
  assert.match(g.log.at(-1).text, /no choice made - fighting with great weapon/)
  await askCombatWeapons(g, gs, async () => 'banana', (game, k, t) => game.log.push({ text: t }))
  assert.match(g.log.at(-1).text, /"banana" is not one of its combat weapons/)
  assert.equal(gs.status.weaponChoice, undefined)
})

test('Motley Crew additional hand weapons: the kit rolls the +1 Extra Attacks', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 4, terrain: false })
  const m = mob(10, { 'Additional hand weapons': 10 })
  g.units.push(m)
  const rukka = g.units.find(u => u.side !== m.side && u.entryId !== 'iron-rukka-mob' && !u.crew?.length)
  for (const u of [m, rukka]) u.placed = true
  m.pos = { x: 30, y: 30 }; m.facing = Math.PI / 2; m.files = 5
  rukka.pos = { x: 30, y: 30 }; rukka.facing = -Math.PI / 2; rukka.files = 5
  startBattle(g, m.side); beginTurn(g); engage(g, m, rukka, 'front')
  chooseCombatWeapon(g, m, 'additional hand weapon', { kit: 'Additional hand weapons' })
  const grp = attackGroupsOf(g, m, rukka).find(x => /in base contact/.test(x.label))
  assert.equal(grp.attacks, 2) // A1 + Extra Attacks (+1)
  chooseCombatWeapon(g, m, 'hand weapon', { kit: 'Additional hand weapons' })
  assert.equal(attackGroupsOf(g, m, rukka).find(x => /in base contact/.test(x.label)).attacks, 1)
})

test('no unit whose weapons are a crew\'s, a mount\'s, a chariot\'s or a Giant\'s is asked a question; no unit is offered a cavalry spear out of a charge', () => {
  for (const a of PLAYABLE) for (const e of armyEntries(a)) {
    let u
    try { u = fieldUnit(a, unitByNames(a, e.id, e.minSize || 5, {}), 0); equip(u) } catch { continue }
    for (const charged of [false, true]) for (const p of weaponChoicePoints(u, { charged })) {
      const ids = p.options.map(o => o.id)
      if (!charged) assert.ok(!ids.includes('cavalry spear') && !ids.includes('lance'), `${e.id} offered a spear/lance out of a charge`)
      if (p.options.length > 1) {
        const bad = u.crew?.length || /Chariot/.test((u.troopType || []).join(' ')) || /monster|behemoth/i.test((u.troopType || []).join(' ') + ' ' + u.category) || u.special?.has?.('Howdah') || u.special?.has?.('Giant Attacks')
        assert.ok(!bad, `${a}:${e.id} is asked about ${ids.join('/')}`)
      }
    }
  }
})

// A character always picks its own weapon, whatever the unit it has joined fights with.
// A Blood Crone (Two hand weapons: hand weapon / additional hand weapon) joined to Bloodmaidens, which have the same two.
test('a character joined to a unit is asked on its own, and its choice is not the unit\'s', async () => {
  const D = 'vhar'
  const g = createGame({ lists: DEFAULT_LISTS, seed: 6, terrain: false })
  const side = g.units[0].side
  const host = fieldUnit(D, unitByNames(D, 'bloodmaidens', 10, { equipment: 'Two hand weapons' }), side)
  const hag = fieldUnit(D, unitByNames(D, 'blood-crone', 1, { equipment: 'Two hand weapons' }), side)
  const foe = g.units.find(u => u.side !== side && !u.crew?.length && u.entryId !== 'kingsblades')
  g.units.push(host, hag)
  for (const u of [host, hag, foe]) { u.placed = true; equip(u) }
  assert.deepEqual(ids(hag), ['hand weapon', 'additional hand weapon'])
  assert.deepEqual(ids(host), ['hand weapon', 'additional hand weapon'])
  host.pos = { x: 30, y: 30 }; host.facing = -Math.PI / 2; host.files = 5
  hag.pos = { x: 30, y: 30 }
  foe.pos = { x: 30, y: 30 }; foe.facing = Math.PI / 2; foe.files = 5
  startBattle(g, side); beginTurn(g)
  const j = (await import('./joining.js')).join(g, hag, host, { deploying: true })
  assert.equal(j.ok, true, j.reason)
  engage(g, host, foe, 'front')
  g.phase = 'combat'; g.sub = 'fight'
  const asked = []
  // the unit says additional hand weapon, the character says hand weapon
  await fightCombat(g, combatsToFight(g)[0], async (q, a) => {
    if (/which combat weapon/.test(q)) { asked.push(q); return q.startsWith(hag.name) ? 'hand weapon' : 'additional hand weapon' }
    return a[a.length - 1][1]
  })
  assert.ok(asked.some(q => q.startsWith(host.name)), 'the unit was asked')
  assert.ok(asked.some(q => q.startsWith(hag.name)), 'the joined character was asked on its own')
  assert.equal(host.status.weaponChoice.unit, 'additional hand weapon')
  assert.equal(hag.status.weaponChoice.unit, 'hand weapon')
})

// The champion clause covers only a champion who may be equipped differently from the unit. No unit in
// the data gives its champion a different mundane weapon (only magic items, which are always used), so there is
// no champion choice point: weaponChoicePoints offers the unit, plus kits for a Motley Crew, and nothing else.
test('no champion choice point exists because no champion has a different mundane weapon option', () => {
  const m = mob(10, { 'Great weapons': 5 })
  assert.deepEqual(weaponChoicePoints(m).map(p => p.kit), [null, 'Great weapons'])
})
