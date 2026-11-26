// The game state and its set-up: createGame builds it (sides, units, terrain, dice, log); deployment, reserves,
// the roll-offs and the log helpers (say) are here too. Pure JavaScript, no rendering: the screens in ui/ and the
// board in view/ read `game` and call these functions, and nearly every rules module writes to the log.
// Every resolution writes to game.log what was rolled and what was needed, so the player can follow the
// arithmetic without seeing the dice.

import { markHierophants } from './tombkings.js'
import { placeHornstone } from './hornkin.js'
import { entrench } from './dwarfs.js'
import { setCurrentGame } from './lyonne.js'
import { misbehavingMercenaries } from './mercenaries.js'
import { createRng } from './dice.js'
import { fieldUnit, corners, isDead, distanceBetween, hasRule as hasRuleU } from './units.js'
import { equip } from './damage.js'
import { join } from './joining.js'
import { generateTerrain, TERRAIN_KINDS, onImpassable, generateMoreTerrain } from './terrain.js'
import { wizardLevel, generateSpells, loreSpells } from './magic.js'
import { covenSpell } from './woodelves.js'
import { covenOfDoom } from './darkelves.js'
import { generatePloys } from './ploys.js'
import { polysOverlap, pointInPoly } from './geometry.js'
import { MAPS, mapTerrain } from './maps.js'

// The battlefield: a 6' x 4' table, the usual size.
export const TABLE = { w: 72, h: 48 }

export const PHASES = ['strategy', 'movement', 'shooting', 'combat']
export const PHASE_NAMES = { deploy: 'Deployment', strategy: 'Strategy', movement: 'Movement', shooting: 'Shooting', combat: 'Combat', over: 'Battle over' }

export function createGame ({ lists, seed = 1, rounds = 6, terrain = true, map = null, channelling = false, arcane = false }) {
  const rng = createRng(seed)
  const game = {
    seed,
    rng,
    rounds,
    round: 0,
    active: 0,
    first: 0,
    phase: 'deploy',
    sub: null,
    sides: lists.map((l, i) => ({ index: i, name: l.name, army: l.army, colour: i === 0 ? 'blue' : 'red' })),
    units: [],
    log: [],
    prompt: null,
    listeners: new Set(),
    deploy: { turn: 0, zoneDepth: 12, group: null, finishedFirst: null },
    // the optional Eight Threads rules in use (Utilising the Eight Threads)
    options: { channelling, arcane }
  }
  setCurrentGame(game)
  // (the Verdant Knight slumbers: he is not deployed — ambush.js)
  const greenSleeps = () => { for (const u of game.units) if (u.special.has('Guardian of the Sacred Sites') && !u.placed && !u.reserve) { u.reserve = true; say(game, '', `${u.name} slumbers: he will awaken during the battle.`) } }
  lists.forEach((l, side) => {
    const byKey = {}
    // (a Hornstone is a terrain feature, not a unit: placed with the terrain below — hornkin.js)
    for (const sel of l.units) { if (sel.entryId === 'hornstone') { game.hornstoneSides = [...(game.hornstoneSides || []), side]; continue } const u = fieldUnit(l.army, sel, side); equip(u); game.units.push(u); if (sel.key) byKey[sel.key] = u; u._detachmentOf = sel.detachmentOf || null }
    // a detachment knows its regimental unit, and the regiment its detachments (regiments.js)
    for (const u of game.units.filter(x => x.side === side && x._detachmentOf)) {
      const reg = byKey[u._detachmentOf]
      if (reg) { u.regiment = reg; reg.detachments = [...(reg.detachments || []), u]; u.name = `${u.name} (detachment)` }
      delete u._detachmentOf
    }
  })
  say(game, 'h', `A new battle: ${game.sides[0].name} (blue, the near edge) against ${game.sides[1].name} (red, the far edge). Seed ${seed}.${channelling ? ' Eight Threads: Channelling.' : ''}${arcane ? ' Eight Threads: Arcane Magic.' : ''}`)
  // the battlefield is set up before spells and deployment (terrain.js)
  // (a named map, maps.js: its features in place of the random ones; the seed still makes every roll)
  const mapped = map ? mapTerrain(map) : null
  game.map = mapped ? map : null
  game.terrain = mapped || (terrain ? generateTerrain(rng, TABLE) : [])
  if (terrain && !mapped) game.terrain.push(...generateMoreTerrain(createRng((seed ^ 0x5eed5) >>> 0), game.terrain, TABLE))
  for (const side of game.hornstoneSides || []) placeHornstone(game, side, TABLE, polysOverlap)
  if (game.terrain.length) say(game, '', `The battlefield: ${game.terrain.map(f => TERRAIN_KINDS[f.kind].name).join(', ')} (${mapped ? `the map ${MAPS[map].name}` : 'placed at random from the seed'}).`)
  // Misbehaving Mercenaries are rolled before deployment (mercenaries.js)
  misbehavingMercenaries(game)
  greenSleeps()
  // Spells and Spell Generation Magic: spells are generated before deployment
  for (const u of game.units) if (wizardLevel(u)) generateSpells(game, u)
  // Shadewood Coven: Sisters of the Bramble know one spell, chosen at random (woodelves.js)
  for (const u of game.units) if (u.special?.has('Shadewood Coven')) covenSpell(game, u, loreSpells)
  // Cursed Coven: the Hexfire Warlocks' spell (darkelves.js)
  for (const u of game.units) if (u.special?.has('Cursed Coven')) covenOfDoom(game, u, loreSpells)
  // The Hierophant (tombkings.js)
  markHierophants(game, wizardLevel)
  // Mastering Arcane Magic: the ploys are generated after the spells
  if (arcane) generatePloys(game)
  return game
}

// ---- the log ----
export function say (game, kind, text) {
  game.log.push({ kind, text })
  for (const fn of game.listeners) fn({ kind, text })
}
export const sideName = (game, s) => `${game.sides[s].name} (${game.sides[s].colour})`
export const unitById = (game, id) => game.units.find(u => u.id === id)
export const unitsOf = (game, side) => game.units.filter(u => u.side === side && !isDead(u) && !u.status.removed)
export const enemiesOf = (game, side) => unitsOf(game, 1 - side)
// joined characters (joining.js) are inside their units: not separate targets or obstacles
export const onTable = game => game.units.filter(u => u.placed && !isDead(u) && !u.status.removed && !u.status.joinedTo)
// Units that block movement and keep others 1" away: everything on the table but Whirlers, which
// other units may move through and which ignore the 1" rule (Release the Whirlers!)
export const solid = game => onTable(game).filter(u => !u.status.whirler)

// ---- deployment ----
// The deployment zones: each army deploys within its own
// zone, the long table edge to `zoneDepth` inches in (12" in the standard battle, so the armies
// start 24" apart), placing one unit at a time, alternately.
export function deployZone (game, side) {
  const d = game.deploy.zoneDepth
  return side === 0
    ? [{ x: 0, y: TABLE.h - d }, { x: TABLE.w, y: TABLE.h - d }, { x: TABLE.w, y: TABLE.h }, { x: 0, y: TABLE.h }]
    : [{ x: 0, y: 0 }, { x: TABLE.w, y: 0 }, { x: TABLE.w, y: d }, { x: 0, y: d }]
}

export function inZone (game, unit) {
  const z = deployZone(game, unit.side)
  return corners(unit).every(c => c.x >= z[0].x - 1e-6 && c.x <= z[1].x + 1e-6 && c.y >= Math.min(z[0].y, z[2].y) - 1e-6 && c.y <= Math.max(z[0].y, z[2].y) + 1e-6)
}

export function onTheTable (unit) {
  return corners(unit).every(c => c.x >= -1e-6 && c.x <= TABLE.w + 1e-6 && c.y >= -1e-6 && c.y <= TABLE.h + 1e-6)
}

// Would `unit`, standing where it stands now, overlap any other unit on the table?
export function overlapping (game, unit) {
  const mine = corners(unit)
  return solid(game).filter(o => o !== unit && polysOverlap(mine, corners(o)))
}

// Alternating Units: the players take turns to set up one unit each (not characters, which go
// down last). All of an army's war machines are deployed
// at the same time (one turn), and all of its characters last, at the same time.
const isCharacter = u => (u.troopType || []).includes('Character')
const isMachine = u => /war machine/i.test(u.category)
// Scouts: Scouts may wait until every other unit on both sides is down, then deploy anywhere more than
// 12" from an enemy model (then no charge in their first turn); with Scouts on both sides a roll-off says who
// places the first, and the players alternate. (A character with the rule — a Trailblazer's Hauberk — too.)
const isScout = u => hasRuleU(u, 'Scouts')
const pending = u => !u.placed && !u.status.removed && !u.reserve
const normalLeft = game => game.units.some(u => pending(u) && !isScout(u))
export const scoutStage = game => !normalLeft(game) && game.units.some(u => pending(u) && isScout(u))
export function deployable (game, side) {
  const left = game.units.filter(u => u.side === side && pending(u) && (scoutStage(game) || !isScout(u)))
  if (scoutStage(game)) return left
  const g = game.deploy.group
  if (g && g.side === side) return left.filter(u => g.kind === 'machines' ? isMachine(u) : g.kind === 'regiment' ? u.regiment?.id === g.id : isCharacter(u))
  // Regimental Deployment: detachments go down with their regiment
  const others = left.filter(u => !isCharacter(u) && !u.regiment)
  return others.length ? others : left
}
export function whoDeploys (game) {
  if (scoutStage(game)) {
    const has = s => game.units.some(u => u.side === s && pending(u) && isScout(u))
    if (game.deploy.scoutTurn == null) game.deploy.scoutTurn = has(0) && has(1) ? rollOff(game, 'to deploy Scouts first') : has(0) ? 0 : 1
    const t = game.deploy.scoutTurn
    return has(t) ? t : has(1 - t) ? 1 - t : null
  }
  const g = game.deploy.group
  if (g && deployable(game, g.side).length) return g.side
  const left = s => game.units.some(u => u.side === s && pending(u) && !isScout(u))
  const d = game.deploy.turn
  if (left(d)) return d
  if (left(1 - d)) return 1 - d
  return null
}

// Put a unit down at pos/facing with `files` models in its front rank — or, for a character,
// `joinHost`: deploy it with that friendly unit (Characters and units).
// `dry`: only say whether it could go there (the deployment ghost's colour), and put nothing down
export function deployUnit (game, unit, { pos, facing, files, joinHost = null, dry = false }) {
  if (game.phase !== 'deploy') return { ok: false, reason: 'the battle has started' }
  const turn = whoDeploys(game)
  if (joinHost) {
    if (unit.side !== turn) return { ok: false, reason: `it is ${sideName(game, turn)}'s turn to deploy` }
    if (!joinHost.placed) return { ok: false, reason: `${joinHost.name} is not on the table yet` }
    if (!unit.placed && !deployable(game, turn).includes(unit)) return { ok: false, reason: 'characters are deployed last' }
    // (a dry run cannot try a join without making it: it says only that nothing above forbids it)
    if (dry) return { ok: true }
    const wasPlaced = unit.placed
    const r = join(game, unit, joinHost, { deploying: true })
    if (!r.ok) return r
    unit.placed = true
    if (!wasPlaced) afterPlacing(game, unit)
    return { ok: true }
  }
  if (unit.side !== turn) return { ok: false, reason: `it is ${sideName(game, turn)}'s turn to deploy` }
  if (!unit.placed && !deployable(game, turn).includes(unit)) return { ok: false, reason: game.deploy.group ? `finish placing your ${game.deploy.group.kind === 'machines' ? 'war machines' : game.deploy.group.kind === 'regiment' ? 'detachments' : 'characters'} first` : unit.regiment ? `a detachment is deployed with ${unit.regiment.name}` : 'characters are deployed last' }
  const was = { pos: unit.pos, facing: unit.facing, files: unit.files, placed: unit.placed }
  // (whether this is the Scouts' turn, judged before this unit is put down: it may be the last of them)
  const stage = scoutStage(game) || (was.placed && isScout(unit) && !normalLeft(game))
  Object.assign(unit, { pos, facing, files: files ?? unit.files, placed: true })
  let reason = null
  let scouting = false
  // (the checks look at the unit set down; should one throw, it must not stay half-placed)
  try {
    // Scouts: anywhere on the battlefield more than 12" from an enemy model
    scouting = isScout(unit) && stage && !inZone(game, unit)
    const tooNear = scouting ? onTable(game).find(o => o.side !== unit.side && o !== unit && distanceBetween(unit, o) <= 12) : null
    if (scouting && !onTheTable(unit)) reason = 'it is not wholly on the battlefield'
    else if (scouting && tooNear) reason = `Scouts deploy more than 12" from the enemy: ${tooNear.name} is ${distanceBetween(unit, tooNear).toFixed(1)}" away`
    else if (!scouting && !inZone(game, unit)) reason = isScout(unit) && !stage ? 'it is not wholly inside your deployment zone (Scouts deploy after every other unit: anywhere more than 12" from the enemy)' : 'it is not wholly inside your deployment zone'
    else if (overlapping(game, unit).length) reason = `it would stand on ${overlapping(game, unit)[0].name}`
    else if (onImpassable(game, unit)) reason = 'it would stand on impassable rocks'
    else if (unit.regiment?.placed && distanceBetween(unit, unit.regiment) > 3 + 1e-6) reason = `a detachment must be deployed within 3" of ${unit.regiment.name} (Regimental Deployment)`
  } catch (e) { Object.assign(unit, was); throw e }
  if (reason || dry) { Object.assign(unit, was); return reason ? { ok: false, reason } : { ok: true } }
  unit.status.scouted = scouting
  say(game, '', `${sideName(game, unit.side)} deploys ${unit.name}${scouting ? ' as Scouts (no charge in its first turn)' : ''}.`)
  if (!was.placed) afterPlacing(game, unit)
  return { ok: true }
}

// Ambushers: held in reserve rather than deployed (ambush.js); it takes the place of
// deploying it, so the turn to deploy passes as if it had been put down
export function holdInReserve (game, unit) {
  if (game.phase !== 'deploy') return { ok: false, reason: 'the battle has started' }
  const turn = whoDeploys(game)
  if (unit.side !== turn) return { ok: false, reason: `it is ${sideName(game, turn)}'s turn to deploy` }
  if (!hasRuleU(unit, 'Ambushers') || unit.placed || !deployable(game, turn).includes(unit)) return { ok: false, reason: `${unit.name} cannot be held in reserve now` }
  unit.reserve = true
  say(game, '', `${sideName(game, unit.side)} holds ${unit.name} in reserve (Ambushers).`)
  afterPlacing(game, unit)
  return { ok: true }
}

function afterPlacing (game, unit) {
  if (isScout(unit) && !normalLeft(game)) {
    game.deploy.scoutTurn = 1 - unit.side
    if (whoDeploys(game) == null) say(game, 'h', 'Both armies are deployed. Press START BATTLE.')
    return
  }
  // a group (all the war machines, or all the characters) is one turn of deployment
    if ((unit.detachments || []).some(d => !d.placed && !d.status.removed)) game.deploy.group = { side: unit.side, kind: 'regiment', id: unit.id }
    else if (isMachine(unit) || (isCharacter(unit) && !game.units.some(u => u.side === unit.side && !u.placed && !u.reserve && !isCharacter(u)))) {
      game.deploy.group = { side: unit.side, kind: isMachine(unit) ? 'machines' : 'characters' }
    }
    const g = game.deploy.group
    const groupLeft = g && g.side === unit.side && game.units.some(u => u.side === unit.side && !u.placed && !u.reserve && (g.kind === 'machines' ? isMachine(u) : g.kind === 'regiment' ? u.regiment?.id === g.id : isCharacter(u)))
    if (!groupLeft) {
      game.deploy.group = null
      game.deploy.turn = 1 - unit.side
      if (!game.units.some(u => u.side === unit.side && !u.placed && !u.reserve) && game.deploy.finishedFirst == null) game.deploy.finishedFirst = unit.side
  }
  if (whoDeploys(game) == null) say(game, 'h', 'Both armies are deployed. Press START BATTLE.')
}

// A roll-off: both roll a D6, re-rolling ties. `bonus` adds to one side's roll.
export function rollOff (game, what, bonus = null) {
  let a; let b
  do {
    a = 1 + Math.floor(game.rng() * 6); b = 1 + Math.floor(game.rng() * 6)
  } while (a + (bonus === 0 ? 1 : 0) === b + (bonus === 1 ? 1 : 0))
  const ta = a + (bonus === 0 ? 1 : 0); const tb = b + (bonus === 1 ? 1 : 0)
  const winner = ta > tb ? 0 : 1
  say(game, 'roll', `Roll-off ${what}: ${game.sides[0].name} ${a}${bonus === 0 ? '+1' : ''}, ${game.sides[1].name} ${b}${bonus === 1 ? '+1' : ''} — ${game.sides[winner].name} wins.`)
  return winner
}

// Open Battle (and every pitched battle): once both armies are down, roll off and the winner goes first; the
// player who finished deploying first adds 1 to the roll.
export function rollForFirstTurn (game) {
  return rollOff(game, 'for the first turn' + (game.deploy.finishedFirst != null ? ` (+1 to ${game.sides[game.deploy.finishedFirst].name}, who finished deploying first)` : ''), game.deploy.finishedFirst)
}

// Strategic Mastery: Konrad von Falkenrode's player may apply +1 or -1 to their roll
// for the first turn. The roll in two steps so that player can see the dice first (ui/battle.js):
// firstTurnDice, then firstTurnWinner with the modifiers chosen (null: a tie, roll again).
export const strategist = (game, side) => game.units.some(u => u.side === side && !u.status.removed && !isDead(u) && hasRuleU(u, 'Strategic Mastery'))
export function firstTurnDice (game) {
  return { a: 1 + Math.floor(game.rng() * 6), b: 1 + Math.floor(game.rng() * 6) }
}
// `arrow`: +1 to a side whose opponent fired the Arrow of Talorn (woodelves.js)
export function firstTurnWinner (game, { a, b }, mods = [0, 0], arrow = [0, 0]) {
  const f = game.deploy.finishedFirst
  const ta = a + (f === 0 ? 1 : 0) + mods[0] + arrow[0]; const tb = b + (f === 1 ? 1 : 0) + mods[1] + arrow[1]
  const part = (s, d, t) => `${game.sides[s].name} ${d}${f === s ? '+1' : ''}${mods[s] ? (mods[s] > 0 ? '+1' : '-1') + ' (Strategic Mastery)' : ''}${arrow[s] ? ` +${arrow[s]} (the Arrow of Talorn)` : ''}${t !== d ? ` = ${t}` : ''}`
  const w = ta === tb ? null : ta > tb ? 0 : 1
  say(game, 'roll', `Roll-off for the first turn${f != null ? ` (+1 to ${game.sides[f].name}, who finished deploying first)` : ''}: ${part(0, a, ta)}, ${part(1, b, tb)} — ${w == null ? 'a tie, roll again' : game.sides[w].name + ' wins'}.`)
  return w
}

export function startBattle (game, firstSide) {
  game.first = firstSide
  game.active = firstSide
  game.round = 1
  game.phase = 'strategy'
  game.sub = 'start'
  // (Ambushers held in reserve stay off the table until they arrive: ambush.js)
  for (const u of game.units) if (!u.placed && !u.reserve) u.status.removed = true
  // Entrenchment, Prepared Positions: the Engineers' war machines dig in (dwarfs.js)
  for (const side of [0, 1]) entrench(game, side)
  say(game, 'h', `ROUND 1 — ${sideName(game, firstSide)} takes the first turn.`)
}
