// Magic items used in the Command sub-phase of their bearer's turn (single use unless noted): COMMAND_ITEMS, the
// list a model may use now (commandItems) and useCommandItem, called by the battle screen (ui/phases.js).
//
// A model may drink only one potion, of any kind, in each Command phase.
// Healing Potion: recovers D3 lost Wounds.
// Potion of Strength / Potion of Toughness / Potion of Speed /
//   Potion of Fervour: +D3 Strength / Toughness / Initiative / Attacks until the end of that turn
//   (to a maximum of 10).
// Potion of Foolhardiness: Immune to Psychology until the end of that turn.
// Elixir of Power: +1 Strength, Attacks and Initiative until the next Start of Turn, when the drinker loses one
//   Wound (no Regeneration).
// Guv'nor's Titfer: (not single use) not engaged, a Leadership test on its own
//   Leadership: passed, it and any unit it has joined are Unbreakable until the next Start of Turn.
// Fungus Wine: Gloom Nipper characters; not engaged, a Leadership test on its own
//   Leadership: passed, it and any unit it has joined are Immune to Psychology until the next Start
//   of Turn.

import { chaliceLd } from './lyonne.js'
import { arcaneCommandItems, useArcaneCommand, ARCANE_COMMAND } from './arcane.js'
import { onTable } from './game.js'
import { distanceBetween, isDead } from './units.js'
import { commandRange } from './leadership.js'
import { removeUnit } from './damage.js'
import { say } from './game.js'
import { d3 } from './dice.js'
import { testLeadership } from './dice.js'
import { addEffect } from './spells.js'
import { spendItem, itemName, itemLeft } from './items.js'
import { hostOf } from './joining.js'
import { applyWounds } from './damage.js'

const POTIONS = {
  'healing-potion': { heal: true },
  'potion-of-strength': { stat: 'S' },
  'potion-of-toughness': { stat: 'T' },
  'potion-of-speed': { stat: 'I' },
  'potion-of-fervour': { stat: 'A' },
  'potion-of-foolhardiness': { rules: ['Immune to Psychology'] },
  'elixir-of-power': { elixir: true }
}
// Taskmaster's Scourge: (not single use) a Leadership test on its own Leadership: passed, it and its
// unit +D3 Movement (to 10) until the next Start of Turn
const TESTED = { 'guvnors-titfer': { rules: ['Unbreakable'], reusable: true }, 'fungus-wine': { rules: ['Immune to Psychology'] }, 'taskmasters-scourge': { moveD3: true, rules: [], reusable: true } }
// the Hornkin's single-use Command items (Dark Heart, Chalice of Dark Rain, Stone of Spite;
// Banner of the Warped Moon is tested on its bearer's own Leadership: TESTED below)
const BEAST_ONCE = ['dark-heart', 'chalice-of-dark-rain', 'stone-of-spite', 'hellheart']
TESTED['banner-of-the-warped-moon'] = { grounded: true, rules: [] }
export const COMMAND_ITEMS = [...Object.keys(POTIONS), ...Object.keys(TESTED), 'periapt-of-soul-exchange', ...BEAST_ONCE]

const turnKey = game => `${game.round}:${game.active}`
// granted rules are counted, so one effect ending does not take away a rule another still gives
const grant = (u, rules) => {
  u._grants = u._grants || {}
  const fresh = rules.filter(r => !u.special.has(r) || u._grants[r])
  for (const r of fresh) { u._grants[r] = (u._grants[r] || 0) + 1; u.special.add(r) }
  return () => { for (const r of fresh) { u._grants[r]--; if (!u._grants[r]) u.special.delete(r) } }
}
const bump = (u, stat, d) => {
  const applied = []
  for (const m of u.models) { const was = m.profile[stat]; if (typeof was !== 'number') continue; m.profile = { ...m.profile, [stat]: Math.min(10, was + d) }; applied.push([m, m.profile[stat] - was]) }
  return () => { for (const [m, x] of applied) m.profile = { ...m.profile, [stat]: m.profile[stat] - x } }
}

// The items this unit (a character) may use now, with the reason any cannot be.
export function commandItems (game, u) {
  if (game.sub !== 'command' || u.side !== game.active || u.status.removed || !u.placed) return []
  const out = []
  for (const id of [...new Set(u.items || [])]) {
    if (!COMMAND_ITEMS.includes(id) || (itemLeft(u, id) <= 0 && !TESTED[id]?.reusable)) continue
    let why = null
    if (POTIONS[id] && u.status.potionTurn === turnKey(game)) why = 'one potion a Command phase'
    if (TESTED[id] && (u.status.engaged || hostOf(game, u)?.status.engaged)) why = 'not while engaged in combat'
    if (id === 'fungus-wine' && !hostOf(game, u)) why = 'it is shared out to a unit the character has joined'
    if (TESTED[id]?.reusable && u.status.usedTurn?.[id] === turnKey(game)) why = 'already used this turn'
    if (id === 'periapt-of-soul-exchange' && !periaptUnits(game, u).length) why = 'no friendly unit within its Command range'
    if (id === 'periapt-of-soul-exchange' && !u.models.some(m => m.wounds > 0 && m.wounds < (m.startW || 1))) why = 'it has lost no Wounds'
    if ((id === 'healing-potion' || id === 'dark-heart') && !u.models.some(m => m.wounds > 0 && m.wounds < (m.startW || 1))) why = 'it has lost no Wounds'
    if ((id === 'chalice-of-dark-rain' || id === 'stone-of-spite' || id === 'banner-of-the-warped-moon') && (u.status.engaged || hostOf(game, u)?.status.engaged)) why = 'not while engaged in combat'
    out.push({ id, name: itemName(id), why })
  }
  // the Staff of Quietude and the Arch-Lightning Rod (arcane.js)
  out.push(...arcaneCommandItems(game, u))
  return out
}

// Periapt of Soul Exchange: the friendly units within the bearer's Command range (its own among them)
export function periaptUnits (game, u) {
  const from = hostOf(game, u) || u
  return onTable(game).filter(o => o.side === u.side && o !== u && !o.status.whirler && (o === from || distanceBetween(from, o) <= commandRange(u)))
}
// `target`: for the Periapt, the friendly unit whose models are given up (its player's choice)
export function useCommandItem (game, u, id, { target = null } = {}) {
  const c = commandItems(game, u).find(x => x.id === id)
  if (!c) return { ok: false, reason: 'it cannot use that now' }
  if (c.why) return { ok: false, reason: c.why }
  if (ARCANE_COMMAND.includes(id)) return useArcaneCommand(game, u, id)
  // Single use: D3 friendly models in the bearer's Command range are taken off as casualties, and the bearer gets
  // back as many lost Wounds.
  if (id === 'periapt-of-soul-exchange') {
    const t = target || periaptUnits(game, u)[0]
    if (!periaptUnits(game, u).includes(t)) return { ok: false, reason: 'that unit is not within its Command range' }
    spendItem(u, id)
    const r = d3(game.rng)
    const before = t.models.filter(m => m.wounds > 0).length
    for (let k = 0; k < r; k++) { const m = [...t.models].reverse().find(x => x.wounds > 0 && x.role === 'rank') || t.models.find(x => x.wounds > 0); if (m) m.wounds = 0 }
    const gone = before - t.models.filter(m => m.wounds > 0).length
    if (isDead(t)) removeUnit(game, t, 'given to the Periapt of Soul Exchange')
    const m = u.models.find(x => x.wounds > 0)
    const got = m ? Math.min(gone, (m.startW || 1) - m.wounds) : 0
    if (m) m.wounds += got
    say(game, 'roll', `${u.name} uses the Periapt of Soul Exchange: D3 = ${r} — ${gone} model${gone === 1 ? '' : 's'} of ${t.name} removed as casualties; ${got} Wound${got === 1 ? '' : 's'} recovered.`)
    return { ok: true }
  }
  if (BEAST_ONCE.includes(id)) {
    spendItem(u, id)
    if (id === 'dark-heart') { const m = u.models.find(x => x.wounds > 0 && x.wounds < (x.startW || 1)); m.wounds += 1; say(game, 'good', `${u.name} devours a Dark Heart: one Wound recovered (${m.wounds} of ${m.startW}).`); return { ok: true } }
    if (id === 'chalice-of-dark-rain') { game.darkRain = { side: u.side }; addEffect(game, { kind: 'darkRain', side: u.side, until: 'nextStartOfTurn', revert: () => { game.darkRain = null }, say: 'The dark rain passes.' }); say(game, 'good', `${u.name} drinks from the Chalice of Dark Rain: enemy missile ranges are halved and enemy war machines cannot shoot until its next Start of Turn.`); return { ok: true } }
    // Hellheart: it loses a Wound; until the next Start of Turn an enemy natural double miscasts
    if (id === 'hellheart') {
      applyWounds(game, u, 1, 'the Hellheart')
      game.hellheart = { ...(game.hellheart || {}), [u.side]: (game.hellheart?.[u.side] || 0) + 1 }
      addEffect(game, { kind: 'hellheart', side: u.side, until: 'nextStartOfTurn', revert: () => { game.hellheart[u.side] = Math.max(0, game.hellheart[u.side] - 1) }, say: 'The Hellheart is spent.' })
      say(game, 'good', `${u.name} bites into the Hellheart: until its next Start of Turn, any enemy Wizard rolling a natural double miscasts.`)
      return { ok: true }
    }
    game.stoneOfSpite = (game.stoneOfSpite || 0) + 1
    addEffect(game, { kind: 'stoneOfSpite', side: u.side, until: 'nextStartOfTurn', revert: () => { game.stoneOfSpite = Math.max(0, (game.stoneOfSpite || 0) - 1) }, say: 'The Stone of Spite fades: the Eight Threads return.' })
    say(game, 'good', `${u.name} crushes the Stone of Spite: every Wizard is -2 to cast until its next Start of Turn.`)
    return { ok: true }
  }
  const P = POTIONS[id]
  if (P) {
    u.status.potionTurn = turnKey(game)
    spendItem(u, id)
    if (P.heal) {
      const r = d3(game.rng)
      const m = u.models.find(x => x.wounds > 0 && x.wounds < (x.startW || 1))
      if (!m) return { ok: false, reason: 'it has lost no Wounds' }
      const got = Math.min(r, (m.startW || 1) - m.wounds)
      m.wounds += got
      u.status.woundsTaken = Math.max(0, (u.status.woundsTaken || 0) - got)
      say(game, 'roll', `${u.name} drinks a Healing Potion: D3 = ${r} — ${got} Wound${got === 1 ? '' : 's'} recovered (${m.wounds} of ${m.startW || 1}).`)
    } else if (P.stat) {
      const r = d3(game.rng)
      const revert = bump(u, P.stat, r)
      addEffect(game, { kind: 'potion', side: u.side, unitId: u.id, until: 'endOfTurn', revert, say: `${u.name}'s ${itemName(id)} wears off.` })
      say(game, 'roll', `${u.name} drinks a ${itemName(id)}: D3 = ${r} — +${r} ${P.stat} until the end of the turn (now ${u.models[0].profile[P.stat]}).`)
    } else if (P.rules) {
      const revert = grant(u, P.rules)
      addEffect(game, { kind: 'potion', side: u.side, unitId: u.id, until: 'endOfTurn', revert, say: `${u.name}'s ${itemName(id)} wears off.` })
      say(game, '', `${u.name} drinks a ${itemName(id)}: Immune to Psychology until the end of the turn.`)
    } else if (P.elixir) {
      const reverts = ['S', 'A', 'I'].map(st => bump(u, st, 1))
      addEffect(game, {
        kind: 'potion', side: u.side, unitId: u.id, until: 'nextStartOfTurn',
        revert: () => {
          reverts.forEach(f => f())
          if (!u.status.removed) { say(game, 'bad', `The Elixir of Power wears off: ${u.name} loses a Wound (no Regeneration).`); applyWounds(game, u, 1, 'the Elixir of Power') }
        }
      })
      say(game, '', `${u.name} drinks the Elixir of Power: +1 Strength, Attacks and Initiative until its next Start of Turn.`)
    }
    return { ok: true }
  }
  const T = TESTED[id]
  if (T.reusable) { u.status.usedTurn = { ...(u.status.usedTurn || {}), [id]: turnKey(game) } } else spendItem(u, id)
  const ld = chaliceLd(game, u, Math.max(...u.models.filter(m => m.wounds > 0).map(m => m.profile.Ld ?? 0)))
  const t = testLeadership(game.rng, ld)
  const host = hostOf(game, u)
  say(game, 'roll', `${u.name} uses ${itemName(id)}: Leadership test on its own Leadership ${ld}: ${t.dice.join('+')}=${t.total} — ${t.passed ? 'PASSED' : 'FAILED'}.`)
  if (t.passed && T.grounded) {
    const enemies = game.units.filter(x => x.side !== u.side)
    for (const x of enemies) x.status.grounded = (x.status.grounded || 0) + 1 // (counted: two such effects end one at a time)
    addEffect(game, { kind: 'grounded', side: u.side, until: 'nextStartOfTurn', revert: () => { for (const x of enemies) x.status.grounded = Math.max(0, (x.status.grounded || 0) - 1) }, say: 'The Warped Moon sets: enemy fliers may Fly again.' })
    say(game, 'good', `The Banner of the Warped Moon: no enemy unit may Fly until ${u.name}'s next Start of Turn.`)
    return { ok: true }
  }
  if (t.passed && T.moveD3) {
    const r = d3(game.rng)
    const reverts = [u, ...(host ? [host] : [])].map(x => bump(x, 'M', r))
    addEffect(game, { kind: 'potion', side: u.side, unitId: u.id, until: 'nextStartOfTurn', revert: () => reverts.forEach(f => f()), say: `The Taskmaster's Scourge: the extra Movement ends.` })
    say(game, 'good', `${u.name}${host ? ` and ${host.name}` : ''}: +${r} Movement (D3) until the next Start of Turn.`)
    return { ok: true }
  }
  if (t.passed) {
    const reverts = [u, ...(host ? [host] : [])].map(x => grant(x, T.rules))
    addEffect(game, { kind: 'potion', side: u.side, unitId: u.id, until: 'nextStartOfTurn', revert: () => reverts.forEach(f => f()), say: `${itemName(id)}: ${T.rules.join(', ')} ends.` })
    say(game, 'good', `${u.name}${host ? ` and ${host.name}` : ''}: ${T.rules.join(', ')} until the next Start of Turn.`)
  }
  return { ok: true }
}
