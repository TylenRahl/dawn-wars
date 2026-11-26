// Moving units in the Remaining Moves sub-phase: forward, the six manoeuvres, marching. Exports the move planner
// (applyStep, checkMove, snapshot/restore), marching and reform helpers; used by the battle screen (ui/phases.js),
// the film replay, charges, combat, Vanguard, Whirlers, Random Movement and joining.
//
// A move is a PLAN, a list of steps, applied to a copy of the unit and checked as a whole:
//   { type: 'forward',  d }                 straight ahead d inches
//   { type: 'wheel',    angle }             radians; > 0 wheels right (pivot on the front-right
//                                           corner), < 0 wheels left (pivot on the front-left)
//   { type: 'turn',     quarters }          +1 right, -1 left, 2 about
//   { type: 'back',     d }                 straight backwards
//   { type: 'side',     d }                 > 0 to the unit's right, < 0 to its left
//   { type: 'redress',  files }             the new number of models in the front rank
//   { type: 'reform',   facing, files }     pivot about the centre and re-rank
//
// Basic Movement: up to the Movement characteristic forward, in a straight line unless manoeuvring; the slowest
//   model sets the pace.
// Manoeuvres (six of them): wheel, turn, backwards, sideways, redress, reform; one manoeuvre per move, and no
//   model goes more than twice its Movement.
// Wheel: pivot round a front corner; each model is taken to have gone as far as the outermost one. Outside a
//   charge a unit may wheel more than once, so wheels do not count against the one manoeuvre.
// Turn: 90 or 180 degrees, a quarter of M per 90 degrees.
// Move backwards / Move sideways: at half Movement.
// Redress the ranks: half M to add or take away up to five models from the front rank.
// Reform: the whole move, pivot about the centre up to 180 degrees
//   and re-rank.
// Marching: double M; only wheels while marching; cannot shoot after.
// Marching Column: a Close Order unit deeper than it is wide triples M
//   when marching, cannot charge and claims no Rank Bonus.
// Enemy Sighted: to march within 8" of a (non-fleeing) enemy, pass a
//   Leadership test first; failing it still counts as having marched.
// The 1" Rule: no unit ends its move within 1" of an enemy.
// Moving through units: no unit moves through another.
// Moving Off the Battlefield: only fleeing and pursuing units may.
// The Ends of the World: a corner may cross the edge DURING a
//   manoeuvre as long as the unit ends wholly on the table.

import { packMovement } from './beastPack.js'
import { aquatic, WATER } from './saurians.js'
import { undeadMarchProblem } from './vampires.js'
import { bombsAway, grudgeBound } from './dwarfs.js'
import { isPhalanx } from './renegade.js'
import { troopType } from './troops.js'
import { isVerdantKnight, featureHolding, placeInNature } from './ambush.js'
import { dangerousHere, TERRAIN_KINDS } from './terrain.js'
import { itemFlag } from './items.js'
import { hasSteamPower, isHalted, wallsAs } from './vehicles.js'
import { add, mul, dirOf, rightOf, rotate, normAngle } from './geometry.js'
import { corners, centre, depth, width, filesOf, ranksOf, modelCount, distanceBetween, hasRule, ruleValue, formationsOf, modelSlots } from './units.js'
import { testLeadership } from './dice.js'
import { say, onTable, onTheTable, solid } from './game.js'
import { polysOverlap } from './geometry.js'
import { leadershipTest } from './leadership.js'
import { syncJoined } from './joining.js'
import { checkVortexPath, phantasmagoriaCheck } from './spells.js'
import { inDifficult, onImpassable, onWall, touching } from './terrain.js'
import { rollDice } from './dice.js'
import { applyMultipleDamage } from './damage.js'
import { movedThroughWhirlers } from './whirlers.js'
import { hasRandomMovement } from './randomMovement.js'

// The unit's Movement characteristic: the slowest model (a mount's M carries its rider).
export function movementOf (u) {
  // a unit joined by a character moves at the slowest model's rate (Movement Characters)
  const joined = (u.joined || []).filter(c => !c.status.removed)
  if (joined.length) return Math.min(baseMovement(u), ...joined.map(baseMovement)) + (u.status?.steamBonus || 0)
  // (Steam Power: a Steam Power roll is added to its Movement for this move — vehicles.js)
  return baseMovement(u) + (u.status?.steamBonus || 0)
}
function baseMovement (u) {
  const ms = []
  // (a rolled Movement such as 3D6 is not a Movement characteristic: randomMovement.js)
  // a mount with a rolled Movement (Giant Cave Gobbler): the model has no Movement characteristic
  if (typeof u.mount?.profile?.M === 'string' && /D6/i.test(u.mount.profile.M)) return 0
  const mountM = typeof u.mount?.profile?.M === 'number' ? u.mount.profile.M : null
  if (mountM != null) ms.push(mountM)
  for (const m of u.models) if (m.wounds > 0 && typeof m.profile.M === 'number') ms.push(m.profile.M)
  if (!ms.length) return 0
  // Run with the Pack (beastPack.js): the Movement of the majority of the unit's models
  if (mountM == null && u.special?.has?.('Run with the Pack')) { const pm = packMovement(u.models); if (pm != null) return pm }
  return mountM != null ? mountM : Math.min(...ms)
}

// Close Order or Open Order, deeper than wide (Marching Column Unusual Formations)
export const isLumbering = u => /Heavy Chariot|Monstrous Creature|Behemoth/.test((u.troopType || []).join(' '))
// Phalanx: a Phalanx is in Marching Column only with fewer models a rank than a rank bonus needs
export const isMarchingColumn = u => (u.formation === 'close' || u.formation === 'open') && ranksOf(u) > filesOf(u) && !(isPhalanx(u) && filesOf(u) >= (troopType(u).rankWidth || Infinity))

export function snapshot (u) {
  return { pos: { ...u.pos }, facing: u.facing, files: u.files, formation: u.formation }
}
export function restore (u, s) { Object.assign(u, { pos: { ...s.pos }, facing: s.facing, files: s.files, formation: s.formation ?? u.formation }) }

// Apply one step to the unit (mutates it). Returns the inches it costs.
export function applyStep (u, step, M) {
  const f = dirOf(u.facing)
  switch (step.type) {
    case 'forward':
      u.pos = add(u.pos, mul(f, step.d))
      return Math.abs(step.d)
    case 'back':
      u.pos = add(u.pos, mul(f, -step.d))
      return Math.abs(step.d) * 2 // at half rate: each inch costs two
    case 'side':
      u.pos = add(u.pos, mul(rightOf(u.facing), step.d))
      return Math.abs(step.d) * 2
    case 'wheel': {
      const cs = corners(u)
      const pivot = step.angle > 0 ? cs[1] : cs[0]
      u.pos = rotate(u.pos, pivot, step.angle)
      u.facing = normAngle(u.facing + step.angle)
      return Math.abs(step.angle) * width(u)
    }
    case 'turn': {
      const c = centre(u)
      const q = step.quarters
      if (Math.abs(q) === 1) {
        // the models turn on the spot: the old ranks become the new files
        const ranks = ranksOf(u)
        u.files = Math.max(1, ranks)
      }
      u.facing = normAngle(u.facing + q * Math.PI / 2)
      u.pos = add(c, mul(dirOf(u.facing), depth(u) / 2))
      return (M / 4) * Math.abs(q)
    }
    case 'redress': {
      // up to five models added to or taken from the front rank
      const now = filesOf(u)
      u.files = Math.max(1, Math.min(modelCount(u), Math.max(now - 5, Math.min(now + 5, step.files))))
      return M / 2
    }
    case 'quickTurn': {
      // Quick Turn: Open Order, unless it marched, may pivot about its
      // centre up to 90 degrees after moving in Remaining Moves; it costs no movement
      const c = centre(u)
      u.facing = normAngle(u.facing + Math.max(-Math.PI / 2, Math.min(Math.PI / 2, step.angle)))
      u.pos = add(c, mul(dirOf(u.facing), depth(u) / 2))
      return 0
    }
    case 'free': {
      // Movement and Manoeuvre Skirmishers: each model moves freely in any
      // direction; the unit does not wheel or turn. Here the group moves to a new place and faces any
      // way; it costs the distance its centre travels.
      const c = centre(u)
      u.facing = normAngle(step.facing)
      u.pos = add(step.to, mul(dirOf(u.facing), depth(u) / 2))
      return Math.hypot(step.to.x - c.x, step.to.y - c.y)
    }
    case 'reform': {
      const c = centre(u)
      // a reform may also change formation (Formation Types)
      if (step.formation) u.formation = step.formation
      u.facing = normAngle(step.facing)
      u.files = Math.max(1, Math.min(modelCount(u), step.files ?? u.files))
      u.pos = add(c, mul(dirOf(u.facing), depth(u) / 2))
      return Infinity // the whole move; checked separately
    }
  }
  throw new Error(`unknown step ${step.type}`)
}

const isManoeuvre = s => s.type !== 'forward' && s.type !== 'wheel' && s.type !== 'quickTurn' && s.type !== 'free'

// Check a plan without making it. Returns { ok, reason, used, allowance, path }.
// `random`: true for a Random Movement unit's move in Compulsory Moves; its allowance is what it
// rolled (status.randomMove, randomMovement.js), never a number from the caller.
// `fly`: it flies: its Fly Movement, over models, units and terrain without
// penalty; it must not end on a unit, on impassable terrain or within 1" of an enemy.
// (a unit flies at the pace of its slowest flier: a joined character's Fly counts too)
// (Arch-Lightning Rod: a grounded unit cannot use Fly (X) — arcane.js)
export const flyMovement = u => { if (u.status?.grounded) return 0; const one = x => hasRule(x, 'Fly') ? Number(ruleValue(x, 'Fly')) || 0 : 0; const all = [u, ...(u.joined || []).filter(c => !c.status.removed)].map(one); return all.every(v => v > 0) ? Math.min(...all) : 0 }
export function checkMove (game, u, plan, { march = false, random = false, fly = false } = {}) {
  const flyX = fly ? flyMovement(u) : 0
  const flying = u.status.fly || flyX
  const rolled = random ? (u.status.randomMove && !u.status.randomMove.done && game.sub === 'compulsory' ? u.status.randomMove.rolled : 0) : null
  random = random ? rolled : null
  const M = random ?? movementOf(u)
  const was = snapshot(u)
  const mult = march ? (isMarchingColumn(u) ? 3 : 2) : 1
  const allowance = M * mult
  let used = 0
  // Difficult terrain: -1 Movement if any part moves through difficult terrain
  let throughDifficult = inDifficult(game, u)
  let crossedWall = false
  // Dangerous Terrain: each dangerous feature it begins in, passes through or ends in
  const dangerous = new Set(dangerousHere(game, u))
  // a unit that somehow ended up on rocks may still walk off them
  const startsOnRocks = onImpassable(game, u)
  // likewise a chariot left touching a wall may drive away from it
  const startsOnWall = onWall(game, u)
  const manoeuvres = plan.filter(isManoeuvre)
  let reason = null
  const path = []
  if (u.status.fleeing) reason = 'it is fleeing'
  else if (u.status.stupid) reason = 'it is Stupid this turn'
  else if (fly && !flyX) reason = 'it cannot fly'
  else if (u.status.whirler) reason = 'a Whirler moves only in the Compulsory Moves sub-phase'
  // Random Movement: its move is rolled in Compulsory Moves; forward and wheels only
  else if (random == null && hasRandomMovement(u)) reason = 'it moves a random distance, in the Compulsory Moves sub-phase'
  else if (random != null && (march || plan.some(s => s.type !== 'forward' && s.type !== 'wheel'))) reason = 'a Random Movement unit may only move forward and wheel'
  else if (u.status.joinedTo) reason = 'it is with a unit: move the unit, or LEAVE first'
  else if (u.status.joinedThisTurn) reason = 'a character joined it this phase, so it cannot move'
  else if (u.status.engaged) reason = 'it is engaged in combat'
  else if (u.status.moved && !u.status.reserveMoving) reason = 'it has already moved this turn'
  else if (u.status.charged || u.status.declaredCharge) reason = 'it charged this turn'
  else if (manoeuvres.length > 1) reason = 'a unit may make only one manoeuvre (other than wheels) in a move'
  else if (march && manoeuvres.length) reason = 'a marching unit may only wheel'
  else if (march && u.status.noMarchSpell) reason = 'a spell stops it marching this turn'
  // Weapon of War: war machines cannot march
  else if (march && /war machine/i.test(u.category)) reason = 'war machines cannot march'
  // Necromantic Undead: the Undead cannot march unless flying (Dark Vitality:
  // Vampires and Necromancers can) (vampires.js)
  else if (march && !(u.status.fly || flyX) && undeadMarchProblem(game, u)) reason = undeadMarchProblem(game, u)
  else if (march && u.status.noMarch) reason = 'it arrived as reinforcements this turn and cannot march'
  else if (march && hasSteamPower(u)) reason = 'an Iron Kettle cannot march: make a Steam Power roll instead'
  else if (isHalted(game, u)) reason = 'it has halted this turn (Temperamental)'
  // Manoeuvring a Lance: a Lance may not turn or redress the ranks
  // Immovable Object: once deployed, it is not moved by its crew in Remaining Moves (it may pivot)
  else if ((u.kit?.ranged || []).some(w => (w.rules || []).includes('Immovable Object')) && plan.some(s => s.type !== 'turn' && s.type !== 'quickTurn')) reason = 'it is an Immovable Object: its crew cannot move it (it may only pivot)'
  else if (u.formation === 'lance' && plan.some(s => s.type === 'turn' || s.type === 'redress')) reason = 'a Lance may not turn or redress its ranks (it may wheel, move back or sideways, or reform)'
  else if (u.status.noTurns && plan.some(s => s.type === 'turn' || s.type === 'quickTurn')) reason = 'after its free redress (Standard of the Fell Warrior) it cannot turn'
  else if (manoeuvres.some(s => s.type === 'reform') && plan.length > 1) reason = 'a reform takes the whole move'
  else if (plan.some(s => s.type === 'free') && u.formation !== 'skirmish') reason = 'only Skirmishers move freely'
  // the engine's own check that a reform's new formation is one the unit's rules allow
  else if (plan.some(s => s.type === 'reform' && s.formation && !formationsOf(u).includes(s.formation))) reason = 'its special rules do not allow that formation'
  // Lumbering: a Lumbering model (heavy chariots, monsters) may pivot up to 90 degrees once its move is done, if
  // it did not charge, march or flee that turn — the same step as a Quick Turn
  // (Hidden Pathways: the target may make a Quick Turn even if it could not otherwise)
  else if (plan.some(s => s.type === 'quickTurn') && (!(u.formation === 'open' || isLumbering(u) || u.status.hiddenPathways) || (march && !(u.formation === 'open' && hasRule(u, 'Fast Cavalry'))) || plan[plan.length - 1].type !== 'quickTurn' || plan.filter(s => s.type === 'quickTurn').length > 1)) reason = 'only an Open Order unit (Quick Turn) or a Lumbering model may pivot like this, once, at the end of its move, and not after marching (unless all Fast Cavalry)'
  if (!reason) {
    for (const s of plan) {
      // slices of about a quarter inch, so a thin wall cannot be stepped over; a Skirmisher's
      // free move is walked along the straight line its centre takes, keeping its facing until
      // the end (Moving through units: no moving through other units)
      const c0 = centre(u)
      const len0 = s.type === 'forward' || s.type === 'back' || s.type === 'side' ? Math.abs(s.d) : s.type === 'wheel' ? Math.abs(s.angle) * width(u) : s.type === 'free' ? Math.hypot(s.to.x - c0.x, s.to.y - c0.y) : 0
      const sub = len0 ? Math.max(1, Math.ceil(len0 / 0.25)) : 1
      const face0 = u.facing
      // walk the step in pieces, so passing through another unit is caught
      for (let i = 1; i <= sub; i++) {
        const part = s.type === 'forward' || s.type === 'back' || s.type === 'side'
          ? { ...s, d: s.d / sub }
          : s.type === 'wheel' ? { ...s, angle: s.angle / sub }
            : s.type === 'free' ? { ...s, to: { x: c0.x + (s.to.x - c0.x) * i / sub, y: c0.y + (s.to.y - c0.y) * i / sub }, facing: i === sub ? s.facing : face0 }
              : (i === 1 ? s : null)
        if (!part) continue
        const c = applyStep(u, part, flyX || M) // (turns and redresses cost a share of the Movement used: the Fly Movement when flying)
        used += c === Infinity ? 0 : c
        path.push(snapshot(u))
        // a flier (Shimmering Dragon, Fly) passes over units and terrain; it must end clear
        const hit = flying ? [] : blockers(game, u)
        if (hit.length) { reason = `it would move through ${hit[0].name}`; break }
        if (!flying && !startsOnRocks && onImpassable(game, u)) { reason = 'it would move through impassable terrain'; break }
        // Iron Shod Wheels: a chariot treats linear obstacles as impassable
        // (Grinding Wheels: open terrain to an Iron Kettle; Crushing Weight: dangerous to a War Wagon)
        if (!flying && /Chariot/.test((u.troopType || []).join(' ')) && !startsOnWall && onWall(game, u)) {
          if (wallsAs(u) === 'impassable') { reason = 'a chariot cannot cross a wall (Iron Shod Wheels)'; break }
          if (wallsAs(u) === 'dangerous') crossedWall = true
        }
        // (Aquatic: water features — streams and marshes here — do not slow it: saurians.js)
        if (!flying && !throughDifficult && inDifficult(game, u) && !(aquatic(u) && touching(game, u, k => k.difficult).every(f => WATER.includes(f.kind)))) throughDifficult = true
        if (!flying) for (const f of dangerousHere(game, u)) dangerous.add(f)
      }
      if (reason) break
    }
  }
  // (a rolled distance is not a Movement characteristic: difficult terrain takes nothing off it —
  // an assumption; Random Movement is silent)
  // (Move Through Cover: no Movement penalty for difficult or dangerous terrain)
  let allowed = throughDifficult && random == null && !hasRule(u, 'Move Through Cover') ? Math.max(1, M - 1) * mult : allowance
  if (u.status.fly) allowed = Math.max(allowed, u.status.fly * mult)
  if (flyX) allowed = flyX * mult
  // (ending in difficult terrain it suffers its effects: the -1 Movement does not shorten a flight already made)
  if (!reason && flying && (blockers(game, u).length || onImpassable(game, u))) reason = 'it cannot land on a unit or on impassable terrain'
  if (!reason && plan.some(s => s.type === 'reform')) used = allowed
  if (!reason && used > allowed + 1e-6) reason = `it needs ${used.toFixed(1)}" and has ${allowed}"${throughDifficult ? ' (difficult terrain: -1 Movement)' : ''}`
  if (!reason && !onTheTable(u)) reason = 'it would end off the table'
  if (!reason) {
    const close = solid(game).filter(o => o.side !== u.side && o !== u && distanceBetween(u, o) < 1 - 1e-6)
    if (close.length) reason = `it would end within 1" of ${close[0].name}`
  }
  restore(u, was)
  return { ok: !reason, reason, used, allowance: allowed, path, difficult: throughDifficult, crossedWall, dangerous: [...dangerous] }
}

function blockers (game, u) {
  const mine = corners(u)
  return solid(game).filter(o => o !== u && !runnersFor(u, o) && polysOverlap(mine, corners(o), 0.02))
}

// Chariot Runners: friendly chariots may move through friendly units in Skirmish
// formation whose models (most of them) are Chariot Runners; one ending 'on top' of them nudges them aside
// by the smallest amount possible
export const runnersFor = (u, o) => /Chariot/.test((u.troopType || []).join(' ')) && o.side === u.side && o.formation === 'skirmish' && hasRule(o, 'Chariot Runners')
function nudgeRunners (game, u) {
  for (const o of solid(game).filter(o => o !== u && runnersFor(u, o) && polysOverlap(corners(u), corners(o), 0.02))) {
    const was = { ...o.pos }
    let best = null
    // the shortest push, among sixteen directions, that leaves it clear of everything
    for (let r = 0.25; r <= 12 && !best; r += 0.25) {
      for (let k = 0; k < 16 && !best; k++) {
        const a = k * Math.PI / 8
        o.pos = { x: was.x + Math.cos(a) * r, y: was.y + Math.sin(a) * r }
        const clear = onTheTable(o) && !onImpassable(game, o) && !solid(game).some(x => x !== o && polysOverlap(corners(o), corners(x), 0.02)) && !solid(game).some(x => x.side !== o.side && distanceBetween(o, x) < 1)
        if (clear) best = { ...o.pos }
      }
    }
    o.pos = best || was
    say(game, '', best ? `${o.name} (Chariot Runners) step aside ${Math.hypot(best.x - was.x, best.y - was.y).toFixed(2)}" for ${u.name}.` : `${o.name} (Chariot Runners) find no room to step aside.`)
  }
}

// Is there a non-fleeing enemy within 8"? Then marching needs a Leadership test first.
export function enemySighted (game, u) {
  return onTable(game).some(o => o.side !== u.side && !o.status.fleeing && distanceBetween(u, o) <= 8)
}

// Ask to march: returns { allowed, roll } and marks the unit as having marched when tested.
export function tryMarch (game, u, { fly = false } = {}) {
  if (u.status.marchTested != null) return { allowed: u.status.marchTested }
  if (!enemySighted(game, u)) return { allowed: true }
  // Fly: flying, it marches within 8" of the enemy without the test
  if (fly && flyMovement(u)) { say(game, '', `${u.name} flies: it may march within 8" of the enemy without a test.`); return { allowed: true } }
  // Drilled: a Drilled unit marches within 8" of the enemy without the test
  if (hasRule(u, 'Drilled')) { say(game, '', `${u.name} is Drilled: it may march within 8" of the enemy without a test.`); return { allowed: true } }
  const t = leadershipTest(game, u, { label: `${u.name} — Enemy Sighted (within 8"): Leadership test to march`, kind: 'march' })
  say(game, 'roll', t.text + (t.passed ? ', it may march.' : ', it may not march (and counts as having marched).'))
  u.status.marchTested = t.passed
  if (!t.passed) u.status.marched = true
  return { allowed: t.passed, roll: t }
}

// Standard of the Fell Warrior: single use, in Remaining Moves, a free redress the ranks
// immediately before moving; then it moves as normal but cannot turn or make a quick turn
export const canFellRedress = (game, u) => game.sub === 'remaining' && u.side === game.active && !u.status.moved && !u.status.engaged && !u.status.fleeing && itemFlag(u, 'fellWarrior') && !u.status.fellUsed
export function fellRedress (game, u, files) {
  if (!canFellRedress(game, u)) return { ok: false, reason: 'it cannot use the Standard of the Fell Warrior now' }
  const was = snapshot(u)
  applyStep(u, { type: 'redress', files }, movementOf(u))
  if (!onTheTable(u) || blockers(game, u).length || onImpassable(game, u)) { restore(u, was); return { ok: false, reason: 'there is no room to redress like that' } }
  u.status.fellUsed = true
  u.status.noTurns = true
  say(game, '', `${u.name} redresses its ranks to ${files} wide for free (Standard of the Fell Warrior); it cannot turn this move.`)
  return { ok: true }
}

// Rallied units: a unit that rallies may reform at once for free, and still moves as normal afterwards
export const canFreeReform = (game, u) => game.sub === 'rally' && u.status.rallyTurn === `${game.round}:${game.active}` && !u.status.freeReformed && !u.status.fleeing && !u.status.engaged
export function freeReform (game, u, step) {
  if (!canFreeReform(game, u)) return { ok: false, reason: 'only a unit that has just rallied makes a free reform' }
  const chk = checkMove(game, u, [step])
  if (!chk.ok) return chk
  applyStep(u, step, movementOf(u))
  u.status.freeReformed = true
  syncJoined(game)
  say(game, '', `${u.name} makes its free reform on rallying: ${step.files} wide.`)
  return { ok: true }
}

// Dangerous Terrain: a D6 for each model, a 1 loses a single Wound (a chariot, D3:
// Iron Shod Wheels); Move Through Cover re-rolls the 1s (dangerousDice)
// `path`: the positions it went through ({ pos, facing }): only the models whose bases touched the feature at one of
// them test (all of them when no path is known)
export function dangerousTerrainTests (game, u, f, path = null) {
  let n = modelCount(u)
  if (path?.length) {
    const was = { pos: u.pos, facing: u.facing }
    const hit = new Set()
    for (const sn of [...path, was]) {
      u.pos = sn.pos; u.facing = sn.facing
      modelSlots(u).forEach((sl, i) => { const hw = u.base.w / 2; const hd = u.base.d / 2; const fv = dirOf(u.facing); const r = rightOf(u.facing); const sq = [add(add(sl.at, mul(r, -hw)), mul(fv, hd)), add(add(sl.at, mul(r, hw)), mul(fv, hd)), add(add(sl.at, mul(r, hw)), mul(fv, -hd)), add(add(sl.at, mul(r, -hw)), mul(fv, -hd))]; if (polysOverlap(sq, f.poly, 0.01)) hit.add(i) })
    }
    u.pos = was.pos; u.facing = was.facing
    n = Math.min(n, hit.size || 1)
  }
  const dice = dangerousDice(game, u, n)
  const ones = dice.filter(d => d === 1).length
  say(game, 'roll', `${u.name} in dangerous terrain (${TERRAIN_KINDS[f.kind]?.name || f.kind}): Dangerous Terrain tests [${dice.join(' ')}] — ${ones} model${ones === 1 ? '' : 's'} lose${ones === 1 ? 's' : ''} a Wound.`)
  if (!ones) return
  if (/Chariot/.test((u.troopType || []).join(' '))) { for (let i = 0; i < ones && !u.status.removed; i++) applyMultipleDamage(game, u, [Math.ceil(rollDice(game.rng, 1)[0] / 2)], 'dangerous terrain (Iron Shod Wheels)') } else applyMultipleDamage(game, u, Array(ones).fill(1), 'dangerous terrain')
}

// Reserve Move: a unit most of whose models have the rule, and which did not charge, march or flee in the Movement
// phase, may make a Reserve move once the Shooting phase ends — a normal move, no march
export const canReserveMove = (game, u) => game.sub === 'shoot' && u.side === game.active && hasRule(u, 'Reserve Move') && !u.status.charged && !u.status.declaredCharge && !u.status.marched && !u.status.fled && !u.status.fleeing && !u.status.engaged && !u.status.reserveMoved && u.placed
export function reserveMove (game, u, plan) {
  if (!canReserveMove(game, u)) return { ok: false, reason: 'it cannot make a Reserve move now' }
  u.status.reserveMoving = true
  try {
    const r = makeMove(game, u, plan)
    if (r.ok) { u.status.reserveMoved = true; say(game, '', `(that was ${u.name}'s Reserve move)`) }
    return r
  } finally { u.status.reserveMoving = false }
}

// Guardian of the Sacred Sites: instead of moving in Remaining Moves, the Verdant Knight, wholly
// within a natural feature and not engaged, may be put wholly within a different one anywhere; he moves no more
export const canGreenStep = (game, u) => game.sub === 'remaining' && u.side === game.active && isVerdantKnight(u) && u.placed && !u.status.moved && !u.status.engaged && !!featureHolding(game, u)
export function greenStep (game, u, p) {
  if (!canGreenStep(game, u)) return { ok: false, reason: 'he must stand wholly within a natural feature, not engaged, and not have moved' }
  const r = placeInNature(game, u, p, featureHolding(game, u))
  if (!r.ok) return r
  u.status.moved = true
  u.status.entrenched = false // (Entrenchment: moved, no longer Entrenched)
  say(game, 'good', `${u.name} vanishes and reappears in another ${r.feature.kind}.`)
  return r
}

// Make a checked move.
// Move Through Cover: 1s on Dangerous Terrain tests are re-rolled
function dangerousDice (game, u, n) {
  let dice = rollDice(game.rng, n)
  // (Moonsilver Armour Moonsilver Barding: natural 1s re-rolled too)
  if ((hasRule(u, 'Move Through Cover') || hasRule(u, 'Moonsilver Armour') || hasRule(u, 'Moonsilver Barding')) && dice.includes(1)) { const again = rollDice(game.rng, dice.filter(d => d === 1).length); let j = 0; dice = dice.map(d => d === 1 ? again[j++] : d) }
  return dice
}
export function kerSplat (game, u) {
  const dice = dangerousDice(game, u, modelCount(u))
  const ones = dice.filter(d => d === 1).length
  say(game, 'roll', `${u.name} bounded through difficult terrain (Ker-splat: dangerous): Dangerous Terrain tests [${dice.join(' ')}] — ${ones} Wound${ones === 1 ? '' : 's'} lost.`)
  if (ones) applyMultipleDamage(game, u, Array(ones).fill(1), 'Ker-splat')
}

export function makeMove (game, u, plan, { march = false, random = false, fly = false } = {}) {
  // The Grudgestone: once it is set, no moving but to reform (dwarfs.js)
  if (grudgeBound(u) && plan.some(s => s.type !== 'reform')) return { ok: false, reason: `the Grudgestone is set: ${u.name} only reforms` }
  const chk = checkMove(game, u, plan, { march, random, fly })
  if (!chk.ok) return chk
  const M = random ? u.status.randomMove.rolled : movementOf(u)
  for (const s of plan) applyStep(u, s, M)
  nudgeRunners(game, u)
  u.status.moved = true
  u.status.entrenched = false // (Entrenchment: moved, no longer Entrenched)
  if (random && u.status.randomMove) u.status.randomMove.done = true
  if (march) u.status.marched = true
  if (plan.some(s => s.type === 'reform')) u.status.reformed = true
  const desc = plan.map(s => s.type === 'forward' ? `forward ${s.d.toFixed(1)}"` : s.type === 'wheel' ? `wheel ${s.angle > 0 ? 'right' : 'left'} ${Math.round(Math.abs(s.angle) * 180 / Math.PI)}°`
    : s.type === 'turn' ? `turn ${s.quarters === 2 ? 'about' : s.quarters > 0 ? 'right' : 'left'}` : s.type === 'back' ? `back ${s.d.toFixed(1)}"` : s.type === 'side' ? `sideways ${Math.abs(s.d).toFixed(1)}" ${s.d > 0 ? 'right' : 'left'}`
      : s.type === 'redress' ? `redress to ${s.files} wide` : `reform ${s.files} wide`).join(', ')
  say(game, '', `${u.name} ${march ? 'marches' : 'moves'}: ${desc} — ${chk.used.toFixed(1)}" of ${chk.allowance}".`)
  syncJoined(game)
  checkVortexPath(game, u, chk.path)
  movedThroughWhirlers(game, u, chk.path, restore)
  phantasmagoriaCheck(game, u)
  if (u.status.removed) return chk // a Whirler or a vortex may have finished it
  // Dive Bomb, Bombing Run (dwarfs.js)
  if (fly) bombsAway(game, u, chk.path)
  // Iron Shod Wheels: difficult terrain is dangerous for a chariot, and a
  // 1 on its Dangerous Terrain test loses D3 Wounds
  if ((chk.difficult || chk.crossedWall) && /Chariot/.test((u.troopType || []).join(' '))) {
    const dice = dangerousDice(game, u, modelCount(u))
    const ones = dice.filter(d => d === 1).length
    say(game, 'roll', `${u.name} drove through difficult terrain (Iron Shod Wheels: dangerous): Dangerous Terrain tests [${dice.join(' ')}] — ${ones} chariot${ones === 1 ? '' : 's'} damaged.`)
    for (let i = 0; i < ones && !u.status.removed; i++) { const w = Math.ceil(rollDice(game.rng, 1)[0] / 2); applyMultipleDamage(game, u, [w], 'Iron Shod Wheels') }
  }
  // Ker Splat: difficult terrain is dangerous terrain to a Wrecker Gobbler;
  // Dangerous Terrain: a D6 per model, a 1 loses a single Wound
  if (chk.difficult && hasRule(u, 'Ker-splat')) kerSplat(game, u)
  for (const f of chk.dangerous || []) if (!u.status.removed) dangerousTerrainTests(game, u, f, [{ pos: chk.path[0]?.pos || u.pos, facing: chk.path[0]?.facing ?? u.facing }, ...chk.path])
  return chk
}

// A pursuer that left the table comes back in its controlling player's Compulsory Moves sub-phase
// as reinforcements: rear arc against the table edge, as near as it can to where it left, facing
// the centre of the table; it cannot march and counts as having moved.
// Pursuit Off the Battlefield, Reinforcements
export function returnFromPursuit (game, u) {
  const off = u.status.offTable
  if (!off) return false
  const edges = [
    { d: off.pos.y, facing: Math.PI / 2, at: x => ({ x, y: 0 }) },
    { d: 48 - off.pos.y, facing: -Math.PI / 2, at: x => ({ x, y: 48 }) },
    { d: off.pos.x, facing: 0, at: y => ({ x: 0, y }) },
    { d: 72 - off.pos.x, facing: Math.PI, at: y => ({ x: 72, y }) }
  ].sort((a, b) => a.d - b.d)
  const e = edges[0]
  u.facing = e.facing
  const along = Math.abs(Math.sin(e.facing)) > 0.5 ? off.pos.x : off.pos.y
  const back = e.at(along)
  u.pos = add(back, mul(dirOf(u.facing), depth(u)))
  // keep it on the table along the edge
  for (let i = 0; i < 80 && !onTheTable(u); i++) u.pos = add(u.pos, mul(rightOf(u.facing), (Math.abs(Math.sin(e.facing)) > 0.5 ? (off.pos.x > 36 ? -1 : 1) : (off.pos.y > 24 ? -1 : 1)) * 0.5 * (e.facing === Math.PI / 2 || e.facing === 0 ? 1 : -1)))
  // not onto rocks or another unit: slide along the edge until clear
  for (let i = 0; i < 140 && (onImpassable(game, u) || blockers(game, u).length); i++) u.pos = add(u.pos, mul(rightOf(u.facing), i % 2 ? i * 0.5 : -i * 0.5))
  u.placed = true
  u.status.offTable = null
  u.status.countsAsMoved = true
  u.status.marched = false
  u.status.noMarch = true
  say(game, '', `${u.name} returns to the table at the edge where it pursued off.`)
  return true
}
