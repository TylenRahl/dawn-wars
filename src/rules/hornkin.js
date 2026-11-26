// The Hornkin Herds' own army rules (Primal Fury, the Hornstone, Drunken and the rest), as small functions and
// tables that the shared rules modules call at the right moment (combat, damage, Leadership, magic and others;
// each comment says where).

import { leadershipTest, leadershipFor, commandRange } from './leadership.js'
import { say } from './game.js'
import { hasRule, alive, isDead, distanceBetween, corners } from './units.js'
import { polyDist } from './geometry.js'
import { rollDice } from './dice.js'
import { unitMass } from './troops.js'
import { itemFlag } from './items.js'

const live = c => !c.status?.removed && !isDead(c)

const ldOf = u => Math.max(0, ...alive(u).map(m => m.profile.Ld ?? 0))
// a Leadership test through leadership.js (every modifier to the unit's Leadership applies); `ld` overrides the value
const test2 = (game, u, label, ld = null) => { const r = leadershipTest(game, u, { label, mod: ld != null ? ld - leadershipFor(game, u).value : 0 }); return { d: r.dice, t: r.total, ok: r.passed, double: r.dice[0] === r.dice[1], need: r.need } }

// Primal Fury — when its combat is chosen, a Leadership test: passed, Primal Fury until the end of
// the Combat phase (natural 1s To Hit re-rolled: combat.js). Blood Rage: passed with a natural double,
// it is Frenzied too (even if it lost Frenzy before).
export function primalFury (game, u) {
  const key = `${game.round}:${game.active}`
  if (!hasRule(u, 'Primal Fury') || u.status.furyTested === key || !live(u)) return
  u.status.furyTested = key
  // Horn of the First Beast: within 18" of the bearer, its Leadership may be used
  const horn = game.units.find(c => c.side === u.side && c.placed && live(c) && !c.status.fleeing && (c.items || []).includes('horn-of-the-first-beast') && distanceBetween(c, u) <= 18)
  const ld = horn && ldOf(horn) > ldOf(u) ? ldOf(horn) : null
  let t = test2(game, u, `${u.name} — Primal Fury`, ld)
  // Banner of Outrage: the test may be re-rolled
  if (!t.ok && itemFlag(u, 'outrage')) { say(game, 'roll', `${u.name} — Primal Fury test ${t.d.join('+')} failed; re-rolled (Banner of Outrage).`); t = test2(game, u, `${u.name} — Primal Fury (re-roll)`, ld) }
  u.status.primalFury = t.ok ? key : null
  const rage = t.ok && t.double && hasRule(u, 'Blood Rage')
  say(game, 'roll', `${u.name} — Primal Fury, Leadership test: ${t.d.join('+')} = ${t.t}, needs ${t.need} or less${ld != null ? ' (the Horn of the First Beast)' : ''} — ${t.ok ? 'PRIMAL FURY until the end of this Combat phase' : 'no fury'}${rage ? '; a natural double: BLOOD RAGE, it is Frenzied' : ''}.`)
  if (rage) { u.status.frenzyLost = false; u.special.add('Frenzy') }
}
export const inPrimalFury = (game, u) => !!u.status?.primalFury && u.status.primalFury === `${game.round}:${game.active}`
// Foe Render — in Primal Fury, a single non-magical hand weapon has AP -2 (combat.js)
export const foeRender = (game, u) => hasRule(u, 'Foe Render') && inPrimalFury(game, u)

// Bestial Charge — in a turn it charged 3" or more, +1 Strength (combat.js)
export const bestialCharge = (u, charged) => hasRule(u, 'Bestial Charge') && charged && (u.status.chargeDistance || 0) >= 3
// Blood Greed — Frenzied, +2 Attacks rather than +1; a single D6 to pursue (combat.js)
export const bloodGreed = u => hasRule(u, 'Blood Greed')
// Bull Hornkin — Impact Hits AP -1; Crown of Antlers — AP -1 (and Armour Bane (1): not in yet)
export const goringImpact = u => hasRule(u, 'Bull-hornkin') || hasRule(u, 'Crown of Antlers')
// Slaughterer's Call — Frenzied, its unit is Frenzied too (units.js rulesOf)
// Crown of Horns Hornkin — a unit joined by its bearer is Stubborn (units.js rulesOf)
export const crownedHost = (joined = []) => joined.some(c => live(c) && (c.items || []).includes('crown-of-horns-hornkin'))
export const slaughterersCall = (joined = []) => joined.some(c => live(c) && hasRule(c, "Slaughterer's Call") && [...(c.special || [])].some(r => r.startsWith('Frenzy')) && !c.status?.frenzyLost)

// Drunken — each Start of Turn, not Frenzied, engaged or fleeing: a D6 — 1 Random Movement (D6+2)
// until the next; 6 Frenzy until the next
export function drunken (game, side) {
  for (const u of game.units.filter(u => u.side === side && u.placed && live(u) && hasRule(u, 'Drunken'))) {
    u.status.drunk = null
    if (hasRule(u, 'Frenzy') || u.status.engaged || u.status.fleeing) continue
    let r = rollDice(game.rng, 1)[0]
    // Father of Beasts: within Korvash' Command range a Hoofrunner herd may re-roll it (here: a 1)
    if (r === 1 && /^hoofrunner/.test(u.entryId || '') && game.units.some(c => c.side === u.side && c.placed && live(c) && hasRule(c, 'Father of Beasts') && distanceBetween(c, u) <= commandRange(c))) { const again = rollDice(game.rng, 1)[0]; say(game, 'roll', `${u.name} — Drunken: a 1, re-rolled near Korvash (Father of Beasts): ${again}.`); r = again }
    u.status.drunk = r === 1 ? 'unsteady' : r === 6 ? 'belligerent' : null
    if (r === 6) u.status.frenzyLost = false // (a 6 restores Frenzy, though it was lost before)
    say(game, 'roll', `${u.name} — Drunken: D6 = ${r} — ${r === 1 ? 'UNSTEADY: Random Movement (D6+2) until its next Start of Turn' : r === 6 ? 'BELLIGERENT: Frenzy until its next Start of Turn' : 'sobering up, no effect'}.`)
  }
}

// Maddening Aura — in its Command sub-phase, every enemy unit within 8" (fleeing or engaged too)
// tests Leadership; failed, it takes D3 hits at Strength 3, with no armour or Regeneration save allowed
export function maddeningAura (game, side, spellHits) {
  for (const j of game.units.filter(u => u.side === side && u.placed && live(u) && hasRule(u, 'Maddening Aura'))) {
    for (const o of game.units.filter(o => o.side !== side && o.placed && live(o) && !o.status.joinedTo && distanceBetween(o, j) <= 8)) {
      const t = test2(game, o, `${o.name} beholds ${j.name} (Maddening Aura)`)
      say(game, 'roll', `${o.name} beholds ${j.name} (Maddening Aura): Leadership ${t.d.join('+')} = ${t.t}, needs ${t.need} — ${t.ok ? 'passed' : 'FAILED'}.`)
      if (!t.ok) { const n = Math.ceil(rollDice(game.rng, 1)[0] / 2); spellHits(game, o, n, 3, 0, { noArmour: true, noRegen: true, nonMagical: true, label: `Maddening Aura (${n} hits): ` }) }
    }
  }
}

// Stony Stare — as every Combat phase begins, each enemy model touching it takes an Initiative
// test; failed, D3 Strength 2 hits, no Armour Roll (here: one test for each enemy unit engaged with it)
export function stonyStare (game, u, units, spellHits) {
  const key = `${game.round}:${game.active}`
  if (!hasRule(u, 'Stony Stare') || u.status.stareKey === key) return
  u.status.stareKey = key
  for (const o of units.filter(o => o.side !== u.side && live(o) && (u.engagedWith || {})[o.id])) {
    const I = alive(o)[0]?.profile.I ?? 3
    const r = rollDice(game.rng, 1)[0]
    const failed = r === 6 || r > I
    say(game, 'roll', `${o.name} meets ${u.name}'s Stony Stare: Initiative test ${r} against I${I} — ${failed ? 'FAILED' : 'passed'}.`)
    if (failed) { const n = Math.ceil(rollDice(game.rng, 1)[0] / 2); spellHits(game, o, n, 2, 0, { noArmour: true, nonMagical: true, label: `Stony Stare (${n} hits): ` }) }
  }
}

// Swallow Whole — in its Command sub-phase, an engaged Gorgemaw may pick an infantry unit it fights:
// an Initiative test; failed, one model removed as a casualty and the Gorgemaw recovers a Wound
export const swallowTargets = (game, u) => game.sub === 'command' && u.side === game.active && hasRule(u, 'Swallow Whole') && u.status.swallowTurn !== `${game.round}:${game.active}` ? game.units.filter(o => o.side !== u.side && live(o) && (u.engagedWith || {})[o.id] && /Regular Infantry|Heavy Infantry/.test((o.troopType || []).join(' '))) : []
export function swallowWhole (game, u, t, applyMultipleDamage) {
  u.status.swallowTurn = `${game.round}:${game.active}`
  const I = alive(t)[0]?.profile.I ?? 3
  const r = rollDice(game.rng, 1)[0]
  const failed = r === 6 || r > I
  say(game, 'roll', `${u.name} tries to SWALLOW WHOLE one of ${t.name}: Initiative test ${r} against I${I} — ${failed ? 'FAILED, one is gulped down' : 'passed, they dodge'}.`)
  if (!failed) return
  const m = alive(t).find(x => x.role === 'rank') || alive(t)[0]
  applyMultipleDamage(game, t, [m.wounds], 'Swallow Whole')
  const g = u.models.find(x => x.wounds > 0 && x.wounds < (x.startW || 1))
  if (g) { g.wounds += 1; say(game, 'good', `${u.name} recovers a Wound (${g.wounds} of ${g.startW}).`) }
}

// Soul Eater — an enemy Wizard casting within 12" of a Gazehorn first tests Leadership; failed, a
// failed casting is a backlash (magic.js)
export function soulEaterNerve (game, w) {
  const gazehorn = game.units.find(c => c.side !== w.side && c.placed && live(c) && hasRule(c, 'Soul-eater') && distanceBetween(c, w) <= 12)
  if (!gazehorn) return false
  const t = test2(game, w, `${w.name} — Soul-eater`)
  say(game, 'roll', `${w.name} casts near ${gazehorn.name} (Soul-eater): Leadership ${t.d.join('+')} = ${t.t}, needs ${t.need} — ${t.ok ? 'it keeps its nerve' : 'it LOSES ITS NERVE: failing to cast will be a backlash'}.`)
  return !t.ok
}

// Ghostsight — the Gazehorn re-rolls failed To Hit rolls in combat against Wizards, models with magic
// items or with a Ward or Regeneration save (combat.js)
export const ghostsight = (a, b, sv) => hasRule(a, 'Ghostsight') && (!!b.wizard || (b.items || []).length > 0 || !!b.banner || !!sv?.ward || !!sv?.regen)

// Herdhorn — from round 2, a Herdlord or Hornchief General in its Command sub-phase tests Leadership:
// passed, each unit of Ambushers still in reserve (that did not just arrive) rolls again to arrive (ui/phases.js)
export const canHerdhorn = (game, c) => game.sub === 'command' && game.round >= 2 && c.side === game.active && c.isGeneral && c.placed && live(c) && hasRule(c, 'Herdhorn') && c.status.herdhornTurn !== `${game.round}:${game.active}`
export function herdhorn (game, c) {
  c.status.herdhornTurn = `${game.round}:${game.active}`
  const t = test2(game, c, `${c.name} — the Herdhorn`)
  say(game, 'roll', `${c.name} sounds the HERDHORN: Leadership ${t.d.join('+')} = ${t.t}, needs ${t.need} — ${t.ok ? 'passed: the Ambushers still in reserve roll again' : 'failed'}.`)
  return t.ok
}

// Endless Malice — winning a round of combat and restraining (the test passed), enemy units within
// 6" test for Panic, as when a friend nearby is wiped out (combat.js)
export const endlessMalice = u => hasRule(u, 'Endless Malice')

// ---- the Hornstone (Hornstones) ----
// Bought as a Special choice; it is no unit but an impassable special feature, at most 6" across, placed after the
// terrain anywhere outside the enemy's deployment zone and more than 6" from the centre (here: 4" square, on the
// centre line of its own half, 9" from the centre, moved along it clear of other terrain — a stand-in for the
// player's placement).
export function placeHornstone (game, side, TABLE, polysOverlap) {
  const c = { x: TABLE.w / 2, y: TABLE.h / 2 }
  const dy = side === 0 ? 9 : -9
  for (const dx of [0, -8, 8, -16, 16, -24, 24]) {
    const at = { x: c.x + dx, y: c.y + dy }
    const poly = [{ x: at.x - 2, y: at.y - 2 }, { x: at.x + 2, y: at.y - 2 }, { x: at.x + 2, y: at.y + 2 }, { x: at.x - 2, y: at.y + 2 }]
    if ((game.terrain || []).some(f => polysOverlap(poly, f.poly, 0.5))) continue
    const f = { id: `hornstone${side}`, kind: 'hornstone', at, size: 4, poly, side }
    game.terrain = [...(game.terrain || []), f]
    say(game, '', `${game.sides[side].name} raises its HORNSTONE (${at.x.toFixed(0)}", ${at.y.toFixed(0)}").`)
    return f
  }
  return null
}
const hornstones = game => (game?.terrain || []).filter(f => f.kind === 'hornstone')
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y)
const unitMassOf = u => unitMass(u)
// the unit controlling it: within 6", Unit Mass 5+, not fleeing; the closest (tied between the sides: nobody)
export function hornstoneController (game, f, distanceToPoint) {
  const near = game.units.filter(u => u.placed && live(u) && !u.status.fleeing && !u.status.joinedTo && unitMassOf(u) >= 5 && distanceToPoint(u, f.at) <= 6 + 2)
  if (!near.length) return null
  near.sort((a, b) => distanceToPoint(a, f.at) - distanceToPoint(b, f.at))
  const d0 = distanceToPoint(near[0], f.at)
  if (near.some(u => u.side !== near[0].side && Math.abs(distanceToPoint(u, f.at) - d0) < 0.01)) return null
  return near[0]
}
const beastControlled = (game, f, dtp) => { const c = hornstoneController(game, f, dtp); return c && c.army === 'hornkin-herds' ? c : null }
// "A Tingle in the Air": the controlling unit has Magic Resistance (-1) (units.js rulesOf)
export const tingle = (game, u, dtp) => hornstones(game).some(f => hornstoneController(game, f, dtp) === u)
// Bestial Fury: Hornkin within 12" re-roll natural 1s To Wound in combat (combat.js)
export const bestialFury = (game, u, dtp) => u.army === 'hornkin-herds' && hornstones(game).some(f => beastControlled(game, f, dtp) && beastControlled(game, f, dtp).side === u.side && dtp(u, f.at) <= 12 + 2)
// Dark Sorcery: friendly Hornkin Wizards within 12" +1 to cast, enemy Wizards -1 (magic.js)
export function darkSorcery (game, w, dtp) {
  for (const f of hornstones(game)) {
    const c = beastControlled(game, f, dtp)
    if (!c || dtp(w, f.at) > 12 + 2) continue
    return c.side === w.side ? (w.army === 'hornkin-herds' ? 1 : 0) : -1
  }
  return 0
}
// Fearsome Edifice: enemy units within 12" -1 Leadership for Fear, Panic and Terror tests (leadership.js)
export const fearsomeEdifice = (game, u, dtp) => hornstones(game).some(f => { const c = beastControlled(game, f, dtp); return c && c.side !== u.side && dtp(u, f.at) <= 12 + 2 })
// Victory Points: controlling it at the end, 200 (victory.js)
export const hornstoneVP = (game, dtp) => hornstones(game).map(f => hornstoneController(game, f, dtp)).filter(Boolean)

// the distance from a unit to a point (the Hornstone's centre)
export const dtp = (u, p) => polyDist(corners(u), [p])

// At fielding (units.js): The Sons of Korvash — +1 Weapon Skill and Leadership, Armour Bane (1)
export function hornkinOptions (unit) {
  if (!unit.special.has('The Sons of Korvash')) return
  unit.special.add('Armour Bane (1)')
  for (const m of unit.models) m.profile = { ...m.profile, WS: Math.min(10, (m.profile.WS ?? 3) + 1), Ld: Math.min(10, (m.profile.Ld ?? 7) + 1) }
}
// Future Sight — Mirefang, a 4+ Untouchable save (damage.js saveFor)
export const beastWards = u => hasRule(u, 'Future Sight') ? [{ value: 4, source: 'Future Sight' }] : []

// Cornucopia of Corpulence — when its combat is chosen, every enemy model touching the bearer
// test Toughness; failed, a Wound lost (here: one model of each enemy unit engaged with the bearer's unit)
export function cornucopia (game, u, units, applyWounds) {
  const key = `${game.round}:${game.active}`
  const bearer = [u, ...(u.joined || [])].find(c => live(c) && (c.items || []).includes('cornucopia-of-corpulence'))
  if (!bearer || bearer.status.cornucopiaKey === key) return
  bearer.status.cornucopiaKey = key
  for (const o of units.filter(o => o.side !== u.side && live(o) && (u.engagedWith || {})[o.id])) {
    const T = alive(o)[0]?.profile.T ?? 3
    const r = rollDice(game.rng, 1)[0]
    const failed = r === 6 || r > T
    say(game, 'roll', `${bearer.name}'s Cornucopia of Corpulence: ${o.name} Toughness test ${r} against T${T} — ${failed ? 'FAILED, a Wound lost' : 'passed'}.`)
    if (failed) applyWounds(game, o, 1, 'the Cornucopia of Corpulence')
  }
}
