// Troop types: how many models a rank needs to count for the Rank Bonus, the most Rank Bonus the unit can claim,
// and its Unit Mass (TROOP_TYPES, troopType, unitStrength, maxRankBonus). Used by combat, shooting, charges,
// movement, magic and several army modules.
//
// Per troop type: Unit Mass per model; models a rank needs; largest Rank Bonus
//   Infantry: regular (UM 1; 5 a rank; +2), heavy (UM 1; 4; +2), monstrous (UM 3; 3; +2); swarms UM 3, no Rank Bonus
//   Cavalry: light (UM 2; 5; +1), heavy (UM 2; 4; +1), monstrous (UM 3; 3; +1); war beasts (UM 1; 5; +1)
//   Chariots: light (UM 3; 3; +1), heavy UM 5 and no Rank Bonus
//   Monstrous creatures, behemoths and war machines: Unit Mass = starting Wounds, no Rank Bonus
// Unit Mass: models now in the unit x Unit Mass per model.
// Horde: Horde adds one to the maximum Rank Bonus.

import { alive, hasRule } from './units.js'

const W = 'wounds' // Unit Mass per model = its starting Wounds
export const TROOP_TYPES = {
  'Regular Infantry': { rankWidth: 5, maxRanks: 2, us: 1 },
  'Heavy Infantry': { rankWidth: 4, maxRanks: 2, us: 1 },
  'Monstrous Infantry': { rankWidth: 3, maxRanks: 2, us: 3 },
  Swarms: { rankWidth: null, maxRanks: 0, us: 3 },
  'Light Cavalry': { rankWidth: 5, maxRanks: 1, us: 2 },
  'Heavy Cavalry': { rankWidth: 4, maxRanks: 1, us: 2 },
  'Monstrous Cavalry': { rankWidth: 3, maxRanks: 1, us: 3 },
  'War Beasts': { rankWidth: 5, maxRanks: 1, us: 1 },
  'Light Chariot': { rankWidth: 3, maxRanks: 1, us: 3 },
  'Heavy Chariot': { rankWidth: null, maxRanks: 0, us: 5 },
  'Monstrous Creature': { rankWidth: null, maxRanks: 0, us: W },
  Behemoth: { rankWidth: null, maxRanks: 0, us: W },
  'War Machine': { rankWidth: null, maxRanks: 0, us: W }
}
const ALIASES = { Swarm: 'Swarms', 'Light Chariots': 'Light Chariot', 'Heavy Chariots': 'Heavy Chariot', 'Monstrous Creatures': 'Monstrous Creature', Behemoths: 'Behemoth', 'War Machines': 'War Machine' }

export function troopType (u) {
  for (const t of u.troopType || []) {
    const k = ALIASES[t] || t
    if (TROOP_TYPES[k]) return { name: k, ...TROOP_TYPES[k] }
  }
  return { name: 'Regular Infantry', ...TROOP_TYPES['Regular Infantry'] }
}

export function unitMass (u) {
  // characters add their Unit Mass to a unit they join (Unit Mass Characters)
  return ownStrength(u) + (u.joined || []).filter(c => !c.status.removed && c.models.some(m => m.wounds > 0)).reduce((a, c) => a + ownStrength(c), 0)
}
function ownStrength (u) {
  const tt = troopType(u)
  if (tt.us === W) return alive(u).reduce((a, m) => a + (m.startW || m.profile.W || 1), 0)
  return alive(u).length * tt.us
}

export function maxRankBonus (u) {
  return troopType(u).maxRanks + (hasRule(u, 'Horde') ? 1 : 0)
}
