// The Kingdom of Lyonne's own army rules (the Vows, Peasantry, the Favour of the Mere and the rest), as small
// functions and tables that the shared rules modules call at the right moment (combat, damage, Leadership, magic and
// others; each comment says where).

import { say } from './game.js'
import { rollDice } from './dice.js'
import { alive, isDead, distanceBetween } from './units.js'
import { commandRange } from './leadership.js'

// the battle being played (game.js createGame sets it): for the rules read where no game is passed (rulesOf, saveFor)
let current = null
export const setCurrentGame = g => { current = g }
export const currentGame = () => current

const has = (u, name) => [...(u?.special || [])].some(r => r === name || r.startsWith(name + ' ('))
// (in this order: a Vow bought as an option replaces the Knight's Vow the model starts with)
export const VOWS = ['The Chalice Vow', 'The Wayfarer\'s Vow', "The Exile's Vow", "The Crusader's Vow", "The Knight's Vow"]
export const vowOf = u => VOWS.find(v => has(u, v)) || null
export const isHandmaiden = u => has(u, 'Aura of the Mere') // Damsels, Prophetesses, Lady Élisse

// Rules a Vow gives (rulesOf, units.js):
// The Wayfarer's Vow — Stubborn; The Chalice Vow — Immune to
// Psychology, Magical Attacks and Stubborn; The Exile's Vow — Stubborn and Veteran.
// Aura of the Mere — a unit joined by a Handmaiden gains Magical Attacks.
export function lyonneseRules (u, joined = []) {
  const out = []
  const v = vowOf(u)
  if (v === 'The Wayfarer\'s Vow') out.push('Stubborn')
  if (v === 'The Chalice Vow') out.push('Immune to Psychology', 'Magical Attacks', 'Stubborn')
  if (v === "The Exile's Vow") out.push('Stubborn', 'Veteran')
  // The Crusader's Vow — Veteran
  if (v === "The Crusader's Vow") out.push('Veteran')
  if (joined.some(c => !c.status?.removed && isHandmaiden(c))) out.push('Magical Attacks')
  // Blessed Triptych: a unit with a Blessed Triptych (its Chalice Monk's) is Stubborn
  if (has(u, 'Blessed Triptych') && (u.models || []).some(m => m.role === 'monk' && m.wounds > 0)) out.push('Stubborn')
  if (antlered(u) || joined.some(c => !c.status?.removed && antlered(c))) out.push('Move Through Cover')
  return out
}

// The Wayfarer's Vow — a failed Fear, Terror or Panic test may be re-rolled (leadership.js)
export const questingReroll = (u, kind) => ['fear', 'panic', 'terror'].includes(kind) && vowOf(u) === 'The Wayfarer\'s Vow'

// Panic from friends (shooting.js panicFromFriend): a Vow-holder does not test when a friendly Peasantry unit (an
// Exile also for Levies) is destroyed within 6" or flees through it (The Knight's Vow, The Wayfarer's Vow,
// The Chalice Vow, The Exile's Vow)
export function vowIgnoresPanic (f, source) {
  const v = vowOf(f)
  if (!v || !source) return false
  if (has(source, 'Peasantry')) return true
  return v === "The Exile's Vow" && has(source, 'Levies')
}

// Joining (joining.js canJoin). Returns a reason it may not, or null.
// Peasantry — a Peasantry character joins only a Peasantry unit.
// The Knight's Vow / The Wayfarer's Vow / The Chalice Vow — who may join whom.
// Virtue of Empathy — a Duke, Baron or Paladin with it may join a Peasantry unit.
export function lyonneseJoinProblem (c, host) {
  const cv = vowOf(c); const hv = vowOf(host)
  const empathy = (c.items || []).includes('virtue-of-empathy')
  if (has(c, 'Peasantry') && !has(host, 'Peasantry')) return `${c.name} is of the Peasantry: it joins only a Peasantry unit`
  if (cv && cv !== "The Exile's Vow" && has(host, 'Peasantry') && !empathy) return `${c.name} has ${cv}: it cannot join a Peasantry unit`
  if ((hv === "The Knight's Vow" || hv === "The Crusader's Vow") && has(c, 'Peasantry')) return `${host.name} have the Knight's Vow: no Peasantry character joins them`
  if (hv === 'The Wayfarer\'s Vow' && (cv === "The Knight's Vow" || has(c, 'Peasantry'))) return `${host.name} have the Wayfarer's Vow: no character with the Knight's Vow or of the Peasantry joins them`
  if (hv === 'The Chalice Vow' && cv !== 'The Chalice Vow' && !isHandmaiden(c)) return `${host.name} have the Chalice Vow: only a Chalice Vow character or a Handmaiden of the Lady joins them`
  return null
}

// Peasantry — within 6" of a friendly, not-fleeing model with the Knight's, Wayfarer's or
// Chalice Vow, a Peasantry unit may use its Leadership (leadership.js)
export function peasantLeader (game, u) {
  if (!has(u, 'Peasantry')) return null
  let best = null
  for (const k of game.units) {
    if (k.side !== u.side || !k.placed || k.status.removed || isDead(k) || k.status.fleeing || k === u) continue
    if (!["The Knight's Vow", 'The Wayfarer\'s Vow', 'The Chalice Vow'].includes(vowOf(k))) continue // (the Peasantry page names these three)
    if (distanceBetween(k, u) > 6) continue
    const ld = Math.max(0, ...alive(k).map(m => m.profile.Ld ?? 0))
    if (!best || ld > best.value) best = { value: ld, from: `${k.name}'s Leadership ${ld} (Peasantry)` }
  }
  return best
}

// Favour of the Mere — instead of the roll-off for the first turn the army may pray; its
// opponent is then treated as the roll-off's winner, and every model with the rule has a 6+ Untouchable save (5+ against
// Strength 5 or more). Chalice Vow models always have it, and need no prayer (The Chalice Vow); so does a model
// with the Virtue of Purity, which always has a 5+ Ward. Lost by a model or unit
// that flees (not falling back in good order) and a character that refuses a challenge.
export const canPray = (game, side) => game.units.some(u => u.side === side && has(u, 'Favour of the Mere') && !u.status.removed) && !game.sides.every(s => s.army === 'kingdom-of-lyonne')
export function pray (game, side) {
  game.blessed = { ...(game.blessed || {}), [side]: true }
  say(game, 'good', `${game.sides[side].name} kneels and prays for the Favour of the Mere: its knights have a 6+ Untouchable save (5+ against Strength 5 or more). ${game.sides[1 - side].name} counts as having won the roll-off.`)
}
export function blessingWard (game, u, strength) {
  if (u.status?.blessingLost) return null
  const purity = (u.items || []).includes('virtue-of-purity')
  const chalice = vowOf(u) === 'The Chalice Vow'
  if (!purity && !chalice && !(has(u, 'Favour of the Mere') && game?.blessed?.[u.side])) return null
  const v = purity ? 5 : (strength ?? 0) >= 5 ? 5 : 6
  return { value: v, source: 'the Favour of the Mere' }
}
export function loseBlessing (game, u, why) {
  if (u.status.blessingLost || !(has(u, 'Favour of the Mere') || vowOf(u) === 'The Chalice Vow')) return
  u.status.blessingLost = true
  say(game, 'bad', `${u.name} ${why}: it loses the Favour of the Mere.`)
}

// Chalice Reliquary — within 12" of a friendly, not-fleeing Chalice Vow model, its unit is Immune to
// Psychology and Unbreakable (rulesOf). It counts as a standard bearer and a musician, and loses no Wounds while any
// Battle Pilgrim remains (damage.js casualtyOrder).
export function reliquaeRules (game, u) {
  const r = u.models.find(m => m.role === 'reliquae' && m.wounds > 0)
  if (!r || !game) return []
  const near = game.units.some(k => k.side === u.side && k.placed && !k.status.removed && !isDead(k) && !k.status.fleeing && vowOf(k) === 'The Chalice Vow' && (k === u || distanceBetween(k, u) <= 12))
  return near ? ['Immune to Psychology', 'Unbreakable'] : []
}

// Beguiling Aura — an enemy model must pass a Leadership test before rolling To Hit against
// the model in the Combat phase; failed, only natural 6s hit (combat.js strike)
export function beguiled (game, a) {
  const ld = Math.max(0, ...alive(a).map(m => m.profile.Ld ?? 0), ...(a.crew || []).map(c => c.profile.Ld ?? 0))
  const d = rollDice(game.rng, 2)
  const passed = d[0] + d[1] === 2 || (d[0] + d[1] !== 12 && d[0] + d[1] <= ld)
  say(game, 'roll', `${a.name} — Leadership test before striking a Beguiling Aura: ${d.join('+')} = ${d[0] + d[1]}, needs ${ld} or less — ${passed ? 'passed' : 'FAILED, only natural 6s hit'}.`)
  return !passed
}

// The Wyrm Slayer — once Sir Aubert slays a behemoth, a monstrous creature, or a monstrous infantry or cavalry
// model in combat, he causes Terror for the rest of the game
export function wyrmSlain (game, a, b) {
  if (!has(a, 'The Wyrm Slayer') || a.special.has('Terror')) return
  if (!/Monstrous Infantry|Monstrous Cavalry|Monstrous Creature|Behemoth/.test((b.troopType || []).join(' '))) return
  a.special.add('Terror')
  say(game, 'good', `${a.name} has slain a monstrous foe: the Wyrm Slayer now causes Terror.`)
}

// Cup of Vaucelle — an enemy character within the bearer's Command range, testing Leadership
// to use a special rule or magic item: -2 Leadership (to a minimum of 2). Returns the Leadership to test.
export function chaliceLd (game, c, ld) {
  const near = game.units.some(o => o.side !== c.side && o.placed && !o.status.removed && !isDead(o) && (o.items || []).includes('cup-of-vaucelle') && distanceBetween(o, c) <= commandRange(o))
  if (!near) return ld
  say(game, '', `The Cup of Vaucelle: ${c.name} tests at -2 Leadership.`)
  return Math.max(2, ld - 2)
}

// Antlers of the Great Hunt — mounted on a (Barded) Warhorse, its wearer and any unit it joins
// have Move Through Cover
export const antlered = c => (c.items || []).includes('antlers-of-the-great-hunt') && /warhorse/i.test(c.mountChoice || c.mount?.name || '')

export const peasantsDuty = u => has(u, "Peasant's Duty") || (u.joined || []).some(c => !c.status?.removed && has(c, "Peasant's Duty"))
// Peasant's Duty — friendly Levies within the (not fleeing) Sergeant's Command range re-roll a failed Panic test
export const levyReroll = (game, u) => has(u, 'Levies') && game.units.some(c => c.side === u.side && c.placed && !c.status.removed && !isDead(c) && !c.status.fleeing && has(c, "Peasant's Duty") && distanceBetween(c, u) <= commandRange(c))
