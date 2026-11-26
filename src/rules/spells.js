// The spells' effects, and the lasting effects they leave (game.effects): each spell's handler by slug, plus the
// helpers other modules use to add, find and end effects, deal spell hits and place templates and vortices. Used by
// magic.js when a spell is cast, and by turn.js, combat, shooting, movement and the battle screens.
//
// Lasting effects: game.effects = [{ kind, side, casterId, unitId, until, ... }].
//   until 'endOfTurn'      — gone when this turn ends (turn.js nextStep)
//   until 'nextStartOfTurn' — gone at the caster's next Start of Turn (turn.js beginTurn)
// Characteristic changes are made to the models' profiles and put back when the effect ends,
// never below 1 or above 10 (Hex).

import { dryAsDust } from './tombkings.js'
import { risenZombies } from './vampires.js'
import { polysOverlap as polysOverlapS } from './geometry.js'
import { becalm } from './arcane.js'
import { itemFlag, itemById } from './items.js'
const MAGIC_TYPES = /^(weapon|armor|talisman|arcane-item|enchanted-item|banner)$/
import { say, onTable, solid } from './game.js'
import { rollDice, d3, d6, scatterDie } from './dice.js'
import { add, mul, dist, pointInPoly, segDist, nearestOnSeg } from './geometry.js'
import { unitLabel, centre, corners, modelSlots, distanceBetween, isDead, hasRule, alive } from './units.js'
import { toWoundNeed, saveFor, applyWounds, applyMultipleDamage, meleeWeaponOf, meleeStrength, itemSaveRerolls, charmedWard } from './damage.js'
import { panicTest, afterShooting, targetToughness } from './shooting.js'
import { giveGround } from './combat.js'
import { commandRange, leadershipTest } from './leadership.js'
import { hostOf } from './joining.js'

export const IMPLEMENTED_LORES = ['battle-magic', 'big-ruck-magic', 'elementalism', 'illusion', 'unmade-rites', 'dark-magic', 'necromancy', 'troll-magic', 'lore-of-the-wilds', 'high-magic']

// ---- lasting effects ----
export function addEffect (game, e) {
  game.effects = game.effects || []
  game.effects.push(e)
  return e
}
export function effectsOn (game, kind, pred = () => true) {
  return (game.effects || []).filter(e => e.kind === kind && pred(e))
}
export function endEffects (game, when, side) {
  const keep = []
  for (const e of game.effects || []) {
    const ends = (when === 'endOfTurn' && e.until === 'endOfTurn') || (when === 'startOfTurn' && e.until === 'nextStartOfTurn' && e.side === side)
    if (!ends) { keep.push(e); continue }
    if (e.revert) e.revert()
    if (e.say) say(game, '', e.say)
  }
  game.effects = keep
}

// (exported for rules outside the spells that change characteristics until a time: My Will Be Done — tombkings.js)
export const statModFor = (...a) => statMod(...a)
export const grantRulesFor = (...a) => grantRules(...a)
function statMod (game, u, stats, delta, floor = 1) {
  const applied = []
  // (a chariot's crew carry the rider's characteristics too: Split Profile Chariots)
  for (const m of [...u.models, ...(u.mount ? [u.mount] : []), ...(u.crew || [])]) {
    for (const st of stats) {
      const was = m.profile[st]
      if (typeof was !== 'number') continue
      // never below `floor` (1, or 2 where a spell says "to a minimum of 2"), never above 10 (Hex)
      const now = Math.max(floor, Math.min(10, was + delta))
      m.profile[st] = now
      applied.push([m, st, now - was])
    }
  }
  return () => { for (const [m, st, d] of applied) m.profile[st] -= d }
}

// Is this unit inside an aura effect of `kind` (measured from the caster, within its Command range)?
export function inAura (game, kind, u) {
  return effectsOn(game, kind, e => {
    if (e.side !== u.side) return false
    const c = game.units.find(x => x.id === e.casterId)
    if (!c || c.status.removed || isDead(c)) return false
    const from = hostOf(game, c) || c
    return from === u || distanceBetween(from, u) <= commandRange(c)
  }).length > 0
}

// ---- hits from spells ----
// `n` automatic hits at S/AP on unit t. Options: noArmour, multipleWounds ('D3'), flaming.
export function spellHits (game, t, n, S, AP, { noArmour = false, noRegen = false, multipleDamage = null, flaming = false, label = '', nonMagical = false, autoWound = false, template = false } = {}) {
  if (!n || isDead(t) || t.status.removed) return 0
  const T = targetToughness(t)
  const need = toWoundNeed(S, T)
  if (need == null) { say(game, 'roll', `${label}${n} hits at S${S} against T${T}: too tough to wound.`); return 0 }
  // (autoWound: wounds suffered, not hits — no roll To Wound)
  const dice = autoWound ? [] : rollDice(game.rng, n)
  // Witchtree Fetish: its bearer's Magic Missiles re-roll natural 1s To Wound
  if (!autoWound && game.spellCategory === 'Magic Missile' && (game.spellCaster?.items || []).includes('witchtree-fetish') && dice.includes(1)) { const k = dice.filter(d => d === 1).length; const again = rollDice(game.rng, k); let j = 0; for (let i = 0; i < dice.length; i++) if (dice[i] === 1) dice[i] = again[j++]; say(game, 'roll', `Witchtree Fetish: ${k} natural 1${k === 1 ? '' : 's'} To Wound re-rolled [${again.join(' ')}].`) }
  const wounds = autoWound ? n : dice.filter(d => d !== 1 && d >= need).length
  if (!autoWound) say(game, 'roll', `${label}${n} hit${n === 1 ? '' : 's'}, To Wound S${S} against T${T} need ${need}+: [${dice.join(' ')}] — ${wounds} wound${wounds === 1 ? '' : 's'}.`)
  if (!wounds) return 0
  const sv = saveFor(t, { magical: !nonMagical, flaming, strength: S, template })
  let unsaved = wounds
  const parts = []
  if (sv.apImmune) AP = 0
  if (!noArmour && sv.armour - AP <= 6) {
    const okA = d => d !== 1 && d >= sv.armour - AP
    const sr = itemSaveRerolls(game, t, 'armour', rollDice(game.rng, wounds), okA)
    const sd = sr.dice
    if (sr.note) parts.push(sr.note.replace(/^ — /, ''))
    const saved = sd.filter(okA).length
    unsaved -= saved
    parts.push(`Armour Roll ${sv.armour - AP}+ (${sv.armourText}${AP ? `, AP ${AP}` : ''}): [${sd.join(' ')}] ${saved} saved`)
  } else parts.push(noArmour ? 'no Armour Roll allowed' : 'no Armour Roll possible')
  // Spellshield: a 5+ Ward against wounds from a Magic Missile, Magical Vortex or Assailment
  if (itemFlag(t, 'spellshield', { personal: true }) && ['Magic Missile', 'Magical Vortex', 'Assailment'].includes(game.spellCategory) && !nonMagical && (sv.ward == null || sv.ward > 5)) sv.ward = 5
  // The Loremaster's Cloak: the bearer and its unit 4+ against Magic Missiles
  if (game.spellCategory === 'Magic Missile' && !nonMagical && [t, ...(t.joined || []).filter(c => !c.status?.removed)].some(c => itemFlag(c, 'loreCloak', { personal: true })) && (sv.ward == null || sv.ward > 4)) sv.ward = 4
  // Shenese Jet Pendant: 6+ against the same
  if (itemFlag(t, 'jetPendant', { personal: true }) && ['Magic Missile', 'Magical Vortex', 'Assailment'].includes(game.spellCategory) && !nonMagical && (sv.ward == null || sv.ward > 6)) sv.ward = 6
  unsaved -= charmedWard(game, t, unsaved, sv)
  if (unsaved && sv.ward) {
    const wd = itemSaveRerolls(game, t, 'ward', rollDice(game.rng, unsaved), d => d >= sv.ward).dice
    const saved = wd.filter(d => d >= sv.ward).length
    unsaved -= saved
    parts.push(`Untouchable save ${sv.ward}+: [${wd.join(' ')}] ${saved} saved`)
  }
  if (unsaved && sv.regen && !noRegen) {
    const rd = itemSaveRerolls(game, t, 'regen', rollDice(game.rng, unsaved), d => d >= sv.regen).dice
    const saved = rd.filter(d => d >= sv.regen).length
    unsaved -= saved
    // (wounds Regeneration recovers still count for a Melee Outcome: Regeneration)
    game.regenCounted = (game.regenCounted || 0) + saved
    parts.push(`Regeneration ${sv.regen}+: [${rd.join(' ')}] ${saved} saved`)
  }
  say(game, 'roll', `${t.name}: ${parts.join('; ')}. ${unsaved} unsaved.`)
  // Dry as Dust: flaming hits, 4+ one more Wound each (tombkings.js)
  if (flaming && unsaved) unsaved += dryAsDust(game, t, unsaved)
  if (!unsaved) return 0
  if (multipleDamage) {
    const each = Array.from({ length: unsaved }, () => multipleDamage === 'D3' ? d3(game.rng) : Number(multipleDamage))
    return applyMultipleDamage(game, t, each, `Multiple Damage (${multipleDamage})`)
  }
  return applyWounds(game, t, unsaved, label.replace(/: $/, ''))
}

// A blast template: models wholly under are hit, partly under on a 4+ (Risk of Being Hit).
// `onHit(game, unit, n)`: what the hits do, instead of Strength S hits (Breath of Change)
export function templateHits (game, at, r, S, AP, { except = null, exceptAll = [], flaming = false, label = '', enemyOf = null, poly = null, nonMagical = false, noArmour = false, onHit = null } = {}) {
  let total = 0
  // joined characters stand in their units' front ranks: they are under templates too
  const joined = game.units.filter(c => c.status.joinedTo && c.placed && !c.status.removed && !isDead(c))
  for (const o of [...onTable(game), ...joined]) {
    if (o === except || exceptAll.includes(o)) continue
    if (enemyOf != null && o.side === enemyOf) continue
    let auto = 0; let partial = 0
    for (const sl of modelSlots(o)) {
      const hw = o.base.w / 2; const hd = o.base.d / 2
      const f = { x: Math.cos(o.facing), y: Math.sin(o.facing) }; const rr = { x: -f.y, y: f.x }
      const sq = [add(add(sl.at, mul(rr, -hw)), mul(f, hd)), add(add(sl.at, mul(rr, hw)), mul(f, hd)), add(add(sl.at, mul(rr, hw)), mul(f, -hd)), add(add(sl.at, mul(rr, -hw)), mul(f, -hd))]
      // a round blast template (centre `at`, radius r), or any other shape (`poly`, the flame template)
      const inside = poly ? sq.every(p => pointInPoly(p, poly)) : sq.every(p => dist(p, at) <= r)
      const touch = inside || (poly ? (sq.some(p => pointInPoly(p, poly)) || poly.some(p => pointInPoly(p, sq))) : (pointInPoly(at, sq) || sq.some((p, i) => segDist(p, sq[(i + 1) % 4], at, at) <= r)))
      if (!touch) continue
      if (inside || (!poly && pointInPoly(at, sq))) auto++
      else partial++
    }
    if (!auto && !partial) continue
    const pd = partial ? rollDice(game.rng, partial) : []
    const ph = pd.filter(d => d >= 4).length
    say(game, 'roll', `${label}${o.name}: ${auto} model${auto === 1 ? '' : 's'} wholly under the template, ${partial} partly under${partial ? ` — 4+ to be hit: [${pd.join(' ')}] ${ph}` : ''}.`)
    // ("Take the Blow!" is for shooting attacks only — Take the Blow! Characters — not spells)
    total += onHit ? onHit(game, o, auto + ph) : spellHits(game, o, auto + ph, S, AP, { flaming, label, nonMagical, noArmour, template: true })
  }
  return total
}

function scatter (game, at, dist0) {
  const s = scatterDie(game.rng)
  if (s.hit) return { at, text: 'Scatter dice HIT — it stays' }
  const rad = (s.angle - 90) * Math.PI / 180
  return { at: add(at, mul({ x: Math.cos(rad), y: Math.sin(rad) }, dist0)), text: `Scatter dice arrow (${s.angle}°), ${dist0}"` }
}

// A choice the caster's player makes: asked when there is a player to ask (ctx.ask), else `dflt` (the automatic
// battles). `options`: [[label, value], ...]
const choose = async (game, u, ctx, question, options, dflt) => {
  if (!ctx?.ask || options.length < 2) return options.length ? dflt : null
  // (no answer: the default)
  return (await ctx.ask(`${game.sides[u.side].name}: ${question}`, options)) ?? dflt
}
const STAT_NAME = { M: 'Movement', WS: 'Weapon Skill', BS: 'Ballistic Skill', S: 'Strength', T: 'Toughness', I: 'Initiative' }
// one or two characteristics of `keys`, the caster's choice (`dflt` without a player)
const chooseStats = async (game, u, ctx, spell, keys, two, dflt) => {
  const first = await choose(game, u, ctx, `${spell}: which characteristic${two ? ' first' : ''}?`, keys.map(k => [STAT_NAME[k], k]), dflt[0])
  if (!two) return [first]
  const rest = keys.filter(k => k !== first)
  return [first, await choose(game, u, ctx, `${spell}: and which second?`, rest.map(k => [STAT_NAME[k], k]), dflt.find(k => k !== first) || rest[0])]
}

// ---- the effects ----
// resolve(game, caster, spell, target, { perfect, ask, point }) — `target` is a unit or, for a
// Magical Vortex, a point {x,y}.
export const effects = {
  async resolve (game, u, s, target, ctx) {
    const fn = SPELL_EFFECTS[s.slug]
    // Hex / Enchantment: the same spell again on the same unit this turn has no further effect
    if (target?.id && (s.category === 'Hex' || s.category === 'Enchantment') && (game.effects || []).some(e => e.unitId === target.id && e.spell === s.name && e.castRound === game.round && e.castSide === game.active)) {
      say(game, '', `${s.name} is already on ${target.name} this turn: no further effect.`)
      return
    }
    const before = (game.effects || []).length
    // (the spell's type, for wards against some kinds of spell: Spellshield)
    game.spellCategory = s.category
    game.spellCaster = u
    let out
    try { out = await (fn ? fn(game, u, target, ctx, s) : null) } finally { game.spellCategory = null; game.spellCaster = null }
    for (const e of (game.effects || []).slice(before)) { e.castRound = game.round; e.castSide = game.active }
    if (!fn) say(game, 'bad', `${s.name}: its effect is not in the game yet.`)
    return out
  },
  template (game, at, r, S, AP, u) { return templateHits(game, at, r, S, AP, { label: 'Backlash: ' }) },
  hitModel (game, u, S, AP) { return spellHits(game, u, 1, S, AP, { label: `${u.name}: ` }) }
}

// A flag on a unit for as long as an effect lasts (no march, no charge, Stupidity, Fly...).
function flagFor (u, key, value = true) {
  const was = u.status[key]
  u.status[key] = value
  return () => { u.status[key] = was }
}
// (casting it ends at once any other Hex, or Enchantment, already on the target unit)
function endOthers (game, u, category) {
  const keep = []
  for (const e of game.effects || []) {
    if (e.unitId === u.id && e.category === category) { e.revert?.(); say(game, '', `${e.spell || 'An earlier spell'} on ${u.name} ends.`) } else keep.push(e)
  }
  game.effects = keep
}
function hex (game, u, t, spell, until, revert, text) {
  return addEffect(game, { kind: 'statMod', category: 'Hex', spell, side: u.side, casterId: u.id, unitId: t.id, until, revert, say: `${spell} on ${t.name} ends.` })
}

// Templates: the flame template, a teardrop about 8" long — narrow end
// at the caster's base, broad end over the target.
export function flameTemplate (from, toward) {
  const dx = toward.x - from.x; const dy = toward.y - from.y
  const l = Math.hypot(dx, dy) || 1
  const f = { x: dx / l, y: dy / l }; const r = { x: -f.y, y: f.x }
  const pt = (along, across) => ({ x: from.x + f.x * along + r.x * across, y: from.y + f.y * along + r.y * across })
  return [pt(0, -0.25), pt(5, -1.2), pt(7, -1.5), pt(8, -0.8), pt(8.3, 0), pt(8, 0.8), pt(7, 1.5), pt(5, 1.2), pt(0, 0.25)]
}
function frontCentreOf (game, u) { const h = hostOf(game, u) || u; return h.pos }

function grantRules (u, rules) {
  const added = rules.filter(r => !u.special.has(r))
  for (const r of added) u.special.add(r)
  return () => { for (const r of added) u.special.delete(r) }
}
async function teleport (game, t, d, minEnemy, ctx, spell) {
  const from = { ...t.pos }
  const where = ctx.pickPoint ? await ctx.pickPoint(`Click where ${t.name} lands (within ${d}" of where it is, not within ${minEnemy}" of an enemy).`, p => dist(p, from) <= d && !solid(game).some(o => o.side !== t.side && Math.min(...corners(o).map(c => dist(c, p))) < minEnemy)) : null
  if (!where) { say(game, '', `${spell}: ${t.name} stays where it is.`); return false }
  if (t.status.joinedTo) { const h = hostOf(game, t); if (h) h.joined = (h.joined || []).filter(c => c !== t); t.status.joinedTo = null }
  for (const id of Object.keys(t.engagedWith || {})) { const o = game.units.find(x => x.id === id); if (o?.engagedWith) delete o.engagedWith[t.id]; if (o && !Object.keys(o.engagedWith || {}).length) o.status.engaged = false }
  t.engagedWith = {}; t.status.engaged = false
  t.pos = where
  say(game, '', `${spell}: ${t.name} is moved ${dist(where, from).toFixed(1)}".`)
  return true
}

const SPELL_EFFECTS = {
  // Becalming Orb — its Bound spell (arcane.js)
  'becalming-orb' (game, u) { becalm(game, u) },
  // Master Rune of Calm (arcane.js)
  'master-rune-of-calm' (game, u, t, ctx) { becalm(game, u, { radius: (ctx?.result ?? 8) >= 11 ? 36 : 18, spell: 'Master Rune of Calm' }) },
  // Winds of the Dominion — a casting result of 7 or more: -1 Movement (minimum 1); 9 or more: -2;
  // until your next Start of Turn (cast here at 7+: the Infernal Familiar's spell)
  'winds-of-the-dominion' (game, u, t, ctx) {
    const n = (ctx?.result ?? 7) >= 9 ? 2 : 1
    hex(game, u, t, 'Winds of the Dominion', 'nextStartOfTurn', statMod(game, t, ['M'], -n, 1))
    say(game, 'good', `Winds of the Dominion (casting result ${ctx?.result ?? 7}): ${t.name} has -${n} Movement until the caster's next Start of Turn.`)
  },
  // ---- Unmade Rites ----
  // Steed of Shadows — friendly INFANTRY not fleeing and not yet moved: Fly (12) until your next Start of Turn.
  'steed-of-shadows' (game, u, t) {
    if (!/Infantry/.test((t.troopType || []).join(' '))) { say(game, 'bad', `Steed of Shadows only carries infantry; ${t.name} is not.`); return }
    if (t.status.fleeing || t.status.moved) { say(game, 'bad', `Steed of Shadows: ${t.name} ${t.status.fleeing ? 'is fleeing' : 'has already moved'}; nothing happens.`); return }
    const revert = flagFor(t, 'fly', 12)
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Steed of Shadows', side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', revert })
    say(game, 'good', `Steed of Shadows: ${t.name} may fly up to 12".`)
  },
  // Gathering Darkness — -2 Initiative (min 1), -2 Leadership (min 2), no Inspiring Presence; may target an engaged unit.
  'gathering-darkness' (game, u, t) {
    const r1 = statMod(game, t, ['I'], -2); const r2 = statMod(game, t, ['Ld'], -2, 2); const r3 = flagFor(t, 'noInspire')
    hex(game, u, t, 'Gathering Darkness', 'nextStartOfTurn', () => { r1(); r2(); r3() })
    say(game, 'good', `Gathering Darkness: ${t.name} suffers -2 Initiative and -2 Leadership and cannot use its General's Leadership.`)
  },
  // Unmade Familiars — 2D6 S2 hits, no Armour Roll.
  'unmade-familiars' (game, u, t) {
    const r = rollDice(game.rng, 2)
    say(game, 'roll', `Unmade Familiars: 2D6 = ${r[0] + r[1]} Strength 2 hits, no Armour Roll.`)
    return spellHits(game, t, r[0] + r[1], 2, 0, { noArmour: true, label: 'Unmade Familiars: ' })
  },
  // Unmade Vessel — for the rest of this turn the caster, its mount and its unit: +1 S and A, AP improved by 1.
  'unmade-vessel' (game, u) {
    const host = hostOf(game, u)
    for (const x of [u, host].filter(Boolean)) {
      const r1 = statMod(game, x, ['S', 'A'], 1); const r2 = flagFor(x, 'apBonus', (x.status.apBonus || 0) + 1)
      addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Unmade Vessel', side: u.side, casterId: u.id, unitId: x.id, until: 'endOfTurn', revert: () => { r1(); r2() } })
    }
    say(game, 'good', `Unmade Vessel: +1 Strength and Attacks, and AP improved by 1, until the end of the turn.`)
  },
  // Vortex of the Dominion — 3" template, D6" scatter, ANY unit: D6+1 S3 hits.
  'vortex-of-the-dominion' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Vortex of the Dominion', side: u.side, casterId: u.id, until: 'casterGone', at: point, r: 1.5, scatterDice: 1, S: 3, AP: 0, hitsFriends: true, hitsDice: 'D6+1' })
    say(game, 'good', 'A Vortex of the Dominion opens.')
  },
  // Unmade Vigour — +1 Movement, Toughness and Initiative until the end of this turn.
  'unmade-vigour' (game, u, t) {
    const revert = statMod(game, t, ['M', 'T', 'I'], 1)
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Unmade Vigour', side: u.side, casterId: u.id, unitId: t.id, until: 'endOfTurn', revert })
    say(game, 'good', `Unmade Vigour: ${t.name} gains +1 Movement, Toughness and Initiative this turn.`)
  },
  // The Summoning — 2D6 S4 AP-1 hits.
  'the-summoning' (game, u, t) {
    const r = rollDice(game.rng, 2)
    say(game, 'roll', `The Summoning: 2D6 = ${r[0] + r[1]} Strength 4 hits, AP -1.`)
    spellHits(game, t, r[0] + r[1], 4, -1, { label: 'The Summoning: ' })
    afterShooting(game, t, u)
  },
  // ---- Dark Magic ----
  // Word of Pain — -1 Strength and Toughness (min 1); may target an engaged unit.
  'word-of-pain' (game, u, t) {
    hex(game, u, t, 'Word of Pain', 'nextStartOfTurn', statMod(game, t, ['S', 'T'], -1))
    say(game, 'good', `Word of Pain: ${t.name} suffers -1 Strength and Toughness.`)
  },
  // Stream of Corruption — flame template from the caster over the unit it fights: S3 AP-1, friend or foe.
  'stream-of-corruption' (game, u, t) {
    // the narrow end touches the caster: its own unit is behind it, not under the flame
    return templateHits(game, null, 0, 3, -1, { poly: flameTemplate(frontCentreOf(game, u), centre(t)), exceptAll: [u, hostOf(game, u)].filter(Boolean), label: 'Stream of Corruption: ' })
  },
  // Infernal Gateway — a friendly character (even engaged) to anywhere within 12", not within 6" of an enemy.
  async 'infernal-gateway' (game, u, t, ctx) {
    if (t.status.fleeing) { say(game, 'bad', `Infernal Gateway: ${t.name} is fleeing.`); return }
    await teleport(game, t, 12, 6, ctx, 'Infernal Gateway')
  },
  // ---- the Lore of the Unmade (each only for its god's Unmade: magic.js) ----
  // Cacophonic Hymn — Remains in Play: ends any Enchantment on the target; Stupidity while in play
  'cacophonic-hymn' (game, u, t) {
    endOthers(game, t, 'Enchantment')
    hex(game, u, t, 'Cacophonic Hymn', 'casterGone', grantRules(t, ['Stupidity']), `The Cacophonic Hymn around ${t.name} falls silent.`)
    const e = (game.effects || []).at(-1); if (e) e.rip = true
    say(game, 'good', `The Cacophonic Hymn: ${t.name} is subject to Stupidity while it plays.`)
  },
  // Gift of Mutation — 8+: -D3 to one of WS, S, T; 12+: to two (to 1), until your next Start of Turn
  // (the caster's choice, asked; with no player, Toughness then Weapon Skill)
  async 'gift-of-mutation' (game, u, t, ctx) {
    endOthers(game, t, 'Hex')
    const stats = await chooseStats(game, u, ctx, `Gift of Mutation on ${t.name}`, ['WS', 'S', 'T'], (ctx?.result ?? 8) >= 12, ['T', 'WS'])
    for (const k of stats) {
      const n = d3(game.rng)
      hex(game, u, t, 'Gift of Mutation', 'nextStartOfTurn', statMod(game, t, [k], -n), `The Gift of Mutation on ${t.name} fades.`)
      say(game, 'good', `Gift of Mutation: ${t.name} -${n} ${STAT_NAME[k]} until ${game.sides[u.side].name}'s next turn.`)
    }
  },
  // Gleeful Fire — D3+3 S3 Flaming hits
  'gleeful-fire' (game, u, t) {
    const n = d3(game.rng) + 3
    say(game, 'roll', `Gleeful Fire: D3+3 = ${n} Strength 3 Flaming hits on ${t.name}.`)
    spellHits(game, t, n, 3, 0, { flaming: true, label: 'Gleeful Fire: ' })
    afterShooting(game, t, u)
  },
  // Plague Wind — Remains in Play: a 3" template within 12", dangerous terrain, moving D6" each Start of
  // Turn (its -1 Toughness for the turn on units it touches is not in the game yet)
  'plague-wind' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'the Plague Wind', side: u.side, casterId: u.id, until: 'casterGone', rip: true, at: point, r: 1.5, scatterDice: 1, dangerous: true, hitsFriends: true })
    say(game, 'good', 'A Plague Wind begins to blow.')
  },
  // ---- the Lore of the Moon Jade and the Lore of the Sun Jade ----
  // Accursed Mirror — until your next Start of Turn, the target's natural 1s To Hit (shooting or combat)
  // are a S3 AP -1 hit on itself; may target an engaged unit (combat.js, shooting.js)
  'accursed-mirror' (game, u, t) {
    endOthers(game, t, 'Hex')
    addEffect(game, { kind: 'accursedMirror', category: 'Hex', spell: 'Accursed Mirror', side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', say: `The Accursed Mirror around ${t.name} shatters.` })
    say(game, 'good', `The Accursed Mirror: ${t.name}'s natural 1s To Hit turn back on it until ${game.sides[u.side].name}'s next turn.`)
  },
  // Ancestral Warriors — a unit the caster fights: 7+ 2D3 S2 hits; 11+ 2D6 S4 AP -1 hits (its Armour
  // Bane (2) is not in yet)
  'ancestral-warriors' (game, u, t, ctx) {
    const big = (ctx?.result ?? 7) >= 11
    const n = big ? d6(game.rng) + d6(game.rng) : d3(game.rng) + d3(game.rng)
    say(game, 'roll', `Ancestral Warriors: ${big ? '2D6' : '2D3'} = ${n} Strength ${big ? 4 : 2} hits${big ? ', AP -1' : ''} on ${t.name}.`)
    return spellHits(game, t, n, big ? 4 : 2, big ? -1 : 0, { label: 'Ancestral Warriors: ' })
  },
  // Spirits of Wind and Shadow — until your next Start of Turn, Random Movement (D6)
  'spirits-of-wind-and-shadow' (game, u, t) {
    endOthers(game, t, 'Hex')
    hex(game, u, t, 'Spirits of Wind and Shadow', 'nextStartOfTurn', grantRules(t, ['Random Movement (D6)']), `The Spirits of Wind and Shadow leave ${t.name}.`)
    say(game, 'good', `Spirits of Wind and Shadow: ${t.name} moves at random (D6) until ${game.sides[u.side].name}'s next turn.`)
  },
  // Constellation of the Dragon — 7+ D6+1 S4 hits; 11+ 2D6+2 S4 AP -1 hits
  'constellation-of-the-dragon' (game, u, t, ctx) {
    const big = (ctx?.result ?? 7) >= 11
    const n = big ? d6(game.rng) + d6(game.rng) + 2 : d6(game.rng) + 1
    say(game, 'roll', `Constellation of the Dragon: ${big ? '2D6+2' : 'D6+1'} = ${n} Strength 4 hits${big ? ', AP -1' : ''} on ${t.name}.`)
    spellHits(game, t, n, 4, big ? -1 : 0, { label: 'Constellation of the Dragon: ' })
    afterShooting(game, t, u)
  },
  // Great Bastion — Remains in Play: a 6+ Ward; the unit cannot march or charge (enemies charging it
  // testing for dangerous terrain is not in yet); may target an engaged unit
  'great-bastion' (game, u, t) {
    const entry = { value: 6, from: 'the Great Bastion' }
    t.wards = [...(t.wards || []), entry]
    const r1 = flagFor(t, 'noMarchSpell'); const r2 = flagFor(t, 'noChargeSpell')
    addEffect(game, { kind: 'ward', category: 'Enchantment', spell: 'Great Bastion', side: u.side, casterId: u.id, unitId: t.id, until: 'casterGone', rip: true, revert: () => { t.wards = (t.wards || []).filter(w => w !== entry); r1(); r2() }, say: `The Great Bastion around ${t.name} crumbles.` })
    say(game, 'good', `The Great Bastion: ${t.name} has a 6+ Ward and holds its ground (no march or charge).`)
  },
  // Might of Heaven and Earth — 9+: the caster, its mount and its unit +1 WS and S and Flaming Attacks;
  // 12+: every friendly unit in its Command range; lasts for the rest of the turn
  'might-of-heaven-and-earth' (game, u, t, ctx) {
    const from = hostOf(game, u) || u
    const units = (ctx?.result ?? 9) >= 12 ? onTable(game).filter(x => x.side === u.side && distanceBetween(from, x) <= commandRange(u)) : [from]
    for (const x of new Set([...units, ...units.flatMap(x => x.joined || [])])) {
      const rv = statMod(game, x, ['WS', 'S'], 1); const rg = grantRules(x, ['Flaming Attacks'])
      addEffect(game, { kind: 'statMod', category: 'Enchantment', spell: 'Might of Heaven and Earth', side: u.side, casterId: u.id, unitId: x.id, until: 'endOfTurn', revert: () => { rv(); rg() } })
    }
    say(game, 'good', `Might of Heaven and Earth: ${units.map(x => x.name).join(', ')} +1 Weapon Skill and Strength, Flaming Attacks, this turn.`)
  },
  // ---- the Lore of the Bull of Ash ----
  // Curse of the Bull of Ash — an enemy character (even with a unit or engaged): a Toughness test; passed, D3 S2
  // hits; failed, D3+2 S5 hits, no armour or Regeneration save
  'curse-of-the-bull-of-ash' (game, u, t) {
    const m = t.models.find(x => x.wounds > 0)
    const T = m?.profile.T ?? 3
    const r = rollDice(game.rng, 1)[0]
    const passed = r === 1 || (r !== 6 && r <= T)
    say(game, 'roll', `The Curse of the Bull of Ash: ${t.name} Toughness test, rolled ${r}, needs ${T} or less — ${passed ? 'passed' : 'FAILED'}.`)
    if (passed) { const n = d3(game.rng); spellHits(game, t, n, 2, 0, { label: `Curse of the Bull of Ash (${n} hits): ` }) } else { const n = d3(game.rng) + 2; spellHits(game, t, n, 5, 0, { noArmour: true, noRegen: true, label: `Curse of the Bull of Ash (${n} hits): ` }) }
  },
  // Flames of the Bull of Ash — a unit the caster fights: D3+1 S4 AP -1 Flaming hits
  'flames-of-the-bull-of-ash' (game, u, t) {
    const n = d3(game.rng) + 1
    say(game, 'roll', `Flames of the Bull of Ash: D3+1 = ${n} Strength 4 hits, AP -1, Flaming, on ${t.name}.`)
    return spellHits(game, t, n, 4, -1, { flaming: true, label: 'Flames of the Bull of Ash: ' })
  },
  // Storm of Ash — until your next Start of Turn, enemy units within 9" of the caster -1 To Hit (natural
  // 6s unaffected) (chaosdwarfs.js inStormOfAsh; combat.js, shooting.js)
  'storm-of-ash' (game, u) {
    addEffect(game, { kind: 'stormOfAsh', category: 'Hex', spell: 'Storm of Ash', side: u.side, casterId: u.id, unitId: u.id, until: 'nextStartOfTurn', say: 'The Storm of Ash settles.' })
    say(game, 'good', `A Storm of Ash: enemy units within 9" of ${u.name} are -1 To Hit.`)
  },
  // ---- the Lore of the Makers (Lore of Ixmara) ----
  // Apotheosis — a friendly infantry or cavalry character: 10+ D3 lost Wounds back, 12+ D3+1; and Fear,
  // or Terror if it had Fear (for the rest of the game: the spell gives no end)
  apotheosis (game, u, t, ctx) {
    if (!/Infantry|Cavalry/.test((t.troopType || []).join(' '))) { say(game, 'bad', `Apotheosis: ${t.name} is not infantry or cavalry.`); return }
    const n = d3(game.rng) + ((ctx?.result ?? 10) >= 12 ? 1 : 0)
    const m = t.models.find(x => x.wounds > 0) || t.models[0]
    const back = Math.max(0, Math.min(n, (m.startW ?? 1) - m.wounds))
    m.wounds += back
    const rule = t.special.has('Fear') ? 'Terror' : 'Fear'
    t.special.add(rule)
    // (recorded, so a second Apotheosis on it this turn has no further effect: Enchantment; the spell gives
    // the Fear or Terror no end, so it stays)
    addEffect(game, { kind: 'apotheosis', category: 'Enchantment', spell: 'Apotheosis', side: u.side, casterId: u.id, unitId: t.id, until: 'never' })
    say(game, 'good', `Apotheosis: ${t.name} regains ${back} Wound${back === 1 ? '' : 's'} and gains ${rule}.`)
  },
  // Monsoon — Remains in Play: a 5" template within 15", dangerous terrain blocking sight, moving D6" each
  // Start of Turn; an enemy unit it touches is drenched for the rest of the game (saurians.js; shooting.js)
  monsoon (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'the Monsoon', side: u.side, casterId: u.id, until: 'casterGone', rip: true, at: point, r: 2.5, scatterDice: 1, dangerous: true, blocksSight: true, drenches: true, hitsFriends: false })
    say(game, 'good', 'A Monsoon breaks over the battlefield.')
  },
  // ---- the Lore of the Gnawing One ----
  // Wyrd Lightning — D3+1 S5 hits, AP -3
  'wyrd-lightning' (game, u, t) {
    const n = d3(game.rng) + 1
    say(game, 'roll', `Wyrd Lightning: D3+1 = ${n} Strength 5 hits, AP -3, on ${t.name}.`)
    spellHits(game, t, n, 5, -3, { label: 'Wyrd Lightning: ' })
    afterShooting(game, t, u)
  },
  // Rat's Leap — a friendly infantry character (even engaged) placed anywhere completely within 24", not
  // within 6" of an enemy; no more moving this phase
  async 'rats-leap' (game, u, t, ctx) {
    if (!/Infantry/.test((t.troopType || []).join(' '))) { say(game, 'bad', `Rat's Leap: ${t.name} is not infantry.`); return }
    if (await teleport(game, t, 24, 6, ctx, 'Rat\'s Leap')) { t.status.moved = true }
  },
  // Cloud of Corruption — Remains in Play: a fixed 3" template within 9", dangerous terrain that blocks
  // sight (enemy units within 3" -1 Toughness is not in the game yet)
  'cloud-of-corruption' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Cloud of Corruption', side: u.side, casterId: u.id, until: 'casterGone', rip: true, at: point, r: 1.5, fixed: true, dangerous: true, blocksSight: true, hitsFriends: true })
    say(game, 'good', 'A Cloud of Corruption billows forth.')
  },
  // ---- a Urn of Souls (Vortex of Souls) ----
  // Light of Death: a Leadership test; passed, D3 S3 AP -1 hits; failed, D6+3 S6 hits, Multiple Damage (2), no armour or
  // Regeneration save. It ends the Casket's Light of Protection.
  'light-of-death' (game, u, t) {
    const lp = (game.effects || []).filter(e => e.kind === 'lightOfProtection' && e.casterId === u.id)
    if (lp.length) { game.effects = game.effects.filter(e => !lp.includes(e)); say(game, '', 'The Light of Protection fades as the Light of Death is unleashed.') }
    const r = leadershipTest(game, t, { label: `${t.name} — the Light of Death` })
    say(game, 'roll', r.text)
    if (r.passed) { const n = d3(game.rng); spellHits(game, t, n, 3, -1, { label: `Light of Death (${n} hits): ` }) } else { const n = d6(game.rng) + 3; spellHits(game, t, n, 6, 0, { noArmour: true, noRegen: true, multipleDamage: '2', label: `Light of Death (${n} hits): ` }) }
    afterShooting(game, t, u)
  },
  // Light of Protection: Remains in Play — the Casket and friendly units within 18": a 6+ Ward; enemies -1 To Hit at
  // them (damage.js saveFor, combat.js, shooting.js through tombkings.js lightProtected)
  'light-of-protection' (game, u) {
    addEffect(game, { kind: 'lightOfProtection', category: 'Enchantment', spell: 'Light of Protection', side: u.side, casterId: u.id, unitId: u.id, until: 'casterGone', rip: true, say: 'The Light of Protection fades.' })
    say(game, 'good', `The Light of Protection: friendly units within 18" of ${u.name} have a 6+ Ward and are harder to hit.`)
  },
  // ---- the Lore of Kheshet ----
  // Incantation of Cursed Blades — until your next Start of Turn, friendly Kheshite Undead units
  // in the caster's Command range re-roll natural 1s To Hit (combat.js)
  'incantation-of-cursed-blades' (game, u) {
    const from = hostOf(game, u) || u
    const units = onTable(game).filter(x => x.side === u.side && x.special?.has('Kheshite Undead') && distanceBetween(from, x) <= commandRange(u))
    for (const x of units) addEffect(game, { kind: 'djaf', category: 'Enchantment', spell: 'Incantation of Cursed Blades', side: u.side, casterId: u.id, unitId: x.id, until: 'nextStartOfTurn' })
    say(game, 'good', `Incantation of Cursed Blades: ${units.map(x => x.name).join(', ') || 'no unit in range'} re-roll natural 1s To Hit.`)
  },
  // Incantation of the Desert Wind — 6+: one Kheshite Undead unit in Command range, 10+: every
  // one, Reserve Move this turn (at 6+ the caster's choice, asked; with no player, the nearest)
  async 'incantation-of-the-desert-wind' (game, u, t, ctx) {
    const from = hostOf(game, u) || u
    const all = onTable(game).filter(x => x.side === u.side && x.special?.has('Kheshite Undead') && distanceBetween(from, x) <= commandRange(u)).sort((a, b) => distanceBetween(from, a) - distanceBetween(from, b))
    const units = (ctx?.result ?? 6) >= 10 ? all : [await choose(game, u, ctx, 'Incantation of the Desert Wind: which unit gains Reserve Move?', all.map(x => [unitLabel(x, all), x]), all[0])].filter(Boolean)
    for (const x of units) addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Incantation of the Desert Wind', side: u.side, casterId: u.id, unitId: x.id, until: 'endOfTurn', revert: grantRules(x, ['Reserve Move']), say: `Khsar's Incantation on ${x.name} ends.` })
    say(game, 'good', `Incantation of the Desert Wind: ${units.map(x => x.name).join(', ') || 'no unit in range'} ${units.length === 1 ? 'has' : 'have'} Reserve Move this turn.`)
  },
  // Incantation of Desiccation — until the end of this turn, -1 Strength and Toughness (to 1);
  // ends any other Hex on it
  'incantation-of-desiccation' (game, u, t) {
    endOthers(game, t, 'Hex')
    hex(game, u, t, 'Incantation of Desiccation', 'endOfTurn', statMod(game, t, ['S', 'T'], -1), `Incantation of Desiccation on ${t.name} ends.`)
    say(game, 'good', `Incantation of Desiccation: ${t.name} -1 Strength and Toughness this turn.`)
  },
  // ---- the Lore of Undeath ----
  // Hellish Vigour — 7+: one friendly Necromantic Undead unit in the caster's Command range, 10+: every
  // one, Reserve Move until the end of this turn (at 7+ the caster's choice, asked; with no player, the nearest)
  async 'hellish-vigour' (game, u, t, ctx) {
    const from = hostOf(game, u) || u
    const all = onTable(game).filter(x => x.side === u.side && x.special?.has('Necromantic Undead') && distanceBetween(from, x) <= commandRange(u)).sort((a, b) => distanceBetween(from, a) - distanceBetween(from, b))
    const units = (ctx?.result ?? 7) >= 10 ? all : [await choose(game, u, ctx, 'Hellish Vigour: which unit gains Reserve Move?', all.map(x => [unitLabel(x, all), x]), all[0])].filter(Boolean)
    for (const x of units) addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Hellish Vigour', side: u.side, casterId: u.id, unitId: x.id, until: 'endOfTurn', revert: grantRules(x, ['Reserve Move']), say: `Hellish Vigour on ${x.name} ends.` })
    say(game, 'good', `Hellish Vigour: ${units.map(x => x.name).join(', ') || 'no Undead unit in range'} ${units.length === 1 ? 'has' : 'have'} Reserve Move this turn.`)
  },
  // Vesper's Danse Macabre — 8+: +D3 to one of Movement, Weapon Skill, Initiative; 12+: to two (to 10),
  // until your next Start of Turn (the caster's choice, asked; with no player, Weapon Skill then Initiative)
  async 'vespers-danse-macabre' (game, u, t, ctx) {
    const stats = await chooseStats(game, u, ctx, `Vesper's Danse Macabre on ${t.name}`, ['M', 'WS', 'I'], (ctx?.result ?? 8) >= 12, ['WS', 'I'])
    for (const k of stats) {
      const n = d3(game.rng)
      const rv = statMod(game, t, [k], n)
      addEffect(game, { kind: 'statMod', category: 'Enchantment', spell: "Vesper's Danse Macabre", side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', revert: rv, say: `Vesper's Danse Macabre on ${t.name} ends.` })
      say(game, 'good', `Vesper's Danse Macabre: ${t.name} +${n} ${STAT_NAME[k]} until ${game.sides[u.side].name}'s next turn.`)
    }
  },
  // Raise Dead — 2D3 Risen Zombies placed completely within 12" of the caster, not within 1" of an
  // enemy; they cannot charge this turn; worth no Victory Points (vampires.js risenZombies)
  async 'raise-dead' (game, u, t, ctx) {
    const from = hostOf(game, u) || u
    const n = d3(game.rng) + d3(game.rng)
    const z = risenZombies(game, u, n)
    // set up wholly inside 12" of this model and more than 1" from every enemy model: the whole unit, on the table,
    // touching nothing
    const fits = p => {
      z.pos = p; z.facing = from.facing
      const cs = corners(z)
      // (each corner within 12" of the caster's base: its centre plus half its width, near enough)
      return cs.every(c => c.x >= 0 && c.y >= 0 && c.x <= 72 && c.y <= 48 && dist(c, centre(from)) <= 12 + (from.base?.w || 1) / 2) &&
        !solid(game).some(o => o !== from && (polysOverlapS(cs, corners(o), 0) || (o.side !== u.side && distanceBetween(o, z) < 1)))
    }
    let at = ctx?.pickPoint ? await ctx.pickPoint(`Click where the ${n} Risen Zombies rise (completely within 12" of ${u.name}, not within 1" of an enemy).`, fits) : null
    if (!at) for (let k = 0; k < 72 && !at; k++) { const a = from.facing + (k % 12) * Math.PI / 6; const r = 3 + Math.floor(k / 12) * 1.5; const p = { x: centre(from).x + Math.cos(a) * r, y: centre(from).y + Math.sin(a) * r }; if (fits(p)) at = p }
    if (!at) { say(game, '', `Raise Dead: there is no room for the dead to rise.`); return }
    z.pos = at; z.facing = from.facing
    game.units.push(z)
    say(game, 'good', `Raise Dead: ${n} Risen Zombies claw their way out of the earth.`)
  },

  // ---- the Lore of Vharnest ----
  // Black Horror — Remains in Play: a 5" template within 18", dangerous terrain, moving 2D6" each Start
  // of Turn; an enemy unit it moves over: D6 Strength tests, a Wound lost for each failed
  'black-horror' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'the Black Horror', side: u.side, casterId: u.id, until: 'casterGone', rip: true, at: point, r: 2.5, scatterDice: 2, dangerous: true, strengthTests: true, hitsFriends: false })
    say(game, 'good', 'The Black Horror tears open the veil.')
  },
  // Cursing Word — Remains in Play: -1 Weapon Skill or Ballistic Skill (the caster's choice, asked; with
  // no player, the one the target uses — Ballistic Skill for a unit with missile weapons, else Weapon Skill), to 1; ends
  // other Hexes
  async 'cursing-word' (game, u, t, ctx) {
    endOthers(game, t, 'Hex')
    const stat = await choose(game, u, ctx, `Cursing Word on ${t.name}: -1 to which?`, [['Weapon Skill', 'WS'], ['Ballistic Skill', 'BS']], t.kit?.ranged?.length ? 'BS' : 'WS')
    hex(game, u, t, 'Cursing Word', 'casterGone', statMod(game, t, [stat], -1), `The Cursing Word on ${t.name} ends.`)
    const e = (game.effects || []).at(-1); if (e) e.rip = true
    say(game, 'good', `Cursing Word: ${t.name} -1 ${stat === 'BS' ? 'Ballistic' : 'Weapon'} Skill while it remains in play.`)
  },
  // ---- High Magic ----
  // Walk Between Worlds — until your next Start of Turn, the caster and its unit Ethereal and Reserve Move
  'walk-between-worlds' (game, u) {
    for (const x of [u, hostOf(game, u)].filter(Boolean)) addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Walk Between Worlds', side: u.side, casterId: u.id, unitId: x.id, until: 'nextStartOfTurn', revert: grantRules(x, ['Ethereal', 'Reserve Move']), say: `Walk Between Worlds on ${x.name} ends.` })
    say(game, 'good', `Walk Between Worlds: ${(hostOf(game, u) || u).name} is Ethereal and has Reserve Move until ${game.sides[u.side].name}'s next turn.`)
  },
  // Fiery Convocation — a 5" template over the target's centre, scattering D3+1": enemy models, S4 AP -2,
  // Flaming Attacks
  'fiery-convocation' (game, u, t) {
    const sc = scatter(game, centre(t), d3(game.rng) + 1)
    say(game, 'roll', `Fiery Convocation: ${sc.text}.`)
    templateHits(game, sc.at, 2.5, 4, -2, { enemyOf: u.side, flaming: true, label: 'Fiery Convocation: ' })
    afterShooting(game, t, u)
  },
  // Tempest — Remains in Play: a fixed 3" template within 12", dangerous terrain (enemy units within 6"
  // treating open ground as difficult and difficult as dangerous is not in the game yet)
  tempest (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Tempest', side: u.side, casterId: u.id, until: 'casterGone', rip: true, at: point, r: 1.5, fixed: true, dangerous: true, difficult: true, hitsFriends: true })
    say(game, 'good', 'A Tempest of rain and sleet gathers: dangerous terrain.')
  },
  // Corporeal Unmaking — a unit the caster fights: D3 S5 hits, no armour or Regeneration save
  'corporeal-unmaking' (game, u, t) {
    const n = d3(game.rng)
    say(game, 'roll', `Corporeal Unmaking: D3 = ${n} Strength 5 hits on ${t.name}, no armour or Regeneration save.`)
    return spellHits(game, t, n, 5, 0, { noArmour: true, noRegen: true, label: 'Corporeal Unmaking: ' })
  },
  // Fury of the Bloodied God — until the end of this turn, Extra Attacks (+1); may target an engaged unit
  // (magic.js spellTargets; combat.js reads status.furyOfKhaine)
  'fury-of-the-bloodied-god' (game, u, t) {
    t.status.furyOfTheBloodiedGod = `${game.round}:${game.active}`
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Fury of the Bloodied God', side: u.side, casterId: u.id, unitId: t.id, until: 'endOfTurn', revert: () => { t.status.furyOfTheBloodiedGod = null }, say: `Fury of the Bloodied God on ${t.name} ends.` })
    say(game, 'good', `Fury of the Bloodied God: ${t.name} has Extra Attacks (+1) this turn.`)
  },
  // Shield of Aelsyr — until the end of this turn a 5+ Ward; ends any other Enchantment on it
  'shield-of-aelsyr' (game, u, t) {
    endOthers(game, t, 'Enchantment')
    const entry = { value: 5, from: 'Shield of Aelsyr' }
    t.wards = [...(t.wards || []), entry]
    addEffect(game, { kind: 'ward', category: 'Enchantment', spell: 'Shield of Aelsyr', value: 5, side: u.side, casterId: u.id, unitId: t.id, until: 'endOfTurn', revert: () => { t.wards = (t.wards || []).filter(w => w !== entry) }, say: `The Shield of Aelsyr on ${t.name} fades.` })
    say(game, 'good', `Shield of Aelsyr: ${t.name} has a 5+ Untouchable save this turn.`)
  },
  // Drain Magic — Remains in Play: enemy Wizards within 24" of the caster +2 to their spells' casting
  // values (arcane.js castingValueFor)
  'drain-magic' (game, u) {
    addEffect(game, { kind: 'drainMagic', category: 'Hex', spell: 'Drain Magic', side: u.side, casterId: u.id, unitId: u.id, until: 'casterGone', rip: true, say: 'Drain Magic ends.' })
    say(game, 'good', `Drain Magic: enemy Wizards within 24" of ${u.name} add 2 to their casting values.`)
  },
  // ---- the Lore of the Wilds ----
  // Blessing of the Wood Queen — until your next Start of Turn, the target friendly unit Regeneration (5+)
  'blessing-of-the-wood-queen' (game, u, t) {
    const had = [...t.special].find(r => r.startsWith('Regeneration'))
    if (had) t.special.delete(had)
    t.special.add('Regeneration (5+)')
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: "Blessing of the Wood Queen", side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', revert: () => { t.special.delete('Regeneration (5+)'); if (had) t.special.add(had) }, say: `Blessing of the Wood Queen on ${t.name} ends.` })
    say(game, 'good', `Blessing of the Wood Queen: ${t.name} has Regeneration (5+) until ${game.sides[u.side].name}'s next turn.`)
  },
  // Wrath of the Elder Oak — every fighting-rank model of a unit fighting the caster: an Initiative
  // test; failed, D3 S4 hits, no Armour Roll (the target unit: the one it is fighting)
  'wrath-of-the-elder-oak' (game, u, t) {
    const I = (alive(t).find(m => m.role === 'rank') || alive(t)[0])?.profile.I ?? 1
    const n = Math.min(alive(t).length, t.files || alive(t).length)
    const dice = rollDice(game.rng, n)
    const failed = dice.filter(r => r === 6 || (r !== 1 && r > I)).length
    say(game, 'roll', `Wrath of the Elder Oak: ${n} model${n === 1 ? '' : 's'} in ${t.name}'s fighting rank test Initiative ${I}: [${dice.join(' ')}] — ${failed} failed.`)
    let hits = 0
    for (let k = 0; k < failed; k++) hits += d3(game.rng)
    if (hits) spellHits(game, t, hits, 4, 0, { noArmour: true, label: `Wrath of the Elder Oak (${hits} hits): ` })
  },
  // Fury of Lorne Wood — D3+1 S6 hits, AP -2, Multiple Damage (2)
  'fury-of-lorne-wood' (game, u, t) {
    const n = d3(game.rng) + 1
    say(game, 'roll', `Fury of Lorne Wood: D3+1 = ${n} Strength 6 hits, AP -2, Multiple Damage (2), on ${t.name}.`)
    spellHits(game, t, n, 6, -2, { multipleDamage: '2', label: 'Fury of Lorne Wood: ' })
    afterShooting(game, t, u)
  },
  // Hidden Pathways — until your next Start of Turn, Reserve Move and a Quick Turn even if it could not
  'hidden-pathways' (game, u, t) {
    const had = t.special.has('Reserve Move')
    t.special.add('Reserve Move'); t.status.hiddenPathways = true
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Hidden Pathways', side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', revert: () => { if (!had) t.special.delete('Reserve Move'); t.status.hiddenPathways = false }, say: `Hidden Pathways on ${t.name} ends.` })
    say(game, 'good', `Hidden Pathways: ${t.name} has Reserve Move and may Quick Turn until ${game.sides[u.side].name}'s next turn.`)
  },
  // Sapping Blight — until your next Start of Turn, -D3 Strength (to 1); may target an engaged unit
  // (magic.js spellTargets); ends any other Hex on it
  'sapping-blight' (game, u, t) {
    endOthers(game, t, 'Hex')
    const n = d3(game.rng)
    hex(game, u, t, 'Sapping Blight', 'nextStartOfTurn', statMod(game, t, ['S'], -n), `Sapping Blight on ${t.name} ends.`)
    say(game, 'good', `Sapping Blight: D3 = ${n} — ${t.name} -${n} Strength until ${game.sides[u.side].name}'s next turn.`)
  },
  // Spiteful Torrent — Remains in Play: a 3" template within 15", difficult terrain, scattering D6"
  // each Start of Turn; an enemy unit it moves over, or that moves through it: 3D6 S2 hits, AP -1
  'spiteful-torrent' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Spiteful Torrent', side: u.side, casterId: u.id, until: 'casterGone', rip: true, at: point, r: 1.5, scatterDice: 1, S: 2, AP: -1, difficult: true, hitsFriends: false, hitsDice: '3D6' })
    say(game, 'good', 'A Spiteful Torrent of spites and stinging insects swarms forth.')
  },
  // Swirling Mists — until your next Start of Turn, shooting at the caster (or the unit it has joined)
  // re-rolls natural 6s To Hit (shooting.js)
  'swirling-mists' (game, u) {
    addEffect(game, { kind: 'swirlingMists', category: 'Enchantment', spell: 'Swirling Mists', side: u.side, casterId: u.id, unitId: u.id, until: 'nextStartOfTurn', say: `Swirling Mists around ${u.name} lift.` })
    say(game, 'good', `Swirling Mists: shooting at ${u.name}${u.status.joinedTo ? ' and its unit' : ''} must re-roll natural 6s To Hit.`)
  },
  // ---- the Lore of Lorne Wood ----
  // Flock of Doom Lornefolk — a 3" template over the target's centre: enemy models, S3 AP -1
  'flock-of-doom-lornefolk' (game, u, t) {
    templateHits(game, centre(t), 1.5, 3, -1, { enemyOf: u.side, label: 'Flock of Doom: ' })
    afterShooting(game, t, u)
  },
  // Forest Walker — a friendly Lornefolk character completely within a wood (magic.js spellTargets),
  // not fleeing: placed within a different wood anywhere, not within 6" of an enemy; no more moving this phase
  async 'forest-walker' (game, u, t, ctx) {
    if (t.status.fleeing) { say(game, 'bad', `Forest Walker: ${t.name} is fleeing.`); return }
    const woods = (game.terrain || []).filter(f => f.kind === 'wood')
    const here = woods.find(f => pointInPoly(centre(t), f.poly))
    const ok = p => woods.some(f => f !== here && pointInPoly(p, f.poly)) && !solid(game).some(o => o.side !== t.side && Math.min(...corners(o).map(c => dist(c, p))) < 6)
    const where = ctx?.pickPoint ? await ctx.pickPoint(`Click where ${t.name} steps out (within a different wood, not within 6" of an enemy).`, ok) : null
    if (!where) { say(game, '', `Forest Walker: ${t.name} stays where it is.`); return }
    const from = { ...t.pos }
    t.pos = where
    t.status.moved = true; t.status.noMoreMoves = true
    say(game, 'good', `Forest Walker: ${t.name} steps through the hidden ways, ${dist(where, from).toFixed(1)}" away, into another wood.`)
  },
  // Tree Singing — Remains in Play: a fixed template within 15" (3" at 7+, 5" at 9+), a woodland
  // terrain feature (terrain.js terrainOf); enemy units treat it as dangerous terrain
  'tree-singing' (game, u, point, ctx) {
    const big = (ctx?.result ?? 7) >= 9
    addEffect(game, { kind: 'vortex', name: 'Tree Singing wood', side: u.side, casterId: u.id, until: 'casterGone', rip: true, at: point, r: big ? 2.5 : 1.5, fixed: true, dangerous: true, hitsFriends: false, woodland: true })
    say(game, 'good', `Tree Singing: a ${big ? '5"' : '3"'} wood bursts from the earth — dangerous terrain to the enemy.`)
  },
  // Phantasmagoria — a fixed 3" template within 12", dangerous terrain; enemies ending a move
  // within 12" test for Panic (fail: fall back or flee from it); passing, they are Impetuous within 12".
  phantasmagoria (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Phantasmagoria', side: u.side, casterId: u.id, until: 'casterGone', at: point, r: 1.5, fixed: true, dangerous: true, hitsFriends: true, aura: 'phantasmagoria' })
    say(game, 'good', 'Phantasmagoria: a field of nightmares. Enemy units ending a move within 12" must test for Panic.')
  },
  // Battle Lust — Frenzy and Hatred (all enemies) until the end of this turn.
  'battle-lust' (game, u, t) {
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Battle Lust', side: u.side, casterId: u.id, unitId: t.id, until: 'endOfTurn', revert: grantRules(t, ['Frenzy', 'Hatred (all enemies)']) })
    say(game, 'good', `Battle Lust: ${t.name} is Frenzied and hates all enemies this turn.`)
  },
  // Soul Eater — a single enemy model: a S3 hit, Multiple Damage (3), no Armour Roll.
  'soul-eater' (game, u, t) {
    say(game, 'roll', `Soul Eater: a Strength 3 hit on one model of ${t.name}, Multiple Damage (3), no Armour Roll.`)
    return spellHits(game, t, 1, 3, 0, { noArmour: true, multipleDamage: '3', label: 'Soul Eater: ' })
  },
  // Ruinbolt — a 3" template over the target's centre (no scatter): enemy models, S3 AP-2.
  ruinbolt (game, u, t) {
    templateHits(game, centre(t), 1.5, 3, -2, { enemyOf: u.side, label: 'Ruinbolt: ' })
    afterShooting(game, t, u)
  },
  // ---- Necromancy ----
  // Deathly Cabal — the caster and its unit: a 6+ Ward against non-magical attacks; Fear (or Terror if they had Fear).
  'deathly-cabal' (game, u) {
    const host = hostOf(game, u)
    for (const x of [u, host].filter(Boolean)) {
      const entry = { value: 6, from: 'Deathly Cabal', nonMagical: true }
      x.wards = [...(x.wards || []), entry]
      const r = grantRules(x, [x.special.has('Fear') ? 'Terror' : 'Fear'])
      addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Deathly Cabal', side: u.side, casterId: u.id, unitId: x.id, until: 'nextStartOfTurn', revert: () => { x.wards = (x.wards || []).filter(w => w !== entry); r() } })
    }
    say(game, 'good', `Deathly Cabal: a 6+ Untouchable save against non-magical attacks, and Fear (or Terror).`)
  },
  // Unquiet Spirits — 3D6 S2 hits, no Armour Roll.
  'unquiet-spirits' (game, u, t) {
    const r = rollDice(game.rng, 3)
    say(game, 'roll', `Unquiet Spirits: 3D6 = ${r[0] + r[1] + r[2]} Strength 2 hits, no Armour Roll.`)
    spellHits(game, t, r[0] + r[1] + r[2], 2, 0, { noArmour: true, label: 'Unquiet Spirits: ' })
    afterShooting(game, t, u)
  },
  // Spiritual Vortex — a fixed 5" template within 12", dangerous terrain; enemies within 8": -1 Ld (min 2), no Inspiring Presence.
  'spiritual-vortex' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Spiritual Vortex', side: u.side, casterId: u.id, until: 'casterGone', at: point, r: 2.5, fixed: true, dangerous: true, hitsFriends: true, aura: 'spiritualVortex' })
    say(game, 'good', 'A Spiritual Vortex: enemy units within 8" are -1 Leadership and cannot use their General\'s.')
  },
  // Curse of Years — -1 Movement, Weapon Skill, Toughness; other Hexes end.
  'curse-of-years' (game, u, t) {
    endOthers(game, t, 'Hex')
    hex(game, u, t, 'Curse of Years', 'nextStartOfTurn', statMod(game, t, ['M', 'WS', 'T'], -1))
    say(game, 'good', `Curse of Years: ${t.name} suffers -1 Movement, Weapon Skill and Toughness.`)
  },
  // Spectral Steed — Remains in Play: a friendly infantry character gains Ethereal and Fly (10).
  'spectral-steed' (game, u, t) {
    if (!/Infantry/.test((t.troopType || []).join(' '))) { say(game, 'bad', `Spectral Steed only carries infantry characters.`); return }
    const r1 = flagFor(t, 'fly', 10); const r2 = grantRules(t, ['Ethereal'])
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Spectral Steed', side: u.side, casterId: u.id, unitId: t.id, until: 'casterGone', revert: () => { r1(); r2() }, say: `${t.name}'s Spectral Steed fades.` })
    say(game, 'good', `Spectral Steed: ${t.name} is Ethereal and may fly 10".`)
  },
  // Spirit Leech — until the end of this turn, -2 Leadership (min 2) and no Inspiring Presence; may target an engaged unit.
  'spirit-leech' (game, u, t) {
    const r1 = statMod(game, t, ['Ld'], -2, 2); const r2 = flagFor(t, 'noInspire')
    hex(game, u, t, 'Spirit Leech', 'endOfTurn', () => { r1(); r2() })
    say(game, 'good', `Spirit Leech: ${t.name} suffers -2 Leadership and cannot use its General's this turn.`)
  },
  // The Dwellers Below — a 3" template on the engaged unit, scattering D3+1": enemy models, S3.
  'the-dwellers-below' (game, u, t) {
    const sc = scatter(game, centre(t), d3(game.rng) + 1)
    say(game, 'roll', `The Dwellers Below: ${sc.text}.`)
    return templateHits(game, sc.at, 1.5, 3, 0, { enemyOf: u.side, label: 'The Dwellers Below: ' })
  },
  // ---- Troll Magic (Lore of Troll Magic) ----
  // Acidic Bile — a 3" template over the target, scattering D3+1": enemy models, S3 AP-2.
  'acidic-bile' (game, u, t) {
    const sc = scatter(game, centre(t), d3(game.rng) + 1)
    say(game, 'roll', `Acidic Bile: ${sc.text}.`)
    templateHits(game, sc.at, 1.5, 3, -2, { enemyOf: u.side, label: 'Acidic Bile: ' })
    afterShooting(game, t, u)
  },
  // Troll Brainz — Remains in Play: Stupidity and -1 Leadership.
  'troll-brainz' (game, u, t) {
    const r1 = grantRules(t, ['Stupidity']); const r2 = statMod(game, t, ['Ld'], -1, 1)
    addEffect(game, { kind: 'hexRIP', category: 'Hex', spell: 'Troll Brainz', side: u.side, casterId: u.id, unitId: t.id, until: 'casterGone', revert: () => { r1(); r2() }, say: `The Troll Brainz on ${t.name} wear off.` })
    say(game, 'good', `Troll Brainz: ${t.name} becomes Stupid-prone and -1 Leadership.`)
  },
  // Ravenous Recourse — friendly units with Stupidity within 12": +2 Movement this turn.
  'ravenous-recourse' (game, u) {
    const from = hostOf(game, u) || u
    const list = onTable(game).filter(o => o.side === u.side && hasRule(o, 'Stupidity') && distanceBetween(from, o) <= 12)
    for (const o of list) addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Ravenous Recourse', side: u.side, casterId: u.id, unitId: o.id, until: 'endOfTurn', revert: statMod(game, o, ['M'], 2) })
    say(game, 'good', `Ravenous Recourse: ${list.length ? list.map(o => o.name).join(', ') + ' gain' : 'no Stupid unit within 12" gains'} +2 Movement this turn.`)
  },
  // Foetid Whirlpool — 3" template, D6" scatter, ENEMY units: D3+3 S4 AP-3.
  'foetid-whirlpool' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Foetid Whirlpool', side: u.side, casterId: u.id, until: 'casterGone', at: point, r: 1.5, scatterDice: 1, S: 4, AP: -3, hitsFriends: false })
    say(game, 'good', 'A Foetid Whirlpool swirls up.')
  },
  // Torrent of Filth — flame template from the caster over the unit it fights: S3 AP-2, friend or foe.
  'torrent-of-filth' (game, u, t) {
    return templateHits(game, null, 0, 3, -2, { poly: flameTemplate(frontCentreOf(game, u), centre(t)), exceptAll: [u, hostOf(game, u)].filter(Boolean), label: 'Torrent of Filth: ' })
  },
  // Rapid Regeneration — Flammable and Regeneration (5+) until your next Start of Turn.
  'rapid-regeneration' (game, u, t) {
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Rapid Regeneration', side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', revert: grantRules(t, ['Flammable', 'Regeneration (5+)']) })
    say(game, 'good', `Rapid Regeneration: ${t.name} gains Regeneration (5+) and Flammable.`)
  },
  // Big Smartz — Remains in Play: friendly units within its Command range re-roll failed
  // Stupidity tests; any that failed this turn test again now.
  'big-smartz' (game, u) {
    addEffect(game, { kind: 'bigSmartz', side: u.side, casterId: u.id, until: 'casterGone' })
    say(game, 'good', `Big Smartz: friendly units within ${commandRange(u)}" of ${u.name} re-roll failed Stupidity tests.`)
    for (const o of onTable(game).filter(o => o.side === u.side && o.status.stupid && inAura(game, 'bigSmartz', o))) {
      const lt = leadershipTest(game, o, { label: `${o.name} — Stupidity test again (Big Smartz)` })
      say(game, 'roll', lt.text)
      if (lt.passed) { o.status.stupid = false; say(game, 'good', `${o.name} is no longer Stupid.`) }
    }
  },

  // ---- Elementalism ----
  // Flaming Sword — "D6+1 Strength 3 hits ... Flaming Attacks."
  'flaming-sword' (game, u, t) {
    const n = d6(game.rng) + 1
    say(game, 'roll', `Flaming Sword: D6+1 = ${n} Strength 3 Flaming hits on ${t.name}.`)
    return spellHits(game, t, n, 3, 0, { flaming: true, label: 'Flaming Sword: ' })
  },
  // Plague of Rust — the target's armour value is 2 worse; it may be aimed at an enemy unit in combat.
  'plague-of-rust' (game, u, t) {
    t.armourMod = (t.armourMod || 0) + 2
    hex(game, u, t, 'Plague of Rust', 'nextStartOfTurn', () => { t.armourMod -= 2 })
    say(game, 'good', `Plague of Rust: ${t.name}'s armour is 2 worse until ${game.sides[u.side].name}'s next turn.`)
  },
  // Summon Elemental Spirit — Remains in Play; 3" template within 15"; difficult terrain
  // no sight can cross; scatters D6" every Start of Turn; ENEMY units it passes: D3+3 S4 AP-1.
  'summon-elemental-spirit' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Elemental Spirit', side: u.side, casterId: u.id, until: 'casterGone', at: point, r: 1.5, scatterDice: 1, S: 4, AP: -1, flaming: false, hitsFriends: false, blocksSight: true })
    say(game, 'good', `An Elemental Spirit rises ${dist(point, centre(hostOf(game, u) || u)).toFixed(1)}" from ${u.name}. No line of sight crosses it.`)
  },
  // Earthen Ramparts — 5+ Ward; counts as behind a defended low obstacle if charged;
  // cannot march or charge; until the caster's next Start of Turn.
  'earthen-ramparts' (game, u, t) {
    const entry = { value: 5, from: 'Earthen Ramparts' }
    t.wards = [...(t.wards || []), entry]
    const r1 = flagFor(t, 'noMarchSpell'); const r2 = flagFor(t, 'noChargeSpell'); const r3 = flagFor(t, 'ramparts')
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Earthen Ramparts', side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', revert: () => { t.wards = (t.wards || []).filter(w => w !== entry); r1(); r2(); r3() }, say: `The Earthen Ramparts round ${t.name} fall.` })
    say(game, 'good', `Earthen Ramparts: ${t.name} gains a 5+ Untouchable save and counts as defending an obstacle if charged; it cannot march or charge.`)
  },
  // Wind Blast — D3+3 hits at Strength 5, AP -1, and then the unit Gives Ground.
  'wind-blast' (game, u, t) {
    const n = d3(game.rng) + 3
    say(game, 'roll', `Wind Blast: D3+3 = ${n} Strength 5 hits on ${t.name}.`)
    spellHits(game, t, n, 5, -1, { label: 'Wind Blast: ' })
    if (!t.status.removed && !isDead(t)) giveGround(game, t, [hostOf(game, u) || u])
    afterShooting(game, t, u)
  },
  // Travel Mystical Pathway — not fleeing, not yet moved this Movement phase: put it
  // anywhere wholly within 12" of where it was, not within 6" of an enemy; it cannot move again.
  async 'travel-mystical-pathway' (game, u, t, ctx) {
    if (t.status.fleeing || t.status.moved) { say(game, 'bad', `Travel Mystical Pathway: ${t.name} ${t.status.fleeing ? 'is fleeing' : 'has already moved'}; nothing happens.`); return }
    const from = { ...t.pos }
    const where = ctx.pickPoint ? await ctx.pickPoint(`Click where ${t.name}'s front edge goes (within 12" of where it is, not within 6" of an enemy).`, p => dist(p, from) <= 12 - 0.01) : null
    if (where) {
      const was = { pos: t.pos }
      t.pos = where
      const bad = solid(game).some(o => o !== t && (o.side !== t.side ? distanceBetween(o, t) < 6 : distanceBetween(o, t) < 0.01)) || corners(t).some(p => dist(p, from) > 12 + Math.hypot(t.base.w * t.files, t.base.d * 10))
      if (bad) { Object.assign(t, was); say(game, 'bad', `Travel Mystical Pathway: ${t.name} cannot go there (within 6" of an enemy, or on another unit).`) } else say(game, 'good', `${t.name} travels the Mystical Pathway ${dist(where, from).toFixed(1)}".`)
    } else say(game, '', `Travel Mystical Pathway: ${t.name} stays where it is.`)
    t.status.moved = true
  },
  // Storm Call — -1 Movement and Initiative (minimum 1); other Hexes on it end.
  'storm-call' (game, u, t) {
    endOthers(game, t, 'Hex')
    const revert = statMod(game, t, ['M', 'I'], -1)
    hex(game, u, t, 'Storm Call', 'nextStartOfTurn', revert)
    say(game, 'good', `Storm Call: ${t.name} suffers -1 Movement and Initiative until ${game.sides[u.side].name}'s next turn.`)
  },
  // ---- Illusion ----
  // Mind Razor — Leadership test: passed, D3 S3 hits; failed, D3+3 S4 AP-3 hits.
  'mind-razor' (game, u, t) {
    const lt = leadershipTest(game, t, { label: `${t.name} — Mind Razor Leadership test` })
    say(game, 'roll', lt.text)
    if (lt.passed) { const n = d3(game.rng); say(game, 'roll', `Mind Razor: D3 = ${n} Strength 3 hits.`); spellHits(game, t, n, 3, 0, { label: 'Mind Razor: ' }) } else { const n = d3(game.rng) + 3; say(game, 'roll', `Mind Razor: D3+3 = ${n} Strength 4 hits, AP -3.`); spellHits(game, t, n, 4, -3, { label: 'Mind Razor: ' }) }
    afterShooting(game, t, u)
  },
  // Shimmering Dragon — a friendly character not fleeing and not yet moved gains Fly (10)
  // until the end of this turn. (Here: it may move up to 10", over units and terrain, ending clear.)
  'shimmering-dragon' (game, u, t) {
    if (t.status.fleeing || t.status.moved) { say(game, 'bad', `Shimmering Dragon: ${t.name} ${t.status.fleeing ? 'is fleeing' : 'has already moved'}; nothing happens.`); return }
    const revert = flagFor(t, 'fly', 10)
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Shimmering Dragon', side: u.side, casterId: u.id, unitId: t.id, until: 'endOfTurn', revert })
    say(game, 'good', `Shimmering Dragon: ${t.name} may fly up to 10" this turn.`)
  },
  // Column of Crystal — Remains in Play; a 5" template within 9"; it does not move;
  // impassable terrain no sight can cross.
  'column-of-crystal' (game, u, point) {
    const poly = Array.from({ length: 16 }, (_, i) => ({ x: point.x + Math.cos(i / 16 * Math.PI * 2) * 2.5, y: point.y + Math.sin(i / 16 * Math.PI * 2) * 2.5 }))
    // (the spell does not say what becomes of models under it: here it cannot rise on top of a unit — our guess)
    const under = onTable(game).find(o => polysOverlapS(corners(o), poly))
    if (under) { say(game, 'bad', `The Column of Crystal cannot rise on top of ${under.name}: it fades without effect.`); return }
    const f = { id: `spell-${u.id}-crystal`, kind: 'rocks', at: point, size: 5, poly, spell: true }
    game.terrain = [...(game.terrain || []), f]
    addEffect(game, { kind: 'column', side: u.side, casterId: u.id, until: 'casterGone', at: point, r: 2.5, revert: () => { game.terrain = game.terrain.filter(x => x !== f) }, say: 'The Column of Crystal shatters.' })
    say(game, 'good', `A Column of Crystal rises: impassable, and no line of sight crosses it.`)
  },
  // Confounding Convocation — Remains in Play: the target is subject to Stupidity.
  'confounding-convocation' (game, u, t) {
    const had = t.special.has('Stupidity')
    if (!had) t.special.add('Stupidity')
    addEffect(game, { kind: 'hexRIP', category: 'Hex', spell: 'Confounding Convocation', side: u.side, casterId: u.id, unitId: t.id, until: 'casterGone', revert: () => { if (!had) t.special.delete('Stupidity') }, say: `The Confounding Convocation on ${t.name} lifts.` })
    say(game, 'good', `Confounding Convocation: ${t.name} is subject to Stupidity while the spell lasts.`)
  },
  // Spectral Doppelganger — 2D6 hits, worked out with the caster's own characteristics and special rules and those
  // of its weapons.
  'spectral-doppelganger' (game, u, t) {
    const r = rollDice(game.rng, 2)
    const w = meleeWeaponOf(u, { charged: !!u.status.charged })
    const S = meleeStrength(w, u.models[0].profile.S ?? 3, !!u.status.charged)
    say(game, 'roll', `Spectral Doppelganger: 2D6 = ${r[0] + r[1]} hits at the caster's Strength ${S} (${w.name}).`)
    return spellHits(game, t, r[0] + r[1], S, w.ap || 0, { label: 'Spectral Doppelganger: ' })
  },
  // Miasmic Mirage — -2 Movement (minimum 1), no march or charge; other Hexes on it end.
  'miasmic-mirage' (game, u, t) {
    endOthers(game, t, 'Hex')
    const r1 = statMod(game, t, ['M'], -2); const r2 = flagFor(t, 'noMarchSpell'); const r3 = flagFor(t, 'noChargeSpell')
    hex(game, u, t, 'Miasmic Mirage', 'nextStartOfTurn', () => { r1(); r2(); r3() })
    say(game, 'good', `Miasmic Mirage: ${t.name} suffers -2 Movement and cannot march or charge until ${game.sides[u.side].name}'s next turn.`)
  },
  // Glittering Robe — -1 To Hit for enemies attacking the caster and its unit; other
  // Enchantments on them end.
  'glittering-robe' (game, u) {
    const host = hostOf(game, u)
    for (const x of [u, host].filter(Boolean)) {
      endOthers(game, x, 'Enchantment')
      const revert = flagFor(x, 'glitter')
      addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Glittering Robe', side: u.side, casterId: u.id, unitId: x.id, until: 'nextStartOfTurn', revert, say: `The Glittering Robe on ${x.name} fades.` })
    }
    say(game, 'good', `Glittering Robe: enemies are -1 To Hit against ${[u, host].filter(Boolean).map(x => x.name).join(' and ')}.`)
  },

  // Gaze of Bosher — a straight line 5D6" long runs out from the caster's base; each model it crosses, friend or
  // foe, takes one hit at Strength 5, AP -3.
  // (drawn towards the target's centre, from the point of the caster's base nearest it)
  'gaze-of-bosher' (game, u, t) {
    const r = rollDice(game.rng, 5)
    const len = r.reduce((a, b) => a + b, 0)
    const from = hostOf(game, u) || u
    const to = centre(t)
    const cs = corners(from)
    const start = cs.map((c, i) => nearestOnSeg(to, c, cs[(i + 1) % cs.length])).reduce((a, p) => dist(p, to) < dist(a, to) ? p : a)
    const d = dist(start, to) || 1
    const end = add(start, mul({ x: (to.x - start.x) / d, y: (to.y - start.y) / d }, len))
    say(game, 'roll', `Gaze of Bosher: 5D6 = ${r.join('+')} = ${len}" line from ${u.name} towards ${t.name}.`)
    game.lastLine = { from: start, to: end }
    const joined = game.units.filter(c => c.status.joinedTo && c.placed && !c.status.removed && !isDead(c))
    for (const o of [...onTable(game), ...joined]) {
      if (o === from || o === u) continue
      let n = 0
      for (const sl of modelSlots(o)) {
        const hw = o.base.w / 2; const hd = o.base.d / 2
        const f = { x: Math.cos(o.facing), y: Math.sin(o.facing) }; const rr = { x: -f.y, y: f.x }
        const sq = [add(add(sl.at, mul(rr, -hw)), mul(f, hd)), add(add(sl.at, mul(rr, hw)), mul(f, hd)), add(add(sl.at, mul(rr, hw)), mul(f, -hd)), add(add(sl.at, mul(rr, -hw)), mul(f, -hd))]
        if (pointInPoly(start, sq) || sq.some((p, i) => segDist(p, sq[(i + 1) % 4], start, end) < 1e-6)) n++
      }
      if (n) spellHits(game, o, n, 5, -3, { label: `Gaze of Bosher, ${n} model${n === 1 ? '' : 's'} under the line: ` })
    }
    afterShooting(game, t, u)
  },
  // Wangler's Curse — Remains in Play: the enemy unit has to roll again every Armour Roll of
  // a natural 6 (damage.js itemSaveRerolls, and spellHits here)
  'wanglers-curse' (game, u, t) {
    t.status.wanglersCurse = (t.status.wanglersCurse || 0) + 1
    addEffect(game, { kind: 'hexRIP', category: 'Hex', spell: "Wangler's Curse", side: u.side, casterId: u.id, unitId: t.id, until: 'casterGone', revert: () => { t.status.wanglersCurse-- }, say: `Wangler's Curse on ${t.name} ends.` })
    say(game, 'good', `Wangler's Curse: ${t.name} must re-roll every Armour Roll of a natural 6.`)
  },
  // Burning Gaze — a 5D6" line from the caster's base edge; every ENEMY model under it: one S4 hit,
  // no Armour Roll (Ward and Regeneration as normal). (Drawn as Gaze of Bosher is.)
  'burning-gaze' (game, u, t) {
    const r = rollDice(game.rng, 5)
    const len = r.reduce((a, b) => a + b, 0)
    const from = hostOf(game, u) || u
    const to = centre(t)
    const cs = corners(from)
    const start = cs.map((c, i) => nearestOnSeg(to, c, cs[(i + 1) % cs.length])).reduce((a, p) => dist(p, to) < dist(a, to) ? p : a)
    const d = dist(start, to) || 1
    const end = add(start, mul({ x: (to.x - start.x) / d, y: (to.y - start.y) / d }, len))
    say(game, 'roll', `Burning Gaze: 5D6 = ${r.join('+')} = ${len}" line from ${u.name} towards ${t.name}.`)
    game.lastLine = { from: start, to: end }
    const joined = game.units.filter(c => c.status.joinedTo && c.placed && !c.status.removed && !isDead(c))
    for (const o of [...onTable(game), ...joined]) {
      if (o.side === u.side) continue
      let n = 0
      for (const sl of modelSlots(o)) {
        const hw = o.base.w / 2; const hd = o.base.d / 2
        const f = { x: Math.cos(o.facing), y: Math.sin(o.facing) }; const rr = { x: -f.y, y: f.x }
        const sq = [add(add(sl.at, mul(rr, -hw)), mul(f, hd)), add(add(sl.at, mul(rr, hw)), mul(f, hd)), add(add(sl.at, mul(rr, hw)), mul(f, -hd)), add(add(sl.at, mul(rr, -hw)), mul(f, -hd))]
        if (pointInPoly(start, sq) || sq.some((p, i) => segDist(p, sq[(i + 1) % 4], start, end) < 1e-6)) n++
      }
      if (n) spellHits(game, o, n, 4, 0, { noArmour: true, label: `Burning Gaze, ${n} model${n === 1 ? '' : 's'} under the line: ` })
    }
    afterShooting(game, t, u)
  },
  // The Mere's Gift — Remains in Play: a casting result of 7+ gives the friendly unit Regeneration (6+);
  // of 10+, Regeneration (5+). It may target a unit engaged in combat.
  'the-meres-gift' (game, u, t, ctx, s) {
    const v = (ctx?.result ?? 7) >= (s?.castingValue2 || 10) ? '5+' : '6+'
    const revert = grantRules(t, [`Regeneration (${v})`])
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: "The Mere's Gift", side: u.side, casterId: u.id, unitId: t.id, until: 'casterGone', rip: true, revert, say: `The Mere's Gift on ${t.name} fades.` })
    say(game, 'good', `The Mere's Gift (casting result ${ctx?.result ?? 7}): ${t.name} has Regeneration (${v}) while the spell remains.`)
  },
  // The Mere's Wrath — Remains in Play: +1 Strength for the caster, its mount and the unit it is with (to
  // 10) and their weapons' AP improved by 1
  'the-meres-wrath' (game, u) {
    const host = hostOf(game, u)
    const who = [u, ...(host ? [host] : [])]
    const reverts = who.map(x => { const r = statMod(game, x, ['S'], 1); x.status.apBonus = (x.status.apBonus || 0) + 1; return () => { r(); x.status.apBonus = (x.status.apBonus || 1) - 1 } })
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: "The Mere's Wrath", side: u.side, casterId: u.id, unitId: u.id, until: 'casterGone', rip: true, revert: () => reverts.forEach(f => f()), say: `The Mere's Wrath on ${who.map(x => x.name).join(' and ')} fades.` })
    say(game, 'good', `The Mere's Wrath: ${who.map(x => x.name).join(' and ')} +1 Strength and AP improved by 1 while the spell remains.`)
  },
  // Head Banger — one enemy model fighting the caster takes one Strength 6 hit,
  // Multiple Damage (D3), no armour or Regeneration save (Untouchable saves as normal)
  'head-banger' (game, u, t) {
    say(game, 'roll', `Head Banger: one Strength 6 hit on a model of ${t.name}.`)
    spellHits(game, t, 1, 6, 0, { noArmour: true, noRegen: true, multipleDamage: 'D3', label: 'Head Banger: ' })
  },
  // Dead Itchy — until your next Start of Turn, -D3 Toughness and Initiative (minimum 1)
  'dead-itchy' (game, u, t) {
    const n = d3(game.rng)
    hex(game, u, t, 'Dead Itchy', 'nextStartOfTurn', statMod(game, t, ['T', 'I'], -n, 1))
    say(game, 'roll', `Dead Itchy: D3 = ${n} — ${t.name} has -${n} Toughness and Initiative until its caster's next Start of Turn.`)
  },
  // Call of the Wild — a friendly infantry or cavalry unit has Reserve Move until the end of the turn
  'call-of-the-wild' (game, u, t) {
    if (!/Infantry|Cavalry/.test((t.troopType || []).join(' '))) { say(game, '', `Call of the Wild: ${t.name} is neither infantry nor cavalry — no effect.`); return }
    const had = t.special.has('Reserve Move')
    if (!had) t.special.add('Reserve Move')
    addEffect(game, { kind: 'ench', category: 'Conveyance', spell: 'Call of the Wild', side: u.side, unitId: t.id, until: 'endOfTurn', revert: () => { if (!had) t.special.delete('Reserve Move') } })
    say(game, 'good', `Call of the Wild: ${t.name} gains Reserve Move until the end of the turn.`)
  },
  // Courage of the First King — Remains in Play: the target friendly unit Unbreakable; ends earlier Enchantments
  'courage-of-the-first-king' (game, u, t) {
    endOthers(game, t, 'Enchantment')
    const had = t.special.has('Unbreakable')
    if (!had) t.special.add('Unbreakable')
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Courage of the First King', side: u.side, casterId: u.id, unitId: t.id, until: 'casterGone', rip: true, revert: () => { if (!had) t.special.delete('Unbreakable') }, say: `Courage of the First King on ${t.name} ends.` })
    say(game, 'good', `Courage of the First King: ${t.name} is Unbreakable while the spell remains in play.`)
  },
  // Hand of the Bloodied God — one enemy model the caster fights: a S4 hit, no Armour Roll
  'hand-of-the-bloodied-god' (game, u, t) {
    say(game, 'roll', `Hand of the Bloodied God: a Strength 4 hit on ${t.name}, no Armour Roll.`)
    spellHits(game, t, 1, 4, 0, { noArmour: true, label: 'Hand of the Bloodied God: ' })
  },
  // The Smith's Unmaking — an enemy character: one of its magic items unmade (the caster's choice, asked; with
  // no player, the first). Only magic items proper: not runes, honours, gifts, traits, mutations or Big Names.
  async 'the-smiths-unmaking' (game, u, t, ctx) {
    const ids = [...new Set((t.items || []).filter(i => !(t.status.spentItems || []).includes(i) && MAGIC_TYPES.test(itemById(i)?.type || '')))]
    const id = await choose(game, u, ctx, `The Smith's Unmaking: which of ${t.name}'s magic items is unmade?`, ids.map(i => [itemById(i)?.name || i, i]), ids[0])
    if (!id) { say(game, '', `The Smith's Unmaking: ${t.name} carries no magic item to unmake.`); return }
    t.status.spentItems = [...(t.status.spentItems || []), ...Array((t.items || []).filter(x => x === id).length).fill(id)]
    t.items = t.items.filter(x => x !== id)
    // ("completely useless": a magic weapon already in its kit goes too)
    if (t.kit) for (const k of Object.keys(t.kit)) if (Array.isArray(t.kit[k])) t.kit[k] = t.kit[k].filter(w => w?.key !== 'magic:' + id)
    say(game, 'good', `The Smith's Unmaking: ${t.name}'s ${id.replace(/-/g, ' ')} is UNMADE.`)
  },
  // Toothcracker — 7+ +1 Toughness, 10+ +2 (to 10), until the end of the turn
  toothcracker (game, u, t, ctx) {
    const n = (ctx?.result ?? 7) >= 10 ? 2 : 1
    const rv = statMod(game, t, ['T'], n)
    addEffect(game, { kind: 'statMod', category: 'Enchantment', spell: 'Toothcracker', side: u.side, casterId: u.id, unitId: t.id, until: 'endOfTurn', revert: rv, say: `Toothcracker on ${t.name} ends.` })
    say(game, 'good', `Toothcracker: ${t.name} +${n} Toughness until the end of the turn.`)
  },
  // Trollguts — 8+ Regeneration (6+), 11+ Regeneration (5+), until the caster's next Start of Turn
  trollguts (game, u, t, ctx) {
    const v = (ctx?.result ?? 8) >= 11 ? 5 : 6
    const had = [...t.special].find(r => r.startsWith('Regeneration'))
    if (had && Number(had.match(/\d/)?.[0]) <= v) { say(game, '', `Trollguts: ${t.name} already regenerates as well — no effect.`); return }
    if (had) t.special.delete(had)
    t.special.add(`Regeneration (${v}+)`)
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Trollguts', side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', revert: () => { t.special.delete(`Regeneration (${v}+)`); if (had) t.special.add(had) }, say: `Trollguts on ${t.name} ends.` })
    say(game, 'good', `Trollguts: ${t.name} has Regeneration (${v}+) until the caster's next Start of Turn.`)
  },
  // Devolve — a Leadership test; failed, Wounds lost equal to the amount it failed by
  devolve (game, u, t) {
    const ld = Math.max(0, ...t.models.filter(m => m.wounds > 0).map(m => m.profile.Ld ?? 0), ...(t.joined || []).filter(c => !c.status.removed).flatMap(c => c.models.map(m => m.profile.Ld ?? 0)))
    const d = rollDice(game.rng, 2); const tot = d[0] + d[1]
    const by = tot === 2 ? 0 : tot === 12 ? Math.max(1, 12 - ld) : Math.max(0, tot - ld)
    say(game, 'roll', `Devolve: ${t.name} Leadership test ${d.join('+')} = ${tot} against ${ld} — ${by ? `FAILED by ${by}: it loses ${by} Wound${by === 1 ? '' : 's'}` : 'passed'}.`)
    if (by) applyWounds(game, t, by, 'Devolve')
  },
  // Mantle of Garrow — +D6 Strength and Attacks until the end of the turn; on a 6, instead a Wound lost
  'mantle-of-garrow' (game, u) {
    const r = rollDice(game.rng, 1)[0]
    if (r === 6) { say(game, 'bad', `Mantle of Garrow: D6 = 6 — the spirit-mantle turns on ${u.name}: it loses a single Wound.`); applyWounds(game, u, 1, 'the Mantle of Garrow'); return }
    const rv = statMod(game, u, ['S', 'A'], r)
    addEffect(game, { kind: 'statMod', category: 'Enchantment', spell: 'Mantle of Garrow', side: u.side, casterId: u.id, unitId: u.id, until: 'endOfTurn', revert: rv, say: `${u.name}'s Mantle of Garrow fades.` })
    say(game, 'good', `Mantle of Garrow: D6 = ${r} — ${u.name} has +${r} Strength and Attacks until the end of the turn.`)
  },
  // Viletide — 5D6 Strength 1 hits, AP -2
  viletide (game, u, t) {
    const d = rollDice(game.rng, 5); const n = d.reduce((a, b) => a + b, 0)
    say(game, 'roll', `Viletide: 5D6 = ${d.join('+')} = ${n} Strength 1 hits, AP -2, on ${t.name}.`)
    spellHits(game, t, n, 1, -2, { label: 'Viletide: ' })
    afterShooting(game, t, u)
  },
  // Acquiescence — the target enemy unit has Strike Last until the end of this turn's Combat phase
  // (cast in the Strategy phase: 'until the end of the Combat phase' is this turn's)
  acquiescence (game, u, t) {
    const had = t.special.has('Strike Last')
    if (!had) t.special.add('Strike Last')
    hex(game, u, t, 'Acquiescence', 'endOfTurn', () => { if (!had) t.special.delete('Strike Last') })
    say(game, 'good', `Acquiescence: ${t.name} strikes last this turn.`)
  },
  // Sullen Fire — D6+3 Strength 4 hits, AP -2, Flaming Attacks
  'sullen-fire' (game, u, t) {
    const n = rollDice(game.rng, 1)[0] + 3
    say(game, 'roll', `Sullen Fire: D6+3 = ${n} Strength 4 hits, AP -2, Flaming, on ${t.name}.`)
    spellHits(game, t, n, 4, -2, { flaming: true, label: 'Sullen Fire: ' })
    afterShooting(game, t, u)
  },
  // Fleshy Abundance — Remains in Play: the caster and its unit +1 Toughness (to a maximum of 7)
  'fleshy-abundance' (game, u) {
    const units = [u, hostOf(game, u)].filter(Boolean)
    const reverts = []
    for (const x of units) for (const m of x.models) if (typeof m.profile.T === 'number' && m.profile.T < 7) { m.profile.T += 1; reverts.push(() => { m.profile.T -= 1 }) }
    addEffect(game, { kind: 'ench', category: 'Enchantment', spell: 'Fleshy Abundance', side: u.side, casterId: u.id, unitId: u.id, until: 'casterGone', rip: true, revert: () => reverts.forEach(r => r()), say: 'Fleshy Abundance ends.' })
    say(game, 'good', `Fleshy Abundance: ${u.name} and its unit have +1 Toughness while the spell remains in play.`)
  },
  // Storm Call, The Quickening Storm — D3 S4 AP -1 hits on every unit within 6"; a model with
  // the Quickening Storm hit by it is Quickened: +1 Initiative and Attacks until its next Start of Turn
  'thunderwyrm-elder-storm-call' (game, u) {
    for (const o of game.units.filter(o => o.placed && !o.status.removed && !isDead(o) && (o === u || distanceBetween(o, u) <= 6))) {
      const n = Math.ceil(rollDice(game.rng, 1)[0] / 2)
      say(game, 'roll', `Storm Call: D3 = ${n} Strength 4 hits, AP -1, on ${o.name}.`)
      spellHits(game, o, n, 4, -1, { label: 'Storm Call: ' })
      if (hasRule(o, 'The Quickening Storm') && !o.status.removed && !isDead(o) && !o.status.quickened) {
        o.status.quickened = true
        addEffect(game, { kind: 'statMod', category: 'Enchantment', spell: 'the Quickening Storm', side: o.side, unitId: o.id, until: 'nextStartOfTurn', revert: (() => { const r = statMod(game, o, ['I', 'A'], 1); return () => { r(); o.status.quickened = false } })(), say: `${o.name} is no longer Quickened.` })
        say(game, 'good', `${o.name} is QUICKENED by the lightning: +1 Initiative and Attacks until its next Start of Turn.`)
      }
    }
  },
  // Strike the Runes — the Anvil of Ruin's four Bound spells (Power Level 2)
  // Rune of Oath and Steel: 8+ failed Armour Rolls re-rolled; 11+ also the armour value +1 (to 2+)
  'rune-of-oath-and-steel' (game, u, t, ctx) {
    const plus = (ctx?.result ?? 8) >= 11
    addEffect(game, { kind: 'statMod', category: 'Enchantment', spell: 'Rune of Oath & Steel', side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', revert: flagFor(t, 'oathSteel', { plus }), say: `Rune of Oath & Steel on ${t.name} ends.` })
    say(game, 'good', `Rune of Oath & Steel: ${t.name} re-rolls failed Armour Rolls${plus ? ' and its armour value improves by 1 (to 2+)' : ''} until ${u.name}'s next Start of Turn.`)
  },
  // Rune of Hearth and Home: friendly Dwarf units up to 21" from the Anvil are Immune to Psychology
  'rune-of-hearth-and-home' (game, u) {
    const near = game.units.filter(o => o.side === u.side && o.placed && !o.status.removed && !isDead(o) && o.army === 'deephold-clans' && distanceBetween(o, u) <= 21 && !o.special.has('Immune to Psychology'))
    for (const o of near) o.special.add('Immune to Psychology')
    addEffect(game, { kind: 'hearth', category: 'Enchantment', spell: 'Rune of Hearth & Home', side: u.side, casterId: u.id, until: 'nextStartOfTurn', revert: () => { for (const o of near) o.special.delete('Immune to Psychology') }, say: 'The Rune of Hearth & Home fades.' })
    say(game, 'good', `Rune of Hearth & Home: ${near.length} Dwarf unit${near.length === 1 ? '' : 's'} within 21" are Immune to Psychology until the Anvil's next Start of Turn.`)
  },
  // Rune of Haste and Urgency: a friendly unit not fleeing that has moved this phase may move again
  'rune-of-haste-and-urgency' (game, u, t) {
    if (t.status.fleeing || !t.status.moved) { say(game, '', `Rune of Haste & Urgency: ${t.name} has not moved this phase (or is fleeing) — no effect.`); return }
    t.status.moved = false
    say(game, 'good', `Rune of Haste & Urgency: ${t.name} may move again.`)
  },
  // Rune of Wrath and Ruin: 2D6 Strength 4 hits, AP -2
  'rune-of-wrath-and-ruin' (game, u, t) {
    const r = rollDice(game.rng, 2)
    say(game, 'roll', `Rune of Wrath & Ruin: 2D6 = ${r.join('+')} = ${r[0] + r[1]} Strength 4 hits, AP -2, on ${t.name}.`)
    spellHits(game, t, r[0] + r[1], 4, -2, { label: 'Rune of Wrath & Ruin: ' })
    afterShooting(game, t, u)
  },
  // Fireball — 2D6 Flaming hits on the enemy unit, Strength 4, no AP.
  fireball (game, u, t) {
    const r = rollDice(game.rng, 2)
    say(game, 'roll', `Fireball: 2D6 = ${r.join('+')} = ${r[0] + r[1]} Strength 4 hits on ${t.name}.`)
    spellHits(game, t, r[0] + r[1], 4, 0, { flaming: true, label: 'Fireball: ' })
    afterShooting(game, t, u)
  },
  // Curse of Arrow Attraction — until your next Start of Turn, your shots at the enemy unit re-roll natural 1s
  // To Hit.
  'curse-of-arrow-attraction' (game, u, t) {
    addEffect(game, { kind: 'arrowAttraction', category: 'Hex', spell: 'Curse of Arrow Attraction', side: u.side, casterId: u.id, unitId: t.id, until: 'nextStartOfTurn', say: `The Curse of Arrow Attraction on ${t.name} ends.` })
    say(game, 'good', `${t.name} is cursed: shooting at it re-rolls natural 1s To Hit until ${game.sides[u.side].name}'s next turn.`)
  },
  // Pillar of Fire — Remains in Play; a 3" template within 12" of the caster; difficult
  // terrain; scatters D6" every Start of Turn; any ENEMY unit moving through it or that it moves over
  // suffers D3+3 S3 AP-2 Flaming hits.
  'pillar-of-fire' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Pillar of Fire', side: u.side, casterId: u.id, until: 'casterGone', at: point, r: 1.5, scatterDice: 1, S: 3, AP: -2, flaming: true, hitsFriends: false, difficult: true })
    say(game, 'good', `A Pillar of Fire roars up ${dist(point, centre(hostOf(game, u) || u)).toFixed(1)}" from ${u.name}. It stays until ${u.name} dies or leaves.`)
  },
  // Arcane Urgency — a friendly unit that has moved this Movement phase and is not fleeing may at once make a
  // second move.
  'arcane-urgency' (game, u, t) {
    if (t.status.fleeing || !t.status.moved) { say(game, 'bad', `Arcane Urgency: ${t.name} ${t.status.fleeing ? 'is fleeing' : 'has not moved yet this phase'}, so nothing happens.`); return }
    t.status.moved = false
    t.status.marched = false
    t.status.marchTested = null
    say(game, 'good', `Arcane Urgency: ${t.name} may move again.`)
  },
  // Oaken Shield — until your next Start of Turn, the caster and the unit it is with have a 5+ Untouchable save
  // against all wounds.
  'oaken-shield' (game, u) {
    const host = hostOf(game, u)
    for (const x of [u, host].filter(Boolean)) {
      const entry = { value: 5, from: 'Oaken Shield' }
      x.wards = [...(x.wards || []), entry]
      addEffect(game, { kind: 'ward', category: 'Enchantment', spell: 'Oaken Shield', value: 5, side: u.side, casterId: u.id, unitId: x.id, until: 'nextStartOfTurn', revert: () => { x.wards = (x.wards || []).filter(w => w !== entry) }, say: `The Oaken Shield on ${x.name} ends.` })
    }
    say(game, 'good', `Oaken Shield: ${[u, host].filter(Boolean).map(x => x.name).join(' and ')} gain a 5+ Untouchable save.`)
  },
  // Curse of Cowardly Flight — the enemy unit takes a Panic test at once. A unit that would normally pass Panic
  // tests without rolling still rolls this one, and Gives Ground if it fails.
  'curse-of-cowardly-flight' (game, u, t) {
    const auto = ['Immune to Psychology', 'Unbreakable', 'Ignore Panic', 'Frenzy', '"Hold the Line!"'].some(r => hasRule(t, r))
    if (!auto) { panicTest(game, t, hostOf(game, u) || u, 'Curse of Cowardly Flight', { forced: true }); return }
    const passed = panicTest(game, t, hostOf(game, u) || u, 'Curse of Cowardly Flight', { forced: true, testOnly: true })
    if (!passed) giveGround(game, t, [hostOf(game, u) || u])
  },
  // Hammerhand — one enemy unit fighting the caster takes 2D3 hits at Strength 4, AP -2.
  hammerhand (game, u, t) {
    const n = d3(game.rng) + d3(game.rng)
    say(game, 'roll', `Hammerhand: 2D3 = ${n} Strength 4 hits on ${t.name}.`)
    return spellHits(game, t, n, 4, -2, { label: 'Hammerhand: ' })
  },
  // Vindictive Glare — one hit at Strength 7 with Multiple Damage (D3), and no Armour Roll; it may be aimed at an
  // enemy unit in combat.
  'vindictive-glare' (game, u, t) {
    say(game, 'roll', `Vindictive Glare: a Strength 7 hit on ${t.name}, Multiple Damage (D3), no Armour Roll.`)
    spellHits(game, t, 1, 7, 0, { noArmour: true, multipleDamage: 'D3', label: 'Vindictive Glare: ' })
    afterShooting(game, t, u)
  },
  // Hand of Wangler or Bosher — a friendly character is removed and replaced anywhere within
  // 2D6" of where it was, not within 3" of an enemy; on a double 1 it loses a Wound. It may leave combat.
  async 'hand-of-wangler-or-bosher' (game, u, t, ctx) {
    const r = rollDice(game.rng, 2)
    const d = r[0] + r[1]
    say(game, 'roll', `Hand of Wangler (or Bosher): 2D6 = ${r.join('+')} = ${d}" — ${t.name} may be put down anywhere within ${d}".`)
    const where = ctx.pickPoint ? await ctx.pickPoint(`Click where ${t.name} lands (within ${d}" of where it is, not within 3" of an enemy).`, p => dist(p, t.pos) <= d && !solid(game).some(o => o.side !== t.side && Math.min(...corners(o).map(c => dist(c, p))) < 3)) : null
    if (where) {
      if (t.status.joinedTo) { const h = hostOf(game, t); if (h) h.joined = (h.joined || []).filter(c => c !== t); t.status.joinedTo = null }
      for (const id of Object.keys(t.engagedWith || {})) { const o = game.units.find(x => x.id === id); if (o?.engagedWith) delete o.engagedWith[t.id]; if (o && !Object.keys(o.engagedWith || {}).length) o.status.engaged = false }
      t.engagedWith = {}; t.status.engaged = false
      const from = t.pos
      t.pos = where
      say(game, '', `${t.name} is snatched up and dropped ${dist(where, from).toFixed(1)}" away.`)
    }
    if (where && r[0] === 1 && r[1] === 1) applyWounds(game, t, 1, 'a bad landing')
  },
  // Floodlights On — for the rest of this turn the enemy unit loses D3 from its Weapon Skill and its Initiative
  // (never below 1).
  'floodlights-on' (game, u, t) {
    const n = d3(game.rng)
    const reverts = [t, ...(t.joined || []).filter(c => !c.status.removed)].map(x => statMod(game, x, ['WS', 'I'], -n))
    const revert = () => reverts.forEach(r => r())
    addEffect(game, { kind: 'statMod', category: 'Hex', spell: "Floodlights On", side: u.side, casterId: u.id, unitId: t.id, until: 'endOfTurn', revert, say: `The floodlights go off over ${t.name}.` })
    say(game, 'good', `Floodlights On: ${t.name} suffers -${n} Weapon Skill and Initiative until the end of this turn.`)
  },
  // Sun's Out — until your next Start of Turn, friendly units in the caster's Command range re-roll natural 1s
  // To Hit, and their weapons get 1 better AP.
  'suns-out' (game, u) {
    addEffect(game, { kind: 'evilSun', side: u.side, casterId: u.id, until: 'nextStartOfTurn', say: "Sun's Out ends: the sun goes in." })
    say(game, 'good', `Sun's Out: friendly units within ${commandRange(u)}" of ${u.name} re-roll natural 1s To Hit and improve their AP by 1.`)
  },
  // Ere We Go — friendly units within the caster's Command range during this turn's
  // Declare Charges sub-phase: +3" maximum charge range and +D3 to the Charge roll.
  'come-on-you-ladz' (game, u) {
    addEffect(game, { kind: 'comeOnYouLadz', side: u.side, casterId: u.id, until: 'endOfTurn' })
    say(game, 'good', `Come On You Ladz!: friendly units within ${commandRange(u)}" of ${u.name} charge 3" further and add D3 to their Charge rolls this turn.`)
  },
  // Foot of Bosher or Wangler — Remains in Play; a 5" template within 15"; difficult terrain;
  // scatters 2D6" every Start of Turn; ANY unit moving through it or moved over: D3+3 S5 AP-1 hits.
  'foot-of-bosher-or-wangler' (game, u, point) {
    addEffect(game, { kind: 'vortex', name: 'Foot of Bosher', side: u.side, casterId: u.id, until: 'casterGone', at: point, r: 2.5, scatterDice: 2, S: 5, AP: -1, flaming: false, hitsFriends: true, difficult: true })
    say(game, 'good', `The Foot of Bosher (or Wangler) stamps down ${dist(point, centre(hostOf(game, u) || u)).toFixed(1)}" from ${u.name}.`)
  },
  // Fist of Bosher or Wangler — a 5" template centred on a unit the caster fights,
  // scattering D3+1"; every model under it (friend or foe) risks a S4 AP-1 hit.
  'fist-of-bosher-or-wangler' (game, u, t) {
    const sc = scatter(game, centre(t), d3(game.rng) + 1)
    say(game, 'roll', `Fist of Bosher (or Wangler): the 5" template over ${t.name} — ${sc.text}.`)
    return templateHits(game, sc.at, 2.5, 4, -1, { label: 'Fist of Bosher: ' })
  }
}

// ---- vortices: they move every Start of Turn, and hit what they pass over ----
// Effects that last while their caster lives: end them when the caster is gone.
export function endOrphans (game) {
  const keep = []
  for (const e of game.effects || []) {
    const c = game.units.find(x => x.id === e.casterId)
    if (e.until === 'casterGone' && e.kind !== 'vortex' && (!c || c.status.removed || isDead(c))) { e.revert?.(); if (e.say) say(game, '', e.say) } else keep.push(e)
  }
  game.effects = keep
}

export function moveVortices (game) {
  endOrphans(game)
  for (const v of effectsOn(game, 'vortex')) {
    const c = game.units.find(x => x.id === v.casterId)
    if (!c || c.status.removed || isDead(c) || !c.placed) { v.dead = true; say(game, '', `${v.name} fades: its caster is gone.`); continue }
    if (v.fixed) continue
    const roll = rollDice(game.rng, v.scatterDice)
    const d = roll.reduce((a, b) => a + b, 0)
    const from = v.at
    const sc = scatter(game, from, d)
    v.at = sc.at
    say(game, 'roll', `${v.name} moves: ${v.scatterDice === 1 ? 'D6' : '2D6'} = ${d}; ${sc.text}.`)
    if (v.at.x < 0 || v.at.y < 0 || v.at.x > 72 || v.at.y > 48) { v.dead = true; say(game, '', `${v.name} leaves the table.`); continue }
    for (const o of onTable(game)) {
      if (!v.hitsFriends && o.side === v.side) continue
      if (passesOver(o, from, v.at, v.r)) vortexHits(game, v, o, { moving: true })
    }
    // Magical Vortex: if it ends a move on top of a unit, it shifts the shortest distance, any way, until it
    // touches no model's base
    clearOfModels(game, v)
  }
  game.effects = (game.effects || []).filter(e => !e.dead)
}

const touchesModels = (game, at, r) => onTable(game).some(o => passesOver(o, at, at, r))
export function clearOfModels (game, v) {
  if (!touchesModels(game, v.at, v.r)) return
  const was = v.at
  for (let d = 0.25; d <= 24; d += 0.25) {
    for (let k = 0; k < 24; k++) {
      const p = { x: was.x + Math.cos(k / 24 * Math.PI * 2) * d, y: was.y + Math.sin(k / 24 * Math.PI * 2) * d }
      if (p.x < 0 || p.y < 0 || p.x > 72 || p.y > 48 || touchesModels(game, p, v.r)) continue
      v.at = p
      say(game, '', `${v.name} is moved ${d.toFixed(2)}" off the models it ended over.`)
      return
    }
  }
}
// After a charge, flee or pursuit move (straight, from `from`): did it cross a vortex? (as checkVortexPath)
export function sweptThroughVortices (game, u, from, track = null) {
  if (!from || u.status.removed || !effectsOn(game, 'vortex').length) return
  if (track?.length) return checkVortexPath(game, u, track.map(t => ({ ...t, files: u.files })))
  const d = dist(from.pos, u.pos)
  const n = Math.max(1, Math.ceil(d / 0.25))
  const path = Array.from({ length: n + 1 }, (_, i) => ({ pos: { x: from.pos.x + (u.pos.x - from.pos.x) * i / n, y: from.pos.y + (u.pos.y - from.pos.y) * i / n }, facing: i === 0 ? from.facing : u.facing, files: u.files }))
  checkVortexPath(game, u, path)
}
export function passesOver (o, a, b, r) {
  const cs = corners(o)
  if (pointInPoly(a, cs) || pointInPoly(b, cs)) return true
  for (let i = 0; i < 4; i++) if (segDist(a, b, cs[i], cs[(i + 1) % 4]) <= r) return true
  return false
}

export function vortexHits (game, v, o, { moving = false } = {}) {
  // Black Horror: each enemy unit the template passes over or touches as it moves — D6 Strength tests, a
  // Wound lost for each failed (a unit moving through it: dangerous terrain)
  // (Monsoon: touched by the moving template, the unit is drenched for the rest of the game)
  if (v.drenches) { if (moving && !o.status.drenched) { o.status.drenched = true; say(game, 'bad', `${o.name} is DRENCHED by the Monsoon: -1 To Hit when shooting for the rest of the game.`) } return dangerousTests(game, v, o) }
  if (v.strengthTests && moving) {
    const n = d6(game.rng)
    const S = (alive(o).find(m => m.role === 'rank') || alive(o)[0])?.profile.S ?? 3
    const dice = rollDice(game.rng, n)
    const lost = dice.filter(r => r === 6 || (r !== 1 && r > S)).length
    say(game, 'roll', `${v.name} engulfs ${o.name}: D6 = ${n} Strength tests against S${S} [${dice.join(' ')}] — ${lost} failed.`)
    if (lost) applyWounds(game, o, lost, v.name)
    return
  }
  if (v.dangerous) return dangerousTests(game, v, o)
  const n = v.hitsDice === 'D6+1' ? d6(game.rng) + 1 : v.hitsDice === '3D6' ? d6(game.rng) + d6(game.rng) + d6(game.rng) : d3(game.rng) + 3
  say(game, 'roll', `${v.name} sweeps over ${o.name}: ${v.hitsDice || 'D3+3'} = ${n} Strength ${v.S} hits.`)
  spellHits(game, o, n, v.S, v.AP, { flaming: v.flaming, label: `${v.name}: ` })
}

// After a unit moves: did its path cross a vortex? (snapshots of its positions along the move)
export function checkVortexPath (game, u, path) {
  for (const v of effectsOn(game, 'vortex')) {
    if (!v.hitsFriends && u.side === v.side) continue
    const hit = path.some(sn => {
      const cs = cornersAt(u, sn)
      return pointInPoly(v.at, cs) || cs.some((p, i) => segDist(p, cs[(i + 1) % 4], v.at, v.at) <= v.r)
    })
    if (hit) vortexHits(game, v, u)
  }
}
function cornersAt (u, sn) {
  const was = { pos: u.pos, facing: u.facing, files: u.files }
  Object.assign(u, sn)
  const cs = corners(u)
  Object.assign(u, was)
  return cs
}


// Dangerous Terrain: a Dangerous Terrain test (D6, a 1 loses a Wound)
// for each model that passes through — here every model of the unit that touched it.
function dangerousTests (game, v, o) {
  const n = o.models.filter(m => m.wounds > 0).length
  const dice = rollDice(game.rng, n)
  const lost = dice.filter(d => d === 1).length
  say(game, 'roll', `${o.name} crosses the ${v.name} (dangerous terrain): ${n} Dangerous Terrain tests [${dice.join(' ')}] — ${lost} Wound${lost === 1 ? '' : 's'} lost.`)
  if (lost) applyWounds(game, o, lost, 'dangerous terrain')
}

// Phantasmagoria: an enemy unit that ends a move within 12" tests for Panic.
export function phantasmagoriaCheck (game, u) {
  for (const v of effectsOn(game, 'vortex', e => e.aura === 'phantasmagoria' && e.side !== u.side)) {
    if (u.status.removed || u.status.fleeing || u.status.engaged || u.status.panicTested) continue
    const d = Math.min(...corners(u).map(p => dist(p, v.at))) - v.r
    if (d > 12) continue
    u.status.panicTested = true
    const from = { name: 'the Phantasmagoria', pos: v.at, facing: 0, models: [], base: { w: 0, d: 0 }, files: 1 }
    panicTest(game, u, { ...from, centreAt: v.at }, 'it ended its move within 12" of the Phantasmagoria')
  }
}
export function nearAura (game, aura, u, range) {
  return effectsOn(game, 'vortex', e => e.aura === aura && e.side !== u.side).some(v => Math.min(...corners(u).map(p => dist(p, v.at))) - v.r <= range)
}
