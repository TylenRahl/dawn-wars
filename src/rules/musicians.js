// Musicians: whether a unit's musician is playing (musicianPlays) and Onwards to Victory. A unit's musician is the
// model with role 'musician' (units.js); while any rank-and-file model is left, one of them picks up the instrument
// when the musician falls (damage.js removes casualties in that order). Used by leadership.js and combat.js.

import { alive, isDead } from './units.js'
import { itemFlag } from './items.js'

const live = c => !c.status?.removed && !isDead(c)

// A unit that has a musician whose rules work: Cacophonous Dirge — not while the unit is within 18" of
// an enemy bearer of the Cacophonous Dirge
export function musicianPlays (game, u, distanceBetween, hostOf) {
  // (Chalice Reliquary: the Chalice Reliquary counts as a musician for its unit)
  if (!alive(u).some(m => m.role === 'musician' || m.role === 'reliquae')) return false
  const dirge = (game?.units || []).find(c => c.side !== u.side && c.placed && live(c) && itemFlag(c, 'dirge', { personal: true }) && distanceBetween(hostOf(game, c) || c, u) <= 18)
  return !dirge
}

// (the +1 to Rally and march tests: leadership.js leadershipTest)

// Onwards to Victory — a drawn combat: the side with a musician (in the front rank: always, here)
// in one or more of its units +1, unless the other side has one too. Returns the side that gains it, or null.
export function onwardsToVictory (game, sides, distanceBetween, hostOf) {
  const has = [0, 1].map(s => sides[s].some(u => live(u) && musicianPlays(game, u, distanceBetween, hostOf)))
  return has[0] && !has[1] ? 0 : has[1] && !has[0] ? 1 : null
}
