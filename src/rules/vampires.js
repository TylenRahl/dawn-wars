// The Bloodsworn Courts' own army rules (Necromantic Undead, the Invocation of the Risen, Raise Dead and the rest),
// as small functions and tables that the shared rules modules call at the right moment (combat, damage, Leadership,
// magic and others; each comment says where).

import { say } from './game.js'
import { hasRule, alive, isDead, ruleValue, fieldUnit } from './units.js'
import { newUnit } from './roster.js'
import { rollDice } from './dice.js'

const live = c => !c.status?.removed && !isDead(c)
// its own Leadership: the model's, or for a character in a chariot, the crew's (Split Profile Chariots)
const ownLd = u => Math.max(0, ...alive(u).map(m => m.profile.Ld ?? 0), ...(u.crew || []).map(c => c.profile?.Ld ?? 0)) || 7
const turnKey = game => `${game.round}:${game.active}`
const hostIn = (game, c) => game?.units?.find(h => (h.joined || []).includes(c)) || null
const tt = u => (u.troopType || []).join(' ')

// Necromantic Undead — Undead: Fear, Immune to Psychology, Unbreakable, Unstable (units.js
// rulesOf); no marching unless flying (movement.js); a character with it joins only units with it, and vice versa
// (joining.js)
export const UNDEAD_RULES = ['Fear', 'Immune to Psychology', 'Unbreakable', 'Unstable']
// (Kheshite Undead: the Sand Kings' the same, each kind joining only its own)
const undeadKind = u => ['Necromantic Undead', 'Kheshite Undead'].find(k => [...(u.special || [])].includes(k)) || null
export const isUndead = u => !!undeadKind(u)
export function undeadJoinProblem (c, host) {
  const a = undeadKind(c); const b = undeadKind(host)
  if (a && a !== b) return `${c.name} is ${a}: it may join only a unit that shares that rule`
  if (b && a !== b) return `${host.name} are ${b}: only a character with the same rule may join them`
  return null
}
// Dark Vitality — it (and its mount) marches as normal, unless it has joined a unit without it;
// the Death of a General does not apply to it
export const darkVitality = u => [...(u.special || [])].includes('Dark Vitality')
export function undeadMarchProblem (game, u) {
  if (!isUndead(u)) return null
  const all = [u, ...(u.joined || []).filter(live)]
  if (all.every(darkVitality)) return null
  return `${u.name} is Undead: it cannot march (Necromantic Undead)`
}

// Indomitable — Unstable wounds reduced by X (the highest in the unit, not cumulative);
// Banner of the Count / Wight Banner — friendly units in that Battle Standard Bearer's Command
// range reduce them by D3 (the higher of the two counts) (combat.js)
export function unstableReduction (game, u, distanceBetween, commandRange) {
  const ind = Math.max(0, ...[u, ...(u.joined || []).filter(live)].map(c => hasRule(c, 'Indomitable') ? Number(ruleValue(c, 'Indomitable')) || 1 : 0))
  const bsb = game.units.find(c => c.side === u.side && c.isBSB && c.placed && live(c) && (hasRule(c, 'Banner of the Count') || hasRule(c, 'Wight Banner')) && (c === u || (u.joined || []).includes(c) || distanceBetween(hostIn(game, c) || c, u) <= commandRange(c)))
  const d3 = bsb && ind < 3 ? Math.ceil(rollDice(game.rng, 1)[0] / 2) : 0
  const n = Math.max(ind, d3)
  return { n, why: n === 0 ? '' : n === d3 && d3 > ind ? `${bsb.name}'s banner, D3 = ${d3}` : `Indomitable (${ind})` }
}

// The Death of a General — the General removed as a casualty: friendly Necromantic Undead lose
// Regeneration; when that phase ends, and in every Start of Turn of theirs after it, each takes a Leadership test,
// losing a Wound for every point it failed by (damage.js removeUnit marks it; turn.js / strategy.js test)
// (The Hierophant: a Sand Kings army's the same when its Hierophant falls — tombkings.js marks it)
export function generalFalls (game, u) {
  if (!((u.isGeneral && u.army === 'bloodsworn-courts') || u.isHierophant)) return
  if (game.vcFallen?.[u.side]) return
  game.vcFallen = { ...(game.vcFallen || {}), [u.side]: { pending: true } }
  for (const x of game.units.filter(x => x.side === u.side && isUndead(x) && !darkVitality(x))) for (const r of [...x.special].filter(r => r.startsWith('Regeneration'))) x.special.delete(r)
  say(game, 'bad', `${u.name}, the ${u.isHierophant ? 'Hierophant' : 'General'}, is slain: the magical animus of the army dissipates. Its Undead lose their Regeneration and must test to hold together.`)
}
export function crumble (game, side, leadershipTest, applyWounds) {
  if (!game.vcFallen?.[side]) return
  game.vcFallen[side].pending = false
  for (const x of game.units.filter(x => x.side === side && x.placed && live(x) && isUndead(x) && !darkVitality(x))) {
    const t = leadershipTest(game, x, { label: `${x.name} — the Death of a General` })
    say(game, 'roll', t.text)
    if (!t.passed && t.total > t.need) applyWounds(game, x, t.total - t.need, 'the Death of a General')
  }
}
export const fallenPending = game => [0, 1].filter(s => game.vcFallen?.[s]?.pending)

// Wounds recovered by a unit of the Undead (Invocation of the Risen, the Newly Dead): wounded models first, then slain
// ones stand again; a unit with The Newly Dead may grow past its starting size (to its maximum: `max`, 0 = no limit),
// the new models copies of its rank and file. Returns the Wounds recovered.
export function recoverWounds (game, u, n, max = 0) {
  let left = n
  for (const m of alive(u)) { const w = Math.min(left, (m.startW ?? 1) - m.wounds); if (w > 0) { m.wounds += w; left -= w } }
  for (const m of u.models.filter(m => m.wounds <= 0 && m.role !== 'handler')) { if (left <= 0) break; const w = Math.min(left, m.startW ?? 1); m.wounds = w; left -= w }
  if (left > 0 && hasRule(u, 'The Newly Dead')) {
    const proto = u.models.find(m => m.role === 'rank') || u.models[0]
    while (left > 0 && (!max || u.models.length < max)) { const w = Math.min(left, proto.startW ?? 1); u.models.push({ ...proto, role: 'rank', profile: { ...proto.profile }, wounds: w, startW: proto.startW }); left -= w }
  }
  return n - left
}

// Invocation of the Risen — in the Command sub-phase of its turn, not engaged: a Leadership test on
// its own Leadership; passed, one friendly Necromantic Undead unit within 12" recovers Wounds by its troop type
// (ui/phases.js)
export const canInvoke = (game, u) => (hasRule(u, 'Invocation of the Risen') || hasRule(u, 'Arise!')) && live(u) && u.side === game.active && u.status.nehekTurn !== turnKey(game) && !u.status.engaged && !(hostIn(game, u)?.status.engaged) && !u.status.fleeing
export function nehekTargets (game, u, distanceBetween) {
  // (a unit on the table, not gone, with a model alive and a Wound to recover — or room to grow with The Newly Dead)
  return game.units.filter(x => x.side === u.side && x.placed && !x.status.removed && !isDead(x) && !x.status.joinedTo && isUndead(x) && distanceBetween(hostIn(game, u) || u, x) <= 12 &&
    (x.models.some(m => m.wounds < (m.startW ?? 1)) || hasRule(x, 'The Newly Dead')))
}
// Arise: a Grave Priest's the same, its table a little different (swarms with infantry; heavy
// cavalry with light cavalry and war beasts)
export function invokeNehek (game, u, t, level, maxOf) {
  const arise = hasRule(u, 'Arise!')
  u.status.nehekTurn = turnKey(game)
  const ld = ownLd(u)
  const d = rollDice(game.rng, 2)
  const passed = d[0] + d[1] === 2 || (d[0] + d[1] !== 12 && d[0] + d[1] <= ld)
  say(game, 'roll', `${u.name} ${arise ? 'calls the dead to ARISE' : 'intones the Invocation of the Risen'}: Leadership test ${d.join('+')} = ${d[0] + d[1]}, needs ${ld} or less — ${passed ? 'passed' : 'FAILED'}.`)
  if (!passed) return 0
  const kind = tt(t)
  const d3 = () => Math.ceil(rollDice(game.rng, 1)[0] / 2)
  const n = arise
    ? (/Regular Infantry|Heavy Infantry|Swarm/.test(kind) ? level + d3() : /Light Cavalry|Heavy Cavalry|War Beast/.test(kind) ? level + 1 : /Monstrous Infantry|Monstrous Cavalry|Light Chariot/.test(kind) ? level : 1)
    : (/Regular Infantry|Heavy Infantry/.test(kind) ? level + d3() : /Swarm|Light Cavalry|War Beast/.test(kind) ? level + 1 : /Monstrous Infantry|Heavy Cavalry|Monstrous Cavalry|Light Chariot/.test(kind) ? level : 1)
  const got = recoverWounds(game, t, n, maxOf(t))
  say(game, 'good', `${t.name} recovers ${got} Wound${got === 1 ? '' : 's'} (${n} for its troop type).`)
  return got
}

// Accursed Weapons — a hand weapon carried by it has Magical Attacks and AP -1 (damage.js)
export const accursed = u => hasRule(u, 'Accursed Weapons')
// Slavering Charge — +1 Strength in a turn it charged (combat.js)
export const slavering = (u, charged) => charged && hasRule(u, 'Slavering Charge')
// The Hunger — a Pursuit roll of a single D6 (combat.js); at the end of a Combat phase in which
// it inflicted unsaved wounds, a D6: 6, a lost Wound recovered (combat.js marks status.hungerFed)
export const hungry = u => [u, ...(u.joined || [])].some(c => live(c) && hasRule(c, 'The Hunger'))
export function hungerFeeds (game) {
  for (const u of game.units.filter(u => u.status.hungerFed === turnKey(game) && live(u))) {
    u.status.hungerFed = null
    const m = alive(u)[0]
    if (!m || m.wounds >= (m.startW ?? 1)) continue
    const r = rollDice(game.rng, 1)[0]
    if (r === 6) m.wounds += 1
    say(game, r === 6 ? 'good' : 'roll', `${u.name} feeds (The Hunger): D6 = ${r}${r === 6 ? ' — a Wound recovered' : ''}.`)
  }
}

// Infested — when it loses its last Wound, each unit touching it (friend or foe) takes D6 S2 AP -1
// hits (damage.js removeUnit)
export function infested (game, u, spellHits, distanceBetween) {
  if (!hasRule(u, 'Infested')) return
  // (the enemies it fights, and any friendly unit touching it — within 0.1")
  const touching = game.units.filter(o => o !== u && o.placed && live(o) && !u.engagedWith?.[o.id] && o.side === u.side && distanceBetween(o, u) <= 0.1)
  for (const o of [...Object.keys(u.engagedWith || {}).map(id => game.units.find(x => x.id === id)), ...touching]) {
    if (!o || !live(o)) continue
    const n = rollDice(game.rng, 1)[0]
    say(game, 'roll', `${u.name} bursts into a swarm of bats (Infested): ${n} Strength 2 hits, AP -1, on ${o.name}.`)
    spellHits(game, o, n, 2, -1, { nonMagical: true, label: 'Infested: ' })
  }
}

// Wailing Dirge — in its own Shooting phase, if it did not march: an enemy unit within 8"
// it can see (engaged ones too), or one it fights, takes a Leadership test at -2 (to 2); failed, a wound for each point
// it failed by, no armour or Regeneration save (specialShots.js)
export function wailingDirge (game, u, t, leadershipTest, spellHits) {
  u.status.dirgeTurn = turnKey(game)
  const r = leadershipTest(game, t, { mod: -2, label: `${t.name} — ${u.name}'s Wailing Dirge` })
  say(game, 'roll', r.text)
  if (r.passed) return 0
  const n = Math.max(1, r.total - r.need)
  return spellHits(game, t, n, 0, 0, { autoWound: true, noArmour: true, noRegen: true, label: `Wailing Dirge (${n} wound${n === 1 ? '' : 's'}): ` })
}
export const canDirge = (game, u) => hasRule(u, 'Wailing Dirge') && live(u) && u.side === game.active && !u.status.marched && u.status.dirgeTurn !== turnKey(game) && !u.status.fleeing

// Spectral Reapers — flying over an enemy unit not engaged in the Remaining Moves sub-phase: a S4
// hit, no Armour Roll, Flaming and Magical, for each model that moved over it (movement.js via dwarfs.js bombsAway)
export const spectralReapers = u => hasRule(u, 'Spectral Reapers')

// Raise Dead — a unit of Risen Zombies: M4 WS2 BS0 S3 T3 W1 I1 A1 Ld2, regular infantry on 25 x 25 mm
// bases, hand weapons; rules: Skirmishers, Regeneration (6+), Necromantic Undead, The Newly Dead; no charging the turn it
// rises (charge.js); not worth any Victory Points (it has no points cost: victory.js unitPoints)
let risenN = 0
export function risenZombies (game, caster, n) {
  const entry = {
    id: 'risen-zombies', name: 'Risen Zombies', category: 'core', points: 0, minimum: 1, maximum: 0, armyComposition: [], command: [],
    equipment: [{ name: 'Hand weapons', points: 0, active: true }], armor: [], options: [], mounts: [], magic: null, lores: [], builderSpecialRules: [],
    rulesPage: 'spell__raise-dead.md', profile: [{ Name: 'Risen Zombie', M: '4', WS: '2', BS: '0', S: '3', T: '3', W: '1', I: '1', A: '1', Ld: '2' }],
    troopType: ['Regular Infantry'], unitCategory: ['Infantry'], base: { model: [25, 25] }, equipmentText: 'Hand weapons',
    specialRules: ['Necromantic Undead', 'Regeneration (6+)', 'Skirmishers', 'The Newly Dead'].map(name => ({ name }))
  }
  const sel = { ...newUnit(entry), entryId: 'risen-zombies', key: 'risen' + (++risenN), count: n }
  // (The Death of a General: risen after the General fell, they have no Regeneration)
  if (game.vcFallen?.[caster.side]) entry.specialRules = entry.specialRules.filter(r => !r.name.startsWith('Regeneration'))
  const z = fieldUnit(caster.army, sel, caster.side, entry)
  z.placed = true
  z.status.cannotCharge = turnKey(game)
  z.status.moved = true
  return z // (the caller places it and adds it to the game)
}
