// Shooting that is not an ordinary volley: Breath Weapons, Pigeon Bombs, the Breath of Change, and which of a
// model's weapons shoots when it has more than one (an Iron Kettle's cannon, steam gun and its Engineer's rifle; a
// War Wagon crew's three missile weapons). Exports weaponChoices, canBreathe, breathe, pigeonBomb and
// breathOfChange, used by shooting.js and the battle screen (ui/phases.js).

import { say } from './game.js'
import { d6, rollDice } from './dice.js'
import { centre, corners, distanceBetween, isDead, arcOf, alive, hasRule } from './units.js'
import { rangedWeaponsOf, equip, hasCrewPlatform, applyMultipleDamage } from './damage.js'
import { machineWeapon } from './warMachines.js'
import { flameTemplate, templateHits, spellHits } from './spells.js'
import { afterShooting, panicTest } from './shooting.js'
import { hasAssortedWeapons, ASSORTED } from './vehicles.js'
import { nearestOnSeg } from './geometry.js'

// The ways this unit may shoot this turn: [{ id, name }]. 'ranged:<key>', 'machine', 'breath', 'pigeon', 'crew'.
export function weaponChoices (u) {
  if (!u.kit) equip(u)
  const out = []
  if (hasAssortedWeapons(u)) {
    const ws = rangedWeaponsOf(u).filter(w => ASSORTED.missile.includes(w.key))
    if (ws.length) out.push({ id: 'crew', name: `the crew's ${ws.map(w => w.name.toLowerCase()).join(', ')}` })
  } else for (const w of rangedWeaponsOf(u)) out.push({ id: 'ranged:' + w.key, name: w.name })
  const mw = machineWeapon(u)
  if (mw && !/war machine/i.test(u.category)) out.push({ id: 'machine', name: mw.name })
  // (Two-headed Dragon: either of two breaths, not both in one turn)
  if ((u.kit.breaths || []).length > 1) u.kit.breaths.forEach((b, i) => out.push({ id: 'breath:' + i, name: `${b.name} (Breath Weapon)` }))
  else if (u.kit.breath) out.push({ id: 'breath', name: `${u.kit.breath.name} (Breath Weapon)` })
  // Breath of Change: once a game, instead of his other breaths
  if (hasRule(u, 'Breath of Change') && !u.status.changeBreathed) out.push({ id: 'breath:change', name: 'the Breath of Change (once a game)' })
  if (u.options?.some(o => /pigeon bombs/i.test(o))) out.push({ id: 'pigeon', name: 'Pigeon bombs' })
  return out
}

// Breath Weapon — once per round, in the Shooting phase of its turn, not engaged and
// not as a Stand & Shoot: the flame template, narrow end against the model's base along its front
// arc, its broad end over the target; every model under it risks being hit.
export function canBreathe (game, u, t) {
  if (!u.kit) equip(u)
  if (!u.kit.breath) return { ok: false, reason: 'no Breath Weapon' }
  // (a Gutcannon's broken or jammed cannon: its scatter shot is the same gun — Cannon of the Cloud-Titans)
  if (u.kit.breath.key?.startsWith('cannon of the cloud-titans') && (u.status.weaponBroken || (u.status.cannotShootUntilRound != null && (game.round < u.status.cannotShootUntilRound || (game.round === u.status.cannotShootUntilRound && game.active === u.status.cannotShootSide))))) return { ok: false, reason: 'its cannon is broken or being repaired' }
  if (u.status.breathRound === game.round) return { ok: false, reason: 'its Breath Weapon is used once a round' }
  if (u.status.engaged) return { ok: false, reason: 'it is engaged in combat' }
  if (game.phase !== 'shooting' || game.active !== u.side) return { ok: false, reason: 'only in the Shooting phase of its turn' }
  // the whole template must be inside the model's vision arc (all round for a firing platform)
  if (t && !hasCrewPlatform(u) && arcOf(u, centre(t)) !== 'front') return { ok: false, reason: `${t.name} is not in its front arc` }
  if (t && distanceBetween(u, t) > 8) return { ok: false, reason: `${t.name} is ${distanceBetween(u, t).toFixed(1)}" away, beyond the flame template's 8"` }
  return { ok: true }
}
export function breathe (game, u, t) {
  const c = canBreathe(game, u, t)
  if (!c.ok) { say(game, 'bad', `${u.name} cannot use its Breath Weapon: ${c.reason}.`); return 0 }
  const w = u.kit.breath
  u.status.breathRound = game.round
  u.status.shot = true
  const to = centre(t)
  const cs = corners(u)
  // the narrow end on the model's front edge (cs[0]-cs[1] is the front), at the point nearest the target —
  // anywhere round the base for a model that sees all round (Firing Platform)
  const edges = hasCrewPlatform(u) ? cs.map((c, i) => [c, cs[(i + 1) % 4]]) : [[cs[0], cs[1]]]
  const start = edges.map(([a, b]) => nearestOnSeg(to, a, b)).reduce((a, p) => Math.hypot(p.x - to.x, p.y - to.y) < Math.hypot(a.x - to.x, a.y - to.y) ? p : a)
  const poly = flameTemplate(start, to)
  game.lastShot = { kind: 'flame', poly }
  // (the table draws the breath along the template, in this weapon's colours — view/shotFx.js; it decides nothing)
  game.onShot?.({ kind: 'breath', shooter: u, from: start, to, weapon: w.name, key: w.key })
  // (Fiery Breath Vhar: Strength equal to the model's remaining Wounds)
  const S = /remaining (?:Wounds|Hit Points)/i.test(w.notes || '') ? Math.max(1, Math.min(10, u.models.find(m => m.wounds > 0 && m.role !== 'handler')?.wounds ?? 1)) : Number(String(w.S).match(/\d+/)?.[0] || 2)
  const AP = Number(String(w.AP).match(/-?\d+/)?.[0] || 0)
  // Steam Gun Concord Realm: no Armour Roll against its wounds
  const noArmour = /no Armour Roll/i.test(w.notes || '')
  say(game, 'h', `${u.name} uses its ${w.name} (Breath Weapon, Strength ${S}${AP ? ', AP ' + AP : ''}${noArmour ? ', no Armour Roll' : ''}) at ${t.name}.`)
  const wounds = new Map(game.units.map(o => [o, o.models.reduce((a, m) => a + Math.max(0, m.wounds), 0)]))
  const total = templateHits(game, null, 0, S, AP, { poly, except: u, label: `${w.name}: `, nonMagical: true, noArmour, flaming: (w.rules || []).includes('Flaming Attacks') })
  // Swamp breath: any unit it gives an unsaved wound to tests for Panic, as for heavy losses
  if (/panic test/i.test(w.notes || '')) {
    for (const [o, had] of wounds) if (o.side !== u.side && !o.status.removed && !isDead(o) && o.models.reduce((a, m) => a + Math.max(0, m.wounds), 0) < had && !o.status.panicTested) { o.status.panicTested = true; panicTest(game, o, u, `wounded by the ${w.name}`) }
  }
  afterShooting(game, t, u)
  return total
}

// Pigeon bombs — instead of shooting, an enemy unit within 24": D6 — 1 Bird Brain
// (a 3" template over the model that released it, S4 AP -1), 2-3 Fly Away Home (nothing), 4-5 Dud (one S5 AP -2
// hit on the target), 6 Perfect Delivery (a 3" template over the target's centre, S4 AP -1).
export function pigeonBomb (game, u, t) {
  if (distanceBetween(u, t) > 24) { say(game, 'bad', `${t.name} is beyond the pigeon's 24".`); return }
  u.status.shot = true
  const r = d6(game.rng)
  if (r === 1) {
    say(game, 'roll', `Pigeon bomb at ${t.name}: D6 = 1 — BIRD BRAIN: it comes home. A 3" template over ${u.name}, Strength 4, AP -1.`)
    templateHits(game, centre(u), 1.5, 4, -1, { label: 'Bird Brain: ', nonMagical: true })
  } else if (r <= 3) {
    say(game, 'roll', `Pigeon bomb at ${t.name}: D6 = ${r} — FLY AWAY HOME. No effect.`)
  } else if (r <= 5) {
    say(game, 'roll', `Pigeon bomb at ${t.name}: D6 = ${r} — DUD: one Strength 5 hit, AP -2.`)
    spellHits(game, t, 1, 5, -2, { label: 'Dud: ', nonMagical: true })
  } else {
    say(game, 'roll', `Pigeon bomb at ${t.name}: D6 = 6 — PERFECT DELIVERY: a 3" template over the centre of ${t.name}, Strength 4, AP -1.`)
    templateHits(game, centre(t), 1.5, 4, -1, { label: 'Perfect Delivery: ', nonMagical: true })
  }
  if (!isDead(t)) afterShooting(game, t, u)
}


// Breath of Change — once a game, instead of his other breaths: the flame template from his front
// arc; every model hit (friend or foe) takes a Toughness test — failed, it is removed as a casualty
export function breathOfChange (game, u, t) {
  const c = canBreathe(game, u, t)
  if (!c.ok) { say(game, 'bad', `${u.name} cannot use the Breath of Change: ${c.reason}.`); return 0 }
  u.status.breathRound = game.round
  u.status.changeBreathed = true
  u.status.shot = true
  const to = centre(t)
  const cs = corners(u)
  const start = nearestOnSeg(to, cs[0], cs[1])
  const poly = flameTemplate(start, to)
  game.lastShot = { kind: 'flame', poly }
  game.onShot?.({ kind: 'breath', shooter: u, from: start, to, weapon: 'Breath of Change', key: 'breath of change' })
  say(game, 'h', `${u.name} unleashes the BREATH OF CHANGE at ${t.name} (once a game): each model hit takes a Toughness test or is removed.`)
  const total = templateHits(game, null, 0, 0, 0, { poly, except: u, label: 'Breath of Change: ', onHit: (game, o, n) => {
    const T = (alive(o).find(m => m.role === 'rank') || alive(o)[0])?.profile.T ?? 3
    const d = rollDice(game.rng, n)
    const fail = d.filter(x => x === 6 || x > T).length
    say(game, 'roll', `${o.name}: Toughness tests [${d.join(' ')}] against T${T} — ${fail} fail${fail === 1 ? 's' : ''} and ${fail === 1 ? 'is' : 'are'} removed.`)
    if (!fail) return 0
    const each = alive(o).slice(0, fail).map(m => m.wounds)
    return applyMultipleDamage(game, o, each, 'the Breath of Change')
  } })
  afterShooting(game, t, u)
  return total
}
