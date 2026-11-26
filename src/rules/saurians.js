// The Saurians' own army rules, as small functions and tables that the shared rules modules call at the right moment
// (combat, damage, Leadership, magic and others; each comment says where).

import { say } from './game.js'
import { hasRule, alive, isDead } from './units.js'
import { rollDice } from './dice.js'

const live = c => !c.status?.removed && !isDead(c)
const turnKey = game => `${game.round}:${game.active}`

// Arcane Shield — a 5+ Ward (damage.js saveFor)
export const lizardWards = u => hasRule(u, 'Arcane Shield') ? [{ value: 5, source: 'the Arcane Shield' }] : []

// Cold Blooded — a Fear, Panic or Terror test rolls an extra D6 and discards the highest
// (leadership.js; the whole unit and its characters must have it)
export const coldBlooded = u => [u, ...(u.joined || [])].every(c => !live(c) || hasRule(c, 'Cold Blooded'))

// Obsidian Blades — a single non-magical hand weapon has AP -1 (not its mount) (combat.js)
export const obsidian = (a, w) => hasRule(a, 'Obsidian Blades') && !w.magic && /^hand weapon$/i.test(w.key || '')

// Impervious Defence — no flank or rear Melee Outcome bonus against it (combat.js)
export const impervious = u => hasRule(u, 'Impervious Defence')

// Aquatic — no Movement modifier for a water feature (a stream or a marsh here: the players
// agree which features are water; these two are) (movement.js, charge.js)
export const aquatic = u => hasRule(u, 'Aquatic')
export const WATER = ['stream', 'marsh']

// Drop Rocks — once a game, flying over an enemy unit not engaged in the Remaining Moves
// sub-phase: D3 S4 hits for each model that moved over it (every model here) (dwarfs.js bombsAway)
export function dropRocks (game, u, under, spellHits) {
  if (!hasRule(u, 'Drop Rocks') || u.status.rocksDropped) return false
  u.status.rocksDropped = true
  const n = alive(u).reduce(a => a + Math.ceil(rollDice(game.rng, 1)[0] / 2), 0)
  say(game, 'roll', `${u.name} DROP ROCKS on ${under.name}: D3 for each of ${alive(u).length} Cliffwing${alive(u).length === 1 ? '' : 's'} = ${n} Strength 4 hits.`)
  spellHits(game, under, n, 4, 0, { nonMagical: true, label: 'Drop Rocks: ' })
  return true
}

// Primeval Roar — once a game, in its own Command sub-phase, a Leadership test on its own
// Leadership; passed, friendly Saurians units within 7" have Furious Charge until the end of the turn (ui/phases.js)
export const canRoar = (game, u) => hasRule(u, 'Primeval Roar') && live(u) && u.side === game.active && !u.status.roared && !u.status.fleeing
export function primevalRoar (game, u, distanceBetween, addEffect, grant) {
  u.status.roared = true
  const ld = Math.max(0, ...alive(u).map(m => m.profile.Ld ?? 0)) || 7
  const d = rollDice(game.rng, 2)
  const ok = d[0] + d[1] === 2 || (d[0] + d[1] !== 12 && d[0] + d[1] <= ld)
  say(game, 'roll', `${u.name} — Primeval Roar: Leadership test ${d.join('+')} = ${d[0] + d[1]}, needs ${ld} or less — ${ok ? 'passed' : 'FAILED'}.`)
  if (!ok) return
  const units = game.units.filter(x => x.side === u.side && x.placed && live(x) && x.army === 'saurians' && distanceBetween(x, u) <= 7)
  for (const x of units) addEffect(game, { kind: 'ench', category: 'Roar', spell: 'Primeval Roar', side: u.side, casterId: u.id, unitId: x.id, until: 'endOfTurn', revert: grant(x, ['Furious Charge']) })
  say(game, 'good', `The Primeval Roar: ${units.length} unit${units.length === 1 ? '' : 's'} gain Furious Charge this turn.`)
}

// Monsoon — an enemy unit the moving template touches is 'drenched' for the rest of the game: -1 To Hit
// shooting; a drenched war machine rolls a D6 before shooting, on a 1 it does not shoot (shooting.js, spells.js)
export const drenched = u => !!u.status?.drenched
export function drenchedMachineFails (game, u) {
  if (!drenched(u) || !/war machine/i.test((u.troopType || []).join(' ') + ' ' + (u.category || ''))) return false
  const r = rollDice(game.rng, 1)[0]
  say(game, r === 1 ? 'bad' : 'roll', `${u.name} is drenched: D6 = ${r}${r === 1 ? ' — its powder is soaked, it does not shoot this turn' : ''}.`)
  return r === 1
}
