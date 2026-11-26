// The Unmade's own army rules (Unmade Instability, Unmade Alignment, the gods' marks and the rest), as small
// functions and tables that the shared rules modules call at the right moment (combat, damage, Leadership, magic and
// others; each comment says where).

import { say } from './game.js'
import { hasRule, ruleValue, isDead, alive } from './units.js'
import { rollDice } from './dice.js'

const live = c => !c.status?.removed && !isDead(c)

// Unmade — a 5+ Ward against non-magical attacks, plus Fear, Magical Attacks, Unmade Instability, Unbreakable,
// Immune to Psychology and Weave-spawned (units.js rulesOf); an Unmade character joins only Unmade
// units, and vice versa (joining.js)
export const UNMADE_RULES = ['Unmade Instability', 'Fear', 'Immune to Psychology', 'Magical Attacks', 'Unbreakable', 'Weave-spawned']
export const isUnmade = u => [...(u.special || [])].includes('Unmade')
export const unmadeWards = u => isUnmade(u) ? [{ value: 5, nonMagical: true, source: 'Unmade' }] : []

// Unmade Alignment — one god per model and unit; a character of a god joins only a unit of
// that god or of none; one of none joins any (each 'Unmade of X' rule is read as the model's alignment: our own
// reading, as those rules give no more detail here)
const GODS = ['Wrath', 'Endurance', 'Rapture', 'Cipher']
export const godOf = u => GODS.find(g => [...(u.special || [])].some(r => r === `Unmade of ${g}`)) || null
export function unmadeJoinProblem (c, host) {
  if (isUnmade(c) !== isUnmade(host)) return isUnmade(c) ? `${c.name} is Unmade: it can only join an Unmade unit` : `${host.name} are Unmade: only an Unmade character may join them`
  const a = godOf(c); const b = godOf(host)
  if (a && b && a !== b) return `${c.name} is an Unmade of ${a}: it cannot join Unmade of ${b}`
  return null
}

// Unmade of Wrath (and the rest) — Hatred of the rival god's Unmade (units.js rulesOf);
// Wrath +1 Strength in a turn it charged (not its mount); Endurance: attacks at it re-roll natural 6s To Hit; Rapture +1"
// maximum charge range and +1 to Charge (charge.js) and Pursuit rolls (combat.js); Cipher: a Wizard +1 to cast
export const RIVAL = { Wrath: 'Unmade of Rapture', Endurance: 'Unmade of Cipher', Rapture: 'Unmade of Wrath', Cipher: 'Unmade of Endurance' }
export const wrathCharge = (u, charged) => charged && godOf(u) === 'Wrath'
export const enduranceSixes = b => godOf(b) === 'Endurance'
export const raptureSpeed = u => godOf(u) === 'Rapture'
export const unmadeOfCipher = u => godOf(u) === 'Cipher'

// Unmade Instability — on losing a round, before giving ground, it tests Leadership with +1 to
// the result for each point it lost by; failed, it loses a Wound for each point it failed by (fewer by its Infernal
// Favour, Infernal Favour: the highest in the unit); a natural double 6, the unit is gone (combat.js)
export function unmadeInstability (game, u, diff, applyWounds, removeUnit) {
  const ld = Math.max(0, ...alive(u).map(m => m.profile.Ld ?? 0), ...(u.joined || []).filter(live).flatMap(c => alive(c).map(m => m.profile.Ld ?? 0)))
  const d = rollDice(game.rng, 2)
  const total = d[0] + d[1] + diff
  const favour = Math.max(0, ...[u, ...(u.joined || []).filter(live)].map(c => hasRule(c, 'Infernal Favour') ? Number(String(ruleValue(c, 'Infernal Favour') || '1').replace(/[^\d]/g, '')) || 1 : 0))
  if (d[0] === 6 && d[1] === 6) {
    say(game, 'bad', `${u.name} — Unmade Instability: ${d.join('+')} — a natural double 6: DRAGGED BACK INTO THE AETHER.`)
    for (const x of [u, ...(u.joined || [])]) for (const m of x.models) m.wounds = 0
    for (const c of (u.joined || [])) removeUnit(game, c, 'wiped out (Unmade Instability)')
    removeUnit(game, u, 'wiped out (Unmade Instability)')
    return
  }
  // (a natural double 1 always passes a Leadership test)
  const passed = (d[0] === 1 && d[1] === 1) || total <= ld
  const lost = passed ? 0 : Math.max(0, total - ld - favour)
  say(game, passed ? 'roll' : 'bad', `${u.name} — Unmade Instability: ${d.join('+')} + ${diff} (lost by) = ${total}, Leadership ${ld} — ${passed ? 'all is well' : `failed by ${total - ld}${favour ? `, less ${favour} (Infernal Favour)` : ''}: ${lost} Wound${lost === 1 ? '' : 's'} lost`}.`)
  if (lost) applyWounds(game, u, lost, 'Unmade Instability')
}

// Soporific Musk — enemies in combat with Fiends cannot Strike First; those without it Strike
// Last (combat.js)
export const musky = b => [b, ...(b.joined || [])].some(x => live(x) && hasRule(x, 'Soporific Musk'))
// Unmade Charge — Impact Hits AP -2 (combat.js)
export const unmadeCharge = u => hasRule(u, 'Unmade Charge')
// Slime Trail — no flank or rear Melee Outcome bonus against Beasts of Endurance (combat.js)
export const slimeTrail = u => hasRule(u, 'Slime Trail')

// Slashing Attack — flying over an enemy unit not engaged in Remaining Moves: D3 S4 hits for each
// model that moved over it (every model here) (dwarfs.js bombsAway)
export function slashingAttack (game, u, under, spellHits) {
  const n = alive(u).reduce(a => a + Math.ceil(rollDice(game.rng, 1)[0] / 2), 0)
  say(game, 'roll', `${u.name} make a SLASHING ATTACK on ${under.name}: D3 for each of ${alive(u).length} = ${n} Strength 4 hits.`)
  spellHits(game, under, n, 4, 0, { label: 'Slashing Attack: ' })
}
