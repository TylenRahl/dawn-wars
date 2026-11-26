// The Strategy phase: Start of Turn, Command, Conjuration and Rally Fleeing Troops.
// Exports the phase steps that the battle screen (ui/phases.js) calls.
//
// Rally: each fleeing unit takes a Leadership test; pass and it rallies, fail and it keeps fleeing.
// Heavy losses: under half its starting models, -1 Leadership to rally; under a quarter, only a natural double 1
//   rallies it.
// A unit that rallies may make a free reform, may not charge this turn and is treated as moving when it shoots.

import { crumble } from './vampires.js'
import { applyWounds } from './damage.js'
import { cloakOfSiriel } from './woodelves.js'
import { spellHits } from './spells.js'
import { drunken, maddeningAura } from './hornkin.js'
import { spiritOfVaelgrath, wilfulBeasts } from './dominion.js'
import { cagedFury } from './warMachines.js'
import { frogsRecover } from './arcane.js'
import { say, unitsOf } from './game.js'
import { modelCount, hasRule, distanceBetween } from './units.js'
import { leadershipTest, commandRange } from './leadership.js'
import { inAura, addEffect } from './spells.js'
import { testLeadership as testLeadershipRaw } from './dice.js'
const testLeadershipOwn = (game, ld) => testLeadershipRaw(game.rng, ld)

export function rallyPhase (game) {
  const fleeing = unitsOf(game, game.active).filter(u => u.placed && u.status.fleeing)
  if (!fleeing.length) { say(game, '', 'Rally fleeing troops: no unit is fleeing.'); return }
  for (const u of fleeing) rallyOne(game, u)
}

export function rallyOne (game, u, why = '') {
  const now = modelCount(u); const start = u.startCount || u.models.length
  const quarter = now < start / 4
  const half = now < start / 2
  const t = leadershipTest(game, u, {
    label: `${u.name} — Rally test${why} (${now} of ${start} models left${quarter ? ', below a quarter: only a double 1' : half ? ', below half: -1 Leadership' : ''})`,
    mod: half && !quarter ? -1 : 0,
    doubleOneOnly: quarter,
    kind: 'rally'
  })
  say(game, 'roll', t.text)
  if (t.passed) {
    u.status.fleeing = false
    u.status.rallied = true
    u.status.countsAsMoved = true
    u.status.fledFrom = null
    u.status.rallyTurn = `${game.round}:${game.active}`
    say(game, 'good', `${u.name} rallies. It may make a free reform now; it cannot charge this turn, and it shoots as a unit that moved.`)
  } else {
    say(game, 'bad', `${u.name} fails to rally${why ? ' (' + why.trim() + ')' : ''} and will flee again in the Compulsory Moves sub-phase.`)
  }
}

// Stupidity: unless fleeing or engaged, test Leadership at the Start of
// Turn; failed, it is Stupid until its next Start of Turn: no moving (except to flee), no
// shooting, and it must Hold if charged.
export function startOfTurn (game) {
  // (Scroll of Transmogrification: each frog rolls to change back — arcane.js)
  frogsRecover(game, game.active)
  // Caged Fury (warMachines.js)
  cagedFury(game, game.active)
  // Spirit of Vaelgrath (dominion.js)
  spiritOfVaelgrath(game, game.active)
  wilfulBeasts(game, game.active) // Wilful Beast (dominion.js)
  drunken(game, game.active) // Drunken (hornkin.js)
  // The Death of a General: each Start of Turn after the General fell (vampires.js)
  if (game.vcFallen?.[game.active]) crumble(game, game.active, leadershipTest, applyWounds)
  // Cloak of Siriel: Hernath, a D6 each Start of Turn, 5+ a Wound back (woodelves.js)
  for (const u of game.units.filter(u => u.side === game.active && u.placed)) cloakOfSiriel(game, u)
  for (const u of unitsOf(game, game.active).filter(u => u.placed)) {
    u.status.stupid = false
    if (!hasRule(u, 'Stupidity') || u.status.fleeing || u.status.engaged) continue
    const t = leadershipTest(game, u, { label: `${u.name} — Stupidity test`, reroll: inAura(game, 'bigSmartz', u) ? 'Big Smartz' : null })
    say(game, 'roll', t.text)
    if (!t.passed) { u.status.stupid = true; say(game, 'bad', `${u.name} is STUPID this turn: it will not move or shoot, and must Hold if charged.`) }
  }
}

// Rallying Cry: in the Command sub-phase, a character with Rallying Cry
// that is not engaged may make one fleeing friendly unit within its Command range test to rally.
// Its Command range: Command range / General and Battle Standard (leadership.js).
export function commandPhase (game) {
  // Maddening Aura (hornkin.js)
  maddeningAura(game, game.active, spellHits)
  const callers = unitsOf(game, game.active).filter(u => u.placed && hasRule(u, 'Rallying Cry') && !u.status.engaged && !u.status.fleeing)
  let any = false
  for (const c of callers) {
    const f = unitsOf(game, game.active).filter(u => u.placed && u.status.fleeing && !u.status.rallyCried && distanceBetween(c, u) <= commandRange(c))[0]
    if (!f) continue
    any = true
    f.status.rallyCried = true
    say(game, '', `${c.name} gives a Rallying Cry to ${f.name}.`)
    rallyOne(game, f, ' (Rallying Cry)')
  }
  if (!any) say(game, '', 'Command: no Rallying Cry to give (no fleeing unit within range of a character who can).')
}

// Big Ruck: once a game, in the Command sub-phase, the character tests its own
// Leadership; passed, until your next Start of Turn it, its mount and any Rukka unit it has joined
// re-roll natural 1s To Hit and claim +1 Melee Outcome.
export const canCallBigRuck = (game, u) => hasRule(u, 'Big Ruck') && !u.status.bigRuckUsed && u.placed && !u.status.removed && !u.status.fleeing && u.side === game.active
export function callBigRuck (game, u) {
  u.status.bigRuckUsed = true
  const ld = Math.max(...u.models.filter(m => m.wounds > 0).map(m => m.profile.Ld ?? 0))
  const t = testLeadershipOwn(game, ld)
  say(game, 'roll', `${u.name} calls the BIG RUCK!: Leadership test on its own Leadership ${ld}: rolled ${t.dice.join('+')}=${t.total} — ${t.passed ? 'PASSED' : 'FAILED'}.`)
  if (!t.passed) return false
  const host = u.status.joinedTo ? game.units.find(x => x.id === u.status.joinedTo) : null
  const rukkaUnit = host && /rukka/i.test(host.name) && !/nipper|hobgoblin/i.test(host.name) ? host : null
  for (const x of [u, rukkaUnit].filter(Boolean)) x.status.bigRuck = true
  addEffect(game, { kind: 'big-ruck', side: u.side, casterId: u.id, until: 'nextStartOfTurn', revert: () => { for (const x of [u, rukkaUnit].filter(Boolean)) x.status.bigRuck = false } })
  say(game, 'good', `BIG RUCK! ${[u, rukkaUnit].filter(Boolean).map(x => x.name).join(' and ')} re-roll natural 1s To Hit and add +1 to their Melee Outcome until the next turn.`)
  return true
}
