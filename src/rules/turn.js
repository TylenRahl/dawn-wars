// The turn sequence: four phases a turn (Strategy, Movement, Shooting, Combat), each split into sub-phases, two
// turns a round; most games last six rounds. Exports the sub-phase lists and names, beginTurn and nextStep, which
// the battle screen (ui/phases.js) calls to move the game on.

import { fallenPending, crumble, hungerFeeds } from './vampires.js'
import { leadershipTest } from './leadership.js'
import { applyWounds } from './damage.js'
import { hornEnds } from './woodelves.js'
import { say, sideName, unitsOf } from './game.js'
import { endEffects } from './spells.js'
import { newTurnForWizards } from './magic.js'

export const SUBPHASES = {
  // The Strategy Phase Sequence
  strategy: ['start', 'command', 'conjuration', 'rally'],
  // The Movement phase: declare charges & reactions, charge moves, compulsory moves, remaining moves
  movement: ['charges', 'chargeMoves', 'compulsory', 'remaining'],
  // The Shooting phase
  shooting: ['shoot'],
  // The Combat phase
  combat: ['fight']
}
export const SUB_NAMES = {
  start: 'Start of turn',
  command: 'Command',
  conjuration: 'Conjuration',
  rally: 'Rally fleeing troops',
  charges: 'Declare charges',
  chargeMoves: 'Charge moves',
  compulsory: 'Compulsory moves',
  remaining: 'Remaining moves',
  shoot: 'Shoot',
  fight: 'Choose & fight combats'
}

const ORDER = ['strategy', 'movement', 'shooting', 'combat']

export function setSub (game, phase, sub) {
  const newPhase = game.phase !== phase
  game.phase = phase
  game.sub = sub
  game.subName = SUB_NAMES[sub]
  if (newPhase) {
    // one Panic test a phase (No Need for Hysterics Psychology), one
    // flee move a phase, and heavy casualties are counted from the start of the phase
    for (const u of game.units) {
      u.status.panicTested = false
      u.status.fledThisPhase = false
      u.status.foughtThisPhase = false
      u.status.phaseStartCount = u.models.filter(m => m.wounds > 0).length
    }
  }
}

// Clear the per-turn marks on the active player's units at the start of their turn.
export function beginTurn (game) {
  // (Horn of the Wild Hunt: its Frenzy lasts until the end of the turn it was sounded — woodelves.js)
  hornEnds(game)
  endEffects(game, 'startOfTurn', game.active)
  newTurnForWizards(game)
  for (const u of unitsOf(game, game.active)) {
    Object.assign(u.status, { charged: false, chargeFailed: false, moved: false, marched: false, reformed: false, shot: false, rallied: false, countsAsMoved: false, marchTested: null, steppedForward: false, fled: false, declaredCharge: null, fearTested: false, disordered: false, rallyCried: false, noMarch: false, joinedThisTurn: false, randomMove: null, steamBonus: 0, noTurns: false, freeReformed: false, reserveMoved: false, reserveMoving: false })
  }
  for (const u of game.units) {
    // Battleaxe of the Last Big Big Ruck: its Extra Attacks are gone after the Combat phase a 6 was rolled
    if (u.status.extraAttacksLostAfterPhase) u.status.extraAttacksLost = true
    u.status.terrorTested = false
    u.status.mustFlee = false
    u.status.counterCharged = false
  }
  for (const u of unitsOf(game, 1 - game.active)) {
    Object.assign(u.status, { stoodAndShot: false, reaction: null })
  }
  setSub(game, 'strategy', 'start')
}

// The next sub-phase, phase, turn or round. Returns what it moved to.
export function nextStep (game) {
  const subs = SUBPHASES[game.phase]
  const i = subs.indexOf(game.sub)
  if (i < subs.length - 1) { setSub(game, game.phase, subs[i + 1]); return game.sub }
  // the end of a phase: the Death of a General's first tests; The Hunger
  // feeds at the end of a Combat phase (The Hunger) (vampires.js)
  for (const s of fallenPending(game)) crumble(game, s, leadershipTest, applyWounds)
  if (game.phase === 'combat') hungerFeeds(game)
  game.lastShooter = null // (whose shooting it was: only for that phase — tombkings.js)
  const p = ORDER.indexOf(game.phase)
  if (p < ORDER.length - 1) {
    const ph = ORDER[p + 1]
    setSub(game, ph, SUBPHASES[ph][0])
    return game.sub
  }
  endEffects(game, 'endOfTurn')
  // end of the turn: First Charge disruption lasts to the end of the Combat phase; the
  // Frenzy bonus for following up lasts to the end of the next turn
  for (const u of game.units) {
    u.status.disruptedUntilEndOfCombat = false
    if (u.side !== game.active) u.status.followedUp = false
    u.status.standShootWounds = 0
    // the charge is over at the end of the turn it was made in — except that a unit that pursued
    // into a fight is treated as a charger in the next turn (Catching the Curs)
    if (u.status.pursuedIn && u.status.engaged) { u.status.charged = true; u.status.chargeDistance = 0 } else { u.status.charged = false; u.status.chargeDistance = 0 }
    u.status.pursuedIn = false
    u.status.impactDone = false
  }
  if (game.active === game.first) {
    game.active = 1 - game.first
  } else {
    if (game.round >= game.rounds) {
      game.phase = 'over'
      game.sub = null
      game.subName = ''
      say(game, 'h', `The battle ends after round ${game.round}.`)
      return null
    }
    game.round++
    game.active = game.first
    say(game, 'h', `ROUND ${game.round}`)
  }
  say(game, 'h', `${sideName(game, game.active)} — TURN ${game.round}`)
  beginTurn(game)
  return game.sub
}
