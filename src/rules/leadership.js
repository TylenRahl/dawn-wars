// Leadership: whose Leadership a unit tests on, whether it may re-roll, and the test itself (leadershipTest).
// Used by nearly every phase: Panic, Fear and Terror, Break and Rally tests all come through here.
//
// Command range: a character's Command range is its Leadership in inches.
// General and Battle Standard: for these two it is 12" instead (18" with Large Target, on foot or mounted).
// Inspiring Presence: friendly units within the General's Command range may use its Leadership, unless it flees.
// Hold Your Ground: inside the Battle Standard Bearer's Command range, a friendly unit gets a re-roll of a failed
//   Panic or Rally test and of the 2D6 for a Break test, unless the bearer flees.

import { musicianPlays } from './musicians.js'
import { beaconNear, willOfDragons, grandStrategist } from './shen.js'
import { quellsPanic } from './chaosdwarfs.js'
import { coldBlooded } from './saurians.js'
import { weaponTeamLd } from './gnawkin.js'
import { commandingVoice } from './highelves.js'
import { boldest, treeSpiritLd, wraithstoned, lamenting } from './woodelves.js'
import { abyssalHowl, cryOfWar } from './darkelves.js'
import { fearsomeEdifice, dtp } from './hornkin.js'
import { sightTo } from './sight.js'
import { undividedReroll, brannocNear } from './dominion.js'
import { venerableNear } from './dwarfs.js'
import { peasantLeader, questingReroll, levyReroll } from './lyonne.js'
import { rollDice } from './dice.js'
import { isMercenary, commanderOf } from './mercenaries.js'
import { trollCalla } from './trolls.js'
import { hostOf } from './joining.js'
import { distanceBetween, hasRule, isDead } from './units.js'
import { testLeadership } from './dice.js'
import { rankBonus } from './combat.js'
import { nearAura } from './spells.js'
import { itemFlag } from './items.js'

export function commandRange (u) {
  // (Glutton's Almanac: +3")
  // (Commanding Voice: Seriel Vane +3")
  const cook = ((u.items || []).includes('gluttons-almanac') ? 3 : 0) + commandingVoice(u)
  if (u.isGeneral || u.isBSB) return (hasRule(u, 'Large Target') ? 18 : 12) + cook
  // Symbol of Might: a Lector of Saint Halvar on the War Altar: 12" (18" as the General, above)
  if (hasRule(u, 'Symbol of Might')) return 12
  return Math.max(0, ...u.models.filter(m => m.wounds > 0).map(m => m.profile.Ld ?? 0)) + cook
}
export const INSPIRE_RANGE = 12

// Holy Fervour: while the War Altar is not fleeing, friendly units up to 6" away pass Fear tests without rolling
// and may re-roll failed Panic tests
export const holyFervour = (game, u) => game.units.some(a => a.side === u.side && a.placed && !a.status.removed && !isDead(a) && !a.status.fleeing && hasRule(a, 'Holy Fervour') && (a === u || distanceBetween(hostOf(game, a) || a, u) <= 6))

// the highest Leadership in the unit, its joined characters included (Leadership tests)
// The General or the Battle Standard Bearer of a side, joined to a unit or not, and where to
// measure from (its unit when it has joined one).
function leader (game, side, key) {
  const c = game.units.find(o => o.side === side && o[key] && o.placed && !o.status.removed && !isDead(o) && !o.status.fleeing)
  return c ? { c, at: hostOf(game, c) || c } : null
}
const within = (game, l, u) => l && (l.c === u || l.at === u || distanceBetween(l.at, u) <= commandRange(l.c))

// (a chariot's or war machine's Leadership is its crew's — split profiles)
const bestLd = u => Math.max(...[u, ...(u.joined || []).filter(c => !c.status.removed)].flatMap(x => [...x.models.filter(m => m.wounds > 0).map(m => m.profile.Ld ?? 0), ...(x.crew || []).map(c => c.profile.Ld ?? 0)]), 0)

// Warband: unless fleeing, a Warband adds its current Rank Bonus to its
// Leadership (to at most 10) — but not for a Restraint test, nor for an Impetuous test.
export function leadershipFor (game, u, opts = {}) {
  const r = leadershipFor0(game, u, opts)
  // Spiritual Vortex: within 8" of an enemy Spiritual Vortex, -1 Leadership (min 2)
  let out = r
  // Commander and Captain: Marauders near Brannoc +1 (to 10) (dominion.js)
  // Master of Mortals: the same within the Command range of a character with this Gift
  if (/^(dominion-marauders|marauder-horsemen)/.test(u.entryId || '') && game.units.some(c => c.side === u.side && c.placed && !c.status.removed && !isDead(c) && !c.status.fleeing && itemFlag(c, 'masterOfMortals', { personal: true }) && distanceBetween(hostOf(game, c) || c, u) <= commandRange(c))) out = { value: Math.min(10, out.value + 1), from: [out.from, 'Master of Mortals +1'].filter(Boolean).join(', ') }
  if (u.status?.manreaver === `${game.round}:${game.active}`) out = { value: Math.max(2, out.value - 1), from: [out.from, 'Manreaver -1'].filter(Boolean).join(', ') }
  // Manbane Standard: enemy units within 6" of its carrier -1 (min 2)
  if (!itemFlag(u, 'ladysGrace') && game.units.some(c => c.side !== u.side && c.placed && !c.status.removed && !isDead(c) && itemFlag(c, 'manbane') && distanceBetween(hostOf(game, c) || c, u) <= 6)) out = { value: Math.max(2, out.value - 1), from: [out.from, 'Manbane Standard -1'].filter(Boolean).join(', ') }
  // Rune of the Beast Ascendant: Greathorn, Hornkin and Lesserhorn Herds within the bearer's Command range +1 (to 10)
  if (/^(greathorn-herds|hornkin-herds|hornkin$|lesserhorn)/.test(u.entryId || '') && game.units.some(c => c.side === u.side && c.placed && !c.status.removed && !isDead(c) && !c.status.fleeing && itemFlag(c, 'ascendant', { personal: true }) && distanceBetween(hostOf(game, c) || c, u) <= commandRange(c))) out = { value: Math.min(10, out.value + 1), from: [out.from, 'Rune of the Beast Ascendant +1'].filter(Boolean).join(', ') }
  // Doom Totem: an enemy unit that can see the totem's bearer -1 (min 2)
  if (!itemFlag(u, 'ladysGrace') && game.units.some(c => c.side !== u.side && c.placed && !c.status.removed && !isDead(c) && itemFlag(c, 'doomTotem') && sightTo(game, u, hostOf(game, c) || c).sees)) out = { value: Math.max(2, out.value - 1), from: [out.from, 'Doom Totem -1'].filter(Boolean).join(', ') }
  if (brannocNear(game, u, commandRange)) out = { value: Math.min(10, out.value + 1), from: [out.from, 'Brannoc +1'].filter(Boolean).join(', ') }
  if (nearAura(game, 'spiritualVortex', u, 8)) out = { value: Math.max(2, out.value - 1), from: [out.from, 'Spiritual Vortex -1'].filter(Boolean).join(', ') }
  // Grisly Trophy Rack: enemy units within 6" of the bearer -1 Leadership (min 2)
  if (game.units.some(c => c.side !== u.side && c.placed && !c.status.removed && !isDead(c) && itemFlag(c, 'trophyRack', { personal: true }) && distanceBetween(hostOf(game, c) || c, u) <= 6)) out = { value: Math.max(2, out.value - 1), from: [out.from, 'Grisly Trophy Rack -1'].filter(Boolean).join(', ') }
  // Weapon Team Leadership: within 3" of its parent, + the parent's Rank Bonus (to 10) (gnawkin.js)
  const wtl = weaponTeamLd(game, u, distanceBetween, rankBonus)
  if (wtl) out = { value: Math.min(10, out.value + wtl), from: [out.from, `its parent's Rank Bonus +${wtl}`].filter(Boolean).join(', ') }
  // Wraithstone: enemy units within 6" of its bearer (not fleeing) -1 (min 2)
  if (!itemFlag(u, 'ladysGrace') && wraithstoned(game, u, distanceBetween)) out = { value: Math.max(2, out.value - 1), from: [out.from, 'the Wraithstone -1'].filter(Boolean).join(', ') }
  // Abyssal Howl (not cumulative, min 2), Cry of War: -1 (no minimum given: 1)
  if (!itemFlag(u, 'ladysGrace') && abyssalHowl(game, u, distanceBetween)) out = { value: Math.max(2, out.value - 1), from: [out.from, 'Abyssal Howl -1'].filter(Boolean).join(', ') }
  if (!itemFlag(u, 'ladysGrace') && cryOfWar(game, u, distanceBetween, commandRange)) out = { value: Math.max(1, out.value - 1), from: [out.from, 'Cry of War -1'].filter(Boolean).join(', ') }
  // Boldest of the Bold: Faelan ignores every negative modifier to his Leadership
  if (boldest(u) && out.value < r.value) out = { ...r, from: [r.from, 'Boldest of the Bold: no negative modifiers'].filter(Boolean).join(', ') }
  return out
}
function leadershipFor0 (game, u, { noWarband = false } = {}) {
  // Gathering Darkness, Spirit Leech, a Spiritual Vortex: no Inspiring Presence for this unit
  // (Levies: Levies cannot use Inspiring Presence nor Hold Your Ground)
  // (Mercenaries: nor Mercenaries, unless Konrad von Falkenrode is the General — mercenaries.js)
  const noInspire = itemFlag(u, 'darkHeart') || u.status.noInspire || nearAura(game, 'spiritualVortex', u, 8) || hasRule(u, 'Levies') || (isMercenary(u) && !commanderOf(game, u.side))
  let own = bestLd(u)
  // Regimental Leadership: a detachment within 3" of its regimental unit
  // (not fleeing) may use the regiment's Leadership if it is higher
  const reg = u.regiment
  let regimental = ''
  // (the regimental unit's own Leadership: not a character joined to it)
  const regLd = reg ? Math.max(0, ...reg.models.filter(m => m.wounds > 0).map(m => m.profile.Ld ?? 0)) : 0
  if (reg && reg.placed && !reg.status.removed && !isDead(reg) && !reg.status.fleeing && distanceBetween(u, reg) <= 3 && regLd > own) { own = regLd; regimental = `${reg.name}'s Leadership ${own} (Regimental Leadership)` }
  // (lyonne.js: Peasantry within 6" of a knight with a Vow use the knight's Leadership)
  const peasant = peasantLeader(game, u)
  if (peasant && peasant.value > own) { own = peasant.value; regimental = peasant.from }
  // (trolls.js: Troll Mobs within Mick Bogwallop's Command range may use his Leadership)
  const calla = trollCalla(game, u, commandRange)
  if (calla && calla.value > own) { own = calla.value; regimental = calla.from }
  let warband = ''
  if (!noWarband && hasRule(u, 'Warband') && !u.status.fleeing) {
    const rb = rankBonus(game, u)
    if (rb > 0 && own < 10) { const was = own; own = Math.min(10, own + rb); warband = `Warband: ${was} + Rank Bonus ${rb} = ${own}` }
  }
  if (warband) {
    const gl = leader(game, u.side, 'isGeneral')
    if (!noInspire && gl && within(game, gl, u) && treeSpiritLd(u, gl.c) && bestLd(gl.c) > own) return { value: bestLd(gl.c), from: `the General's Leadership ${bestLd(gl.c)}, Inspiring Presence` }
    return { value: own, from: warband }
  }
  const gl = leader(game, u.side, 'isGeneral')
  // Tree Spirit: a Tree Spirit unit uses the Leadership of Tree Spirit characters only
  if (!noInspire && gl && within(game, gl, u) && treeSpiritLd(u, gl.c)) {
    const g = bestLd(gl.c)
    if (g > own) return { value: g, from: `the General's Leadership ${g}, Inspiring Presence` }
  }
  // Grand Strategist: or a Magistrate's, within its Command range (not for the General — shen.js)
  if (!noInspire) { const gs = grandStrategist(game, u, distanceBetween, commandRange, hostOf); if (gs && gs.ld > own) return { value: gs.ld, from: `${gs.c.name}'s Leadership ${gs.ld} (Grand Strategist)` } }
  // (Tree Spirit: or that of a friendly Tree Spirit character, not fleeing, within its Command range)
  if (!noInspire && hasRule(u, 'Tree Spirit')) {
    const ts = game.units.filter(c => c !== u && c.side === u.side && c.placed && !c.status.removed && !isDead(c) && !c.status.fleeing && (c.troopType || []).includes('Character') && hasRule(c, 'Tree Spirit') && distanceBetween(hostOf(game, c) || c, u) <= commandRange(c)).sort((x, y) => bestLd(y) - bestLd(x))[0]
    if (ts && bestLd(ts) > own) return { value: bestLd(ts), from: `${ts.name}'s Leadership ${bestLd(ts)} (Tree Spirit)` }
  }
  return { value: own, from: regimental || null }
}

const imperialNear = (game, u) => game.units.some(c => c.side === u.side && c.placed && !c.status.removed && !isDead(c) && (itemFlag(c, 'royalBanner') || (c.joined || []).some(j => itemFlag(j, 'royalBanner'))) && (c === u || distanceBetween(hostOf(game, c) || c, u) <= commandRange(c)))
export function bsbNear (game, u) {
  if (hasRule(u, 'Levies') || isMercenary(u)) return false
  return !!within(game, leader(game, u.side, 'isBSB'), u)
}

// A Leadership test with every helper applied, described for the log.
// `mod` is a modifier to the Leadership value; `natural11` is the "only a double 1" case.
// Veteran: a unit mostly of Veterans re-rolls failed Leadership tests.
// `kind`: 'panic' or 'rally' let the Battle Standard re-roll a failure.
export function leadershipTest (game, u, { mod = 0, label = 'Leadership test', doubleOneOnly = false, noWarband = false, reroll = null, kind = null } = {}) {
  const ld = leadershipFor(game, u, { noWarband })
  // Rune of Courage: its unit passes any Fear or Terror test automatically
  if ((kind === 'fear' || kind === 'terror') && itemFlag(u, 'courage')) return { passed: true, dice: [], total: 0, need: ld.value, rerolled: false, text: `${label}: passed automatically (Rune of Courage)` }
  // (Banner of the Mere's Grace: its unit ignores negative modifiers to its Leadership)
  // Hornstones, Fearsome Edifice: an enemy within 12" of a Hornkin Hornstone, -1 for Fear, Panic, Terror
  if (['fear', 'panic', 'terror'].includes(kind) && fearsomeEdifice(game, u, dtp)) mod -= 1
  // Dark Majesty: a Fear or Terror test within the Command range of an enemy with it, -1 (min 2)
  if ((kind === 'fear' || kind === 'terror') && game.units.some(c => c.side !== u.side && c.placed && !c.status.removed && !isDead(c) && !c.status.fleeing && itemFlag(c, 'darkMajesty', { personal: true }) && distanceBetween(hostOf(game, c) || c, u) <= commandRange(c))) mod -= 1
  // A Keening of Sorrows: within 6" of an enemy with it, -1 for Fear, Panic and Terror tests
  if (['fear', 'panic', 'terror'].includes(kind) && lamenting(game, u, distanceBetween)) mod -= 1
  // (Boldest of the Bold: Faelan ignores negative modifiers)
  if (mod < 0 && (itemFlag(u, 'ladysGrace') || boldest(u))) mod = 0
  // Steadying Rhythm (a Rally test), Quick Time (the test to march within
  // 8" of an enemy): a musician +1, to a maximum of 10 (musicians.js)
  const music = (kind === 'rally' || kind === 'march') && !doubleOneOnly && ld.value + mod < 10 && musicianPlays(game, u, distanceBetween, hostOf)
  if (music) mod += 1
  const need = Math.max(2, ld.value + mod)
  // The Banner of The Dark Heart (its unit), Royal Banner (friendly units within the carrier's
  // Command range): a Fear, Panic or Terror test rolls 3D6 and discards the highest
  const fearLike = ['fear', 'panic', 'terror'].includes(kind)
  // (Cold Blooded: the Saurians the same — saurians.js)
  const third = fearLike && (itemFlag(u, 'darkHeart') ? 'the Banner of the Dark Heart' : imperialNear(game, u) ? 'the Royal Banner' : coldBlooded(u) ? 'Cold Blooded' : null)
  const roll = () => {
    if (third) {
      const d = rollDice(game.rng, 3)
      const kept = [...d].sort((a, b) => a - b).slice(0, 2)
      const total = kept[0] + kept[1]
      return { dice: kept, all: d, total, passed: doubleOneOnly ? kept[0] === 1 && kept[1] === 1 : total === 2 || (total !== 12 && total <= need) }
    }
    const t = testLeadership(game.rng, need)
    if (doubleOneOnly) t.passed = t.dice[0] === 1 && t.dice[1] === 1
    return t
  }
  let t = roll()
  const parts = [`${label}: rolled ${t.all ? `${t.all.join(', ')} (3D6, the highest discarded: ${third})` : t.dice.join('+')}=${t.total}, needs ${doubleOneOnly ? 'a double 1' : need + ' or less'}${ld.from ? ` (${ld.from})` : ''}${mod ? ` (${mod > 0 ? '+' : ''}${mod} to Leadership${music ? ', the musician +1' : ''})` : music ? ' (the musician +1)' : ''}`]
  let rerolled = false
  // Wheezer's Windy Banner (Panic), Banner of Duty (Rally): re-roll a failure
  const bannerReroll = kind === 'panic' && itemFlag(u, 'rerollPanic') ? "Wheezer's Windy Banner" : kind === 'rally' && itemFlag(u, 'rerollRally') ? 'the Banner of Duty' : null
  let why = !t.passed && ((kind === 'panic' || kind === 'rally') && bsbNear(game, u) ? 'the Battle Standard, Hold Your Ground' : hasRule(u, 'Veteran') ? 'Veteran' : bannerReroll || reroll)
  // The Gleaming Pennant: single use, a single failed Leadership test re-rolled (not a Break test;
  // used on the first failure — a guess at the player's choice)
  // The Wayfarer's Vow: failed Fear, Panic or Terror tests re-rolled; Peasant's Duty:
  // Levies near a Sergeant-at-Arms re-roll a failed Panic test
  if (!t.passed && !why && questingReroll(u, kind)) why = 'the Wayfarer\'s Vow'
  if (!t.passed && !why && kind === 'panic' && levyReroll(game, u)) why = "the Sergeant-at-Arms (Peasant's Duty)"
  // Jade Lion: the bearer and its unit, failed Fear, Panic, Rally and Terror tests
  if (!t.passed && !why && ['fear', 'panic', 'rally', 'terror'].includes(kind) && [u, ...(u.joined || [])].some(x => itemFlag(x, 'jadeLion', { personal: true }))) why = 'the Jade Lion'
  // Kineater: friends within the General's Command range, failed Panic and Rally tests
  if (!t.passed && !why && ['panic', 'rally'].includes(kind) && game.units.some(c => c.side === u.side && c.placed && !c.status.removed && !isDead(c) && !c.status.fleeing && itemFlag(c, 'kineater', { personal: true }) && distanceBetween(hostOf(game, c) || c, u) <= commandRange(c))) why = 'the Kineater'
  // Mark of the Unbound (dominion.js)
  if (!t.passed && !why && undividedReroll(u, kind)) why = 'the Mark of the Unbound'
  // Venerable (dwarfs.js)
  if (!t.passed && !why && kind === 'panic' && venerableNear(game, u)) why = 'the Greybeards nearby (Venerable)'
  // Quell Panic: Levies near Ashsworn Veterans (chaosdwarfs.js)
  if (!t.passed && !why && kind === 'panic' && quellsPanic(game, u, distanceBetween)) why = 'the Ashsworn Veterans (Quell Panic)'
  // Heavenly Beacon: within 12" of a Kite Lantern, a failed Panic or Rally test (shen.js)
  if (!t.passed && !why && (kind === 'panic' || kind === 'rally') && beaconNear(game, u, distanceBetween)) why = 'the Kite Lantern (Heavenly Beacon)'
  // Will of the Dragons: a Panic test for a friend destroyed nearby or for being fled through
  if (!t.passed && !why && kind === 'panic' && willOfDragons(u, label)) why = 'the Will of the Dragons'
  if (!t.passed && !why && kind !== 'break' && itemFlag(u, 'pennant') && !u.status.pennantUsed) { u.status.pennantUsed = true; why = 'the Gleaming Pennant (single use)' }
  if (why) {
    t = roll()
    rerolled = true
    parts.push(`re-rolled (${why}): ${t.dice.join('+')}=${t.total}`)
  }
  parts.push(t.passed ? 'PASSED' : 'FAILED')
  return { passed: t.passed, dice: t.dice, total: t.total, need, rerolled, text: parts.join(' — ') }
}
