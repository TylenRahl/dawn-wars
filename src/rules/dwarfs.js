// The Deephold Clans' own army rules (the runes themselves are in runes.js), as small functions and tables that the
// shared rules modules call at the right moment (combat, damage, Leadership, magic and others; each comment says
// where).

import { slashingAttack } from './unmade.js'
import { dropRocks } from './saurians.js'
import { say } from './game.js'
import { hasRule, distanceBetween, isDead, alive, corners, centre } from './units.js'
import { rollDice, scatterDie } from './dice.js'
import { polysOverlap } from './geometry.js'
import { spellHits, templateHits } from './spells.js'
import { applyWounds } from './damage.js'

const live = c => !c.status?.removed && !isDead(c)

// Resolute — -1 to a Flee or Pursuit roll (to a minimum of 1)
export const resolute = (u, total) => hasRule(u, 'Resolute') ? Math.max(1, total - 1) : total

// Untouchable saves (damage.js saveFor):
// Runes of Protection — 6+ against non-magical attacks
// Runes of Warding — 5+ against Flaming Attacks
// Ancestral Shield — the Anvil of Ruin and its Anvil Guard, 5+ against any wounds
export function dwarfWards (u) {
  const out = []
  if (hasRule(u, 'Runes of Protection')) out.push({ value: 6, nonMagical: true, source: 'Runes of Protection' })
  if (hasRule(u, 'Runes of Warding')) out.push({ value: 7, flaming: 5, source: 'Runes of Warding' })
  if (hasRule(u, 'Ancestral Shield')) out.push({ value: 5, source: 'Ancestral Shield' })
  return out
}

// Rules a character gives the unit it joins (units.js rulesOf):
// Ancestral Reckoning — Hatred (enemy characters), to Greybeards or Kingshammers it joins
// Forgefire — Armour Bane (2) and Flaming Attacks to any unit it joins
// King of the Slayer Hold — Kingshammers joined by Durnak: Immune to Psychology, Unbreakable
export function dwarfJoinedRules (u, joined = []) {
  const out = []
  const js = joined.filter(live)
  if (u.special?.has('Ancestral Reckoning')) out.push('Hatred (enemy characters)')
  // The Grudgestone, Reckoning Lore: once set, Haldor and his unit are Unbreakable, and
  // their Hatred (Rukka & Nippers) becomes Hatred (all enemies)
  if ([u, ...js].some(c => c.status?.grudgestone)) out.push('Unbreakable', 'Hatred (all enemies)')
  if (/^(long-beards|kingshammers)/.test(u.entryId || '') && js.some(c => c.special.has('Ancestral Reckoning'))) out.push('Hatred (enemy characters)')
  if (js.some(c => c.special.has('Forgefire'))) out.push('Armour Bane (2)', 'Flaming Attacks')
  // Rune of Passage: any unit joined by the bearer has Move Through Cover
  if (js.some(c => (c.items || []).includes('rune-of-passage'))) out.push('Move Through Cover')
  if (/^kingshammers/.test(u.entryId || '') && js.some(c => c.special.has('King of the Slayer Hold'))) out.push('Immune to Psychology', 'Unbreakable')
  return out
}

// Deepsteel Armour — re-roll natural 1s on an Armour Roll (damage.js itemSaveRerolls)
export const deepsteelArmour = u => hasRule(u, 'Deepsteel Armour')
// Deepsteel Weapons — a single ordinary hand weapon has AP -1 (not two hand weapons, any other
// weapon, or a runic one) (damage.js meleeWeaponOf)
export const deepsteelWeapons = u => hasRule(u, 'Deepsteel Weapons')

// Dwarf Crafted — no -1 To Hit when it Stands & Shoots (shooting.js)
export const dwarfCrafted = u => hasRule(u, 'Dwarf Crafted')

// Venerable — friendly units within 6" of a not-fleeing Greybeards unit re-roll a failed Panic
// test (leadership.js)
export const venerableNear = (game, u) => game.units.some(v => v.side === u.side && v !== u && v.placed && live(v) && !v.status.fleeing && hasRule(v, 'Venerable') && distanceBetween(v, u) <= 6)

// Stoic Defenders — in a turn it was charged, +1 Initiative and +1 Attacks (combat.js)
export const stoicDefender = (game, u) => hasRule(u, 'Stoic Defenders') && u.status.wasCharged === `${game.round}:${game.active}`

// Slayer of Unmade, Slayer of Dragons, Whirlwind of Death — a roll To Wound of 4+
// always succeeds; the Slayers' unsaved wounds have Multiple Damage (D3) against behemoths (and Weave-spawned, the
// Unmade Slayer's)
// (and Slayer: the Slayers, Durnak)
export const woundsOnFour = u => hasRule(u, 'Slayer') || hasRule(u, 'Slayer of Unmade') || hasRule(u, 'Slayer of Dragons') || hasRule(u, 'Whirlwind of Death')
export function slayerMultiple (a, b) {
  const behemoth = /Behemoth/.test((b.troopType || []).join(' '))
  if (hasRule(a, 'Slayer of Dragons') && behemoth) return true
  return hasRule(a, 'Slayer of Unmade') && (behemoth || hasRule(b, 'Weave-spawned'))
}

// Deathblow — a model with it slain by an enemy attack in the Combat phase: the attacking unit
// (in a challenge, the model) suffers a Strength 3 hit, AP -1. Returns how many such hits.
export const deathblows = (b, slain) => hasRule(b, 'Deathblow') ? slain : 0

// Fight Me — issues and accepts challenges as a character
// Royal Guard — so do Kingshammers joined by a King or Thane
// ('"Fight Me!" (Giant Slayers only)': a unit of Slayers with Giant Slayers among it)
export const fightsLikeCharacter = u => ([...(u.special || [])].some(r => /Fight Me!/.test(r)) && ((u.options || []).some(o => /Giant Slayer/.test(o)) || u.models.some(m => /Giant Slayer/.test(m.name)))) || (/^kingshammers/.test(u.entryId || '') && (u.joined || []).some(c => live(c) && /^(king|thane|haldor-ullekson|durnak-ironhand)$/.test(c.entryId || '')))

// Stand Back Chief — not a target for enemy shooting or spells within 3" of a friendly war machine
export const standsBack = (game, c) => (hasRule(c, 'Stand Back Chief') || hasRule(c, '"Stand Back Chief"')) && !c.status.joinedTo && game.units.some(m => m.side === c.side && m !== c && m.placed && live(m) && /war machine/i.test((m.troopType || []).join(' ') + ' ' + m.category) && distanceBetween(m, c) <= 3)

// First to the Fray — maximum charge range +3", and +D3 to the Charge roll
export const firstToTheFray = u => hasRule(u, 'First to the Fray')

// Deathwhirl — slain, worth no Victory Points; alive at the end, its foe wins its points again
export const isDeathwhirl = u => hasRule(u, 'Deathwhirl')

// Artillery Master, Range Finding Optics — once a turn in the Shooting phase, not fleeing or
// engaged: a friendly Boltbeards, Firebeards or Dwarf war machine within Command range re-rolls natural 1s To Hit or a
// single Artillery dice (warMachines.js, shooting.js). Returns the character, or null.
export function artilleryMaster (game, u, commandRange) {
  if (!/^(boltbeards|firebeards)/.test(u.entryId || '') && !/war machine/i.test((u.troopType || []).join(' ') + ' ' + u.category)) return null
  const key = `${game.round}:${game.active}`
  return game.units.find(e => e.side === u.side && e.placed && live(e) && (hasRule(e, 'Artillery Master') || hasRule(e, 'Range Finding Optics')) && !e.status.fleeing && !e.status.engaged && e.status.artilleryMasterTurn !== key && distanceBetween(e, u) <= commandRange(e)) || null
}
export const useArtilleryMaster = (game, e) => { e.status.artilleryMasterTurn = `${game.round}:${game.active}` }
// (Range-finding Optics: Torvik and his unit, no -1 for Long Range)
export const opticsLongRange = u => hasRule(u, 'Range Finding Optics') || (u.joined || []).some(c => live(c) && hasRule(c, 'Range Finding Optics'))

// Entrenchment, Prepared Positions — at deployment, a war machine for each Engineer (and
// Torvik's: one war machine and one unit of Boltbeards or Firebeards) is Entrenched: partial cover and defending a
// low linear obstacle, until it moves. (The game entrenches the first ones deployed: a guess at the player's choice.)
export function entrench (game, side) {
  const us = game.units.filter(u => u.side === side && u.placed && live(u))
  const machines = us.filter(u => /war machine/i.test((u.troopType || []).join(' ')) && !(u.troopType || []).includes('Character'))
  const shooters = us.filter(u => /^(boltbeards|firebeards)/.test(u.entryId || ''))
  let m = us.filter(c => hasRule(c, 'Entrenchment') || hasRule(c, 'Prepared Positions')).length
  let s = us.filter(c => hasRule(c, 'Prepared Positions')).length
  for (const u of machines) if (m > 0 && !u.status.entrenched) { u.status.entrenched = true; m--; say(game, '', `${u.name} is Entrenched: partial cover, and it defends a low linear obstacle until it moves.`) }
  for (const u of shooters) if (s > 0 && !u.status.entrenched) { u.status.entrenched = true; s--; say(game, '', `${u.name} is Entrenched (Prepared Positions): partial cover, and it defends a low linear obstacle until it moves.`) }
}

// Dive Bomb — once a game, Rotorwings flying over an enemy unit not engaged in combat in the
// Remaining Moves sub-phase: D6 Strength 3 hits, AP -1, for each model that flew over it; each natural 1 rolled for
// the hits is a misfire, and the Rotorwings lose a single Wound instead.
// Bombing Run — a Rotorbomber over such a unit: a roll on the Bombing Run table.
// (Made against the first enemy unit flown over, every model counted: a guess at the player's choice.)
export function bombsAway (game, u, path) {
  if (game.sub !== 'remaining' || u.status.removed) return
  const dive = hasRule(u, 'Dive Bomb') && !u.status.diveBombed
  const run = hasRule(u, 'Bombing Run')
  // Wake of Fire (a Emberwing Phoenix): D6 S4 AP -1 Flaming hits on the unit flown over
  const wake = hasRule(u, 'Wake of Fire')
  // Spectral Reapers: Cursewraiths flying over an enemy unit not engaged (vampires.js)
  const reap = hasRule(u, 'Spectral Reapers')
  // (Drop Rocks: Cliffwing Riders, once a game — saurians.js)
  const rocks = hasRule(u, 'Drop Rocks') && !u.status.rocksDropped
  // (Slashing Attack: Screamers — unmade.js)
  const slash = hasRule(u, 'Slashing Attack')
  if (!dive && !run && !wake && !reap && !rocks && !slash) return
  const under = game.units.find(o => o.side !== u.side && o.placed && live(o) && !o.status.engaged && !o.status.fleeing && path.some(snap => { const was = { pos: u.pos, facing: u.facing }; u.pos = snap.pos; u.facing = snap.facing; const hit = polysOverlap(corners(u), corners(o), 0); Object.assign(u, was); return hit }))
  if (!under) return
  if (rocks && dropRocks(game, u, under, spellHits)) return
  if (slash) { slashingAttack(game, u, under, spellHits); return }
  if (reap) { const n = u.models.filter(m => m.wounds > 0).length; say(game, 'roll', `${u.name} sweep over ${under.name} — SPECTRAL REAPERS: ${n} Strength 4 hit${n === 1 ? '' : 's'}, no Armour Roll, Flaming and Magical (each model that moved over it).`); spellHits(game, under, n, 4, 0, { flaming: true, noArmour: true, label: 'Spectral Reapers: ' }); return }
  if (wake) { const n = rollDice(game.rng, 1)[0]; say(game, 'roll', `${u.name} trails a WAKE OF FIRE over ${under.name}: D6 = ${n} Strength 4 hits, AP -1, Flaming.`); spellHits(game, under, n, 4, -1, { flaming: true, nonMagical: true, label: 'Wake of Fire: ' }); return }
  if (dive) {
    u.status.diveBombed = true
    const n = alive(u).length
    const dice = rollDice(game.rng, n)
    const ones = dice.filter(d => d === 1).length
    const hits = dice.filter(d => d !== 1).reduce((a, b) => a + b, 0)
    say(game, 'roll', `${u.name} DIVE BOMBS ${under.name} (once a game): D6 for each of ${n} Rotorwing${n === 1 ? '' : 's'} [${dice.join(' ')}] — ${hits} Strength 3 hits, AP -1${ones ? `; ${ones} misfire${ones === 1 ? '' : 's'}: ${u.name} loses ${ones} Wound${ones === 1 ? '' : 's'}` : ''}.`)
    if (hits) spellHits(game, under, hits, 3, -1, { label: 'Dive Bomb: ', nonMagical: true })
    if (ones) applyWounds(game, u, ones, 'its own bombs')
    return
  }
  const r = rollDice(game.rng, 1)[0]
  if (r === 1) { say(game, 'roll', `${u.name}'s Bombing Run over ${under.name}: ${r} — PREMATURE DETONATION, it loses a single Wound.`); applyWounds(game, u, 1, 'a premature detonation'); return }
  if (r === 2) { say(game, 'roll', `${u.name}'s Bombing Run over ${under.name}: ${r} — a DUD lands on a head: ${under.name} loses a single Wound.`); applyWounds(game, under, 1, 'a dud bomb'); return }
  const templates = r <= 4 ? [2.5] : [1.5, 1.5]
  say(game, 'roll', `${u.name}'s Bombing Run over ${under.name}: ${r} — ${r <= 4 ? 'DIRECT HIT: a 5" template' : 'BOMBS AWAY: two 3" templates'} over its centre, each scattering D6".`)
  for (const rad of templates) {
    const s = scatterDie(game.rng)
    const d = rollDice(game.rng, 1)[0]
    const c = centre(under)
    const a = s.hit ? null : (s.angle - 90) * Math.PI / 180
    const at = a == null ? c : { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }
    say(game, 'roll', `Scatter: ${s.hit ? 'HIT — it stays over the centre' : `arrow ${s.angle}°, ${d}"`}.`)
    templateHits(game, at, rad, 4, -1, { label: 'Bombing Run: ', nonMagical: true })
  }
}

// The Grudgestone — in any Start of Turn sub-phase Haldor may set the Grudgestone: from then
// on he and his unit are Unbreakable and pass Panic tests, cannot Flee as a charge reaction, and move only to Give
// Ground, follow up or reform (movement.js, charge.js, shooting.js)
export const canSetGrudgestone = (game, c) => game.sub === 'start' && c.side === game.active && c.placed && live(c) && hasRule(c, 'Reckoning Lore') && !c.status.grudgestone
export function setGrudgestone (game, c) {
  c.status.grudgestone = true
  say(game, 'good', `${c.name} sets the GRUDGESTONE: he and his unit are Unbreakable, pass their Panic tests and hate all enemies — and will not move from this spot.`)
}
export const grudgeBound = u => [u, ...(u.joined || []).filter(live)].some(c => c.status?.grudgestone)
