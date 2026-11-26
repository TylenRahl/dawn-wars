// The Shooting phase, one unit at a time, and Stand & Shoot: who may shoot at what, To Hit, To Wound, saves,
// casualties and Panic. Exports shoot, standAndShoot, panicTest and the steps around them; used by the battle screen
// (ui/phases.js), the film replay, charges, combat, war machines, special shots, spells and prayers.
//
// Sequence, per unit before the next: choose it and its target, roll To Hit, roll To Wound and make saves, remove
//   casualties, test for Panic.
// Who can shoot: not after charging or marching, not engaged, not fleeing.
// How many shots: once a phase; Attacks do not add shots.
// Sight and range: each front-rank model checks its own sight and range; models that cannot, do not shoot.
//   Stand & Shoot assumes the charger came into range.
// Shooting Into Combat: not at units engaged in combat.
// Volley Fire: half the models in each rank behind the front one also shoot, rounding up.
// To Hit: BS1 6+, BS2 5+, BS3 4+, BS4 3+, BS5 2+; a natural 1 always misses.
// To Hit modifiers: moving -1, long range -1, Stand & Shoot -1,
//   partial cover -1, full cover -2 (cumulative).
// Moving and shooting: moved for any reason this turn, including
//   rallying and reforming.
// Long Range: beyond half the weapon's range.
// Standing and Shooting: -1, and no long range penalty.
// Needing 7+ To Hit: 7 = a 6 then 4+, 8 = 6 then 5+, 9 = 6 then 6, 10 impossible.
// BS 6 or more: re-roll misses (the modifiers apply to the first roll only).
// To Wound: the To Wound chart; a natural 1 fails.
// Too Tough to Wound: S six or more below T cannot wound.
// Saves: armour rolls with Armour Piercing, armour value, more than one save, Untouchable saves.
// Panic: a unit that lost more than a quarter of the models it had at the start of the phase takes a Panic test
//   (Leadership), at most once a phase.
// Failing it: with more than half its starting models left it Falls Back in Good Order, otherwise it flees;
//   either way directly away from the shooters.

import { inStormOfAsh } from './chaosdwarfs.js'
import { drenched } from './saurians.js'
import { screenedTeam } from './gnawkin.js'
import { arrowsOfIshra, dryAsDust, lightProtected } from './tombkings.js'
import { petrifying } from './darkelves.js'
import { abyssal, valourOfAges } from './highelves.js'
import { hawkEyed, spectralHounds } from './woodelves.js'
import { insignificant } from './ogres.js'
import { bannersOf as bannersOfT } from './items.js'
import { addEffect } from './spells.js'
import { commandRange } from './leadership.js'
import { dwarfCrafted, standsBack, opticsLongRange, artilleryMaster, useArtilleryMaster } from './dwarfs.js'
import { vowIgnoresPanic } from './lyonne.js'
import { disdains } from './renegade.js'
import { holyFervour } from './leadership.js'
import { breathOfChange, weaponChoices, breathe, pigeonBomb } from './specialShots.js'
import { ASSORTED, stableFiringPlatform } from './vehicles.js'
import { protectedBoss } from './trolls.js'
import { say } from './game.js'
import { rollDice } from './dice.js'
import { add, sub, mul, dot, dirOf, rightOf, pointSegDist } from './geometry.js'
import { corners, centre, alive, filesOf, ranksOf, modelCount, distanceBetween, hasRule, modelSlots, isDead } from './units.js'
import { sightTo, eyes } from './sight.js'
import { onTable } from './game.js'
import { rangedWeaponsOf, toWoundNeed, saveFor, applyWounds, applyMultipleDamage, isChariot, hasCrewPlatform, itemSaveRerolls, charmedWard } from './damage.js'
import { itemFlag, multipleDamage } from './items.js'
import { dN } from './dice.js'
import { leadershipTest } from './leadership.js'
import { fleeFrom, fleeMove, reformToFace } from './charge.js'
import { machineShoot, isWarMachine, machineTargets } from './warMachines.js'
import { effectsOn, inAura, spellHits } from './spells.js'
import { onHill } from './terrain.js'
import { unitMass } from './troops.js'

export function canShoot (game, u, weapon = null) {
  if (u.status.removed || isDead(u)) return { ok: false, reason: 'it is gone' }
  if (isWarMachine(u)) {
    if (u.status.shot) return { ok: false, reason: 'it has already shot' }
    if (u.status.fleeing) return { ok: false, reason: 'its crew are fleeing' }
    if (u.status.engaged) return { ok: false, reason: 'it is engaged in combat' }
    if (u.status.stupid) return { ok: false, reason: 'it is Stupid this turn' }
    return { ok: true }
  }
  const w = rangedWeaponsOf(u)
  if (!w.length && !weaponChoices(u).length) return { ok: false, reason: 'no missile weapons' }
  if (u.status.stupid) return { ok: false, reason: 'it is Stupid this turn' }
  if (u.status.shot) return { ok: false, reason: 'it has already shot' }
  if (u.status.charged || u.status.declaredCharge) return { ok: false, reason: 'it charged' }
  // (Stable Firing Platform: a War Wagon's crew shoot even after it marched)
  if (u.status.marched && !stableFiringPlatform(u)) return { ok: false, reason: 'it marched' }
  if (u.status.engaged) return { ok: false, reason: 'it is engaged in combat' }
  if (u.status.fleeing) return { ok: false, reason: 'it is fleeing' }
  if (w.some(x => hasRuleW(x, 'Move or Shoot')) && (u.status.moved || u.status.countsAsMoved)) return { ok: false, reason: 'its weapons are Move or Shoot and it moved' }
  return { ok: true }
}
const hasRuleW = (w, name) => (w.rules || []).some(r => r === name || r.startsWith(name + ' ('))

// Distance from a point to the nearest part of a unit.
function pointToUnit (p, t) {
  const cs = corners(t)
  let best = Infinity
  for (let i = 0; i < 4; i++) best = Math.min(best, pointSegDist(p, cs[i], cs[(i + 1) % 4]))
  return best
}

export function shootingTargets (game, u) {
  if (isWarMachine(u)) return machineTargets(game, u).map(x => ({ unit: x.unit, distance: x.distance, long: false }))
  const out = []
  const w = isWarMachine(u) ? null : rangedWeaponsOf(u)[0]
  // Targeting Lone Characters: a Lone character within 3" of a friendly,
  // not-fleeing unit of five or more models of its troop type cannot be targeted unless it is
  // the closest target.
  const enemies = onTable(game).filter(t => t.side !== u.side && !t.status.engaged)
  const closest = enemies.slice().sort((a, b) => distanceBetween(u, a) - distanceBetween(u, b))[0]
  for (const t of onTable(game)) {
    if (t.side === u.side || t.status.engaged) continue
    // (Hawk-eyed Archer: a Pathstalker may target any enemy character it can see)
    if (isLoneCharacter(t) && t !== closest && screened(game, t) && !hawkEyed(u)) continue
    // Spectral Hounds: Hernath, whilst his Hounds remain, cannot be targeted by enemy shooting
    if (spectralHounds(t)) continue
    // Targeting Weapon Teams: a Weapon Team by its parent, unless the closest (gnawkin.js)
    if (t !== closest && screenedTeam(game, t, distanceBetween)) continue
    if (protectedBoss(game, t, closest)) continue // Mind the Boss (trolls.js)
    if (standsBack(game, t)) continue // Stand Back Chief (dwarfs.js)
    // Mantle of Drifting Shadow: not targeted by shooting from more than 6" away
    if (itemFlag(t, 'farShotImmune', { personal: true }) && distanceBetween(u, t) > 6) continue
    const s = sightTo(game, u, t)
    if (!s.sees) continue
    const d = distanceBetween(u, t)
    const range = w ? w.range : (u.machine?.range ?? 0)
    if (range && d > range) continue
    out.push({ unit: t, distance: d, long: w ? d > w.range / 2 : false, cover: s.visibleFraction })
  }
  return out.sort((a, b) => a.distance - b.distance)
}

// How many models shoot, and how many of them are at long range.
function shooters (game, u, t, w, standAndShoot) {
  // Firing Platform / Split Profile Chariots: every chariot's
  // crew shoot, in any direction; each chariot in range shoots with its whole crew
  if (hasCrewPlatform(u)) {
    const crew = u.crew?.[0]?.count || 1
    const d = distanceBetween(u, t)
    if (!standAndShoot && d > w.range) return { n: 0, long: 0, volley: 0 }
    const n = modelCount(u) * crew
    return { n, long: !standAndShoot && d > w.range / 2 ? n : 0, volley: 0 }
  }
  const es = eyes(u)
  let inRange = 0; let long = 0
  for (const e of es) {
    const d = pointToUnit(e, t)
    if (!standAndShoot && d > w.range) continue
    inRange++
    if (!standAndShoot && d > w.range / 2) long++
  }
  // models in the front rank that are there (an incomplete single rank is all front)
  inRange = Math.min(inRange, Math.min(filesOf(u), modelCount(u)))
  long = Math.min(long, inRange)
  // Vantage Point / Large Target: one more rank shoots
  // from a hill, or at a Large Target
  let volley = 0
  const extraRank = (onHill(game, u) ? 1 : 0) + (hasRule(t, 'Large Target') ? 1 : 0)
  for (let r = 1; r <= extraRank && r < ranksOf(u); r++) volley += Math.max(0, Math.min(filesOf(u), modelCount(u) - r * filesOf(u)))
  // Volley Fire: not after moving for any reason, not when standing and shooting
  if (hasRuleW(w, 'Volley Fire') && !standAndShoot && !(u.status.moved || u.status.countsAsMoved || u.status.reformed)) {
    const per = filesOf(u)
    const n = modelCount(u)
    for (let r = 1 + extraRank; r < ranksOf(u); r++) {
      const inRank = Math.min(per, n - r * per)
      volley += Math.ceil(inRank / 2)
    }
  }
  return { n: inRange + volley, long: long + (volley && long === inRange ? volley : 0), volley }
}

const baseToHit = bs => Math.max(2, 7 - bs)

// Roll To Hit for `n` dice needing `need` (which may be 7+). Returns { dice, hits, text }.
export function rollToHit (game, n, need, { bs = 3, rerollMisses = false, firstNeed, rerollOnes = null, rerollSixes = null } = {}) {
  let dice = rollDice(game.rng, n)
  let onesNote = ''
  // (Swirling Mists: shooting at the caster or its unit, natural 6s To Hit must be re-rolled)
  if (rerollSixes && dice.includes(6)) {
    const k = dice.filter(d => d === 6).length
    const again = rollDice(game.rng, k)
    onesNote += `; ${k} natural 6${k === 1 ? '' : 's'} re-rolled (${rerollSixes}): [${again.join(' ')}]`
    dice = [...dice.filter(d => d !== 6), ...again]
    // (Re Rolls: a die re-rolled once is not re-rolled again — those stand)
    rerollOnes = null; rerollMisses = false
  }
  let rerolledMissed = 0
  if (rerollOnes && dice.includes(1)) {
    const k = dice.filter(d => d === 1).length
    const again = rollDice(game.rng, k)
    onesNote += `; ${k} natural 1${k === 1 ? '' : 's'} re-rolled (${rerollOnes}): [${again.join(' ')}]`
    // no dice is re-rolled twice (Re Rolls)
    rerolledMissed = again.filter(d => d === 1 || (need <= 6 && d < need) || need > 6).length
    dice = [...dice.filter(d => d !== 1), ...again]
  }
  let hits = 0
  const notes = []
  const follow = { 7: 4, 8: 5, 9: 6 }
  const extra = []
  for (const d of dice) {
    if (d === 1) continue
    if (need <= 6) { if (d >= need) hits++ } else if (need <= 9 && d === 6) extra.push(follow[need])
  }
  if (extra.length) {
    const again = rollDice(game.rng, extra.length)
    const ok = again.filter((d, i) => d >= extra[i]).length
    hits += ok
    notes.push(`natural 6s rolled again needing ${extra[0]}+: [${again.join(' ')}] — ${ok} hit`)
  }
  let text = `To Hit: ${n} dice [${dice.join(' ')}] need ${need > 9 ? 'impossible (10+)' : need > 6 ? `${need}+ (a 6, then ${follow[need]}+)` : need + '+'} — ${hits} hit${hits === 1 ? '' : 's'}`
  if (rerollMisses) {
    const misses = Math.max(0, n - hits - rerolledMissed)
    const r = rollDice(game.rng, misses)
    const second = Math.max(2, firstNeed)
    const ok = r.filter(d => d !== 1 && d >= second).length
    hits += ok
    text += `; BS${bs} re-rolls the ${misses} misses needing ${second}+: [${r.join(' ')}] — ${ok} more`
  }
  if (notes.length) text += '; ' + notes.join('; ')
  return { dice, hits, text: text + onesNote }
}

export async function shoot (game, u, t, ask, { standAndShoot = false, point = null, weapon = null } = {}) {
  game.lastShooter = u // (Curse of the Necropolis: whose attack slew it — tombkings.js)
  if (isWarMachine(u)) {
    const c = canShoot(game, u)
    if (!c.ok) { say(game, 'bad', `${u.name} cannot shoot: ${c.reason}.`); return }
    if (t && ask && !(await evade(game, u, t, ask))) return
    return machineShoot(game, u, t, ask, { point })
  }
  const c = standAndShoot ? { ok: true } : canShoot(game, u, weapon)
  if (!c.ok) { say(game, 'bad', `${u.name} cannot shoot: ${c.reason}.`); return }
  // which weapon (specialShots.js weaponChoices): the first of its missile weapons unless one is named
  const choice = weapon || weaponChoices(u)[0]?.id || null
  const s = sightTo(game, u, t)
  // (a Breath Weapon is the flame template: it needs no line of sight of its own)
  // (Pigeon bombs: "an enemy unit that is within 24"" — no line of sight asked for either)
  if (!standAndShoot && !s.sees && !/^breath/.test(choice || '') && choice !== 'pigeon') { say(game, 'bad', `${u.name} cannot see ${t.name}.`); return }
  // (Evasive: the target is declared, so it may fall back now; the shooting goes on as declared)
  if (!standAndShoot && ask && !(await evade(game, u, t, ask))) return
  if (choice === 'breath:change' && !standAndShoot) return breathOfChange(game, u, t)
  if (/^breath:\d+$/.test(choice || '') && !standAndShoot) { u.kit.breath = u.kit.breaths[Number(choice.slice(7))] || u.kit.breath; return breathe(game, u, t) }
  if (choice === 'breath' && !standAndShoot) return breathe(game, u, t)
  if (choice === 'pigeon' && !standAndShoot) return pigeonBomb(game, u, t)
  if (choice === 'machine' && !standAndShoot) return machineShoot(game, u, t, ask, { point })
  // Assorted weapons: each crew member with a missile weapon shoots it
  if (choice === 'crew') {
    u.status.shot = true
    for (const w of rangedWeaponsOf(u).filter(w => ASSORTED.missile.includes(w.key))) {
      if (t.status.removed || isDead(t)) break
      await shootWeapon(game, u, t, ask, w, s, { standAndShoot, one: true })
    }
    if (!standAndShoot) afterShooting(game, t, u)
    return
  }
  const w = (choice?.startsWith('ranged:') && rangedWeaponsOf(u).find(x => x.key === choice.slice(7))) || rangedWeaponsOf(u)[0]
  if (!w) { say(game, 'bad', `${u.name} has nothing to shoot with.`); return }
  u.status.shot = true
  const lost = await shootWeapon(game, u, t, ask, w, s, { standAndShoot })
  // Stand & Shoot wounds count towards the Melee Outcome (Unsaved Wounds Inflicted)
  if (standAndShoot) t.status.standShootWounds = (t.status.standShootWounds || 0) + (lost || 0)
  if (!standAndShoot) afterShooting(game, t, u)
}

// One weapon's volley. `one`: a single crew member shoots it (a War Wagon's assorted weapons).
async function shootWeapon (game, u, t, ask, w, s, { standAndShoot = false, one = false } = {}) {
  const sh0 = shooters(game, u, t, w, standAndShoot)
  const sh = one ? { n: sh0.n ? 1 : 0, long: sh0.long ? 1 : 0 } : sh0
  if (!sh.n) { say(game, 'bad', `${u.name}: no model is in range of ${t.name}${one ? ` with its ${w.name}` : ''}.`); return 0 }
  // Blunderbuss: no negative modifiers for long range, Multiple Shots or Stand & Shoot
  const blunder = w.key === 'blunderbuss'
  const moved = !standAndShoot && (u.status.moved || u.status.countsAsMoved || u.status.reformed)
  // Clouds of Soot and Smoke: an Engineer on foot within 3" of a friendly war machine is behind full cover
  const soot = sootCover(game, t)
  // (dwarfs.js: an Entrenched unit is behind partial cover at least)
  // (Blood vulture: Ignores Cover)
  const cover = hasRuleW(w, 'Ignores Cover') || hasRule(u, 'Ignores Cover') ? 0 : soot || itemFlag(t, 'disguise') ? -2 : s.visibleFraction >= 1 ? (t.status.entrenched ? -1 : 0) : s.visibleFraction >= 0.5 ? -1 : -2
  const bs = (hasCrewPlatform(u) ? u.crew?.[0]?.profile.BS : (alive(u).find(m => m.role === 'rank') || alive(u)[0]).profile.BS) ?? 3
  const mods = []
  // Ponderous (-2 for moving), Quick Shot (no moving penalty)
  if (moved && !hasRuleW(w, 'Move & Shoot') && !hasRuleW(w, 'Quick Shot') && !hasRule(u, 'Quick Shot') && !hasRule(u, 'Move & Shoot')) mods.push(['moved', hasRuleW(w, 'Ponderous') ? -2 : -1])
  // (Dwarf Crafted: no -1 for Dwarf Crafted missile weapons)
  // (Banner of Confidence: nor for its unit)
  if (standAndShoot && !blunder && !dwarfCrafted(u) && !itemFlag(u, 'standShootNoPenalty')) mods.push(['Stand & Shoot', -1])
  // (Vortex of Souls, Light of Protection: -1 to hit a unit it shields — tombkings.js)
  if (lightProtected(game, t, distanceBetween)) mods.push(['the Light of Protection', -1])
  // (Monsoon: a drenched unit -1 To Hit — saurians.js)
  if (drenched(u)) mods.push(['drenched', -1])
  // (Storm of Ash: within 9" of its caster — chaosdwarfs.js)
  if (inStormOfAsh(game, u, distanceBetween)) mods.push(['the Storm of Ash', -1])
  if (t.status.glitter) mods.push(['Glittering Robe', -1])
  if (skirmishersPenalty(t)) mods.push(['Skirmishers', -1])
  // Banner of Swirling Wind: -1 To Hit to shoot at its unit
  if (itemFlag(t, 'shotAtPenalty')) mods.push([t.banner === 'icon-of-darkness' || bannersOfT(t).includes('icon-of-darkness') ? 'Icon of Darkness' : 'Banner of Swirling Wind', -1])
  // Diabolic Splendour: shooting at its bearer or the unit it has joined, -1
  if ([t, ...(t.joined || []).filter(c => !c.status?.removed)].some(c => itemFlag(c, 'splendour', { personal: true }))) mods.push(['Diabolic Splendour', -1])
  if (cover === -1) mods.push(['partial cover', -1])
  if (cover === -2) mods.push(['full cover', -2])
  // Multiple Shots: fire once, or X times each at a further -1 To Hit
  let shots = 1
  let rolledShots = 0 // the sides of a Multiple Shots (D3) dice, rolled per model
  if (hasRuleW(w, 'Multiple Shots')) {
    // (Multiple Shots (D3): the number is rolled — Blunderbuss)
    const spec = (w.rules.find(r => r.startsWith('Multiple Shots')).match(/\(([^)]+)\)/) || [])[1] || '1'
    const many = ask ? await ask(`${u.name}: fire ${w.name} once each, or ${spec} times each${blunder ? '' : ' at -1 To Hit'} (Multiple Shots)?`, [[`${spec} shots each${blunder ? '' : ' (-1)'}`, true], ['One shot each', false]]) : true
    if (many) {
      // Multiple Shots: when the number is a dice roll, each model rolls its own (shotsFor below); otherwise
      // X each
      const m = String(spec).match(/^D(\d)$/i)
      if (m) rolledShots = Number(m[1])
      else shots = Number(spec) || 1
      if (!blunder) mods.push(['Multiple Shots', -1])
    }
  }
  // Rune of Accuracy: no negative To Hit modifiers (runes.js)
  if (w.flags?.accuracy) mods.length = 0
  say(game, 'h', `${u.name} ${standAndShoot ? 'STANDS & SHOOTS at' : 'shoots at'} ${t.name} with ${w.name} (range ${w.range}", S${w.S}${w.AP ? ', AP ' + w.AP : ''}${w.rules?.length ? ', ' + w.rules.join(', ') : ''}).`)
  const batches = []
  const normal = sh.n - sh.long
  const shotsFor = k => {
    if (!rolledShots || !k) return k * shots
    const r = rollDice(game.rng, k).map(d => rolledShots === 3 ? Math.ceil(d / 2) : d)
    say(game, 'roll', `${w.name}: Multiple Shots (D${rolledShots}), one roll for each of ${k} model${k === 1 ? '' : 's'}: ${r.join(' + ')} = ${r.reduce((a, b) => a + b, 0)} shots.`)
    return r.reduce((a, b) => a + b, 0)
  }
  if (normal) batches.push({ n: shotsFor(normal), long: false })
  if (sh.long) batches.push({ n: shotsFor(sh.long), long: true })
  let hits = 0
  let poisoned = 0
  for (const b of batches) {
    // (Range Finding Optics: Torvik and his unit, no -1 for Long Range)
    // (Abyssal Cloak: shooting a Deepwyrm at long range, -2)
    const m = [...mods, ...(b.long && !blunder && !opticsLongRange(u) && !w.flags?.accuracy ? [['long range', abyssal(t) ? -2 : -1]] : [])]
    // Arrows of Ishra: no To Hit modifier of any kind (tombkings.js)
    const total = arrowsOfIshra(u) ? 0 : m.reduce((a, [, v]) => a + v, 0)
    const first = baseToHit(Math.min(bs, 5))
    const need = first - total
    // BS6+ re-rolls: 6+ at BS6, 5+ at BS7 ... 2+ at BS10 (Bs of 6 or Higher)
    let ones = effectsOn(game, 'arrowAttraction', e => e.unitId === t.id).length ? 'the Curse of Arrow Attraction' : inAura(game, 'evilSun', u) ? "Sun's Out" : u.status.bigRuck ? 'Big Ruck' : null
    // (Incantation of Cursed Blades: natural 1s To Hit re-rolled, in shooting as well)
    if (!ones && effectsOn(game, 'djaf', e => e.unitId === u.id).length) ones = 'the Incantation of Cursed Blades'
    // Artillery Master: Boltbeards and Firebeards within an Engineer's Command range re-roll natural 1s (dwarfs.js)
    const master = !ones && artilleryMaster(game, u, commandRange)
    if (master) { useArtilleryMaster(game, master); ones = `${master.name}, Artillery Master` }
    const mists = effectsOn(game, 'swirlingMists', e => e.unitId === t.id || (t.joined || []).some(c => c.id === e.unitId)).length ? 'Swirling Mists' : null
    const r = rollToHit(game, b.n, need, { bs, rerollMisses: bs >= 6, firstNeed: Math.max(2, 12 - bs), rerollOnes: ones, rerollSixes: mists })
    say(game, 'roll', `${b.n} shot${b.n === 1 ? '' : 's'}${b.long ? ' at long range' : ''}, BS${bs} hits on ${first}+${m.length ? ' with ' + m.map(([k, v]) => `${k} ${v}`).join(', ') : ''}. ${r.text}.`)
    hits += r.hits
    // (Accursed Mirror: its natural 1s To Hit a S3 AP -1 hit on itself)
    if (effectsOn(game, 'accursedMirror', e => e.unitId === u.id).length && (r.dice || []).includes(1)) { const ones = r.dice.filter(d => d === 1).length; say(game, 'bad', `The Accursed Mirror: ${ones} natural 1${ones === 1 ? '' : 's'} — Strength 3 hits on ${u.name}.`); spellHits(game, u, ones, 3, -1, { label: 'Accursed Mirror: ' }) }
    // Poisoned Attacks: natural 6s To Hit (not when 7+ was needed, not a magic weapon)
    // (Hagbane Tips: a Lornefolk longbow with them is Poisoned)
    if ((hasRule(u, 'Poisoned Attacks') || hasRuleW(w, 'Poisoned Attacks')) && need <= 6 && !w.magic) poisoned += Math.min(r.hits, (r.dice || []).filter(d => d === 6).length)
  }
  // THE TABLE DRAWS THE VOLLEY (src/view/shotFx.js): who shot,
  // at whom, with what, how many shots and how many hit, once the To Hit dice are rolled. Told only; it decides nothing,
  // and with no table listening (node tests) nothing happens.
  game.onShot?.({ kind: 'volley', shooter: u, target: t, weapon: w.name, key: w.key, shots: batches.reduce((a, b) => a + b.n, 0), hits })
  if (!hits) return 0
  // Grenade launching blunderbuss: each successful hit causes D3+1 hits
  // Rivet gun: each successful hit causes D3 hits
  if (w.key === 'rivet gun' || w.key === 'shotbelly gun scatter shot') {
    const each = Array.from({ length: hits }, () => Math.ceil(rollDice(game.rng, 1)[0] / 2))
    say(game, 'roll', `${w.name}: each hit is D3 hits — ${each.join(' + ')} = ${each.reduce((a, b) => a + b, 0)}.`)
    hits = each.reduce((a, b) => a + b, 0)
  }
  if (w.key === 'grenade launching blunderbuss') {
    const each = Array.from({ length: hits }, () => Math.ceil(rollDice(game.rng, 1)[0] / 2) + 1)
    say(game, 'roll', `${w.name}: each hit is D3+1 hits — ${each.join(' + ')} = ${each.reduce((a, b) => a + b, 0)}.`)
    hits = each.reduce((a, b) => a + b, 0)
  }
  // Master Rune of Bursting Flame: each hit is 2D3 hits
  if (w.flags?.burst) {
    const each = Array.from({ length: hits }, () => Math.ceil(rollDice(game.rng, 1)[0] / 2) + Math.ceil(rollDice(game.rng, 1)[0] / 2))
    say(game, 'roll', `${w.name}: the Master Rune of Bursting Flame — each hit is 2D3 hits: ${each.join(' + ')} = ${each.reduce((a, b) => a + b, 0)}.`)
    hits = each.reduce((a, b) => a + b, 0)
  }
  // Rune of Concussive Force: the unit hit is Stupid until the shooter's next Start of Turn
  if (w.flags?.concussive && !t.special.has('Stupidity')) {
    t.special.add('Stupidity')
    addEffect(game, { kind: 'concussive', side: u.side, until: 'nextStartOfTurn', revert: () => t.special.delete('Stupidity'), say: `${t.name} shakes off the Rune of Concussive Force.` })
    say(game, 'bad', `${t.name} is struck by the Rune of Concussive Force: it has Stupidity until ${u.name}'s next Start of Turn.`)
  }
  w = { ...w }
  if (inAura(game, 'evilSun', u)) w.AP = (w.AP || 0) - 1
  if (u.status.apBonus) w.AP = (w.AP || 0) - u.status.apBonus
  if (hasRule(t, 'Ethereal') && !hasRule(u, 'Magical Attacks') && !w.magic && !hasRuleW(w, 'Magical Attacks')) { say(game, 'roll', `${t.name} is Ethereal: only magical attacks can wound it.`); return 0 }
  return resolveHits(game, u, t, hits, w, { source: standAndShoot ? 'Stand & Shoot' : 'shooting', poisoned })
}

// Evasive: once a turn, a unit most of whose models are Evasive, declared the
// target in the enemy Shooting phase, may Fall Back in Good Order directly away from the shooters; the
// shooting then goes on as declared. (Its player is asked; the shooters' range and sight are measured after.)
export function canEvade (game, t) {
  const turn = `${game.round}:${game.active}`
  if (game.phase !== 'shooting' || t.side === game.active || !hasRule(t, 'Evasive')) return false
  if (t.status.evaded === turn || t.status.engaged || t.status.fleeing || t.status.removed || isDead(t)) return false
  // (a unit has the rule when most of its models do; joined characters count among its models)
  const joined = (t.joined || []).filter(c => !c.status?.removed && !isDead(c))
  const n = modelCount(t) + joined.reduce((a, c) => a + modelCount(c), 0)
  const evasive = modelCount(t) + joined.filter(c => hasRule(c, 'Evasive')).reduce((a, c) => a + modelCount(c), 0)
  return evasive > n / 2
}
// Returns false when the target is gone (it fell back off the table), and the shooting is over.
async function evade (game, u, t, ask) {
  if (!canEvade(game, t)) return true
  const yes = await ask(`${t.name} is Evasive: fall back in good order directly away from ${u.name} before it shoots?`, [['Fall back (Evasive)', true], ['Stay', false]])
  if (!yes) return true
  t.status.evaded = `${game.round}:${game.active}`
  say(game, 'h', `${t.name} is Evasive and FALLS BACK IN GOOD ORDER directly away from ${u.name}.`)
  fleeFrom(game, t, u, { label: 'falls back in good order (Evasive)', keepHighest: true })
  if (!t.status.removed) { t.status.fleeing = false; reformToFace(game, t, u) }
  if (t.status.removed || isDead(t)) { u.status.shot = true; return false }
  return true
}

// Wound, save and remove. Shared with the war machines.
export async function resolveHits (game, from, t, hits, w, { source = 'shooting', charged = false, poisoned = 0 } = {}) {
  // Flaming Attacks / Magical Attacks: a model with the rule makes such attacks
  // when shooting too (Flaming: not with a magic weapon); `from` may be a spell or item source without rules
  if (from?.special) {
    const add = [hasRule(from, 'Magical Attacks') && 'Magical Attacks', hasRule(from, 'Flaming Attacks') && !w.magic && 'Flaming Attacks'].filter(r => r && !(w.rules || []).includes(r))
    if (add.length) w = { ...w, rules: [...(w.rules || []), ...add] }
  }
  // (Petrifying gaze: To Wound against its Initiative instead — darkelves.js)
  const T = petrifying(w) ? ((alive(t).find(x => x.role === 'rank') || alive(t)[0])?.profile.I ?? 1) : targetToughness(t)
  // (Master Rune of Slaying: 3+ against a behemoth, whatever its Toughness)
  const need0 = toWoundNeed(w.S, T)
  const need = w.flags?.woundOnBehemoth && /Behemoth/.test((t.troopType || []).join(' ')) ? Math.min(need0 ?? 7, w.flags.woundOnBehemoth) : need0
  if (need == null) { say(game, 'roll', `To Wound: S${w.S} against T${T} — too tough to wound.`); return 0 }
  let dice = rollDice(game.rng, hits)
  // Ironhide Talisman: rolls To Wound of a natural 6 against its bearer are re-rolled
  if (itemFlag(t, 'ironhide', { personal: true }) && dice.includes(6)) { const again = rollDice(game.rng, dice.filter(d => d === 6).length); let j = 0; say(game, 'roll', `Ironhide Talisman: ${again.length} natural 6 To Wound re-rolled [${again.join(' ')}].`); dice = dice.map(d => d === 6 ? again[j++] : d) }
  // (poisoned hits: +2 To Wound on the first dice, one for each)
  // (Unmade Flesh: its bearer is never wounded on a roll of 2)
  const flesh = itemFlag(t, 'unmadeFlesh', { personal: true })
  const wounds = dice.filter((d, i) => d !== 1 && !(flesh && d === 2) && d + (i < poisoned ? 2 : 0) >= need)
  const bane = hasRuleW(w, 'Armour Bane') ? Number((w.rules.find(r => r.startsWith('Armour Bane')).match(/\((\d+)/) || [])[1] || 1) : 0
  const sixes = bane ? wounds.filter(d => d === 6).length : 0
  say(game, 'roll', `To Wound: ${hits} dice [${dice.join(' ')}] S${w.S} against T${T} need ${need}+${poisoned ? ` (${poisoned} poisoned: +2 on the first ${poisoned})` : ''} — ${wounds.length} wound${wounds.length === 1 ? '' : 's'}${sixes ? ` (${sixes} natural 6, Armour Bane ${bane})` : ''}.`)
  if (!wounds.length) return 0
  const unsaved = saveRolls(game, t, wounds.length, w.AP || 0, sixes, bane, w)
  if (w.flags?.huntersScorn) huntersScorn(game, from, t, unsaved)
  // Multiple Damage (X): the Dragon Bow and other such weapons
  const mw = multipleDamage(w.rules, sides => dN(game.rng, sides))
  // Dry as Dust (tombkings.js)
  const dry = (w.rules || []).includes('Flaming Attacks') ? dryAsDust(game, t, unsaved) : 0
  if (mw && unsaved) { if (dry) applyWounds(game, t, dry, 'Dry as Dust'); return applyMultipleDamage(game, t, Array.from({ length: unsaved }, () => mw()), `${source}, Multiple Damage`) }
  return applyWounds(game, t, unsaved + dry, source)
}

// Hunter's Scorn: an enemy of 2 or more Wounds that suffers unsaved wounds from it: it and its unit
// -1 Initiative (minimum 1) for the rest of the game; if the wielder fails to wound its target, the effect is lost
// (every -1 it has given is taken back)
function huntersScorn (game, from, t, unsaved) {
  const marks = from.status.scorned = from.status.scorned || []
  const W = (alive(t).find(m => m.role === 'rank') || alive(t)[0])?.profile.W ?? 1
  if (unsaved && W >= 2) {
    if (marks.some(x => x.unit === t)) return
    const changed = t.models.filter(m => (m.profile.I ?? 1) > 1)
    for (const m of changed) m.profile = { ...m.profile, I: m.profile.I - 1 }
    marks.push({ unit: t, changed })
    say(game, 'bad', `Hunter's Scorn: ${t.name} suffers -1 Initiative for the rest of the game.`)
  } else if (!unsaved && marks.length) {
    for (const x of marks) for (const m of x.changed) m.profile = { ...m.profile, I: m.profile.I + 1 }
    say(game, '', `Hunter's Scorn failed to wound: its curse is lost (${marks.map(x => x.unit.name).join(', ')} recover their Initiative).`)
    from.status.scorned = []
  }
}

export function targetToughness (t) {
  const m = alive(t).find(x => x.role === 'rank') || alive(t)[0]
  return m?.profile.T ?? 3
}

// Armour Rolls, then Untouchable saves for those that failed. Returns unsaved wounds.
export function saveRolls (game, t, n, ap, baneSixes = 0, bane = 0, w = {}) {
  const rules = w.rules || []
  const sv = saveFor(t, { magical: rules.includes('Magical Attacks'), flaming: rules.includes('Flaming Attacks'), phase: game.phase === 'shooting' ? 'shooting' : null, strength: w.S })
  let unsaved = 0
  const parts = []
  // (Petrifying gaze: no Armour Roll)
  if (sv.armour <= 6 && !petrifying(w)) {
    const normal = n - baneSixes
    const ok = (d, i) => { const needNow = sv.armour - (sv.apImmune ? 0 : (ap - (i < normal ? 0 : bane))); return d !== 1 && d >= needNow && needNow <= 6 } // ap is negative: -1 makes 5+ into 6+
    const rr = itemSaveRerolls(game, t, 'armour', rollDice(game.rng, n), ok)
    const dice = rr.dice
    const saved = dice.filter((d, i) => ok(d, i)).length
    const needAll = sv.armour - ap
    parts.push(`Armour Roll (${sv.armourText}, armour value ${sv.armour}+${ap ? `, AP ${ap}` : ''}${baneSixes ? `, ${baneSixes} at a further -${bane}` : ''}): [${dice.join(' ')}]${rr.note} need ${needAll > 6 ? 'more than 6 — no save' : needAll + '+'} — ${saved} saved`)
    unsaved = n - saved
  } else {
    parts.push(`no Armour Roll (${sv.armourText || 'no armour'})`)
    unsaved = n
  }
  // Sword of Sorrow: no Ward or Regeneration saves against its wounds
  const noWR = !!w.flags?.noWardRegen
  if (!noWR) unsaved -= charmedWard(game, t, unsaved, sv)
  if (unsaved && sv.ward && !noWR) {
    const wr = itemSaveRerolls(game, t, 'ward', rollDice(game.rng, unsaved), d => d >= sv.ward)
    const saved = wr.dice.filter(d => d >= sv.ward).length
    parts.push(`Untouchable save ${sv.ward}+ (${sv.wardText}): [${wr.dice.join(' ')}]${wr.note} — ${saved} saved`)
    unsaved -= saved
  }
  if (unsaved && sv.regen && !noWR) {
    const dice = itemSaveRerolls(game, t, 'regen', rollDice(game.rng, unsaved), d => d >= sv.regen).dice
    const saved = dice.filter(d => d >= sv.regen).length
    parts.push(`Regeneration ${sv.regen}+: [${dice.join(' ')}] — ${saved} saved`)
    unsaved -= saved
  }
  say(game, 'roll', `${t.name}: ${parts.join('; ')}. ${unsaved} unsaved.`)
  return unsaved
}

// Panic after shooting: more than a quarter of the models it had at the start of the phase.
export function afterShooting (game, t, shooter) {
  if (t.status.removed || isDead(t) || t.status.fleeing) return
  const start = t.status.phaseStartCount ?? t.models.length
  const now = modelCount(t)
  if (start - now > start / 4 && !t.status.panicTested) {
    t.status.panicTested = true
    panicTest(game, t, shooter, `lost ${start - now} of the ${start} models it had at the start of the phase`)
  }
}

export function panicTest (game, t, from, why, { forced = false, testOnly = false } = {}) {
  if (!forced && (hasRule(t, 'Immune to Psychology') || hasRule(t, 'Unbreakable') || hasRule(t, 'Ignore Panic') || hasRule(t, 'Frenzy'))) {
    say(game, '', `${t.name} ${why}: no Panic test (${['Immune to Psychology', 'Unbreakable', 'Ignore Panic', 'Frenzy'].find(r => hasRule(t, r))}).`)
    return true
  }
  // Hold the Line: this character (and a unit it has joined) passes Panic tests
  // (Mark of Rapture: a unit mostly of it passes its Panic tests)
  if (!forced && hasRule(t, 'Mark of Rapture')) { say(game, '', `${t.name} ${why}: the Mark of Rapture — it passes its Panic test automatically.`); return true }
  // (Pure of Heart: a character with it and its unit pass Panic tests)
  if (!forced && [t, ...(t.joined || []).filter(c => !c.status?.removed)].some(c => itemFlag(c, 'pureOfHeart', { personal: true }))) { say(game, '', `${t.name} ${why}: Pure of Heart — it passes its Panic test automatically.`); return true }
  // (Oathstone: so too a character on an Oathstone and its unit)
  if (!forced && ([t, ...(t.joined || []).filter(c => !c.status?.removed)].some(c => hasRule(c, 'Oathstone') || c.status?.grudgestone))) { say(game, '', `${t.name} ${why}: ${[t, ...(t.joined || [])].some(c => c.status?.grudgestone) ? 'the Grudgestone' : 'the Oathstone'} — it passes its Panic test automatically.`); return true }
  if (!forced && (hasRule(t, '"Hold the Line!"') || (t.joined || []).some(c => !c.status?.removed && hasRule(c, '"Hold the Line!"')))) { say(game, '', `${t.name} ${why}: "Hold the Line!" — it passes its Panic test automatically.`); return true }
  const lt = leadershipTest(game, t, { label: `${t.name} — Panic test (${why})`, kind: 'panic', reroll: holyFervour(game, t) ? 'Holy Fervour' : valourOfAges(t, why) ? 'Valour of Ages' : null })
  say(game, 'roll', lt.text)
  if (lt.passed || testOnly) return lt.passed
  const startModels = t.models.length
  if (modelCount(t) > startModels / 2) {
    say(game, 'bad', `${t.name} panics and FALLS BACK IN GOOD ORDER directly away from ${from.name}.`)
    fleeFrom(game, t, from, { label: 'falls back in good order', keepHighest: true })
    if (!t.status.removed) { t.status.fleeing = false; reformToFace(game, t, from) }
  } else {
    say(game, 'bad', `${t.name} panics and FLEES directly away from ${from.name}.`)
    fleeFrom(game, t, from, { label: 'flees' })
  }
  return false
}

// Common Causes of Panic: a friendly unit of Unit Mass 5 or more destroyed within
// 6", and a friendly unit fleeing (or falling back) through it, cause Panic tests; failed, the unit flees from the
// nearest enemy that is not fleeing. `source`: the unit that caused it.
export function panicFromFriend (game, f, source, why) {
  if (f.status.removed || isDead(f) || f.status.engaged || f.status.fleeing || f.status.panicTested || !f.placed) return
  if (hasRule(f, 'Ignore Panic') && !hasRule(source, 'Ignore Panic')) return
  // Largely Insignificant: Grublings never cause friendly Panic tests (ogres.js)
  if (insignificant(source)) return
  if (disdains(f, source)) { say(game, '', `${f.name} looks down on ${source.name} (Noble Disdain): no Panic test.`); return }
  if (vowIgnoresPanic(f, source)) { say(game, '', `${f.name} is not troubled by ${source.name} (its Vow).`); return }
  const nearestEnemy = onTable(game).filter(o => o.side !== f.side && !o.status.fleeing).sort((a, b) => distanceBetween(f, a) - distanceBetween(f, b))[0]
  if (!nearestEnemy) return
  f.status.panicTested = true
  panicTest(game, f, nearestEnemy, why)
}
export function friendDestroyed (game, u, usBefore) {
  if (usBefore < 5 || !u.placed) return
  for (const f of onTable(game).filter(o => o.side === u.side && o !== u && distanceBetween(o, u) <= 6)) panicFromFriend(game, f, u, `${u.name} was destroyed within 6"`)
}

export function standAndShoot (game, t, charger) {
  if (!rangedWeaponsOf(t).length) return
  t.status.shot = false
  return shoot(game, t, charger, null, { standAndShoot: true }).then(() => { t.status.shot = false })
}

const familyOf = u => /cavalry/i.test((u.troopType || []).join(' ') + u.category) ? 'cavalry' : /infantry/i.test((u.troopType || []).join(' ') + u.category) ? 'infantry' : 'other'
// (a Whirler is shot at as if it were a lone character: Release the Whirlers!)
export const isLoneCharacter = u => !!u.status?.whirler || ((u.troopType || []).includes('Character') && u.models.length === 1 && familyOf(u) !== 'other')
function screened (game, c) {
  return onTable(game).some(o => o.side === c.side && o !== c && !o.status.fleeing && modelCount(o) >= 5 && familyOf(o) === familyOf(c) && distanceBetween(o, c) <= 3)
}

// Enemy Fire Skirmishers: shooting at Skirmishers whose models are all
// Unit Mass 1 is at -1 To Hit. Characters joined to them count among their models.
// Clouds of Soot and Smoke: an Engineer on foot within 3" of a friendly war machine
// is behind full cover (every shooting path asks this)
export function sootCover (game, t) {
  return hasRule(t, 'Clouds of Soot & Smoke') && !t.mount && onTable(game).some(o => o.side === t.side && o !== t && isWarMachine(o) && distanceBetween(o, t) <= 3)
}
export function skirmishersPenalty (t) {
  if (t.formation !== 'skirmish') return false
  const models = modelCount(t) + (t.joined || []).filter(c => !c.status.removed).reduce((a, c) => a + modelCount(c), 0)
  return unitMass(t) === models
}
