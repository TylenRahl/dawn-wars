// The Concord Realm's engines, the Iron Kettle and the War Wagon: Steam Power, Temperamental, the War Wagon's
// assorted weapons and the crew. Called by movement, charge, shooting and combat (each comment says which rule),
// and by the battle screen (ui/phases.js).

import { say } from './game.js'
import { rollDice } from './dice.js'
import { hasRule, alive } from './units.js'
import { applyWounds } from './damage.js'

const turnKey = game => `${game.round}:${game.active}`

// Steam Power — an Iron Kettle never marches; it may roll 2D6, keep the higher die, and add that to its Movement.
// Temperamental — a natural 1 on either die of its Steam Power or Charge roll:
// Bang! (it loses a single Wound) or Phweee! (it halts and cannot move again this turn); a natural 1 on
// both: it loses a Wound AND halts.
export const hasSteamPower = u => hasRule(u, 'Steam Power')
export function steamPowerRoll (game, u) {
  const dice = rollDice(game.rng, 2)
  const kept = Math.max(...dice)
  say(game, 'roll', `${u.name}: Steam Power roll ${dice.join(', ')}, keeps the highest — +${kept}" Movement this move.`)
  return { dice, kept, ones: dice.filter(d => d === 1).length }
}
// Apply Temperamental after a roll with `ones` natural 1s. `choice`: 'bang' or 'phweee' (its player's,
// asked when one die shows a 1). Returns true when it halts.
export function temperamental (game, u, ones, choice = 'bang') {
  if (!ones || !hasRule(u, 'Temperamental')) return false
  if (ones >= 2) {
    say(game, 'bad', `${u.name}: a natural 1 on both dice — Temperamental: the pressure is too great. It loses a Wound and halts for the rest of the turn.`)
    applyWounds(game, u, 1, 'Temperamental')
    u.status.halted = turnKey(game)
    return true
  }
  if (choice === 'phweee') {
    say(game, 'bad', `${u.name}: a natural 1 — Temperamental: PHWEEE! The pressure is let out; it halts and cannot move again this turn.`)
    u.status.halted = turnKey(game)
    return true
  }
  say(game, 'bad', `${u.name}: a natural 1 — Temperamental: BANG! It loses a single Wound.`)
  applyWounds(game, u, 1, 'Temperamental')
  return false
}
export const isHalted = (game, u) => u.status.halted === turnKey(game)

// Assorted weapons — six crew, each with one unique weapon: in the Shooting phase each
// with a missile weapon shoots it; in combat each uses its unique weapon or its hand weapon (its player's
// choice: asked once a combat for the crew, combat.js).
export const ASSORTED = {
  missile: ['blunderbuss', 'long rifle', 'repeating rifle'],
  combat: ['ball & chain', 'hooked halberd', 'man-catcher']
}
export const hasAssortedWeapons = u => u.entryId === 'war-wagon' || u.chariotMount === 'War Wagon' || /war wagon/i.test(u.chariotMount || '')

// Stable Firing Platform — the War Wagon's crew may shoot even if it marched
export const stableFiringPlatform = u => hasRule(u, 'Stable Firing Platform')

// Grinding Wheels — low linear obstacles are open terrain to an Iron Kettle;
// Crushing Weight — dangerous terrain to a War Wagon (other chariots: impassable,
// Iron Shod Wheels)
export const wallsAs = u => hasRule(u, 'Grinding Wheels') ? 'open' : hasRule(u, 'Crushing Weight') ? 'dangerous' : 'impassable'

export const crewModel = u => alive(u)[0]
