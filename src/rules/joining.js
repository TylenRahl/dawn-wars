// Characters joining units: who may join whom (canJoin), joining and leaving, keeping a joined character with its
// unit (syncJoined) and where it stands in the ranks (joinedPlaces). Used by movement, charges, combat, magic,
// Leadership, the battle screen and the board's joined-character slots (view/joinedSlots.js).
//
// A character may join a friendly unit at deployment (set up with it) or in Remaining Moves (moving into base
//   contact with a unit, which must be neither engaged nor fleeing). A unit joined in Remaining Moves may not move
//   afterwards; it counts as having moved only if it had moved before the character joined.
// Leaving a unit: in Remaining Moves, before the unit moves; not if the unit
//   cannot move this phase.
// Positioning Characters: placed in the front rank.
// Movement: the unit moves at the slowest model's rate.
// Fleeing: a character flees with its unit, and is run down with it.
// Unit Mass: the character adds its Unit Mass to the unit's.
// Enemy shooting: it cannot be shot while the unit has five or more rank and file of its troop type.
// Lone characters: a character not in a unit is a Lone character.
// Leadership tests: a unit uses the highest Leadership in it.
//
// HOW IT IS HELD: the character stays its own unit record. `char.status.joinedTo` is the host's
// id, and `host.joined` lists the characters. A joined character is off the table for targeting
// and blocking (game.js onTable) and follows its host's position (syncJoined).

import { unmadeJoinProblem } from './unmade.js'
import { undeadJoinProblem } from './vampires.js'
import { elfJoinProblem } from './highelves.js'
import { treeSpiritJoinProblem } from './woodelves.js'
import { lyonneseJoinProblem } from './lyonne.js'
import { itemFlag } from './items.js'
import { isMercenary } from './mercenaries.js'
import { orderOf } from './orders.js'
import { say } from './game.js'
import { distanceBetween, isDead, hasRule, modelSlots, alive, filesOf } from './units.js'
import { add, mul, dirOf, rightOf } from './geometry.js'
import { movementOf } from './movement.js'

export const isCharacter = u => (u.troopType || []).includes('Character')
export const joinedOf = host => (host.joined || []).filter(c => !c.status.removed && !isDead(c))
export const hostOf = (game, c) => c.status.joinedTo ? game.units.find(u => u.id === c.status.joinedTo) : null

const sameFamily = (a, b) => {
  const fam = u => /cavalry/i.test((u.troopType || []).join(' ')) ? 'cavalry' : /infantry/i.test((u.troopType || []).join(' ')) ? 'infantry' : 'other'
  return fam(a) === fam(b)
}

export function canJoin (game, c, host, { deploying = false } = {}) {
  if (!isCharacter(c)) return { ok: false, reason: 'only characters join units' }
  if (c.status.joinedTo) return { ok: false, reason: 'it is already with a unit' }
  if (host.side !== c.side) return { ok: false, reason: 'that is an enemy unit' }
  if (isCharacter(host)) return { ok: false, reason: 'two characters cannot join one another' }
  if (/war machine|chariot|monster/i.test((host.troopType || []).join(' ') + host.category)) return { ok: false, reason: `${host.name} cannot be joined` }
  // Zealot / Fanatical Zeal: a Zealot joins only Fanatical Zeal units, and those
  // take only a Lector or Priest of Saint Halvar (or a Zealot)
  if (hasRule(c, 'Zealot') && !hasRule(host, 'Fanatical Zeal')) return { ok: false, reason: `${c.name} is a Zealot: it joins only Flagellants` }
  if (hasRule(host, 'Fanatical Zeal') && !hasRule(c, 'Zealot') && !/^(lector|priest)-of-saint-halvar$/.test(c.entryId || '')) return { ok: false, reason: `only a Lector or Priest of Saint Halvar may join ${host.name}` }
  // Grand Master of the Leopard Knights: Torvald joins only Leopard Knights
  if (c.entryId === 'torvald-brenner' && orderOf(host) !== 'panther') return { ok: false, reason: `${c.name} joins only a unit of the Leopard Knights` }
  // Order of the Ember Heart: joined only by a Grand Master or Lord Commander of the Order,
  // a Lector of Saint Halvar or a Priest of Saint Halvar
  if (orderOf(host) === 'ember-heart' && !(orderOf(c) === 'ember-heart' && /^(grand-master|lord-commander)$/.test(c.entryId || '')) && !/^(lector|priest)-of-saint-halvar$/.test(c.entryId || '')) return { ok: false, reason: `only a Grand Master or Lord Commander of the Ember Heart, or a Lector or Priest of Saint Halvar, may join ${host.name}` }
  // Mercenaries / Mercenary Commander: no joining Mercenaries, but Konrad as the General
  if (isMercenary(host) && !(c.isGeneral && hasRule(c, 'Mercenary Commander'))) return { ok: false, reason: `${host.name} are Mercenaries: only Konrad von Falkenrode, as the General, may join them` }
  // Lyonne: Peasantry and the Vows (lyonne.js)
  const brp = lyonneseJoinProblem(c, host) || elfJoinProblem(c, host) || treeSpiritJoinProblem(c, host) || undeadJoinProblem(c, host) || unmadeJoinProblem(c, host)
  if (brp) return { ok: false, reason: brp }
  // Largely Insignificant: joined only by a character with it
  if (hasRule(host, 'Largely Insignificant') && !hasRule(c, 'Largely Insignificant')) return { ok: false, reason: `${host.name} are Largely Insignificant: only a character with the rule may join them` }
  // Loner: a Loner character joins only a Loner unit, and the other way round
  // Flying Carpet: its bearer cannot join a unit
  if (itemFlag(c, 'noJoin', { personal: true })) return { ok: false, reason: `${c.name} rides a Flying Carpet: it cannot join a unit` }
  // King of the Slayer Hold: Durnak may join Kingshammers or Slayers, though no Loner
  const ungrim = hasRule(c, 'King of the Slayer Hold') && /^(kingshammers|slayers)/.test(host.entryId || '')
  if (!ungrim && hasRule(c, 'Loner') !== hasRule(host, 'Loner')) return { ok: false, reason: hasRule(c, 'Loner') ? `${c.name} is a Loner` : `${host.name} are Loners: only a Loner character may join them` }
  // Fly: a character that can Fly joins only a unit that can, and vice versa
  if (hasRule(c, 'Fly') !== hasRule(host, 'Fly')) return { ok: false, reason: hasRule(c, 'Fly') ? 'a flying character joins only a unit that can Fly' : 'a character that cannot Fly cannot join a unit that can' }
  if (!sameFamily(c, host)) return { ok: false, reason: 'a character joins a unit of its own troop type (infantry with infantry, cavalry with cavalry)' }
  if (host.status.engaged || host.status.fleeing) return { ok: false, reason: `${host.name} is ${host.status.engaged ? 'engaged in combat' : 'fleeing'}` }
  if (!deploying) {
    if (c.status.moved || c.status.engaged || c.status.fleeing) return { ok: false, reason: `${c.name} has already moved, or cannot move` }
    // it moves into base contact: the closest distance must be within its Movement
    const M = movementOf(c)
    const d = distanceBetween(c, host)
    if (d > M) return { ok: false, reason: `${host.name} is ${d.toFixed(1)}" away, more than its Movement of ${M}"` }
  }
  return { ok: true }
}

export function join (game, c, host, { deploying = false } = {}) {
  const r = canJoin(game, c, host, { deploying })
  if (!r.ok) return r
  c.status.joinedTo = host.id
  c.joinedHost = host // (for rules that depend on the unit it is with: units.js rulesOf)
  host.joined = [...joinedOf(host), c]
  if (!deploying) {
    c.status.moved = true
    // the unit cannot move after being joined (it counts as moved only if it already had)
    host.status.joinedThisTurn = true
  }
  syncOne(c, host)
  say(game, '', `${c.name} joins ${host.name}.`)
  return { ok: true }
}

export function canLeave (game, c) {
  const host = hostOf(game, c)
  if (!host) return { ok: false, reason: 'it is not with a unit' }
  if (host.status.moved || host.status.engaged || host.status.fleeing || host.status.stupid || host.status.charged) return { ok: false, reason: `${host.name} has moved or cannot move this phase` }
  return { ok: true }
}

// Leave: the character steps out beside the unit's front corner, and may then make its own move.
export function leave (game, c) {
  const r = canLeave(game, c)
  if (!r.ok) return r
  const host = hostOf(game, c)
  host.joined = joinedOf(host).filter(x => x !== c)
  c.status.joinedTo = null
  c.joinedHost = null
  const f = dirOf(host.facing); const right = rightOf(host.facing)
  const hw = (Math.min(host.files, host.models.length) * host.base.w) / 2
  c.facing = host.facing
  c.pos = add(add(host.pos, mul(right, -(hw + c.base.w / 2 + 1.05))), mul(f, 0))
  say(game, '', `${c.name} leaves ${host.name}.`)
  return { ok: true }
}

function syncOne (c, host) {
  c.pos = { ...host.pos }
  c.facing = host.facing
  c.placed = host.placed
}

// After anything moves: joined characters go where their units went and share their fate.
export function syncJoined (game) {
  for (const c of game.units) {
    if (!c.status.joinedTo || c.status.removed) continue
    const host = game.units.find(u => u.id === c.status.joinedTo)
    if (!host) { c.status.joinedTo = null; c.joinedHost = null; continue }
    if (host.status.removed || isDead(host)) {
      const how = host.status.destroyed || ''
      if (/run down|off the table|abandon/.test(how)) {
        c.status.removed = true
        c.status.destroyed = `with ${host.name} (${how})`
        // (nobody may stay engaged with it)
        for (const o of game.units) if (o.engagedWith?.[c.id]) { delete o.engagedWith[c.id]; if (!Object.keys(o.engagedWith).length) o.status.engaged = false }
        c.engagedWith = {}
        say(game, 'bad', `${c.name} is lost with ${host.name}.`)
      } else {
        // its unit is gone around it: it stands alone where the unit stood
        c.status.joinedTo = null
        c.joinedHost = null
        // (no longer one of the unit's characters: combat would otherwise fight it as one)
        host.joined = (host.joined || []).filter(x => x !== c)
        c.pos = { ...host.pos }
        c.facing = host.facing
        if (!c.status.keepEngaged) {
          c.status.engaged = false; c.engagedWith = {}
          // (nobody may stay engaged with it)
          for (const o of game.units) if (o.engagedWith?.[c.id]) { delete o.engagedWith[c.id]; if (!Object.keys(o.engagedWith).length) o.status.engaged = false }
        }
        c.status.keepEngaged = false
        say(game, '', `${c.name} is left standing alone where ${host.name} fell.`)
      }
      continue
    }
    syncOne(c, host)
    c.status.fleeing = host.status.fleeing
    c.status.engaged = host.status.engaged
    c.status.charged = host.status.charged
    c.status.chargeDistance = host.status.chargeDistance
    c.status.disordered = host.status.disordered
    c.status.followedUp = host.status.followedUp
    c.engagedWith = host.engagedWith
    c.status.moved = c.status.moved || host.status.moved
  }
}


// WHERE EACH JOINED CHARACTER STANDS. A joining character goes into the front rank and pushes rank-and-file models
// (never the command group) back to the rear rank. A base too big for the ranks stands at the end of the front rank,
// touching it; if the front rank has no room at all, the character goes in the rear rank.
// Which place in the front rank is not printed; here each character takes the rank-and-file place nearest the command
// group (the middle without one), a tie to the right. Returns { front: [{ c, file, model }] (the file it holds and the
// rank-and-file model it displaced), flank: [c], rear: [c] }. Combat (combat.js attackGroupsInner) counts the rank and
// file in the fighting rank without these places; the table draws them there (view/joinedSlots.js).
const COMMAND_ROLES = new Set(['champion', 'standard', 'musician'])
const sameBase = (a, b) => Math.abs(a.base.w - b.base.w) < 0.02 && Math.abs(a.base.d - b.base.d) < 0.02
export function joinedPlaces (host) {
  const out = { front: [], flank: [], rear: [], row: [] }
  const chars = joinedOf(host).filter(c => alive(c).length)
  if (!chars.length) return out
  if (host.formation === 'lance' || host.formation === 'skirmish') { out.flank.push(...chars); return out }
  const files = filesOf(host)
  // the front rank left to right: { model } for the unit's own, { c } for a character
  const row = modelSlots(host).filter(s => s.rank === 0).sort((a, b) => a.file - b.file).map(s => ({ model: s.model }))
  const displaced = new Map()
  for (const c of chars) {
    if (!sameBase(c, host)) { out.flank.push(c); continue }
    const cmdAt = row.map((e, i) => e.model && COMMAND_ROLES.has(e.model.role) ? i : -1).filter(i => i >= 0)
    const mid = cmdAt.length ? (cmdAt[0] + cmdAt[cmdAt.length - 1]) / 2 : (row.length - 1) / 2
    if (row.length < files) {
      // room in a rank that is not full: it steps in beside the command (the right-hand side), displacing nobody
      const at = cmdAt.length ? cmdAt[cmdAt.length - 1] + 1 : Math.ceil(mid + 0.5)
      row.splice(Math.min(row.length, at), 0, { c })
      continue
    }
    const free = row.map((e, i) => e.model && !COMMAND_ROLES.has(e.model.role) ? i : -1).filter(i => i >= 0)
    if (!free.length) { out.rear.push(c); continue }
    const i = free.reduce((b, j) => Math.abs(j - mid) < Math.abs(b - mid) || (Math.abs(j - mid) === Math.abs(b - mid) && j > b) ? j : b)
    displaced.set(c, row[i].model)
    row[i] = { c }
  }
  // the places on the front rank as it stands with the characters in it, centred like any rank (units.js modelSlots)
  const offset = (files - Math.min(files, row.length)) / 2
  row.forEach((e, i) => { if (e.c) out.front.push({ c: e.c, file: offset + i, model: displaced.get(e.c) || null }) })
  out.row = row
  return out
}
