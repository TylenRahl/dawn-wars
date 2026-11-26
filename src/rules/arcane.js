// Arcane items and other magic items that act on spells and Wizards: the Becalming Orb, Master Rune of Calm,
// Storm Call, feedback and transmogrification scrolls, lightning rods and the like. It adds their Bound spells to
// SPELLS and exports the effects; the casting and dispelling steps they change live in magic.js and spells.js,
// which call in here.

import { chaliceLd } from './lyonne.js'
import { say } from './game.js'
import { d6, rollDice } from './dice.js'
import { SPELLS } from '../data/spells.js'
import { isDead, distanceBetween, alive } from './units.js'
import { addEffect } from './spells.js'
import { hostOf } from './joining.js'
import { spendItem, itemLeft } from './items.js'
import { applyWounds, saveFor } from './damage.js'
import { testLeadership } from './dice.js'

// Becalming Orb — its Bound spell (Hex, 8+, Self; Power Level 1): until your next Start of
// Turn, enemy Wizards within 15" of the caster add 2 to the casting value of any spell they attempt.
SPELLS['becalming-orb'] = { slug: 'becalming-orb', name: 'Becalming Orb', lore: null, loreName: 'Becalming Orb', type: 'Bound spell', number: null, category: 'Hex', castingValue: 8, range: 'Self', text: 'Until your next Start of Turn, enemy Wizards within 15" of the caster need 2 more to cast any spell.', page: 'magic-item__becalming-orb.md' }
export function becalm (game, u, { radius = 15, spell = 'Becalming Orb' } = {}) {
  addEffect(game, { kind: 'becalm', category: 'Hex', spell, radius, side: u.side, casterId: u.id, until: 'nextStartOfTurn', say: `The ${spell} fades: the Eight Threads blow freely again.` })
  say(game, 'good', `${u.name}'s ${spell}: enemy Wizards within ${radius}" add 2 to their casting values until its next Start of Turn.`)
}
// Storm Call — a Thunderwyrm Elder's Bound spell (Magic Missile, 7+, Self; Power Level 1), cast
// even while engaged: every unit within 6" of it (friend or foe, engaged or not, itself too) suffers D3 S4 hits, AP -1
SPELLS['thunderwyrm-elder-storm-call'] = { slug: 'thunderwyrm-elder-storm-call', name: 'Storm Call', lore: null, loreName: 'Storm Call', type: 'Bound spell', number: null, category: 'Magic Missile', castingValue: 7, range: 'Self', text: 'Every unit within 6" of this model takes D3 hits at Strength 4, AP -1: friend or foe, engaged or not, and this model too.', page: 'special-rules__storm-call.md', engagedOk: true }
// Master Rune of Calm — its Bound spell (Hex, 8+/11+, Self; Power Level 2): enemy Wizards within
// 18" (36" at 11+) add 2 to their casting values until your next Start of Turn
SPELLS['master-rune-of-calm'] = { slug: 'master-rune-of-calm', name: 'Master Rune of Calm', lore: null, loreName: 'Master Rune of Calm', type: 'Bound spell', number: null, category: 'Hex', castingValue: 8, castingValue2: 11, range: 'Self', text: 'Until your next Start of Turn, enemy Wizards within 18" need 2 more to cast any spell (within 36" on a casting result of 11+).', page: 'magic-item__master-rune-of-calm.md' }
// The casting value a Wizard must reach for a spell (the Becalming Orb raises it)
export function castingValueFor (game, u, s) {
  const orb = (game.effects || []).some(e => e.kind === 'becalm' && e.side !== u.side && (() => { const c = game.units.find(x => x.id === e.casterId); return c && !c.status.removed && !isDead(c) && distanceBetween(hostOf(game, c) || c, hostOf(game, u) || u) <= (e.radius || 15) })())
  // Drain Magic: within 24" of an enemy caster with Drain Magic in play, +2
  const drain = (game.effects || []).some(e => e.kind === 'drainMagic' && e.side !== u.side && (() => { const c = game.units.find(x => x.id === e.casterId); return c && !c.status.removed && !isDead(c) && distanceBetween(hostOf(game, c) || c, hostOf(game, u) || u) <= 24 })())
  return s.castingValue + (orb ? 2 : 0) + (drain ? 2 : 0)
}

// Scroll of Transmogrification — the casting Wizard, failing a D6 roll of its Level or less,
// becomes a frog: no casting or dispelling, no equipment, every characteristic but Wounds 1; each Start of
// Turn a D6, 4+ and it returns to normal.
export function transmogrify (game, w) {
  if (w.status.frog || w.status.removed || isDead(w)) return
  w.status.frog = { profiles: w.models.map(m => m.profile), kit: w.kit, mount: w.mount }
  for (const m of w.models) m.profile = Object.fromEntries(Object.entries(m.profile).map(([k, v]) => [k, k === 'W' || typeof v !== 'number' ? v : 1]))
  w.kit = { ...w.kit, melee: [], ranged: [], shield: false, barding: false, armourBase: 7, armourBonus: 0, fixedArmour: null, breath: null }
  say(game, 'bad', `${w.name} is turned into a FROG: no spells, no equipment, every characteristic but Wounds 1.`)
}
export function frogsRecover (game, side) {
  for (const w of game.units.filter(u => u.side === side && u.status.frog && !u.status.removed && !isDead(u))) {
    const r = d6(game.rng)
    if (r < 4) { say(game, 'roll', `${w.name} (a frog): D6 = ${r}, needs 4+ — still a frog.`); continue }
    const f = w.status.frog
    w.models.forEach((m, i) => { m.profile = { ...f.profiles[i] } })
    w.kit = f.kit
    w.status.frog = null
    say(game, 'good', `${w.name} (a frog): D6 = ${r} — it returns to normal (but keeps a love of water).`)
  }
}

// Staff of Quietude — in its Command sub-phase, a Leadership test: passed, every Remains in
// Play spell in play is dispelled, friendly ones too.
// Arch-Lightning Rod — single use, in its Command sub-phase and not engaged, a test of its own
// unmodified Leadership: passed, enemy units cannot use Fly (X) until your next Start of Turn.
// (Falcon-horn of Aldemar works as the Arch-Lightning Rod does)
export const ARCANE_COMMAND = ['staff-of-quietude', 'arch-lightning-rod', 'falcon-horn-of-aldemar']
const ownLd = u => Math.max(...alive(u).map(m => m.profile.Ld ?? 0))
export function useArcaneCommand (game, u, id) {
  const t = testLeadership(game.rng, chaliceLd(game, u, ownLd(u)))
  if (id === 'staff-of-quietude') {
    u.status.quietudeTurn = `${game.round}:${game.active}`
    say(game, 'roll', `${u.name} raises the Staff of Quietude: Leadership test ${t.dice.join('+')} = ${t.total} against ${ownLd(u)} — ${t.passed ? 'passed' : 'failed'}.`)
    if (!t.passed) return { ok: true }
    const rip = (game.effects || []).filter(e => e.until === 'casterGone' || e.kind === 'hexRIP' || e.kind === 'vortex' || e.rip)
    for (const e of rip) { if (e.revert) e.revert(); if (e.say) say(game, '', e.say) }
    game.effects = (game.effects || []).filter(e => !rip.includes(e))
    say(game, 'good', `Staff of Quietude: ${rip.length} Remains in Play spell${rip.length === 1 ? '' : 's'} dispelled.`)
    return { ok: true }
  }
  spendItem(u, id)
  say(game, 'roll', `${u.name} raises the ${id === 'falcon-horn-of-aldemar' ? 'Falcon-horn of Aldemar' : 'Arch-Lightning Rod'} (single use): Leadership test ${t.dice.join('+')} = ${t.total} against ${ownLd(u)} — ${t.passed ? 'passed' : 'failed'}.`)
  if (!t.passed) return { ok: true }
  const enemies = game.units.filter(x => x.side !== u.side)
  for (const x of enemies) x.status.grounded = (x.status.grounded || 0) + 1 // (counted: two such effects end one at a time)
  addEffect(game, { kind: 'grounded', side: u.side, casterId: u.id, until: 'nextStartOfTurn', revert: () => { for (const x of enemies) x.status.grounded = Math.max(0, (x.status.grounded || 0) - 1) }, say: 'The Arch-Lightning Rod falls quiet: enemy fliers may Fly again.' })
  say(game, 'good', `Arch-Lightning Rod: no enemy unit may Fly until ${u.name}'s next Start of Turn.`)
  return { ok: true }
}
export function arcaneCommandItems (game, u) {
  if (game.sub !== 'command' || u.side !== game.active || u.status.removed || !u.placed || u.status.frog) return []
  const out = []
  if ((u.items || []).includes('staff-of-quietude')) out.push({ id: 'staff-of-quietude', name: 'Staff of Quietude', why: u.status.quietudeTurn === `${game.round}:${game.active}` ? 'already used this turn' : null })
  if ((u.items || []).includes('falcon-horn-of-aldemar') && itemLeft(u, 'falcon-horn-of-aldemar') > 0) out.push({ id: 'falcon-horn-of-aldemar', name: 'Falcon-horn of Aldemar', why: u.status.engaged || hostOf(game, u)?.status.engaged ? 'not while engaged in combat' : null })
  if ((u.items || []).includes('arch-lightning-rod') && itemLeft(u, 'arch-lightning-rod') > 0) out.push({ id: 'arch-lightning-rod', name: 'Arch-Lightning Rod', why: u.status.engaged || hostOf(game, u)?.status.engaged ? 'not while engaged in combat' : null })
  return out
}

// Feedback Scroll — used in place of a Wizardly dispel; the spell still goes off, then roll two D6 and the caster
// loses one Wound for each 4+.
export function feedback (game, caster) {
  const r = rollDice(game.rng, 2)
  const n = r.filter(d => d >= 4).length
  say(game, 'roll', `Feedback Scroll: ${r.join(', ')} — ${caster.name} loses ${n} Wound${n === 1 ? '' : 's'}.`)
  if (n) applyWounds(game, caster, n, 'the Feedback Scroll')
}
// Scroll of Transmogrification — then a D6 equal to or under the caster's Level, or a frog
export function transmogrificationRoll (game, caster, level) {
  const r = d6(game.rng)
  say(game, 'roll', `Scroll of Transmogrification: ${caster.name} rolls ${r}, needs ${level} or less — ${r <= level ? 'it keeps its shape' : 'it fails'}.`)
  if (r > level) transmogrify(game, caster)
}

// Twin-tailed Wand — a backlash: instead of the Backlash table, D3 wounds with no armour or
// Regeneration save (Ward as normal)
export function wandBackfire (game, u) {
  const n = Math.ceil(d6(game.rng) / 2)
  const sv = saveFor(u, { magical: true })
  let un = n
  if (sv.ward) { const d = rollDice(game.rng, n); const k = d.filter(x => x >= sv.ward).length; say(game, 'roll', `${u.name} Untouchable save ${sv.ward}+: [${d.join(' ')}] — ${k} saved.`); un -= k }
  say(game, 'bad', `${u.name} miscasts with the Twin-tailed Wand: overwhelmed by the Eight Threads, D3 = ${n} wounds (no armour or Regeneration save) — ${un} suffered.`)
  if (un) applyWounds(game, u, un, 'the Twin-tailed Wand')
}

export const glowyAmulet = (game, w, target) => !w.status?.frog && (w.items || []).includes('glowy-green-amulet') && itemLeft(w, 'glowy-green-amulet') > 0 && !!target?.id && (target === w || hostOf(game, w) === target)

// Spells with two casting values (Winds of the Dominion 7+/9+, The Mere's Gift 7+/10+: the data runs them
// together, "79", "710"): cast at the first; the second is kept as `castingValue2` for the effect to read the casting
// result against (spells.js)
for (const s of Object.values(SPELLS)) {
  if (!(s.castingValue > 12)) continue
  const t = String(s.castingValue)
  const first = String(s.fieldCastingValue && s.fieldCastingValue <= 12 ? s.fieldCastingValue : t[0])
  s.castingValue2 = Number(t.slice(first.length))
  s.castingValue = Number(first)
}
