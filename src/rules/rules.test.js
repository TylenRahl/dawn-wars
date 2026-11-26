// The engine against the game's own rules: the charts are read out of rules/core/*.md and compared cell by
// cell, so a mistyped number in the engine fails here. Then whole battles are played by a simple automatic player on
// many seeds, to shake out crashes and stuck states. Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { combatToHit } from './combat.js'
import { toWoundNeed } from './damage.js'
import { TROOP_TYPES } from './troops.js'
import { createRng, testLeadership } from './dice.js'
import { WEAPONS } from '../data/weapons.js'
import { DEFAULT_LISTS, MORE_LISTS } from './testLists.js'
import { pray } from './lyonne.js'
import { createGame, deployUnit, startBattle, onTable, unitsOf, whoDeploys, deployable } from './game.js'
import { beginTurn, nextStep } from './turn.js'
import { declareCharge, resolveCharge, canDeclareCharge, reactionsFor, fleeFrom, fleeMove, counterCharge } from './charge.js'
import { shoot, canShoot, shootingTargets, standAndShoot } from './shooting.js'
import { combatsToFight, fightCombat } from './combat.js'
import { makeMove } from './movement.js'
import { rallyPhase, startOfTurn, commandPhase } from './strategy.js'
import { checkVictory } from './victory.js'
import { isDead, distanceBetween, centre } from './units.js'
import { returnFromPursuit } from './movement.js'
import { formationsOf, width, depth } from './units.js'
import { unitByNames } from './roster.js'
import { canReserve, ambushRolls, decideArrival, arrivals, placeReinforcement } from './ambush.js'
import { holdInReserve } from './game.js'
import { onImpassable } from './terrain.js'
import { leadershipFor } from './leadership.js'
import { castable, castSpell, spellTargets, generateSpells } from './magic.js'
import { effects as spellEffects, moveVortices, IMPLEMENTED_LORES } from './spells.js'
import { setSub } from './turn.js'
import { centre as unitCentre } from './units.js'
import { unitMass } from './troops.js'
import { supporters, supportOptions, supportingAction, supportChargeTargets, supportingCharge } from './regiments.js'
import { randomMovers, rollRandomMove, randomContactTargets, randomMoveIntoContact, randomMoveStay } from './randomMovement.js'
import { canRelease, releaseWhirler, whirlersToMove, choosesDirection, moveWhirler, randomAngle } from './whirlers.js'

const BOOK = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'rules', 'core')
const chapter = f => readFileSync(join(BOOK, f), 'utf8')
// every table row after a heading, as cells with the bold marks taken off; separator rows dropped
function tables (md, after) {
  const lines = md.slice(md.indexOf(after)).split('\n')
  const out = []; let cur = null
  for (const l of lines) {
    if (l.startsWith('|')) { if (!cur) out.push(cur = []); if (!/^\|-/.test(l)) cur.push(l.split('|').slice(1, -1).map(c => c.replace(/\*/g, '').trim())) } else if (cur) cur = null
    if (out.length && !cur && /^## /.test(l) && !l.includes(after)) break
  }
  return out
}
// a chart printed in two halves (columns 1-5, then 6-10): { row number: { column number: cell } }
function chart (md, after) {
  const got = {}
  for (const t of tables(md, after).slice(0, 2)) {
    const cols = t[0].slice(1).map(Number)
    for (const r of t.slice(1)) { const n = Number(r[0].replace(/^\D+/, '')); got[n] ??= {}; cols.forEach((c, i) => { got[n][c] = r[i + 1] }) }
  }
  return got
}

test('combat To Hit chart = the rules, every cell', () => {
  const rows = chart(chapter('06-melee.md'), '## 5. Roll to hit')
  for (let ws = 1; ws <= 10; ws++) for (let t = 1; t <= 10; t++) assert.equal(combatToHit(ws, t), Number(rows[ws][t].replace('+', '')), `CM${ws} vs CM${t}`)
})

test('To Wound chart = the rules, every cell', () => {
  const rows = chart(chapter('06-melee.md'), '## 6. Roll to wound')
  for (let s = 1; s <= 10; s++) {
    for (let t = 1; t <= 10; t++) {
      const cell = rows[s][t]; const want = /^[-–]$/.test(cell) ? null : Number(cell.replace('+', ''))
      assert.equal(toWoundNeed(s, t), want, `Mi${s} vs Re${t}`)
    }
  }
})

test('Troop Type Table = the rules', () => {
  const [rows] = tables(chapter('02-characteristics-and-troop-types.md'), '### Troop type table')
  const alias = { 'Light Chariots': 'Light Chariot', 'Heavy Chariots': 'Heavy Chariot', 'Monstrous Creatures': 'Monstrous Creature', Behemoths: 'Behemoth', 'War Machines': 'War Machine' }
  let checked = 0
  for (const [, name, us, width, max] of rows.slice(1)) {
    const tt = TROOP_TYPES[alias[name] || name]
    if (!tt) continue
    checked++
    assert.equal(tt.rankWidth, width === '-' ? null : Number(width), name + ' models per rank')
    assert.equal(tt.maxRanks, max === '-' ? 0 : Number(max.replace('+', '')), name + ' max rank bonus')
    if (/Starting HP/.test(us)) assert.equal(tt.us, 'wounds', name)
    else assert.equal(tt.us, Number(us), name + ' unit mass')
  }
  assert.ok(checked >= 13)
})

test('weapon profiles as read from the weapon data', () => {
  assert.deepEqual([WEAPONS.handgun.range, WEAPONS.handgun.S, WEAPONS.handgun.AP], ['24"', '4', '-1'])
  assert.deepEqual([WEAPONS.crossbow.range, WEAPONS.crossbow.S], ['30"', '4'])
  assert.deepEqual([WEAPONS['great weapon'].S, WEAPONS['great weapon'].AP], ['S+2', '-2'])
  assert.equal(WEAPONS['great cannon'].range, '60"')
  assert.equal(WEAPONS.mortar.range, '12-48"')
  assert.equal(WEAPONS['stone thrower'].range, '12-60"')
})

test('a Leadership test: natural 12 always fails, natural 2 always passes', () => {
  const r = createRng(1)
  for (let i = 0; i < 2000; i++) {
    const t = testLeadership(r, 12)
    if (t.total === 12) assert.equal(t.passed, false)
    const u = testLeadership(r, 1)
    if (u.total === 2) assert.equal(u.passed, true)
  }
})

// ---- whole battles by an automatic player ----
function deployBoth (g) {
  const next = { 0: 4, 1: 4 }
  for (let i = 0; i < 120; i++) {
    const side = whoDeploys(g)
    if (side == null) break
    const u = deployable(g, side)[0]
    // Ambushers are held in reserve (rules/ambush.js)
    if (canReserve(u) && holdInReserve(g, u).ok) continue
    // characters go with the first big infantry unit of their side (exercises joining.js)
    if ((u.troopType || []).includes('Character')) {
      const fam = x => /Cavalry/.test(x.troopType.join(' ')) ? 'Cavalry' : 'Infantry'
      const host = g.units.find(h => h.side === side && h.placed && fam(h) === fam(u) && h.troopType.join(' ').includes(fam(u)) && !h.troopType.includes('Character') && !/Chariot/.test(h.troopType.join(' ')) && h.models.length >= (fam(u) === 'Cavalry' ? 4 : 10))
      if (host && deployUnit(g, u, { joinHost: host }).ok) continue
    }
    // a random formation where the unit may choose (Skirmish, Open Order...)
    const fs = formationsOf(u)
    u.formation = fs[Math.floor(g.rng() * fs.length)]
    const w = Math.min(u.files, u.models.length) * u.base.w + 1
    // step along (and back) until there is room: terrain may be in the way
    let r = null
    // a detachment goes beside its regiment, within 3" (Regimental Deployment)
    if (u.regiment?.placed) {
      const reg = u.regiment
      const rw = width(reg)
      const face = side === 0 ? -Math.PI / 2 : Math.PI / 2
      const back = side === 0 ? 1 : -1 // towards the deploying side's own table edge
      const spots = []
      for (const gap of [0.6, 1.2, 2, 2.8]) {
        for (const sgn of [1, -1]) spots.push({ x: reg.pos.x + sgn * (rw / 2 + gap + width(u) / 2), y: reg.pos.y })
        for (const dx of [0, -2, 2]) spots.push({ x: reg.pos.x + dx, y: reg.pos.y + back * (depth(reg) + gap) })
      }
      for (const p of spots) { if (r?.ok) break; r = deployUnit(g, u, { pos: p, facing: face }) }
      if (r?.ok) next[side] = Math.max(next[side], u.pos.x + w / 2 + 1)
    }
    for (let k = 0; k < 400 && !r?.ok; k++) {
      const x = next[side] + w / 2 + (k % 100) * 0.5
      const y = (side === 0 ? 37 : 11) + (side === 0 ? 1 : -1) * Math.floor(k / 100) * 2.5
      if (x + w / 2 > 71) { next[side] = 2; continue } // (the row is full: start again from the left)
      r = deployUnit(g, u, { pos: { x, y }, facing: side === 0 ? -Math.PI / 2 : Math.PI / 2 })
      if (r.ok) next[side] = x + w / 2 + 1
    }
    assert.ok(r?.ok, `${u.name}: ${r?.reason}`)
    if (next[side] > 66) next[side] = 2
  }
}

// every Wizard of the active side casts what it can now, at a random target; the other side
// dispels at random
async function castAll (g) {
  const ask = async (q, a) => a[Math.floor(g.rng() * a.length)][1]
  for (const w of g.units.filter(u => u.wizard && !u.status.removed && u.placed)) {
    for (const s of castable(g, w)) {
      if (!castable(g, w).includes(s)) continue
      let target = null
      if (s.category === 'Magical Vortex') {
        const e = onTable(g).find(o => o.side !== w.side)
        if (!e) continue
        target = { x: Math.max(1, Math.min(71, unitCentre(e).x)), y: (unitCentre(e).y + unitCentre(w).y) / 2 }
      } else if (!/self/i.test(s.range)) {
        const ts = spellTargets(g, w, s)
        if (!ts.length) continue
        target = ts[Math.floor(g.rng() * ts.length)]
      }
      await castSpell(g, w, s.slug, target, ask, spellEffects)
    }
  }
}

async function playTurn (g) {
  const ask = async (q, a) => a[0][1]
  // Ambushers in reserve roll to arrive, and come on at the far end of the long edge behind the enemy
  for (const r of ambushRolls(g, g.active)) decideArrival(g, r)
  moveVortices(g)
  startOfTurn(g)
  // Whirlers: release one in front of each mob that can (rules/whirlers.js)
  for (const m of unitsOf(g, g.active).filter(m => canRelease(g, m).ok)) releaseWhirler(g, m, { x: m.pos.x + Math.cos(m.facing) * 1.5, y: m.pos.y + Math.sin(m.facing) * 1.5 })
  commandPhase(g)
  nextStep(g); nextStep(g) // conjuration
  await castAll(g)
  rallyPhase(g)
  nextStep(g) // to movement / charges
  for (const u of unitsOf(g, g.active).filter(u => u.placed)) {
    const t = onTable(g).filter(o => o.side !== u.side && canDeclareCharge(g, u, o).ok)[0]
    if (t) declareCharge(g, u, t)
  }
  for (const u of unitsOf(g, g.active).filter(u => u.status.declaredCharge)) {
    const t = g.units.find(x => x.id === u.status.declaredCharge.target)
    if (t && !t.status.removed && !t.status.reaction) {
      const opts = reactionsFor(g, t, u)
      const pick = opts[Math.floor(g.rng() * opts.length)]
      t.status.reaction = pick
      if (pick === 'stand' || pick === 'fireflee') { t.status.stoodAndShot = true; await standAndShoot(g, t, u) }
      if (pick === 'flee' || (pick === 'fireflee' && !t.status.removed)) fleeFrom(g, t, u, { keepHighest: pick === 'fireflee' })
      if (pick === 'counter') counterCharge(g, t, u)
      if (pick !== 'flee' && pick !== 'fireflee') for (const d of supporters(g, t)) { const o = supportOptions(g, d, u); await supportingAction(g, d, t, u, o[Math.floor(g.rng() * o.length)]) }
    }
  }
  for (const u of unitsOf(g, g.active).filter(u => u.status.declaredCharge)) if (!u.status.removed) resolveCharge(g, u)
  for (const d of g.units.filter(x => x.side !== g.active && x.status.supportCharge)) { const ts = supportChargeTargets(g, d); if (ts.length) supportingCharge(g, d, ts[0]); else d.status.supportCharge = null }
  nextStep(g) // charge moves -> compulsory
  nextStep(g) // -> compulsory
  for (const u of g.units.filter(u => u.side === g.active && u.status.offTable && !u.status.removed)) returnFromPursuit(g, u)
  for (const u of arrivals(g, g.active)) for (const p of [{ x: 0.5, y: 24 }, { x: 71.5, y: 24 }, { x: 10, y: 0.5 }, { x: 60, y: 47.5 }, { x: 36, y: 0.5 }, { x: 36, y: 47.5 }]) if (placeReinforcement(g, u, p).ok) break
  for (const u of unitsOf(g, g.active).filter(u => u.placed && u.status.fleeing && !u.status.fledThisPhase)) fleeMove(g, u)
  for (const f of whirlersToMove(g)) if (!f.status.removed) moveWhirler(g, f, choosesDirection(g, f) ? f.facing : randomAngle(g))
  // Random Movement: roll, then bound into the first enemy in reach, or forward up to 4"
  for (const u of randomMovers(g)) {
    const r = rollRandomMove(g, u)
    const t = randomContactTargets(g, u)[0]
    if (!(t && randomMoveIntoContact(g, u, t.t).ok)) { const m = makeMove(g, u, [{ type: 'forward', d: Math.min(4, r) }], { random: true }); if (!m.ok) randomMoveStay(g, u) }
  }
  nextStep(g) // -> remaining
  for (const u of unitsOf(g, g.active).filter(u => u.placed && !u.status.moved && !u.status.engaged)) makeMove(g, u, [{ type: 'forward', d: 2 }])
  await castAll(g)
  nextStep(g) // -> shooting
  await castAll(g)
  for (const u of unitsOf(g, g.active).filter(u => u.placed)) {
    if (!canShoot(g, u).ok) continue
    const t = shootingTargets(g, u)[0]
    if (t) await shoot(g, u, t.unit, ask)
  }
  nextStep(g) // -> combat
  await castAll(g)
  for (let i = 0; i < 20; i++) {
    const c = combatsToFight(g)[0]
    if (!c) break
    // random answers to every combat question: challenges, pursuit, restraint, overrun
    await fightCombat(g, c, async (q, a) => a[Math.floor(g.rng() * a.length)][1])
  }
  if (checkVictory(g)) return
  nextStep(g) // next turn
}

test('thirty automatic battles end without errors or stuck units', async () => {
  let challenges = 0
  let whirlerBattles = 0
  let bounded = 0
  // the engines' battles: what happened in them (printed, so a rule that never fires is seen)
  const SEEN = { arrives: /ARRIVES as reinforcements/, steamCannon: /Steam Cannon/, skyfire: /Skyfire: D3/, breath: /Breath Weapon/, vomit: /Troll Vomit —/, motherly: /Motherly Love: D6/, flungNipper: /Flung Nipper: D3/, hunger: /INDISCRIMINATE HUNGER/, witchBane: /Witch Bane/, assorted: /with the (ball & chain|hooked halberd|man-catcher)/, steamPower: /Steam Power roll/, mercs: /Mercenaries\): D6/, reaving: /Sword of Reaving/, clouter: /Clouter/, kaBlam: /Staff of Ka-Blam/, laurels: /Laurels of Victory/, spite: /Spiteful Shield/, awayEnd: /Away End Banner/ }
  const seen = {}
  for (let seed = 1; seed <= 30; seed++) {
    // every third battle the Rukka bring two Nipper Wolf Chariots, a Rukka Boar Chariot, a Giant,
    // Gobbler Hoppers, a Wrecker Gobbler, a Gaffer on a Wyvern and a Gloom Nipper Gaffer on a Giant
    // Cave Gobbler; the Concord Realm a General on a Royal Griffon
    // and every third battle after those (seed % 3 === 1, from 4) the engines and the supplement units:
    // an Iron Kettle, a War Wagon, a Skyfire Rocket Battery, a Lector on the War Altar, a Witch Hunter, Torvald
    // with Leopard Knights, Crownsworn Ogres; a Troll Hag with Stone Trolls, Mick, a Broodmaw with its
    // lobber, Titch with Wolf Riders in reserve, a Flung Nipper, Scorchlands Ogre Bulls
    const E = 'concord-realm'; const O = 'rukka-firms'
    const engines = [{ ...DEFAULT_LISTS[0], points: 3500, units: [...DEFAULT_LISTS[0].units, unitByNames(E, 'iron-kettle', 1), unitByNames(E, 'war-wagon', 1), unitByNames(E, 'helstrom-rocket-battery', 1), unitByNames(E, 'lector-of-saint-halvar', 1, { mount: 'War Altar of Saint Halvar' }), unitByNames(E, 'witch-hunter', 1, { options: ['The Revenant'] }), unitByNames(E, 'torvald-brenner', 1), unitByNames(E, 'inner-circle-leopard-knights', 5), unitByNames(E, 'crownsworn-ogres', 3), unitByNames(E, 'captain-of-the-realm', 1, { items: ['sword-of-reaving', 'armour-of-dark-faith', 'crystal-ball'] }), unitByNames(E, 'general-of-the-realm', 1, { items: ['mace-of-holtzbrand', 'charmed-shield', 'laurels-of-victory'] }), unitByNames(E, 'master-mage', 1, { lore: 'battle-magic', items: ['power-scroll', 'twin-tailed-wand'] })] },
      { ...DEFAULT_LISTS[1], points: 3500, units: [...DEFAULT_LISTS[1].units, unitByNames(O, 'troll-hag', 1), unitByNames(O, 'stone-troll-mob-special', 3), unitByNames(O, 'mick-bogwallop', 1), unitByNames(O, 'broodmaw-spider', 1, { options: ['Spidersilk lobber'] }), unitByNames(O, 'titch-toothnicker', 1), unitByNames(O, 'nipper-wolf-rider-mob', 5, { ambushers: true }), unitByNames(O, 'nipper-flinger', 1), unitByNames(O, 'badland-ogre-bulls', 3), unitByNames(O, 'rukka-gaffer', 1, { items: ['grim-verdict', 'spiteful-shield', 'nutters-lid'] }), unitByNames(O, 'nipper-gaffer', 1, { items: ['clouters-one-hit-wonder', 'glittering-wotnots'] }), unitByNames(O, 'rukka-head-case', 1, { lore: 'big-ruck-magic', items: ['staff-of-ka-blam', 'unweaving-scroll'] }), unitByNames(O, 'nipper-wolf-rider-mob', 10, { command: ['Standard bearer'], items: ['the-away-end-banner'] })] }]
    const lists = seed % 3 === 1 && seed > 1 ? engines : seed % 3 ? DEFAULT_LISTS : [{ ...DEFAULT_LISTS[0], units: [...DEFAULT_LISTS[0].units, unitByNames('concord-realm', 'general-of-the-realm', 1, { mount: 'Griffon' })] }, { ...DEFAULT_LISTS[1], points: 2000, units: [...DEFAULT_LISTS[1].units, unitByNames('rukka-firms', 'nipper-wolf-chariot', 2), unitByNames('rukka-firms', 'rukka-boar-chariots', 1), unitByNames('rukka-firms', 'giant', 1), unitByNames('rukka-firms', 'gloom-nipper-gobbler-hopper-mob', 5), unitByNames('rukka-firms', 'wrecker-gobblers', 1), unitByNames('rukka-firms', 'rukka-gaffer', 1, { mount: 'Wyvern' }), unitByNames('rukka-firms', 'gloom-nipper-gaffer', 1, { mount: 'Giant Cave Gobbler' }), unitByNames('rukka-firms', 'rukka-top-lad', 1, { mount: 'Boar Chariot' })], points: 3200 }]
    const g = createGame({ lists, seed })
    // the Wizards take turns with every implemented lore, at Level 2, so all their spells get cast
    const lores = IMPLEMENTED_LORES
    for (const w of g.units.filter(u => u.wizard)) {
      w.lore = lores[(seed + w.side) % lores.length]
      w.special.add('Level 2 Wizard')
      generateSpells(g, w)
    }
    deployBoth(g)
    startBattle(g, seed % 2)
    beginTurn(g)
    for (let turn = 0; turn < 12 && g.phase !== 'over'; turn++) await playTurn(g)
    if (g.log.some(l => /CHALLENGE:/.test(l.text))) challenges++
    if (g.log.some(l => /RELEASES A WHIRLER/.test(l.text))) whirlerBattles++
    if (g.log.some(l => /bounds [\d.]+" \(of/.test(l.text))) bounded++
    for (const [k, re] of Object.entries(SEEN)) if (g.log.some(l => re.test(l.text))) seen[k] = (seen[k] || 0) + 1
    // nobody may be engaged with a unit that is gone, or engaged with nothing
    for (const u of onTable(g)) {
      for (const id of Object.keys(u.engagedWith || {})) {
        const o = g.units.find(x => x.id === id)
        assert.ok(o && !o.status.removed && !isDead(o), `seed ${seed}: ${u.name} engaged with a unit that is gone (${o?.name}: ${o?.status.destroyed}) ` + g.log.filter(l => o && l.text.includes(o.name)).slice(-4).map(l => l.text).join(' // '))
      }
      if (u.status.engaged) assert.ok(Object.keys(u.engagedWith || {}).length, `seed ${seed}: ${u.name} engaged with nothing`)
      assert.ok(Number.isFinite(u.pos.x) && Number.isFinite(u.pos.y), `seed ${seed}: ${u.name} position`)
      assert.ok(!onImpassable(g, u), `seed ${seed}: ${u.name} ${u.id} ${u.equipment} at ${u.pos.x.toFixed(1)},${u.pos.y.toFixed(1)} facing ${u.facing.toFixed(2)} status ${JSON.stringify(Object.fromEntries(Object.entries(u.status).filter(([k, v]) => v === true)))} rocks ${JSON.stringify(g.terrain.filter(f => f.kind === "rocks").map(f => f.at))} ended on impassable terrain. ` + g.log.filter(l => l.text.includes(u.name)).slice(-6).map(l => l.text).join(" // "))
    }
  }
  console.log(`(challenges fought in ${challenges} of 30 battles; Whirlers released in ${whirlerBattles}; gobblers bounded into an enemy in ${bounded})`)
  assert.ok(whirlerBattles > 0, 'no battle released a Whirler')
  console.log('engines battles:', JSON.stringify(seen))
})

// the armies made playable after the first two: each one's default list against the Concord Realm and the Rukka, on
// both sides of the table
test('automatic battles for the other armies end without errors or stuck units', async () => {
  for (const other of MORE_LISTS) {
    const seen = {}
    const SEEN = { blessed: /prays for the Blessings/, blessingWard: /Favour of the Mere/, lance: /Lance/, trebuchet: /Field Trebuchet|trebuchet/i, chalice: /Chalice/, peasantry: /Peasantry/, organGun: /Organ gun: Artillery/, mortar: /Mortar/, feint: /Feint & Dodge/, disdain: /Noble Disdain/, phalanx: /Phalanx/, mercs: /Mercenaries\): D6/, spellbreak: /Spellbreaking/, deepsteel: /Deepsteel/, steamGun: /Steam Gun/, deathblow: /Deathblow/, entrenched: /Entrenched/, resolute: /Resolute/, runeWeapon: /Rune of Might/, forging: /Rune of Forging/, oathstone: /Oathstone/, gaze: /Gaze of the Gods/, dominionArmour: /Dominion Armour/, ensorcelled: /Ensorcelled/, frenzy: /Frenzy/, undivided: /Mark of the Unbound/, vomit: /Troll Vomit/, impact: /Impact Hits/, primalFury: /PRIMAL FURY until/, hornstone: /HORNSTONE/, bloodRage: /BLOOD RAGE/, bestial: /Bestial/, ogreCharge: /Ogre Charge/, gutcannon: /Cannon of the Sky/, shotbelly: /Shotbelly/, traps: /Traps & Snares/, moonsilver: /Moonsilver/, valour: /Valour of Ages/, witness: /Witness to Destiny/, boltThrower: /Bolt thrower|bolt thrower/, dance: /Dance of Lirrin/, treeWhack: /TREE WHACK/, tattoos: /Talismanic Tattoos/, daughters: /Daughters of Eternity/, lornefolk: /Lornefolk Longbow/, coven: /Shadewood Coven/, wilds: /Blessing of the Wood Queen|Sapping Blight|Swirling Mists|Hidden Pathways|Wrath of the Elder Oak|Fury of Lorne Wood|Spiteful Torrent/, treeSpirit: /Tree Spirit/, murderous: /Murderous/, hydra: /Fiery Breath/, theBloodiedGod: /Extra Attacks \(\+D3\)/, hatred: /Hatred/, vharnest: /Black Horror|Cursing Word/, unstable: /is Unstable/, indomitable: /Indomitable|banner, D3/, undeath: /Hellish Vigour|Raise Dead|Danse Macabre/, fallen: /magical animus/, dust: /Dry as Dust/, curse: /Curse of the Necropolis/, ishra: /Warbow/, casket: /Light of/, catapult: /Screaming Skull/, scurry: /Scurry Away/, ratling: /Chatter Gun/, jezzail: /Jezzail/, horrible: /Too Horrible/, wyrdstone: /Wyrdstone/, coldBlooded: /Cold Blooded/, javelin: /Javelin/, giantBow: /Giant Bow/, dropRocks: /DROP ROCKS/, fireglaive: /Fireglaive/, stampede: /Bull Centaur/, dreadquake: /Dreadquake/, magma: /Magma|Fire thrower/, crane: /Crane Gun/, ironHail: /Iron Hail/, grandCannon: /Grand Cannon/, celestial: /Celestial Forged/, instability: /Unmade Instability/, aether: /AETHER/, hellblade: /Hellblade/, skullCannon: /Cannon of Wrath/ }
    for (let seed = 1; seed <= 8; seed++) {
      const foe = DEFAULT_LISTS[seed % 2]
      const lists = seed % 4 < 2 ? [other, foe] : [foe, other]
      const g = createGame({ lists, seed })
      const side = lists.indexOf(other)
      deployBoth(g)
      if (other.army === 'kingdom-of-lyonne' && seed % 2) { pray(g, side); startBattle(g, 1 - side) } else startBattle(g, seed % 2)
      beginTurn(g)
      for (let turn = 0; turn < 12 && g.phase !== 'over'; turn++) await playTurn(g)
      for (const [k, re] of Object.entries(SEEN)) if (g.log.some(l => re.test(l.text))) seen[k] = (seen[k] || 0) + 1
      for (const u of onTable(g)) {
        for (const id of Object.keys(u.engagedWith || {})) {
          const o = g.units.find(x => x.id === id)
          assert.ok(o && !o.status.removed && !isDead(o), `${other.name} seed ${seed}: ${u.name} engaged with a unit that is gone`)
        }
        if (u.status.engaged) assert.ok(Object.keys(u.engagedWith || {}).length, `${other.name} seed ${seed}: ${u.name} engaged with nothing`)
        assert.ok(Number.isFinite(u.pos.x) && Number.isFinite(u.pos.y), `${other.name} seed ${seed}: ${u.name} position`)
        assert.ok(!onImpassable(g, u), `${other.name} seed ${seed}: ${u.name} on impassable terrain`)
      }
    }
    console.log(`${other.name} battles:`, JSON.stringify(seen))
  }
})

test('the same seed plays the same battle', async () => {
  const run = async () => {
    const g = createGame({ lists: DEFAULT_LISTS, seed: 77 })
    deployBoth(g); startBattle(g, 0); beginTurn(g)
    for (let t = 0; t < 6 && g.phase !== 'over'; t++) await playTurn(g)
    return g.log.map(l => l.text).join('\n')
  }
  assert.equal(await run(), await run())
})

test('a character with a unit: its Leadership, its pace, its attacks, and it moves with the unit', async () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 4 })
  deployBoth(g)
  const gen = g.units.find(u => u.entryId === 'captain-of-the-realm')
  const host = g.units.find(u => u.id === gen.status.joinedTo)
  assert.ok(host, 'the Captain joined a unit at deployment')
  assert.ok(leadershipFor(g, host).value >= 9, 'the unit uses the Captain\'s Leadership (or the General\'s)')
  startBattle(g, 0); beginTurn(g)
  const y0 = host.pos.y
  makeMove(g, host, [{ type: 'forward', d: 3 }])
  assert.ok(Math.abs(gen.pos.y - (y0 - 3)) < 1e-6, 'the Captain moved with it')
  assert.equal(unitMass(host), host.models.filter(m => m.wounds > 0).length + host.joined.length)
})

test('every spell of the implemented lores resolves', async () => {
  const { SPELLS } = await import('../data/spells.js')
  const { loreSpells } = await import('./magic.js')
  const { IMPLEMENTED_LORES, effectsOn } = await import('./spells.js')
  for (const lore of IMPLEMENTED_LORES) {
    const list = loreSpells(lore)
    assert.equal(list.length, 7, `${lore} has seven spells`)
    for (const s of list) {
      const g = createGame({ lists: DEFAULT_LISTS, seed: 9 })
      deployBoth(g)
      startBattle(g, 0); beginTurn(g)
      const caster = g.units.find(u => u.wizard && u.side === (lore === 'battle-magic' ? 0 : 1))
      const enemy = onTable(g).find(o => o.side !== caster.side && o.models.length >= 10)
      const friend = g.units.find(o => o.side === caster.side && o !== caster && (o.troopType || []).includes('Character'))
      let target = null
      if (s.category === 'Magical Vortex') target = { x: unitCentre(enemy).x, y: 24 }
      else if (s.category === 'Conveyance') target = (s.slug === 'hand-of-wangler-or-bosher' || s.slug === 'shimmering-dragon') ? friend : onTable(g).find(o => o.side === caster.side && o.models.length >= 10)
      else if (!/self/i.test(s.range)) target = enemy
      if (s.slug === 'arcane-urgency') target.status.moved = true
      const logBefore = g.log.length
      await spellEffects.resolve(g, caster, SPELLS[s.slug], target, { pickPoint: async () => null })
      // it resolved and said what it rolled or did (no "not in the game yet")
      const said = g.log.slice(logBefore).map(l => l.text).join('\n')
      assert.ok(said.length > 0 && !/not in the game yet/.test(said), `${s.name} resolved: ${said}`)
      if (s.slug === 'floodlights-on') {
        const ws = target.models[0].profile.WS
        nextStep(g); while (g.sub !== 'start') nextStep(g)
        assert.ok(target.models[0].profile.WS > ws, 'Floodlights On ends at the end of the turn')
      }
      if (s.slug === 'column-of-crystal') assert.ok(g.terrain.some(f => f.spell), 'the column stands on the table as impassable terrain')
      else if (s.category === 'Magical Vortex') {
        assert.equal(effectsOn(g, 'vortex').length, 1)
        moveVortices(g)
      }
    }
  }
})

test('a challenge: duellists fight each other, wounds count once, overkill only for a character', async () => {
  const { engage } = await import('./charge.js')
  const g = createGame({ lists: DEFAULT_LISTS, seed: 12, terrain: false })
  deployBoth(g)
  startBattle(g, 0); beginTurn(g)
  const gen = g.units.find(u => u.entryId === 'captain-of-the-realm')
  const host = g.units.find(u => u.id === gen.status.joinedTo)
  const rukkas = g.units.find(u => u.entryId === 'rukka-mob' && u.models.length === 30)
  // put the Rukkas in contact with the general's unit, front to front
  rukkas.facing = host.facing + Math.PI
  rukkas.pos = { ...host.pos }
  engage(g, host, rukkas, 'front'); host.status.charged = true
  g.phase = 'combat'; g.sub = 'fight'
  // the active player challenges with the General; the Rukka accept with their Boss
  const ask = async (q, a) => {
    if (/issue a challenge/.test(q)) return (a.find(([l]) => /Captain/.test(l)) || a[0])[1]
    if (/Accept it/.test(q)) return (a.find(([l]) => /Accept/.test(l)) || a[0])[1]
    return a[0][1]
  }
  const c = combatsToFight(g)[0]
  await fightCombat(g, c, ask)
  const text = g.log.map(l => l.text).join('\n')
  assert.match(text, /CHALLENGE: Captain of the Realm against /)
  // the result line: an overkill bonus, if any, never above +5
  const res = text.split('\n').find(l => l.startsWith('MELEE OUTCOME'))
  const ok = [...res.matchAll(/overkill \+(\d)/g)].map(m => Number(m[1]))
  assert.ok(ok.every(n => n <= 5))
  // only the General's attacks (or the Boss's) were made in the challenge
  assert.ok(/Captain of the Realm in the challenge/.test(text))
})

test('a Nipper Wolf Chariot charges: Impact Hits, then crew and wolves fight; it uses its crew\'s Leadership', async () => {
  const { unitByNames } = await import('./roster.js')
  const { fieldUnit } = await import('./units.js')
  const { equip } = await import('./damage.js')
  const { engage } = await import('./charge.js')
  const g = createGame({ lists: DEFAULT_LISTS, seed: 31, terrain: false })
  const ch = fieldUnit('rukka-firms', unitByNames('rukka-firms', 'nipper-wolf-chariot', 1), 1)
  equip(ch); g.units.push(ch)
  const halb = g.units.find(u => u.entryId === 'march-troops')
  for (const u of [ch, halb]) u.placed = true
  halb.pos = { x: 30, y: 30 }; halb.facing = -Math.PI / 2; halb.files = 10
  ch.pos = { x: 30, y: 30 }; ch.facing = Math.PI / 2
  startBattle(g, 1); beginTurn(g)
  engage(g, ch, halb, 'front'); ch.status.charged = true; ch.status.chargeDistance = 6
  assert.equal(leadershipFor(g, ch).value, 6)
  g.phase = 'combat'; g.sub = 'fight'
  await fightCombat(g, combatsToFight(g)[0], async (q, a) => a[0][1])
  const text = g.log.map(l => l.text).join('\n')
  assert.match(text, /Impact Hits \(D3\+1\) = \d+ = \d+ Strength 5 hits/)
  assert.match(text, /Nipper Crew from 1 chariot/)
  assert.match(text, /Giant Wolves/)
})

test('a Giant fights: a Giant Attack or Pick Up And..., then Stomp Attacks', async () => {
  const { unitByNames } = await import('./roster.js')
  const { fieldUnit } = await import('./units.js')
  const { equip } = await import('./damage.js')
  const { engage } = await import('./charge.js')
  for (let seed = 1; seed <= 12; seed++) {
    const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false })
    const giant = fieldUnit('rukka-firms', unitByNames('rukka-firms', 'giant', 1), 1)
    equip(giant); g.units.push(giant)
    const halb = g.units.find(u => u.entryId === 'march-troops')
    for (const u of [giant, halb]) u.placed = true
    halb.pos = { x: 30, y: 30 }; halb.facing = -Math.PI / 2; halb.files = 10
    giant.pos = { x: 30, y: 30 }; giant.facing = Math.PI / 2
    startBattle(g, 1); beginTurn(g)
    engage(g, giant, halb, 'front')
    g.phase = 'combat'; g.sub = 'fight'
    await fightCombat(g, combatsToFight(g)[0], async (q, a) => a[Math.floor(g.rng() * a.length)][1])
    const text = g.log.map(l => l.text).join('\n')
    assert.match(text, /Giant Attacks D6 = \d|Pick Up And\.\.\.:/)
    assert.match(text, /Stomp Attacks \(D6\) = \d+ automatic Strength 6 hits, AP -2/)
  }
})
