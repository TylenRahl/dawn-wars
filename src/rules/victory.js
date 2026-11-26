// Who has won: each unit's Victory Points (unitPoints), the score, and checkVictory, which the battle screen
// (ui/phases.js) calls. The battle ends after the last round (turn.js), or as soon as one army has nothing left
// on the table; then Victory Points decide it.
// Dead or Fled:
//   - an enemy unit destroyed or fled off the battlefield: all of its points;
//   - an enemy unit still fleeing at the end: half, rounding up;
//   - an enemy unit down to a quarter or less of its starting Unit Mass (or of its starting Wounds, when its Unit
//     Mass is its Wounds): half, rounding up.
// The King Is Dead: +100 if the enemy General was slain, fled off the battlefield or is fleeing at the end.
// Trophies of War: +50 for each enemy standard taken as a trophy (damage.js removeUnit records them), and +50 if
// the enemy Battle Standard Bearer was slain, fled off the battlefield or is fleeing at the end.

import { hornstoneVP, dtp } from './hornkin.js'
import { isDeathwhirl } from './dwarfs.js'
import { say, unitsOf } from './game.js'
import { isDead } from './units.js'
import { unitMass, troopType } from './troops.js'

export const unitPoints = u => u.cost ?? 0

function startingUS (u) {
  const tt = troopType(u)
  if (tt.us === 'wounds') return u.models.reduce((a, m) => a + (m.startW || 1), 0)
  return u.models.length * tt.us
}

export function score (game) {
  const vp = [0, 0]
  const why = [[], []]
  for (const u of game.units) {
    if (!u.placed && !u.status.offTable && !u.status.removed && !u.status.faySlain) continue
    // Whirlers score nothing either way (no page says; their 25 points are left out of their mob's too)
    if (u.status.whirler) continue
    const p = unitPoints(u)
    const other = 1 - u.side
    // (Aura of the Fay: the Verdant Knight counts as destroyed once he has been slain the first time)
    const gone = u.status.removed || isDead(u) || (u.status.faySlain > 0)
    // Deathwhirl: slain, no Victory Points; alive at the end, the enemy wins its points
    // (Rune of the Dishonoured: the same for its bearer)
    if (isDeathwhirl(u) || (u.items || []).includes('rune-of-the-dishonoured')) { if (!gone) { vp[other] += p; why[other].push(`${u.name} still seeks its doom ${p}`) } continue }
    if (gone) { vp[other] += p; why[other].push(`${u.name} destroyed or fled ${p}`) } else if (u.status.fleeing) { vp[other] += Math.ceil(p / 2); why[other].push(`${u.name} fleeing ${Math.ceil(p / 2)}`) } else if (unitMass(u) <= startingUS(u) / 4) { vp[other] += Math.ceil(p / 2); why[other].push(`${u.name} at a quarter strength or less ${Math.ceil(p / 2)}`) }
    if (u.isGeneral && (gone || u.status.fleeing)) { vp[other] += 100; why[other].push('The King is Dead 100') }
    if (u.isBSB && (gone || u.status.fleeing)) { vp[other] += 50; why[other].push('the Battle Standard Bearer slain, fled or fleeing 50') }
  }
  // Hornstones: controlling a Hornstone at the end, +200
  for (const c of hornstoneVP(game, dtp)) { vp[c.side] += 200; why[c.side].push(`${c.name} holds the Hornstone 200`) }
  for (const s of [0, 1]) for (const t of game.trophies?.[s] || []) { const v = t.value ?? 50; vp[s] += v; why[s].push(`Trophy of War: the standard of ${t.name ?? t} ${v}${v === 100 ? " (the Conqueror's Tapestry)" : ''}`) }
  return { vp, why }
}

// Ends the game if an army is gone. `final`: the last round is over, announce the result.
export function checkVictory (game, final = false) {
  if (game.phase === 'over' && game.result) return game.result
  const left = [0, 1].map(s => unitsOf(game, s).filter(u => (u.placed || u.reserve) && !u.status.whirler).length)
  if (!final && left[0] && left[1]) return null
  const { vp, why } = score(game)
  game.phase = 'over'
  const reason = !left[0] ? `${game.sides[0].name} has nothing left on the table` : !left[1] ? `${game.sides[1].name} has nothing left on the table` : 'the last round is over'
  const winner = vp[0] === vp[1] ? null : vp[0] > vp[1] ? 0 : 1
  say(game, 'h', `THE BATTLE IS OVER — ${reason}.`)
  for (const s of [0, 1]) say(game, '', `${game.sides[s].name}: ${vp[s]} Victory Points${why[s].length ? ' (' + why[s].join(', ') + ')' : ''}.`)
  say(game, 'h', winner == null ? 'A DRAW.' : `${game.sides[winner].name.toUpperCase()} WINS.`)
  game.result = { vp, winner }
  return game.result
}

