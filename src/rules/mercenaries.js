// Mercenaries: Royal Ogres with the Concord Realm, Scorchlands Ogre Bulls with the Rukka & Nippers. Exports
// isMercenary, commanderOf and misbehavingMercenaries, used by joining.js, leadership.js and game.js.
// Mercenaries may not use the General's Inspiring Presence or a Battle Standard's Hold Your Ground, and may not be
//   joined by characters from another army list (here: any character of the army they fight for).
// Mercenary Commander: with Konrad von Falkenrode as the General they may use his Inspiring Presence and be joined
//   by him, and they do not roll for Misbehaving Mercenaries.

import { say } from './game.js'
import { d6 } from './dice.js'
import { hasRule } from './units.js'

export const isMercenary = u => hasRule(u, 'Mercenaries')
export const commanderOf = (game, side) => game.units.find(c => c.side === side && c.isGeneral && hasRule(c, 'Mercenary Commander') && !c.status?.removed)

// Misbehaving Mercenaries — before deployment, a D6 for each mercenary unit: a 1
// rolls on the Misbehaving Mercenaries table.
export function misbehavingMercenaries (game) {
  for (const u of game.units.filter(isMercenary)) {
    if (commanderOf(game, u.side)) { say(game, '', `${u.name}: Konrad von Falkenrode leads the army — no roll for Misbehaving Mercenaries (Mercenary Commander).`); continue }
    const r = d6(game.rng)
    if (r >= 2) { say(game, 'roll', `${u.name} (Mercenaries): D6 = ${r} — they hold up their side of the contract.`); continue }
    const t = d6(game.rng)
    const head = `${u.name} (Mercenaries): D6 = 1 — Misbehaving Mercenaries table D6 = ${t}`
    if (t === 1) {
      // (one that is Stupid already adds +1 to its Stupidity tests: not in the game, no mercenary here has it)
      u.special.add('Stupidity')
      say(game, 'bad', `${head}: HEAVY NIGHT — they gain Stupidity.`)
    } else if (t <= 3) {
      for (const m of u.models) m.profile = { ...m.profile, M: Math.max(1, (m.profile.M ?? 1) - 1), I: Math.max(1, (m.profile.I ?? 1) - 1) }
      say(game, 'bad', `${head}: YOU GET WHAT YOU PAY FOR — -1 Movement and Initiative for the battle.`)
    } else if (t <= 5) {
      u.special.add('Ambushers')
      u.reserve = true
      u.mercLate = true // (with Ambushers already: arriving in round 2 only on a natural 6 — none here has it)
      say(game, 'bad', `${head}: "SORRY, THE COCKEREL DIDN'T CROW" — they gain Ambushers and are held in reserve.`)
    } else {
      for (const m of u.models) m.profile = { ...m.profile, Ld: Math.max(2, (m.profile.Ld ?? 2) - 1) }
      say(game, 'bad', `${head}: GENERAL APATHY — -1 Leadership for the battle.`)
    }
  }
}
