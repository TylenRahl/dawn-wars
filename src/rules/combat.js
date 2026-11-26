// The Combat phase: every combat fought, a round at a time, from who strikes when to the Break test and pursuit.
// Exports fightCombat, combatsToFight, the To Hit chart (COMBAT_TO_HIT, combatToHit), rankBonus, attackGroups,
// isDisrupted, inCombatOrder and giveGround; used by the battle screen (ui/phases.js), the combat pips (ui/pips.js), spells.js and
// leadership.js.
//
// Each combat in turn: 1 Choose & Fight, 2 Calculate Melee Outcome, 3 Break Test, 4 Follow Up & Pursuit.
// Units in base contact are engaged; each group of engaged units is one combat; the active player picks the
//   order, and all are fought.
// The fighting rank: a rank or file with a model in base contact is a
//   fighting rank; models in it within their Movement of the enemy fight.
// How many attacks: in base contact, the Attacks characteristic;
//   fighting but not in base contact, one attack.
// Press of Battle: regular and heavy infantry in combat order,
//   except in a turn they charged, have a fighting rank two ranks deep.
// Supporting attacks / Fight in Extra Rank: models
//   with Fight in Extra Rank in the rank directly behind the fighting rank make a supporting
//   attack; not to the flank or rear. Spears: not in a turn they charged (see the spear's own rule).
// Cavalry Support: a supporting cavalry model attacks with its rider only.
// Who strikes first: highest Initiative first.
// Charging units: chargers +1 Initiative per full inch moved, at most
//   +3 into the front, +4 into a flank or rear (maximum 10).
// Disordered Charges: no Initiative bonus.
// Simultaneous Combat: equal Initiative strikes together.
// We Cant All Fight: a model slain before its Initiative step does not
//   fight; models that stepped forward this phase cannot fight.
// Roll to Hit Combat: the To Hit chart (WS against WS; COMBAT_TO_HIT
//   below is the chart cell for cell, checked by rules.test.js); a natural 1 misses, a natural 6 hits.
// Roll to Wound Combat: the To Wound chart (damage.js toWoundNeed).
// Cavalry: rider and mount each fight with their own WS, S, I and A; enemies roll To Hit against the rider's WS,
//   and saves use the rider's armour.
// Split Profile War Machine: in combat, the crew's T and W.
// Parry: infantry with hand weapon and shield, +1 armour in
//   combat, to a best of 3+.
// Melee Outcome Score (table): unsaved wounds 1 each, Rank Bonus
//   +1/rank, Standard +1, Battle Standard +1, flank +1, rear +2, high ground +1, overkill,
//   Massed Infantry +1 if higher Unit Mass, other bonuses.
// Unsaved Wounds Inflicted: includes Stand & Shoot wounds this turn.
// Close Order: a Close Order unit in Combat Order with Unit Mass 10+ claims +1; Rank Bonus +1 per rank behind the
//   first with enough models.
// Disrupted units: engaged in flank or rear by Unit Mass 5+ (heavy
//   infantry: 10+, Steady in the Ranks) — no Rank Bonus.
// Massed Infantry: the side with the higher Unit Mass that
//   includes regular or heavy infantry claims +1.
// In a combat with several units a side counts only its highest Rank Bonus and one standard, and flank and rear
//   bonuses once per enemy unit.
// Break test: 2D6 + the difference; natural roll over Ld breaks;
//   modified over Ld falls back in good order; otherwise (or a double 1) gives ground.
// Falling back in good order turns into a break if the winner's Unit Mass is more than twice the loser's.
// Loser Gives Ground: 2" directly away, no change of facing.
// Follow up and pursuit: the pursuit move, catching fleeing units, follow up, restrain and reform, overrun,
//   still engaged.
// Drawn Combat: a draw stays locked.
// A friend flees nearby: when a Unit Mass 5+ unit breaks or falls back, friendly units within 6" test for Panic.
// Stubborn, Unbreakable, Frenzy, Furious Charge, Choppers,
//   Fear, Terror, First Charge, Regeneration, Armour Bane.

import { askCombatWeapons } from './weaponChoice.js'
import { onwardsToVictory } from './musicians.js'
import { musky, enduranceSixes, unmadeCharge, slimeTrail, wrathCharge, unmadeInstability, raptureSpeed } from './unmade.js'
import { cataphracts } from './shen.js'
import { stampede, backstabs, inStormOfAsh, blazingBody } from './chaosdwarfs.js'
import { impervious, obsidian } from './saurians.js'
import { verminousValour, wyrdstone, cloudOfFlies } from './gnawkin.js'
import { soulMarked, dryAsDust, khopesh, lightProtected } from './tombkings.js'
import { unstableReduction, hungry, slavering, accursed } from './vampires.js'
import { eternalHatred, murderous, ownExtraAttacks, goaded, dancedOn } from './darkelves.js'
import { nearWood, chooseDance, danceOf, wovenMist, guardians, treeWhack, murderOfSpites, befuddled, chooseBefuddled, netlings } from './woodelves.js'
import { elvenReflexes, martialProwess, moonsilverWeapons, blizzard, enfeebling, mightyConstitution, precisionStrikes, kingsGuard } from './highelves.js'
import { ogreImpactAP, numbed, insignificant } from './ogres.js'
import { primalFury, stonyStare, inPrimalFury, bestialCharge, bloodGreed, goringImpact, ghostsight, bestialFury, dtp, cornucopia } from './hornkin.js'
import { rampantMutation, mutationAP, enduranceFlies, raptureCalm, dominionOnWound, auraOfPain } from './dominion.js'
import { artilleryDie } from './dice.js'
import { resolute, stoicDefender, woundsOnFour, slayerMultiple, deathblows, fightsLikeCharacter } from './dwarfs.js'
import { addEffect } from './spells.js'
import { blessingWard } from './lyonne.js'
import { feintAndDodge, isPhalanx } from './renegade.js'
import { peasantsDuty, beguiled, wyrmSlain, loseBlessing, vowOf } from './lyonne.js'
import { randomMovementDice } from './randomMovement.js'
import { sweptThroughVortices } from './spells.js'
import { isLoneCharacter } from './shooting.js'
import { polysOverlap as polysOverlapC } from './geometry.js'
import { commandRange } from './leadership.js'
import { hasAssortedWeapons, ASSORTED } from './vehicles.js'
import { WEAPONS } from '../data/weapons.js'
import { motherlyLove } from './trolls.js'
import { say, onTable, sideName, solid } from './game.js'
import { rollDice, sumDice, d6, dN } from './dice.js'
import { add, sub, mul, dot, dirOf, rightOf, angleOf, len, dist } from './geometry.js'
import { alive, corners, centre, filesOf, ranksOf, modelCount, isDead, hasRule, ruleValue, rulesOf, distanceBetween, width, depth, lanceRows, modelSlots, gapOf } from './units.js'
import { meleeWeaponOf, meleeWeaponOfKit, meleeStrength, toWoundNeed, saveFor, applyWounds, applyMultipleDamage, removeUnit, itemSaveRerolls, hasCrewPlatform, champView, charmedWard } from './damage.js'
import { itemFlag, itemName, itemSum, extraAttacks, multipleDamage, bannersOf as bannersOfCR, EFFECTS as ITEM_EFFECTS, itemLeft, spendItem } from './items.js'
import { ITEMS } from '../data/magicItems.js'
import { troopType, unitMass, maxRankBonus } from './troops.js'
import { leadershipFor, leadershipTest, bsbNear, holyFervour } from './leadership.js'
import { fleeFrom, disengageAll, engage, destroy, greatestDanger, contactPlacement, reformToFace, swiftDie } from './charge.js'
import { panicTest } from './shooting.js'
import { isWarMachine } from './warMachines.js'
import { movementOf } from './movement.js'
import { joinedOf, syncJoined, hostOf, joinedPlaces, isCharacter } from './joining.js'
import { inAura, templateHits, spellHits } from './spells.js'
import { sweptThroughWhirlers } from './whirlers.js'
import { hates, orderOf, isOrderMaster, isElf } from './orders.js'
import { shareInDifficult, straddlingWall, frontRankOnHill, onImpassable } from './terrain.js'

// the To Hit chart, row = attacker's WS, column = target's WS (1..10)
export const COMBAT_TO_HIT = [
  null,
  [null, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5],
  [null, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5],
  [null, 2, 3, 4, 4, 4, 4, 5, 5, 5, 5],
  [null, 2, 3, 3, 4, 4, 4, 4, 4, 5, 5],
  [null, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4],
  [null, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4],
  [null, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4],
  [null, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
  [null, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
  [null, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4]
]
export function combatToHit (ws, targetWs) {
  if (!ws) return 7 // WS 0 always misses (Characteristics of Zero Combat)
  if (!targetWs) return 1
  return COMBAT_TO_HIT[Math.min(10, Math.max(1, ws))][Math.min(10, Math.max(1, targetWs))]
}

// ---- which combats there are ----
export function combatsToFight (game) {
  const seen = new Set()
  const list = []
  for (const u of onTable(game)) {
    if (seen.has(u.id) || !u.status.engaged || !Object.keys(u.engagedWith || {}).length) continue
    const comp = []
    const stack = [u]
    while (stack.length) {
      const x = stack.pop()
      if (seen.has(x.id)) continue
      seen.add(x.id)
      comp.push(x)
      for (const id of Object.keys(x.engagedWith || {})) {
        const o = game.units.find(y => y.id === id)
        if (o && !o.status.removed && !isDead(o) && !seen.has(o.id)) stack.push(o)
      }
    }
    if (comp.some(x => x.status.foughtThisPhase)) continue
    const a = comp.filter(x => x.side === game.active); const b = comp.filter(x => x.side !== game.active)
    if (!a.length || !b.length) continue
    list.push({ units: comp, label: `${a.map(x => x.name).join(' + ')} against ${b.map(x => x.name).join(' + ')}` })
  }
  return list
}

// ---- formation ----
const rankWidthOf = u => troopType(u).rankWidth || Infinity
// Phalanx: a Phalanx deeper than it is wide is in Combat Order while its ranks are wide enough
// for a rank bonus
export const inCombatOrder = u => u.formation === 'close' && (filesOf(u) >= ranksOf(u) || (isPhalanx(u) && filesOf(u) >= rankWidthOf(u)))
// Combat Order Open Order: Open Order in Combat Order also claims a Rank Bonus
const rankedFormation = u => u.formation === 'lance' || inCombatOrder(u) || ((u.formation === 'close' || u.formation === 'open') && filesOf(u) >= ranksOf(u))

export function isDisrupted (game, u) {
  if (u.status.disruptedUntilEndOfCombat) return true
  // Difficult terrain: a quarter or more of its models in difficult
  // terrain (Dispersed Ranks: not Open Order)
  if (u.formation !== 'open' && shareInDifficult(game, u) >= 0.25) return true
  if (u.status.engaged && straddlingWall(game, u)) return true
  const steady = troopType(u).name === 'Heavy Infantry'
  for (const [id, arc] of Object.entries(u.engagedWith || {})) {
    if (arc !== 'left' && arc !== 'right' && arc !== 'rear') continue
    const o = game.units.find(x => x.id === id)
    // Skirmishers and Disruption: Skirmishers do not cause Disruption
    if (!o || o.formation === 'skirmish') continue
    if (unitMass(o) >= (steady ? 10 : 5)) return true
  }
  return false
}

export function rankBonus (game, u) {
  if (!rankedFormation(u) || isDisrupted(game, u)) return 0
  const tt = troopType(u)
  if (!tt.rankWidth) return 0
  const n = modelCount(u); const f = filesOf(u)
  let ranks = 0
  // The Lance in Combat: +1 for each rank with enough models for its troop type
  if (u.formation === 'lance') ranks = lanceRows(n).filter(k => k >= tt.rankWidth).length
  else for (let r = 1; r < ranksOf(u); r++) if (Math.min(f, n - r * f) >= tt.rankWidth) ranks++
  // (Dance of Death: charged by Sisters of the Lash, -1 to its Maximum Rank Bonus this phase)
  const rb = Math.min(ranks, Math.max(0, maxRankBonus(u) - (dancedOn(game, u) ? 1 : 0)))
  // Griffon Standard: every rank after the first is worth +2
  return itemFlag(u, 'griffon') ? rb * 2 : rb
}

// ---- who fights whom ----
// The overlap, in inches, between the edge of `a` facing `b` and the edge of `b` facing `a`.
// The stretch of `a`'s front edge that `b` lies along, in inches from its front-left corner: { lo, hi }.
function frontSpan (a, b) {
  const cs = corners(a)
  const ax = sub(cs[1], cs[0]); const L = len(ax) || 1; const u = mul(ax, 1 / L)
  const pb = corners(b).map(p => dot(sub(p, cs[0]), u))
  return { lo: Math.max(0, Math.min(...pb)), hi: Math.min(L, Math.max(...pb)) }
}
// Whether the front-rank place `file` of `a` (modelSlots numbering, 0 at the front-left) lies along that stretch.
const placeTouches = (a, file, span) => {
  const step = a.base.w + gapOf(a)
  return Math.min(span.hi, file * step + a.base.w) - Math.max(span.lo, file * step) > 0.05
}
// Characters in Combat: a character with a unit is hit only by enemy models in base contact with it.
// One in a front-rank place (joining.js joinedPlaces) of a unit fought through its front can be aimed at only by an
// enemy along that place; one on the flank, or further back (it may move up through the ranks into the fighting rank,
// same page), is left to the player as before.
function characterReachable (game, b, c, attacker) {
  if (b.engagedWith?.[attacker.id] !== 'front') return true
  const place = joinedPlaces(b).front.find(h => h.c === c)
  if (!place) return true
  return placeTouches(b, place.file, frontSpan(b, attacker))
}

function frontOverlap (a, b, arcOnA) {
  const cs = corners(a)
  const edge = { front: [cs[0], cs[1]], right: [cs[1], cs[2]], rear: [cs[2], cs[3]], left: [cs[3], cs[0]] }[arcOnA]
  const ax = sub(edge[1], edge[0]); const L = len(ax); const u = mul(ax, 1 / L)
  const pb = corners(b).map(p => dot(sub(p, edge[0]), u))
  const lo = Math.max(0, Math.min(...pb)); const hi = Math.min(L, Math.max(...pb))
  return Math.max(0, hi - lo)
}

// The attack groups of unit `a` against enemy `b`. Each group: { label, n (models), attacks each,
// ws, s, ap, init, weapon rules, contact }
// Tree Whack: once per turn in the Combat phase, one of each model's Attacks is a Tree Whack
// (woodelves.js) — made at the model's Initiative, in place of one attack of its main group
export function attackGroups (game, a, b) {
  const groups = attackGroupsInner(game, a, b)
  // (once per turn: marked when it is planned, so a model fighting two enemy units whacks only one of them)
  if (!hasRule(a, 'Tree Whack') || (a.status.treeWhack || '').startsWith(`${game.round}:${game.active}:`)) return groups
  const i = groups.findIndex(g => !g.isMount && !g.stomp && !g.vomit && !g.giant && !g.motherly && !g.isChamp && g.attacks >= 1 && !/supporting|second rank|more in the fighting rank/.test(g.label))
  if (i < 0) return groups
  const g = groups[i]
  const out = [...groups]
  a.status.treeWhack = `${game.round}:${game.active}:${b.id}`
  out.splice(i, 1, ...(g.attacks > 1 ? [{ ...g, attacks: g.attacks - 1 }] : []), { treeWhack: true, label: 'Tree Whack', n: 1, attacks: 1, models: g.n, ws: g.ws, init: g.init, s: g.s, ap: 0, rules: [], weapon: 'Tree Whack' })
  return out
}
function attackGroupsInner (game, a, b) {
  const arc = a.engagedWith[b.id] // where b is, as a sees it: 'front' when a charged b
  // (Master Rune of Hesitation: a unit that charged its front does not count as having charged)
  const charged = !!a.status.charged && !a.status.hesitated
  const fileWidth = arc === 'front' || arc === 'rear' ? a.base.w : a.base.d
  const rankLen = arc === 'front' || arc === 'rear' ? filesOf(a) : ranksOf(a)
  let contact = Math.min(rankLen, Math.max(1, Math.ceil(frontOverlap(a, b, arc) / fileWidth - 0.05)))
  const live = alive(a)
  let fighting = Math.min(rankLen, live.length)
  // The Lance in Combat: each model along a Lance's outer edge counts as in its fighting rank and touching the
  // enemy's fighting rank
  if (a.formation === 'lance') { contact = fighting = modelSlots(a).filter(s => s.outside).length }
  // Positioning Characters: a joined character stands in the front rank, displacing
  // rank and file to the rear rank (joining.js joinedPlaces); it makes its own attacks (Characters in Combat,
  // fightCombat). So fighting through its front, the unit's own models in the fighting rank are fewer by the characters'
  // places, and those in base contact fewer by the characters' places that touch the enemy. `inFront` is how many of the
  // unit's own models stand in its front rank (the rest are further back, for Press of Battle and supporting attacks).
  let inFront = Math.min(filesOf(a), live.length)
  if (arc === 'front' && !isCharacter(a) && a.formation !== 'lance' && joinedOf(a).length) {
    const placed = joinedPlaces(a)
    const held = placed.front
    if (held.length) {
      const files = filesOf(a)
      const row = placed.row.length // the front rank, characters included
      inFront = Math.max(0, row - held.length)
      fighting = Math.min(fighting, inFront)
      // which front-rank places touch b, counted one way for the unit's models and the characters alike
      const span = frontSpan(a, b)
      const offset = (files - row) / 2
      let places = 0
      for (let i = 0; i < row; i++) if (placeTouches(a, offset + i, span)) places++
      const touching = held.filter(h => placeTouches(a, h.file, span)).length
      contact = Math.max(0, places - touching)
    }
  }
  // and the character itself, fighting from its place: in base contact only if that place lies along b (it is drawn
  // and counted there, not at its unit's middle). Not touching, it is still in the fighting rank and makes the one
  // attack of a model there (Characters in Combat: attacks by its Attacks and its proximity to the enemy)
  if (isCharacter(a) && a.status.joinedTo) {
    const host = game.units.find(x => x.id === a.status.joinedTo)
    const place = host && host.engagedWith?.[b.id] === 'front' ? joinedPlaces(host).front.find(h => h.c === a) : null
    if (place && !placeTouches(host, place.file, frontSpan(host, b))) contact = 0
  }
  const groups = []
  // Giant Attacks: a Giant does not attack normally; it makes one Giant Attack
  // (or a Pick Up And... attack) at its Initiative — resolved by giantAttack below
  if (hasRule(a, 'Giant Attacks')) {
    const g = { giant: true, label: 'Giant', n: 1, attacks: 1, ws: live[0]?.profile.WS ?? 3, init: live[0]?.profile.I ?? 1, s: live[0]?.profile.S ?? 6, ap: 0, rules: [], weapon: "Giant's club" }
    return stompGroup(a, g)
  }
  // Howdah: a behemoth with its crew (the Broodmaw Spider): the behemoth fights
  // with its own profile, the crew with theirs (Split Profile Chariots); its Stomp Attacks come last.
  // Venom Surge: one of its attacks each turn may be the Venom Surge (S, AP -2,
  // Multiple Damage (D6), Poisoned Attacks, Strike First) — its player is asked (a.status.venomSurge, set
  // in fightCombatInner)
  // Motherly Love: instead of attacking normally, a Motherly Love attack (trolls.js),
  // at its Initiative; its Stomp Attacks are made as usual
  if (a.status.motherlyLove === `${game.round}:${game.active}`) {
    const p = live[0]?.profile || {}
    return stompGroup(a, { motherly: true, label: `${a.name}, Motherly Love`, n: 1, attacks: 1, ws: p.WS ?? 3, init: p.I ?? 1, s: p.S ?? 6, ap: 0, rules: [], weapon: 'Motherly Love' })
  }
  if (hasRule(a, 'Howdah') && !/Chariot/.test((a.troopType || []).join(' '))) {
    const m = live[0]
    if (!m) return []
    const p = m.profile
    const iB = charged && !a.status.disordered ? Math.min(Math.floor(a.status.chargeDistance || 0), arc === 'front' ? 3 : 4) : 0
    const venom = a.status.venomSurge === `${game.round}:${game.active}` && /venom surge/i.test(a.equipmentText) ? 1 : 0
    const A = (p.A ?? 1) - venom
    if (A > 0) groups.push({ label: m.name, n: 1, attacks: A, ws: p.WS, init: Math.min(10, (p.I ?? 1) + iB), s: p.S ?? 5, ap: 0, bane: null, rules: [], weapon: (a.equipmentText.match(/^[^:]*:\s*([^(\n]+?)\s*\(counts as a hand weapon\)/m) || [, 'hand weapon'])[1] })
    if (venom) groups.push({ label: `${m.name}, Venom Surge`, n: 1, attacks: 1, ws: p.WS, init: 10, s: p.S ?? 5, ap: -2, bane: null, rules: ['Multiple Damage (D6)', 'Poisoned Attacks', 'Strike First'], weapon: 'Venom Surge' })
    const spears = /crew[^\n]*cavalry spear/i.test(a.equipmentText) && charged
    for (const c of a.crew || []) {
      // a character riding it joins the crew and fights with its own weapon (Split Profile Chariot Mount)
      if (c.character) {
        const cw = meleeWeaponOf(a, { charged })
        groups.push({ label: c.name, n: 1, attacks: (c.profile.A ?? 1) + (cw.rules || []).filter(r => r.startsWith('Extra Attacks')).length, ws: c.profile.WS, init: Math.min(10, (c.profile.I ?? 1) + iB), s: meleeStrength(cw, c.profile.S ?? 3, charged), ap: cw.ap ?? 0, bane: (cw.rules || []).find(r => r.startsWith('Armour Bane')), rules: cw.rules || [], weapon: cw.name, itemId: cw.magic ? cw.key.slice(6) : null })
        continue
      }
      groups.push({ label: `${c.count} ${c.name.replace(/\s*\(x\d+\)/, '')}`, n: c.count, attacks: c.profile.A ?? 1, ws: c.profile.WS, init: Math.min(10, (c.profile.I ?? 1) + iB), s: (c.profile.S ?? 3) + (spears ? 1 : 0), ap: spears ? -1 : 0, bane: null, rules: [], weapon: spears ? 'cavalry spears (charging)' : 'hand weapons' })
    }
    if (hasRule(a, 'Stomp Attacks')) groups.push(...stompGroup(a, null).filter(Boolean).map(g => ({ ...g, models: 1 })))
    return groups
  }
  // Split Profile Chariots: the crew and the beasts fight with their
  // own WS, S, I and A; impact hits are resolved before (see impactHits)
  if (/Chariot/.test((a.troopType || []).join(' '))) {
    const inC = Math.min(contact, live.length)
    const choppers = hasRule(a, 'Choppers') && charged
    const tusks = hasRule(a, 'Tusker Charge') && charged
    // (Razor Tusks: in a turn it charged, the beasts' AP improved by 1)
    const razor = hasRule(a, 'Razor Tusks') && charged ? 1 : 0
    const iB = charged && !a.status.disordered ? Math.min(Math.floor(a.status.chargeDistance || 0), arc === 'front' ? 3 : 4) : 0
    // the crew's weapons: cavalry spears are S+1 AP-1 in a turn it charged
    const spears = /cavalry spear/i.test(a.equipment + ' ' + a.equipmentText) && charged
    const furious = hasRule(a, 'Furious Charge') && charged && (a.status.chargeDistance || 0) >= 3 ? 1 : 0
    for (const c of a.crew || []) {
      // a character riding the chariot fights with its own weapon (Split Profile Chariot Mount)
      if (c.character) {
        const cw = meleeWeaponOf(a, { charged })
        groups.push({ label: c.name, n: inC, attacks: (c.profile.A ?? 1) + furious + (cw.rules || []).filter(r => r.startsWith('Extra Attacks')).length, ws: c.profile.WS, init: Math.min(10, (c.profile.I ?? 1) + iB), s: meleeStrength(cw, c.profile.S ?? 3, charged), ap: cw.ap ?? 0, bane: (cw.rules || []).find(r => r.startsWith('Armour Bane')), rules: cw.rules || [], weapon: cw.name, itemId: cw.magic ? cw.key.slice(6) : null, rerollWound1: choppers })
        continue
      }
      // Assorted weapons: three of a War Wagon's crew carry a ball & chain, a hooked
      // halberd and a man-catcher; each may use it or its hand weapon (its player chose: status.assortedUnique)
      if (hasAssortedWeapons(a) && a.status.assortedUnique === `${game.round}:${game.active}` && c.count >= 6) {
        for (const k of ASSORTED.combat) {
          const p = WEAPONS[k]
          const last = (p.rules || []).includes('Strike Last')
          groups.push({ label: `${c.name.replace(/\s*\(x\d+\)/, '')} with the ${p.name.toLowerCase()}`, n: inC, attacks: (c.profile.A ?? 1) + furious, ws: c.profile.WS, init: Math.min(10, (last ? 1 : (c.profile.I ?? 1)) + iB), s: meleeStrength(p, c.profile.S ?? 3, charged), ap: Number(String(p.AP).match(/-?\d+/)?.[0] || 0), bane: (p.rules || []).find(r => r.startsWith('Armour Bane')), rules: p.rules || [], weapon: p.name })
        }
        groups.push({ label: `${inC * (c.count - 3)} more ${c.name.replace(/\s*\(x\d+\)/, '')}`, n: inC * (c.count - 3), attacks: (c.profile.A ?? 1) + furious, ws: c.profile.WS, init: Math.min(10, (c.profile.I ?? 1) + iB), s: c.profile.S ?? 3, ap: 0, bane: null, rules: [], weapon: 'hand weapons' })
        continue
      }
      groups.push({ label: `${inC * c.count} ${c.name.replace(/\s*\(x\d+\)/, '')} from ${inC} chariot${inC === 1 ? '' : 's'}`, n: inC * c.count, attacks: (c.profile.A ?? 1) + furious, ws: c.profile.WS, init: Math.min(10, (c.profile.I ?? 1) + iB), s: (c.profile.S ?? 3) + (spears ? 1 : 0), ap: (choppers ? -1 : 0) + (spears ? -1 : 0), bane: null, rules: [], weapon: [spears && 'cavalry spears (charging)', choppers && 'choppers (charging)'].filter(Boolean).join(', ') || 'hand weapons', rerollWound1: choppers })
    }
    if (a.mount) groups.push({ isMount: true, label: `${inC * a.beasts} ${a.mount.name.replace(/\s*\(x\d+\)/, '')}`, n: inC * a.beasts, attacks: a.mount.profile.A ?? 1, ws: a.mount.profile.WS, init: Math.min(10, (a.mount.profile.I ?? 1) + iB), s: (a.mount.profile.S ?? 3) + (tusks ? 1 : 0), ap: (tusks ? -1 : 0) - razor, bane: null, rules: [], weapon: tusks ? 'tusks (Tusker Charge)' : 'claws, hooves and teeth' })
    // a chariot with Stomp Attacks (Iron Kettle, War Wagon) makes them last, at the chariot's Strength
    if (inC && hasRule(a, 'Stomp Attacks')) groups.push(...stompGroup(a, null).filter(Boolean).map(g => ({ ...g, models: inC })))
    return groups
  }
  const w = meleeWeaponOf(a, { charged })
  const champ = live.find(m => m.role === 'champion')
  const rank = live.find(m => m.role === 'rank') || live[0]
  const isMachine = isWarMachine(a)
  const crew = isMachine ? a.crew?.[0] : null
  const base = crew ? { ...crew.profile } : { ...rank.profile }
  // (dwarfs.js: Stoic Defenders, +1 Initiative and Attacks in a turn it was charged)
  // Pendant of Damnation: +1 Attacks for each Wound its bearer has lost
  const damned = itemFlag(a, 'damnation', { personal: true }) ? Math.max(0, (rank.startW || 1) - (rank.wounds || 0)) : 0
  if (damned && typeof base.A === 'number') base.A = Math.min(10, base.A + damned)
  if (stoicDefender(game, a)) { base.I = Math.min(10, (base.I ?? 1) + 1); if (typeof base.A === 'number') base.A = Math.min(10, base.A + 1) }
  const userS = base.S ?? 3
  // Numbing Chill: in base contact with it, -1 Weapon Skill and Initiative (to 1) (ogres.js)
  // Martial Prowess: +1 Weapon Skill in the first round of combat
  if (martialProwess(a) && (charged || b.status.charged)) base.WS = Math.min(10, (base.WS ?? 3) + 1)
  // Enfeebling Cold: -1 Strength in base contact with a Deepwyrm
  if (enfeebling(b)) base.S = Math.max(1, (base.S ?? 3) - 1)
  // A Bewilderment of Pucks: an enemy unit in base contact with its bearer -1 WS and I (to 1)
  if (befuddled(game, a, b)) { base.WS = Math.max(1, (base.WS ?? 3) - 1); base.I = Math.max(1, (base.I ?? 3) - 1) }
  // Helm of the Hunt: +1 Weapon Skill and Attacks in a turn its wearer charged
  const helmHunt = charged && itemFlag(a, 'helmHunt', { personal: true }) ? 1 : 0
  if (helmHunt) base.WS = Math.min(10, (base.WS ?? 3) + 1)
  // Mighty Constitution: Taeron +1 Strength in a turn he charged 3" or more
  if (mightyConstitution(a) && charged && (a.status.chargeDistance || 0) >= 3) base.S = Math.min(10, (base.S ?? 4) + 1)
  if (numbed(game, a, b)) { base.WS = Math.max(1, (base.WS ?? 3) - 1); base.I = Math.max(1, (base.I ?? 3) - 1) }
  // Rune of the True Beast: a monster within 6" of an enemy bearer -1 Weapon Skill
  if (/Monster|Monstrous Creature|Behemoth/i.test(a.category + ' ' + (a.troopType || []).join(' ')) && game.units.some(c => c.side !== a.side && c.placed && !c.status.removed && !isDead(c) && itemFlag(c, 'trueBeast', { personal: true }) && distanceBetween(hostOf(game, c) || c, a) <= 6)) base.WS = Math.max(1, (base.WS ?? 3) - 1)
  // the charge's Initiative bonus
  let iBonus = 0
  if (charged && !a.status.disordered) {
    const inches = Math.floor(a.status.chargeDistance || 0)
    iBonus = Math.min(inches, arc === 'front' ? 3 : 4)
  }
  const initOf = (I, rules = []) => {
    let i = I ?? 1
    // Enchanting Aura: an enemy of its bearer cannot Strike First, and strikes last instead
    // (Blizzard Aura: enemies in base contact with a Rimewing Phoenix Strike Last too)
    // (Soporific Musk: no Strike First against Fiends; the rest Strike Last — unmade.js)
    const charmed = [b, ...joinedOf(b)].some(x => itemFlag(x, 'enchanting', { personal: true })) || blizzard(b) || musky(b)
    const first = !charmed && (rules.includes('Strike First') || hasRule(a, 'Strike First'))
    const last = charmed || rules.includes('Strike Last') || hasRule(a, 'Strike Last')
    if (first && !last) i = 10
    if (last && !first) i = 1
    i += iBonus
    // Order of the Ember Heart: +1 Initiative in the first round of any combat (taken, as
    // elsewhere, as the turn a charge began it)
    if (orderOf(a) === 'ember-heart' && (charged || b.status.charged)) i += 1
    // Enhanced Reflexes: +2 Initiative fighting with a single hand weapon (an Ensorcelled one too)
    if (itemFlag(a, 'reflexes', { personal: true }) && /hand weapon/i.test(w.name || '') && !/additional/i.test(w.key || '') && !w.magic) i += 2
    // Mark of Rapture: +1 Initiative in the first round of any combat (the turn a charge began it)
    if (raptureCalm(a) && (charged || b.status.charged)) i += 1
    // Elven Reflexes: +1 Initiative in the first round (the turn a charge began it), not its mount
    if (elvenReflexes(a) && (charged || b.status.charged)) i += 1
    // thrusting spear: +1 Initiative against chargers in its front
    if (w.key === 'thrusting spear' && b.status.charged && arc === 'front') i += 1
    return Math.min(10, i)
  }
  // Extra Attacks (+X) from the weapon: a dice value is rolled each time the model fights
  // (magic items: Cackling Blade, Sword of Battle...; Extra Attacks)
  // rolled once a turn for the model and kept (attackGroups is asked again for each enemy and the duel)
  const turnKey = `${game.round}:${game.active}`
  const fresh = !(a.status.xa && a.status.xa.key === turnKey)
  // (Virtue of Knightly Temper: in a turn it charged, Extra Attacks (+D3))
  const temper = charged && itemFlag(a, 'knightlyTemper', { personal: true })
  if (fresh) a.status.xa = { key: turnKey, ...(a.status.extraAttacksLost ? { n: 0 } : extraAttacks([...(w.rules || []), ...(temper ? ['Extra Attacks (+D3)'] : [])], sides => dN(game.rng, sides))) }
  const xa = a.status.xa
  const extraA = xa.n
  if (fresh && xa.rolled != null) {
    say(game, 'roll', `${a.name}: ${w.name}, Extra Attacks (+${xa.dice}) = ${xa.rolled}.`)
    if (xa.rolled === 6 && w.key === 'magic:cackling-blade') { say(game, 'bad', `A natural 6 for the Cackling Blade: ${a.name} loses a Wound.`); applyWounds(game, a, 1, 'the Cackling Blade'); if (isDead(a) || a.status.removed) return [] }
    // The Black Maul: a natural 6 for its Extra Attacks, -1 Weapon Skill for the rest of the game (to 1)
    if (xa.rolled === 6 && w.key === 'magic:the-black-maul') { for (const m of a.models) m.profile = { ...m.profile, WS: Math.max(1, (m.profile.WS ?? 3) - 1) }; base.WS = Math.max(1, (base.WS ?? 3) - 1); say(game, 'bad', `A natural 6: the Black Maul's thirst costs ${a.name} a point of Weapon Skill.`) }
    if (xa.rolled === 6 && w.key === 'magic:battleaxe-of-the-last-big-ruck') { a.status.extraAttacksLostAfterPhase = true; say(game, 'bad', `A natural 6: the Battleaxe of the Last Big Ruck loses its Extra Attacks at the end of this Combat phase.`) }
  }
  // (Wilful Beast: a Frenzied mount's rider gains no +1 Attack)
  // (Blood Greed: +2 rather than +1 — hornkin.js)
  const frenzy = (bloodGreed(a) ? 2 : 1) * (hasRule(a, 'Frenzy') && !(a.status.wilful && !a.special.has('Frenzy') && !a.special.has('Mark of Wrath')) && (charged || a.status.followedUp) ? 1 : 0)
  const furious = hasRule(a, 'Furious Charge') && charged && (a.status.chargeDistance || 0) >= 3 ? 1 : 0
  // The Banner of Butchery: +1 Strength in a turn the unit charged
  const butcher = charged && itemFlag(a, 'chargeStrength') ? 1 : 0
  // Wolf hammer: +2 Strength rather than +1 in a turn the wielder charged 3" or more
  const wolf = w.key === 'wolf hammer' && charged && (a.status.chargeDistance || 0) >= 3 ? 1 : 0
  // Furnace Hammer: its Strength an Artillery dice, rolled before Torvik attacks (once a turn
  // here); on a Misfire he loses one Wound and does not attack this turn
  let furnace = null
  if (w.key === 'furnace hammer') {
    if (!(a.status.furnace && a.status.furnace.key === turnKey)) {
      const r = artilleryDie(game.rng)
      a.status.furnace = { key: turnKey, S: r === 'misfire' ? null : r }
      say(game, 'roll', `${a.name}'s Furnace Hammer: Artillery dice ${r === 'misfire' ? 'MISFIRE — he loses one Wound and does not attack this turn' : r + ` — Strength ${r}`}.`)
      if (r === 'misfire') applyWounds(game, a, 1, 'the Furnace Hammer')
    }
    if (a.status.furnace.S == null) return []
    furnace = a.status.furnace.S
  }
  // (Bestial Charge: +1 Strength in a turn it charged 3" or more — hornkin.js)
  // (Primeval Club: its Strength is the wielder's current Leadership)
  if (w.flags?.sIsLd) furnace = Math.min(10, base.Ld ?? 7)
  // (Slavering Charge: +1 Strength in a turn it charged — vampires.js)
  const S = furnace ?? (meleeStrength(w, userS, charged) + butcher + wolf + (bestialCharge(a, charged) ? 1 : 0) + (slavering(a, charged) ? 1 : 0) + (wrathCharge(a, charged) ? 1 : 0))
  // Totem of Wrath: in a turn it charged, AP improved by 1 and natural 1s To Wound re-rolled
  const wrath = charged && itemFlag(a, 'totemOfWrath')
  // (Rampant Mutation, Razor Talons: AP -2 for all its attacks this phase)
  // (Gouge Tusks: its weapons' AP improved by 1 in combat)
  // (Precision Strikes: Sea Guard joined by Seriel Vane, AP improved by 1)
  // (Dances of Lirrin, Whirling Death: AP improved by 2 this Combat phase)
  const ap = mutationAP(game, a) ?? ((w.ap ?? 0) - (wrath ? 1 : 0) - (itemFlag(a, 'gouge', { personal: true }) ? 1 : 0) - (precisionStrikes(a) ? 1 : 0) - (danceOf(game, a) === 'whirling' ? 2 : 0) - (itemFlag(a, 'ashvane') ? 1 : 0) - (accursed(a) && /^hand weapon/i.test(w.key || '') ? 1 : 0) - (khopesh(a, w) ? 1 : 0) - (wyrdstone(a, w) ? 1 : 0) - (obsidian(a, w) ? 1 : 0))
  const choppers = hasRule(a, 'Choppers') && charged
  // The Big Red Raggedy Flag: +1 Weapon Skill
  if (itemFlag(a, 'wsBonus')) base.WS = Math.min(10, (base.WS ?? 3) + 1)
  // Armour Bane from the weapon, or from the unit's rules (Razor Standard): the better one
  const banes = [(w.rules || []).find(r => r.startsWith('Armour Bane')), rulesOfBane(a)].filter(Boolean)
  const bane = banes.sort((x, y) => Number(y.match(/\d+/)?.[0] || 1) - Number(x.match(/\d+/)?.[0] || 1))[0]
  // (Flaming Attacks: not attacks made with a magic weapon)
  const flamingRules = hasRule(a, 'Flaming Attacks') && !w.magic && !(w.rules || []).includes('Flaming Attacks') ? ['Flaming Attacks'] : []
  // Prayers of Varg, Wrath of Winter: Multiple Damage (2)
  if (a.status.wrathOfWinter && !(w.rules || []).some(r => r.startsWith('Multiple Damage')) && !hasRule(a, 'Multiple Damage')) flamingRules.push('Multiple Damage (2)')
  // Guardians of the Wildwood: against a Fear or Terror causer, +1 Attacks and Multiple Damage (2)
  const guarding = guardians(a, b)
  // Accursed Weapons: a hand weapon with Magical Attacks (and AP -1, above)
  if ((accursed(a) && /^hand weapon/i.test(w.key || '') || wyrdstone(a, w)) && !(w.rules || []).includes('Magical Attacks') && !flamingRules.includes('Magical Attacks')) flamingRules.push('Magical Attacks') // (Wyrdstone Weapons too)
  if (guarding && !(w.rules || []).some(r => r.startsWith('Multiple Damage')) && !flamingRules.some(r => r.startsWith('Multiple Damage'))) flamingRules.push('Multiple Damage (2)')
  // (Razor Tusks: a Razorboar's own tusks, in a turn it charged)
  const common = { s: S, ap: ap - (choppers ? 1 : 0) - (hasRule(a, 'Razor Tusks') && charged && !a.mount && !/Chariot/.test((a.troopType || []).join(' ')) ? 1 : 0), bane, rules: [...(w.rules || []), ...flamingRules], weapon: w.name + (butcher ? ', +1 S (Banner of Butchery)' : '') + (wolf ? ', +2 S on the charge' : ''), itemId: w.magic && !w.rune ? w.key.slice(6) : null, wflags: w.rune ? w.flags : null, rerollWound1: choppers || !!wrath || !!(w.flags?.vorgash) || (itemFlag(a, 'firstRoundWound1') && (charged || b.status.charged)), wrath: !!wrath }
  // Random Attacks: an Attacks characteristic such as D6 is rolled each time
  // the model attacks (once a turn here, as Extra Attacks), separately for each model
  // Random Attacks: an Attacks characteristic such as D6 is rolled each time
  // the model attacks — separately for each model in base contact (once a turn here, as Extra Attacks)
  const randomA = typeof base.A === 'string' ? base.A : null
  // Chalky's Pig-Sticker: in a turn it charged, as many extra Attacks as the enemy unit has ranks
  const rankA = charged && w.flags?.rankAttacks ? ranksOf(b) : 0
  // (Dances of Lirrin, Storm of Blades: Extra Attacks (+1); Guardians of the Wildwood +1; Helm of the Hunt +1)
  const bonusA = extraA + frenzy + furious + rankA + (danceOf(game, a) === 'storm' ? 1 : 0) + (guarding ? 1 : 0) + helmHunt + ownExtraAttacks(game, a, sides => dN(game.rng, sides)) + goaded(game, a) + (a.status.taskmaster ? 1 : 0) + (a.status.furyOfTheBloodiedGod === `${game.round}:${game.active}` || hostOf(game, a)?.status.furyOfTheBloodiedGod === `${game.round}:${game.active}` ? 1 : 0)
  // Mace of Holtzbrand: used double-handed, one attack whatever its Attacks
  const A = w.oneAttack ? 1 : (randomA ? 0 : (base.A ?? 1)) + bonusA
  // war machine crew lose an attack per Wound the crew has lost
  const crewA = isMachine ? Math.max(0, A - ((a.status.crewWoundsLost) || 0)) : A
  // models in base contact: their Attacks; the rest of the fighting rank: one each
  const inContact = Math.min(contact, fighting)
  const champIn = champ && inContact > 0 ? 1 : 0
  // Chalice Monk: a Chalice Monk is a second champion (it fights as one)
  const monk = live.find(m => m.role === 'monk')
  const monkIn = monk && inContact > champIn ? 1 : 0
  const rankIn = inContact - champIn - monkIn
  if (rankIn > 0 && randomA) {
    if (!(a.status.ra && a.status.ra.key === turnKey && a.status.ra.rolls.length === rankIn)) {
      const rolls = Array.from({ length: rankIn }, () => rollSpec(game, randomA))
      a.status.ra = { key: turnKey, rolls }
      say(game, 'roll', `${a.name}: Random Attacks (${randomA}) = ${rolls.join(', ')}${rankIn > 1 ? ' (one roll for each model in base contact)' : ''}.`)
    }
    groups.push({ label: `${rankIn} ${rank.name}${rankIn === 1 ? '' : 's'} in base contact`, n: 1, attacks: a.status.ra.rolls.reduce((x, y) => x + y, 0) + bonusA * rankIn, ws: base.WS, init: initOf(base.I, w.rules), ...common })
  } else if (rankIn > 0 && a.motley) {
    // Motley Crew: models of different kinds or weapons in the fighting rank roll
    // their own batches of dice, in their own Initiative order (the first models of the unit are its front)
    const front = live.filter(m => m.role === 'rank').slice(0, rankIn)
    const kinds = new Map()
    for (const m of front) { const k = `${m.name}|${m.kit || ''}`; if (!kinds.has(k)) kinds.set(k, []); kinds.get(k).push(m) }
    for (const ms of kinds.values()) {
      const p = ms[0].profile
      const kw = meleeWeaponOfKit(a, ms[0].kit, { charged })
      // the kit's own Extra Attacks (additional hand weapons: +1), not the unit weapon's
      const kA = (typeof p.A === 'number' ? p.A : 1) + bonusA - extraA + (ms[0].kit ? extraAttacks(kw.rules, sides => dN(game.rng, sides)).n || 0 : 0)
      // a model's own rules (a Beast Pack's beasts, beastPack.js): Furious Charge +1 Attack after a charge of 3" or more,
      // Razor Tusks AP improved by 1 in a turn it charged, Armour Bane and Cleaving Blow on its own attacks
      const own = ms[0].rules || []
      const ownFurious = own.includes('Furious Charge') && charged && (a.status.chargeDistance || 0) >= 3 ? 1 : 0
      const ownRazor = own.includes('Razor Tusks') && charged ? 1 : 0
      groups.push({ label: `${ms.length} ${ms[0].name}${ms.length === 1 ? '' : 's'}${ms[0].kit ? ` with ${ms[0].kit.toLowerCase()}` : ''} in base contact`, n: ms.length, attacks: kA + ownFurious, ws: p.WS, init: initOf(p.I, kw.rules), ...common, s: meleeStrength(kw, p.S ?? userS, charged) + butcher, ap: (kw.ap ?? 0) - (wrath ? 1 : 0) - (choppers ? 1 : 0) - ownRazor, bane: (kw.rules || []).find(r => r.startsWith('Armour Bane')) || own.find(r => r.startsWith('Armour Bane')) || common.bane, rules: [...(kw.rules || []), ...flamingRules, ...own.filter(r => r === 'Cleaving Blow')], weapon: kw.name })
    }
  } else if (rankIn > 0) groups.push({ label: `${rankIn} ${rank.name}${rankIn === 1 ? '' : 's'} in base contact`, n: rankIn, attacks: isMachine ? crewA : A, ws: base.WS, init: initOf(base.I, w.rules), ...common })
  if (champIn) {
    const cA = (typeof champ.profile.A === 'number' ? champ.profile.A : rollSpec(game, champ.profile.A ?? 1)) + bonusA
    // the champion's own magic weapon, where it has one (damage.js champView)
    const cw = a.champItems?.length ? meleeWeaponOf(champView(a), { charged }) : null
    const own = cw?.magic ? { s: meleeStrength(cw, champ.profile.S ?? userS, charged) + butcher, ap: cw.ap ?? 0, bane: (cw.rules || []).find(r => r.startsWith('Armour Bane')) || common.bane, rules: [...(cw.rules || []), ...flamingRules.filter(r => r !== 'Flaming Attacks')], weapon: cw.name, itemId: cw.key.slice(6) } : null
    groups.push({ isChamp: true, label: champ.name, n: 1, attacks: cA + (own ? extraAttacks(cw.rules, sides => dN(game.rng, sides)).n || 0 : 0), ws: Math.min(10, (champ.profile.WS ?? 3) + (itemFlag(a, 'wsBonus') ? 1 : 0)), init: initOf(champ.profile.I, (own || w).rules), ...common, s: meleeStrength(w, champ.profile.S ?? userS, charged) + butcher + wolf, ...(own || {}) })
  }
  if (monkIn) groups.push({ label: monk.name, n: 1, attacks: (typeof monk.profile.A === 'number' ? monk.profile.A : 1) + bonusA, ws: monk.profile.WS ?? base.WS, init: initOf(monk.profile.I, w.rules), ...common, s: meleeStrength(w, monk.profile.S ?? userS, charged) + butcher })
  const notInContact = fighting - inContact
  if (notInContact > 0) groups.push({ label: `${notInContact} more in the fighting rank, one attack each`, n: notInContact, attacks: 1, ws: base.WS, init: initOf(base.I, w.rules), ...common })
  // mounts in base contact fight with their own profile (split profile, cavalry)
  if (a.mount && inContact) {
    const mp = a.mount.profile
    // Tusker Charge: a charging War Boar's tusks are S+1, AP -1
    const tusker = hasRule(a, 'Tusker Charge') && charged
    const razorM = hasRule(a, 'Razor Tusks') && charged ? 1 : 0 // (Razor Tusks)
    // Wicked claws: S, AP -2 (the Clawsteed)
    const claws = a.mount.claws
    groups.push({ isMount: true, label: `${inContact} ${a.mount.name}${inContact === 1 ? '' : 's'}`, n: inContact, attacks: Math.min(10, (mp.A ?? 1) + goaded(game, a, true)), ws: mp.WS, init: Math.min(10, (mp.I ?? 1) + iBonus), s: (mp.S ?? 3) + (tusker ? 1 : 0), ap: (claws ? -2 : tusker ? -1 : 0) - razorM, bane: null, rules: [], weapon: claws ? 'wicked claws' : tusker ? 'tusks (Tusker Charge)' : 'hooves and teeth' })
  }
  // Press of Battle: the second rank is part of the fighting rank (not in a turn it charged)
  const tt = troopType(a).name
  const press = (tt === 'Regular Infantry' || tt === 'Heavy Infantry') && inCombatOrder(a) && !charged && arc === 'front'
  const behind = Math.max(0, Math.min(filesOf(a), live.length - inFront))
  let usedRanks = 1
  if (press && behind > 0) {
    groups.push({ label: `${behind} in the second rank (Press of Battle), one attack each`, n: behind, attacks: 1, ws: base.WS, init: initOf(base.I, w.rules), ...common })
    usedRanks = 2
  }
  // supporting attacks: Fight in Extra Rank, the rank directly behind the fighting rank, front only
  const fier = (w.rules || []).includes('Fight In Extra Rank') || (w.rules || []).includes('Fight in Extra Rank') || hasRule(a, 'Fight in Extra Rank')
  const spearCharging = (w.key === 'thrusting spear' || w.key === 'cavalry spear') && charged
  if (fier && !spearCharging && arc === 'front') {
    const n = Math.max(0, Math.min(filesOf(a), live.length - inFront - (usedRanks - 1) * filesOf(a)))
    if (n) groups.push({ label: `${n} supporting attack${n === 1 ? '' : 's'} (Fight in Extra Rank)`, n, attacks: 1, ws: base.WS, init: initOf(base.I, w.rules), ...common })
  }
  // Stomp Attacks: a model in base contact makes its Stomp Attacks last,
  // after Initiative 1 (Split Profile Ridden Monster: with the mount's Strength)
  if (inContact && hasRule(a, 'Stomp Attacks')) groups.push(...stompGroup(a, null).filter(Boolean).map(g => ({ ...g, models: inContact })))
  // Troll vomit: each model in base contact makes one more attack, last of all
  // (after Stomp Attacks), hitting automatically: S3, AP -2
  if (inContact && /troll vomit/i.test([a.equipment, a.equipmentText, ...(a.options || [])].join(' '))) groups.push({ vomit: true, label: 'Troll Vomit', n: 1, attacks: 1, models: inContact, init: -1, ws: 0, s: 3, ap: -2, rules: [], weapon: 'Troll Vomit' })
  // Bloodskull Pendant: instead of attacking, a S8 AP -1 Killing Blow hit on every enemy model in
  // base contact (always used here; the Killing Blow of these hits is not in the game yet)
  if (itemFlag(a, 'bloodskull', { personal: true })) {
    const n = Math.max(1, Math.min(alive(b).length, Math.ceil(frontOverlap(a, b, arc) / (b.base.w || 1) - 0.05)))
    return [{ vomit: true, bloodskull: true, label: 'Bloodskull Pendant', n: 1, attacks: 1, models: n, init: groups[0]?.init ?? 1, ws: 0, s: 8, ap: -1, rules: ['Killing Blow'], weapon: 'Bloodskull Pendant' }]
  }
  // Monster Handlers: each handler adds its attacks to the monster's (with hand weapons)
  for (const h of a.handlers || []) if (h.count > 0 && (h.profile.A ?? 0) > 0) groups.push({ label: `${h.name} (${h.count} handler${h.count === 1 ? '' : 's'})`, n: h.count, attacks: h.profile.A, ws: h.profile.WS, init: h.profile.I ?? 1, s: h.profile.S ?? 3, ap: 0, bane: null, rules: [], weapon: 'hand weapon', isMount: true })
  return groups
}

// The named effects of the magic weapon a group fights with (never another weapon the bearer carries)
// (a Dwarf's runic weapon carries its own flags: runes.js)
const weaponFlags = g => (g.isMount ? null : g.wflags || (g.itemId ? ITEM_EFFECTS[g.itemId]?.flags : null)) || {}
// a unit made up entirely of Nippers of any kind (chariots and war machines crewed by Nippers), not
// joined by a Rukka character (Ignore Nipper Panic)
export const isNipperUnit = u => /nipper|hobgoblin/i.test([u.name, ...(u.crew || []).map(c => c.name)].join(' ')) && !/gobbler/i.test(u.name) && !/\brukka\b/i.test(u.name.replace(/nipper|hobgoblin/ig, '')) && !joinedOf(u).some(c => /\brukka\b/i.test(c.name) && !/nipper|hobgoblin/i.test(c.name))
const rulesOfBane = a => hasRule(a, 'Armour Bane') ? `Armour Bane (${ruleValue(a, 'Armour Bane') || 1})` : null

// ---- fighting a combat ----
export async function fightCombat (game, combat, ask) {
  try { return await fightCombatInner(game, combat, ask) } finally { syncJoined(game) }
}
// Stomp Attacks: made last, after Initiative 1; automatic hits at the model's
// unmodified Strength; Crushing Tread: a behemoth's are AP -2, and not
// against monsters
function stompGroup (a, first) {
  const st = rulesOf(a).find(r => r.startsWith('Stomp Attacks'))
  // (Split Profile Chariots: a chariot's Stomp Attacks use the chariot's Strength;
  // Grinding Wheels AP -2, Crushing Weight AP -1)
  const chariot = /Chariot/.test((a.troopType || []).join(' '))
  const S = chariot ? alive(a)[0]?.profile.S : (a.mount?.profile.S ?? alive(a)[0]?.profile.S)
  const ap = hasRule(a, 'Grinding Wheels') ? -2 : hasRule(a, 'Crushing Weight') ? -1 : /Behemoth/.test((a.troopType || []).join(' ')) ? -2 : 0
  return st ? [first, { stomp: true, grinding: hasRule(a, 'Grinding Wheels'), spec: (st.match(/\(([^)]+)\)/) || [])[1] || '1', label: 'Stomp Attacks', n: 1, attacks: 1, init: 0, ws: 0, s: S ?? 5, ap, rules: [], weapon: 'stomping' }].filter(Boolean) : [first]
}

async function fightCombatInner (game, combat, ask) {
  const units = combat.units.filter(u => !u.status.removed && !isDead(u))
  for (const u of units) u.status.foughtThisPhase = true
  const sides = [0, 1].map(s => units.filter(u => u.side === s))
  say(game, 'h', `COMBAT: ${combat.label}.`)
  // Rampant Mutation: the Forsaken's mutation for this phase (dominion.js)
  for (const u of units) rampantMutation(game, u)
  for (const u of units) auraOfPain(game, u, units, impactResolveNoArmour)
  // the Hornkin: Primal Fury, a Cockatrice's Stony Stare (hornkin.js)
  for (const u of units) primalFury(game, u)
  for (const u of units) stonyStare(game, u, units, spellHits)
  for (const u of units) cornucopia(game, u, units, applyWounds)
  // the Lornefolk: a Dance of Lirrin for this phase; a Cackle of Sprites (woodelves.js)
  for (const u of units) await chooseDance(game, u, ask)
  for (const u of units) await murderOfSpites(game, u, units, spellHits, ask)
  for (const u of units) await chooseBefuddled(game, u, units, ask)
  // Blazing Body: the Kindled's burning flesh at the start of the Combat phase (chaosdwarfs.js)
  for (const u of units) blazingBody(game, u, units, spellHits)
  // Assorted weapons: the War Wagon's crew use their unique weapons or their hand weapons
  for (const u of units.filter(u => hasAssortedWeapons(u))) {
    const key = `${game.round}:${game.active}`
    if (u.status.assortedAsked === key) continue
    u.status.assortedAsked = key
    const yes = ask ? await ask(`${u.name}: its crew fight with their unique weapons (ball & chain, hooked halberd, man-catcher) or their hand weapons?`, [['Unique weapons', true], ['Hand weapons', false]]) : true
    u.status.assortedUnique = yes ? key : null
  }
  // Motherly Love: its player chooses before it attacks (asked when the combat is fought)
  for (const u of units.filter(u => hasRule(u, 'Motherly Love'))) {
    const key = `${game.round}:${game.active}`
    if (u.status.motherlyAsked === key) continue
    u.status.motherlyAsked = key
    const foes = units.filter(o => o.side !== u.side && u.engagedWith?.[o.id])
    const yes = ask && foes.length ? await ask(`${u.name}: a Motherly Love attack this turn instead of attacking normally (D6: Smother, Mother or Mither)?`, [['Motherly Love', true], ['Attack normally', false]]) : false
    u.status.motherlyLove = yes ? key : null
    // (she picks one of the enemy units she is fighting)
    u.status.motherlyTarget = yes ? (foes.length === 1 ? foes[0].id : (await ask(`${u.name}: Motherly Love on which enemy unit?`, foes.map(o => [o.name, o]))).id) : null
  }
  // Venom Surge: once a turn, one of the model's attacks may be made with it
  for (const u of units.filter(u => hasRule(u, 'Howdah') && /venom surge/i.test(u.equipmentText || ''))) {
    const key = `${game.round}:${game.active}`
    if (u.status.venomAsked === key) continue
    u.status.venomAsked = key
    const yes = ask ? await ask(`${u.name}: make one of its attacks this turn with its Venom Surge (S${alive(u)[0]?.profile.S}, AP -2, Multiple Damage (D6), Poisoned, Strike First)?`, [['Venom Surge', true], ['All with its fangs', false]]) : false
    u.status.venomSurge = yes ? key : null
  }
  // Shield of the Mere: a Handmaiden with a unit of Unit Mass 10+ that has a Chivalrous Vow
  // may retire to its rear: she neither fights nor is attacked, and still casts and lends her rules
  for (const h of units) {
    for (const c of joinedOf(h).filter(c => hasRule(c, 'Shield of the Mere') || verminousValour(c))) {
      c.status.ladyRetired = null
      // (Verminous Valour: a Gnawkin leader with a unit of Unit Mass 10+ may do the same — gnawkin.js)
      if (verminousValour(c)) { if (ask && unitMass(h) >= 10 && await ask(`${c.name}: retire to the rear of ${h.name} (Verminous Valour) — no attacks, and none at it?`, [['Retire', true], ['Fight', false]])) { c.status.ladyRetired = `${game.round}:${game.active}`; say(game, '', `${c.name} scurries to the rear of ${h.name}.`) } continue }
      if (!ask || unitMass(h) < 10 || !vowOf(h)) continue
      if (await ask(`${c.name}: retire to the rear of ${h.name} (Shield of the Mere) — no attacks, and none at her?`, [['Retire', true], ['Fight', false]])) { c.status.ladyRetired = `${game.round}:${game.active}`; say(game, '', `${c.name} retires behind the knights of ${h.name}.`) }
    }
  }
  // Paymaster's Coin, Ring of Fortune: single use — failed rolls To Hit (To Wound) re-rolled in
  // the Combat phase; its player says in which combat (asked when it is fought)
  for (const u of new Set([...units, ...units.flatMap(joinedOf)])) {
    u.status.coinNow = null
    // (Hernath's Favour: single use, failed rolls To Hit and To Wound in the Combat phase)
    for (const id of ['paymasters-coin', 'ring-of-fortune', 'orions-favour', 'vermilion-quills'].filter(id => (u.items || []).includes(id) && itemLeft(u, id) > 0)) {
      const yes = ask ? await ask(`${u.name}: use its ${itemName(id)} in this combat (single use: re-roll failed rolls To ${id === 'paymasters-coin' ? 'Hit' : id === 'orions-favour' || id === 'vermilion-quills' ? 'Hit and To Wound' : 'Wound'})?`, [['Use it now', true], ['Keep it', false]]) : false
      if (yes) { spendItem(u, id); const k = ITEM_EFFECTS[id].flags.coin; u.status.coinNow = { ...(u.status.coinNow || {}), ...(k === 'both' ? { hit: itemName(id), wound: itemName(id) } : { [k]: itemName(id) }) }; say(game, '', `${u.name} uses its ${itemName(id)}.`) }
    }
  }
  // Clouter's One-Hit Wonder: once a game, in the first round of a combat (a turn a charge began it)
  for (const u of new Set([...units, ...units.flatMap(joinedOf)])) {
    u.status.clouterNow = false
    if (!(u.items || []).includes('clouters-one-hit-wonder') || itemLeft(u, 'clouters-one-hit-wonder') <= 0) continue
    const host = hostOf(game, u) || u
    if (!units.some(x => x.status.charged && (x === host || host.engagedWith?.[x.id] || x.engagedWith?.[host.id]))) continue
    const yes = ask ? await ask(`${u.name}: strike with Clouter's One-Hit Wonder now (S10, AP -3, Strike First — once a game)?`, [['Use it now', true], ['Keep it', false]]) : false
    if (yes) { u.status.clouterNow = true; spendItem(u, 'clouters-one-hit-wonder'); u.kit = null; say(game, 'h', `${u.name} swings Clouter's One-Hit Wonder!`) }
  }
  // The Nut Cracker: a weapon of two profiles — its player chooses which, when its combat is chosen
  for (const u of new Set([...units, ...units.flatMap(joinedOf)])) {
    for (const id of (u.items || []).filter(id => ITEM_EFFECTS[id]?.flags?.chooseProfile)) {
      const profs = ITEMS[id]?.profiles || []
      if (profs.length < 2) continue
      const names = (ITEMS[id].text.match(/^### .+$/gm) || []).map(x => x.slice(4)).concat(ITEMS[id].text.match(/^[A-Z][\w-]+:$/gm) || []).map(x => x.replace(/:$/, ''))
      const label = (p, i) => `${names[i] || 'Profile ' + (i + 1)}: S ${p.S}, AP ${p.AP}${p.rules.length ? ', ' + p.rules.join(', ') : ''}`
      const pick = ask ? await ask(`${u.name}: which profile of ${ITEMS[id].name} for this combat?`, profs.map((p, i) => [label(p, i), i])) : 0
      u.status.profileChoice = { ...(u.status.profileChoice || {}), [id]: pick || 0 }
      u.kit = null
      say(game, '', `${u.name} fights with ${ITEMS[id].name} — ${label(profs[pick || 0], pick || 0)}.`)
    }
  }
  // More Than One Combat Weapon: Step 1.1 - a unit (and each character, separately)
  // with two or more combat weapons says which it fights with; asked once a turn (rules/weaponChoice.js)
  for (const u of new Set([...units, ...units.flatMap(joinedOf)])) await askCombatWeapons(game, u, ask, say)
  const startUS = {}
  const wounds = [0, 0] // wounds caused BY side
  const overkill = [0, 0]
  for (const s of [0, 1]) wounds[s] = sides[1 - s].reduce((a, u) => a + (u.status.standShootWounds || 0), 0)
  if (wounds[0] || wounds[1]) say(game, '', `Stand & Shoot wounds this turn count: ${game.sides[0].name} ${wounds[0]}, ${game.sides[1].name} ${wounds[1]}.`)

  // Fear: engaged with a Fear-causing enemy of higher Unit Mass
  const afraid = new Set()
  for (const u of units) {
    if (hasRule(u, 'Fear') || hasRule(u, 'Terror') || hasRule(u, 'Immune to Psychology') || hasRule(u, 'Frenzy') || u.status.fearTestedCombat === game.round + ':' + game.active) continue
    // Fear of Elves: a model with this rule fears every kind of Elf
    const scary = units.filter(o => o.side !== u.side && u.engagedWith?.[o.id] && (hasRule(o, 'Fear') || hasRule(o, 'Terror') || (isElf(o) && hasRule(u, 'Fear of Elves'))) && unitMass(o) > unitMass(u))
    if (!scary.length) continue
    u.status.fearTestedCombat = game.round + ':' + game.active
    if (holyFervour(game, u)) { say(game, '', `${u.name} passes its Fear test: Holy Fervour (within 6" of the War Altar).`); continue }
    const t = leadershipTest(game, u, { label: `${u.name} — Fear test (engaged with ${scary.map(o => o.name).join(', ')})`, kind: 'fear' })
    say(game, 'roll', t.text)
    if (!t.passed) for (const o of scary) afraid.add(u.id + '>' + o.id)
  }

  // everyone's attack groups, by Initiative — characters with a unit fight from its front rank
  // (Characters in Combat); enemy attacks go to the unit's rank and file
  syncJoined(game)
  // Impact Hits: a charger that covered 3" or more and is in base contact
  // hits the charged unit automatically at its unmodified Strength, before challenges are issued;
  // heavy chariots' impact hits are AP -2 (Scythed Wheels)
  for (const a of units) {
    const ih = [...a.special].find(r => r.startsWith('Impact Hits'))
    if (!ih || !a.status.charged || (a.status.chargeDistance || 0) < 3 || a.status.impactDone) continue
    a.status.impactDone = true
    const spec = (ih.match(/\(([^)]+)\)/) || [])[1] || '1'
    const target = units.find(x => a.engagedWith?.[x.id])
    if (!target) continue
    // a chariot's Strength (its first row); a cavalry model's MOUNT's Strength (Split Profile Cavalry)
    const chariot = /Chariot/.test((a.troopType || []).join(' '))
    const S = (!chariot && a.mount ? a.mount.profile.S : alive(a)[0]?.profile.S) ?? 4
    // (Spiked Ball and Chains: a Wrecker Gobbler's Impact Hits are AP -3)
    // (Ogre Charge: the model's own Impact Hits improve their AP by its unit's Rank Bonus)
    // (Nutter's Lid: its Impact Hit is AP -2)
    // (Stampede: Bull Centaurs' Impact Hits AP -2 — chaosdwarfs.js)
    const AP = (hasRule(a, 'Spiked Ball & Chains') ? -3 : stampede(a) || unmadeCharge(a) ? -2 : itemFlag(a, 'headbutt', { personal: true }) ? -2 : /Heavy Chariot/.test((a.troopType || []).join(' ')) ? -2 : itemFlag(a, 'crownAntlers', { personal: true }) ? -2 : goringImpact(a) ? -1 : ogreImpactAP(a)) - (hasRule(a, 'Ogre Charge') ? rankBonus(game, hostOf(game, a) || a) : 0)
    // only the models in base contact make them
    const arcA = a.engagedWith[target.id]
    const fw = arcA === 'front' || arcA === 'rear' ? a.base.w : a.base.d
    const inContact = Math.min(alive(a).length, Math.max(1, Math.ceil(frontOverlap(a, target, arcA) / fw - 0.05)))
    let n = 0; const parts = []
    for (let i = 0; i < inContact; i++) { const v = rollSpec(game, spec); n += v; parts.push(v) }
    say(game, 'roll', `${a.name}: Impact Hits (${spec}) = ${parts.join(' + ')} = ${n} Strength ${S}${AP ? ', AP ' + AP : ''} hits on ${target.name}.`)
    wounds[a.side] += impactResolve(game, a, target, n, S, AP)
  }
  const ch = await challenge(game, units, ask)
  const duel = ch?.refused ? null : ch
  const inDuel = (unit, champ) => duel && [duel.a, duel.b].some(d => d.unit === unit && (champ ? d.model : !d.model))
  const retired = ch?.retired || []
  const isRetired = (unit, champ) => retired.some(d => d.unit === unit && (champ ? d.model : !d.model))
  // Characters in Combat: a character with a unit is hit only by attacks directed at it, by
  // enemy models in base contact with it. Each attacking unit's player says where its attacks go (asked once a
  // round for each enemy unit with characters in its fighting rank; the first answer is its rank and file).
  const directed = new Map()
  if (ask) {
    for (const host of units) {
      for (const id of Object.keys(host.engagedWith || {})) {
        const b = units.find(x => x.id === id)
        const chars = b ? joinedOf(b).filter(c => !isDead(c) && !c.status.removed && !inDuel(c, false) && !isRetired(c, false) && !c.status.ladyRetired && characterReachable(game, b, c, host)) : []
        if (!chars.length) continue
        const pick = await ask(`${game.sides[host.side].name}: ${host.name} fights ${b.name}. Direct the attacks of the models in base contact at…`, [[`${b.name}'s rank and file`, null], ...chars.map(c => [c.name, c])])
        if (pick) directed.set(host.id + '>' + b.id, { unit: pick, host: b, name: pick.name, notChallenge: true })
      }
    }
  }
  const plan = []
  for (const host of units) {
    // (every joined character fights: one not yet in the fighting rank may move up through the ranks into it when its
    // combat is chosen — Characters in Combat)
    for (const a of [host, ...joinedOf(host)]) {
      for (const id of Object.keys(host.engagedWith || {})) {
        const b = units.find(x => x.id === id)
        if (!b) continue
        const at = directed.get(host.id + '>' + b.id)
        for (const g of attackGroups(game, a, b)) {
          // a Giant makes ONE Giant Attack, against one of the units it fights (Giant Attacks)
          if (g.giant && plan.some(p => p.a === a && p.g.giant)) continue
          // duellists fight only each other; a retired model does not fight
          // (Fighting a Challenge, Refusing a challenge)
          const champ = !!g.isChamp
          const who = a === host ? (champ ? 'champ' : null) : 'char'
          if (who === 'char' && (inDuel(a, false) || isRetired(a, false) || a.status.ladyRetired)) continue
          if (who === 'champ' && (inDuel(host, true) || isRetired(host, true))) continue
          // (a character fighting on its own, in a challenge, fights only there)
          if (who === null && (host.troopType || []).includes('Character') && (inDuel(host, false) || isRetired(host, false))) continue
          // attacks at a character with the unit: the models in base contact with it (as many as fit along its base)
          // (only the models in base contact: not the supporting ranks, nor the rest of the fighting rank; how many
          // touch the character — those along its base plus one at a corner — is a guess, no page counts them)
          if (at && !g.stomp && !g.giant && !g.motherly && !g.vomit && !g.treeWhack && !/supporting|second rank|more in the fighting rank/.test(g.label)) {
            const k = Math.min(g.n, Math.max(1, Math.ceil(at.unit.base.w / Math.max(0.5, a.base.w)) + 1))
            plan.push({ a, b, g: { ...g, n: k, label: `${g.label}, at ${at.name}` }, duel: at })
            if (g.n > k) plan.push({ a, b, g: { ...g, n: g.n - k } })
            continue
          }
          plan.push({ a, b, g })
        }
      }
    }
  }
  // the duel itself: each duellist (and its mount) against the other
  if (duel) {
    for (const [me, foe] of [[duel.a, duel.b], [duel.b, duel.a]]) {
      const enemyHost = foe.host
      // duellists from units not in contact with each other: they cannot reach one another
      if (!me.host.engagedWith?.[enemyHost.id]) continue
      for (const g of attackGroups(game, me.unit, enemyHost)) {
        if (me.model ? !g.isChamp : (g.isChamp)) continue
        // (Stomp Attacks are not made in a challenge here: they would land on the duellist's unit — a known gap)
        if (g.stomp) continue
        if (me.model || g.isMount || !/supporting|second rank|more in the fighting rank/.test(g.label)) plan.push({ a: me.model ? me.host : me.unit, b: enemyHost, g: { ...g, n: 1, label: `${me.name} in the challenge${g.isMount ? ' (its mount)' : ''}` }, duel: foe, attacker: me, side: me.host.side })
      }
    }
  }
  const pulled = [] // duellists taken into a second challenge (Skilled Duellist): they fight there
  const steps = [...new Set(plan.map(p => p.g.init))].sort((x, y) => y - x)
  for (const I of steps) {
    // simultaneous: attackers are counted before anyone at this step removes casualties
    const atStep = plan.filter(p => p.g.init === I).map(p => ({ ...p, n: Math.min(p.g.n, Math.max(0, availableAt(p))) }))
    const order = [...atStep.filter(p => p.a.side === game.active), ...atStep.filter(p => p.a.side !== game.active)]
    // duellists at the same Initiative strike together (Challenges and Mounts: only blows
    // not yet struck when one falls are lost)
    const duelAlive = new Map(order.filter(p => p.attacker).map(p => [p.attacker, !duelDead(p.attacker)]))
    for (const p of order) {
      if (pulled.some(d => (d.model ? p.a === d.host && p.g.isChamp : p.a === d.unit) && !p.duel)) continue
      if (isDead(p.b) || p.b.status.removed || !p.n) continue
      // (a model slain at an earlier step makes no attacks: its Stomp Attacks and Troll Vomit too)
      if (isDead(p.a) || p.a.status.removed) continue
      if (p.g.models && (p.g.stomp || p.g.vomit) && !p.g.bloodskull) p.g = { ...p.g, models: Math.min(p.g.models, modelCount(p.a)) }
      if (p.duel && duelDead(p.duel) && !(p.attacker && duelAlive.get(p.attacker))) continue
      if (p.attacker && !duelAlive.get(p.attacker)) continue
      game.combatKiller = p.a.side
      const slainBefore = p.b.models.filter(m => m.wounds <= 0).length
      game.combatKillerUnit = hostOf(game, p.a) || p.a
      const lost = p.g.treeWhack ? treeWhack(game, p.a, p.b, p.g, spellHits) : p.g.motherly ? (p.a.status.motherlyDone === `${game.round}:${game.active}` || p.a.status.motherlyTarget !== p.b.id ? 0 : (p.a.status.motherlyDone = `${game.round}:${game.active}`, motherlyLove(game, p.a, p.b))) : p.g.giant ? await giantAttack(game, p.a, p.b, ask, p.g)
        : p.g.stomp ? stomp(game, p.a, p.b, p.g)
          : p.g.vomit ? (say(game, 'roll', `${p.a.name}: ${p.g.weapon} — ${p.g.models} automatic Strength ${p.g.s ?? 3} hit${p.g.models === 1 ? '' : 's'}, AP ${p.g.ap ?? -2}, on ${p.b.name}.`), impactResolve(game, p.a, p.b, p.g.models, p.g.s ?? 3, p.g.ap ?? -2))
          : strike(game, p.a, p.b, { ...p.g, n: p.n }, I, afraid.has(p.a.id + '>' + p.b.id), p.duel)
      game.combatKiller = null
      game.combatKillerUnit = null
      // (The Hunger: unsaved wounds inflicted this phase — fed at its end, vampires.js)
      if (lost && hasRule(p.a, 'The Hunger')) p.a.status.hungerFed = `${game.round}:${game.active}`
      // (a model of the target slain by these blows: The Wyrm Slayer)
      if (lost && hasRule(p.a, 'The Wyrm Slayer') && p.b.models.filter(m => m.wounds <= 0).length > slainBefore) wyrmSlain(game, p.a, p.b)
      wounds[p.a.side] += lost
      // Deathblow: each Slayer slain by these blows strikes back, S3 AP -1 (dwarfs.js)
      const blows = deathblows(p.b, p.b.models.filter(m => m.wounds <= 0).length - slainBefore)
      // Spurting Bile Blood: each Wound a Gibberwyrm loses in combat, the attacking unit a S4 AP -1 hit
      if (lost && hasRule(p.b, 'Spurting Bile Blood') && !p.a.status.removed && !isDead(p.a)) { say(game, 'roll', `${p.b.name}'s Spurting Bile Blood: ${lost} Strength 4 hit${lost === 1 ? '' : 's'}, AP -1, on ${p.a.name}.`); wounds[p.b.side] += impactResolve(game, p.b, p.a, lost, 4, -1) }
      // Acid Ichor: in a challenge, each Wound its bearer loses: a S4 AP -2 hit on the enemy
      if (lost && p.duel && itemFlag(p.b, 'acidIchor', { personal: true }) && !p.a.status.removed && !isDead(p.a)) { say(game, 'roll', `${p.b.name}'s Acid Ichor: ${lost} Strength 4 hit${lost === 1 ? '' : 's'}, AP -2, on ${p.a.name}.`); wounds[p.b.side] += impactResolve(game, p.b, p.a, lost, 4, -2) }
      // Master Rune of Spite: each Wound its bearer loses, the attacking unit a S5 hit, AP -2
      if (lost && itemFlag(p.b, 'runeSpite', { personal: true }) && !p.a.status.removed && !isDead(p.a)) { say(game, 'roll', `${p.b.name}'s Master Rune of Spite: ${lost} Strength 5 hit${lost === 1 ? '' : 's'}, AP -2, on ${p.a.name}.`); wounds[p.b.side] += impactResolve(game, p.b, p.a, lost, 5, -2) }
      if (blows && !p.a.status.removed && !isDead(p.a)) { say(game, 'roll', `${p.b.name}: Deathblow — ${blows} Strength 3 hit${blows === 1 ? '' : 's'}, AP -1, on ${p.a.name}.`); wounds[p.b.side] += impactResolve(game, p.b, p.a, blows, 3, -1) }
      // Laurels of Victory: each unsaved wound by the bearer (not its mount) is worth 2
      if (lost && !p.g.isMount && itemFlag(p.a, 'laurels', { personal: true })) { wounds[p.a.side] += lost; say(game, '', `${p.a.name}'s Laurels of Victory: its ${lost} wound${lost === 1 ? '' : 's'} count double.`) }
      // Sword of Reaving: did its wielder cause any wounds this round?
      if (p.g.itemId === 'sword-of-reaving') p.a.status.reaving = { key: `${game.round}:${game.active}`, wounds: (p.a.status.reaving?.key === `${game.round}:${game.active}` ? p.a.status.reaving.wounds : 0) + (lost || 0) }
      if (p.duel?.overkill) { overkill[p.a.side] += p.duel.overkill; p.duel.overkill = 0 }
      // Skilled Duellist: having slain his enemy in a challenge in a turn he charged,
      // Torvald may issue a second challenge, fought at once (Torvald, not his mount)
      if (p.attacker && !p.attacker.model && p.duel && duelDead(p.duel) && !duelDead(p.attacker) && hasRule(p.attacker.unit, 'Skilled Duellist') && (p.attacker.unit.status.charged || p.attacker.host.status.charged) && p.attacker.unit.status.secondDuel !== `${game.round}:${game.active}`) {
        p.attacker.unit.status.secondDuel = `${game.round}:${game.active}`
        const foe = await secondChallenge(game, units, ask, p.attacker)
        if (foe) {
          pulled.push(foe)
          const mine = attackGroups(game, p.attacker.unit, foe.host).filter(g => !g.isMount && !g.stomp && !g.isChamp && !/supporting|second rank|more in the fighting rank/.test(g.label)).map(g => ({ a: p.attacker.unit, g: { ...g, n: 1, label: `${p.attacker.name} in the second challenge` }, duel: foe, attacker: p.attacker }))
          const theirs = attackGroups(game, foe.model ? foe.host : foe.unit, p.attacker.host).filter(g => !g.stomp && (foe.model ? g.isChamp : !g.isChamp) && (foe.model || g.isMount || !/supporting|second rank|more in the fighting rank/.test(g.label))).map(g => ({ a: foe.model ? foe.host : foe.unit, g: { ...g, n: 1, label: `${foe.name} in the second challenge${g.isMount ? ' (its mount)' : ''}` }, duel: p.attacker, attacker: foe }))
          for (const I2 of [...new Set([...mine, ...theirs].map(q => q.g.init))].sort((x, y) => y - x)) {
            const now = [...mine, ...theirs].filter(q => q.g.init === I2)
            const alive2 = new Map(now.map(q => [q.attacker, !duelDead(q.attacker)]))
            for (const q of now) {
              if (!alive2.get(q.attacker) || duelDead(q.duel)) continue
              const l2 = strike(game, q.a, q.duel.host, q.g, I2, false, q.duel)
              wounds[q.a.side] += l2
              if (q.duel.overkill) { overkill[q.a.side] += q.duel.overkill; q.duel.overkill = 0 }
            }
          }
        }
      }
    }
  }

  // Sword of Reaving: a wielder whose attacks cause no wounds takes D3 hits itself, Strength 4, AP -1
  for (const u of new Set([...units, ...units.flatMap(joinedOf)])) {
    const r = u.status.reaving
    if (!r || r.key !== `${game.round}:${game.active}` || r.done) continue
    r.done = true
    if (r.wounds || isDead(u) || u.status.removed) continue
    const n = Math.ceil(rollDice(game.rng, 1)[0] / 2)
    say(game, 'bad', `${u.name} caused no wounds with the Sword of Reaving: D3 = ${n} Strength 4 hits, AP -1, on itself.`)
    spellHits(game, u, n, 4, -1, { label: 'Sword of Reaving: ' })
  }
  // the result
  const score = [0, 0]
  const parts = [[], []]
  for (const s of [0, 1]) {
    score[s] += wounds[s]; parts[s].push(`${wounds[s]} wound${wounds[s] === 1 ? '' : 's'} caused`)
    // Overkill Characters: excess wounds in a challenge, +1 each, at most +5
    if (overkill[s]) { const o = Math.min(5, overkill[s]); score[s] += o; parts[s].push(`overkill +${o}`) }
    const live = sides[s].filter(u => !isDead(u) && !u.status.removed)
    const rb = Math.max(0, ...live.map(u => rankBonus(game, u)))
    if (rb) { score[s] += rb; parts[s].push(`Rank Bonus +${rb}`) }
    // (Chalice Reliquary: it counts as a standard bearer)
    if (live.some(u => u.models.some(m => (m.role === 'standard' || m.role === 'reliquae') && m.wounds > 0))) { score[s] += 1; parts[s].push('standard +1') }
    if (live.some(u => u.isBSB || joinedOf(u).some(c => c.isBSB))) { score[s] += 1; parts[s].push('Battle Standard +1') }
    // War Banner, The Big Red Raggedy Flag: +1 Melee Outcome
    // (only one standard's bonus counts in a combat: Standards Multiple Combats)
    const crBanner = live.map(u => bannersOfCR(u).find(id => ITEM_EFFECTS[id]?.flags?.meleeOutcome)).find(Boolean)
    if (crBanner) { score[s] += 1; parts[s].push(`${itemName(crBanner)} +1`) }
    // The Jade Banner: +2
    else if (live.some(u => bannersOfCR(u).includes('the-jade-banner'))) { score[s] += 2; parts[s].push('the Jade Banner +2') }
    // Standard of Slaughter: +D3 in a turn it charged
    else if (live.some(u => u.status.charged && itemFlag(u, 'slaughter'))) { const r = Math.ceil(rollDice(game.rng, 1)[0] / 2); score[s] += r; parts[s].push(`Standard of Slaughter D3 +${r}`) }
    // Banner of the Dawnqueen: +1 within 6" of a woodland terrain feature
    else if (live.some(u => bannersOfCR(u).includes('banner-of-the-dawnqueen') && nearWood(game, u, 6))) { score[s] += 1; parts[s].push('Banner of the Dawnqueen +1') }
    // Battle Banner: +D3
    if (!crBanner && live.some(u => itemFlag(u, 'meleeOutcomeD3'))) { const r = Math.ceil(rollDice(game.rng, 1)[0] / 2); score[s] += r; parts[s].push(`Battle Banner D3 +${r}`) }
    // Stalwart Rune: a war machine with it +1
    if (live.some(u => (u.items || []).includes('stalwart-rune'))) { score[s] += 1; parts[s].push('Stalwart Rune +1') }
    // Master Rune of Storri Redmane: friendly units within the carrier's Command range +1
    if (live.some(u => game.units.some(c => c.side === u.side && c.placed && !c.status.removed && !isDead(c) && bannersOfCR(c).includes('master-rune-of-storri-redmane') && distanceBetween(c, u) <= commandRange(c)))) { score[s] += 1; parts[s].push('Master Rune of Storri Redmane +1') }
    if (live.some(u => u.status.bigRuck || joinedOf(u).some(c => c.status.bigRuck))) { score[s] += 1; parts[s].push('Big Ruck +1') }
    // Virtue of Duty: +1 while the army's General is still on the field
    if (live.some(u => [u, ...joinedOf(u)].some(x => itemFlag(x, 'duty', { personal: true }))) && game.units.some(g => g.side === s && g.isGeneral && !g.status.removed && !isDead(g))) { score[s] += 1; parts[s].push('Virtue of Duty +1') }
    // The Boss's Trophy Rack: +1 in a turn Titch (and a Wolf Rider Mob he has joined) charged
    if (live.some(u => u.status.charged && [u, ...joinedOf(u)].some(x => x.items?.includes('the-bosss-trophy-rack')) && (u.items?.includes('the-bosss-trophy-rack') || u.entryId === 'nipper-wolf-rider-mob'))) { score[s] += 1; parts[s].push("The Boss's Trophy Rack, charging +1") }
    // Order of the Sunburst: a Grand Master, Lord Commander or Inner Circle of the Order
    // +1 in a turn it charged (not cumulative)
    if (live.some(u => [u, ...joinedOf(u)].some(x => x.status.charged && orderOf(x) === 'sunburst' && isOrderMaster(x)))) { score[s] += 1; parts[s].push('Order of the Sunburst, charging +1') }
    const enemies = sides[1 - s]
    for (const e of enemies) {
      const arcs = new Set(live.map(u => e.engagedWith?.[u.id]).filter(Boolean))
      // (Impervious Defence: no flank or rear bonus against a Shieldback — saurians.js)
      if (!impervious(e) && !slimeTrail(e) && (arcs.has('left') || arcs.has('right'))) { score[s] += 1; parts[s].push(`flank of ${e.name} +1`) }
      if (!impervious(e) && !slimeTrail(e) && arcs.has('rear')) { score[s] += 2; parts[s].push(`rear of ${e.name} +2`) }
    }
    // The Lance in Combat: a Lance of Unit Mass 5 or more, +1
    for (const u of live) if (u.formation === 'lance' && unitMass(u) >= 5) { score[s] += 1; parts[s].push(`${u.name} in Lance formation +1`) }
    for (const u of live) {
      if (inCombatOrder(u) && unitMass(u) >= 10) { score[s] += 1; parts[s].push(`${u.name} in Combat Order, Unit Mass ${unitMass(u)} +1`) }
    }
  }
  // The High Ground / The High Ground Multiple Combats: one side's unit on
  // a hill against none on the other: +1 (both: they cancel)
  const high = [0, 1].map(s => sides[s].some(u => !isDead(u) && !u.status.removed && frontRankOnHill(game, u)))
  if (high[0] !== high[1]) { const s = high[0] ? 0 : 1; score[s] += 1; parts[s].push('the high ground +1') }
  const usSide = [0, 1].map(s => sides[s].filter(u => !isDead(u) && !u.status.removed).reduce((a, u) => a + unitMass(u), 0))
  for (const s of [0, 1]) {
    const massed = sides[s].some(u => !isDead(u) && ['Regular Infantry', 'Heavy Infantry'].includes(troopType(u).name))
    if (massed && usSide[s] > usSide[1 - s]) { score[s] += 1; parts[s].push(`Massed Infantry (Unit Mass ${usSide[s]} against ${usSide[1 - s]}) +1`) }
  }
  // Onwards to Victory: a tie, the side with a musician +1 (both: neither) (musicians.js)
  if (score[0] === score[1]) { const m = onwardsToVictory(game, sides, distanceBetween, hostOf); if (m != null) { score[m] += 1; parts[m].push('musician, Onwards to Victory +1') } }
  say(game, 'h', `MELEE OUTCOME — ${game.sides[0].name}: ${score[0]} (${parts[0].join(', ')}). ${game.sides[1].name}: ${score[1]} (${parts[1].join(', ')}).`)
  for (const u of units) u.status.standShootWounds = 0

  const wiped = [0, 1].map(s => sides[s].every(u => isDead(u) || u.status.removed))
  let winner = null
  if (wiped[0] && !wiped[1]) winner = 1
  else if (wiped[1] && !wiped[0]) winner = 0
  else if (score[0] !== score[1]) winner = score[0] > score[1] ? 0 : 1
  if (winner == null) {
    say(game, 'h', 'A DRAW: the units stay locked in combat.')
    return
  }
  const loser = 1 - winner
  const diff = Math.abs(score[0] - score[1])
  // Grim Verdict: losing a round of combat, its wielder suffers a wound, no Armour Roll
  for (const c of new Set([...sides[loser], ...sides[loser].flatMap(joinedOf)]).values()) {
    if (!(c.items || []).includes('grim-verdict') || isDead(c) || c.status.removed) continue
    say(game, 'bad', `${c.name} lost the round: the Grim Verdict turns on its wielder.`)
    spellHits(game, c, 1, 99, 0, { noArmour: true, nonMagical: true, label: 'Grim Verdict: ', autoWound: true })
  }
  say(game, 'h', `${game.sides[winner].name.toUpperCase()} WINS the combat${wiped[loser] ? ' (the enemy is wiped out)' : ` by ${diff}`}.`)
  // Frenzy is lost by losing
  // (Banner of Rage: its unit never loses Frenzy)
  for (const u of sides[loser]) if (hasRule(u, 'Frenzy') && !itemFlag(u, 'rage')) { u.special.delete([...u.special].find(r => r.startsWith('Frenzy'))); u.status.frenzyLost = true; say(game, '', `${u.name} loses its Frenzy.`) }

  const winners = sides[winner].filter(u => !isDead(u) && !u.status.removed)
  if (wiped[loser]) {
    for (const w of winners) {
      disengageAll(game, w)
      const go = ask ? await ask(`${w.name} has destroyed its enemy. Overrun (2D6" straight ahead) or restrain?`, [['Overrun', true], ['Restrain', false]]) : false
      if (go) overrun(game, w)
    }
    return
  }

  // Unstable: losing a round, an Unstable unit loses one more Wound for every point it lost by,
  // after the Melee Outcome and before Break tests; no Regeneration
  for (const u of sides[loser].filter(u => !isDead(u) && !u.status.removed && hasRule(u, 'Unstable'))) {
    // (Indomitable, Banner of the Count, Wight Banner: fewer — vampires.js)
    const red = unstableReduction(game, u, distanceBetween, commandRange)
    const n = Math.max(0, diff - red.n)
    say(game, 'bad', `${u.name} is Unstable: it lost by ${diff}${red.n ? `, less ${red.n} (${red.why})` : ''} — it loses ${n} more Wound${n === 1 ? '' : 's'}.`)
    if (n) applyWounds(game, u, n, 'Unstable')
  }
  // Unmade Instability: Unmade losing a round test instead (unmade.js)
  for (const u of sides[loser].filter(u => !isDead(u) && !u.status.removed && hasRule(u, 'Unmade Instability'))) unmadeInstability(game, u, diff, applyWounds, removeUnit)
  // (Unstable may leave no loser standing: the winners are then free, as when the enemy is wiped out — no pursuit)
  if (sides[loser].every(u => isDead(u) || u.status.removed)) {
    say(game, '', 'The losers crumble to dust: nothing is left to break or pursue.')
    for (const w of winners) if (!Object.keys(w.engagedWith || {}).some(id => game.units.find(x => x.id === id && !x.status.removed && !isDead(x)))) disengageAll(game, w)
    return
  }
  // Break tests
  const outcome = new Map()
  const winUS = usSide[winner] = winners.reduce((a, u) => a + unitMass(u), 0)
  const terror = winners.some(u => hasRule(u, 'Terror'))
  for (const u of sides[loser]) {
    if (isDead(u) || u.status.removed) continue
    const myUS = sides[loser].filter(x => !isDead(x) && !x.status.removed).reduce((a, x) => a + unitMass(x), 0)
    if (hasRule(u, 'Unbreakable')) { outcome.set(u, 'give'); say(game, '', `${u.name} is Unbreakable: it gives ground.`); continue }
    // (Tilean Stoicism: its characters now make their first Break test — the Stubborn it gave counts
    // for this one, then it is gone)
    const stubborn = hasRule(u, 'Stubborn')
    for (const c of joinedOf(u)) c.status.brokeTested = true
    if (stubborn && !u.status.stubbornUsed) {
      u.status.stubbornUsed = true
      outcome.set(u, 'fallback')
      say(game, '', `${u.name} is Stubborn: the first time, it falls back in good order without a Break test.`)
      continue
    }
    const ld = leadershipFor(game, u)
    // (Banner of the Mere's Grace: no negative modifier to its Leadership)
    // Dark Hearts: a winning unit of Dark Hearts, -1 (not to Dark Hearts, Terror or Immune to Psychology)
    const hearts = winners.some(w => (w.items || []).includes('dark-hearts')) && !(u.items || []).includes('dark-hearts') && !hasRule(u, 'Terror') && !hasRule(u, 'Immune to Psychology') && !itemFlag(u, 'ladysGrace')
    const LD = ld.value - (terror && !itemFlag(u, 'ladysGrace') ? 1 : 0) - (hearts ? 1 : 0)
    // Valorous Standard: its unit rolls 3D6 for a Break test and discards the highest
    const valor = itemFlag(u, 'valorous')
    const roll = () => { if (!valor) return sumDice(game.rng, 2); const d = rollDice(game.rng, 3); const kept = [...d].sort((x, y) => x - y).slice(0, 2); say(game, 'roll', `${u.name}: the Valorous Standard — 3D6 ${d.join(', ')}, the highest discarded.`); return { dice: kept, total: kept[0] + kept[1] } }
    let r = roll()
    const judge = r => {
      const dbl1 = r.dice[0] === 1 && r.dice[1] === 1
      if (!dbl1 && r.total > LD) return 'break'
      if (!dbl1 && r.total + diff > LD) return 'fallback'
      return 'give'
    }
    let res = judge(r)
    let text = `${u.name} — Break test: rolled ${r.dice.join('+')}=${r.total}, +${diff} lost by = ${r.total + diff}, Leadership ${LD}${ld.from ? ` (${ld.from})` : ''}${terror ? ' (-1, the winners cause Terror)' : ''}`
    if (res !== 'give' && bsbNear(game, u)) {
      r = roll(); res = judge(r)
      text += `; re-rolled for the Battle Standard: ${r.dice.join('+')}=${r.total} (${r.total + diff})`
    } else if (res !== 'give' && [u, ...joinedOf(u)].some(x => itemLeft(x, 'fistful-of-laurels') > 0)) {
      // Fistful of Laurels: single use, the bearer and its unit re-roll the 2D6 of a Break test
      const x = [u, ...joinedOf(u)].find(x => itemLeft(x, 'fistful-of-laurels') > 0); spendItem(x, 'fistful-of-laurels')
      r = roll(); res = judge(r)
      text += `; re-rolled (Fistful of Laurels, single use): ${r.dice.join('+')}=${r.total} (${r.total + diff})`
    } else if (res !== 'give' && [u, ...joinedOf(u)].some(x => (x.items || []).includes('virtue-of-stoicism'))) {
      // Virtue of Stoicism: a Break test's 2D6 may be rolled again, for the model and its unit
      r = roll(); res = judge(r)
      text += `; re-rolled (Virtue of Stoicism): ${r.dice.join('+')}=${r.total} (${r.total + diff})`
    }
    // Banner of the Steadfast: its unit may Fall Back in Good Order whatever the winners' Unit Mass
    if (res === 'fallback' && winUS > 2 * myUS && itemFlag(u, 'steadfast')) text += ` — the winners' Unit Mass ${winUS} is more than twice ${myUS}, but the Banner of the Steadfast holds: it FALLS BACK`
    else if (res === 'fallback' && winUS > 2 * myUS) { res = 'break'; text += ` — FALLS BACK, but the winners' Unit Mass ${winUS} is more than twice ${myUS}: it BREAKS` }
    say(game, 'roll', `${text} — ${{ break: 'BREAKS AND FLEES', fallback: 'FALLS BACK IN GOOD ORDER', give: 'GIVES GROUND' }[res]}.`)
    // Peasant's Duty: the Sergeant-at-Arms and its unit may Give Ground instead of Falling Back;
    // Shieldwall: once a game, in a turn it was charged, in Close Order with shields, likewise
    if (res === 'fallback' && ask) {
      const duty = peasantsDuty(u)
      const wall = hasRule(u, 'Shieldwall') && !u.status.shieldwallUsed && u.formation === 'close' && u.kit?.shield && u.status.wasCharged === `${game.round}:${game.active}`
      if ((duty || wall) && await ask(`${u.name} falls back in good order. ${duty ? "Peasant's Duty" : 'Shieldwall (once a game)'}: give ground instead?`, [['Give ground', true], ['Fall back', false]])) {
        if (!duty) u.status.shieldwallUsed = true
        res = 'give'
        say(game, 'good', `${u.name} holds firm (${duty ? "Peasant's Duty" : 'Shieldwall'}): it gives ground instead.`)
      }
    }
    outcome.set(u, res)
  }

  // the winners choose before the losers move
  const choices = new Map()
  for (const w of winners) {
    const foes = [...outcome.keys()].filter(l => w.engagedWith?.[l.id])
    const stillEngaged = Object.keys(w.engagedWith || {}).some(id => { const o = game.units.find(x => x.id === id); return o && !outcome.has(o) && !isDead(o) && !o.status.removed })
    if (!foes.length || stillEngaged) continue
    const target = foes[0]
    const res = outcome.get(target)
    const canPursue = !isWarMachine(w)
    let choice = 'restrain'
    // It and Run: Titch and a Nipper Wolf Rider Mob he has joined may Fall Back in
    // Good Order rather than make a follow up or pursuit move
    const itRun = hasRule(w, "Smack & Scarper") || (w.entryId === 'nipper-wolf-rider-mob' && joinedOf(w).some(c => hasRule(c, "Smack & Scarper")))
    const runOpt = itRun ? [["Fall back in good order (Smack & Scarper)", 'itrun']] : []
    if (res === 'give') {
      // Frenzy: a Frenzied unit can never choose to make a Restraint test
      choice = hasRule(w, 'Frenzy') ? 'follow' : ask ? await ask(`${target.name} gives ground. ${w.name}: follow up (back into contact) or restrain?`, [['Follow up', 'follow'], ['Restrain', 'restrain'], ...runOpt]) : 'follow'
    } else if (canPursue) {
      choice = hasRule(w, 'Frenzy') ? 'pursue' : (ask ? await ask(`${target.name} ${res === 'break' ? 'breaks and flees' : 'falls back'}. ${w.name}: pursue (2D6") or restrain and reform?`, [['Pursue', 'pursue'], ['Restrain', 'restrain'], ...runOpt]) : 'pursue')
    }
    if (choice === 'restrain') {
      const lt = leadershipTest(game, w, { label: `${w.name} — Restraint test`, noWarband: true })
      say(game, 'roll', lt.text)
      if (!lt.passed) { choice = res === 'give' ? 'follow' : 'pursue'; say(game, 'bad', `${w.name} cannot hold back: it ${choice === 'follow' ? 'follows up' : 'pursues'}.`) }
    }
    choices.set(w, { target, choice })
  }

  // the losers move
  const fledFromCombat = []
  for (const [u, res] of outcome) {
    const enemies = winners.filter(w => u.engagedWith?.[w.id])
    const from = greatestDanger(game, enemies.length ? enemies : winners)
    if (res === 'break') {
      if (isWarMachine(u)) { destroy(game, u, 'its crew abandon it'); continue }
      if (hasRule(u, 'Gobblers Go Wild')) { gobblersGoWild(game, u); continue }
      disengageAll(game, u)
      fleeFrom(game, u, from, { label: 'breaks and flees' })
      fledFromCombat.push(u)
    } else if (res === 'fallback') {
      disengageAll(game, u)
      fleeFrom(game, u, from, { label: 'falls back in good order', keepHighest: true })
      if (!u.status.removed) { u.status.fleeing = false; u.status.fellBack = true; reformToFace(game, u, from) }
      fledFromCombat.push(u)
    } else {
      giveGround(game, u, enemies)
    }
  }
  // the winners move
  for (const [w, { target, choice }] of choices) {
    if (choice === 'restrain') { disengageIfFree(game, w); continue }
    if (choice === 'itrun') {
      say(game, 'h', `${w.name} FALLS BACK IN GOOD ORDER (Smack & Scarper) from ${target.name}.`)
      disengageAll(game, w)
      fleeFrom(game, w, target, { label: "falls back in good order (Smack & Scarper)", keepHighest: true })
      if (!w.status.removed) { w.status.fleeing = false; reformToFace(game, w, target) }
      continue
    }
    if (choice === 'follow') {
      if (target.status.removed) continue
      const arcF = closestArc(target, w)
      if (!placeInContact(game, w, target, arcF)) { say(game, '', `${w.name} cannot follow up: there is no room.`); disengageIfFree(game, w); continue }
      engage(game, w, target, arcF)
      w.status.followedUp = true
      // Shenese Cataphracts: it counts as having charged next turn (shen.js)
      if (cataphracts(w)) w.status.pursuedIn = true
      say(game, '', `${w.name} follows up into contact with ${target.name}.`)
      continue
    }
    pursue(game, w, target)
  }
  // panic in friends within 6" of a Unit Mass 5+ unit that broke or fell back
  for (const u of fledFromCombat) {
    if (insignificant(u)) continue // (Largely Insignificant: no friendly Panic from Grublings)
    if (unitMass(u) < 5 && !u.status.removed) continue
    for (const f of onTable(game).filter(o => o.side === u.side && o !== u && !o.status.engaged && !o.status.fleeing && !o.status.panicTested)) {
      if (distanceBetween(f, u) > 6) continue
      if (hasRule(f, 'Ignore Panic') && !hasRule(u, 'Ignore Panic')) continue
      // Ignore Nipper Panic: Rukka do not panic when Nippers break and flee
      // Levies: nobody panics when Levies break and flee
      if (hasRule(u, 'Levies') && !hasRule(f, 'Levies')) continue
      // Peasant's Duty: nor a unit with Peasant's Duty when friendly Levies break within 6"
      if (hasRule(u, 'Levies') && peasantsDuty(f)) continue
      if (hasRule(f, 'Ignore Nipper Panic') && isNipperUnit(u)) { say(game, '', `${f.name} ignores ${u.name} fleeing (Ignore Nipper Panic).`); continue }
      f.status.panicTested = true
      const nearestEnemy = onTable(game).filter(o => o.side !== f.side && !o.status.fleeing).sort((a, b) => distanceBetween(f, a) - distanceBetween(f, b))[0]
      if (nearestEnemy) panicTest(game, f, nearestEnemy, `${u.name} fled from combat within 6"`)
    }
  }
}

// Put the winner in contact with `target` — unless that would stand it on rocks or another unit,
// in which case it stays where it is. Returns whether it moved.
function placeInContact (game, w, target, arc) {
  const was = { pos: w.pos, facing: w.facing }
  Object.assign(w, contactPlacement(w, target, arc))
  const bad = onImpassable(game, w) || solid(game).some(o => o !== w && o !== target && distanceBetween(w, o) < 0.01)
  if (bad) { Object.assign(w, was); return false }
  return true
}

function closestArc (target, from) {
  const c = centre(from)
  const cs = corners(target)
  const mids = { front: mul(add(cs[0], cs[1]), 0.5), right: mul(add(cs[1], cs[2]), 0.5), rear: mul(add(cs[2], cs[3]), 0.5), left: mul(add(cs[3], cs[0]), 0.5) }
  return Object.entries(mids).sort((a, b) => dist(a[1], c) - dist(b[1], c))[0][0]
}

function disengageIfFree (game, w) {
  for (const id of Object.keys(w.engagedWith || {})) {
    const o = game.units.find(x => x.id === id)
    if (!o || o.status.removed || isDead(o) || o.status.fleeing || !touching(w, o)) delete w.engagedWith[id]
  }
  if (!Object.keys(w.engagedWith || {}).length) w.status.engaged = false
}
const touching = (a, b) => distanceBetween(a, b) < 0.05

// Models that can still fight at this point: alive, and not stepped forward.
function availableAt (p) {
  const live = alive(p.a).length
  return Math.min(p.g.n, live)
}

// One group's attacks: To Hit, To Wound, saves, casualties. Returns the Wounds caused.
// Rune of Endless Battle: in a turn it charged, each attack that causes an unsaved wound allows
// one more attack (not those extra attacks themselves). (Read here as one more attack per Wound caused.)
function strike (game, a, b0, g0, I, afraidOfB, duel = null) {
  const lost = strikeInner(game, a, b0, g0, I, afraidOfB, duel)
  if (lost) dominionOnWound(game, a, duel ? (duel.model ? duel.host : duel.unit) : b0, g0, lost, duel)
  if (!lost || g0.endless || g0.isMount || !a.status.charged || !itemFlag(a, 'endlessBattle', { personal: true })) return lost
  say(game, 'roll', `${a.name}'s Rune of Endless Battle: ${lost} more attack${lost === 1 ? '' : 's'}.`)
  return lost + strikeInner(game, a, b0, { ...g0, n: 1, attacks: lost, endless: true, label: `${g0.label} (Rune of Endless Battle)` }, I, afraidOfB, duel)
}
function strikeInner (game, a, b0, g0, I, afraidOfB, duel = null) {
  let g = g0
  // in a challenge the blows land on the duellist: a character (its own unit record) or a champion model
  const b = duel ? (duel.model ? duel.host : duel.unit) : b0
  // (dwarfs.js: a Dragon or Unmade Slayer's wounds on a behemoth have Multiple Damage (D3))
  if (slayerMultiple(a, b) && !(g.rules || []).some(r => r.startsWith('Multiple Damage'))) g = { ...g, rules: [...(g.rules || []), 'Multiple Damage (D3)'] }
  const target = duel?.model || alive(b).find(m => m.role === 'rank') || alive(b)[0]
  // (its target has already fallen at this Initiative step: nothing left to strike)
  if (!target || (duel?.model && duel.model.wounds <= 0)) return 0
  // war machines and chariots are hit on their crew's Weapon Skill (split profiles)
  const tWS = (isWarMachine(b) || hasCrewPlatform(b)) && !duel ? (b.crew?.[0]?.profile.WS ?? 2) : target.profile.WS
  const T = isWarMachine(b) ? (b.crew?.[0]?.profile.T ?? 3) : target.profile.T
  const n = g.n * g.attacks
  // The Big Red Raggedy Flag: the target unit's Weapon Skill +1 (max 10)
  const tWSb = Math.min(10, tWS + (itemFlag(b, 'wsBonus') ? 1 : 0))
  // Slayer's Hourglass: an enemy monster in base contact with the bearer: -1 Weapon Skill
  const glass = /Monstrous Creature|Behemoth/.test((a.troopType || []).join(' ')) && [b, ...joinedOf(b)].some(x => itemFlag(x, 'hourglass', { personal: true }))
  if (glass) g = { ...g, ws: Math.max(1, g.ws - 1), label: g.label + '; WS -1 (Slayer\'s Hourglass)' }
  // Shield of Sharu: models attacking its bearer in combat -1 Weapon Skill
  if ([b.troopType?.includes('Character') ? b : null, duel?.unit, duel?.model].some(x => x && (x.items || []).includes('shield-of-sharu'))) g = { ...g, ws: Math.max(1, (g.ws ?? 3) - 1), label: g.label + '; WS -1 (Shield of Sharu)' }
  // Shield of Skelmor: attacks directed at its bearer -1 Strength (to 1) (the bearer: a lone
  // character, or the character the attacks are directed at)
  if ([b.troopType?.includes('Character') ? b : null, duel?.unit, duel?.model].some(x => x && (x.items || []).includes('shield-of-skelmor'))) g = { ...g, s: Math.max(1, (g.s ?? 3) - 1), label: g.label + '; S -1 (Shield of Skelmor)' }
  const base0 = combatToHit(g.ws, tWSb)
  let need = base0
  if (afraidOfB) need += 1
  if (b.status.glitter) need += 1 // Glittering Robe
  // Slimy Shanks: -1 To Hit for any enemy model directing its attacks at the Troll Hag
  const slimy = hasRule(b, 'Slimy Shanks')
  if (slimy) need += 1
  // The Collar of Old Grunter: a beast of burden (a cavalry mount, a chariot's beasts, a ridden monster)
  // attacking the wearer or its unit: -1 To Hit
  const collar = g.isMount && [b, ...joinedOf(b), hostOf(game, b)].filter(Boolean).some(x => itemFlag(x, 'collarOfOldGrunter', { personal: true }))
  if (collar) need += 1
  // Dances of Lirrin, Woven Mist: attacks directed at the unit -1 To Hit
  const mist = wovenMist(game, b) || lightProtected(game, b, distanceBetween) // (Vortex of Souls, Light of Protection: -1 To Hit too)
  if (mist) need += 1
  // A Tangle of Snarelings: its opponent in a challenge -1 To Hit
  const netted = !!duel && !duel.notChallenge && [b, duel.unit, duel.model].some(x => x && netlings(x))
  if (netted) need += 1
  // Cloud of Flies: attacks at a Blight Priest -1 To Hit (a lone one, or the character attacked)
  const flies = !g.isMount && [b.troopType?.includes('Character') ? b : null, duel?.unit, duel?.model].some(x => cloudOfFlies(x) || (x?.items || []).includes('aura-of-zhuatl') || (x?.items || []).includes('guardian-fen-shao')) // (Aura of Zhuatl and Guardian Fen Shao: the same)
  if (flies) need += 1
  // Storm of Ash: within 9" of its caster, -1 To Hit (a natural 6 still hits)
  const ash = inStormOfAsh(game, hostOf(game, a) || a, distanceBetween)
  if (ash) need += 1 // (a natural 6 hits whatever: hitOk)
  // magic items: Sword of Striking +1 To Hit (the weapon in use); Bedazzling Helm, Effigy of Wangler
  // -1 to hit their wearer (each)
  const wf = weaponFlags(g)
  const hitBonus = wf.hitBonus || 0
  // (Slug Skin: attacks directed at its bearer or its unit -1)
  const hitPen = itemSum(b, 'hitPenalty') + ([b, ...joinedOf(b)].some(x => itemFlag(x, 'slugSkin', { personal: true })) ? 1 : 0)
  // Rune of the Reckless: its bearer +1 To Hit in combat, and so is anyone striking at it
  const reckless = (itemFlag(a, 'reckless', { personal: true }) ? 1 : 0) + (itemFlag(b, 'reckless', { personal: true }) ? 1 : 0)
  need = need - hitBonus + hitPen - reckless
  // Beguiling Aura: a Leadership test first; failed, only natural 6s hit (lyonne.js)
  // Glamourweave: attacks at its wearer in the Combat phase — a Leadership test first; failed, only
  // natural 6s hit (the wearer: a lone character, or the character the attacks are directed at)
  const glam = !g.isMount && [b.troopType?.includes('Character') ? b : null, duel?.unit, duel?.model].some(x => x && (x.items || []).some(id => ITEM_EFFECTS[id]?.flags?.glamourweave)) // (Beguile: the same)
  const charmed = (hasRule(b, 'Beguiling Aura') || glam) && beguiled(game, a)
  // Roll to Hit Combat: a natural 1 always fails, a natural 6 always hits
  // The Seal of Lisarde: a roll To Hit of 3+ always succeeds (not the mount's)
  const seal = !g.isMount && itemFlag(a, 'seal', { personal: true })
  const hitOk = d => charmed ? d === 6 : base0 <= 1 ? true : d === 6 || (d !== 1 && (d >= need || (seal && d >= 3))) // (WS 0 targets are hit automatically)
  let dice = rollDice(game.rng, n)
  // Re Rolls: no single dice is re-rolled more than once
  let rerolled = dice.map(() => false)
  const reroll = (which, why) => {
    const idx = dice.map((d, i) => i).filter(i => !rerolled[i] && which(dice[i]))
    if (!idx.length) return
    const again = rollDice(game.rng, idx.length)
    idx.forEach((i, k) => { dice[i] = again[k]; rerolled[i] = true })
    g = { ...g, label: g.label + `; ${idx.length} re-rolled (${why}) [${again.join(' ')}]` }
  }
  // Sun's Out: re-roll natural 1s To Hit, AP improved by 1
  const sun = inAura(game, 'evilSun', a)
  // Big Ruck: re-roll natural 1s To Hit too
  if (sun || a.status.bigRuck) reroll(d => d === 1, `natural 1s, ${sun ? "Sun's Out" : 'Big Ruck'}`)
  // Prayers of Saint Halvar, Hammer of Saint Halvar: natural 1s To Hit re-rolled in combat
  if (a.status.hammerOfSaintHalvar) reroll(d => d === 1, 'natural 1s, Hammer of Saint Halvar')
  // Order of the Ember Heart: a Grand Master, Lord Commander or Inner Circle of the Order
  // re-rolls natural 1s To Hit and To Wound in the Combat phase
  const fieryRR = !g.isMount && orderOf(a) === 'ember-heart' && isOrderMaster(a)
  if (fieryRR) reroll(d => d === 1, 'natural 1s, Order of the Ember Heart')
  // Prayers of Varg, Winter's Chill: attacks on the priest and its unit re-roll natural 6s To Hit
  if (b.status.wintersChill) reroll(d => d === 6, "natural 6s, Winter's Chill")
  if (sun) g = { ...g, ap: (g.ap || 0) - 1 }
  if (a.status.apBonus) g = { ...g, ap: (g.ap || 0) - a.status.apBonus } // Unmade Vessel
  // Hatred: re-roll failed To Hit rolls against a hated enemy in the first
  // round of combat (taken as the turn the combat began with a charge)
  // (whom it hates: orders.js hates — Hatred (X) from its own rules, its Order, a Witch Hunter...)
  // (The Soiled Tapestry: every enemy hates the unit carrying it)
  const hated = !g.isMount && (hates(rulesOf(a), b) || itemFlag(b, 'soiled') || ((a.status.charged) && itemFlag(a, 'knightlyTemper', { personal: true })))
  // (Eternal Hatred: against Ilthari, in every round — not its mount)
  if (hated && (a.status.charged || b.status.charged || eternalHatred(a, b))) reroll(d => !hitOk(d), 'misses, Hatred')
  // magic items: Pearl Daggers, The Reeking Axe re-roll failed rolls To Hit
  if (wf.rerollHit) reroll(d => !hitOk(d), `misses, ${itemName(g.itemId)}`)
  if (a.status.coinNow?.hit && !g.isMount) reroll(d => !hitOk(d), `misses, ${a.status.coinNow.hit}`)
  // Virtue of Audacity: failed rolls To Hit re-rolled against an enemy of higher Weapon Skill
  if (!g.isMount && itemFlag(a, 'audacity', { personal: true }) && tWSb > g.ws) reroll(d => !hitOk(d), 'misses, Virtue of Audacity')
  // Virtue of Noble Disdain, Banner of Honourable Warfare: in the first round, against an enemy
  // equipped with missile weapons, failed rolls To Hit re-rolled
  if (!g.isMount && itemFlag(a, 'honourable') && (a.status.charged || b.status.charged) && (b.kit?.ranged || []).length) reroll(d => !hitOk(d), 'misses, against a foe with missile weapons')
  // Virtue of Confidence: in a challenge, failed rolls To Hit re-rolled
  if (duel && !duel.notChallenge && !g.isMount && itemFlag(a, 'confidence', { personal: true })) reroll(d => !hitOk(d), 'misses, Virtue of Confidence')
  // Backstabber's Blade: in the enemy's rear arc, failed rolls To Hit and To Wound are
  // re-rolled; in its flank arc, failed rolls To Wound
  const stabArc = wf.backstab ? b.engagedWith?.[(hostOf(game, a) || a).id] : null
  if (stabArc === 'rear') reroll(d => !hitOk(d), `misses, ${itemName(g.itemId)} in the rear`)
  // Crystal Ball: once a turn, one To Hit (or To Wound) roll against a friendly character within
  // the bearer's Command range is re-rolled (on the first hit; a guess at when the player would use it)
  const ball = (b.troopType || []).includes('Character') && crystalBall(game, b)
  if (ball) {
    const i = dice.findIndex((d, k) => hitOk(d) && !rerolled[k])
    if (i >= 0) { ball.status.ballTurn = `${game.round}:${game.active}`; const r = rollDice(game.rng, 1)[0]; g = { ...g, label: g.label + `; a hit of ${dice[i]} re-rolled (${ball.name}'s Crystal Ball) [${r}]` }; dice[i] = r; rerolled[i] = true }
  }
  // Glittering Scales: once a turn the wearer's player may force the enemy to roll again one To Hit roll against
  // it (used on the first hit; our guess at when a player would use it)
  if (itemFlag(b, 'glitterScales', { personal: true }) && b.status.scalesTurn !== `${game.round}:${game.active}`) {
    const i = dice.findIndex((d, k) => hitOk(d) && !rerolled[k])
    if (i >= 0) { b.status.scalesTurn = `${game.round}:${game.active}`; const r = rollDice(game.rng, 1)[0]; g = { ...g, label: g.label + `; a hit of ${dice[i]} re-rolled (Glittering Scales) [${r}]` }; dice[i] = r; rerolled[i] = true }
  }
  // Moonsilver Weapons: a single non-magical hand weapon, natural 1s To Hit re-rolled
  if (moonsilverWeapons(a) && !g.isMount && !g.itemId && /hand weapon/i.test(g.weapon || '') && !/additional|two hand/i.test(g.weapon || '') && dice.includes(1)) reroll(d => d === 1, 'Moonsilver Weapons')
  // Primal Fury: natural 1s To Hit re-rolled (hornkin.js)
  if (inPrimalFury(game, a) && dice.includes(1)) reroll(d => d === 1, 'Primal Fury')
  // Incantation of Cursed Blades, Soul Reaper: natural 1s To Hit re-rolled (tombkings.js)
  else if (!g.isMount && dice.includes(1) && ((game.effects || []).some(e => e.kind === 'djaf' && e.unitId === (hostOf(game, a) || a).id) || soulMarked(game, a, duel?.model ? duel.host : duel?.unit || b))) reroll(d => d === 1, soulMarked(game, a, duel?.unit || b) ? 'Soul Reaper' : "Djaf's Incantation")
  // Ghostsight: failed To Hit rolls re-rolled against magic (hornkin.js)
  if (ghostsight(a, b, saveFor(b, {}))) reroll(d => !hitOk(d), 'Ghostsight')
  // Armour of the Damned: successful rolls To Hit against its wearer re-rolled in combat
  if (itemFlag(b, 'damned', { personal: true })) reroll(hitOk, 'Armour of the Damned')
  // Rune of the Dauntless: in a challenge, failed rolls To Hit re-rolled
  if (duel && itemFlag(a, 'dauntless', { personal: true })) reroll(d => !hitOk(d), 'Rune of the Dauntless')
  // Mark of Endurance: attacks directed at it re-roll natural 6s To Hit (first: they must)
  // (Unmade of Endurance: the same against an Unmade of Endurance — unmade.js)
  if ((enduranceFlies(b) || (!duel?.model && enduranceSixes(duel?.unit || b))) && dice.includes(6)) reroll(d => d === 6, 'Mark of Endurance')
  // The Golden Shield: attacks directed at its bearer re-roll natural 6s To Hit
  if (itemFlag(b, 'goldenShield', { personal: true }) && dice.includes(6)) reroll(d => d === 6, 'the Golden Shield')
  // Dragonhide Banner: its unit re-rolls natural 1s To Hit
  if (itemFlag(a, 'dragonhide') && dice.includes(1)) reroll(d => d === 1, 'the Dragonhide Banner')
  // Rune of Reckoning: each Rune of Reckoning re-rolls a single natural 1 To Hit in the Combat phase
  if (wf.grudge) { let k = wf.grudge; reroll(d => d === 1 && k-- > 0, `Rune of Reckoning${wf.grudge > 1 ? 's' : ''}`) }
  // Feint and Dodge / The Wandering Duelists: once per game, successful rolls To Hit re-rolled (renegade.js)
  if (dice.some((d, k) => hitOk(d) && !rerolled[k]) && feintAndDodge(game, b)) reroll(hitOk, 'Feint & Dodge')
  // Backstab: in an enemy's flank or rear, failed rolls To Hit re-rolled (chaosdwarfs.js)
  else if (!g.isMount && backstabs(a, b, hostOf(game, a)) && dice.some(d => !hitOk(d))) reroll(d => !hitOk(d), 'misses, Backstab')
  // Spiteful Shield: each natural 1 To Hit (and To Wound, below) against its bearer in combat: a S4 hit
  // back on that attacker
  let spite = itemFlag(b, 'spiteful', { personal: true }) ? dice.filter(d => d === 1).length : 0
  let hits = dice.filter(hitOk).length
  // Unmade Blade: each natural 1 To Hit is a hit on the wielder's own unit (or the wielder)
  // Accursed Mirror: natural 1s To Hit a S3 AP -1 hit on its own unit
  if (!g.isMount && dice.includes(1) && (game.effects || []).some(e => e.kind === 'accursedMirror' && e.unitId === (hostOf(game, a) || a).id)) { const ones = dice.filter(d => d === 1).length; const own = hostOf(game, a) || a; say(game, 'bad', `The Accursed Mirror: ${ones} natural 1${ones === 1 ? '' : 's'} — Strength 3 hits on ${own.name}.`); spellHits(game, own, ones, 3, -1, { label: 'Accursed Mirror: ' }) }
  if (wf.unmadeBlade && dice.includes(1)) { const ones = dice.filter(d => d === 1).length; const own = hostOf(game, a) || a; say(game, 'bad', `The Unmade Blade turns: ${ones} hit${ones === 1 ? '' : 's'} on ${own.name}.`); impactResolve(game, a, own, ones, g.s, g.ap) }
  // Poisoned Attacks: a natural 6 To Hit adds +2 to that hit's roll To Wound
  // (not with a magic weapon, nor when the hit needed 7+ or was automatic)
  // (a mount's Poisoned Attacks are the mount's alone: mountUp records them in a.mountRules)
  // The Spider Banner: a unit Poisoned already wounds automatically on a natural 5 or 6 To Hit
  const poisonOn = itemFlag(a, 'spiderBanner') && a.special.has('Poisoned Attacks') ? 5 : 6
  // (Mantle of the Damsel Isaure: its bearer is immune to Poisoned Attacks)
  // (Mighty Constitution: Taeron is immune to Poisoned Attacks)
  const poisoned = !itemFlag(b, 'poisonImmune', { personal: true }) && !mightyConstitution(b) && hasRule(a, 'Poisoned Attacks') && (!a.mountRules?.includes('Poisoned Attacks') || g.isMount) && !g.itemId && base0 > 1 ? dice.filter(d => d >= poisonOn && hitOk(d)).length : 0
  const label = `Initiative ${I}: ${a.name} — ${g.label} (${g.weapon}), ${n} attack${n === 1 ? '' : 's'}`
  const hitMods = [afraidOfB && '-1, Fear', slimy && '-1, Slimy Shanks', mist && (wovenMist(game, b) ? '-1, Woven Mist' : '-1, the Light of Protection'), flies && '-1, Cloud of Flies', ash && '-1, the Storm of Ash', netted && '-1, a Tangle of Snarelings', collar && '-1, the Collar of Old Grunter', hitBonus && `+${hitBonus}, ${itemName(g.itemId)}`, hitPen && `-${hitPen}, ${(b.items || []).filter(id => ITEM_EFFECTS[id]?.flags?.hitPenalty).map(itemName).join(' and ')}`, tWSb > tWS && 'target WS +1, Big Red Raggedy Flag'].filter(Boolean)
  say(game, 'roll', `${label}. To Hit WS${g.ws} against WS${tWSb} need ${Math.max(2, Math.min(need, 6))}+${hitMods.length ? ` (${hitMods.join('; ')})` : ''}: [${dice.join(' ')}] — ${hits} hit${hits === 1 ? '' : 's'}.`)
  const spiteBack = () => { if (spite) { say(game, 'roll', `${b.name}'s Spiteful Shield bites back: ${spite} Strength 4 hit${spite === 1 ? '' : 's'} on ${a.name}.`); spellHits(game, a, spite, 4, 0, { label: 'Spiteful Shield: ' }); spite = 0 } }
  if (!hits) { spiteBack(); return 0 }
  // Ethereal (as given by Spectral Steed): only magical attacks harm it
  if (hasRule(b, 'Ethereal') && !hasRule(a, 'Magical Attacks') && !(g.rules || []).includes('Magical Attacks')) { say(game, 'roll', `${b.name} is Ethereal: only magical attacks can wound it.`); return 0 }
  // Hammer of Righteousness: a Leadership test for each hit; failed, the hit wounds
  // automatically with no Armour Roll (Ward and Regeneration as normal)
  let righteous = 0
  if (wf.ldTestHits) {
    const ld = leadershipFor(game, b).value
    const tests = Array.from({ length: hits }, () => rollDice(game.rng, 2))
    righteous = tests.filter(t => t[0] + t[1] > ld).length
    say(game, 'roll', `${itemName(g.itemId)}: ${b.name} tests Leadership ${ld} for each of ${hits} hit${hits === 1 ? '' : 's'}: [${tests.map(t => t.join('+')).join(' ')}] — ${righteous} failed (wounded automatically, no Armour Roll).`)
    hits -= righteous
  }
  const righteousLost = righteous ? autoWounds(game, a, b, righteous, g, duel) : 0
  if (!hits) return righteousLost
  // Oathblade (2+), Meteor Hammer (3+): always wounds on that roll
  // (dwarfs.js: the Slayers and the Deathwhirl always wound on a 4+)
  // (Master Rune of Dragon Slaying: 2+ against a behemoth)
  const wOn = Math.min(wf.woundOn || 7, woundsOnFour(a) || (!g.isMount && itemFlag(a, 'woundOnFour', { personal: true })) ? 4 : 7, wf.woundOnBehemoth && /Behemoth/.test((b.troopType || []).join(' ')) ? wf.woundOnBehemoth : 7)
  const woundOn = wOn < 7 ? wOn : null
  const wn0 = toWoundNeed(g.s, T)
  const wn = woundOn ? Math.min(wn0 ?? 7, woundOn) : wn0
  if (wn == null) { say(game, 'roll', `S${g.s} cannot wound T${T}.`); return 0 }
  let wd = rollDice(game.rng, hits)
  let note = poisoned ? ` (${poisoned} poisoned hit${poisoned === 1 ? '' : 's'}: +2 To Wound on the first ${poisoned === 1 ? 'die' : poisoned + ' dice'})` : ''
  const plus = i => (i < poisoned ? 2 : 0)
  // (Unmade Flesh: its bearer is never wounded on a roll of 2)
  const flesh = itemFlag(b, 'unmadeFlesh', { personal: true })
  const wOk = (d, i) => d !== 1 && !(flesh && d === 2) && d + plus(i) >= wn
  const wRer = wd.map(() => false)
  // Deathcheater: once a game, a single successful roll To Wound against its bearer re-rolled
  if (itemFlag(b, 'deathcheater', { personal: true }) && !b.status.deathcheated) { const i = wd.findIndex((d, k) => wOk(d, k)); if (i >= 0) { b.status.deathcheated = true; const r = rollDice(game.rng, 1)[0]; say(game, 'roll', `${b.name} is a Deathcheater: a roll To Wound of ${wd[i]} re-rolled — ${r}.`); wd[i] = r; wRer[i] = true } }
  const rerollW = (which, why) => {
    const idx = wd.map((d, i) => i).filter(i => !wRer[i] && which(wd[i], i))
    if (!idx.length) return
    const again = rollDice(game.rng, idx.length)
    idx.forEach((i, k) => { wd[i] = again[k]; wRer[i] = true })
    note += ` (${why}: ${idx.length} re-rolled [${again.join(' ')}])`
  }
  if (a.status.hammerOfSaintHalvar) rerollW(d => d === 1, 'natural 1s, Hammer of Saint Halvar')
  if (fieryRR) rerollW(d => d === 1, 'natural 1s, Order of the Ember Heart')
  if (a.status.coinNow?.wound && !g.isMount) rerollW((d, i) => !wOk(d, i), `failed, ${a.status.coinNow.wound}`)
  // Virtue of the Joust: failed rolls To Wound re-rolled when using a lance
  if (!g.isMount && itemFlag(a, 'joust', { personal: true }) && /lance/i.test(g.weapon || '')) rerollW((d, i) => !wOk(d, i), 'failed, Virtue of the Joust')
  // (Hornstones, Bestial Fury: Hornkin within 12" of their Hornstone re-roll natural 1s To Wound)
  if (!g.rerollWound1 && bestialFury(game, a, dtp)) rerollW(d => d === 1, 'Bestial Fury (the Hornstone)')
  if (g.rerollWound1) rerollW(d => d === 1, `natural 1s, ${g.wrath ? 'Totem of Wrath' : g.weapon?.includes('Vorgash') ? 'the Axes of Vorgash' : hasRule(a, 'Choppers') && a.status.charged ? 'Choppers' : 'Tapestry of Saint Halvar\'s Triumph'}`)
  // Sword of Justice: failed To Wound rolls are rolled again
  if (wf.rerollWound) rerollW((d, i) => !wOk(d, i), `failed, ${itemName(g.itemId)}`)
  // Armour of the Ages: successful rolls To Wound against its wearer re-rolled
  else if ([b.troopType?.includes('Character') ? b : null, duel?.unit, duel?.model].some(x => x && itemFlag(x, 'ages', { personal: true }))) rerollW((d, i) => wOk(d, i), 'successful, the Armour of the Ages')
  // Murderous: a single non-magical hand weapon, natural 1s To Wound re-rolled (darkelves.js)
  else if (murderous(a, g)) rerollW(d => d === 1, 'natural 1s, Murderous')
  // Beast Reaver: failed rolls To Wound re-rolled against Hornkin Herds
  if (wf.rerollWoundVs && b.army === wf.rerollWoundVs) rerollW((d, i) => !wOk(d, i), `failed, ${itemName(g.itemId)} against Hornkin`)
  // Ironhide Talisman: rolls To Wound of a natural 6 against its bearer are re-rolled
  if (itemFlag(b, 'ironhide', { personal: true })) rerollW(d => d === 6, 'natural 6s, Ironhide Talisman')
  if (itemFlag(b, 'spiteful', { personal: true })) spite += wd.filter(d => d === 1).length
  spiteBack()
  if (stabArc === 'rear' || stabArc === 'left' || stabArc === 'right') rerollW((d, i) => !wOk(d, i), `failed, ${itemName(g.itemId)} in the ${stabArc === 'rear' ? 'rear' : 'flank'}`)
  // Flail of Wrecks: a natural 1 To Wound in the Combat phase: -1 Initiative for the rest of the game
  if (wf.flailWrecks && wd.includes(1)) { for (const m of a.models) m.profile = { ...m.profile, I: Math.max(1, (m.profile.I ?? 1) - 1) }; say(game, 'bad', `${a.name} rolled a natural 1 To Wound with the ${itemName(g.itemId)}: -1 Initiative for the rest of the game.`) }
  const wounds = wd.filter((d, i) => wOk(d, i))
  // Killing Blow: a natural 6 To Wound in combat against infantry or
  // cavalry allows no armour or Regeneration save and takes all the model's Wounds
  // Jade Amulet, Armour of Fortune: immune to Killing Blow (saved as usual, one Wound)
  const kbImmune = itemFlag(b, 'kbImmune', { personal: true }) || (itemFlag(b, 'anointed', { personal: true }) && !!blessingWard(game, b, 0))
  // Monster Slayer: the same against monsters (no armour or Regeneration save, all its Wounds)
  const monster = /Monstrous Creature|Behemoth/.test((b.troopType || []).join(' ')) || b.category === 'monster'
  // Virtue of Heroism: unless using a magic weapon, Killing Blow and Monster Slayer
  const heroic = !g.isMount && !g.itemId && itemFlag(a, 'heroism', { personal: true })
  const slayer = (heroic || hasRule(a, 'Monster Slayer') || (g.rules || []).includes('Monster Slayer')) && monster
  const kb = (((heroic || hasRule(a, 'Killing Blow') || (g.rules || []).includes('Killing Blow')) && /Infantry|Cavalry/.test(troopType(b).name) && !kbImmune) || slayer)
  let killing = kb ? wounds.filter(d => d === 6).length : 0
  const killingRolled = killing
  const baneN = g.bane ? Number((g.bane.match(/\((\d+)/) || [])[1] || 1) : 0
  const sixes = baneN ? wounds.filter(d => d === 6).length : 0
  say(game, 'roll', `To Wound S${g.s} against T${T} need ${wn}+: [${wd.join(' ')}]${note} — ${wounds.length} wound${wounds.length === 1 ? '' : 's'}${sixes ? ` (${sixes} natural 6, Armour Bane ${baneN})` : ''}.`)
  if (!wounds.length) return 0
  // saves: the shield is not used with a two-handed weapon; Parry for infantry with hand weapon and shield
  // (a champion in a challenge saves with its own magic armour and talismans: damage.js champView)
  const bs = duel?.model?.role === 'champion' && b.champItems?.length ? champView(b) : b
  // a Motley Crew defender: the weapon of the majority of its models (Motley Crew, Different Armour)
  const kitCount = new Map()
  if (b.motley) for (const m of alive(b).filter(m => m.role === 'rank')) kitCount.set(m.kit || '', (kitCount.get(m.kit || '') || 0) + 1)
  const majorityKit = [...kitCount.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || null
  const bw = meleeWeaponOfKit(bs, majorityKit, { charged: !!b.status.charged })
  const magicalAtt = (g.rules || []).includes('Magical Attacks') || hasRule(a, 'Magical Attacks')
  const sv = saveFor(bs, { twoHanded: bw.twoHanded, magical: magicalAtt, flaming: (g.rules || []).includes('Flaming Attacks'), strength: g.s, fearsome: hasRule(a, 'Fear') || hasRule(a, 'Terror') })
  let av = sv.armour
  // Master Rune of Odric the Mad: no Armour Roll (runes.js)
  if (wf.noArmour) av = 7
  // Sword of Ruin: no Ward or Regeneration save either
  if (wf.ruin) { sv.ward = null; sv.noWards = true; sv.regen = null }
  // Blade of Revered Neqtal: no Untouchable save (Regeneration as normal)
  if (wf.noWard) { sv.ward = null; sv.noWards = true }
  // Rune of Banishment: no Untouchable save for a Weave-spawned model
  if (wf.noWardWarp && hasRule(b, 'Weave-spawned')) { sv.ward = null; sv.noWards = true }
  const parry = /Infantry/.test(troopType(b).name) && troopType(b).name !== 'Monstrous Infantry' && bs.kit?.shield && /^(rune:)?hand weapon$/.test(bw.key)
  if (parry && av > 3) av = Math.max(3, av - 1)
  let killedByBlow = 0
  if (killing) {
    say(game, 'roll', `${killing} ${slayer ? 'MONSTER SLAYING BLOW' : 'KILLING BLOW'}${killing === 1 ? '' : 'S'} (natural 6 To Wound): no armour or Regeneration save.`)
    // Killing Blow: the Ward still applies
    if (sv.ward) {
      const kd = rollDice(game.rng, killing)
      const ks = kd.filter(d => d >= sv.ward).length
      say(game, 'roll', `${b.name} Untouchable save ${sv.ward}+${sv.wardText ? ` (${sv.wardText})` : ''} against the Killing Blow${killing === 1 ? '' : 's'}: [${kd.join(' ')}] — ${ks} saved.`)
      killing -= ks
    }
  }
  if (killing) {
    if (duel) {
      const m = duel.model || alive(duel.unit)[0]
      killedByBlow = m ? m.wounds : 0
      if (m) { if (duel.model) { m.wounds = 0; duel.host.status.woundsTaken = (duel.host.status.woundsTaken || 0) + killedByBlow; say(game, 'bad', `${duel.name} is slain.`); if (isDead(duel.host)) removeUnit(game, duel.host, 'wiped out') } else applyWounds(game, duel.unit, killedByBlow, 'Killing Blow') }
    } else applyMultipleDamage(game, b, Array(killing).fill(99), 'Killing Blow')
  }
  const rest = wounds.length - killingRolled
  if (!rest) return (duel ? killedByBlow : killing) + righteousLost
  // Dragonhide Cloak: the AP of a non-magical weapon used against its wearer is reduced by 2
  if (itemFlag(bs, 'dragonhide', { personal: true }) && !g.itemId && g.ap) g = { ...g, ap: Math.min(0, g.ap + 2) }
  // Cleaving Blow: a natural 6 To Wound in combat against regular or heavy infantry, light or
  // heavy cavalry or war beasts — no armour or Regeneration save; The Brass Cleaver: on a 6, no save at all
  const cleaveTroop = /Heavy Infantry|Regular Infantry|Heavy Cavalry|Light Cavalry|War Beast/.test((b.troopType || []).join(' '))
  const cleaveN = ((hasRule(a, 'Cleaving Blow') || (g.rules || []).includes('Cleaving Blow')) && cleaveTroop) || wf.brassCleaver ? Math.max(0, wounds.filter(d => d === 6).length - killingRolled) : 0
  if (cleaveN) say(game, 'roll', `${cleaveN} ${wf.brassCleaver ? 'blow' : 'CLEAVING BLOW'}${cleaveN === 1 ? '' : 'S'} (natural 6 To Wound): no armour${wf.brassCleaver ? ', Ward' : ''} or Regeneration save.`)
  const okS = (d, i) => { if (i < cleaveN) return false; const needS = av - (sv.apImmune ? 0 : (g.ap - (i < sixes ? baneN : 0))); return d !== 1 && needS <= 6 && d >= needS }
  const rr = itemSaveRerolls(game, bs, 'armour', rollDice(game.rng, rest), okS)
  let sd = rr.dice
  // Haldrin's Reaper: successful Armour Rolls against its wounds must be re-rolled
  if (wf.haldrin && sd.some((d, i) => okS(d, i))) { const was = sd; sd = sd.map((d, i) => okS(d, i) ? rollDice(game.rng, 1)[0] : d); rr.note = `${rr.note || ''}; saves re-rolled (Haldrin's Reaper) [${was.join(' ')}] → [${sd.join(' ')}]` }
  let unsaved = 0
  sd.forEach((d, i) => { if (!okS(d, i)) unsaved++ })
  say(game, 'roll', `${b.name} Armour Roll ${av}+ (${sv.armourText}${parry ? ' + Parry' : ''}${bw.twoHanded && b.kit?.shield ? ', no shield with a two-handed weapon' : ''})${g.ap ? `, AP ${g.ap}` : ''}: [${sd.join(' ')}]${rr.note} — ${rest - unsaved} saved, ${unsaved} unsaved.`)
  // an Untouchable save after a failed Armour Roll (More Than One Save)
  unsaved -= charmedWard(game, bs, unsaved, sv)
  // (the Brass Cleaver's 6s allow no Untouchable save)
  const wardPool = wf.brassCleaver ? unsaved - cleaveN : unsaved
  if (wardPool > 0 && sv.ward) {
    const wr = itemSaveRerolls(game, bs, 'ward', rollDice(game.rng, wardPool), d => d >= sv.ward)
    // (Spangleshard: a natural 1 destroys it)
    if (wr.dice.includes(1) && itemLeft(bs, 'spangleshard') > 0 && sv.wardText === 'Spangleshard') { spendItem(bs, 'spangleshard'); bs.wards = (bs.wards || []).filter(x => x.item !== 'spangleshard'); say(game, 'bad', `${b.name}'s Spangleshard shatters on a natural 1.`) }
    const ws = wr.dice.filter(d => d >= sv.ward).length
    say(game, 'roll', `${b.name} Untouchable save ${sv.ward}+${sv.wardText ? ` (${sv.wardText})` : ''}: [${wr.dice.join(' ')}]${wr.note} — ${ws} saved.`)
    unsaved -= ws
  }
  // Regeneration: the wound is lost and still counts for the result
  let regenSaved = 0
  // (Cleaving Blows allow no Regeneration save either)
  if (unsaved && sv.regen && unsaved - cleaveN > 0) {
    const rd = itemSaveRerolls(game, b, 'regen', rollDice(game.rng, unsaved - cleaveN), d => d >= sv.regen).dice
    regenSaved = rd.filter(d => d >= sv.regen).length
    say(game, 'roll', `${b.name} Regeneration ${sv.regen}+: [${rd.join(' ')}] — ${regenSaved} Wound${regenSaved === 1 ? '' : 's'} recovered (still counted in the Melee Outcome).`)
  }
  if (!unsaved) return duel ? killedByBlow : killing
  // Bog-wood Staff: for each unsaved Wound inflicted with it, the bearer recovers a lost Wound
  if (wf.healOnWound) {
    const m = alive(a)[0]
    const back = m ? Math.min(unsaved, (m.startW || 1) - m.wounds) : 0
    if (back > 0) { m.wounds += back; say(game, 'good', `${a.name} recovers ${back} Wound${back === 1 ? '' : 's'} (${itemName(g.itemId)}).`) }
  }
  // Foebreaker: the wounded model takes a Toughness test; failing it, -1 WS and A through the next Combat
  // phase. Morning Star of Dauvergne: any magic weapon of the wounded model is destroyed.
  if (wf.foebreaker && unsaved) foebreak(game, b, duel)
  if (wf.breaksMagicWeapons && unsaved) breakMagicWeapon(game, duel ? (duel.model ? duel.host : duel.unit) : b)
  if (isWarMachine(b)) b.status.crewWoundsLost = (b.status.crewWoundsLost || 0) + (unsaved - regenSaved)
  // Dry as Dust: a Flaming Attack's unsaved wounds, 4+ one more Wound each (tombkings.js)
  if ((g.rules || []).includes('Flaming Attacks')) { const dw = duel ? (duel.model ? duel.host : duel.unit) : b; const extra = dryAsDust(game, dw, unsaved - regenSaved); if (extra) applyWounds(game, dw, extra, 'Dry as Dust') }
  if (duel) {
    const m = duel.model || alive(duel.unit)[0]
    const had = m ? m.wounds : 0
    const mwD = multipleDamage(g.rules, sides => dN(game.rng, sides))
    const dealt = mwD ? Array.from({ length: unsaved - regenSaved }, () => mwD()).reduce((x, y) => x + y, 0) : unsaved - regenSaved
    if (mwD && dealt) say(game, 'roll', `Multiple Damage: ${unsaved - regenSaved} unsaved wound${unsaved - regenSaved === 1 ? '' : 's'} cause ${dealt} Wounds.`)
    const lose = Math.min(had, dealt)
    if (duel.model) {
      m.wounds -= lose
      duel.host.status.woundsTaken = (duel.host.status.woundsTaken || 0) + lose
      say(game, lose ? 'bad' : '', `${duel.name} loses ${lose} Wound${lose === 1 ? '' : 's'}${m.wounds <= 0 ? ' and falls' : ''}.`)
      if (m.wounds <= 0) duel.host.status.lost_champion = true
      if (isDead(duel.host)) removeUnit(game, duel.host, 'wiped out')
    } else applyWounds(game, duel.unit, lose, `${a.name}'s attacks in the challenge`)
    // Overkill Characters: a CHARACTER that kills its opponent with more unsaved
    // wounds than it had Wounds left: +1 a wound over (the Wounds lost count as usual)
    if (!duel.notChallenge && (unsaved - regenSaved) > had && (a.troopType || []).includes('Character')) duel.overkill = (duel.overkill || 0) + (unsaved - regenSaved - had)
    return Math.min(had, unsaved) + killedByBlow
  }
  // Multiple Damage (X) on the weapon: each unsaved wound
  // becomes X Wounds on one model; Regeneration is rolled per wound first
  const mw = multipleDamage(g.rules, sides => dN(game.rng, sides))
  if (mw && unsaved - regenSaved > 0) {
    const each = Array.from({ length: unsaved - regenSaved }, () => mw())
    const taken = applyMultipleDamage(game, b, each, `${a.name}'s ${g.weapon}, Multiple Damage`)
    return taken + killing
  }
  applyWounds(game, b, unsaved - regenSaved, `${a.name}'s attacks`)
  return unsaved + killing
}

// Gobblers Go Wild: a Gobbler Herd that breaks: with five or more Cave Gobblers, every
// unit (friend or foe) within 2D6" suffers D3 Strength 5 hits, AP -1 (+1 to the D3 for every further
// five Cave Gobblers); then the herd counts as destroyed in combat and is removed.
function gobblersGoWild (game, u) {
  const gobblers = alive(u).filter(m => /cave gobbler/i.test(m.name)).length
  const at = centre(u)
  if (gobblers >= 5) {
    const d = rollDice(game.rng, 2)
    const range = d[0] + d[1]
    const plus = Math.floor(gobblers / 5) - 1
    say(game, 'bad', `${u.name} breaks: THE GOBBLERS GO WILD! ${gobblers} Cave Gobblers bounce off ${d.join('+')} = ${range}" in every direction — D3${plus ? `+${plus}` : ''} Strength 5 hits, AP -1, on every unit within reach.`)
    for (const o of onTable(game).filter(o => o !== u && !o.status.whirler && distanceBetween(u, o) <= range)) {
      const n = Math.ceil(rollDice(game.rng, 1)[0] / 2) + plus
      say(game, 'roll', `${o.name}: ${n} Strength 5 hits, AP -1.`)
      impactResolve(game, u, o, n, 5, -1)
    }
  } else say(game, 'bad', `${u.name} breaks: too few Cave Gobblers to go wild (${gobblers}).`)
  disengageAll(game, u)
  destroy(game, u, 'the gobblers went wild')
  return at
}

// ---- moves after combat ----
export function giveGround (game, u, enemies) {
  const c = centre(u)
  let v = { x: 0, y: 0 }
  for (const e of enemies) { const d = sub(c, centre(e)); const l = len(d) || 1; v = add(v, mul(d, 1 / l)) }
  const l = len(v) || 1; v = mul(v, 1 / l)
  disengageAll(game, u)
  let moved = 0
  for (; moved < 2; moved += 0.1) {
    const was = u.pos
    u.pos = add(u.pos, mul(v, 0.1))
    const blocked = onImpassable(game, u) || solid(game).some(o => o !== u && !enemies.includes(o) && (distanceBetween(u, o) < (o.side !== u.side ? 1 : 0.01)))
    if (blocked) { u.pos = was; break }
  }
  say(game, '', `${u.name} gives ground ${moved.toFixed(1)}".`)
}

function pursue (game, w, target) {
  disengageAll(game, w)
  const c = centre(w)
  // it pivots about its centre to face the fleeing enemy — as near that way as rocks and other units allow
  // (Fleeing through terrain has a fleeing unit turn aside like this; a pursuer is taken
  // to do the same rather than pivot into impassable terrain)
  const want = angleOf(sub(centre(target), c))
  const was = { pos: w.pos, facing: w.facing }
  let placed = false
  for (const da of [0, 0.26, -0.26, 0.52, -0.52, 0.79, -0.79, 1.05, -1.05, 1.31, -1.31, 1.57, -1.57]) {
    w.facing = want + da
    w.pos = add(c, mul(dirOf(w.facing), depth(w) / 2))
    if (!onImpassable(game, w) && !solid(game).some(o => o !== w && !o.status.whirler && polysOverlapC(corners(w), corners(o)))) { placed = true; break }
  }
  if (!placed) Object.assign(w, was)
  // Random Movement: each time it moves, its dice give its maximum move — in a pursuit too (3D6 for gobblers); contact with an enemy counts as a charge (moveStraight)
  const rmSpec = randomMovementDice(w)
  const rm = rmSpec ? { n: Number((String(rmSpec).match(/(\d*)D6/i) || [])[1] || 1) } : null
  // (Blood Greed: a Frenzied model with it pursues with a single D6)
  // (Cannibal Totem: a single D6 too)
  const r = rollDice(game.rng, rm ? rm.n : (bloodGreed(w) && hasRule(w, 'Frenzy')) || itemFlag(w, 'cannibal') || hungry(w) ? 1 : 2) // (The Hunger: a single D6 — vampires.js)
  // The Away End Banner: natural 1s on the Pursuit roll re-rolled
  if ((itemFlag(w, 'nomadz') || hasRule(w, 'Finest Warhorses')) && r.includes(1)) { const again = rollDice(game.rng, r.filter(x => x === 1).length); let j = 0; for (let i = 0; i < r.length; i++) if (r[i] === 1) r[i] = again[j++]; say(game, 'roll', `${w.name}: natural 1s on its Pursuit roll re-rolled (The Away End Banner): ${again.join(', ')}.`) }
  let d = r.reduce((a, b) => a + b, 0)
  let swift = rm ? ` (Random Movement ${rm.n}D6)` : ''
  if (hasRule(w, 'Swiftstride') && !rm) { const x = swiftDie(game, w); d += x; swift = ` + ${x} Swiftstride` }
  if (resolute(w, d) !== d) { d = resolute(w, d); swift += ' - 1 Resolute' }
  // (Unmade of Rapture: +1 to a Pursuit roll — unmade.js)
  if (raptureSpeed(w)) { d += 1; swift += ' + 1 Unmade of Rapture' }
  // Battle Hunger: +D3 to the Pursuit roll
  if ((w.items || []).includes('battle-hunger')) { const x = Math.ceil(rollDice(game.rng, 1)[0] / 2); d += x; swift += ` + ${x} Battle Hunger` }
  const need = distanceBetween(w, target)
  if (!target.status.removed && d >= need) {
    if (target.status.fleeing) {
      say(game, 'roll', `${w.name} pursues: Pursuit roll ${r.join('+')}${swift} = ${d}", needs ${need.toFixed(1)}" — CAUGHT. ${target.name} is cut down.`)
      placeInContact(game, w, target, closestArc(target, w))
      destroy(game, target, 'run down')
    } else {
      say(game, 'roll', `${w.name} pursues: Pursuit roll ${r.join('+')}${swift} = ${d}", needs ${need.toFixed(1)}" — caught the unit that fell back: they are locked in combat again; ${w.name} counts as having charged next turn.`)
      const arc = closestArc(target, w)
      if (!placeInContact(game, w, target, arc)) { say(game, '', `${w.name} cannot reach ${target.name}: there is no room.`); return }
      engage(game, w, target, arc)
      w.status.pursuedIn = true
    }
    return
  }
  say(game, 'roll', `${w.name} pursues: Pursuit roll ${r.join('+')}${swift} = ${d}", needs ${need.toFixed(1)}" — it does not catch ${target.name}.`)
  moveStraight(game, w, d)
}

// Overrun: a normal pursuit move, but directly forwards without pivoting.
function overrun (game, w) {
  const r = rollDice(game.rng, 2)
  let d = r[0] + r[1]
  let swift = ''
  if (hasRule(w, 'Swiftstride')) { const x = d6(game.rng); d += x; swift = ` + ${x} Swiftstride` }
  say(game, 'roll', `${w.name} overruns: ${r.join('+')}${swift} = ${d}" straight ahead.`)
  moveStraight(game, w, d)
}

// A pursuit (or overrun) move straight ahead.
// Pursuit Into a Fresh Enemy / Pursuit Into a New Combat: touching
//   an enemy that is not fleeing, the pursuer counts as charging it and they are engaged (locked
//   until the next turn; it counts as having charged then). A fleeing one is run down.
// Pursuit Into an Obstacle: it stops at a friendly unit.
// Pursuit Off the Battlefield: leaving the table it is removed (not
//   destroyed) and comes back in its next Compulsory Moves sub-phase where it left.
function moveStraight (game, w, d) {
  const from = { pos: { ...w.pos }, facing: w.facing }
  const r = moveStraightInner(game, w, d)
  sweptThroughWhirlers(game, w, from)
  sweptThroughVortices(game, w, from)
  return r
}
function moveStraightInner (game, w, d) {
  const f = dirOf(w.facing)
  for (let gone = 0; gone + 0.1 <= d; gone += 0.1) {
    const was = w.pos
    w.pos = add(w.pos, mul(f, 0.1))
    if (!corners(w).every(p => p.x >= 0 && p.y >= 0 && p.x <= 72 && p.y <= 48)) {
      w.pos = was
      w.status.offTable = { pos: { ...w.pos }, facing: w.facing }
      w.placed = false
      say(game, '', `${w.name} pursues off the edge of the table. It will return in its next Compulsory Moves sub-phase.`)
      return
    }
    const friend = solid(game).find(o => o !== w && o.side === w.side && distanceBetween(w, o) < 0.01)
    if (friend) { w.pos = was; say(game, '', `${w.name} stops at ${friend.name}.`); return }
    // Pursuit Into an Obstacle: it stops at impassable terrain
    if (onImpassable(game, w)) { w.pos = was; say(game, '', `${w.name} stops at the rocks.`); return }
    const foe = solid(game).find(o => o.side !== w.side && distanceBetween(w, o) < 0.01)
    if (foe) {
      if (foe.status.fleeing) { destroy(game, foe, `run down by ${w.name}`); continue }
      // Evade: a Lone character about to be contacted by a pursuing unit takes an Initiative
      // test; passed, it moves up to its Movement away from the enemy, and the pursuit goes on (always tried here)
      if (isLoneCharacter(foe) && !foe.status.whirler && !foe.status.engaged && foe.status.evadeTried !== `${game.round}:${game.active}`) {
        foe.status.evadeTried = `${game.round}:${game.active}`
        w.pos = was
        if (evade(game, foe, w)) continue
        w.pos = add(was, mul(f, 0.1))
      }
      const arc = closestArc(foe, w)
      if (!placeInContact(game, w, foe, arc)) { w.pos = was; return }
      engage(game, w, foe, arc)
      w.status.pursuedIn = true
      say(game, 'h', `${w.name} crashes into ${foe.name}: they are engaged; ${w.name} counts as having charged.`)
      return
    }
  }
}

// The Evade move: returns true when the character got out of the way
function evade (game, c, from) {
  const I = alive(c)[0]?.profile.I ?? 1
  const r = rollDice(game.rng, 1)[0]
  const passed = r === 1 || (r !== 6 && r <= I)
  say(game, 'roll', `${c.name} tries to EVADE ${from.name}: Initiative test, rolled ${r}, needs ${I} or less — ${passed ? 'passed' : 'failed'}.`)
  if (!passed) return false
  // it moves straight away from the pursuer, keeping its facing (the rule asks for no turn), up to its Movement, and may
  // not end closer to any enemy unit than it was
  const away = dirOf(angleOf(sub(centre(c), centre(from))))
  const was = { ...c.pos }
  const enemies = solid(game).filter(o => o.side !== c.side)
  const before = new Map(enemies.map(o => [o, distanceBetween(c, o)]))
  const M = movementOf(c)
  let gone = 0
  for (; gone + 0.1 <= M + 1e-9; gone += 0.1) {
    const p = c.pos
    c.pos = add(c.pos, mul(away, 0.1))
    const blocked = !corners(c).every(q => q.x >= 0 && q.y >= 0 && q.x <= 72 && q.y <= 48) || onImpassable(game, c) || solid(game).some(o => o !== c && polysOverlapC(corners(c), corners(o)))
    if (blocked) { c.pos = p; break }
  }
  if (enemies.some(o => distanceBetween(c, o) < before.get(o) - 1e-6)) { c.pos = was; gone = 0 }
  if (!gone) { say(game, '', `${c.name} has no room to evade.`); return false }
  say(game, 'good', `${c.name} evades ${gone.toFixed(1)}" away from ${from.name}.`)
  syncJoined(game)
  return true
}

// ---- challenges ----
// Issuing a challenge: one per combat, the active player first, then the
//   inactive; a character or champion in or adjacent to the fighting rank.
// Accepting a challenge / Refusing a challenge: the other side accepts with
//   one of its own, or refuses — and the challenger's side names one that must retire (no attacks,
//   none directed at it).
// To the death: a challenge both survive continues into the next round.
// Champions and Challenges: champions issue and accept as characters do.
function duellists (game, units, side) {
  const out = []
  for (const host of units.filter(u => u.side === side && !u.status.removed && !isDead(u))) {
    // a character fighting on its own (a Lone character, or one riding a monster or chariot) may challenge too
    if ((host.troopType || []).includes('Character')) out.push({ unit: host, host, name: host.name })
    for (const c of joinedOf(host).filter(c => !c.status.ladyRetired)) out.push({ unit: c, host, name: c.name })
    const ch = alive(host).find(m => m.role === 'champion')
    if (ch) out.push({ unit: host, host, model: ch, name: `${ch.name} of ${host.name}` })
    // Living Saints: every Chalice Knight may issue and accept challenges as a character does
    else if (hasRule(host, 'Living Saints')) { const k = alive(host).find(m => m.role === 'rank'); if (k) out.push({ unit: host, host, model: k, name: `a Chalice Knight of ${host.name}` }) }
    // (dwarfs.js: Fight Me!, Royal Guard: any model of the unit, as a character)
    else if (fightsLikeCharacter(host) || kingsGuard(host)) { const k = alive(host).find(m => m.role === 'rank'); if (k) out.push({ unit: host, host, model: k, name: `${k.name} of ${host.name}` }) }
  }
  return out
}
const duelDead = d => d.model ? d.model.wounds <= 0 : (d.unit.status.removed || isDead(d.unit))
const sameDuellist = (x, y) => x.unit === y.unit && !!x.model === !!y.model

async function challenge (game, units, ask) {
  const key = units.map(u => u.id).sort().join('+')
  game.challenges = game.challenges || {}
  // one carried over from the last round, if both still stand
  const old = Object.values(game.challenges).find(c => !c.refused && [c.a, c.b].every(d => units.includes(d.host) && !duelDead(d)))
  if (old) { say(game, 'h', `The challenge between ${old.a.name} and ${old.b.name} goes on.`); return old }
  const shamed = Object.values(game.challenges).find(c => c.refused && units.includes(c.a.host) && !duelDead(c.a) && c.retired.every(d => units.includes(d.host) && d.host.engagedWith?.[c.a.host.id]))
  if (shamed) { say(game, '', `${shamed.retired.map(d => d.name).join(', ')} still hides at the back after refusing the challenge.`); return shamed }
  for (const k of Object.keys(game.challenges)) if (Object.values(game.challenges[k]).some(d => d?.unit && duelDead(d))) delete game.challenges[k]
  if (!ask) return null
  for (const side of [game.active, 1 - game.active]) {
    const mine = duellists(game, units, side)
    const theirs = duellists(game, units, 1 - side)
    if (!mine.length) continue
    const who = await ask(`${game.sides[side].name}: issue a challenge in this combat?`, [['No challenge', null], ...mine.map(d => [`Challenge with ${d.name}`, d])])
    if (!who) continue
    if (!theirs.length) { say(game, '', `${who.name} issues a challenge — there is no one to answer it.`); return null }
    // The Chalice Vow, Virtue of Confidence: such a model cannot refuse a challenge
    // (Gauntlet of the Duel: a challenge its bearer issues cannot be refused)
    // (Rune of the Dauntless: must always accept)
    const mustAccept = theirs.filter(d => !d.model && (vowOf(d.unit) === 'The Chalice Vow' || (d.unit.items || []).includes('virtue-of-confidence') || (d.unit.items || []).includes('rune-of-the-dauntless')))
    if (!who.model && itemFlag(who.unit, 'gauntlet', { personal: true })) mustAccept.push(who)
    // Oathstone: a challenge issued from an Oathstone cannot be refused
    if (!who.model && hasRule(who.unit, 'Oathstone')) mustAccept.push(who)
    // (Giantbreaker: its bearer cannot refuse a challenge)
    if (theirs.some(d => !d.model && itemFlag(d.unit, 'giantbreaker', { personal: true }))) mustAccept.push(who)
    const ans = await ask(`${game.sides[1 - side].name}: ${who.name} issues a challenge. Accept it?`, [...theirs.map(d => [`Accept with ${d.name}`, d]), ...(mustAccept.length ? [] : [['Refuse', null]])])
    if (ans) {
      const c = side === 0 ? { a: who, b: ans } : { a: ans, b: who }
      game.challenges[key] = c
      say(game, 'h', `CHALLENGE: ${who.name} against ${ans.name}. They fight only each other.`)
      return c
    }
    const out = theirs.length === 1 ? theirs[0] : await ask(`${game.sides[side].name}: the challenge is refused. Who must retire from the fighting?`, theirs.map(d => [d.name, d]))
    say(game, 'h', `${game.sides[1 - side].name} refuses the challenge: ${out.name} retires to the back of its unit and will not fight.`)
    // Favour of the Mere: a character that refuses a challenge loses the Blessing
    if (!out.model) loseBlessing(game, out.unit, 'refused a challenge')
    // it stays retired while its unit is engaged with the challenger (Refusing a challenge)
    const r = { a: who, b: who, retired: [out], refused: true }
    game.challenges[key] = r
    return r
  }
  return null
}

// Skilled Duellist: he may at once issue a second challenge, fought straight away if accepted. (A refusal here
// makes no one retire — the rules name no penalty for
// this second challenge; a guess.) Returns the enemy duellist who accepted, or null.
async function secondChallenge (game, units, ask, me) {
  if (!ask) return null
  const theirs = duellists(game, units, 1 - me.host.side).filter(d => !duelDead(d) && me.host.engagedWith?.[d.host.id])
  if (!theirs.length) return null
  const go = await ask(`${game.sides[me.host.side].name}: ${me.name} has slain his foe (Skilled Duellist). Issue a second challenge?`, [['Second challenge', true], ['No', false]])
  if (!go) return null
  const ans = await ask(`${game.sides[1 - me.host.side].name}: ${me.name} issues a second challenge. Accept it?`, [...theirs.map(d => [`Accept with ${d.name}`, d]), ['Refuse', null]])
  if (!ans) { say(game, '', `The second challenge is refused.`); return null }
  const key = units.map(u => u.id).sort().join('+')
  game.challenges[key] = me.host.side === 0 ? { a: me, b: ans } : { a: ans, b: me }
  say(game, 'h', `SECOND CHALLENGE (Skilled Duellist): ${me.name} against ${ans.name}, fought at once.`)
  return ans
}

// Wounds that land automatically with no Armour Roll (Hammer of Righteousness): Ward, then
// Regeneration; on the duellist in a challenge. Returns the wounds that count for the Melee Outcome.
function autoWounds (game, a, b, n, g, duel) {
  const sv = saveFor(b, { magical: true, strength: g.s })
  let un = n
  un -= charmedWard(game, b, un, sv)
  if (un && sv.ward) { const d = rollDice(game.rng, un); const k = d.filter(x => x >= sv.ward).length; say(game, 'roll', `${b.name} Untouchable save ${sv.ward}+: [${d.join(' ')}] — ${k} saved.`); un -= k }
  const counted = un
  if (un && sv.regen) { const d = rollDice(game.rng, un); const k = d.filter(x => x >= sv.regen).length; say(game, 'roll', `${b.name} Regeneration ${sv.regen}+: [${d.join(' ')}] — ${k} recovered (still counted in the result).`); un -= k }
  if (!un) return counted
  if (duel?.model) {
    const m = duel.model
    const lose = Math.min(m.wounds, un)
    m.wounds -= lose
    duel.host.status.woundsTaken = (duel.host.status.woundsTaken || 0) + lose
    say(game, 'bad', `${duel.name} loses ${lose} Wound${lose === 1 ? '' : 's'}${m.wounds <= 0 ? ' and falls' : ''}.`)
    if (isDead(duel.host)) removeUnit(game, duel.host, 'wiped out')
  } else applyWounds(game, duel ? duel.unit : b, un, `${a.name}'s ${g.weapon}`)
  return counted
}

function foebreak (game, b, duel) {
  const m = duel?.model || alive(b).find(x => x.role === 'rank') || alive(b)[0]
  if (!m) return
  const T = m.profile.T ?? 3
  const r = rollDice(game.rng, 1)[0]
  const failed = r === 6 || (r !== 1 && r > T)
  say(game, 'roll', `Foebreaker: ${b.name} Toughness test, rolled ${r}, needs ${T} or less — ${failed ? 'FAILED: -1 Weapon Skill and Attacks until the end of the next Combat phase' : 'passed'}.`)
  if (!failed || m.status?.foebroken) return
  const was = { WS: m.profile.WS, A: m.profile.A }
  m.profile = { ...m.profile, WS: Math.max(1, (m.profile.WS ?? 1) - 1), A: typeof m.profile.A === 'number' ? Math.max(1, m.profile.A - 1) : m.profile.A }
  addEffect(game, { kind: 'statMod', spell: 'Foebreaker', side: game.active, unitId: b.id, until: 'nextStartOfTurn', revert: () => { m.profile = { ...m.profile, ...was } } })
}
function breakMagicWeapon (game, t) {
  const id = (t.items || []).find(x => ITEM_EFFECTS[x]?.weapon && itemLeft(t, x) > 0)
  if (!id) return
  spendItem(t, id)
  t.kit = null
  say(game, 'bad', `The Morning Star of Dauvergne tears ${t.name}'s ${itemName(id)} from its grasp: destroyed.`)
}

// The Crystal Ball that may help this friendly character now: its bearer within Command range, unused this turn
function crystalBall (game, c) {
  const key = `${game.round}:${game.active}`
  return game.units.find(o => o.side === c.side && o.placed && !o.status.removed && !isDead(o) && itemFlag(o, 'crystalBall', { personal: true }) && o.status.ballTurn !== key && (o === c || distanceBetween(hostOf(game, o) || o, hostOf(game, c) || c) <= commandRange(o))) || null
}

function rollSpec (game, spec) {
  spec = String(spec).split(',')[0].trim()
  const m = String(spec).match(/^(\d*)D(\d)(?:\+(\d+))?$/i)
  if (!m) return Number(spec) || 1
  let t = 0
  for (let i = 0; i < (Number(m[1]) || 1); i++) { const r = rollDice(game.rng, 1)[0]; t += Number(m[2]) === 3 ? Math.ceil(r / 2) : r }
  return t + Number(m[3] || 0)
}
// (Aura of Pain: hits with no armour or Regeneration save)
function impactResolveNoArmour (game, a, b, n, S) { return spellHits(game, b, n, S, 0, { noArmour: true, noRegen: true, nonMagical: true, label: 'Aura of Pain: ' }) }
function impactResolve (game, a, b, n, S, AP) {
  if (!n) return 0
  const T = (alive(b).find(m => m.role === 'rank') || alive(b)[0])?.profile.T ?? 3
  const need = toWoundNeed(S, T)
  if (need == null) return 0
  const d = rollDice(game.rng, n)
  // Bull Standard: failed rolls To Wound for Impact Hits re-rolled
  if (itemFlag(a, 'bullStandard') && d.some(x => x === 1 || x < need)) { const idx = d.map((x, i) => i).filter(i => d[i] === 1 || d[i] < need); const again = rollDice(game.rng, idx.length); idx.forEach((i, k) => { d[i] = again[k] }); say(game, 'roll', `${a.name}'s Bull Standard: ${idx.length} failed Impact Hit wound${idx.length === 1 ? '' : 's'} re-rolled [${again.join(' ')}].`) }
  const w = d.filter(x => x !== 1 && x >= need).length
  const sv = saveFor(b, { strength: S, fearsome: hasRule(a, 'Fear') || hasRule(a, 'Terror'), flaming: hasRule(a, 'Flaming Attacks') })
  if (sv.apImmune) AP = 0
  const okI = x => x !== 1 && sv.armour - AP <= 6 && x >= sv.armour - AP
  const ir = itemSaveRerolls(game, b, 'armour', rollDice(game.rng, w), okI)
  const sd = ir.dice
  let unsaved = sd.filter(x => !okI(x)).length
  say(game, 'roll', `Impact Hits: To Wound S${S} against T${T} need ${need}+: [${d.join(' ')}] — ${w} wounds; ${b.name} Armour Roll ${sv.armour - AP}+: [${sd.join(' ')}]${ir.note} — ${unsaved} unsaved.`)
  unsaved -= charmedWard(game, b, unsaved, sv)
  if (unsaved && sv.ward) { const wd = rollDice(game.rng, unsaved); const k = wd.filter(x => x >= sv.ward).length; unsaved -= k; say(game, 'roll', `${b.name} Untouchable save ${sv.ward}+: [${wd.join(' ')}] — ${k} saved.`) }
  const counted = unsaved // Regeneration recovers Wounds that still count for the result
  if (unsaved && sv.regen) { const rd = rollDice(game.rng, unsaved); const k = rd.filter(x => x >= sv.regen).length; unsaved -= k; say(game, 'roll', `${b.name} Regeneration ${sv.regen}+: [${rd.join(' ')}] — ${k} Wounds recovered (still counted in the result).`) }
  if (unsaved) applyWounds(game, b, unsaved, 'Impact Hits')
  return counted
}

function stomp (game, a, b, g) {
  // Crushing Tread: only the AP -2 is lost against a monster, not the stomp
  // Grinding Wheels: not used against behemoths at all
  if (g.grinding && /Behemoth/.test((b.troopType || []).join(' '))) { say(game, 'roll', `${a.name} cannot Stomp ${b.name}: a behemoth is too large for its Grinding Wheels.`); return 0 }
  if (/Monstrous Creature|Behemoth/.test((b.troopType || []).join(' ')) && g.ap && !g.grinding && !/Chariot/.test((a.troopType || []).join(' '))) g = { ...g, ap: 0 }
  // Monster Hunter's Tapestry: no Stomp Attacks against its unit
  if (itemFlag(b, 'noStomp')) { say(game, 'roll', `${a.name} cannot Stomp ${b.name}: the Monster Hunter's Tapestry.`); return 0 }
  // one roll for each model in base contact
  const rolls = Array.from({ length: g.models || 1 }, () => rollSpec(game, g.spec))
  const n = rolls.reduce((x, y) => x + y, 0)
  say(game, 'roll', `${a.name}: Stomp Attacks (${g.spec}) = ${rolls.join(' + ')}${rolls.length > 1 ? ` = ${n}` : ''} automatic Strength ${g.s} hits${g.ap ? `, AP ${g.ap}` : ''} on ${b.name}.`)
  return impactResolve(game, a, b, n, g.s, g.ap)
}

// Giant Attacks — roll a D6: 'Eadbutt on a 1, Belly Flop on a 2, Mighty Swing on a 3 or 4, Thump with Club on a
// 5, Jump Up & Down on a 6; or, against regular or heavy infantry, Pick Up And.
async function giantAttack (game, a, b, ask, g) {
  // its profile as the step began: blows at the same Initiative land together
  const S = g.s
  const WS = g.ws
  const I = g.init
  const infantry = /Regular Infantry|Heavy Infantry/.test((b.troopType || []).join(' '))
  const pick = infantry && ask ? await ask(`${a.name}: a Giant Attack (roll on the table), or Pick Up And... ${b.name}?`, [['Giant Attack', false], ['Pick Up And...', true]]) : false
  if (pick) {
    let removed = 0
    for (let k = 0; k < 50 && !isDead(b); k++) {
      const Ib = (alive(b).find(m => m.role === 'rank') || alive(b)[0]).profile.I ?? 3
      const r = rollDice(game.rng, 1)[0]
      // a characteristic test: a natural 6 always fails, a natural 1 always passes
      const passed = r === 1 || (r !== 6 && r <= Ib)
      say(game, 'roll', `Pick Up And...: ${b.name} Initiative test, rolled ${r}, needs ${Ib} or less — ${passed ? 'they dodge' : 'one is snatched up'}.`)
      if (!passed) { removed += applyWounds(game, b, (alive(b).find(m => m.role === 'rank') || alive(b)[0]).wounds, 'picked up by the Giant') }
      const go = rollDice(game.rng, 1)[0]
      if (go <= 3) { say(game, 'roll', `D6 ${go}: the Giant forgets what it was doing.`); break }
      say(game, 'roll', `D6 ${go}: the Giant reaches for another.`)
    }
    return removed
  }
  const r = rollDice(game.rng, 1)[0]
  const target = alive(b).find(m => m.role === 'rank') || alive(b)[0]
  if (r === 1) {
    const w = Math.ceil(rollDice(game.rng, 1)[0] / 2) + 1
    say(game, 'roll', `Giant Attacks D6 = 1: 'EADBUTT — one model of ${b.name} suffers D3+1 = ${w} wounds, no armour or Regeneration save.`)
    const sv = saveFor(b, { strength: S, fearsome: hasRule(a, 'Fear') || hasRule(a, 'Terror'), flaming: hasRule(a, 'Flaming Attacks') })
    if (sv.ward) { const wd = rollDice(game.rng, 1)[0]; if (wd >= sv.ward) { say(game, 'roll', `Untouchable save ${sv.ward}+: ${wd} — saved.`); return 0 } }
    return applyMultipleDamage(game, b, [w], "'Eadbutt")
  }
  if (r === 2) {
    say(game, 'roll', `Giant Attacks D6 = 2: BELLY FLOP — a 3" template on ${b.name}, Strength ${S} hits, AP -2, friend or foe.`)
    // only the wounds it does to the ENEMY count for its side
    const before = new Map(onTable(game).filter(o => o.side !== a.side).map(o => [o, o.status.woundsTaken || 0]))
    templateHits(game, centre(b), 1.5, S, -2, { except: a, label: 'Belly Flop: ', nonMagical: true })
    let lost = 0
    for (const [o, w0] of before) lost += (o.status.woundsTaken || 0) - w0
    return lost
  }
  if (r <= 4) {
    const n = rollDice(game.rng, 1)[0] + 1
    say(game, 'roll', `Giant Attacks D6 = ${r}: MIGHTY SWING — D6+1 = ${n} attacks at Strength ${S + 1}, AP -2.`)
    return strike(game, a, b, { label: 'Mighty Swing', n: 1, attacks: n, ws: WS, init: 0, s: S + 1, ap: -2, rules: [], weapon: "Giant's club" }, I, false)
  }
  if (r === 5) {
    say(game, 'roll', `Giant Attacks D6 = 5: THUMP WITH CLUB — one attack at Strength ${S + 4}, AP -4, Multiple Damage (D6), on one model.`)
    const ws = WS
    const hit = rollDice(game.rng, 1)[0]
    const need = combatToHit(ws, target.profile.WS)
    if (hit === 1 || (hit !== 6 && hit < need)) { say(game, 'roll', `To Hit need ${need}+: ${hit} — missed.`); return 0 }
    const wn = toWoundNeed(S + 4, target.profile.T)
    const wr = rollDice(game.rng, 1)[0]
    if (wn == null || wr === 1 || wr < wn) { say(game, 'roll', `Hit (${hit}); To Wound need ${wn}+: ${wr} — no wound.`); return 0 }
    const sv = saveFor(b, { strength: S + 4, fearsome: hasRule(a, 'Fear') || hasRule(a, 'Terror') })
    const okT = x => sv.armour + 4 <= 6 && x !== 1 && x >= sv.armour + 4
    const sr = itemSaveRerolls(game, b, 'armour', rollDice(game.rng, 1), okT).dice[0]
    if (sv.armour + 4 <= 6 && sr !== 1 && sr >= sv.armour + 4) { say(game, 'roll', `Hit, wounded; Armour Roll ${sv.armour + 4}+: ${sr} — saved.`); return 0 }
    if (sv.ward) { const wd = rollDice(game.rng, 1)[0]; if (wd >= sv.ward) { say(game, 'roll', `Hit, wounded; Untouchable save ${sv.ward}+: ${wd} — saved.`); return 0 } }
    const mw = rollDice(game.rng, 1)[0]
    if (sv.regen) { const rg = rollDice(game.rng, 1)[0]; if (rg >= sv.regen) { say(game, 'roll', `Hit, wounded; Regeneration ${sv.regen}+: ${rg} — the ${mw} Wounds are recovered (still counted in the result).`); return mw } }
    say(game, 'roll', `Hit (${hit}), wounded (${wr}), not saved: Multiple Damage D6 = ${mw}.`)
    return applyMultipleDamage(game, b, [mw], 'Thump with Club')
  }
  const n = rollDice(game.rng, 1)[0] + 1
  say(game, 'roll', `Giant Attacks D6 = 6: JUMP UP & DOWN — ${b.name} suffers D6+1 = ${n} Strength ${S} hits, no Armour Roll.`)
  return spellHitsCombat(game, b, n, S)
}

function spellHitsCombat (game, b, n, S) {
  const T = (alive(b).find(m => m.role === 'rank') || alive(b)[0]).profile.T ?? 3
  const need = toWoundNeed(S, T)
  const d = rollDice(game.rng, n)
  let w = need == null ? 0 : d.filter(x => x !== 1 && x >= need).length
  say(game, 'roll', `To Wound S${S} against T${T} need ${need}+: [${d.join(' ')}] — ${w} wounds, no Armour Roll.`)
  const sv = saveFor(b, { strength: S, magical: true })
  if (w && sv.ward) { const wd = rollDice(game.rng, w); w -= wd.filter(x => x >= sv.ward).length }
  const counted = w
  if (w && sv.regen) { const rd = rollDice(game.rng, w); w -= rd.filter(x => x >= sv.regen).length }
  if (w) applyWounds(game, b, w, 'Jump Up & Down')
  return counted
}
