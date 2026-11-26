// Which mounts a character may ride in the game so far, and finding a mount's data. Used by units.js, roster.js and
// the army screen (ui/lists.js).
//
// A character may ride a steed (cavalry), a ridden monster or a chariot. In the game: cavalry mounts (numeric
// Movement, or a rolled one with Random Movement: the Giant Cave Gobbler), ridden monsters (behemoths and monstrous
// creatures) and chariots (CHARIOT_MOUNTS below).

import { MOUNTS } from '../data/armies.js'

// the army lists name some mounts more briefly than their own entries do
// (a Lyonnese Damsel's or Sergeant's 'Warhorse' is the Lyonnese warhorse)
const ALIASES = { griffon: 'royal griffon', warhorse: 'lyonnese warhorse' }
export const mountFor = name => {
  const k = (name || '').replace(/\s*\{[^}]*\}/, '').toLowerCase().trim()
  return MOUNTS[k] || MOUNTS[ALIASES[k]] || null
}
const tt = m => (m?.troopType || []).join(' ')
const numericM = m => /^\d+$/.test(String(m?.profile?.[0]?.M))
const rolledM = m => /^\d*D6$/i.test(String(m?.profile?.[0]?.M)) && (m.specialRules || []).some(r => (r.name || r) === 'Random Movement')
export const isCavalryMount = m => !!m && /Cavalry/.test(tt(m)) && (numericM(m) || rolledM(m))
export const isRiddenMonster = m => !!m && /Behemoth|Monstrous Creature/.test(tt(m)) && numericM(m) && m.profile.length === 1
// Split Profile Chariot Mount: a character may ride a chariot of its army list;
// it is fielded from that chariot's own unit entry (units.js chariotMountUp). The War Altar of
// Saint Halvar and the War Wagon have rules of their own not yet in the game.
// Broodmaw Spider: it has the Howdah rule and a crew of its own that the character joins, so it counts as a
// chariot mount, not a ridden monster
export const CHARIOT_MOUNTS = { 'boar chariot': 'rukka-boar-chariots', 'iron rukka boar chariot': 'iron-rukka-boar-chariot', 'wolf chariot': 'nipper-wolf-chariot', 'broodmaw spider': 'broodmaw-spider', 'realm war wagon': 'war-wagon', 'war altar of saint halvar': 'war-altar-of-saint-halvar', 'dominion chariot': 'dominion-chariot-special', 'bloodbeast chariot': 'bloodbeast-chariot', 'tuskboar chariot': 'tuskboar-chariots-', 'razorboar chariot': 'razergor-chariot', 'tiradel chariot': 'tiradel-chariots', 'lumaren skycutter': 'lumaren-skycutters', 'lion chariot of thessa': 'lion-chariot-of-thessa', 'coldscale chariot': 'coldscale-chariots', 'lashrunner chariot': 'lashrunner-chariots', 'skeleton chariot': 'skeleton-chariots' }
export const chariotMountEntry = name => CHARIOT_MOUNTS[(name || '').replace(/\s*\{[^}]*\}/, '').toLowerCase().trim()] || null
// (Borne Aloft: a Dwarf lord's Shieldbearers — a split profile, otherwise heavy infantry)
export const isShieldbearers = m => !!m && /^shieldbearers$/i.test(m.name || '')
export const isPlayableMount = m => isCavalryMount(m) || isRiddenMonster(m) || isShieldbearers(m)
// (Oathstone: an Oathstone is a stone to stand on, not a mount — units.js)
export const isPlayableMountName = name => /on foot|^oathstone$/i.test(name || '') || !!chariotMountEntry(name) || isPlayableMount(mountFor(name))
