// Sorcerous Ruses, an optional rule for the Eight Threads. Exports the ruse table and the functions to roll, check
// and spend a ruse; used by magic.js and the battle screen (ui/battle.js).
// A Wizard may buy one roll on the Sorcerous Ruses table for 25 points (roster.js `ruse`), made just before its
// spells are chosen (magic.js generateSpells). A ruse is spent once, whether it works or not.
//   1 Escapology: the first time the Wizard drops to zero Wounds, a D6: on 4+ it keeps one Wound and stays
//     (damage.js removeUnit).
//   2-5 (Unmade Assailants, Spell Thief, Duplicitous Mirror, Magical Syphon) and
//   6 Spell Eater: used in place of a Wizardly dispel (magic.js tryDispel).

import { say } from './game.js'
import { d6, rollDice } from './dice.js'

export const RUSES = { 1: 'escapology', 2: 'unmade-assailants', 3: 'spell-thief', 4: 'duplicitous-mirror', 5: 'magical-syphon', 6: 'spell-eater' }
export const RUSE_NAMES = { escapology: 'Escapology', 'unmade-assailants': 'Unmade Assailants', 'spell-thief': 'Spell Thief', 'duplicitous-mirror': 'Duplicitous Mirror', 'magical-syphon': 'Magical Syphon', 'spell-eater': 'Spell Eater' }
export const RUSE_POINTS = 25

export function rollRuse (game, u) {
  const r = d6(game.rng)
  u.wizard.ruse = RUSES[r]
  say(game, 'roll', `${u.name} rolls its Sorcerous Ruse: ${r} — ${RUSE_NAMES[RUSES[r]]}.`)
}
export const hasRuse = (u, id) => u.wizard?.ruse === id && !u.wizard.ruseUsed
export const dispelRuse = u => u.wizard?.ruse && u.wizard.ruse !== 'escapology' && !u.wizard.ruseUsed ? u.wizard.ruse : null

// A Ruse used instead of a Wizardly dispel by `w` against `caster`'s spell `s`. Returns
// 'dispelled', 'cast', or 'reflected' (Duplicitous Mirror).
export function useDispelRuse (game, w, caster, s, { perfect = false } = {}) {
  const id = w.wizard.ruse
  w.wizard.ruseUsed = true
  const name = RUSE_NAMES[id]
  const lvl = w.wizard.level
  const cl = caster.wizard?.level || 0
  const prof = caster.models.find(m => m.wounds > 0)?.profile || {}
  const contest = (mine, mineText, theirs, theirsText) => {
    const res = mine > theirs ? 'won' : mine === theirs ? 'draw' : 'lost'
    say(game, 'roll', `${w.name} uses its Sorcerous Ruse, ${name}: ${mineText} = ${mine} against ${caster.name}'s ${theirsText} = ${theirs} — ${res === 'won' ? 'it works' : res === 'draw' ? 'a draw: the spell is dispelled' : 'it fails, the spell is cast'}.`)
    return res
  }
  if (id === 'spell-eater') {
    // automatically dispelled; a perfect invocation needs a natural double 6 on a Dispel roll
    w.wizard.spellEaten = true
    if (perfect) {
      const d = rollDice(game.rng, 2)
      const ok = d[0] === 6 && d[1] === 6
      say(game, 'roll', `${w.name} uses its Sorcerous Ruse, Spell Eater, against a perfect invocation: Dispel roll ${d.join('+')} — ${ok ? 'a natural double 6, DISPELLED' : 'not a double 6, the spell is cast'}.`)
      return ok ? 'dispelled' : 'cast'
    }
    say(game, 'good', `${w.name} uses its Sorcerous Ruse, Spell Eater: ${s.name} is DISPELLED, its power devoured (its next Casting roll has an extra D6).`)
    return 'dispelled'
  }
  if (id === 'unmade-assailants') {
    const a = d6(game.rng); const b = d6(game.rng)
    const r = contest(a + lvl, `D6 ${a} + Level ${lvl}`, b + (prof.T ?? 3), `D6 ${b} + Toughness ${prof.T ?? 3}`)
    if (r === 'won') return { result: 'dispelled', wound: true }
    return r === 'draw' ? 'dispelled' : 'cast'
  }
  if (id === 'spell-thief') {
    const a = d6(game.rng); const b = d6(game.rng)
    const r = contest(a + Math.ceil(lvl / 2), `D6 ${a} + ${Math.ceil(lvl / 2)}`, b + Math.ceil(cl / 2), `D6 ${b} + ${Math.ceil(cl / 2)}`)
    // (a Bound spell's bearer that is no Wizard has no mind to tear it from: the spell is simply dispelled)
    if (r === 'won' && !caster.wizard) return 'dispelled'
    if (r === 'won') { caster.wizard.stolen = [...(caster.wizard.stolen || []), s.slug]; say(game, 'good', `${s.name} is torn from ${caster.name}'s mind: it cannot cast it again this game.`); return 'dispelled' }
    return r === 'draw' ? 'dispelled' : 'cast'
  }
  if (id === 'duplicitous-mirror') {
    const a = d6(game.rng); const b = d6(game.rng)
    const r = contest(a + lvl, `D6 ${a} + Level ${lvl}`, b + (prof.I ?? 3), `D6 ${b} + Initiative ${prof.I ?? 3}`)
    return r === 'won' ? 'reflected' : r === 'draw' ? 'dispelled' : 'cast'
  }
  if (id === 'magical-syphon') {
    const d = rollDice(game.rng, 2); const b = d6(game.rng)
    const r = contest(d[0] + d[1] + lvl, `2D6 ${d.join('+')} + Level ${lvl}`, b + (prof.Ld ?? 7), `D6 ${b} + Leadership ${prof.Ld ?? 7}`)
    return r === 'won' ? { result: 'dispelled', syphon: true } : r === 'draw' ? 'dispelled' : 'cast'
  }
  return 'cast'
}
