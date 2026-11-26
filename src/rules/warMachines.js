// War machines: the Great Cannon and Mortar (Concord Realm), the Rock Chucka (a stone thrower) and the Bolt
// Chucka (a bolt thrower) of the Rukka & Nippers, and the other armies' engines built on the same rules. Exports
// machineWeapon, machineTargets and machineShoot (and a few machine-specific rules), used by shooting, combat,
// strategy, special shots and the battle screen.
//
// Machine and crew are one model: in combat the crew's T and W, otherwise the machine's; saves on the crew's armour.
// Weapon of War: may not march, charge or pursue; -1 to Flee rolls; may turn freely about its centre just before
//   shooting without counting as having moved.
// Hired Crew: a war machine that breaks from combat is destroyed.
// Great Cannon: range 60", Strength 10, AP -3, Multiple Damage (D3+1), Armour Bane (2); Cannon Fire; Move or
//   Shoot; Cumbersome; ignores BS; misfires on the Black Powder Misfire table.
// Cannon Fire: target point; Artillery dice moves it away = strike point;
//   a second Artillery dice for the bounce (Misfire: no bounce); everything under the strike
//   point and the bounce is hit; at most one model per rank (front/rear arc) or per file (flank).
// Mortars: 12-48", Bombardment with a 5" template, Strength 2 (6 under the hole), AP -2 (-3 under the hole),
//   Armour Bane (1), Multiple Damage (D3) on the model under the hole; Black Powder Misfire table.
// Stone throwers: 12-60", S4(8), AP-1(-3), Bombardment, 3" template,
//   Multiple Damage (D3+1) under the hole; Stone Thrower Misfire table.
// Bombardment: template's hole over the target's centre; Artillery and
//   Scatter dice; Hit! lands, an arrow moves it the Artillery dice's inches.
// Templates: blast templates 3" or 5" in DIAMETER.
// Who is hit: a model wholly under the template (or partly under the hole) is hit; partly under is hit on a 4+.
// Bolt Throwers: 48", S6, AP -3, Cumbersome, Move or Shoot, Multiple Damage (2), Through & Through; rolls To Hit
//   with the crew's BS.
// Through and Through: a hit on a formed unit hits once per rank (front or
//   rear arc) or once per file (flank), at -1 Strength for each hit after the first.
// Black Powder Misfire table / Stone Thrower Misfire table:
//   1 destroyed; 2-4 the crew lose a Wound and it cannot shoot until the end of next round;
//   5-6 it fails to shoot this turn.

import { drenchedMachineFails } from './saurians.js'
import { panicTest } from './shooting.js'
import { flameTemplate, templateHits } from './spells.js'
import { itemFlag, itemLeft, spendItem } from './items.js'
import { artilleryMaster, useArtilleryMaster } from './dwarfs.js'
import { say, onTable, solid, TABLE } from './game.js'
import { d6, rollDice, artilleryDie, scatterDie } from './dice.js'
import { add, sub, mul, dirOf, angleOf, len, dist, pointInPoly, segDist, polysOverlap } from './geometry.js'
import { corners, centre, alive, modelSlots, arcOf, hasRule, isDead, modelCount, distanceBetween } from './units.js'
import { hostOf } from './joining.js'
import { commandRange } from './leadership.js'
import { sightTo } from './sight.js'
import { WEAPONS } from '../data/weapons.js'
import { toWoundNeed, saveFor, applyMultipleDamage, applyWounds, itemSaveRerolls, charmedWard } from './damage.js'
import { rollToHit, targetToughness, afterShooting, skirmishersPenalty, sootCover } from './shooting.js'
import { destroy } from './charge.js'
import { onImpassable } from './terrain.js'

export const isWarMachine = u => /war machine/i.test(u.category + ' ' + (u.troopType || []).join(' '))

const KINDS = { 'great cannon': 'cannon', cannon: 'cannon', mortar: 'bombard', 'stone thrower': 'bombard', 'bolt thrower': 'bolt', 'thunderclap volley gun': 'volley', 'steam cannon': 'cannon', 'skyfire rocket battery': 'skyfire', 'spidersilk lobber': 'bombard', 'field trebuchet': 'bombard', 'organ gun': 'organ', bombard: 'cannon', 'fire thrower': 'flame', 'nipper-hewer': 'hewer', hexfire: 'bombard', 'wyrdfire blast': 'bombard', 'cannon of the cloud-titans solid shot': 'cannon', 'junkflinger catapult': 'bombard', 'repeater bolt thrower': 'bolt', 'wailing skull catapult': 'bombard', 'blightclaw catapult': 'bombard', 'foul wind mortar': 'bombard', 'chatter gun': 'organ', 'wyrdfire thrower': 'flame', 'groundbreaker mortar': 'bombard', 'demolition rockets': 'bombard', 'grand cannon': 'cannon' }

export function machineWeapon (u) {
  const w = (u.kit?.ranged || []).find(x => KINDS[x.key])
  if (!w) return null
  const p = WEAPONS[w.key] || w
  const nums = s => (String(s).match(/-?\d+/g) || []).map(Number)
  const rng = (String(p.range).match(/\d+/g) || []).map(Number) // '12-48"' or '60"'
  const [minR, maxR] = rng.length > 1 ? rng : [0, rng[0]]
  const [S, Sc] = nums(p.S)
  const ap = nums(p.AP)
  const mw = (p.rules || []).find(r => r.startsWith('Multiple Damage'))
  const bane = (p.rules || []).find(r => r.startsWith('Armour Bane'))
  return {
    key: w.key,
    kind: KINDS[w.key],
    name: p.name,
    minRange: minR,
    range: maxR,
    S,
    holeS: Sc ?? S,
    AP: ap[0] ?? 0,
    holeAP: ap[1] ?? ap[0] ?? 0,
    multipleDamage: mw ? mw.match(/\(([^)]+)\)/)[1] : null,
    armourBane: bane ? Number(bane.match(/\((\d+)/)[1]) : 0,
    // (Spidersilk lobber: a 5" blast template)
    // (Blightclaw Catapult 5"; Foul Wind Mortar, Wailing Skull Catapult 3")
    template: w.key === 'mortar' || w.key === 'spidersilk lobber' || w.key === 'blightclaw catapult' || w.key === 'groundbreaker mortar' ? 5 : w.key === 'foul wind mortar' || w.key === 'wailing skull catapult' || w.key === 'demolition rockets' ? 3 : w.key === 'stone thrower' || w.key === 'skyfire rocket battery' || w.key === 'field trebuchet' || w.key === 'hexfire' || w.key === 'wyrdfire blast' ? 3 : w.key === 'junkflinger catapult' ? 5 : 0,
    misfireTable: w.key === 'stone thrower' || w.key === 'field trebuchet' || w.key === 'nipper-hewer' || w.key === 'blightclaw catapult' || w.key === 'wailing skull catapult' ? 'stone' : w.key === 'bombard' ? 'bombard' : w.key === 'hexfire' ? 'soulfire-cannon' : w.key === 'cannon of the cloud-titans solid shot' || w.key === 'junkflinger catapult' ? 'ogre' : 'powder',
    // Rune of Skewering: a bolt thrower +1 Strength and no Armour Roll
    ...(KINDS[w.key] === 'bolt' && itemFlag(u, 'skewering') ? { S: S + 1, holeS: (Sc ?? S) + 1, noArmour: true } : {}),
    rules: p.rules || [],
    page: p.page
  }
}

// An Artillery dice for the machine; a Misfire re-rolled once a turn by a Dwarf Engineer or Torvik nearby
// (Artillery Master, Range Finding Optics; dwarfs.js — used on a Misfire, a guess at the choice)
function artDie (game, u) {
  const r = artilleryDie(game.rng)
  if (r !== 'misfire') return r
  // Rune of Forging: single use, each rune re-rolls a single Misfire
  if (itemLeft(u, 'rune-of-forging') > 0) {
    spendItem(u, 'rune-of-forging')
    const again = artilleryDie(game.rng)
    say(game, 'roll', `${u.name}: an Artillery dice MISFIRE, re-rolled with a Rune of Forging (single use): ${again}.`)
    return again
  }
  const e = artilleryMaster(game, u, commandRange)
  if (!e) return r
  useArtilleryMaster(game, e)
  const again = artilleryDie(game.rng)
  say(game, 'roll', `${u.name}: an Artillery dice MISFIRE, re-rolled by ${e.name} (${hasRule(e, 'Range Finding Optics') ? 'Range-finding Optics' : 'Artillery Master'}): ${again}.`)
  return again
}

// "D3+1", "D3", "2"
function rollMultiple (game, spec) {
  if (!spec) return { n: 1, text: '' }
  const m = String(spec).match(/^(\d*)D(\d)(?:\+(\d+))?$/i)
  if (m) {
    const r = d6(game.rng)
    const die = Number(m[2]) === 3 ? Math.ceil(r / 2) : r
    const n = die + Number(m[3] || 0)
    return { n, text: `${spec} = ${n}` }
  }
  return { n: Number(spec) || 1, text: spec }
}

function misfire (game, u, w) {
  // Steam Cannon: a Misfire costs the Iron Kettle a single Wound instead of the Misfire table
  // (Spidersilk lobber: likewise the Broodmaw loses a single Wound)
  // (Wyrdfire Blast: the Wyrdfire Dragon loses a single Wound instead)
  if (w.key === 'steam cannon' || w.key === 'spidersilk lobber' || w.key === 'wyrdfire blast') { say(game, 'bad', `MISFIRE! ${u.name}'s ${w.name}: it loses a single Wound.`); applyWounds(game, u, 1, `${w.name} misfire`); return }
  if (w.misfireTable === 'soulfire-cannon') return soulfireCannonMisfire(game, u)
  // Cannon of the Cloud-Titans (Gutcannon), Junkflinger catapult: 1 destroyed; 2-3 the weapon
  // useless for the rest of the game; 4-6 no shot this turn nor in the next round
  if (w.misfireTable === 'ogre') {
    const r = d6(game.rng)
    const sky = w.key.startsWith('cannon')
    if (r === 1) { say(game, 'bad', `MISFIRE! ${sky ? 'Gutcannon' : 'Junkflinger'} Misfire table: 1 — ${sky ? 'KABOOM' : 'KERR-UNCH'}! ${u.name} is destroyed.`); destroy(game, u, 'misfire'); return }
    if (r <= 3) { say(game, 'bad', `MISFIRE! ${sky ? 'Gutcannon' : 'Junkflinger'} Misfire table: ${r} — ${sky ? 'KRRACK' : 'SNAP'}! The weapon is useless for the rest of the game.`); u.status.weaponBroken = true; return }
    say(game, 'bad', `MISFIRE! ${sky ? 'Gutcannon' : 'Junkflinger'} Misfire table: ${r} — ${sky ? 'ACK' : 'SPLANG'}! No shot this turn nor in the next round.`)
    u.status.cannotShootUntilRound = game.round + 1; u.status.cannotShootSide = game.active
    return
  }
  const r = d6(game.rng)
  // Bombard: the Bombard Misfire table
  if (w.misfireTable === 'bombard') {
    if (r === 1) { say(game, 'bad', `MISFIRE! Bombard Misfire table: rolled 1 — DESTROYED. ${u.name} explodes.`); destroy(game, u, 'misfire'); return }
    if (r <= 3) { say(game, 'bad', `MISFIRE! Bombard Misfire table: rolled ${r} — MALFUNCTION. The crew lose a Wound and it fails to shoot this turn.`); u.status.crewWoundsLost = (u.status.crewWoundsLost || 0) + 1; applyWounds(game, u, 1, 'malfunction'); return }
    if (r <= 5) { say(game, 'bad', `MISFIRE! Bombard Misfire table: rolled ${r} — PFFFT. It fails to shoot this turn.`); return }
    say(game, 'bad', `MISFIRE! Bombard Misfire table: rolled 6 — BOOM! It shoots as if a 2 had been rolled on the Artillery dice, but cannot shoot during the next round.`)
    u.status.cannotShootUntilRound = game.round + 1
    u.status.cannotShootSide = game.active
    return 'boom'
  }
  const table = w.misfireTable === 'stone' ? 'Stone Thrower Misfire table' : 'Black Powder Misfire table'
  if (r === 1) {
    say(game, 'bad', `MISFIRE! ${table}: rolled 1 — DESTROYED. ${u.name} blows itself apart.`)
    destroy(game, u, 'misfire')
  } else if (r <= 4) {
    say(game, 'bad', `MISFIRE! ${table}: rolled ${r} — MALFUNCTION. The crew lose a Wound, it cannot shoot this turn or before the end of the next round.`)
    u.status.cannotShootUntilRound = game.round + 1
    u.status.cannotShootSide = game.active
    u.status.crewWoundsLost = (u.status.crewWoundsLost || 0) + 1
    applyWounds(game, u, 1, 'malfunction')
  } else {
    say(game, 'bad', `MISFIRE! ${table}: rolled ${r} — ${w.misfireTable === 'stone' ? 'TWANG' : 'PFFFT'}. It fails to shoot this turn.`)
  }
}

export function machineTargets (game, u) {
  const w = machineWeapon(u)
  if (!w) return []
  return onTable(game).filter(t => t.side !== u.side && !t.status.engaged).map(t => {
    // it may pivot freely before shooting: judge sight as if facing the target
    const was = u.facing
    u.facing = angleOf(sub(centre(t), centre(u)))
    const s = sightTo(game, u, t)
    u.facing = was
    const d = dist(centre(u), centre(t))
    // (Skyfire: it may fire without line of sight)
    return { unit: t, distance: d, sees: s.sees || w.kind === 'skyfire', inRange: d <= w.range && d >= w.minRange }
  }).filter(x => x.sees && x.inRange)
}

export async function machineShoot (game, u, t, ask, opts = {}) {
  const w = machineWeapon(u)
  if (!w) { say(game, 'bad', `${u.name} has no war machine weapon.`); return }
  // (Monsoon: a drenched war machine, a D6 before shooting — a 1 and it does not shoot: saurians.js)
  if (isWarMachine(u) && drenchedMachineFails(game, u)) { u.status.shot = true; return }
  // (Rune of Reloading: it shoots every turn, even after a malfunction)
  if (u.status.cannotShootUntilRound != null && !itemFlag(u, 'reloading') && (game.round < u.status.cannotShootUntilRound || (game.round === u.status.cannotShootUntilRound && game.active === u.status.cannotShootSide))) {
    say(game, 'bad', `${u.name} is still being repaired after its malfunction.`); return
  }
  const machine = isWarMachine(u)
  if (u.status.weaponBroken) { say(game, 'bad', `${u.name}'s ${w.name} is broken.`); return }
  // (Chalice of Dark Rain: enemy war machines cannot shoot)
  if (machine && game.darkRain && game.darkRain.side !== u.side) { say(game, 'bad', `${u.name} cannot shoot: the Chalice of Dark Rain.`); return }
  if ((machine || (w.rules || []).includes('Move or Shoot')) && (u.status.moved || u.status.countsAsMoved)) { say(game, 'bad', `${u.name} moved this turn: Move or Shoot.`); return }
  const d = dist(centre(u), centre(t))
  if (d > w.range || d < w.minRange) { say(game, 'bad', `${t.name} is ${d.toFixed(1)}" away: ${w.name} shoots ${w.minRange ? w.minRange + '-' : ''}${w.range}".`); return }
  if (machine) {
    // pivot to face the target (Weapon of War); it does not count as moving
    const c = centre(u)
    const was = { pos: u.pos, facing: u.facing }
    u.facing = angleOf(sub(centre(t), c))
    u.pos = add(c, mul(dirOf(u.facing), u.base.d / 2))
    // no room to turn (rocks, or another unit): it shoots from where it stands, as it faces
    if (onImpassable(game, u) || solid(game).some(o => o !== u && polysOverlap(corners(u), corners(o), 0.02))) Object.assign(u, was)
  } else if (w.key === 'steam cannon' && arcOf(u, centre(t)) !== 'front') {
    // Steam Cannon: "it can only shoot into the Iron Kettle's front arc"
    say(game, 'bad', `${t.name} is not in ${u.name}'s front arc: the Steam Cannon shoots only to the front.`); return
  }
  u.status.shot = true
  say(game, 'h', `${u.name} fires its ${w.name} at ${t.name} (${d.toFixed(1)}" away).`)
  if (w.kind === 'cannon') return cannonFire(game, u, t, w, opts.point)
  if (w.kind === 'bombard') return bombard(game, u, t, w, ask)
  if (w.kind === 'volley') return thunderclap(game, u, t, w)
  if (w.kind === 'organ') return organGun(game, u, t, w)
  if (w.kind === 'flame') return fireThrower(game, u, t, w)
  if (w.kind === 'hewer') return nipperHewer(game, u, t, w)
  if (w.kind === 'skyfire') return skyfire(game, u, t, w)
  return boltThrower(game, u, t, w)
}

// ---- cannon ----
function cannonFire (game, u, t, w, point) {
  const from = centre(u)
  // the target point: where the player clicked, or (when none was given) 5" short of the near
  // edge of the target — the Artillery dice averages 6", so the ball lands near the front rank
  const near = nearestPointOn(t, from)
  const aim = point || sub(near, mul(sub(near, from), 5 / (dist(near, from) || 1)))
  const dir = mul(sub(aim, from), 1 / (len(sub(aim, from)) || 1))
  let a = artDie(game, u)
  if (a === 'misfire') { say(game, 'roll', `Artillery dice: MISFIRE.`); if (misfire(game, u, w) !== 'boom') return; a = 2 }
  const strike = add(aim, mul(dir, a))
  const b = artilleryDie(game.rng)
  const bounce = b === 'misfire' ? 0 : b
  say(game, 'roll', `Cannon Fire: target point ${dist(from, aim).toFixed(1)}" away; Artillery dice ${a} — strike point ${dist(from, strike).toFixed(1)}" away; bounce dice ${b === 'misfire' ? 'MISFIRE (the ball buries itself, no bounce)' : b + '"'}.`)
  const end = add(strike, mul(dir, bounce))
  game.lastShot = { kind: 'cannon', from, aim, strike, end }
  // (the table draws the ball: out to where it lands, then the bounce — view/shotFx.js; it decides nothing)
  game.onShot?.({ kind: 'cannon', shooter: u, from, strike, end, weapon: w?.name })
  // Cannon Fire step 5 (Crunch): a monstrous creature or behemoth stops
  // the ball dead. Units are taken in the order the ball reaches them.
  const victims = []
  const reached = onTable(game).filter(o => o !== u).sort((a, b) => dist(from, centre(a)) - dist(from, centre(b)))
  for (const o of reached) {
    if (victims.some(v => v.stops)) break
    const slots = modelSlots(o)
    const hitSlots = slots.filter(s => squareHitBySegment(s.at, o, strike, end))
    if (!hitSlots.length) continue
    const arc = arcOf(o, from)
    const byLine = arc === 'front' || arc === 'rear' ? 'rank' : 'file'
    const seen = new Set()
    const hits = hitSlots.filter(s => { const k = s[byLine]; if (seen.has(k)) return false; seen.add(k); return true })
    victims.push({ unit: o, n: hits.length, byLine, stops: /monstrous creature|behemoth/i.test((o.troopType || []).join(' ')) })
  }
  if (!victims.length) { say(game, 'roll', 'The cannonball hits nothing.'); return }
  for (const v of victims) {
    say(game, 'roll', `${v.unit.name}: ${v.n} model${v.n === 1 ? '' : 's'} in the ball's path (at most one per ${v.byLine}).`)
    autoHits(game, u, v.unit, v.n, w.S, w.AP, w)
    afterShooting(game, v.unit, u)
  }
}

function nearestPointOn (t, from) {
  const cs = corners(t)
  let best = null; let bd = Infinity
  for (let i = 0; i < 4; i++) {
    const a = cs[i]; const b = cs[(i + 1) % 4]
    for (let k = 0; k <= 10; k++) {
      const p = add(a, mul(sub(b, a), k / 10))
      const dd = dist(p, from)
      if (dd < bd) { bd = dd; best = p }
    }
  }
  return best
}

function slotSquare (at, u) {
  const hw = u.base.w / 2; const hd = u.base.d / 2
  const f = dirOf(u.facing); const r = { x: -f.y, y: f.x }
  return [add(add(at, mul(r, -hw)), mul(f, hd)), add(add(at, mul(r, hw)), mul(f, hd)), add(add(at, mul(r, hw)), mul(f, -hd)), add(add(at, mul(r, -hw)), mul(f, -hd))]
}

function squareHitBySegment (at, u, a, b) {
  const sq = slotSquare(at, u)
  if (pointInPoly(a, sq) || pointInPoly(b, sq)) return true
  for (let i = 0; i < 4; i++) if (segDist(a, b, sq[i], sq[(i + 1) % 4]) < 1e-9) return true
  return false
}

// ---- bombardment ----
async function bombard (game, u, t, w, ask) {
  let at = centre(t)
  const a = artDie(game, u)
  const s = scatterDie(game.rng)
  if (a === 'misfire') { say(game, 'roll', 'Artillery dice: MISFIRE.'); return misfire(game, u, w) }
  if (s.hit) say(game, 'roll', `Bombardment: Scatter dice HIT! — the ${w.template}" template lands on the centre of ${t.name} (the Artillery dice's ${a} is ignored).`)
  else {
    const rad = (s.angle - 90) * Math.PI / 180 // 0 degrees is straight up the table
    at = add(at, mul({ x: Math.cos(rad), y: Math.sin(rad) }, a))
    say(game, 'roll', `Bombardment: Scatter dice shows an arrow (${s.angle}°), Artillery dice ${a} — the ${w.template}" template drifts ${a}".`)
  }
  // Flung Nipper: after the scatter, the template may be moved D3" in any direction
  // (its player picks the way: towards one of the enemy units, or not at all)
  if (hasRule(u, 'Flung Nipper')) at = await steerFlungNipper(game, u, at, ask)
  // (Hexfire: a unit with an unsaved wound from it tests for Panic as if it had taken heavy casualties)
  const before = w.key === 'hexfire' ? new Map(game.units.map(o => [o, o.models.reduce((a, m) => a + Math.max(0, m.wounds), 0)])) : null
  blastDamage(game, u, at, w, { hole: true })
  if (before) for (const [o, had] of before) if (o.side !== u.side && !o.status.removed && !isDead(o) && o.models.reduce((a, m) => a + Math.max(0, m.wounds), 0) < had && !o.status.panicTested) { o.status.panicTested = true; panicTest(game, o, u, 'wounded by Hexfire') }
}

async function steerFlungNipper (game, u, at, ask) {
  const n = Math.ceil(d6(game.rng) / 2)
  const near = onTable(game).filter(o => o.side !== u.side).sort((a, b) => dist(centre(a), at) - dist(centre(b), at)).slice(0, 4)
  const choice = ask ? await ask(`Flung Nipper: D3 = ${n}" — steer the template ${n}" towards...`, [['Do not steer', null], ...near.map(o => [`${o.name} (${dist(centre(o), at).toFixed(1)}" away)`, o])]) : null
  if (!choice) { say(game, 'roll', `Flung Nipper: D3 = ${n}" — not steered.`); return at }
  const to = centre(choice)
  const d = dist(to, at)
  const step = Math.min(n, d)
  const now = d ? add(at, mul(sub(to, at), step / d)) : at
  say(game, 'roll', `Flung Nipper: D3 = ${n}" — it flaps ${step.toFixed(1)}" towards ${choice.name}.`)
  return now
}

// Everything under a blast template of the weapon's size at `at`; `hole`: a single model under the central
// hole takes the bracketed Strength and AP (Bombardment step 3)
function blastDamage (game, u, at, w, { hole: useHole = true } = {}) {
  game.lastShot = { kind: 'template', at, r: w.template / 2 }
  // (the table draws the stone, pot or rocket coming down there — view/shotFx.js; it decides nothing)
  game.onShot?.({ kind: 'lob', shooter: u, at, r: w.template / 2, weapon: w.name, key: w.key })
  const r = w.template / 2
  let holeUsed = !useHole
  // joined characters are under the template too (and may be saved by "Take the Blow!" below)
  const joinedChars = game.units.filter(c => c.status.joinedTo && c.placed && !c.status.removed && !isDead(c))
  for (const o of [...onTable(game), ...joinedChars]) {
    if (o === u) continue
    let auto = 0; let partial = 0; let hole = null
    for (const sl of modelSlots(o)) {
      const sq = slotSquare(sl.at, o)
      const inside = sq.every(p => dist(p, at) <= r)
      const touch = inside || pointInPoly(at, sq) || sq.some(p => dist(p, at) <= r) || sq.some((p, i) => segDist(p, sq[(i + 1) % 4], at, at) <= r)
      if (!touch) continue
      if (!holeUsed && pointInPoly(at, sq)) { hole = sl; holeUsed = true; continue }
      if (inside) auto++
      else partial++
    }
    if (!auto && !partial && !hole) continue
    const pd = partial ? rollDice(game.rng, partial) : []
    const ph = pd.filter(d => d >= 4).length
    say(game, 'roll', `${o.name}: ${hole ? '1 model under the central hole (S' + w.holeS + ', AP ' + w.holeAP + '), ' : ''}${auto} wholly under the template, ${partial} partly under${partial ? ` — 4+ to be hit: [${pd.join(' ')}] ${ph} hit` : ''}.`)
    // Take the Blow! Characters: a character hit by shooting, with five or more rank
    // and file of its troop type in its unit: on a 2+ a member of the unit takes the hit
    const host = o.status.joinedTo ? game.units.find(x => x.id === o.status.joinedTo) : null
    const fam = x => /Cavalry/.test((x.troopType || []).join(' ')) ? 'c' : 'i'
    if (host && fam(host) === fam(o) && host.models.filter(m => m.wounds > 0 && m.role === 'rank').length >= 5) {
      const n = (hole ? 1 : 0) + auto + ph
      const lo = rollDice(game.rng, n)
      const k = lo.filter(d => d >= 2).length
      say(game, 'roll', `"Take the Blow!" for ${o.name}: [${lo.join(' ')}] — ${k} hit${k === 1 ? '' : 's'} taken by ${host.name} instead.`)
      if (k) autoHits(game, u, host, k, w.S, w.AP, w, false)
      if (n - k) autoHits(game, u, o, n - k, w.S, w.AP, w, false)
      continue
    }
    if (hole) autoHits(game, u, o, 1, w.holeS, w.holeAP, w, true)
    if (auto + ph) autoHits(game, u, o, auto + ph, w.S, w.AP, w, false)
    afterShooting(game, o, u)
  }
}

// ---- Skyfire Rocket Battery ----
// Skyfire: no line of sight needed; D3 3" templates with their holes over the target;
// for each, Artillery and Scatter dice: a Misfire (rolled on the Black Powder Misfire table once all are
// resolved), a Hit! moves it the Artillery dice less the crew's BS (minimum 0) in the Hit! arrow's way, an
// arrow moves it the Artillery dice; then every model under each template risks a hit (S4, AP -2).
function skyfire (game, u, t, w) {
  const n = Math.ceil(d6(game.rng) / 2)
  const bs = u.crew?.[0]?.profile.BS ?? 3
  say(game, 'roll', `Skyfire: D3 = ${n} rocket${n === 1 ? '' : 's'} at ${t.name}.`)
  let misfires = 0
  const spots = []
  for (let i = 0; i < n; i++) {
    const a = artDie(game, u)
    const sc = scatterDie(game.rng)
    if (a === 'misfire') { misfires++; say(game, 'roll', `Rocket ${i + 1}: Artillery dice MISFIRE — it fails to launch.`); continue }
    // (the Hit! symbol's small arrow points a way too: rolled as an angle, like the arrows)
    const angle = sc.hit ? Math.floor(game.rng() * 360) : sc.angle
    const by = sc.hit ? Math.max(0, a - bs) : a
    const rad = (angle - 90) * Math.PI / 180
    const at = add(centre(t), mul({ x: Math.cos(rad), y: Math.sin(rad) }, by))
    say(game, 'roll', `Rocket ${i + 1}: Artillery dice ${a}, Scatter dice ${sc.hit ? `HIT! (${a} - BS${bs} = ${by}")` : 'arrow'}, direction ${angle}° — it lands ${by}" from the centre of ${t.name}.`)
    spots.push(at)
  }
  for (const at of spots) blastDamage(game, u, at, w, { hole: false })
  for (let i = 0; i < misfires && !u.status.removed; i++) misfire(game, u, { ...w, misfireTable: 'powder' })
}

// ---- bolt thrower ----
function boltThrower (game, u, t, w) {
  const bs = machineBS(game, u)
  // the shooting modifiers apply: long range, and cover (To Hit modifiers)
  const vis = sightTo(game, u, t).visibleFraction
  // (Master Rune of Disguise: a war machine with it is always behind full cover)
  const cover = sootCover(game, t) || itemFlag(t, 'disguise') ? 2 : hasRule(t, 'Large Target') ? 0 : vis >= 1 ? (t.status.entrenched ? 1 : 0) : vis >= 0.5 ? 1 : 2
  const long = dist(centre(u), centre(t)) > w.range / 2 ? 1 : 0
  const skirm = skirmishersPenalty(t) ? 1 : 0
  const need = Math.max(2, 7 - bs) + long + cover + skirm
  const r = rollToHit(game, 1, need)
  game.onShot?.({ kind: 'volley', shooter: u, target: t, weapon: w?.name || 'Bolt thrower', key: w?.key || 'bolt thrower', shots: 1, hits: r.hits }) // (drawn by view/shotFx.js; decides nothing)
  say(game, 'roll', `Bolt thrower, crew BS${bs}${long ? ', long range -1' : ''}${cover ? `, ${cover === 1 ? 'partial' : 'full'} cover -${cover}` : ''}${skirm ? ', Skirmishers -1' : ''}: ${r.text}.`)
  if (!r.hits) return
  const arc = arcOf(t, centre(u))
  const slots = modelSlots(t)
  const lines = new Set(slots.map(s => arc === 'front' || arc === 'rear' ? s.rank : s.file))
  const n = lines.size
  say(game, 'roll', `Through & Through: ${n} hit${n === 1 ? '' : 's'} (one per ${arc === 'front' || arc === 'rear' ? 'rank' : 'file'}), Strength ${w.S} falling by 1 after the first.`)
  for (let i = 0; i < n; i++) {
    const S = w.S - i
    if (S <= 0) break
    autoHits(game, u, t, 1, S, w.AP, w, true)
    if (isDead(t)) break
  }
  afterShooting(game, t, u)
}

// Wound and save `n` hits at strength S. `multi`: Multiple Damage apply to these hits.
function autoHits (game, u, t, n, S, AP, w, multi = true) {
  if (isDead(t) || t.status.removed) return
  const T = targetToughness(t)
  const need = toWoundNeed(S, T)
  if (need == null) { say(game, 'roll', `To Wound: S${S} against T${T} — too tough.`); return }
  const dice = rollDice(game.rng, n)
  const wounds = dice.filter(d => d !== 1 && d >= need)
  const sixes = w.armourBane ? wounds.filter(d => d === 6).length : 0
  say(game, 'roll', `To Wound: ${n} dice [${dice.join(' ')}] S${S} against T${T} need ${need}+ — ${wounds.length} wound${wounds.length === 1 ? '' : 's'}${sixes ? `, ${sixes} natural 6 (Armour Bane ${w.armourBane})` : ''}.`)
  if (!wounds.length) return
  const sv = saveFor(t, { phase: game.phase === 'shooting' ? 'shooting' : null, strength: S, template: !!w.template })
  let unsaved = 0
  const okW = (d, i) => { const needSave = w.noArmour ? 7 : sv.armour - (sv.apImmune ? 0 : (AP - (i < sixes ? w.armourBane : 0))); return d !== 1 && needSave <= 6 && d >= needSave }
  const srr = itemSaveRerolls(game, t, 'armour', rollDice(game.rng, wounds.length), okW)
  const sdice = srr.dice
  sdice.forEach((d, i) => { if (!okW(d, i)) unsaved++ })
  say(game, 'roll', `${t.name} Armour Roll (${sv.armourText}, ${sv.armour}+, AP ${AP}${sixes ? `, ${sixes} at a further -${w.armourBane}` : ''}): [${sdice.join(' ')}]${srr.note} — ${wounds.length - unsaved} saved, ${unsaved} unsaved.`)
  // an Untouchable save after a failed Armour Roll, then Regeneration (More Than One Save,
  // Regeneration) — war machine hits allow both
  unsaved -= charmedWard(game, t, unsaved, sv)
  if (unsaved && sv.ward) {
    const wr = itemSaveRerolls(game, t, 'ward', rollDice(game.rng, unsaved), d => d >= sv.ward)
    const k = wr.dice.filter(d => d >= sv.ward).length
    say(game, 'roll', `${t.name} Untouchable save ${sv.ward}+${sv.wardText ? ` (${sv.wardText})` : ''}: [${wr.dice.join(' ')}]${wr.note} — ${k} saved.`)
    unsaved -= k
  }
  if (unsaved && sv.regen) {
    const rr = itemSaveRerolls(game, t, 'regen', rollDice(game.rng, unsaved), d => d >= sv.regen)
    const k = rr.dice.filter(d => d >= sv.regen).length
    say(game, 'roll', `${t.name} Regeneration ${sv.regen}+: [${rr.dice.join(' ')}]${rr.note} — ${k} saved.`)
    unsaved -= k
  }
  if (!unsaved) return
  if (multi && w.multipleDamage) {
    const each = []
    for (let i = 0; i < unsaved; i++) each.push(rollMultiple(game, w.multipleDamage).n)
    applyMultipleDamage(game, t, each, `${w.name}, Multiple Damage (${w.multipleDamage})`)
  } else applyWounds(game, t, unsaved, w.name)
}

// Thunderclap / Thunderclap Volley Gun: 24", S5, AP-1,
// Armour Bane (2). Roll three Artillery dice: their total is the number of shots, To Hit with the
// crew's BS and the usual modifiers. One Misfire: -1 To Hit more. Two: no shots, roll on the Black
// Powder Misfire table. Three: 30 shots at -1 more, and the gun is destroyed.
// Column of Fire: the flame template's narrow end on the front arc, pointing at the target,
// moved up to its range directly away (here: so its middle would sit over the target's centre), then an Artillery
// dice more; a Misfire, the Misfire table. Models under it are hit (S5 AP -1, Flaming Attacks: fire thrower profile).
function fireThrower (game, u, t, w) {
  const a = artDie(game, u)
  if (a === 'misfire') { say(game, 'roll', 'Column of Fire: Artillery dice MISFIRE.'); return misfire(game, u, w) }
  const to = centre(t)
  const cs = corners(u)
  const front = { x: (cs[0].x + cs[1].x) / 2, y: (cs[0].y + cs[1].y) / 2 }
  const dir = mul(sub(to, front), 1 / (dist(to, front) || 1))
  const shift = Math.min(w.range, Math.max(0, dist(to, front) - 4))
  const start = add(front, mul(dir, shift + a))
  const poly = flameTemplate(start, add(start, dir))
  game.lastShot = { kind: 'flame', poly }
  game.onShot?.({ kind: 'breath', shooter: u, from: start, to: add(start, dir), weapon: w.name, key: w.key || 'fire thrower' })
  say(game, 'roll', `Column of Fire: the flame template moved ${shift.toFixed(1)}" towards ${t.name}, then the Artillery dice ${a}" further.`)
  templateHits(game, null, 0, w.S, w.AP, { poly, except: u, label: `${w.name}: `, nonMagical: true, flaming: true })
  afterShooting(game, t, u)
}

// Whirling Doom: an Artillery dice of shots, +D3 for each rank of the target (each file, from its
// flank); a Misfire, no shots and the Misfire table. To Hit with the crew's Ballistic Skill.
function nipperHewer (game, u, t, w) {
  const a = artDie(game, u)
  if (a === 'misfire') { say(game, 'roll', 'Whirling Doom: Artillery dice MISFIRE — no shots.'); return misfire(game, u, w) }
  const flank = ['left', 'right'].includes(arcOf(t, centre(u)))
  const lines = Math.max(1, flank ? Math.min(t.files || 1, modelCount(t)) : Math.ceil(modelCount(t) / Math.max(1, t.files || 1)))
  const extra = Array.from({ length: lines }, () => Math.ceil(d6(game.rng) / 2))
  const shots = a + extra.reduce((x, y) => x + y, 0)
  const bs = machineBS(game, u)
  const vis = sightTo(game, u, t).visibleFraction
  const cover = sootCover(game, t) || itemFlag(t, 'disguise') ? 2 : hasRule(t, 'Large Target') ? 0 : vis >= 1 ? (t.status.entrenched ? 1 : 0) : vis >= 0.5 ? 1 : 2
  const long = dist(centre(u), centre(t)) > w.range / 2 ? 1 : 0
  const skirm = skirmishersPenalty(t) ? 1 : 0
  const need = Math.max(2, 7 - bs) + long + cover + skirm
  const r = rollToHit(game, shots, need)
  game.onShot?.({ kind: 'volley', shooter: u, target: t, weapon: w?.name || 'Nipper-hewer', key: w?.key || 'nipper-hewer', shots, hits: r.hits }) // (drawn by view/shotFx.js; decides nothing)
  say(game, 'roll', `Whirling Doom: Artillery dice ${a} + D3 for each of ${lines} ${flank ? 'file' : 'rank'}${lines === 1 ? '' : 's'} [${extra.join(' ')}] = ${shots} shots, crew BS${bs}${long ? ', long range -1' : ''}${cover ? `, cover -${cover}` : ''}${skirm ? ', Skirmishers -1' : ''}. ${r.text}.`)
  if (r.hits) autoHits(game, u, t, r.hits, w.S, w.AP, w, false)
  afterShooting(game, t, u)
}

// Multi Barrelled: two Artillery dice, their total the shots; one Misfire -1 To Hit; both, no
// shots and the Misfire table
function organGun (game, u, t, w) {
  const dice = [artDie(game, u), artDie(game, u)]
  const misfires = dice.filter(d => d === 'misfire').length
  if (misfires === 2) { say(game, 'roll', `Organ gun: Artillery dice [${dice.join(', ')}] — two Misfires: no shots, a critical fault.`); return misfire(game, u, w) }
  const shots = dice.filter(d => d !== 'misfire').reduce((a, b) => a + b, 0)
  const bs = machineBS(game, u)
  const vis = sightTo(game, u, t).visibleFraction
  // (Master Rune of Disguise: a war machine with it is always behind full cover)
  const cover = sootCover(game, t) || itemFlag(t, 'disguise') ? 2 : hasRule(t, 'Large Target') ? 0 : vis >= 1 ? (t.status.entrenched ? 1 : 0) : vis >= 0.5 ? 1 : 2
  const long = dist(centre(u), centre(t)) > w.range / 2 ? 1 : 0
  const skirm = skirmishersPenalty(t) ? 1 : 0
  const need = Math.max(2, 7 - bs) + long + cover + misfires + skirm
  const r = rollToHit(game, shots, need)
  game.onShot?.({ kind: 'volley', shooter: u, target: t, weapon: w?.name || 'Organ gun', key: w?.key || 'organ gun', shots, hits: r.hits }) // (drawn by view/shotFx.js; decides nothing)
  say(game, 'roll', `Organ gun: Artillery dice [${dice.join(', ')}] — ${shots} shots, crew BS${bs}${long ? ', long range -1' : ''}${cover ? `, cover -${cover}` : ''}${misfires ? ', a Misfire -1' : ''}${skirm ? ', Skirmishers -1' : ''}. ${r.text}.`)
  if (r.hits) autoHits(game, u, t, r.hits, w.S, w.AP, w, false)
  afterShooting(game, t, u)
}

function thunderclap (game, u, t, w) {
  const dice = [artDie(game, u), artDie(game, u), artDie(game, u)]
  const misfires = dice.filter(d => d === 'misfire').length
  const bs = machineBS(game, u)
  if (misfires === 2) { say(game, 'roll', `Thunderclap: Artillery dice [${dice.join(', ')}] — two Misfires: no shots, and a fault.`); return misfire(game, u, w) }
  const shots = misfires === 3 ? 30 : dice.filter(d => d !== 'misfire').reduce((a, b) => a + b, 0)
  const vis = sightTo(game, u, t).visibleFraction
  // (Master Rune of Disguise: a war machine with it is always behind full cover)
  const cover = sootCover(game, t) || itemFlag(t, 'disguise') ? 2 : hasRule(t, 'Large Target') ? 0 : vis >= 1 ? (t.status.entrenched ? 1 : 0) : vis >= 0.5 ? 1 : 2
  const long = dist(centre(u), centre(t)) > w.range / 2 ? 1 : 0
  const skirm = skirmishersPenalty(t) ? 1 : 0
  const need = Math.max(2, 7 - bs) + long + cover + (misfires ? 1 : 0) + skirm
  const r = rollToHit(game, shots, need)
  game.onShot?.({ kind: 'volley', shooter: u, target: t, weapon: w?.name || 'Thunderclap volley gun', key: w?.key || 'thunderclap volley gun', shots, hits: r.hits }) // (drawn by view/shotFx.js; decides nothing)
  say(game, 'roll', `Thunderclap: Artillery dice [${dice.join(', ')}] — ${shots} shots${misfires === 3 ? ' (three Misfires: every barrel at once!)' : ''}, crew BS${bs}${long ? ', long range -1' : ''}${cover ? `, cover -${cover}` : ''}${misfires ? ', Misfire -1' : ''}${skirm ? ', Skirmishers -1' : ''}. ${r.text}.`)
  if (r.hits) autoHits(game, u, t, r.hits, w.S, w.AP, w, false)
  afterShooting(game, t, u)
  if (misfires === 3) destroy(game, u, 'the Thunderclap blew itself apart')
}

// Master of Ballistics: an Engineer (not fleeing nor engaged) lends a friendly war
// machine in its Command range its Ballistic Skill (the Artillery dice re-roll is not in the game yet)
function machineBS (game, u) {
  const own = u.crew?.[0]?.profile?.BS ?? 3
  // (a joined Engineer counts, measured from its unit; once a turn for each Engineer)
  const tk = `${game.round}:${game.active}`
  const eng = game.units.filter(e => e.side === u.side && e.placed && !e.status.removed && hasRule(e, 'Master of Ballistics') && !e.status.fleeing && !(hostOf(game, e) || e).status.engaged && e.status.ballisticsTurn !== tk && distanceBetween(hostOf(game, e) || e, u) <= commandRange(e))
  const best = Math.max(own, ...eng.map(e => e.models[0]?.profile.BS ?? 0))
  if (best > own) { const e = eng.find(x => (x.models[0]?.profile.BS ?? 0) === best); e.status.ballisticsTurn = tk; say(game, '', `${u.name} uses ${e.name}'s Ballistic Skill ${best} (Master of Ballistics, once this turn).`) }
  return best
}

// Soulfire Cannon Misfire table — 1 Free at Last!: every unit within 3D6" suffers D6 Strength 5
// hits, AP -1, then the Soulfire Cannon is removed; 2-4 Chomp!: a handler is removed; 5-6 Blooood!: it moves 3D6" as if
// it had Random Movement (here: straight ahead, stopping short of anything in its way — a simplification).
export function soulfireCannonMisfire (game, u) {
  const r = d6(game.rng)
  if (r === 1) {
    const reach = rollDice(game.rng, 3).reduce((a, b) => a + b, 0)
    say(game, 'bad', `Soulfire Cannon Misfire table: rolled 1 — FREE AT LAST! The Unmade breaks loose: every unit within ${reach}" suffers D6 Strength 5 hits, AP -1.`)
    for (const o of onTable(game).filter(o => o !== u && distanceBetween(o, u) <= reach)) { const n = d6(game.rng); say(game, 'roll', `${o.name}: ${n} hits.`); hitUnit(game, o, n, 5, -1, 'Free at Last!') }
    destroy(game, u, 'the Unmade broke loose')
    return
  }
  if (r <= 4) {
    const h = (u.handlers || []).find(h => h.count > 0)
    if (h) h.count--
    say(game, 'bad', `Soulfire Cannon Misfire table: rolled ${r} — CHOMP! ${h ? `A handler is sucked into the furnace (${h.count} left).` : 'No handler is left to eat.'}`)
    return
  }
  const d = rollDice(game.rng, 3).reduce((a, b) => a + b, 0)
  const step = 0.25
  let moved = 0
  const was = { pos: u.pos }
  for (; moved + step <= d; moved += step) {
    const next = add(u.pos, mul(dirOf(u.facing), step))
    const prev = u.pos
    u.pos = next
    if (onImpassable(game, u) || solid(game).some(o => o !== u && polysOverlap(corners(u), corners(o), 0.02)) || !onBoard(u)) { u.pos = prev; break }
  }
  say(game, 'bad', `Soulfire Cannon Misfire table: rolled ${r} — BLOOOOD! It breaks its chains and lurches ${moved.toFixed(1)}" of 3D6 = ${d}" straight ahead.`)
  void was
}
const onBoard = u => corners(u).every(c => c.x >= 0 && c.y >= 0 && c.x <= TABLE.w && c.y <= TABLE.h)
function hitUnit (game, t, n, S, AP, source) {
  autoHits(game, null, t, n, S, AP, { name: source, armourBane: 0 }, false)
}

// Caged Fury — each Start of Turn, a Leadership test; failed, the Soulfire Cannon Misfire table
export function cagedFury (game, side) {
  for (const u of onTable(game).filter(u => u.side === side && hasRule(u, 'Caged Fury'))) {
    const ld = Math.max(u.models[0]?.profile.Ld ?? 0, ...(u.handlers || []).filter(h => h.count > 0).map(h => h.profile.Ld ?? 0))
    const t = rollDice(game.rng, 2)
    const total = t[0] + t[1]
    const ok = total === 2 || (total !== 12 && total <= ld)
    say(game, 'roll', `${u.name} — Caged Fury, Leadership test: ${t.join('+')} = ${total}, needs ${ld} or less — ${ok ? 'the Unmade is held' : 'FAILED: the Soulfire Cannon Misfire table'}.`)
    if (!ok) soulfireCannonMisfire(game, u)
  }
}
