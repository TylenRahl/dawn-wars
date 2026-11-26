// The phases on the battle screen: which buttons the side panel offers, and the modes that
// take the table's clicks. The rules themselves are all in src/rules. Exports actionsFor() (also read
// by ui/guide.js), phaseActions(), onSelect(), resumeAt() and vanguardStage(); ui/battle.js drives it.

import { canRoar, primevalRoar } from '../rules/saurians.js'
import { grantRulesFor } from '../rules/spells.js'
import { canWill, myWillBeDone, canTaskmaster, eternalTaskmaster } from '../rules/tombkings.js'
import { statModFor } from '../rules/spells.js'
import { applyWounds } from '../rules/damage.js'
import { testLeadership } from '../rules/dice.js'
import { canCauldron, cauldron } from '../rules/ogres.js'
import { applyMultipleDamage } from '../rules/damage.js'
import { canHerdhorn, herdhorn, swallowTargets, swallowWhole } from '../rules/hornkin.js'
import { addEffect, spellHits } from '../rules/spells.js'
import { canSkaryn, skaryn, canHorn, soundHorn } from '../rules/woodelves.js'
import { canGoad, goadTargets, goad } from '../rules/darkelves.js'
import { canInvoke, nehekTargets, invokeNehek, canDirge, wailingDirge } from '../rules/vampires.js'
import { leadershipTest } from '../rules/leadership.js'
import { sightTo } from '../rules/sight.js'
import { wizardLevel } from '../rules/magic.js'
import { findEntry } from '../rules/roster.js'
import { commandRange } from '../rules/leadership.js'
import { canGaze, gaze } from '../rules/dominion.js'
import { canSetGrudgestone, setGrudgestone } from '../rules/dwarfs.js'
import { isVerdantKnight } from '../rules/ambush.js'
import { weaponChoices } from '../rules/specialShots.js'
import { hasSteamPower, steamPowerRoll, temperamental } from '../rules/vehicles.js'
import { ambushRolls, decideArrival, sneaky, arrivals, placeReinforcement } from '../rules/ambush.js'
import { canHunger, hungerTargets, hunger } from '../rules/trolls.js'
import { nextStep, beginTurn, SUB_NAMES } from '../rules/turn.js'
import { sideName, unitsOf, onTable, say } from '../rules/game.js'
import { modelCount, filesOf, corners, centre, isDead, hasRule, formationsOf, FORMATION_NAMES, distanceBetween } from '../rules/units.js'
import { add, sub, mul, dirOf, rightOf, dot, angleOf, normAngle } from '../rules/geometry.js'
import { checkMove, makeMove, movementOf, flyMovement, isMarchingColumn, tryMarch, snapshot, restore, applyStep, returnFromPursuit, isLumbering, canFellRedress, fellRedress, canFreeReform, freeReform, canReserveMove, reserveMove, canGreenStep, greenStep } from '../rules/movement.js'
import { declareCharge, canDeclareCharge, reactionsFor, resolveCharge, fleeFrom, fleeMove, greatestDanger, impetuousTests, maxChargeRange, anyChargeTarget, counterCharge } from '../rules/charge.js'
import { rallyPhase, startOfTurn, commandPhase, canCallBigRuck, callBigRuck } from '../rules/strategy.js'
import { shootingTargets, shoot, canShoot, standAndShoot } from '../rules/shooting.js'
import { combatsToFight, fightCombat } from '../rules/combat.js'
import { checkVictory } from '../rules/victory.js'
import { isCharacter, joinedOf, join, leave, canLeave, syncJoined, hostOf } from '../rules/joining.js'
import { castable, castSpell, spellTargets, magnifyRange, boundCastable, castBound, vortexPointOk } from '../rules/magic.js'
import { canPloy, usePloy, offerPloy, ployName } from '../rules/ploys.js'
import { SPELLS } from '../data/spells.js'
import { vanguardUnits, vanguardMove, vanguardPass } from '../rules/vanguard.js'
import { commandItems, useCommandItem, periaptUnits } from '../rules/commandItems.js'
import { canPray, prayersOf, prayerTargets, pray, PRAYERS } from '../rules/prayers.js'
import { supporters, supportOptions, supportingAction, supportChargeTargets, supportingCharge } from '../rules/regiments.js'
import { itemName } from '../rules/items.js'
import { effects as spellEffects, moveVortices } from '../rules/spells.js'
import { isWarMachine, machineWeapon } from '../rules/warMachines.js'
import { randomMovers, hasRandomMovement, randomMovementDice, rollRandomMove, randomContactTargets, randomMoveIntoContact, randomMoveStay } from '../rules/randomMovement.js'
import { canRelease, releaseWhirler, whirlersToMove, choosesDirection, moveWhirler, randomAngle } from '../rules/whirlers.js'

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); for (const k of kids) e.append(k); return e }

export function phaseActions (ui) {
  const game = ui.game
  if (!ui.started) {
    ui.started = true
    beginTurn(game)
    enterSub(ui)
  }
  render(ui)
}

// A battle set up already in the middle of a turn: its
// turn has begun, so the sub-phase it stands in is entered without beginning the turn again.
export function resumeAt (ui) {
  ui.started = true
  enterSub(ui)
}

// ---------- UNDO MOVE ----------
// A unit's move in the Remaining Moves
// sub-phase can be taken back, the last first, for as long as nothing has happened since: no dice
// rolled (a march test, a Dangerous Terrain test) and nothing written to the log but the moves
// themselves. A move that rolled dice cannot be taken back at all — undoing it would let a bad
// roll be rolled again, and the one random source exists so that it cannot be.
// (Not a printed rule: on a real table a move is only finished when the player lets go of the models.)
const removedCount = game => game.units.filter(x => x.status.removed || isDead(x)).length
const saveUnit = x => ({ x, pos: { ...x.pos }, facing: x.facing, files: x.files, formation: x.formation, placed: x.placed, status: { ...x.status } })
function restoreUnit (s) {
  Object.assign(s.x, { pos: { ...s.pos }, facing: s.facing, files: s.files, formation: s.formation, placed: s.placed })
  for (const k of Object.keys(s.x.status)) if (!(k in s.status)) delete s.x.status[k]
  Object.assign(s.x.status, s.status)
}
// make the move with `doIt`, keeping what is needed to take it back
function withUndo (ui, u, doIt) {
  const game = ui.game
  if (game.sub !== 'remaining') return doIt()
  const before = { log: game.log.length, rng: game.rng.state(), removed: removedCount(game), units: game.units.map(saveUnit) }
  const r = doIt()
  if (!r?.ok) return r
  ui.moveUndo ??= []
  if (game.rng.state() !== before.rng || removedCount(game) !== before.removed) {
    ui.moveUndo.length = 0
    say(game, '', `(${u.name}'s move rolled dice: it cannot be undone.)`)
    return r
  }
  // (something happened between the last move and this one: the older moves stay where they are)
  if (ui.moveUndo.at(-1)?.logAfter !== before.log) ui.moveUndo.length = 0
  ui.moveUndo.push({ name: u.name, saved: before.units, logBefore: before.log, logAfter: game.log.length, rngAfter: game.rng.state() })
  return r
}
// the move that may be taken back now, or null
function undoableMove (ui) {
  const game = ui.game
  const top = ui.moveUndo?.at(-1)
  if (!top) return null
  if (game.sub !== 'remaining' || game.log.length !== top.logAfter || game.rng.state() !== top.rngAfter) { ui.moveUndo.length = 0; return null }
  return top
}
function undoMove (ui) {
  const game = ui.game
  const top = undoableMove(ui)
  if (!top || ui.busy || ui.fighting) return
  ui.moveUndo.pop()
  for (const s of top.saved) restoreUnit(s)
  syncJoined(game)
  say(game, '', `UNDO: ${top.name} — its move is taken back; it stands where it was.`)
  const prev = ui.moveUndo.at(-1)
  if (prev) { if (prev.logAfter === top.logBefore) prev.logAfter = game.log.length; else ui.moveUndo.length = 0 }
  ui.setMode(null)
  ui.clearAsk()
  render(ui)
}

// Entering a sub-phase: the automatic parts happen here, then the buttons are drawn.
function enterSub (ui) {
  const game = ui.game
  ui.moveUndo = []
  // (Ctrl+Z on the table when no mode has the keys: ui/battle.js)
  ui.undoMove = () => undoMove(ui)
  ui.setMode(null)
  ui.clearAsk()
  const side = game.active
  switch (game.sub) {
    case 'start':
      say(game, 'h', `${sideName(game, side)} — STRATEGY PHASE`)
      // Ambushers in reserve roll to arrive (rules/ambush.js) — first, before anything else here
      if (!ui.busy) {
        const rolls = ambushRolls(game, side)
        if (rolls.length) {
          ui.busy = true
          ;(async () => {
            try {
              for (const r of rolls) {
                let mod = 0
                // All Sneaky Like: +1 or -1 to the roll, its player's choice
                if (!r.auto && sneaky(game, r.unit)) mod = await ui.askAsync(`${r.unit.name} rolled ${r.roll} to arrive (4+). All Sneaky Like: modify it?`, [['No change', 0], [`+1 (${r.roll + 1})`, 1], [`-1 (${r.roll - 1})`, -1]])
                decideArrival(game, r, mod || 0)
              }
            } finally { ui.busy = false }
            enterSub(ui)
          })()
          return
        }
      }
      moveVortices(game)
      startOfTurn(game)
      // Haldor may set the Grudgestone now (rules/dwarfs.js)
      if (game.units.some(c => canSetGrudgestone(game, c))) say(game, 'h', 'Start of Turn: Haldor may SET THE GRUDGESTONE. Select him (or his unit), or END START OF TURN.')
      // Gloom Nipper Mobs may release their Whirlers now
      if (game.units.some(c => canSetGrudgestone(game, c))) break
      if (unitsOf(game, side).some(u => canRelease(game, u).ok)) {
        say(game, 'h', 'Start of Turn: a Gloom Nipper Mob may RELEASE WHIRLERS. Select it, then click where each lands (within 3"); END START OF TURN when done.')
        break
      }
      nextStep(game)
      return enterSub(ui)
    case 'command':
      commandPhase(game)
      // potions and other items used now (commandItems.js)
      if (game.units.some(c => c.side === side && (commandItems(game, c).some(x => !x.why) || canPray(game, c) || canHunger(game, c) || canGaze(game, c) || canSkaryn(game, c) || canHorn(game, c) || canGoad(game, c) || canInvoke(game, c) || canWill(game, c) || canTaskmaster(game, c) || canRoar(game, c)))) {
        say(game, 'h', 'Command: a character may use a potion or another magic item, a Warrior Priest pray, a Troll Hag feed (Indiscriminate Hunger), or a Champion of Dominion seek the Gaze of the Gods, now. Select it (or its unit); then END COMMAND.')
        break
      }
      if (unitsOf(game, side).some(u => canCallBigRuck(game, u)) || game.units.some(c => c.side === side && c.status.joinedTo && canCallBigRuck(game, c))) {
        say(game, 'h', 'Command: a character may call the BIG RUCK! (once a game). Select it, or the unit it is with; then END COMMAND.')
        break
      }
      nextStep(game)
      return enterSub(ui)
    case 'conjuration':
      // Enchantment and Hex spells: wait here only if a Wizard can cast
      if (!game.units.some(u => u.side === side && u.placed && !u.status.removed && (castable(game, u).length || boundCastable(game, u).length))) { nextStep(game); return enterSub(ui) }
      say(game, 'h', 'Conjuration: select a Wizard to cast Enchantment or Hex spells, then END CONJURATION.')
      break
    case 'rally':
      rallyPhase(game)
      break
    case 'charges': {
      say(game, 'h', `${sideName(game, side)} — MOVEMENT PHASE: declare charges. Select one of your units, then CHARGE and click the enemy.`)
      const must = impetuousTests(game)
      if (must.length) {
        ui.busy = true
        ;(async () => {
          try {
            for (const m of must) {
              const t = m.targets.length === 1 ? m.targets[0] : await ui.askAsync(`${m.unit.name} failed its Impetuous test and must charge. Which enemy?`, m.targets.map(t => [t.name, t]))
              declareCharge(game, m.unit, t)
            }
          } finally { ui.busy = false; render(ui) }
        })()
      }
      break
    }
    case 'chargeMoves':
      return reactions(ui).catch(e => { ui.busy = false; say(game, 'bad', 'Error while resolving charges: ' + e.message); render(ui); throw e })
    case 'compulsory': {
      // Ambushers arriving: their player clicks the battlefield edge for each (rules/ambush.js)
      if (arrivals(game, side).length && !ui.busy) {
        ui.busy = true
        render(ui)
        ;(async () => {
          try {
            for (const u of arrivals(game, side)) {
              for (;;) {
                const p = await pickPoint(ui, isVerdantKnight(u) ? `${sideName(game, side)}: ${u.name} awakens. Click inside a wood, marsh or stream — he must stand wholly within it, not within 1" of an enemy.` : `${sideName(game, side)}: ${u.name} arrives (Ambushers). Click near a battlefield edge — it stands with its rear on the nearest edge, facing the centre, not within 8" of an enemy.`, () => true, 'Hold it back until next turn')
                if (!p) { u.status.arriving = false; say(game, '', `${u.name} stays in reserve this turn.`); break }
                const r = placeReinforcement(game, u, p)
                if (r.ok) break
                say(game, 'bad', `${u.name} cannot arrive there: ${r.reason}.`)
              }
            }
          } finally { ui.busy = false }
          ui.refresh?.()
          enterSub(ui)
        })()
        return
      }
      for (const u of game.units.filter(u => u.side === side && u.status.offTable && !u.status.removed)) returnFromPursuit(game, u)
      const fleeing = unitsOf(game, side).filter(u => u.placed && u.status.fleeing && !u.status.rallied && !u.status.fledThisPhase)
      for (const u of fleeing) fleeMove(game, u, { label: 'keeps fleeing (compulsory move)' })
      const fans = whirlersToMove(game)
      // Random Movement units (Gobbler Hoppers, Wrecker Gobblers) wait for their player here
      const finish = () => {
        if (randomMovers(game).length) {
          say(game, 'h', `Compulsory moves: ${randomMovers(game).map(u => u.name).join(', ')} move${randomMovers(game).length === 1 ? 's' : ''} a random distance. Select ${randomMovers(game).length === 1 ? 'it' : 'each'}, ROLL, then move it, bound into an enemy, or leave it; END COMPULSORY MOVES when done.`)
          render(ui)
        } else { nextStep(game); enterSub(ui) }
      }
      if (!fleeing.length && !fans.length && !randomMovers(game).length) say(game, '', 'Compulsory moves: none.')
      if (!fans.length) return finish()
      // Whirlers: the ones just released go where their player points; the rest spin at random
      ui.busy = true
      render(ui)
      ;(async () => {
        try {
          for (const f of fans) {
            if (f.status.removed) continue
            let angle
            if (choosesDirection(game, f)) {
              ui.board.setCircles([{ at: centre(f), r: 12, colour: 0xffa040 }])
              const p = await pickPoint(ui, `${sideName(game, f.side)}: click the direction this Whirler spins in (it goes 2D6").`, q => Math.hypot(q.x - centre(f).x, q.y - centre(f).y) > 0.5, 'Let it spin at random')
              ui.board.setCircles([])
              f.status.whirler.chosen = !!p
              angle = p ? Math.atan2(p.y - centre(f).y, p.x - centre(f).x) : randomAngle(game)
            } else { f.status.whirler.chosen = false; angle = randomAngle(game) }
            moveWhirler(game, f, angle, f.side === side ? '' : ` (${sideName(game, f.side)})`)
            ui.refresh()
          }
        } catch (e) {
          say(game, 'bad', 'Error while moving Whirlers: ' + e.message)
          console.error(e)
        } finally { ui.busy = false }
        if (checkVictory(game)) { render(ui); return }
        finish()
      })()
      return
    }
    case 'remaining':
      say(game, 'h', 'Remaining moves. Select a unit and move it; END MOVEMENT when done.')
      break
    case 'shoot':
      say(game, 'h', `${sideName(game, side)} — SHOOTING PHASE. Select a unit with missile weapons, then SHOOT and click the target.`)
      break
    case 'fight':
      say(game, 'h', `${sideName(game, side)} — COMBAT PHASE.`)
      break
  }
  render(ui)
}

function advance (ui) {
  const game = ui.game
  const v = checkVictory(game)
  if (v) { render(ui); return }
  nextStep(game)
  if (game.phase === 'over') { checkVictory(game, true); render(ui); return }
  enterSub(ui)
}

function render (ui) {
  const game = ui.game
  syncJoined(game)
  const u = ui.selected && !isDead(ui.selected) && !ui.selected.status.removed ? ui.selected : null
  ui.actions = []
  ui.phaseButtons = []
  if (game.phase === 'over') { ui.refresh(); return }
  const endLabel = { start: 'End Start of Turn', compulsory: 'End Compulsory moves', command: 'End Command', conjuration: 'End Conjuration', rally: 'End Strategy phase', charges: 'Charges declared', remaining: 'End Movement phase', shoot: 'End Shooting phase', fight: 'End Combat phase (and the turn)' }[game.sub] || 'Next'
  const endBtn = el('button', { className: 'primary', textContent: endLabel })
  endBtn.onclick = () => {
    if (ui.busy || ui.fighting) return
    // Random Movement: each must roll for its move (it may then stay)
    if (game.sub === 'compulsory' && randomMovers(game).some(x => !x.status.randomMove)) {
      say(game, 'bad', `Roll the Random Movement of ${randomMovers(game).filter(x => !x.status.randomMove).map(x => x.name).join(', ')} first.`)
      return
    }
    if (game.sub === 'fight' && combatsToFight(game).length) {
      say(game, 'bad', 'Every combat must be fought before the phase ends.')
      return
    }
    advance(ui)
  }
  ui.phaseButtons = ui.busy || ui.fighting ? [] : [endBtn]
  // UNDO MOVE, beside the End button (above)
  const back = !ui.busy && !ui.fighting && undoableMove(ui)
  if (back) ui.phaseButtons.unshift(el('button', { className: 'undo', textContent: `Undo move: ${back.name} (Ctrl+Z)`, title: 'Put the unit back where it stood before its last move. Only while no dice have been rolled since.', onclick: () => undoMove(ui) }))

  buildActions(ui, u)
  ui.refresh()
}

// The buttons for unit `u` in this step, pushed onto ui.actions (the side panel's, or the guide's — actionsFor)
function buildActions (ui, u) {
  const game = ui.game
  const mine = u && u.side === game.active
  if (game.sub === 'compulsory' && u && mine && hasRandomMovement(u) && !u.status.engaged && !u.status.fleeing) {
    const r = u.status.randomMove
    if (!r) ui.actions.push([`Roll Random Movement (${randomMovementDice(u)})`, () => { rollRandomMove(game, u); render(ui) }])
    else if (!r.done) {
      for (const x of randomContactTargets(game, u)) ui.actions.push([`Bound into ${x.t.name} (${x.needed.toFixed(1)}")`, () => { const k = randomMoveIntoContact(game, u, x.t); if (!k.ok) say(game, 'bad', `It cannot: ${k.reason}.`); render(ui) }])
      ui.actions.push([`Move… (up to ${r.rolled}", forward and wheels)`, () => ui.setMode(moveMode(ui, u, false, true))])
      ui.actions.push(['Stay where it is', () => { randomMoveStay(game, u); render(ui) }])
    }
  }
  if (game.sub === 'start' && u) for (const c of [u, ...joinedOf(u)].filter(c => canSetGrudgestone(game, c))) ui.actions.push([`${c.name}: set the Grudgestone (no moving from here, Unbreakable)`, () => { setGrudgestone(game, c); render(ui) }])
  if (game.sub === 'start' && u && u.whirlersHidden && mine) {
    const c = canRelease(game, u)
    ui.actions.push([c.ok ? `Release a Whirler (${u.whirlersHidden} hidden)…` : `Cannot release Whirlers: ${c.reason}`, () => releaseMode(ui, u), !c.ok || !!ui.busy])
  }
  // the Gutlords: a Butcher's Cauldron offering (rules/ogres.js)
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canCauldron(game, c))) ui.actions.push([`${c.name}: an offering to the Hunger Below (Butcher's Cauldron)`, () => { cauldron(game, c, { testLeadership, applyWounds, addEffect, host: c.status.joinedTo ? u : null }); render(ui) }])
  // the Hornkin: the Herdhorn, a Gorgemaw's Swallow Whole (rules/hornkin.js)
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canHerdhorn(game, c))) ui.actions.push([`${c.name}: sound the Herdhorn (Ambushers roll again)`, () => { if (herdhorn(game, c)) for (const r of ambushRolls(game, c.side, { again: true })) decideArrival(game, r, 0); render(ui) }])
  if (game.sub === 'command' && u) for (const t of swallowTargets(game, u)) ui.actions.push([`${u.name}: Swallow Whole one of ${t.name}`, () => { swallowWhole(game, u, t, applyMultipleDamage); render(ui) }])
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canGaze(game, c))) ui.actions.push([`${c.name}: seek the Gaze of the Gods (D6 on the table)`, () => { gaze(game, c, addEffect); render(ui) }])
  // the Lornefolk: Vessa the Eye Thief, the Horn of the Wild Hunt (rules/woodelves.js)
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canSkaryn(game, c))) {
    const ts = onTable(game).filter(t => t.side !== c.side && distanceBetween(hostOf(game, c) || c, t) <= 18)
    if (ts.length) ui.actions.push([`${c.name}: send Vessa the Eye Thief (D6, 3+: a S4 AP -1 hit within 18")`, async () => { const t = ts.length === 1 ? ts[0] : await ui.askAsync('Skaryn strikes at which enemy?', ts.map(x => [x.name, x])); skaryn(game, c, t, spellHits); render(ui) }])
  }
  // the Bloodsworn Courts: the Invocation of the Risen; a Wailing Dirge in the Shooting phase (rules/vampires.js)
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canInvoke(game, c))) {
    const ts = nehekTargets(game, c, distanceBetween)
    if (ts.length) ui.actions.push([`${c.name}: the Invocation of the Risen (Leadership test; an Undead unit within 12" recovers Wounds)`, async () => { const t = ts.length === 1 ? ts[0] : await ui.askAsync('Raise which unit?', ts.map(x => [x.name, x])); invokeNehek(game, c, t, Math.max(1, wizardLevel(c)) /* (a Dark Acolyte counts as a Level 1 Wizard for it) */, x => findEntry(x.army, x.entryId)?.maximum || 0); render(ui) }])
  }
  if (game.sub === 'shoot' && u) for (const c of [u, ...joinedOf(u)].filter(c => canDirge(game, c))) {
    const from = hostOf(game, c) || c
    const ts = onTable(game).filter(t => t.side !== c.side && (from.engagedWith?.[t.id] || (distanceBetween(from, t) <= 8 && sightTo(game, from, t).sees)))
    if (ts.length) ui.actions.push([`${c.name}: a Wailing Dirge (an enemy within 8": Leadership test at -2, a wound for each point failed)`, async () => { const t = ts.length === 1 ? ts[0] : await ui.askAsync('The Wailing Dirge at which enemy?', ts.map(x => [x.name, x])); wailingDirge(game, c, t, leadershipTest, spellHits); render(ui) }])
  }
  // the Saurians: a Mirecrawler's Primeval Roar (rules/saurians.js)
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canRoar(game, c))) ui.actions.push([`${c.name}: Primeval Roar (once a game: Furious Charge within 7" this turn)`, () => { primevalRoar(game, c, distanceBetween, addEffect, grantRulesFor); render(ui) }])
  // the Sand Kings: My Will Be Done, Eternal Taskmaster (rules/tombkings.js)
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canWill(game, c))) ui.actions.push([`${c.name}: My Will Be Done (Leadership test)`, async () => { const k = await ui.askAsync('Which command?', [['"Forward to Glory!" (+D3 Movement)', 'M'], ['"My Worthy Champions!" (+1 Weapon Skill)', 'WS'], ['"Strike like the Cobra!" (+D3 Initiative)', 'I']]); myWillBeDone(game, c, k, statModFor, addEffect); render(ui) }])
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canTaskmaster(game, c))) ui.actions.push([`${c.name}: Eternal Taskmaster (Leadership test: Extra Attacks and Hatred for its unit)`, () => { eternalTaskmaster(game, c, addEffect); render(ui) }])
  // the Vhar: a High Beastmaster goads a monster (rules/darkelves.js)
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canGoad(game, c))) {
    const ts = goadTargets(game, c, distanceBetween, commandRange)
    if (ts.length) ui.actions.push([`${c.name}: Goad Beast (+D3 Attacks to a monster this turn)`, async () => { const t = ts.length === 1 ? ts[0] : await ui.askAsync('Goad which monster?', ts.map(x => [x === c ? `${c.name}'s mount` : x.name, x])); goad(game, c, t); render(ui) }])
  }
  if (game.sub === 'command' && u) for (const c of [u, ...joinedOf(u)].filter(c => canHorn(game, c))) ui.actions.push([`${c.name}: sound the Horn of the Wild Hunt (once a game: units in his Command range Frenzied this turn)`, () => { soundHorn(game, c, commandRange, distanceBetween); render(ui) }])
  if (game.sub === 'command' && u) {
    // Warrior Priests' prayers (rules/prayers.js)
    for (const c of [u, ...joinedOf(u)].filter(c => canPray(game, c))) {
      for (const id of prayersOf(c)) {
        const p = PRAYERS[id]
        const ts = prayerTargets(game, c, id)
        const off = p.target === 'enemy' && !ts.length
        ui.actions.push([`${c === u ? '' : c.name + ': '}Pray: ${p.name}${off ? ' (not engaged)' : ''}`, async () => {
          if (ui.busy) return
          ui.busy = true
          try {
            let t = null
            if (p.target === 'enemy') t = ts.length === 1 ? ts[0] : await ui.askAsync(`${p.name}: at which enemy unit?`, ts.map(x => [x.name, x]))
            else if (p.target === 'friend' && ts.length) t = await ui.askAsync(`${p.name}: which friendly unit in its Command range (its own unit may be the one)?`, [['None', null], ...ts.map(x => [x.name, x])])
            const r = await pray(game, c, id, t)
            if (!r.ok) say(game, 'bad', r.reason)
          } finally { ui.busy = false }
          render(ui)
        }, off || !!ui.busy])
      }
    }
    for (const c of [u, ...joinedOf(u)]) for (const it of commandItems(game, c)) ui.actions.push([it.why ? `${c.name}: ${it.name} — ${it.why}` : `${c === u ? '' : c.name + ': '}Use ${it.name}`, async () => {
      // (the Periapt of Soul Exchange: its player picks the friendly unit that gives up the models)
      let target = null
      if (it.id === 'periapt-of-soul-exchange') { const us = periaptUnits(game, c); target = us.length === 1 ? us[0] : await ui.askAsync(`${c.name}: the Periapt of Soul Exchange takes D3 models from which friendly unit?`, [...us.map(x => [x.name, x]), ['Cancel', null]]); if (!target) return }
      const r = useCommandItem(game, c, it.id, { target }); if (!r.ok) say(game, 'bad', r.reason); render(ui)
    }, !!it.why])
    // Indiscriminate Hunger (rules/trolls.js)
    if (canHunger(game, u)) ui.actions.push([`${u.name}: Indiscriminate Hunger…`, async () => {
      if (ui.busy) return
      ui.busy = true
      try {
        const ts = hungerTargets(game, u)
        const t = ts.length === 1 ? ts[0] : await ui.askAsync('Indiscriminate Hunger: which enemy unit she is fighting?', ts.map(x => [x.name, x]))
        if (t) { const r = hunger(game, u, t); if (!r.ok) say(game, 'bad', r.reason) }
      } finally { ui.busy = false }
      render(ui)
    }, !!ui.busy])
    for (const c of [u, ...joinedOf(u)].filter(c => canCallBigRuck(game, c))) ui.actions.push([`${c.name}: call the BIG RUCK!`, () => { callBigRuck(game, c); render(ui) }])
  }
  // spells: the selected Wizard, or a Wizard with the selected unit
  if (u) {
    const wizards = [u, ...joinedOf(u)].filter(w => w.wizard && w.side === (game.sub === 'fight' ? w.side : game.active))
    for (const w of wizards) {
      for (const s of castable(game, w)) {
        if (game.sub === 'fight' && !w.status.engaged && !hostOf(game, w)?.status.engaged) continue
        ui.actions.push([`${w === u ? '' : w.name + ': '}Cast ${s.name} (${s.castingValue}+)`, () => startCast(ui, w, s), !!ui.busy])
      }
    }
    // Bound spells from magic items, anyone who carries one
    for (const c of [u, ...joinedOf(u)].filter(c => c.side === (game.sub === 'fight' ? c.side : game.active))) {
      for (const b of boundCastable(game, c)) {
        const s = SPELLS[b.slug]
        if (game.sub === 'fight' && !c.status.engaged && !hostOf(game, c)?.status.engaged) continue
        ui.actions.push([`${c === u ? '' : c.name + ': '}Cast ${s.name} (Bound, ${itemName(b.item)}, Power Level ${b.power}; ${s.castingValue}+)`, () => startCast(ui, c, s, b), !!ui.busy])
      }
    }
  }
  if (game.sub === 'charges' && mine) {
    ui.actions.push(['Charge…', () => ui.setMode(chargeMode(ui, u)), !anyChargeTarget(game, u)])
  }
  // a unit that rallied may reform for free (rules/movement.js freeReform)
  if (game.sub === 'rally' && mine && canFreeReform(game, u)) ui.actions.push(['Free reform (it has rallied)…', () => ui.setMode(reformMode(ui, u, true))])
  if (game.sub === 'remaining' && mine) {
    // characters: join a unit, or leave one
    if (isCharacter(u) && !u.status.joinedTo) ui.actions.push(['Join a unit…', () => ui.setMode(joinMode(ui, u)), u.status.moved || u.status.engaged || u.status.fleeing])
    for (const c of joinedOf(u)) ui.actions.push([`${c.name}: leave the unit`, () => { const r = leave(game, c); if (!r.ok) say(game, 'bad', `${c.name} cannot leave: ${r.reason}.`); else ui.select(c); render(ui) }, !canLeave(game, c).ok])
    const chk = checkMove(game, u, [])
    ui.actions.push(['Move…', () => ui.setMode(moveMode(ui, u, false)), !chk.ok])
    // Steam Power / Temperamental (rules/vehicles.js): instead of marching
    if (hasSteamPower(u)) ui.actions.push(['Steam Power… (2D6, keep the highest, added to its Movement)', async () => {
      if (ui.busy) return
      ui.busy = true
      try {
        const r = steamPowerRoll(game, u)
        const choice = r.ones === 1 && hasRule(u, 'Temperamental') ? await ui.askAsync(`${u.name}: a natural 1 on the Steam Power roll. Bang! (lose a Wound) or Phweee! (halt for the turn)?`, [['Bang! (lose a Wound)', 'bang'], ['Phweee! (halt)', 'phweee']]) : 'bang'
        if (!temperamental(game, u, r.ones, choice) && !u.status.removed) { u.status.steamBonus = r.kept; ui.busy = false; ui.setMode(moveMode(ui, u, false)); return }
      } finally { ui.busy = false }
      render(ui)
    }, !chk.ok || !!u.status.steamBonus])
    // Marching Column: deeper than wide, a Close Order unit marches at TRIPLE
    // its Movement (rules/movement.js isMarchingColumn); the March button says which it is, and how far
    const col = isMarchingColumn(u)
    ui.actions.push([`March… (${movementOf(u) * (col ? 3 : 2)}"${col ? ', Marching Column: triple' : ''})`, () => {
      const m = tryMarch(game, u)
      if (m.allowed) ui.setMode(moveMode(ui, u, true))
      else { u.status.moved = false; render(ui) }
    }, !chk.ok || u.status.marchTested === false])
    // Fly: it may fly instead, with its Fly Movement, over units and terrain
    if (flyMovement(u)) {
      ui.actions.push([`Fly… (${flyMovement(u)}")`, () => ui.setMode(moveMode(ui, u, false, false, true)), !chk.ok])
      ui.actions.push([`Fly, marching… (${flyMovement(u) * (isMarchingColumn(u) ? 3 : 2)}")`, () => {
        const m = tryMarch(game, u, { fly: true })
        if (m.allowed) ui.setMode(moveMode(ui, u, true, false, true))
        else { u.status.moved = false; render(ui) }
      }, !chk.ok || u.status.marchTested === false])
    }
    ui.actions.push(['Reform…', () => ui.setMode(reformMode(ui, u)), !chk.ok])
    // Guardian of the Sacred Sites (rules/movement.js greenStep)
    if (canGreenStep(game, u)) ui.actions.push(['Step into another wood, marsh or stream… (instead of moving)', async () => {
      const p = await pickPoint(ui, `${u.name}: click inside a different natural terrain feature.`, () => true, 'Cancel')
      if (p) { const r = greenStep(game, u, p); if (!r.ok) say(game, 'bad', `${u.name} cannot go there: ${r.reason}.`) }
      render(ui)
    }])
    // the Standard of the Fell Warrior (rules/movement.js fellRedress)
    if (canFellRedress(game, u)) ui.actions.push(['Free redress (Standard of the Fell Warrior, once)…', async () => {
      const f = filesOf(u)
      const n = await ui.askAsync(`${u.name}: redress to how many models wide (now ${f})?`, [...new Set([f - 2, f - 1, f + 1, f + 2].filter(x => x >= 1 && x <= modelCount(u)))].map(x => [`${x} wide`, x]).concat([['Cancel', null]]))
      if (n) { const r = fellRedress(game, u, n); if (!r.ok) say(game, 'bad', r.reason) }
      render(ui)
    }])
  }
  if (game.sub === 'shoot' && mine) {
    const c = canShoot(game, u)
    // a unit with more than one way to shoot (rules/specialShots.js): one button for each
    // Reserve Move (rules/movement.js reserveMove): after its shooting
    if (canReserveMove(game, u)) ui.actions.push(['Reserve move… (after shooting; no march)', () => { u.status.reserveMoving = true; ui.setMode(moveMode(ui, u, false, false, false, plan => { u.status.reserveMoving = false; return reserveMove(game, u, plan) })) }])
    const ws = isWarMachine(u) ? [] : weaponChoices(u)
    if (ws.length > 1 && c.ok) for (const w of ws) ui.actions.push([`Shoot: ${w.name}…`, () => ui.setMode(shootMode(ui, u, w.id))])
    else ui.actions.push([c.ok ? 'Shoot…' : `Cannot shoot: ${c.reason}`, () => ui.setMode(shootMode(ui, u)), !c.ok])
  }
  if (game.sub === 'fight') {
    const list = combatsToFight(game)
    for (const c of list) {
      ui.actions.push([`Fight: ${c.label}`, async () => {
        if (ui.fighting) return
        ui.fighting = true
        ui.actions = []; ui.refresh()
        // (a combat weapon picked before the fight changes the picture and the stats panel at once: refresh once the answer is recorded)
        const askAndShow = async (q, a) => { const v = await ui.askAsync(q, a); setTimeout(() => ui.refresh(), 0); return v }
        try { await fightCombat(game, c, askAndShow) } finally { ui.fighting = false }
        if (checkVictory(game)) { render(ui); return }
        render(ui)
      }])
    }
    if (!list.length) ui.actions.push(['No combats left to fight', () => {}, true])
  }
}

// What unit `u` could do now: [label, fn, disabled] (the "What now?" guide, ui/guide.js). Nothing is done: the
// builders only check.
export function actionsFor (ui, u) {
  const saved = ui.actions
  ui.actions = []
  try {
    buildActions(ui, u)
    return ui.actions
  } finally { ui.actions = saved }
}

// keep the side panel right when a unit is clicked outside any mode
export function onSelect (ui) { render(ui) }

// ---------- charging ----------
function chargeMode (ui, u) {
  const game = ui.game
  return {
    enter () {
      ui.ask(`${u.name}: click the enemy unit to charge. (Its maximum charge range is ${maxChargeRange(u, game)}".)`, [['Cancel', () => { ui.setMode(null); render(ui) }]])
      const m = new Map()
      for (const t of onTable(game).filter(o => o.side !== u.side)) {
        m.set(t.id, canDeclareCharge(game, u, t).ok ? 0x7fe07f : 0x777777)
      }
      ui.board.setHighlights(m)
    },
    // a Charge pip over each unit it may charge (ui/pips.js); pressing one is clicking that unit
    pips () {
      return onTable(game).filter(t => t.side !== u.side && canDeclareCharge(game, u, t).ok)
        .map(t => ({ key: `charge-${t.id}`, unit: t, label: 'Charge', why: `${u.name} declares a charge against ${t.name}.`, onPress: () => this.down(centre(t), t) }))
    },
    down (p, t) {
      if (!t || t.side === u.side) return
      const r = declareCharge(game, u, t)
      if (!r.ok) { say(game, 'bad', `${u.name} cannot charge ${t.name}: ${r.reason}.`); return }
      ui.board.setLines([{ from: centre(u), to: centre(t), colour: 0xffd34a, label: 'charge' }])
      ui.setMode(null)
      ui.clearAsk()
      render(ui)
    },
    right () { ui.setMode(null); ui.clearAsk(); render(ui) }
  }
}

// The inactive player answers each charge, then the charges are moved.
async function reactions (ui) {
  const game = ui.game
  // nothing else to press while the charges are answered and moved
  ui.busy = true
  ui.phaseButtons = []; ui.actions = []; ui.refresh()
  const chargers = unitsOf(game, game.active).filter(u => u.status.declaredCharge)
  const targets = [...new Set(chargers.map(c => c.status.declaredCharge.target))].map(id => game.units.find(x => x.id === id))
  for (const t of targets) {
    if (!t || t.status.removed) continue
    let by = chargers.filter(c => c.status.declaredCharge.target === t.id)
    const options = reactionsFor(game, t, by[0])
    const label = { hold: 'Hold', stand: 'Stand & Shoot', flee: 'Flee', fireflee: 'Fire & Flee', counter: 'Counter Charge' }
    let choice = options[0]
    if (options.length > 1) {
      choice = await ui.askAsync(`${sideName(game, t.side)}: ${t.name} is charged by ${by.map(b => b.name).join(' and ')}. Its reaction?`, options.map(o => [label[o], o]))
    }
    say(game, '', `${t.name} reacts: ${label[choice].toUpperCase()}.`)
    t.status.reaction = choice
    if (choice === 'flee') fleeFrom(game, t, greatestDanger(game, by), { label: 'flees from the charge' })
    if (choice === 'stand' || choice === 'fireflee') {
      t.status.stoodAndShot = true
      await standAndShoot(game, t, by[0])
      // its arrows reach the chargers before the dead are taken off and the charge goes on (view/shotFx.js)
      await ui.board?.settle?.()
    }
    if (choice === 'fireflee' && !t.status.removed) fleeFrom(game, t, greatestDanger(game, by), { label: 'fires and flees', keepHighest: true })
    if (choice === 'counter') counterCharge(game, t, by[0])
    // Feigned Flight: a unit that ran from a charge (Flee, or Fire & Flee) stops fleeing once its flee move is done
    if ((choice === 'flee' || choice === 'fireflee') && hasRule(t, 'Feigned Flight') && !t.status.removed) { t.status.fleeing = false; say(game, 'good', `${t.name} — Feigned Flight: its flee move done, it stops fleeing.`) }
    // its detachments may support it
    if (choice !== 'flee' && choice !== 'fireflee') {
      for (const d of supporters(game, t)) {
        const alive = by.filter(c => !c.status.removed && !isDead(c) && c.placed)
        if (!alive.length) break
        by = alive
        const names = { fire: 'Supporting Fire (Stand & Shoot)', charge: 'Supporting Charge (at the end of the Charge Moves)', none: 'No supporting action' }
        const a = await ui.askAsync(`${sideName(game, d.side)}: ${d.name} may support ${t.name}. Which Supporting Action?`, supportOptions(game, d, by[0]).map(o => [names[o], o]))
        await supportingAction(game, d, t, by[0], a)
        if (a === 'fire') await ui.board?.settle?.()
      }
    }
  }
  for (const c of chargers) {
    if (isDead(c) || c.status.removed) continue
    // Temperamental: its player chooses Bang! or Phweee! for a natural 1 on the Charge roll
    if (hasRule(c, 'Temperamental')) c.status.temperChoice = await ui.askAsync(`${c.name} charges: if its Charge roll shows a natural 1 — Bang! (lose a Wound, keep going) or Phweee! (halt)?`, [['Bang!', 'bang'], ['Phweee!', 'phweee']])
    resolveCharge(game, c)
  }
  // Supporting Charges come last, once every other charge has moved
  for (const d of game.units.filter(x => x.side !== game.active && x.status.supportCharge)) {
    const ts = supportChargeTargets(game, d)
    if (!ts.length) { say(game, '', `${d.name}: no enemy charged into its regiment; no Supporting Charge.`); d.status.supportCharge = null; continue }
    const t = ts.length === 1 ? ts[0] : await ui.askAsync(`${sideName(game, d.side)}: ${d.name} makes its Supporting Charge at which enemy?`, ts.map(x => [x.name, x]))
    supportingCharge(game, d, t)
  }
  ui.board.clearOverlays()
  ui.busy = false
  nextStep(game) // to compulsory moves
  enterSub(ui)
}

// ---------- moving ----------
// The plan is built step by step; the mouse sets the size of the step being made.
// `random`: a Random Movement unit's move, up to what it rolled (forward and wheels only)
// `commit`: what Done does with the plan (a Vanguard move), instead of an ordinary makeMove
function moveMode (ui, u, march, randomMove = false, fly = false, commit = null) {
  const game = ui.game
  const random = randomMove ? u.status.randomMove.rolled : null
  const M = random ?? (fly ? flyMovement(u) : movementOf(u))
  const plan = []
  // Skirmishers move freely: a free move is their only kind (with Q / E to face)
  let kind = u.formation === 'skirmish' && random == null ? 'free' : 'forward'
  let current = null
  let freeFacing = u.facing
  let freeTurned = false
  const ghost = () => {
    const s = snapshot(u)
    for (const st of plan) applyStep(u, st, M)
    if (current) applyStep(u, current, M)
    const g = { ...u, pos: { ...u.pos }, files: u.files }
    restore(u, s)
    return g
  }
  // LEFT-CLICK HOLDS THE GHOST. The step being sized is fixed and the ghost stays where it is while the
  // next step is chosen — from the pips over the ghost or the buttons in the side panel. Choosing
  // one (Wheel, Forward…) lets the mouse size it; a second left-click on the table carries on
  // with the same kind of step.
  let held = false
  // what each control does: the side panel's buttons and the pips over the ghost press the same ones
  const kindsNow = () => random != null || march ? ['forward', 'wheel'] : u.formation === 'skirmish' ? ['free'] : ['forward', 'wheel', 'back', 'side']
  const turnsAllowed = () => !march && random == null && u.formation !== 'skirmish'
  const chooseKind = k => { if (current) plan.push(current); current = null; kind = k; held = false; status() }
  const turn = q => { if (current) plan.push(current); current = null; plan.push({ type: 'turn', quarters: q }); held = true; status() }
  const quickTurn = () => { if (current) plan.push(current); current = { type: 'quickTurn', angle: 0 }; kind = 'quickTurn'; held = false; status() }
  const redress = () => { if (current) plan.push(current); current = { type: 'redress', files: filesOf(u) }; kind = 'redress'; held = false; status() }
  const undo = () => { if (current) current = null; else plan.pop(); held = true; status() }
  // WHAT THE NEXT STEP COULD BE. Each step is tried a hair's breadth after the steps so far; one the rules refuse — no movement
  // left, a unit in the way, a second manoeuvre — is greyed, its reason on hover. null: it can be taken.
  const opts = { march, random: randomMove, fly }
  // (a step refused only for its inches says how many are left, not the rounded "needs 4.0" and has 4"")
  let leftNow = 0
  const whyNot = (all, ...tries) => {
    let r = null
    for (const t of tries) { const k = checkMove(game, u, [...all, t], opts); if (k.ok) return null; r = r || k.reason }
    if (/^it needs/.test(r || '')) return leftNow < 0.05 ? 'no movement left' : `only ${leftNow.toFixed(1)}" of movement left`
    return r || 'not possible now'
  }
  const nextSteps = all => { const k0 = checkMove(game, u, all, opts); leftNow = Math.max(0, k0.allowance - k0.used); return nextStepsFrom(all) }
  const nextStepsFrom = all => ({
    forward: whyNot(all, { type: 'forward', d: 0.05 }),
    back: whyNot(all, { type: 'back', d: 0.05 }),
    side: whyNot(all, { type: 'side', d: 0.05 }, { type: 'side', d: -0.05 }),
    wheel: whyNot(all, { type: 'wheel', angle: 0.01 }, { type: 'wheel', angle: -0.01 }),
    free: null,
    turnL: whyNot(all, { type: 'turn', quarters: -1 }),
    turnR: whyNot(all, { type: 'turn', quarters: 1 }),
    about: whyNot(all, { type: 'turn', quarters: 2 }),
    quickTurn: whyNot(all, { type: 'quickTurn', angle: 0.1 }, { type: 'quickTurn', angle: -0.1 }),
    redress: whyNot(all, { type: 'redress', files: filesOf(u) + 1 }, { type: 'redress', files: Math.max(1, filesOf(u) - 1) })
  })
  let can = {}
  // THE MOVE GUIDES (view/board.js drawGuides): the inches left as a falling bar beside the ghost; while a wheel is
  // being sized, the arc each front corner can still swing through on what is left
  const guides = (chk, all) => {
    const g = ghost()
    const cs = corners(g)
    const gauge = { at: { x: Math.max(...cs.map(q => q.x)) + 0.8, y: cs.reduce((a, q) => a + q.y, 0) / 4 }, left: Math.max(0, chk.allowance - chk.used), of: chk.allowance }
    const arcs = []
    if (kind === 'wheel' && !held) {
      const before = checkMove(game, u, plan, opts)
      const b = base()
      const w = Math.hypot(b.cs[1].x - b.cs[0].x, b.cs[1].y - b.cs[0].y)
      const most = w > 0 ? Math.min(Math.PI, Math.max(0, before.allowance - before.used) / w) : 0
      if (most > 0.001) {
        const a0 = angleOf(sub(b.cs[0], b.cs[1])); const a1 = angleOf(sub(b.cs[1], b.cs[0]))
        arcs.push({ centre: b.cs[1], r: w, from: a0, to: a0 + most }) // wheeling right: the left corner swings forward
        arcs.push({ centre: b.cs[0], r: w, from: a1, to: a1 - most }) // wheeling left: the right corner
      }
    }
    return { gauge, arcs }
  }
  const status = () => {
    const all = current ? [...plan, current] : plan
    const chk = checkMove(game, u, all, opts)
    can = nextSteps(all)
    ui.board.setGhosts([{ unit: ghost(), ok: chk.ok }])
    ui.board.setGuides(guides(chk, all))
    const box = document.getElementById('prompt')
    const column = march && isMarchingColumn(u) ? ' (Marching Column: triple its Movement)' : ''
    box.replaceChildren(el('div', { className: 'q', textContent: `${u.name} ${fly ? 'FLIES' : ''}${march ? (fly ? ', MARCHING' : 'MARCHES') : (fly ? '' : 'MOVES')}${column} — ${chk.used.toFixed(1)}" of ${chk.allowance}" used, ${Math.max(0, chk.allowance - chk.used).toFixed(1)}" left.${held ? ' Held: choose the next step.' : ''}${kind === 'wheel' && !held ? ' WHEEL: move the mouse sideways — to the right of the unit wheels right, to the left wheels left; the front swings round to point at it (the dashed arcs end where the movement runs out).' : ''}${kind === 'redress' && current ? (isMarchingColumn(ghost()) ? ' Now a MARCHING COLUMN (deeper than wide): triple its Movement when it marches, no Rank Bonus, no charging.' : ' Narrower than deep makes a Marching Column (triple when marching).') : ''} ${chk.ok ? '' : 'Not allowed: ' + chk.reason + '.'}` }))
    const names = { free: 'Free move (Q / E to face)', forward: 'Forward', wheel: 'Wheel', back: 'Backwards (half rate)', side: 'Sideways (half rate)' }
    const button = (text, why, onclick) => el('button', { textContent: text, disabled: !!why, title: why ? `Not now: ${why}.` : '', onclick })
    for (const k of kindsNow()) box.append(button((k === kind && !held ? '▶ ' : '') + names[k], k === kind && !held ? null : can[k], () => chooseKind(k)))
    if (turnsAllowed()) {
      for (const [lbl, q, key] of [['Turn left', -1, 'turnL'], ['Turn right', 1, 'turnR'], ['About face', 2, 'about']]) box.append(button(lbl, can[key], () => turn(q)))
      if (u.formation === 'open' || isLumbering(u)) box.append(button(u.formation === 'open' ? 'Quick turn (Open Order)' : 'Pivot (Lumbering)', can.quickTurn, quickTurn))
      box.append(button('Redress ranks ([ / ])', can.redress, redress))
    }
    box.append(el('br'))
    const undoB = el('button', { textContent: 'Undo step' })
    undoB.onclick = undo
    const done = el('button', { className: 'primary', textContent: 'Done (right-click)' })
    done.onclick = finish
    const cancel = el('button', { textContent: 'Cancel' })
    // (a Vanguard move cancelled goes back to the Vanguard question)
    cancel.onclick = cancelMove
    box.append(undoB, done, cancel)
    box.append(el('div', { className: 'rules', textContent: 'Move the mouse to size the step — it stops at the unit\'s maximum. Left-click fixes the step and HOLDS the ghost: then choose the next step from the pips over it (Wheel, Forward…) or the buttons here, or left-click again to carry on the same way. Right-click confirms the move.' }))
    ui.renderPips?.()
  }
  const base = () => { const s = snapshot(u); for (const st of plan) applyStep(u, st, M); const r = { pos: { ...u.pos }, facing: u.facing, cs: corners(u), c: centre(u) }; restore(u, s); return r }
  // The step being sized stops at the unit's allowance instead of running past it: the largest part of
  // the step that still fits. A move refused for another reason (a unit in the way) still shows red.
  const clampToAllowance = from => {
    if (!current || !['forward', 'back', 'side', 'wheel', 'free'].includes(current.type)) return
    const fits = st => { const k = checkMove(game, u, [...plan, st], { march, random: randomMove, fly }); return k.used <= k.allowance + 1e-6 }
    if (fits(current)) return
    const c = current
    const part = t => c.type === 'wheel' ? { ...c, angle: c.angle * t } : c.type === 'free' ? { ...c, to: { x: from.x + (c.to.x - from.x) * t, y: from.y + (c.to.y - from.y) * t } } : { ...c, d: c.d * t }
    let lo = 0; let hi = 1
    for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (fits(part(mid))) lo = mid; else hi = mid }
    current = part(lo)
  }
  // right-click, or Done: make the move (the steps fixed so far, and the one being sized)
  const finish = () => {
    if (current) { plan.push(current); current = null }
    const r = commit ? commit(plan) : withUndo(ui, u, () => makeMove(game, u, plan, { march, random: randomMove, fly }))
    if (!r.ok) { say(game, 'bad', `${u.name} cannot move like that: ${r.reason}.`); status(); return }
    ui.setMode(null); ui.clearAsk(); if (commit) commit.after?.(); else render(ui)
  }
  const cancelMove = () => { ui.setMode(null); ui.clearAsk(); if (commit?.after) commit.after(); else render(ui) }
  return {
    enter: status,
    move (p) {
      if (held) return
      const b = base()
      const f = dirOf(b.facing); const r = rightOf(b.facing)
      const rel = sub(p, b.pos)
      if (kind === 'free') {
        // its centre goes to the mouse; it faces the way it travelled unless turned with Q / E
        const c0 = centre(u)
        if (!freeTurned) freeFacing = Math.hypot(p.x - c0.x, p.y - c0.y) > 0.2 ? angleOf(sub(p, c0)) : u.facing
        current = { type: 'free', to: p, facing: freeFacing }
      } else if (kind === 'forward') current = { type: 'forward', d: Math.max(0, dot(rel, f)) }
      else if (kind === 'back') current = { type: 'back', d: Math.max(0, -dot(rel, f)) }
      else if (kind === 'side') current = { type: 'side', d: dot(rel, r) }
      else if (kind === 'wheel') {
        // the mouse to the unit's right wheels right (pivot on the front-right corner), to its
        // left wheels left; the front swings round to point at the mouse
        const right = dot(rel, r) > 0
        const pivot = right ? b.cs[1] : b.cs[0]
        let a = normAngle(angleOf(sub(p, pivot)) - b.facing)
        a = right ? Math.max(0, Math.min(Math.PI, a)) : Math.min(0, Math.max(-Math.PI, a))
        current = { type: 'wheel', angle: a }
      } else if (kind === 'quickTurn') {
        current = { type: 'quickTurn', angle: normAngle(angleOf(sub(p, centre(ghost()))) - b.facing) }
      } else if (kind === 'redress') return
      clampToAllowance(b.c)
      status()
    },
    down () {
      if (held) { held = false; status(); return }
      if (current) { plan.push(current); current = null; held = true; status() }
    },
    // THE MOVE PIPS, over the ghost, while it is held (ui/pips.js): the steps in the row nearest
    // it, with Done; turning, redressing, Undo and Cancel in a grey row above. While ranks are
    // being redressed: Narrower, Wider and Hold. Each presses the same thing as its side-panel button.
    pips () {
      const g = ghost()
      const c = centre(g)
      const top = Math.min(...corners(g).map(q => q.y))
      const near = { x: c.x, y: top + 1 }
      const above = { x: c.x, y: top }
      const pip = (key, label, onPress, at, extra = {}) => ({ key: `mv-${key}`, label, onPress, at, ...extra })
      if (kind === 'redress' && current && !held) {
        return [
          pip('narrow', 'Narrower', () => this.key({ key: '[' }), near),
          pip('wide', 'Wider', () => this.key({ key: ']' }), near),
          pip('hold', 'Hold', () => this.down(), near)
        ]
      }
      if (!held) return []
      const words = { free: 'Free move', forward: 'Forward', wheel: 'Wheel', back: 'Back', side: 'Sideways' }
      const why = { free: 'Move freely: the centre follows the mouse (Q / E to face).', forward: 'Straight ahead, sized with the mouse.', wheel: 'Wheel: the mouse to the right or left swings the front round.', back: 'Backwards at half rate.', side: 'Sideways at half rate.' }
      // (a step the rules refuse now is greyed, its reason on hover: `can`, worked out in status())
      const off = (key, extra = {}) => can[key] ? { ...extra, state: 'off', why: `Not now: ${can[key]}.` } : extra
      const press = (key, fn) => () => { if (!can[key]) fn() }
      const list = kindsNow().map(k => pip(k, words[k], press(k, () => chooseKind(k)), near, off(k, { why: why[k] })))
      list.push(pip('done', 'Done', finish, near, { why: 'Make the move (or right-click).' }))
      const grey = { className: 'normal-pip' }
      if (turnsAllowed()) {
        list.push(pip('tl', 'Turn left', press('turnL', () => turn(-1)), above, off('turnL', grey)), pip('tr', 'Turn right', press('turnR', () => turn(1)), above, off('turnR', grey)), pip('about', 'About face', press('about', () => turn(2)), above, off('about', grey)))
        if (u.formation === 'open' || isLumbering(u)) list.push(pip('qt', u.formation === 'open' ? 'Quick turn' : 'Pivot', press('quickTurn', quickTurn), above, off('quickTurn', grey)))
        list.push(pip('redress', 'Redress', press('redress', redress), above, off('redress', { ...grey, why: 'Change the frontage: Narrower / Wider, or [ and ].' })))
      }
      list.push(pip('undo', 'Undo', undo, above, grey), pip('cancel', 'Cancel', cancelMove, above, grey))
      return list
    },
    key (e) {
      // Ctrl+Z takes back the last step of the move being made (the Undo step button)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault?.(); undo(); return }
      if (kind === 'free' && (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E')) {
        freeTurned = true
        freeFacing += (e.key.toLowerCase() === 'q' ? -1 : 1) * Math.PI / 12
        if (current) current = { ...current, facing: freeFacing }
        status()
        return
      }
      if (kind === 'redress' && current) {
        if (e.key === '[') current.files = Math.max(filesOf(u) - 5, Math.max(1, current.files - 1))
        if (e.key === ']') current.files = Math.min(filesOf(u) + 5, Math.min(modelCount(u), current.files + 1))
        status()
      }
    },
    // right-click confirms the move; with nothing planned it cancels
    right () { if (current || plan.length) finish(); else cancelMove() },
    leave () { ui.board.setGhosts([]); ui.board.setGuides(null) }
  }
}

// A reform: the whole move; face the mouse, [ and ] set the frontage.
function reformMode (ui, u, free = false) {
  // (free: the reform on rallying, which is not its move)
  const commit = st => free ? freeReform(ui.game, u, st) : withUndo(ui, u, () => makeMove(ui.game, u, [st]))
  const game = ui.game
  let step = { type: 'reform', facing: u.facing, files: filesOf(u), formation: u.formation }
  // left-click holds the facing (the mouse no longer turns it; click again to free it), right-click confirms — as a move
  let held = false
  const confirm = () => { const r = commit(step); if (!r.ok) { say(game, 'bad', `Cannot reform: ${r.reason}.`); return } ui.setMode(null); ui.clearAsk(); render(ui) }
  const status = () => {
    const chk = checkMove(game, u, [step])
    const s = snapshot(u); applyStep(u, step, movementOf(u)); const g = { ...u, pos: { ...u.pos } }; restore(u, s)
    ui.board.setGhosts([{ unit: g, ok: chk.ok }])
    // Marching Column: say when the new frontage makes a Marching Column
    const col = isMarchingColumn(g) ? ` — MARCHING COLUMN (deeper than wide): next turn it may march at triple its Movement (${movementOf(u) * 3}"), but no Rank Bonus and no charging` : ` — narrower than it is deep would make a Marching Column (triple distance when marching)`
    ui.ask(`${u.name} REFORMS (its whole move): point with the mouse, [ and ] change the frontage (${step.files} wide${(g.formation === 'close' || g.formation === 'open') ? col : ''})${formationsOf(u).length > 1 ? `, F the formation (${FORMATION_NAMES[step.formation]})` : ''}. Left-click holds the facing${held ? ' (held — click again to free it)' : ''}; right-click confirms. ${chk.ok ? '' : 'Not allowed: ' + chk.reason}`, [
      ['Confirm (right-click)', confirm],
      ['Cancel', () => { ui.setMode(null); render(ui) }]
    ])
    ui.renderPips?.()
  }
  return {
    enter: status,
    move (p) { if (held) return; step = { ...step, facing: angleOf(sub(p, centre(u))) }; status() },
    down () { held = !held; status() },
    // the reform's pips over the ghost while the facing is held (ui/pips.js): the same as the keys and buttons
    pips () {
      if (!held) return []
      const s = snapshot(u); applyStep(u, step, movementOf(u)); const g = { ...u, pos: { ...u.pos } }; restore(u, s)
      const c = centre(g)
      const top = Math.min(...corners(g).map(q => q.y))
      const near = { x: c.x, y: top + 1 }
      const above = { x: c.x, y: top }
      const grey = { className: 'normal-pip' }
      const list = [
        { key: 'rf-ok', label: 'Confirm', at: near, onPress: confirm, why: 'Make the reform (or right-click).' },
        { key: 'rf-narrow', label: 'Narrower', at: near, onPress: () => this.key({ key: '[' }) },
        { key: 'rf-wide', label: 'Wider', at: near, onPress: () => this.key({ key: ']' }) }
      ]
      if (formationsOf(u).length > 1) list.push({ key: 'rf-form', label: `Formation: ${FORMATION_NAMES[step.formation]}`, at: near, onPress: () => this.key({ key: 'f' }) })
      list.push({ key: 'rf-free', label: 'Turn again', at: above, onPress: () => this.down(), why: 'Free the facing: the mouse turns it again.', ...grey })
      list.push({ key: 'rf-cancel', label: 'Cancel', at: above, onPress: () => { ui.setMode(null); render(ui) }, ...grey })
      return list
    },
    key (e) {
      if (e.key === '[') step.files = Math.max(1, step.files - 1)
      if (e.key === ']') step.files = Math.min(modelCount(u), step.files + 1)
      if (e.key === 'f' || e.key === 'F') { const fs = formationsOf(u); step.formation = fs[(fs.indexOf(step.formation) + 1) % fs.length] }
      status()
    },
    right: confirm,
    leave () { ui.board.setGhosts([]) }
  }
}

// ---------- shooting ----------
function shootMode (ui, u, weapon = null) {
  const game = ui.game
  return {
    enter () {
      const ts = shootingTargets(game, u)
      ui.board.setHighlights(new Map(ts.map(t => [t.unit.id, 0x7fe07f])))
      ui.ask(`${u.name}: click a target${isWarMachine(u) && machineWeapon(u)?.kind === 'cannon' ? ' unit (aims 5" short of it) or click the ground to aim at that point' : ''}. ${ts.length ? ts.map(t => `${t.unit.name} ${t.distance.toFixed(1)}"${t.long ? ' (long range)' : ''}`).join(', ') : 'No target in range and in sight.'}`, [['Cancel', () => { ui.setMode(null); render(ui) }]])
    },
    // a Shoot pip over each target in range and in sight (ui/pips.js); pressing one is clicking that unit
    pips () {
      return shootingTargets(game, u).map(t => ({ key: `shoot-${t.unit.id}`, unit: t.unit, label: `Shoot ${t.distance.toFixed(1)}"${t.long ? ' long' : ''}`, why: `${u.name} shoots at ${t.unit.name}, ${t.distance.toFixed(1)}" away${t.long ? ' (long range)' : ''}.`, onPress: () => this.down(centre(t.unit), t.unit) }))
    },
    async down (p, t) {
      // a cannon may aim at a point on the ground: click the ground
      // and it fires at that point, towards the enemy unit nearest to it
      const cannon = (isWarMachine(u) || weapon === 'machine') && machineWeapon(u)?.kind === 'cannon'
      let point = null
      if (!t && cannon) {
        point = p
        t = onTable(game).filter(o => o.side !== u.side).sort((a, b) => Math.hypot(centre(a).x - p.x, centre(a).y - p.y) - Math.hypot(centre(b).x - p.x, centre(b).y - p.y))[0]
      }
      if (!t || t.side === u.side) return
      ui.setMode(null)
      ui.clearAsk()
      await shoot(game, u, t, ui.askAsync, { point, weapon })
      // the arrows and the breath land before the casualties are taken off the table (view/shotFx.js)
      await ui.board?.settle?.()
      const ls = game.lastShot
      // a flame template (Breath Weapon): its outline
      if (ls?.kind === 'flame') ui.board.setLines(ls.poly.map((q, i) => ({ from: q, to: ls.poly[(i + 1) % ls.poly.length], colour: 0xff8040 })))
      if (ls?.kind === 'cannon') ui.board.setLines([{ from: ls.from, to: ls.strike, colour: 0xffffff, label: 'shot' }, { from: ls.strike, to: ls.end, colour: 0xff8040, label: 'bounce' }])
      if (ls?.kind === 'template') ui.board.setCircles([{ at: ls.at, r: ls.r, colour: 0xff8040 }])
      game.lastShot = null
      render(ui)
    },
    right () { ui.setMode(null); ui.clearAsk(); render(ui) }
  }
}

// ---------- a character joining a unit ----------
function joinMode (ui, c) {
  const game = ui.game
  return {
    enter () { ui.ask(`${c.name}: click a friendly unit within ${movementOf(c)}" to join it.`, [['Cancel', () => { ui.setMode(null); render(ui) }]]) },
    down (p, host) {
      if (!host || host === c) return
      const r = join(game, c, host)
      if (!r.ok) { say(game, 'bad', `${c.name} cannot join ${host.name}: ${r.reason}.`); return }
      ui.setMode(null); ui.clearAsk(); ui.select(host)
    },
    right () { ui.setMode(null); ui.clearAsk(); render(ui) }
  }
}

// ---------- casting a spell ----------
// `bound`: a Bound spell from a magic item (magic.js castBound), not a Wizard's own
function startCast (ui, w, s, bound = null) {
  const game = ui.game
  if (ui.busy) return
  const ctx = {
    ...spellEffects,
    // (the spell is drawn first, view/spellFx.js, and worked out as it strikes: the dead fall when it lands)
    resolve: async (g, caster, spell, target, c) => {
      await ui.board?.castSpellFx?.({ caster, spell, target, perfect: !!c?.perfect })
      return spellEffects.resolve(g, caster, spell, target, { ...c, pickPoint: (q, ok) => pickPoint(ui, q, ok) })
    }
  }
  const go = async target => {
    ui.setMode(null); ui.clearAsk()
    ui.busy = true
    try {
      let r = bound ? await castBound(game, w, bound, target, ui.askAsync, ctx) : await castSpell(game, w, s.slug, target, ui.askAsync, ctx)
      // Duplicitous Duplication (a ploy): after a successful casting (even dispelled), cast it
      // again at once (here at the same target), not counting as an attempt
      // (the spell's target is a unit, or a point for a Vortex)
      const targetGone = target?.status && target.status.removed
      if ((r?.cast || r?.dispelled) && !w.status.removed && !targetGone && !w.wizard?.noMoreThisTurn && await offerPloy(game, w.side, 'duplication', ui.askAsync, `${w.name} cast ${s.name}.`)) {
        const r2 = bound ? await castBound(game, w, { ...bound, singleUse: false }, target, ui.askAsync, ctx, { again: true }) : await castSpell(game, w, s.slug, target, ui.askAsync, ctx, { free: true })
        r = { cast: r?.cast || r2?.cast }
      }
      // wounds from an Assailment spell count in that combat's result (as Stand & Shoot wounds do)
      if (r?.cast && s.category === 'Assailment' && target?.status) target.status.standShootWounds = (target.status.standShootWounds || 0) + (target.status.woundsTaken || 0) - (target._woundsBefore || 0)
    } catch (e) {
      say(game, 'bad', `Error while casting ${s.name}: ${e.message}`)
      console.error(e)
    } finally { ui.busy = false }
    render(ui)
  }
  if (/self/i.test(s.range)) return go(null)
  // Range Magnification (the Channelling option): before choosing a target, one
  // Channelling die rolled adds that many inches to the spell's range
  if (game.options?.channelling && w.wizard && !bound && (w.wizard.channel || 0) > 0 && s.category !== 'Assailment' && !s._asked) {
    w.wizard.rangeBonus = 0
    ui.ask(`${w.name}: spend a Channelling die (${w.wizard.channel} left) to add a D6 inches to ${s.name}'s range (${s.range}) before choosing its target?`, [
      ['Magnify the range', () => { magnifyRange(game, w); startCast(ui, w, { ...s, _asked: true }) }],
      ['No', () => startCast(ui, w, { ...s, _asked: true })],
      ['Cancel', () => { ui.setMode(null); render(ui) }]
    ])
    return
  }
  if (s.category === 'Magical Vortex') {
    const from = hostOf(game, w) || w
    const range = vortexPointOk(game, w, s, centre(from)).range
    const cancel = () => { if (w.wizard) w.wizard.rangeBonus = 0; ui.setMode(null); ui.clearAsk(); render(ui) }
    ui.setMode({
      enter () { ui.ask(`${w.name}: click where the ${s.name} template goes (its centre within ${range}" of ${w.name}; not on any model).`, [['Cancel', cancel]]); ui.board.setCircles([{ at: centre(from), r: range, colour: 0x80c0ff }]) },
      down (p) {
        const ok = vortexPointOk(game, w, s, p)
        if (!ok.ok) { say(game, 'bad', `Not there: ${ok.reason}.`); return }
        go(p)
      },
      right: cancel
    })
    return
  }
  // Towering Conjuration (a ploy), before the target is chosen
  // (offered only when it would reach a unit the spell could not otherwise; spent when that unit is chosen)
  if (game.options?.arcane && canPloy(game, w.side, 'towering') && !s._towered && !/self/i.test(s.range) && s.category !== 'Assailment' &&
      spellTargets(game, w, s, { anywhere: true }).length > spellTargets(game, w, s).length) {
    ui.ask(`${sideName(game, w.side)}: play Towering Conjuration for ${s.name}? (any target, whatever its range or line of sight)`, [
      ['Play Towering Conjuration', () => startCast(ui, w, { ...s, _towered: 'yes', _asked: true }, bound)],
      ['No', () => startCast(ui, w, { ...s, _towered: 'no', _asked: true }, bound)],
      ['Cancel', () => { ui.setMode(null); render(ui) }]
    ])
    return
  }
  const ts = spellTargets(game, w, s, { anywhere: s._towered === 'yes' })
  // a magnified range belongs to this one attempt
  const giveUp = () => { if (w.wizard) w.wizard.rangeBonus = 0; ui.setMode(null); ui.clearAsk(); render(ui) }
  if (!ts.length) { if (w.wizard) w.wizard.rangeBonus = 0; say(game, 'bad', `${s.name}: no target in range and in ${w.name}'s vision arc.`); return }
  ui.setMode({
    enter () {
      ui.board.setHighlights(new Map(ts.map(t => [t.id, 0x80c0ff])))
      ui.ask(`${w.name}: click the target for ${s.name} (${s.range}${w.wizard?.rangeBonus ? ` + ${w.wizard.rangeBonus}" magnified` : ''}). ${ts.map(t => t.name).join(', ')}`, [['Cancel', giveUp]])
    },
    down (p, t) {
      if (!t || !ts.includes(t)) return
      // Towering Conjuration is spent only when it was needed for this target
      if (s._towered === 'yes' && !spellTargets(game, w, s).includes(t)) usePloy(game, w.side, 'towering', `${w.name}'s ${s.name} strikes at ${t.name}, beyond its range or sight`)
      t._woundsBefore = t.status.woundsTaken || 0
      go(t)
    },
    right: giveUp
  })
}

// Release a Whirler: click where it lands, within 3" of its mob.
function releaseMode (ui, mob) {
  const game = ui.game
  ui.setMode({
    enter () {
      ui.board.setCircles([{ at: centre(mob), r: 3 + Math.hypot(mob.base.w * filesOf(mob), mob.base.d) / 2, colour: 0xffa040 }])
      ui.ask(`${mob.name}: click where the Whirler lands (its base within 3" of the mob, touching no other model).`, [['Cancel', () => { ui.setMode(null); render(ui) }]])
    },
    down (p) {
      const r = releaseWhirler(game, mob, p)
      if (!r.ok) { say(game, 'bad', `Not there: ${r.reason}.`); return }
      ui.setMode(null); ui.clearAsk(); ui.select(mob); render(ui)
    },
    right () { ui.setMode(null); ui.clearAsk(); render(ui) },
    leave () { ui.board.setCircles([]) }
  })
}

// The Vanguard moves after deployment (rules/vanguard.js): each player in turn picks a Vanguard
// unit and moves it (no march), or lets it stay; `done` is called when no Vanguard move is left.
export function vanguardStage (ui, done) {
  const game = ui.game
  const step = () => {
    if (!game.vanguard) { done(); return }
    const side = game.vanguard.turn
    const us = vanguardUnits(game, side)
    ui.ask(`${sideName(game, side)}: a Vanguard move (no march). Which unit?`, us.flatMap(u => [
      [`Move ${u.name}`, () => {
        ui.select(u)
        const commit = plan => vanguardMove(game, u, plan)
        commit.after = step
        ui.setMode(moveMode(ui, u, false, false, false, commit))
      }],
      [`${u.name}: stay`, () => { vanguardPass(game, u); step() }]
    ]))
    ui.refresh()
  }
  step()
}

function pickPoint (ui, question, ok, cancelLabel = 'Do not move it') {
  return new Promise(resolve => {
    ui.setMode({
      enter () { ui.ask(question, [[cancelLabel, () => { ui.setMode(null); resolve(null) }]]) },
      // (answer first: leaving the mode would otherwise answer 'no point' before the click counts)
      down (p) { if (!ok(p)) { say(ui.game, 'bad', 'Not there.'); return } resolve(p); ui.setMode(null); ui.clearAsk() },
      right () { ui.setMode(null); ui.clearAsk(); resolve(null) },
      // if anything else takes over the table, the question is answered "do not move it"
      leave () { resolve(null) }
    })
  })
}
