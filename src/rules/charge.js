// Charges, charge reactions, fleeing and running down: the first two sub-phases of the Movement phase, and the
// flee moves of Compulsory Moves. Exports the steps (canDeclareCharge, declareCharge, reactionsFor, chargeRoll,
// resolveCharge, engage, destroy and more) that the battle screen (ui/phases.js) and the film replay call, and that
// shooting, combat, war machines and Random Movement use for their own charges and flights.
//
// Declaring: a model in the charging unit must see the target, and the target must be at least partly in the
//   charger's front arc. Distances may be measured first.
// Charge Reactions: Hold, Stand & Shoot or Flee.
// Hold: fleeing units cannot Hold; engaged units must Hold.
// Flee as a reaction: turn about the centre to face straight away from the charger's centre, then flee.
// Charge range: roll 2D6 and drop the lower die; charge range = M + that roll.
// Failed charge: move directly towards the target the Charge roll.
// Flank and Rear Charges: the arc the charger is in WHEN DECLARED.
// The charge move: one wheel, then straight on into contact, then a free wheel to line up flush.
// Running down: reach the fleeing target and it is removed; otherwise move the full charge range (not a failed
//   charge). Then a Leadership test to reform.
// The flee move: Flee roll 2D6, straight ahead, the full distance.
// A fleeing unit that touches or crosses the table edge is destroyed.
// Fleeing through enemy units: Peril test (4+) per model that went
//   through an enemy; ends 1" past an enemy it would land on.
// Fleeing through friendly units: passes through; ends clear of it.
// Limits of endurance: one flee move a phase; any second one is 0".
// Fleeing as a compulsory move: straight ahead as it faces.

import { raptureSpeed } from './unmade.js'
import { scurries } from './gnawkin.js'
import { danceOfDeath } from './darkelves.js'
import { traps, insignificant } from './ogres.js'
import { resolute, firstToTheFray, grudgeBound } from './dwarfs.js'
import { isPhalanx } from './renegade.js'
import { panicFromFriend } from './shooting.js'
import { loseBlessing } from './lyonne.js'
import { dangerousHere } from './terrain.js'
import { dangerousTerrainTests } from './movement.js'
import { sweptThroughVortices } from './spells.js'
import { holyFervour } from './leadership.js'
import { temperamental } from './vehicles.js'
import { orderOf, isElf } from './orders.js'
import { itemFlag } from './items.js'
import { hasRandomMovement } from './randomMovement.js'
import { sweptThroughWhirlers } from './whirlers.js'
import { add, sub, mul, dirOf, rightOf, dot, angleOf, normAngle, dist, polysOverlap } from './geometry.js'
import { corners, centre, depth, width, arcOfUnit, sideOf, distanceBetween, modelCount, isDead, hasRule, modelSlots, lanceRows } from './units.js'
import { rollDice, sumDice, rollTarget } from './dice.js'
import { say, onTable, TABLE, solid } from './game.js'
import { movementOf, isMarchingColumn, flyMovement } from './movement.js'
import { leadershipTest } from './leadership.js'
import { applyWounds, applyMultipleDamage, removeUnit, disengageAll } from './damage.js'
import { syncJoined } from './joining.js'
import { inAura, nearAura } from './spells.js'
import { chargePathTerrain, onImpassable } from './terrain.js'
import { canSee } from './sight.js'
import { unitMass } from './troops.js'

// ---- declaring ----

// Can `u` declare a charge against `t`? { ok, reason, arc }
export function canDeclareCharge (game, u, t) {
  if (u.side === t.side) return { ok: false, reason: 'that is a friendly unit' }
  // The Grudgestone: once set, no moving but to Give Ground, follow up or reform
  if (grudgeBound(u)) return { ok: false, reason: 'the Grudgestone is set: it moves only to Give Ground, follow up or reform' }
  if (t.status.whirler) return { ok: false, reason: 'a Whirler cannot be charged (Release the Whirlers!)' }
  if (u.status.whirler) return { ok: false, reason: 'a Whirler does not declare charges' }
  // (Raise Dead: Risen Zombies cannot declare a charge the turn they were raised)
  if (u.status.cannotCharge === `${game.round}:${game.active}`) return { ok: false, reason: 'it was raised from the dead this turn' }
  // Random Movement: it cannot declare a charge (it bounds into contact in Compulsory Moves)
  // Vanguard: no charge in its first turn after a Vanguard move
  if (u.status.vanguarded && game.round === 1) return { ok: false, reason: 'it made a Vanguard move: no charge in its first turn' }
  // Scouts: deployed as Scouts, no charge in its first turn
  if (u.status.scouted && game.round === 1) return { ok: false, reason: 'it was deployed as Scouts: no charge in its first turn' }
  if (hasRandomMovement(u)) return { ok: false, reason: 'a Random Movement unit cannot declare a charge; it may bound into contact in Compulsory Moves' }
  if (u.status.fleeing) return { ok: false, reason: 'it is fleeing' }
  if (u.status.stupid) return { ok: false, reason: 'it is Stupid this turn' }
  if (u.status.engaged) return { ok: false, reason: 'it is engaged in combat' }
  if (u.status.rallied) return { ok: false, reason: 'it rallied this turn' }
  if (u.status.declaredCharge) return { ok: false, reason: 'it has already declared a charge' }
  if (u.status.chargeFailed) return { ok: false, reason: 'it has already failed a charge this turn' }
  if (u.status.noChargeSpell) return { ok: false, reason: 'a spell stops it charging this turn' }
  if (/war machine/.test(u.category)) return { ok: false, reason: 'war machines cannot charge' }
  if (!inFrontArc(u, t)) return { ok: false, reason: `${t.name} is not in its front arc` }
  if (!canSee(game, u, t)) return { ok: false, reason: `it cannot see ${t.name}` }
  // Who Can Charge: no impossible charge — beyond the maximum possible range
  if (distanceBetween(u, t) > maxChargeRange(u, game)) return { ok: false, reason: `${t.name} is ${distanceBetween(u, t).toFixed(1)}" away, beyond its maximum possible charge range of ${maxChargeRange(u, game)}"` }
  return { ok: true, arc: arcOfUnit(t, u) }
}

// At least partly in the front arc: any corner of the target, or the middle of any of its
// edges, in front of the charger's front edge between the 45-degree lines from its corners.
export function inFrontArc (u, t) {
  // Skirmishers have no flank or rear: every arc is their front (Facing and Line of Sight Skirmishers)
  if (u.formation === 'skirmish') return true
  const f = dirOf(u.facing); const r = rightOf(u.facing)
  const [fl, fr] = corners(u)
  const pts = corners(t)
  const mids = pts.map((p, i) => mul(add(p, pts[(i + 1) % 4]), 0.5))
  return [...pts, ...mids, centre(t)].some(p => {
    const a = dot(sub(p, fl), f)
    return a >= 0 && dot(sub(p, fl), r) >= -a && dot(sub(p, fr), r) <= dot(sub(p, fr), f)
  })
}

export function declareCharge (game, u, t) {
  const c = canDeclareCharge(game, u, t)
  if (!c.ok) return c
  // Fear: to charge an enemy that causes Fear and has a
  // higher Unit Mass, pass a Leadership test first; failed, it does not move and counts as a
  // failed charge. Frenzied units pass automatically (Frenzy); a Fear-causer is immune.
  // Fear of Elves: a model with this rule fears every kind of Elf
  const fearful = (hasRule(t, 'Fear') || (isElf(t) && hasRule(u, 'Fear of Elves'))) && unitMass(t) > unitMass(u) && !hasRule(u, 'Fear') && !hasRule(u, 'Terror') && !hasRule(u, 'Frenzy') && !hasRule(u, 'Immune to Psychology') && !u.status.fearTested
  // Holy Fervour: within 6" of the War Altar, Fear tests are passed automatically
  if (fearful && holyFervour(game, u)) { say(game, '', `${u.name} is within 6" of the War Altar of Saint Halvar: it passes its Fear test (Holy Fervour).`); u.status.fearTested = true }
  else if (fearful) {
    const lt = leadershipTest(game, u, { label: `${u.name} — Fear test to charge ${t.name} (Unit Mass ${unitMass(t)} against ${unitMass(u)})`, kind: 'fear' })
    say(game, 'roll', lt.text)
    u.status.fearTested = true
    if (!lt.passed) {
      u.status.declaredCharge = null
      u.status.chargeFailed = true
      u.status.moved = true
      say(game, 'bad', `${u.name} is too afraid to charge: it does not move this turn (a failed charge).`)
      return { ok: true, failedFear: true }
    }
  }
  // The Gore Banner: charging its unit, a Leadership test first; failed, a failed charge
  if (itemFlag(t, 'gore') && !hasRule(u, 'Immune to Psychology')) {
    const lt = leadershipTest(game, u, { label: `${u.name} — Leadership test to charge the Gore Banner` })
    say(game, 'roll', lt.text)
    if (!lt.passed) { u.status.declaredCharge = null; u.status.chargeFailed = true; u.status.moved = true; say(game, 'bad', `${u.name} quails before the Gore Banner: it does not move this turn (a failed charge).`); return { ok: true, failedFear: true } }
  }
  u.status.declaredCharge = { target: t.id, arc: c.arc }
  // Terror: the target of a Terror-causing charger tests Leadership at once;
  // failed, it must Flee. (Not if it cannot choose to Flee, nor if it causes Terror itself.)
  if (hasRule(u, 'Terror') && !hasRule(t, 'Terror') && !t.status.fleeing && !t.status.engaged && reactionsFor(game, t, u).includes('flee') && !t.status.terrorTested) {
    t.status.terrorTested = true
    const lt = leadershipTest(game, t, { label: `${t.name} — Terror test (charged by ${u.name})`, kind: 'terror' })
    say(game, 'roll', lt.text)
    if (!lt.passed) t.status.mustFlee = true
  }
  say(game, '', `${u.name} declares a charge against ${t.name} (into its ${c.arc}${c.arc === 'front' ? '' : ' arc'}). ${distanceBetween(u, t).toFixed(1)}" away; its maximum charge range is ${maxChargeRange(u, game)}".`)
  return { ok: true, arc: c.arc }
}

// ---- reactions ----

export function reactionsFor (game, t, charger) {
  if (t.status.fleeing || t.status.mustFlee) return ['flee']
  if (t.status.engaged || t.status.stupid) return ['hold']
  // Frenzy / Immune to Psychology: such units cannot choose to Flee
  // (Oathstone, The Grudgestone: a unit with such a character cannot choose to Flee)
  const noFlee = hasRule(t, 'Frenzy') || hasRule(t, 'Immune to Psychology') || [t, ...(t.joined || []).filter(c => !c.status?.removed)].some(c => hasRule(c, 'Oathstone') || c.status.grudgestone || itemFlag(c, 'giantbreaker', { personal: true }))
  const out = ['hold']
  // Banner of Chalons: no Stand & Shoot against a unit carrying it
  if (canStandAndShoot(game, t, charger) && !itemFlag(charger, 'noStandShoot')) out.push('stand')
  // Fire and Flee: Stand & Shoot then flee (2D6, keep the highest); not if
  // the charger is closer than its Movement
  if (hasRule(t, 'Fire & Flee') && t.ranged && !noFlee && canSee(game, t, charger) && distanceBetween(t, charger) >= movementOf(charger)) out.push('fireflee')
  // Counter Charge: charged in the front arc by cavalry, a chariot or a
  // monster, and the charger at least its Movement away
  if (hasRule(t, 'Counter Charge') && /cavalry|chariot|monster/i.test((charger.troopType || []).join(' ') + charger.category) && arcOfUnit(t, charger) === 'front' && distanceBetween(t, charger) >= movementOf(charger) && !t.status.counterCharged) out.push('counter')
  if (!noFlee) out.push('flee')
  return out
}

// Stand & Shoot needs a missile weapon, and the unit may do it once a turn.
// Quick Shot / Fire and Flee: a charger that starts closer than its own
// Movement characteristic is too close to Stand & Shoot at, unless the weapon has Quick Shot.
// Cumbersome: Cumbersome weapons cannot Stand & Shoot.
export function canStandAndShoot (game, t, charger) {
  if (t.status.stoodAndShot) return false
  if (/war machine/.test(t.category)) return false
  const w = t.ranged
  if (!w) return false
  const rules = w.rules || []
  if (rules.includes('Cumbersome')) return false
  // (Naval Discipline: Lumaren Sea Guard, not joined by a character without it, at any distance)
  const naval = hasRule(t, 'Naval Discipline') && !(t.joined || []).some(c => !c.status?.removed && !hasRule(c, 'Naval Discipline'))
  // (Banner of Springtide: the unit has Quick Shot; Trueflight Arrows: so does a Lornefolk longbow with them)
  const quick = rules.includes('Quick Shot') || hasRule(t, 'Quick Shot') || (/lornefolk longbow/i.test(w.key || w.name || '') && /trueflight arrows/i.test((t.options || []).join(' ')))
  if (!quick && !naval && distanceBetween(t, charger) < movementOf(charger)) return false
  return true
}

// ---- the charge move ----

// Where the charger ends if it reaches: front edge flush against the target's edge in the arc
// it charges, centred as near its own centre as the edge allows.
export function contactPlacement (u, t, arc) {
  if (t.formation === 'skirmish') arc = sideOf(t, centre(u))
  const cs = corners(t)
  // the target's edge, as two points, and the direction pointing out of that edge
  const edge = { front: [cs[0], cs[1]], right: [cs[1], cs[2]], rear: [cs[2], cs[3]], left: [cs[3], cs[0]] }[arc]
  const along = sub(edge[1], edge[0])
  const L = Math.hypot(along.x, along.y)
  const ax = mul(along, 1 / L)
  const out = { x: ax.y, y: -ax.x } // outward normal (the corners run clockwise on screen)
  // the point on the edge nearest the charger's centre, kept so the charger's frontage overlaps
  const cu = centre(u)
  let s = dot(sub(cu, edge[0]), ax)
  const hw = width(u) / 2
  if (L >= 2 * hw) s = Math.max(hw, Math.min(L - hw, s))
  else s = L / 2
  const contact = add(edge[0], mul(ax, s))
  const facing = angleOf(mul(out, -1))
  return { pos: add(contact, mul(out, 0.0)), facing }
}

// How far the charger has to go: straight to the contact point, plus the wheel it needs to
// face its target (the outside corner's arc, as every wheel is measured).
export function chargeDistance (u, t, arc) {
  const place = contactPlacement(u, t, arc)
  const turn = Math.abs(normAngle(place.facing - u.facing))
  const wheel = turn * width(u) * 0.5 // the charge wheels once; aligning at the end is free
  const straight = distanceBetween(u, t)
  return { place, needed: straight + Math.min(wheel, straight), wheelAngle: turn }
}

// Determine Charge Range: 2D6, discard the lowest.
// Swiftstride: a unit entirely of Swiftstride models may add +D6 to a
//   Charge, Flee or Pursuit roll (it always chooses to here), and its maximum charge range is 3" more.
// The Swiftstride D6. The Silver Horn: the bearer and its unit may re-roll it (re-rolled here on a
// 1, 2 or 3 — the game cannot ask in the middle of a move; a guess at the player's choice)
export function swiftDie (game, u) {
  const r = rollDice(game.rng, 1)[0]
  const horn = [u, ...(u.joined || [])].some(x => itemFlag(x, 'silverHorn', { personal: true }))
  if (!horn || r > 3) return r
  const again = rollDice(game.rng, 1)[0]
  say(game, 'roll', `${u.name}: Swiftstride ${r} re-rolled with the Silver Horn — ${again}.`)
  return again
}
export function chargeRoll (game, u, { difficult = false } = {}) {
  const dice = rollDice(game.rng, 2)
  // Order of the Leopard Knights, Grand Master of the Leopard Knights:
  // one die showing a natural 1 may be rolled again, before any die is dropped
  let panther = null
  // The Away End Banner: any dice that roll a natural 1 re-rolled, before discarding
  // (Finest Warhorses: the same, for Lyonnese knights)
  if ((itemFlag(u, 'nomadz') || hasRule(u, 'Finest Warhorses')) && dice.includes(1)) { const k = dice.filter(d => d === 1).length; const again = rollDice(game.rng, k); let j = 0; for (let i = 0; i < dice.length; i++) if (dice[i] === 1) dice[i] = again[j++]; panther = `${k} natural 1 re-rolled (${hasRule(u, 'Finest Warhorses') ? 'Finest Warhorses' : 'The Away End Banner'}): ${again.join(', ')}` }
  else if (orderOf(u) === 'panther' && dice.includes(1)) {
    const i = dice.indexOf(1)
    dice[i] = rollDice(game.rng, 1)[0]
    panther = `1 re-rolled: ${dice[i]}`
  }
  // Difficult terrain: charging through it, discard the HIGHEST dice
  const kept = difficult ? Math.min(...dice) : Math.max(...dice)
  const swift = hasRule(u, 'Swiftstride')
  let extra = swift ? swiftDie(game, u) : 0
  // Come On You Ladz!: +D3 to the Charge roll
  const ere = inAura(game, 'comeOnYouLadz', u) ? Math.ceil(rollDice(game.rng, 1)[0] / 2) : 0
  extra += ere
  // Big Ruck Banner: +D3 to the Charge roll; Prayers of Varg, Battle Howl: +D3 too
  const banner = itemFlag(u, 'bigRuckBanner') ? Math.ceil(rollDice(game.rng, 1)[0] / 2) : 0
  extra += banner
  const howl = u.status.battleHowl ? Math.ceil(rollDice(game.rng, 1)[0] / 2) : 0
  extra += howl
  // Virtue of the Impetuous Knight: the model and its unit +D3 to the Charge roll
  const knight = [u, ...(u.joined || [])].some(x => itemFlag(x, 'impetuousKnight', { personal: true })) ? Math.ceil(rollDice(game.rng, 1)[0] / 2) : 0
  extra += knight
  // First to the Fray: the Deathwhirl +D3 (dwarfs.js)
  const fray = firstToTheFray(u) || (u.items || []).includes('battle-hunger') ? Math.ceil(rollDice(game.rng, 1)[0] / 2) : 0
  extra += fray
  // (Unmade of Rapture: +1 to the Charge roll — unmade.js)
  const rapture = raptureSpeed(u) ? 1 : 0
  return { dice, kept, extra: extra + rapture, result: kept + extra + rapture, swift: swift || !!ere || !!banner || !!howl || !!knight || !!fray, ere, banner, howl, knight, fray, panther }
}

// (Big Ruck Banner: its unit's maximum possible charge range is 3" more)
// (a flier charges through the air with its Fly Movement: Fly)
// (Unmade of Rapture: +1" to its maximum charge range)
export const maxChargeRange = (u, game = null) => Math.max(movementOf(u), flyMovement(u)) + 6 + (raptureSpeed(u) ? 1 : 0) + (hasRule(u, 'Swiftstride') ? 3 : 0) + (firstToTheFray(u) ? 3 : 0) + ((u.items || []).includes('battle-hunger') ? 2 : 0) + (game && inAura(game, 'comeOnYouLadz', u) ? 3 : 0) + (itemFlag(u, 'bigRuckBanner') ? 3 : 0) + (u.status.battleHowl ? 3 : 0) + ([u, ...(u.joined || [])].some(x => itemFlag(x, 'impetuousKnight', { personal: true })) ? 3 : 0)

// Resolve one declared charge. `react` is the target's reaction, already declared.
export function resolveCharge (game, u) {
  const from = { pos: { ...u.pos }, facing: u.facing }
  try { return resolveChargeInner(game, u) } finally { sweptThroughWhirlers(game, u, from); sweptThroughVortices(game, u, from); syncJoined(game) }
}
function resolveChargeInner (game, u) {
  const decl = u.status.declaredCharge
  const t = game.units.find(x => x.id === decl.target)
  const target0 = game.units.find(x => x.id === decl.target)
  // Fly: a model that can fly charges by flying (always chosen here, its Fly
  // Movement being the greater): over units and terrain, without penalty
  const ground = target0 ? chargePathTerrain(game, u, contactPlacement(u, target0, decl.arc)) : { difficult: false, impassable: false }
  const groundM = ground.difficult && !hasRule(u, 'Move Through Cover') ? Math.max(1, movementOf(u) - 1) : movementOf(u)
  const flies = flyMovement(u) > 0 && (flyMovement(u) >= groundM || ground.impassable || ground.difficult)
  const pathT = flies ? { difficult: false, impassable: false } : ground
  const difficult = pathT.difficult
  const M = flies ? flyMovement(u) : groundM
  if (flies) say(game, '', `${u.name} charges through the air (Fly ${flyMovement(u)}).`)
  const roll = chargeRoll(game, u, { difficult })
  // Temperamental: a natural 1 on an Iron Kettle's Charge roll — Bang! or Phweee! (its
  // player chose beforehand, ui/phases.js: status.temperChoice); halted, it does not move: a failed charge
  if (temperamental(game, u, roll.dice.filter(d => d === 1).length, u.status.temperChoice || 'bang')) {
    say(game, 'bad', `${u.name} halts: its charge fails where it stands.`)
    u.status.chargeFailed = true
    u.status.moved = true
    return { result: 'failed' }
  }
  if (u.status.removed || isDead(u)) return { result: 'failed' }
  let range = M + roll.result
  let rollText = `${difficult ? `Through difficult terrain (keep the LOWEST dice${hasRule(u, 'Move Through Cover') ? '; no -1 Movement, Move Through Cover' : ', -1 Movement'}): ` : ''}Charge roll ${roll.dice.join(', ')}${roll.panther ? ` (Leopard Knights, ${roll.panther})` : ''}, keep the ${difficult ? 'lowest' : 'highest'} ${roll.kept}${roll.swift ? `, +${roll.extra} (${[hasRule(u, 'Swiftstride') && 'Swiftstride', roll.ere && "Come On You Ladz!", roll.banner && 'Big Ruck Banner D3', roll.howl && 'Battle Howl D3', roll.knight && 'Impetuous Knight D3', roll.fray && ((u.items || []).includes('battle-hunger') ? 'Battle Hunger D3' : 'First to the Fray D3')].filter(Boolean).join(', ')})` : ''}; charge range ${M}+${roll.result} = ${range}"`
  if (!t || isDead(t) || t.status.removed) {
    say(game, 'roll', `${u.name}: its target is gone. ${rollText}.`)
    u.status.moved = true
    return { result: 'gone' }
  }
  // a fleeing target: run it down if it can be reached
  if (t.status.fleeing) {
    const need = distanceBetween(u, t)
    if (range >= need) {
      say(game, 'roll', `${u.name} chases ${t.name}: ${rollText}, needs ${need.toFixed(1)}" — CAUGHT. ${t.name} is cut down and removed.`)
      const place = contactPlacement(u, t, arcOfUnit(t, u))
      const was = { pos: u.pos, facing: u.facing }
      Object.assign(u, place)
      if (overlapsOthers(game, u, [t])) Object.assign(u, was)
      destroy(game, t, 'run down')
      u.status.charged = true
      u.status.moved = true
      const lt = leadershipTest(game, u, { label: `${u.name} — Leadership test to reform` })
      say(game, 'roll', lt.text + (lt.passed ? ' (it may reform; the board keeps its facing for now)' : ', it may not reform.'))
      return { result: 'ranDown' }
    }
    say(game, 'roll', `${u.name} chases ${t.name}: ${rollText}, needs ${need.toFixed(1)}" — the enemy got away; ${u.name} moves its full charge range towards it.`)
    moveToward(game, u, centre(t), range)
    u.status.charged = false
    u.status.moved = true
    return { result: 'escaped' }
  }
  // Who Can Charge: a unit in Marching Column may declare a charge but never makes the charge move
  if (isMarchingColumn(u)) {
    say(game, 'bad', `${u.name} is in Marching Column (deeper than it is wide): it declared the charge but cannot make the charge move.`)
    u.status.chargeFailed = true
    u.status.moved = true
    return { result: 'column' }
  }
  const { place, needed } = chargeDistance(u, t, decl.arc)
  // Warband: a Warband may re-roll its Charge roll (done when it falls short)
  // Rampaging Banner: may re-roll its Charge roll (done when it falls short)
  const rerollWhy = hasRule(u, 'Warband') ? 'the Warband' : itemFlag(u, 'rerollCharge') ? 'the Rampaging Banner' : null
  if (range + 1e-6 < needed && rerollWhy && !roll.rerolled) {
    const again = chargeRoll(game, u, { difficult })
    say(game, 'roll', `${u.name}: ${rollText} — short of the ${needed.toFixed(1)}" needed; ${rerollWhy} re-rolls its Charge roll: ${again.dice.join(', ')}${again.swift ? ` +${again.extra}` : ''}.`)
    roll.rerolled = true
    Object.assign(roll, again)
    range = M + roll.result
    rollText = `re-rolled Charge roll, keep ${roll.kept}${roll.swift ? ` +${roll.extra}` : ''}; charge range ${M}+${roll.result} = ${range}"`
  }
  if (range + 1e-6 < needed) {
    say(game, 'roll', `${u.name} charges ${t.name}: ${rollText}, needs ${needed.toFixed(1)}" — FAILED CHARGE. It moves ${roll.result}" towards the enemy.`)
    moveToward(game, u, centre(t), roll.result)
    u.status.chargeFailed = true
    u.status.moved = true
    return { result: 'failed' }
  }
  const was = { pos: u.pos, facing: u.facing }
  Object.assign(u, place)
  // impassable terrain in the way of the charge: it cannot get round
  if (pathT.impassable || overlapsOthers(game, u, [t])) {
    // no room flush against the target: stop 1" short in the line of the charge (a disordered charge, roughly)
    Object.assign(u, was)
    say(game, 'roll', `${u.name} charges ${t.name}: ${rollText}, needs ${needed.toFixed(1)}" — in range, but another unit is in the way where it would align. The charge is halted.`)
    moveToward(game, u, centre(t), Math.max(0, distanceBetween(u, t) - 1))
    u.status.moved = true
    return { result: 'blocked' }
  }
  say(game, 'roll', `${u.name} charges ${t.name}: ${rollText}, needs ${needed.toFixed(1)}" — CONTACT, into its ${decl.arc}.`)
  // Dangerous Terrain: tests for each dangerous feature on the way
  for (const f of pathT.dangerous || []) if (!u.status.removed) dangerousTerrainTests(game, u, f, [was, ...Array.from({ length: 8 }, (_, i) => ({ pos: { x: was.pos.x + (u.pos.x - was.pos.x) * (i + 1) / 8, y: was.pos.y + (u.pos.y - was.pos.y) * (i + 1) / 8 }, facing: u.facing }))])
  if (u.status.removed || isDead(u)) return { result: 'failed' }
  u.status.charged = true
  u.status.moved = true
  u.status.chargeDistance = needed
  t.status.wasCharged = `${game.round}:${game.active}`
  // Earthen Ramparts + Defended Low Linear Obstacles: a disordered charge
  // Entrenchment: an Entrenched unit defends a low linear obstacle — a disordered charge (dwarfs.js)
  // Rune of Confusion: a charge into its front makes a disordered charge
  if (decl.arc === 'front' && itemFlag(t, 'confusion')) { u.status.disordered = true; say(game, '', `${t.name}'s Rune of Confusion: ${u.name}'s charge into its front is disordered.`) }
  // Master Rune of Hesitation: a unit charging its front does not count as having charged
  u.status.hesitated = decl.arc === 'front' && !!itemFlag(t, 'hesitation')
  if (u.status.hesitated) say(game, '', `${t.name}'s Master Rune of Hesitation: ${u.name} does not count as having charged.`)
  if (t.status.entrenched && !t.status.ramparts) { u.status.disordered = true; say(game, '', `${t.name} is Entrenched: ${u.name}'s charge is disordered (no Initiative bonus).`) }
  if (t.status.ramparts) { u.status.disordered = true; say(game, '', `${t.name} stands behind Earthen Ramparts: ${u.name}'s charge is disordered (no Initiative bonus).`) }
  // Dance of Death (darkelves.js)
  danceOfDeath(game, u, t)
  // First Charge: the first successful charge of the game disrupts the target
  if (hasRule(u, 'First Charge') && !u.status.firstChargeUsed) {
    u.status.firstChargeUsed = true
    // (Phalanx: a Phalanx charged by it is not Disrupted)
    if (isPhalanx(t)) say(game, '', `${t.name} is a Phalanx: ${u.name}'s First Charge does not Disrupt it.`)
    else { t.status.disruptedUntilEndOfCombat = true; say(game, '', `${u.name}'s First Charge: ${t.name} is Disrupted for the rest of this Combat phase.`) }
  }
  // The Lance in Combat (Blunting the Lance): a Lance that makes a disordered charge, or that is
  // charged and does not Counter Charge, is blunted — it reforms into Close Order, as wide as its complete ranks
  if (u.formation === 'lance' && u.status.disordered) bluntLance(game, u)
  // (Lance Formations and Skirmishers: Skirmishers cannot blunt a Lance)
  if (t.formation === 'lance' && t.status.reaction !== 'counter' && u.formation !== 'skirmish') bluntLance(game, t)
  // Formed Units Charging Skirmishers: the charger does not align; the Skirmishers form
  // up against its fighting rank (no model moving further than its Movement; those that cannot reach form up behind)
  if (t.formation === 'skirmish' && u.formation !== 'skirmish' && formUpAgainst(game, t, u)) { engage(game, u, t, 'front'); snared(game, u, t); return { result: 'contact' } }
  engage(game, u, t, decl.arc)
  snared(game, u, t)
  return { result: 'contact' }
}

export function engage (game, a, b, arcOnB) {
  a.status.engaged = true
  b.status.engaged = true
  a.engagedWith = a.engagedWith || {}
  b.engagedWith = b.engagedWith || {}
  a.engagedWith[b.id] = 'front'
  b.engagedWith[a.id] = arcOnB
}

export { disengageAll }

function overlapsOthers (game, u, except = []) {
  const mine = corners(u)
  if (onImpassable(game, u)) return true
  return solid(game).some(o => o !== u && !except.includes(o) && polysOverlap(mine, corners(o), 0.02))
}

// The Skirmishers `t` form up facing the charger `u`, their front rank against its front edge, as wide as fits
// (the rest behind). Returns false, changing nothing, when they cannot (no room, or too far for their Movement).
function formUpAgainst (game, t, u) {
  const was = { pos: t.pos, facing: t.facing, files: t.files }
  const c0 = centre(t)
  const fit = Math.max(1, Math.floor((width(u) + 1e-6) / t.base.w))
  t.files = Math.max(1, Math.min(modelCount(t), fit))
  t.facing = normAngle(u.facing + Math.PI)
  t.pos = { ...u.pos }
  // (judged from the unit's centre: no model may go further than its Movement, roughly)
  const far = dist(c0, centre(t)) > movementOf(t) + Math.max(width(t), depth(t)) / 2
  if (far || onImpassable(game, t) || overlapsOthers(game, t, [u]) || !onTheTableC(t)) { Object.assign(t, was); return false }
  say(game, '', `${t.name} (Skirmishers) form up against ${u.name}'s fighting rank, ${t.files} wide.`)
  return true
}
const onTheTableC = t => corners(t).every(p => p.x >= -1e-6 && p.y >= -1e-6 && p.x <= TABLE.w + 1e-6 && p.y <= TABLE.h + 1e-6)

export function bluntLance (game, u) {
  if (u.formation !== 'lance') return
  const complete = lanceRows(modelCount(u)).filter((k, i) => k === i + 1).length
  u.formation = 'close'
  u.files = Math.max(1, complete)
  say(game, 'bad', `${u.name}'s Lance is BLUNTED: it reforms into Close Order, ${u.files} wide.`)
}

// Move straight towards a point, stopping short of anything in the way and 1" from enemies.
function moveToward (game, u, to, d) {
  const c = centre(u)
  const ang = angleOf(sub(to, c))
  const was0 = { pos: u.pos, facing: u.facing }
  u.facing = ang
  u.pos = add(c, mul(dirOf(ang), depth(u) / 2))
  // no room to turn towards it (rocks, another unit): it stays where it is
  if (overlapsOthers(game, u)) { Object.assign(u, was0); return }
  const step = 0.1
  for (let gone = 0; gone + step <= d + 1e-9; gone += step) {
    const was = { ...u.pos }
    u.pos = add(u.pos, mul(dirOf(ang), step))
    const tooClose = solid(game).some(o => o.side !== u.side && o !== u && distanceBetween(u, o) < 1)
    if (tooClose || overlapsOthers(game, u)) { u.pos = was; break } // overlapsOthers includes rocks
  }
}

export function destroy (game, u, how) { removeUnit(game, u, how) }

// ---- fleeing ----

// Pivot about the centre to face directly away from `from` (a unit), then flee 2D6.
// keepHighest: Falling Back in Good Order rolls 2D6 and keeps the higher die
// (Fall Back in Good Order)
export function fleeFrom (game, u, from, { label = 'flees', keepHighest = false } = {}) {
  if (u.status.fledThisPhase) {
    say(game, '', `${u.name} has already fled this phase; it flees 0".`)
    u.status.fleeing = true
    return
  }
  const c = centre(u)
  const away = angleOf(sub(c, centre(from)))
  u.facing = away
  u.pos = add(c, mul(dirOf(away), depth(u) / 2))
  u.status.fledFrom = from.id
  return fleeMove(game, u, { label, keepHighest })
}

export function fleeMove (game, u, opts = {}) {
  const from = { pos: { ...u.pos }, facing: u.facing }
  u._track = [{ pos: { ...u.pos }, facing: u.facing }]
  try { return fleeMoveInner(game, u, opts) } finally {
    const tr = u._track; u._track = null
    sweptThroughWhirlers(game, u, from, tr); sweptThroughVortices(game, u, from, tr)
    // Dangerous Terrain: a flee through dangerous terrain tests too
    if (!u.status.removed && u.placed && tr?.length) { const seen = new Set(); for (const sn of tr) { const w = { pos: u.pos, facing: u.facing }; u.pos = sn.pos; u.facing = sn.facing; for (const f of dangerousHere(game, u)) seen.add(f); u.pos = w.pos; u.facing = w.facing } for (const f of seen) if (!u.status.removed) dangerousTerrainTests(game, u, f, tr) }
    syncJoined(game)
  }
}
function fleeMoveInner (game, u, { label = 'flees', dice = 2, keepHighest = false } = {}) {
  const r = rollDice(game.rng, dice)
  // The Away End Banner: natural 1s on the Flee roll re-rolled
  if ((itemFlag(u, 'nomadz') || hasRule(u, 'Finest Warhorses')) && r.includes(1)) { const again = rollDice(game.rng, r.filter(x => x === 1).length); let j = 0; for (let i = 0; i < r.length; i++) if (r[i] === 1) r[i] = again[j++]; say(game, 'roll', `${u.name}: natural 1s on its Flee roll re-rolled (${hasRule(u, 'Finest Warhorses') ? 'Finest Warhorses' : 'The Away End Banner'}): ${again.join(', ')}.`) }
  // Favour of the Mere: a unit that flees (not one falling back in good order) loses the Blessing
  if (!keepHighest) { loseBlessing(game, u, 'flees'); for (const c of (u.joined || [])) loseBlessing(game, c, 'flees with its unit') }
  let d = keepHighest ? Math.max(...r) : r.reduce((a, b) => a + b, 0)
  if (hasRule(u, 'Swiftstride')) { const x = swiftDie(game, u); d += x; r.push(`(Swiftstride +${x})`) }
  // Weapon of War: war machines -1 to Flee rolls (minimum 1)
  if (/war machine/i.test(u.category)) { d = Math.max(1, d - 1); r.push('(war machine -1)') }
  if (resolute(u, d) !== d) { d = resolute(u, d); r.push('(Resolute -1)') }
  // Scurry Away: +1 (gnawkin.js)
  if (scurries(u)) { d += 1; r.push('(Scurry Away +1)') }
  u.status.fleeing = true
  u.status.fledThisPhase = true
  u.status.entrenched = false
  disengageAll(game, u)
  const throughEnemies = new Set()
  const throughFriends = new Set()
  const perilModels = new Set()
  const f = { ...dirOf(u.facing) }
  const step = 0.1
  let gone = 0
  for (; gone + step <= d + 1e-9; gone += step) {
    u.pos = add(u.pos, mul(f, step))
    if (u._track) u._track.push({ pos: { ...u.pos }, facing: u.facing })
    // Fleeing through terrain: meeting impassable terrain, it pivots
    // about its centre to go round it by the shortest way
    if (onImpassable(game, u)) {
      u.pos = add(u.pos, mul(f, -step))
      const c = centre(u)
      let turned = false
      for (const da of [0.26, -0.26, 0.52, -0.52, 0.79, -0.79, 1.05, -1.05, 1.31, -1.31, 1.57, -1.57]) {
        u.facing = normAngle(u.facing + da)
        u.pos = add(c, mul(dirOf(u.facing), depth(u) / 2))
        const nf = dirOf(u.facing)
        u.pos = add(u.pos, mul(nf, step))
        if (!onImpassable(game, u)) { f.x = nf.x; f.y = nf.y; turned = true; break }
        u.pos = add(u.pos, mul(nf, -step))
        u.facing = normAngle(u.facing - da)
        u.pos = add(c, mul(dirOf(u.facing), depth(u) / 2))
      }
      if (!turned) break
    }
    if (!corners(u).every(p => p.x > 0 && p.x < TABLE.w && p.y > 0 && p.y < TABLE.h)) {
      say(game, 'roll', `${u.name} ${label}: Flee roll ${r.join('+')}=${d}" — it runs off the table.`)
      destroy(game, u, 'fled off the table')
      return { d, off: true }
    }
    for (const o of solid(game)) {
      // (a friendly unit fled through tests for Panic once the move is over: Common Causes of Panic)
      if (o.side === u.side && o !== u && polysOverlap(corners(u), corners(o), 0.02)) throughFriends.add(o)
      if (o.side === u.side || o === u || !polysOverlap(corners(u), corners(o), 0.02)) continue
      throughEnemies.add(o)
      // which of its models passed through: their own squares over the enemy's footprint
      for (const sl of modelSlots(u)) if (polysOverlap(slotSquare(u, sl.at), corners(o), 0.02)) perilModels.add(sl.model)
    }
  }
  // ending on top of a unit: carry on until clear (and 1" past an enemy)
  let extra = 0
  while ((onImpassable(game, u) || solid(game).some(o => o !== u && (polysOverlap(corners(u), corners(o), 0.02) || (o.side !== u.side && distanceBetween(u, o) < 1)))) && extra < 30) {
    u.pos = add(u.pos, mul(f, step)); extra += step
    if (!corners(u).every(p => p.x > 0 && p.x < TABLE.w && p.y > 0 && p.y < TABLE.h)) {
      say(game, 'roll', `${u.name} ${label}: Flee roll ${r.join('+')}=${d}" — it cannot stop on the units in its path and runs off the table.`)
      destroy(game, u, 'fled off the table')
      return { d, off: true }
    }
  }
  say(game, 'roll', `${u.name} ${label}: Flee roll ${r.join('+')}=${d}"${extra ? ` (and ${extra.toFixed(1)}" more to get clear of the units in its path)` : ''}.`)
  if (throughEnemies.size) {
    const n = [...perilModels].filter(m => m.wounds > 0).length
    const p = rollTarget(game.rng, n, 4)
    const lost = n - p.passes
    say(game, 'roll', `${u.name} fled through ${[...throughEnemies].map(o => o.name).join(', ')}: Peril tests for the ${n} model${n === 1 ? '' : 's'} that went through, ${n} dice [${p.dice.join(' ')}], need 4+ — ${lost} wound${lost === 1 ? '' : 's'} lost.`)
    applyWounds(game, u, lost, 'Peril tests')
  }
  for (const f of throughFriends) panicFromFriend(game, f, u, `${u.name} ${label.includes('falls back') ? 'fell back' : 'fled'} through it`)
  return { d }
}

// Which enemy to flee from when charged by several: the highest Unit Mass.
// The Greater the Danger
export function greatestDanger (game, list) {
  let best = null
  for (const o of list) {
    if (!best || unitMass(o) > unitMass(best) || (unitMass(o) === unitMass(best) && game.rng() < 0.5)) best = o
  }
  return best
}

export function sum2d6 (game) { return sumDice(game.rng, 2) }
export const dummyDist = dist

// The Thinkin' Rukka's 'At: the wearer, and any unit it has joined, is not Impetuous
const notImpetuous = u => [u, ...(u.joined || [])].some(x => !x.status.removed && itemFlag(x, 'notImpetuous', { personal: true }))

// Impetuous: an Impetuous unit able to declare a charge tests Leadership
// (without its Warband bonus); failed, it must declare a charge.
// Quell Impetuosity: within 6" of a friendly unit with Quell
// Impetuosity, it may re-roll that test.
export function impetuousTests (game) {
  const must = []
  // Frenzy: a unit with a Frenzied model that can declare a charge must
  for (const u of onTable(game).filter(x => x.side === game.active && hasRule(x, 'Frenzy'))) {
    const targets = onTable(game).filter(t => t.side !== u.side && canDeclareCharge(game, u, t).ok)
    if (targets.length) { say(game, '', `${u.name} is Frenzied: it must declare a charge.`); must.push({ unit: u, targets }) }
  }
  // a unit within 12" of an enemy Phantasmagoria is Impetuous too
  for (const u of onTable(game).filter(x => x.side === game.active && (hasRule(x, 'Impetuous') || nearAura(game, 'phantasmagoria', x, 12)) && !hasRule(x, 'Frenzy') && !notImpetuous(x))) {
    const targets = onTable(game).filter(t => t.side !== u.side && canDeclareCharge(game, u, t).ok)
    if (!targets.length) continue
    const quell = onTable(game).some(o => o.side === u.side && o !== u && hasRule(o, 'Quell Impetuosity') && distanceBetween(o, u) <= 6)
    const lt = leadershipTest(game, u, { label: `${u.name} — Impetuous test`, noWarband: true, reroll: quell ? 'Quell Impetuosity' : null })
    say(game, 'roll', lt.text)
    if (!lt.passed) must.push({ unit: u, targets })
  }
  return must
}

function slotSquare (u, at) {
  const f = dirOf(u.facing); const r = rightOf(u.facing)
  const hw = u.base.w / 2; const hd = u.base.d / 2
  return [add(add(at, mul(r, -hw)), mul(f, hd)), add(add(at, mul(r, hw)), mul(f, hd)), add(add(at, mul(r, hw)), mul(f, -hd)), add(add(at, mul(r, -hw)), mul(f, -hd))]
}

// Is there any enemy this unit could declare a charge against now?
export function anyChargeTarget (game, u) {
  return onTable(game).some(t => t.side !== u.side && canDeclareCharge(game, u, t).ok)
}

// The Counter Charge move: pivot about the centre to face the charger's centre, then D3+1"
// straight at it (stopping short of contact); both units count as having charged this turn.
export function counterCharge (game, t, charger) {
  t.status.counterCharged = true
  const c = centre(t)
  // (where it stood, saved BEFORE it turns: a pivot that would put it on impassable terrain is undone whole, facing
  // included — saving after the turn could leave a unit turned on the spot and standing on rocks)
  const was0 = { pos: t.pos, facing: t.facing }
  t.facing = angleOf(sub(centre(charger), c))
  t.pos = add(c, mul(dirOf(t.facing), depth(t) / 2))
  const pivoted = !onImpassable(game, t)
  if (!pivoted) { Object.assign(t, was0); say(game, '', `${t.name} cannot pivot to face ${charger.name}: impassable terrain is in the way. It stays where it is.`) }
  const r = rollDice(game.rng, 1)[0]
  const d = Math.ceil(r / 2) + 1
  let gone = 0
  // (Counter Charge: it turns to face the charger first, then moves D3+1" straight at it; the dice is still
  // rolled, so the seed's later rolls
  // do not shift)
  for (; pivoted && gone + 0.1 <= d; gone += 0.1) {
    const was = t.pos
    t.pos = add(t.pos, mul(dirOf(t.facing), 0.1))
    if (onImpassable(game, t) || solid(game).some(o => o !== t && polysOverlap(corners(t), corners(o), 0.02))) { t.pos = was; break }
  }
  t.status.charged = true
  t.status.chargeDistance = gone
  if (pivoted) say(game, 'roll', `${t.name} COUNTER CHARGES: D3+1 = ${Math.ceil(r / 2)}+1 = ${d}" towards ${charger.name} (moved ${gone.toFixed(1)}"). Both count as having charged.`)
  else say(game, 'roll', `${t.name} counter charges without moving (it could not pivot). Both count as having charged.`)
  syncJoined(game)
}

// Rallied units: upon rallying a unit may immediately make a free
// reform — used here, when a unit rallies at the end of a Fall Back in Good Order, to turn it about
// its centre to face the enemy it fell back from (keeping its frontage).
export function reformToFace (game, u, enemy) {
  if (!enemy || enemy.status?.removed) return
  const c = centre(u)
  const was = { pos: u.pos, facing: u.facing }
  u.facing = angleOf(sub(centre(enemy), c))
  u.pos = add(c, mul(dirOf(u.facing), depth(u) / 2))
  if (overlapsOthers(game, u) || !corners(u).every(p => p.x >= 0 && p.y >= 0 && p.x <= TABLE.w && p.y <= TABLE.h)) {
    Object.assign(u, was)
    say(game, '', `${u.name} rallies; there is no room to turn and face ${enemy.name}.`)
    return
  }
  say(game, '', `${u.name} rallies and makes a free reform to face ${enemy.name}.`)
  syncJoined(game)
}

// Traps and Snares — a charger ending its move in contact with Grubling Trappers tests Dangerous
// Terrain (here: one test for each of its models in the front rank, the models in contact — ogres.js)
function snared (game, u, t) {
  if (!traps(t) || u.status.removed) return
  const n = Math.min(modelCount(u), Math.max(1, u.files || 1))
  const dice = rollDice(game.rng, n)
  const ones = dice.filter(d => d === 1).length
  say(game, 'roll', `${u.name} charges into ${t.name}'s Traps & Snares: Dangerous Terrain tests [${dice.join(' ')}] — ${ones} model${ones === 1 ? '' : 's'} lose${ones === 1 ? 's' : ''} a Wound.`)
  if (ones) applyMultipleDamage(game, u, Array(ones).fill(1), 'Traps & Snares')
}
