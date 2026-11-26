// The Sand Kings of Kheshet's own army rules, as small functions and tables that the shared rules modules call at the
// right moment (combat, damage, Leadership, magic and others; each comment says where).

import { say } from './game.js'
import { hasRule, alive, isDead } from './units.js'
import { rollDice } from './dice.js'

const live = c => !c.status?.removed && !isDead(c)
// its own Leadership: the model's, or for a character in a chariot, the crew's (Split Profile Chariots)
const ownLd = u => Math.max(0, ...alive(u).map(m => m.profile.Ld ?? 0), ...(u.crew || []).map(c => c.profile?.Ld ?? 0)) || 7
const turnKey = game => `${game.round}:${game.active}`
const hostIn = (game, c) => game?.units?.find(h => (h.joined || []).includes(c)) || null
const d3 = game => Math.ceil(rollDice(game.rng, 1)[0] / 2)

// The Hierophant — the army's Grave Priest of the highest Level is its Hierophant (of several,
// the first in the list here: the player's choice is not asked); its fall is the Undead's Death of a General
// (vampires.js generalFalls). Marked when the game is made (game.js).
export function markHierophants (game, wizardLevel) {
  for (const side of [0, 1]) {
    const priests = game.units.filter(u => u.side === side && u.army === 'sand-kings-of-kheshet' && /^(high-priest|mortuary-priest)/.test(u.entryId || ''))
    // (the one named on the muster list; else the Grave Priest of the highest Level)
    if (game.units.some(u => u.side === side && u.isHierophant)) continue
    const best = priests.sort((a, b) => wizardLevel(b) - wizardLevel(a))[0]
    if (best) best.isHierophant = true
  }
}

// Arrows of Ishra — its shooting never applies any To Hit modifier (shooting.js)
export const arrowsOfIshra = u => hasRule(u, 'Arrows of Ishra')
// Khopesh — a single ordinary hand weapon has AP -1 (not its mount) (combat.js)
export const khopesh = (a, w) => hasRule(a, 'Khopesh') && !w.magic && /^hand weapon$/i.test(w.key || '')

// Dry as Dust — each unsaved wound from a Flaming Attack, the opponent rolls a D6: 4+, one more
// Wound lost (Relic of the Desert Sun: not its bearer). Returns the extra Wounds.
export function dryAsDust (game, t, unsaved) {
  if (!unsaved || !hasRule(t, 'Dry as Dust') || (t.items || []).includes('relic-of-the-desert-sun')) return 0
  const dice = rollDice(game.rng, unsaved)
  const n = dice.filter(d => d >= 4).length
  say(game, 'roll', `${t.name} is Dry as Dust: [${dice.join(' ')}] — ${n} more Wound${n === 1 ? '' : 's'} as the flames take hold.`)
  return n
}

// Curse of the Necropolis — slain by an enemy attack, the attacking unit takes a Leadership test;
// failed, D3 S2 hits (damage.js removeUnit; the attacker: game.combatKillerUnit in combat, the shooter in shooting)
export function curseOfTheNecropolis (game, u, leadershipTest, spellHits) {
  if (!hasRule(u, 'Curse of the Necropolis')) return
  // ("to an enemy attack": the unit striking now in combat, or the unit shooting now — never one from earlier)
  const by = game.combatKiller != null && game.combatKillerUnit && game.combatKillerUnit.side !== u.side ? game.combatKillerUnit : game.phase === 'shooting' && game.lastShooter && game.lastShooter.side !== u.side ? game.lastShooter : null
  if (!by || !live(by)) return
  const t = leadershipTest(game, by, { label: `${by.name} — the Curse of the Necropolis` })
  say(game, 'roll', t.text)
  if (t.passed) return
  const n = d3(game)
  say(game, 'bad', `The Curse of the Necropolis falls on ${by.name}: ${n} Strength 2 hits.`)
  spellHits(game, by, n, 2, 0, { nonMagical: true, label: 'The Curse of the Necropolis: ' })
}

// My Will Be Done — in its own Command sub-phase, a Leadership test on its own Leadership;
// passed, it, its mount and its unit gain one of +D3 Movement, +1 Weapon Skill, +D3 Initiative (to 10) until its next
// Start of Turn; not cumulative (ui/phases.js)
// The Crown of Kheshet: Amenkhet's affects every friendly Kheshite Undead unit within 6" (not handled)
export const canWill = (game, u) => hasRule(u, 'My Will Be Done') && live(u) && u.side === game.active && u.status.willTurn !== turnKey(game) && !u.status.fleeing
export function myWillBeDone (game, u, choice, statMod, addEffect) {
  u.status.willTurn = turnKey(game)
  const ld = ownLd(u)
  const d = rollDice(game.rng, 2)
  const ok = d[0] + d[1] === 2 || (d[0] + d[1] !== 12 && d[0] + d[1] <= ld)
  say(game, 'roll', `${u.name} — My Will Be Done: Leadership test ${d.join('+')} = ${d[0] + d[1]}, needs ${ld} or less — ${ok ? 'passed' : 'FAILED'}.`)
  if (!ok) return
  const host = hostIn(game, u) || u
  const targets = [host, ...(host.joined || [])].filter(x => x.status.willOn !== turnKey(game))
  const k = choice === 'M' ? 'M' : choice === 'I' ? 'I' : 'WS'
  const n = k === 'WS' ? 1 : d3(game)
  for (const x of targets) {
    x.status.willOn = turnKey(game)
    const rv = statMod(game, x, [k], n)
    addEffect(game, { kind: 'statMod', category: 'Will', spell: 'My Will Be Done', side: u.side, casterId: u.id, unitId: x.id, until: 'nextStartOfTurn', revert: rv })
  }
  say(game, 'good', `${u.name}: "${k === 'M' ? 'Forward to Glory!' : k === 'I' ? 'Strike like the Cobra!' : 'My Worthy Champions!'}" — +${n} ${k === 'M' ? 'Movement' : k === 'I' ? 'Initiative' : 'Weapon Skill'} until the next Start of Turn.`)
}

// Eternal Taskmaster — in the Command sub-phase of its turn, joined to a unit: a Leadership test;
// passed, it and its unit Extra Attacks (+1) and Hatred (all enemies) until its next Start of Turn (combat.js reads
// status.taskmaster for the attack; Hatred as a granted rule)
export const canTaskmaster = (game, u) => hasRule(u, 'Eternal Taskmaster') && live(u) && u.side === game.active && !!hostIn(game, u) && u.status.taskTurn !== turnKey(game)
export function eternalTaskmaster (game, u, addEffect) {
  u.status.taskTurn = turnKey(game)
  const ld = ownLd(u)
  const d = rollDice(game.rng, 2)
  const ok = d[0] + d[1] === 2 || (d[0] + d[1] !== 12 && d[0] + d[1] <= ld)
  say(game, 'roll', `${u.name} — Eternal Taskmaster: Leadership test ${d.join('+')} = ${d[0] + d[1]}, needs ${ld} or less — ${ok ? 'passed' : 'FAILED'}.`)
  if (!ok) return
  const host = hostIn(game, u)
  for (const x of [host, u]) {
    const had = x.special.has('Hatred (all enemies)')
    x.special.add('Hatred (all enemies)')
    x.status.taskmaster = true
    addEffect(game, { kind: 'ench', category: 'Taskmaster', spell: 'Eternal Taskmaster', side: u.side, casterId: u.id, unitId: x.id, until: 'nextStartOfTurn', revert: () => { x.status.taskmaster = false; if (!had) x.special.delete('Hatred (all enemies)') } })
  }
  say(game, 'good', `${u.name} drives ${host.name} on: Extra Attacks (+1) and Hatred (all enemies) until the next Start of Turn.`)
}

// Soul Reaper — after deployment, an enemy character is marked (its player's choice, asked:
// ui/battle.js, a.status.soulMark; with no player, the enemy General); natural 1s To Hit against it re-rolled (combat.js)
export const soulMarked = (game, a, b) => hasRule(a, 'Soul Reaper') && b.side !== a.side && [b, ...(b.joined || [])].some(c => live(c) && (a.status?.soulMark ? c.id === a.status.soulMark : c.isGeneral))

// Covenant of Power — within 12" of a Urn of Souls, a friendly Grave Priest +1 to cast; any
// model casting a Bound spell +1 (not the Casket's own) (magic.js)
export const covenant = (game, u, bound, distanceBetween) => game.units.some(k => k.placed && live(k) && hasRule(k, 'Covenant of Power') && k !== u && distanceBetween(k, hostIn(game, u) || u) <= 12 && ((bound && !hasRule(u, 'Vortex of Souls')) || (k.side === u.side && /^(high-priest|mortuary-priest)/.test(u.entryId || ''))))

// Unbound Spirits — the Casket's crew slain: a D6 for every unit within 12" (friend or foe), 4+
// D6 S3 hits, no armour or Regeneration save; then the Casket is removed (damage.js removeUnit)
export function unboundSpirits (game, u, spellHits, distanceBetween) {
  if (!hasRule(u, 'Unbound Spirits')) return
  for (const o of game.units.filter(o => o !== u && o.placed && live(o) && distanceBetween(o, u) <= 12)) {
    const r = rollDice(game.rng, 1)[0]
    if (r < 4) { say(game, 'roll', `The Casket's spirits pass ${o.name} by (D6 = ${r}).`); continue }
    const n = rollDice(game.rng, 1)[0]
    say(game, 'bad', `UNBOUND SPIRITS tear at ${o.name} (D6 = ${r}): ${n} Strength 3 hits, no armour or Regeneration save.`)
    spellHits(game, o, n, 3, 0, { noArmour: true, noRegen: true, label: 'Unbound Spirits: ' })
  }
}

// Vortex of Souls, Light of Protection — Remains in Play: the Casket and friendly units within
// 18" of it a 6+ Ward, and enemies -1 To Hit against them; it ends if the Casket casts Light of Death (spells.js)
export function lightProtected (game, u, distanceBetween) {
  return (game?.effects || []).some(e => e.kind === 'lightOfProtection' && e.side === u.side && (() => { const k = game.units.find(x => x.id === e.casterId); return k && live(k) && k.placed && (k === u || distanceBetween(k, hostIn(game, u) || u) <= 18) })())
}
