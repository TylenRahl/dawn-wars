// Arcane Magic, an optional rule for the Eight Threads (game.options.arcane). After spells are chosen each player
// rolls 2D6 six times on the Arcane Magic table to get six ploys (a result past its limit is rolled again); a player
// may use one ploy a phase, and a used ploy is discarded. Exports PLOYS and the functions that deal, offer and play
// them; used by magic.js, game.js and the battle screens (ui/battle.js, ui/phases.js).

import { say, sideName } from './game.js'
import { rollDice } from './dice.js'

export const PLOYS = {
  2: { id: 'towering', name: 'Towering Conjuration', limit: 1, when: 'before choosing a spell\'s target: any unit, whatever its range or sight' },
  3: { id: 'unseen', name: 'Unseen Assailment', limit: 2, when: 'to dispel with any Wizard, whatever its Dispel range, even engaged' },
  4: { id: 'duplication', name: 'Duplicitous Duplication', limit: 4, when: 'after casting a spell (even dispelled): cast it again, not counting as an attempt' },
  5: { id: 'twist', name: 'Twist of Fate', limit: null, when: 'after rolling on the Backlash table: re-roll it' },
  6: { id: 'fortune', name: 'Winds of Fortune', limit: null, when: 'when dispelling: roll an extra D6, discard the lowest; a double 1 can be avoided' },
  7: { id: 'fated', name: 'Fated Conjuration', limit: null, when: 'after a failed Casting roll or a backlash: re-roll the Casting roll' },
  8: { id: 'fortuitous', name: 'Fortuitous Intervention', limit: null, when: 'after a failed Dispel roll (even outclassed): re-roll it' },
  9: { id: 'power', name: 'Winds of Power', limit: null, when: 'when casting: roll an extra D6, discard the lowest; a double 1 can be avoided' },
  10: { id: 'confidence', name: 'Unerring Confidence', limit: 4, when: 'after a backlash, before the Backlash table: roll twice and choose' },
  11: { id: 'dissolution', name: 'Dissolution', limit: 2, when: 'when dispelling: the spell is dispelled, no roll needed' },
  12: { id: 'absolute', name: 'Absolute Power', limit: 1, when: 'after a natural double (not 1s) on a Casting roll that beats the casting value: a perfect invocation' }
}
const BY_ID = Object.fromEntries(Object.values(PLOYS).map(p => [p.id, p]))
export const ployName = id => BY_ID[id]?.name || id

export function generatePloys (game) {
  game.ploys = { 0: [], 1: [] }
  for (const side of [0, 1]) {
    const rolls = []
    while (game.ploys[side].length < 6) {
      const d = rollDice(game.rng, 2)
      const n = d[0] + d[1]
      const p = PLOYS[n]
      const have = game.ploys[side].filter(x => x === p.id).length
      if (p.limit != null && have >= p.limit) { rolls.push(`${n} (re-rolled: ${p.name} only ${p.limit})`); continue }
      rolls.push(`${n}`)
      game.ploys[side].push(p.id)
    }
    say(game, 'roll', `${sideName(game, side)} rolls its Arcane Magic ploys: ${rolls.join(', ')} — ${game.ploys[side].map(ployName).join(', ')}.`)
  }
}

const phaseKey = game => `${game.round}:${game.active}:${game.phase}`
// May `side` use ploy `id` now? (one ploy a phase for each player)
export function canPloy (game, side, id) {
  if (!game.options?.arcane || !game.ploys) return false
  if (!game.ploys[side]?.includes(id)) return false
  return game.ployUsed?.[side] !== phaseKey(game)
}
export function usePloy (game, side, id, text = '') {
  const k = game.ploys[side].indexOf(id)
  if (k < 0) return false
  game.ploys[side].splice(k, 1)
  game.ployUsed = { ...(game.ployUsed || {}), [side]: phaseKey(game) }
  say(game, 'h', `${sideName(game, side)} plays ${ployName(id)}${text ? ': ' + text : ''}. (${game.ploys[side].length} ploys left.)`)
  return true
}
// Ask the player whether to play a ploy now (false without an `ask`).
export async function offerPloy (game, side, id, ask, question) {
  if (!ask || !canPloy(game, side, id)) return false
  const yes = await ask(`${sideName(game, side)}: ${question} Play ${ployName(id)}? (${BY_ID[id].when})`, [[`Play ${ployName(id)}`, true], ['Keep it', false]])
  return !!yes && usePloy(game, side, id)
}
