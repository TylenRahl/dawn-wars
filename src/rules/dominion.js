// The Dominion Hosts' own army rules (Marks, Cults, Dominion Armour, the Gaze of the Gods and the rest), as small
// functions and tables that the shared rules modules call at the right moment (combat, damage, Leadership, magic and
// others; each comment says where).

import { say } from './game.js'
import { hasRule, ruleValue, alive, isDead, distanceBetween } from './units.js'
import { rollDice } from './dice.js'
import { unitMass } from './troops.js'

const live = c => !c.status?.removed && !isDead(c)
const has = (u, name) => [...(u?.special || [])].some(r => r === name || r.startsWith(name + ' ('))

// Rules the Marks, Cults, Forsaken and Spawn give (rulesOf, units.js). The option chosen names the rule; a Mark
// of a god replaces the Mark of the Unbound (Chaotic Cults).
// Mark of Wrath — Frenzy; Mark of Cipher — Flaming Attacks, Magic Resistance (-1)
// Cult of the Slithering Serpent — Poisoned Attacks
// Forsaken by Wrath Hatred (all enemies); -endurance Fear; -rapture Swiftstride; -cipher MR (-3)
// Spawn of Wrath Killing Blow; -endurance Poisoned Attacks; -rapture Strike First; -cipher Flaming
// and Magical Attacks; Gigantic Spawn of Wrath Impact Hits (D3), Killing Blow; -endurance Poisoned Attacks, Regeneration
// (5+); -rapture Counter Charge, Strike First; -cipher Flaming Attacks, Magical Attacks, Magic Resistance (-2)
const GRANTS = {
  'Mark of Wrath': ['Frenzy'],
  'Mark of Cipher': ['Flaming Attacks', 'Magic Resistance (-1)'],
  'Cult of the Slithering Serpent': ['Poisoned Attacks'],
  'Forsaken by Wrath': ['Hatred (all enemies)'],
  'Forsaken by Endurance': ['Fear'],
  'Forsaken by Rapture': ['Swiftstride'],
  'Forsaken by Cipher': ['Magic Resistance (-3)'],
  'Spawn of Wrath': ['Killing Blow'],
  'Spawn of Endurance': ['Poisoned Attacks'],
  'Spawn of Rapture': ['Strike First'],
  'Spawn of Cipher': ['Flaming Attacks', 'Magical Attacks'],
  'Gigantic Spawn of Wrath': ['Impact Hits (D3)', 'Killing Blow'],
  'Gigantic Spawn of Endurance': ['Poisoned Attacks', 'Regeneration (5+)'],
  'Gigantic Spawn of Rapture': ['Counter Charge', 'Strike First'],
  'Gigantic Spawn of Cipher': ['Flaming Attacks', 'Magical Attacks', 'Magic Resistance (-2)']
}
export const GOD_MARKS = ['Mark of Wrath', 'Mark of Endurance', 'Mark of Rapture', 'Mark of Cipher']
// At fielding (units.js fieldUnit): a god's Mark replaces Undivided; a Cult's characteristic; the granted rules
export function dominionOptions (unit) {
  if (GOD_MARKS.some(m => unit.special.has(m)) || [...unit.special].some(r => /^Cult of /.test(r))) unit.special.delete('Mark of the Unbound')
  for (const [name, rules] of Object.entries(GRANTS)) if (unit.special.has(name)) for (const r of rules) unit.special.add(r)
  // Cult of the Bloodied Hound +1 WS; Cult of the Carrion Crow +1 T
  const stat = unit.special.has('Cult of the Bloodied Hound') ? 'WS' : unit.special.has('Cult of the Carrion Crow') ? 'T' : null
  if (stat) for (const m of unit.models) m.profile = { ...m.profile, [stat]: Math.min(10, (m.profile[stat] ?? 0) + 1) }
}

// Untouchable saves (damage.js saveFor):
// Dominion Armour Dominion Hosts — the Ward value in brackets
// Cult of the Fell Raptor — 6+ against non-magical attacks
// Fire and Dominion — Wyrdfire Dragon, 5+ against Magical or Flaming Attacks
// The Quickening Storm — 5+ against Magic Missiles and Magical Vortices (spells.js spellCategory)
export function dominionWards (u, { magical = false, flaming = false, category = null } = {}) {
  const out = []
  const ca = ruleValue(u, 'Dominion Armour')
  if (ca) out.push({ value: Number(String(ca).replace('+', '')) || 6, source: 'Dominion Armour' })
  if (has(u, 'Cult of the Fell Raptor')) out.push({ value: 6, nonMagical: true, source: 'the Cult of the Fell Raptor' })
  if (hasRule(u, 'Fire & Dominion') && (magical || flaming)) out.push({ value: 5, source: 'Fire & Dominion' })
  if (hasRule(u, 'The Quickening Storm') && ['Magic Missile', 'Magical Vortex'].includes(category)) out.push({ value: 5, source: 'the Quickening Storm' })
  return out
}
// Wyrdfire Aura — other models within 3" of a Wyrdfire Dragon have no Untouchable save
export const wyrdfireAura = (game, u) => !!game && game.units.some(d => d !== u && d.placed && live(d) && hasRule(d, 'Wyrdfire Aura') && distanceBetween(d, u) <= 3)

// Ensorcelled Weapons — a single non-magical hand weapon: Magical Attacks, AP -1 (damage.js)
export const ensorcelled = u => hasRule(u, 'Ensorcelled Weapons')

// Mark of the Unbound — re-roll failed Fear, Panic and Terror tests (leadership.js)
export const undividedReroll = (u, kind) => ['fear', 'panic', 'terror'].includes(kind) && hasRule(u, 'Mark of the Unbound')
// Mark of Rapture — a unit mostly of it passes Panic tests (shooting.js); +1 Initiative in the
// first round of a combat (combat.js)
export const raptureCalm = u => hasRule(u, 'Mark of Rapture')
// Mark of Endurance — attacks directed at it re-roll natural 6s To Hit (combat.js)
export const enduranceFlies = u => hasRule(u, 'Mark of Endurance')
// Mark of Cipher — a Wizard with it, with a Cipher unit of Unit Mass 10+: +1 to cast
export const cipherCasting = (game, w, host) => hasRule(w, 'Mark of Cipher') && !!host && hasRule(host, 'Mark of Cipher') && unitMass(host) >= 10

// Gaze of the Gods — in its Command sub-phase a character may roll on the table
export const canGaze = (game, c) => game.sub === 'command' && c.side === game.active && c.placed && live(c) && !c.status.fleeing && hasRule(c, 'Gaze of the Gods') && c.status.gazeTurn !== `${game.round}:${game.active}`
export function gaze (game, c, addEffect) {
  c.status.gazeTurn = `${game.round}:${game.active}`
  let r = rollDice(game.rng, 1)[0]
  // Favour of the Gods: single use, the D6 re-rolled (used on a 1: Damned by Dominion)
  if (r === 1 && (c.items || []).includes('favour-of-the-gods') && !(c.status.spentItems || []).includes('favour-of-the-gods')) { c.status.spentItems = [...(c.status.spentItems || []), 'favour-of-the-gods']; const again = rollDice(game.rng, 1)[0]; say(game, 'roll', `${c.name}'s Favour of the Gods: the 1 re-rolled — ${again}.`); r = again }
  const m = c.models[0]
  const bump = (k, n = 1, max = 10) => { m.profile = { ...m.profile, [k]: Math.min(max, (m.profile[k] ?? 0) + n) } }
  const until = (k) => { const was = m.profile[k]; bump(k); const got = m.profile[k] - was; addEffect(game, { kind: 'gaze', side: c.side, until: 'nextStartOfTurn', revert: () => { m.profile = { ...m.profile, [k]: m.profile[k] - got } }, say: `${c.name}: the Gaze of the Gods passes.` }) }
  let text
  if (r === 1) { if (c.special.has('Stupidity')) { m.profile = { ...m.profile, Ld: Math.max(2, (m.profile.Ld ?? 7) - 1) }; text = 'DAMNED BY THE DOMINION: already Stupid, -1 Leadership' } else { c.special.add('Stupidity'); text = 'DAMNED BY THE DOMINION: Stupidity for the rest of the game' } }
  else if (r === 2) { until('I'); text = 'Unnatural Quickness: +1 Initiative until its next Start of Turn' }
  else if (r === 3) { until('T'); text = 'Iron Skin: +1 Toughness until its next Start of Turn' }
  else if (r === 4) { bump('WS'); text = 'Murderous Mutation: +1 Weapon Skill for the rest of the game' }
  else if (r === 5) { bump('A'); text = 'Dark Fury: +1 Attacks for the rest of the game' }
  else { bump('S'); bump('Ld'); text = 'APOTHEOSIS: +1 Strength and Leadership for the rest of the game' }
  say(game, r === 1 ? 'bad' : 'good', `${c.name} seeks the Gaze of the Gods: D6 = ${r} — ${text}.`)
}

// Rampant Mutation — when its combat is chosen, a D6: 1-2 Poisoned Attacks, 3-4 AP -2, 5-6
// Killing Blow, until the end of the Combat phase (combat.js)
export function rampantMutation (game, u) {
  const key = `${game.round}:${game.active}`
  if (!hasRule(u, 'Rampant Mutation') || u.status.mutation?.key === key) return
  const r = rollDice(game.rng, 1)[0]
  const kind = r <= 2 ? 'poison' : r <= 4 ? 'talons' : 'claws'
  u.status.mutation = { key, kind }
  say(game, 'roll', `${u.name}'s Rampant Mutation: D6 = ${r} — ${kind === 'poison' ? 'Venomous Fangs (Poisoned Attacks)' : kind === 'talons' ? 'Razor Talons (AP -2)' : 'Decapitating Claws (Killing Blow)'} until the end of this Combat phase.`)
}
export const mutationRules = (game, u) => { const m = u.status?.mutation; if (!m || !game || m.key !== `${game.round}:${game.active}` || game.phase !== 'combat') return []; return m.kind === 'poison' ? ['Poisoned Attacks'] : m.kind === 'claws' ? ['Killing Blow'] : [] }
export const mutationAP = (game, u) => { const m = u.status?.mutation; return m && game && m.key === `${game.round}:${game.active}` && m.kind === 'talons' ? -2 : null }

// Commander and Captain — Marauder units within Brannoc's Command range +1 Leadership (to 10)
export const brannocNear = (game, u, commandRange) => /^(dominion-marauders|marauder-horsemen|marauder-tribe-huscarls|marauder-tribe-berserkers)/.test(u.entryId || '') && game.units.some(c => c.side === u.side && c.placed && live(c) && !c.status.fleeing && hasRule(c, 'Commander & Captain') && distanceBetween(c, u) <= commandRange(c))
// Chainmaker — a standard captured by Brannoc or her unit: 100 Victory Points (damage.js)
export const chainmaker = by => !!by && [by, ...(by.joined || []).filter(live)].some(c => hasRule(c, 'Chainmaker'))

// Spirit of Vaelgrath — each Start of Turn a Leadership test; failed, his spirit rebels until the
// next: Level 1 Wizard (magic.js), Random Movement (2D6) (randomMovement.js). (His D3 attacks against himself are not
// in the game yet.)
export function spiritOfVaelgrath (game, side) {
  for (const u of game.units.filter(u => u.side === side && u.placed && live(u) && hasRule(u, 'Spirit of Vaelgrath'))) {
    const ld = u.models[0]?.profile.Ld ?? 8
    const d = rollDice(game.rng, 2)
    const t = d[0] + d[1]
    const ok = t === 2 || (t !== 12 && t <= ld)
    u.status.spiritRebels = !ok
    say(game, 'roll', `${u.name} — Spirit of Vaelgrath, Leadership test: ${d.join('+')} = ${t}, needs ${ld} or less — ${ok ? 'he is controlled as normal' : 'HIS SPIRIT REBELS: Level 1 Wizard and Random Movement (2D6) this turn'}.`)
  }
}

// Explosive Demise — a Wyrdfire Dragon losing its last Wound: every unit within 6" (friend or
// foe) suffers D6 Strength 5 hits, AP -2 (damage.js removeUnit)
export function explosiveDemise (game, u, spellHits) {
  if (!hasRule(u, 'Explosive Demise') || u.status.exploded) return
  u.status.exploded = true
  say(game, 'bad', `${u.name} dies in an EXPLOSIVE DEMISE: every unit within 6" suffers D6 Strength 5 hits, AP -2.`)
  for (const o of game.units.filter(o => o !== u && o.placed && live(o) && distanceBetween(o, u) <= 6)) {
    const n = rollDice(game.rng, 1)[0]
    spellHits(game, o, n, 5, -2, { label: `Explosive Demise on ${o.name} (${n} hits): `, nonMagical: true })
  }
}

// Wilful Beast — each Start of Turn a test of the model's own unmodified Leadership; failed, the
// mount is subject to Frenzy until the next (units.js rulesOf); the rider gains no +1 Attack from it (combat.js)
export function wilfulBeasts (game, side) {
  for (const u of game.units.filter(u => u.side === side && u.placed && live(u) && hasRule(u, 'Wilful Beast'))) {
    const ld = u.models[0]?.profile.Ld ?? 7
    const d = rollDice(game.rng, 2)
    const t = d[0] + d[1]
    const ok = t === 2 || (t !== 12 && t <= ld)
    u.status.wilful = !ok
    say(game, 'roll', `${u.name} — Wilful Beast, Leadership test: ${d.join('+')} = ${t}, needs ${ld} or less — ${ok ? 'the rider keeps control' : `LOST CONTROL: the ${u.mount?.name || 'mount'} is Frenzied until the next Start of Turn`}.`)
  }
}

// At fielding: the traits that depend on its armour (units.js)
export function dominionItemsAtFielding (unit) {
  const heavy = /heavy|full plate/i.test(unit.armour || '') || /heavy armour|full plate/i.test(unit.equipmentText || '')
  if ((unit.items || []).includes('unnatural-fortitude') && !heavy) for (const m of unit.models) m.profile = { ...m.profile, T: Math.min(10, (m.profile.T ?? 3) + 1) }
  if ((unit.items || []).includes('longstriders') && !heavy) unit.special.add('Vanguard')
}

// After a group of blows has caused Wounds (combat.js strike): the Filth Mace, the Dagger of the Dark Pantheon, the
// Spellthieving Sword, Acid Ichor
export function dominionOnWound (game, a, b, g, lost, duel) {
  const it = g.itemId
  // Filth Mace: the model wounded tests Toughness; failed, -1 Toughness (to 1) until the end of turn
  if (it === 'filth-mace' && !b.status.removed && !isDead(b)) {
    const m = alive(b)[0]
    const r = rollDice(game.rng, 1)[0]
    const failed = r === 6 || r > (m.profile.T ?? 3)
    say(game, 'roll', `Filth Mace: ${b.name} Toughness test ${r} against T${m.profile.T} — ${failed ? 'FAILED, -1 Toughness until the end of the turn' : 'passed'}.`)
    if (failed && m.profile.T > 1) { m.profile = { ...m.profile, T: m.profile.T - 1 }; game.effects = [...(game.effects || []), { kind: 'filth', side: a.side, until: 'endOfTurn', revert: () => { m.profile = { ...m.profile, T: m.profile.T + 1 } } }] }
  }
  // Dagger of the Dark Pantheon: +1 to the wielder's next Casting or Dispel roll per Wound
  // (the wielder: a character joined to the attacking unit, or the attacker itself)
  const wielder = [a, ...(a.joined || [])].find(c => (c.items || []).includes('dagger-of-the-dark-pantheon')) || a
  if (it === 'dagger-of-the-dark-pantheon') { a = wielder; a.status.pantheon = (a.status.pantheon || 0) + lost; say(game, 'good', `The Dagger of the Dark Pantheon drinks ${lost} Wound${lost === 1 ? '' : 's'}: +${a.status.pantheon} to ${a.name}'s next Casting or Dispel roll.`) }
  // Manreaver: the unit it wounds -1 Leadership (to 2) until the end of the turn (leadership.js)
  if (it === 'manreaver' && !b.status.removed) { b.status.manreaver = `${game.round}:${game.active}`; say(game, '', `The Manreaver saps ${b.name}: -1 Leadership until the end of the turn.`) }
  // Spellthieving Sword: an enemy Wizard wounded forgets a random spell for the rest of the game
  if (it === 'spellthieving-sword' && b.wizard?.spells?.length) {
    const i = Math.floor(game.rng() * b.wizard.spells.length)
    const [gone] = b.wizard.spells.splice(i, 1)
    say(game, 'bad', `The Spellthieving Sword: ${b.name} forgets ${gone}.`)
  }
}

// Aura of Pain — once a game, when its combat is chosen: one enemy unit it is engaged with suffers
// D6 Strength 3 hits, no armour or Regeneration save (combat.js)
export function auraOfPain (game, u, units, hit) {
  const bearer = [u, ...(u.joined || [])].find(c => live(c) && (c.items || []).includes('aura-of-pain') && !c.status.auraOfPainUsed)
  if (!bearer) return
  const foe = units.find(o => o.side !== u.side && live(o) && (u.engagedWith || {})[o.id])
  if (!foe) return
  bearer.status.auraOfPainUsed = true
  const n = rollDice(game.rng, 1)[0]
  say(game, 'roll', `${bearer.name}'s Aura of Pain (once a game): D6 = ${n} Strength 3 hits on ${foe.name}, no armour or Regeneration save.`)
  hit(game, bearer, foe, n, 3)
}
