// Warrior Priests' prayers, said in the Command sub-phase on a test of the priest's own Leadership. Exports PRAYERS
// and the functions to list, offer and say them; used by the battle screen (ui/phases.js).
//
// Prayers of Saint Halvar:
//   Hammer of Saint Halvar — until the next Start of Turn, it (and its mount) and one friendly unit in its
//     Command range re-roll natural 1s To Hit and To Wound in the Combat phase (combat.js).
//   Shield of Faith — until the next Start of Turn, it and one friendly unit in its Command range have
//     a 5+ Untouchable save against wounds in the Shooting phase.
//   Soulfire — one enemy unit it is engaged with suffers D6 Strength 3 hits, AP -2, Flaming and Magical.
// Prayers of Varg:
//   Battle Howl — until the next Start of Turn, it and one friendly infantry or cavalry unit in its
//     Command range add D3 to their Charge rolls (charge.js).
//   Winter's Chill — until the next Start of Turn, enemies attacking it, its mount or its unit in
//     combat re-roll natural 6s To Hit (combat.js).
//   Wrath of Winter — until the next Start of Turn, it, its mount and its unit have Multiple Damage (2).
// A friendly unit is not affected by the same Prayer twice in a turn.

import { chaliceLd } from './lyonne.js'
import { say, onTable } from './game.js'
import { d6, testLeadership } from './dice.js'
import { addEffect } from './spells.js'
import { hasRule, distanceBetween, isDead } from './units.js'
import { hostOf } from './joining.js'
import { commandRange } from './leadership.js'
import { resolveHits } from './shooting.js'

export const PRAYERS = {
  hammer: { name: 'Hammer of Saint Halvar', god: 'Saint Halvar', target: 'friend' },
  shield: { name: 'Shield of Faith', god: 'Saint Halvar', target: 'friend' },
  soulfire: { name: 'Soulfire', god: 'Saint Halvar', target: 'enemy' },
  howl: { name: 'Battle Howl', god: 'Varg', target: 'friend' },
  chill: { name: "Winter's Chill", god: 'Varg', target: null },
  wrath: { name: 'Wrath of Winter', god: 'Varg', target: null },
  // Prayer of the Damned (the Harbinger of Doom): it and its unit, a 6+ Ward, 5+
  // against wounds caused in combat by an enemy that causes Fear or Terror
  damned: { name: 'Prayer of the Damned', god: 'Saint Halvar', target: null }
}
const turnKey = game => `${game.round}:${game.active}`

export function prayersOf (u) {
  const out = []
  if (hasRule(u, 'Prayers of Saint Halvar')) out.push('hammer', 'shield', 'soulfire')
  if (hasRule(u, 'Prayers of Varg')) out.push('howl', 'chill', 'wrath')
  if (hasRule(u, 'Prayer of the Damned')) out.push('damned')
  return out
}
export function canPray (game, u) {
  return game.sub === 'command' && u.side === game.active && u.placed && !u.status.removed && !isDead(u) && !u.status.fleeing &&
    prayersOf(u).length > 0 && u.status.prayedTurn !== turnKey(game)
}
// Who a prayer may be aimed at: friendly units in Command range (itself included), or an enemy it is engaged with.
export function prayerTargets (game, u, id) {
  const p = PRAYERS[id]
  const at = hostOf(game, u) || u
  if (p.target === 'enemy') return onTable(game).filter(o => o.side !== u.side && (at.engagedWith || {})[o.id])
  if (p.target !== 'friend') return []
  // (its own unit, if it has joined one, may be the one chosen: it is not a free extra)
  return onTable(game).filter(o => o.side === u.side && o !== u && (o === at || distanceBetween(at, o) <= commandRange(u)) &&
    !(o.status.prayers || {})[`${id}:${turnKey(game)}`] &&
    (id !== 'howl' || isFootOrHorse(o)))
}

// Battle Howl: troop type infantry or cavalry (not monstrous)
const isFootOrHorse = x => /infantry|cavalry/i.test((x.troopType || []).join(' ') + ' ' + x.category) && !/monstrous/i.test((x.troopType || []).join(' '))
const flag = (u, key) => { u.status[key] = true; return () => { u.status[key] = false } }

// Chant prayer `id` (with `target` where it needs one). Returns { ok, passed }.
export async function pray (game, u, id, target = null) {
  if (!canPray(game, u)) return { ok: false, reason: 'it cannot pray now' }
  if (!prayersOf(u).includes(id)) return { ok: false, reason: 'not one of its prayers' }
  const p = PRAYERS[id]
  if (p.target === 'enemy' && !target) return { ok: false, reason: 'Soulfire needs an enemy unit it is engaged with' }
  if (target && !prayerTargets(game, u, id).includes(target)) return { ok: false, reason: `${target.name} cannot be chosen` }
  u.status.prayedTurn = turnKey(game)
  const ld = Math.max(...u.models.filter(m => m.wounds > 0).map(m => m.profile.Ld ?? 0), ...(u.crew || []).filter(c => c.character).map(c => c.profile.Ld ?? 0))
  const t = testLeadership(game.rng, chaliceLd(game, u, ld))
  say(game, 'roll', `${u.name} chants ${p.name}${target ? ` (for ${target.name})` : ''}: Leadership test on its own ${ld}: ${t.dice.join('+')}=${t.total} — ${t.passed ? 'PASSED' : 'FAILED'}.`)
  if (!t.passed) return { ok: true, passed: false }
  const host = hostOf(game, u)
  const until = 'nextStartOfTurn'
  const self = [u, ...(host ? [host] : [])]
  const mark = x => { x.status.prayers = { ...(x.status.prayers || {}), [`${id}:${turnKey(game)}`]: true } }
  if (id === 'hammer' || id === 'shield' || id === 'howl') {
    // the priest (and its mount) and the single friendly unit chosen
    const who = [...new Set([...(id !== 'howl' || isFootOrHorse(u) ? [u] : []), ...(target ? [target] : [])])]
    who.forEach(mark)
    const reverts = who.map(x => id === 'shield' ? addWard(x) : flag(x, id === 'hammer' ? 'hammerOfSaintHalvar' : 'battleHowl'))
    addEffect(game, { kind: 'prayer', prayer: id, side: u.side, unitId: u.id, until, revert: () => reverts.forEach(f => f()), say: `${p.name} ends.` })
    say(game, 'good', `${p.name}: ${who.map(x => x.name).join(' and ')} until the next Start of Turn.`)
  } else if (id === 'damned') {
    const reverts = self.map(x => { const w = { value: 6, vsFear: 5, prayer: 'Prayer of the Damned' }; x.wards = [...(x.wards || []), w]; return () => { x.wards = (x.wards || []).filter(y => y !== w) } })
    addEffect(game, { kind: 'prayer', prayer: id, side: u.side, unitId: u.id, until, revert: () => reverts.forEach(f => f()), say: `${p.name} ends.` })
    say(game, 'good', `${p.name}: ${self.map(x => x.name).join(' and ')} until the next Start of Turn.`)
  } else if (id === 'chill' || id === 'wrath') {
    const reverts = self.map(x => flag(x, id === 'chill' ? 'wintersChill' : 'wrathOfWinter'))
    addEffect(game, { kind: 'prayer', prayer: id, side: u.side, unitId: u.id, until, revert: () => reverts.forEach(f => f()), say: `${p.name} ends.` })
    say(game, 'good', `${p.name}: ${self.map(x => x.name).join(' and ')} until the next Start of Turn.`)
  } else if (id === 'soulfire') {
    const n = d6(game.rng)
    say(game, 'roll', `Soulfire: D6 = ${n} Strength 3 hits, AP -2, Flaming and Magical, on ${target.name}.`)
    await resolveHits(game, u, target, n, { name: 'Soulfire', S: 3, AP: -2, rules: ['Flaming Attacks', 'Magical Attacks'] }, { source: 'Soulfire' })
  }
  return { ok: true, passed: true }
}
function addWard (x) {
  const w = { value: 5, shootingOnly: true, prayer: 'Shield of Faith' }
  x.wards = [...(x.wards || []), w]
  return () => { x.wards = (x.wards || []).filter(y => y !== w) }
}
