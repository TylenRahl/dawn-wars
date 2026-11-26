// The Lornefolk of Lorne Wood's own army rules, as small functions and tables that the shared rules modules call at the
// right moment (combat, damage, Leadership, magic and others; each comment says where).

import { say } from './game.js'
import { hasRule, alive, isDead, corners, unitLabel } from './units.js'
import { rollDice } from './dice.js'
import { segDist, pointInPoly } from './geometry.js'

const live = c => !c.status?.removed && !isDead(c)
const turnKey = game => `${game.round}:${game.active}`
const hostIn = (game, c) => game?.units?.find(h => (h.joined || []).includes(c)) || null

// Within d" of a woodland terrain feature (a Tree Singing wood included: terrain.js terrainOf)
export function nearWood (game, u, d) {
  const woods = [...(game?.terrain || []), ...(game?.effects || []).filter(e => e.kind === 'vortex' && e.woodland).map(e => ({ kind: 'wood', poly: Array.from({ length: 12 }, (_, i) => ({ x: e.at.x + Math.cos(i / 12 * Math.PI * 2) * e.r, y: e.at.y + Math.sin(i / 12 * Math.PI * 2) * e.r })) }))].filter(f => f.kind === 'wood')
  if (!woods.length || !u.pos) return false
  const cs = corners(u)
  return woods.some(f => cs.some(p => pointInPoly(p, f.poly)) || f.poly.some(p => pointInPoly(p, cs)) ||
    cs.some((p, i) => f.poly.some((q, j) => segDist(p, cs[(i + 1) % cs.length], q, f.poly[(j + 1) % f.poly.length]) <= d)))
}

// Untouchable saves (damage.js saveFor):
// Daughters of Eternity 4+; Favour of the Goddess 5+ (Faelan); Talismanic Tattoos 6+;
// Dances of Lirrin, The Shadows Coil: 4+ until the end of this Combat phase; Cloak of Siriel 5+;
// Raelith's Mantle 4+ within 6" of a woodland terrain feature
export function woodWards (game, u) {
  const out = []
  if (hasRule(u, 'Daughters of Eternity')) out.push({ value: 4, source: 'Daughters of Eternity' })
  if (hasRule(u, 'Favour of the Goddess')) out.push({ value: 5, source: 'Favour of the Goddess' })
  if (hasRule(u, 'Talismanic Tattoos')) out.push({ value: 6, source: 'Talismanic Tattoos' })
  if (game && danceOf(game, u) === 'coil') out.push({ value: 4, source: 'the Shadows Coil (Dances of Lirrin)' })
  if ((u.items || []).includes('cloak-of-siriel')) out.push({ value: 5, source: 'the Cloak of Siriel' })
  if ((u.items || []).includes('railarians-mantle') && game && nearWood(game, u, 6)) out.push({ value: 4, source: "Raelith's Mantle (within 6\" of a wood)" })
  return out
}

// Dances of Lirrin — chosen when its combat is chosen (combat.js fightCombatInner); every model
// performs the same one for the rest of this Combat phase. A Gloomdancer that joins Wilddancers has the rule too
// (Troubadour of Lirrin).
export const DANCES = {
  whirling: 'Whirling Death (weapons AP improved by 2)',
  storm: 'Storm of Blades (Extra Attacks (+1))',
  coil: 'The Shadows Coil (4+ Untouchable save)',
  mist: 'Woven Mist (enemies attacking it -1 To Hit)'
}
export async function chooseDance (game, u, ask) {
  if (!hasRule(u, 'Dances of Lirrin') || hostIn(game, u)) return
  if (u.status.dance?.key === turnKey(game)) return
  // (with no player to ask, Storm of Blades — a guess at the choice)
  const pick = ask ? await ask(`${u.name}: which Dance of Lirrin this Combat phase?`, Object.entries(DANCES).map(([k, v]) => [v, k])) : 'storm'
  u.status.dance = { key: turnKey(game), dance: pick }
  say(game, '', `${u.name} perform a Dance of Lirrin: ${DANCES[pick]}.`)
}
export function danceOf (game, u) {
  const own = u.status?.dance?.key === turnKey(game) && game.phase === 'combat' ? u.status.dance.dance : null
  if (own) return own
  // (Troubadour of Lirrin: a Gloomdancer with Wilddancers performs their Dance)
  const h = hasRule(u, 'Troubadour of Lirrin') ? hostIn(game, u) : null
  return h && hasRule(h, 'Dances of Lirrin') && h.status?.dance?.key === turnKey(game) && game.phase === 'combat' ? h.status.dance.dance : null
}
// Woven Mist: attacks directed at the unit (or a character in it) -1 To Hit
export const wovenMist = (game, b) => danceOf(game, b) === 'mist' || danceOf(game, hostIn(game, b) || b) === 'mist'

// Guardians of the Wildwood — in base contact with an enemy that causes Fear or Terror: +1
// Attacks (to 10) and Multiple Damage (2) (the whole enemy unit and its characters are read as in base contact)
export const causesFear = b => [b, ...(b.joined || [])].some(x => live(x) && (hasRule(x, 'Fear') || hasRule(x, 'Terror')))
export const guardians = (a, b) => hasRule(a, 'Guardians of the Wildwood') && causesFear(b)

// Boldest of the Bold — Faelan ignores every negative modifier to his Leadership
// (a unit he leads tests on his Leadership: read as his, so its negative modifiers are ignored too)
export const boldest = u => [u, ...(u.joined || [])].some(c => live(c) && hasRule(c, 'Boldest of the Bold'))

// Tree Spirit — a Tree Spirit character joins only Tree Spirit units; a Tree Spirit unit is
// joined by, and uses the Leadership of, only Tree Spirit characters (joining.js, leadership.js)
export function treeSpiritJoinProblem (c, host) {
  const a = hasRule(c, 'Tree Spirit'); const b = hasRule(host, 'Tree Spirit')
  if (a && !b) return `${c.name} is a Tree Spirit: it can only join a unit of Tree Spirits`
  if (b && !a) return `${host.name} are Tree Spirits: only a Tree Spirit character may join them`
  return null
}
export const treeSpiritLd = (u, c) => !hasRule(u, 'Tree Spirit') || hasRule(c, 'Tree Spirit')

// Tree Whack — once per turn in the Combat phase, one of the model's Attacks becomes a Tree
// Whack at a single enemy model it is engaged with: an Initiative test; failed, D3 hits at the model's Strength, no
// Armour Roll (Ward and Regeneration saves as normal). Here each model in base contact makes one, at its Initiative,
// against the enemy unit's rank and file (a stand-in for the nominated model). (combat.js attackGroups)
export function treeWhack (game, a, b, g, spellHits) {
  let lost = 0
  for (let k = 0; k < (g.models || 1); k++) {
    if (b.status.removed || isDead(b)) break
    const t = alive(b).find(m => m.role === 'rank') || alive(b)[0]
    const I = t?.profile.I ?? 1
    const r = rollDice(game.rng, 1)[0]
    // (a characteristic test: a natural 6 always fails, a 1 always passes)
    const passed = r === 1 || (r !== 6 && r <= I)
    say(game, 'roll', `${a.name}: TREE WHACK at ${b.name} — Initiative test, rolled ${r}, needs ${I} or less — ${passed ? 'avoided' : 'FAILED'}.`)
    if (passed) continue
    const n = Math.ceil(rollDice(game.rng, 1)[0] / 2)
    lost += spellHits(game, b, n, g.s, 0, { noArmour: true, nonMagical: !hasRule(a, 'Magical Attacks'), label: `Tree Whack (D3 = ${n} Strength ${g.s} hits, no Armour Roll): ` }) || 0
  }
  return lost
}

// The Arrow of Talorn — after deployment, before the roll-off for the first turn: the
// opponent's General within 36" of a model with it takes a single S3 hit, no armour or Regeneration save (Ward as
// normal); if fired, the opponent +1 on that roll-off. Returns the roll-off modifiers, [side 0, side 1].
export function arrowOfTalorn (game, spellHits, distanceBetween, fire = () => true) {
  const mods = [0, 0]
  for (const side of [0, 1]) {
    const gen = game.units.find(c => c.side !== side && c.isGeneral && c.placed && live(c))
    if (!gen) continue
    const archer = game.units.find(x => x.side === side && x.placed && live(x) && [x, ...(x.joined || [])].some(c => live(c) && hasRule(c, 'The Arrow of Talorn')) && distanceBetween(x, gen) <= 36)
    if (!archer || !fire(side, archer, gen)) continue
    say(game, 'roll', `${game.sides[side].name} fire THE ARROW OF TALORN from ${archer.name} at ${gen.name}: a Strength 3 hit, no armour or Regeneration save. ${game.sides[1 - side].name} add +1 to the roll-off for the first turn.`)
    spellHits(game, gen, 1, 3, 0, { noArmour: true, noRegen: true, nonMagical: true, label: 'The Arrow of Talorn: ' })
    mods[1 - side] += 1
  }
  return mods
}

// Vessa the Eye Thief — in the Command sub-phase of his turn, a D6: 3+, one enemy model
// within 18" of Faelan takes a S4 AP -1 hit; an unsaved wound costs it D3 Weapon Skill and Initiative (to 1) for the
// rest of the game (the target's rank and file, or a lone character). (ui/phases.js Command button)
export function canSkaryn (game, u) {
  return hasRule(u, 'Vessa the Eye Thief') && live(u) && u.side === game.active && u.status.skaryn !== turnKey(game) && !u.status.fleeing
}
export function skaryn (game, u, t, spellHits) {
  u.status.skaryn = turnKey(game)
  const r = rollDice(game.rng, 1)[0]
  if (r <= 2) { say(game, 'roll', `${u.name} sends Vessa the Eye Thief: D6 = ${r} — Vessa lingers out of reach.`); return }
  say(game, 'roll', `${u.name} sends Vessa the Eye Thief: D6 = ${r} — Vessa strikes at ${t.name}: a Strength 4 hit, AP -1.`)
  const before = alive(t).reduce((a, m) => a + m.wounds, 0)
  spellHits(game, t, 1, 4, -1, { nonMagical: true, label: 'Vessa: ' })
  const after = alive(t).reduce((a, m) => a + m.wounds, 0)
  if (after < before && !t.status.removed && !isDead(t)) {
    const n = Math.ceil(rollDice(game.rng, 1)[0] / 2)
    const m = alive(t).find(x => x.role === 'rank') || alive(t)[0]
    m.profile = { ...m.profile, WS: Math.max(1, (m.profile.WS ?? 3) - n), I: Math.max(1, (m.profile.I ?? 3) - n) }
    say(game, 'bad', `Vessa takes ${t.name}'s eyes: -${n} Weapon Skill and Initiative for the rest of the game (now WS${m.profile.WS}, I${m.profile.I}).`)
  }
}

// Spectral Hounds — whilst one or more Hounds remain, Hernath cannot be targeted by enemy
// shooting (shooting.js). No saved page gives the Hounds of Hernath a profile, so Hernath is fielded alone and no Hound
// remains: the rule waits for Hound models (and their "only wounded by Magical attacks").
export const spectralHounds = t => alive(t).some(m => /hound/i.test(m.name)) && [...(t.special || [])].some(r => /^Spectral Hounds/.test(r))

// Hawk-eyed Archer — may target any enemy character it can see, whatever the rules for
// targeting lone characters (shooting.js)
export const hawkEyed = u => hasRule(u, 'Hawk-eyed Archer')

// Cloak of Siriel — each Start of Turn, a D6: 5+ Hernath recovers a Wound lost earlier (turn.js)
export function cloakOfSiriel (game, u) {
  if (!(u.items || []).includes('cloak-of-siriel') || !live(u)) return
  const m = alive(u)[0]
  if (!m || m.wounds >= (m.startW ?? m.profile.W ?? 1)) return
  const r = rollDice(game.rng, 1)[0]
  if (r >= 5) m.wounds += 1
  say(game, r >= 5 ? 'good' : 'roll', `${u.name}'s Cloak of Siriel: D6 = ${r}${r >= 5 ? ` — a Wound recovered (${m.wounds} now)` : ' — no Wound recovered'}.`)
}

// Horn of the Wild Hunt — once a game, in the Command sub-phase of Hernath's turn: friendly units in
// his Command range are Frenzied until the end of the turn (even one that lost its Frenzy) (ui/phases.js)
export const canHorn = (game, u) => (u.items || []).includes('horn-of-the-wild-hunt') && live(u) && u.side === game.active && !u.status.hornSounded
export function soundHorn (game, u, commandRange, distanceBetween) {
  u.status.hornSounded = true
  const units = game.units.filter(x => x.side === u.side && x.placed && live(x) && !x.status.joinedTo && distanceBetween(x, u) <= commandRange(u))
  const added = []
  for (const x of units) if (![...x.special].some(r => r.startsWith('Frenzy'))) { x.special.add('Frenzy'); added.push(x) }
  for (const x of units) if (x.status.frenzyLost) { x.status.frenzyLostWas = true; x.status.frenzyLost = false }
  game.hornUntil = { key: turnKey(game), revert: () => { for (const x of added) x.special.delete('Frenzy'); for (const x of units) if (x.status.frenzyLostWas) { x.status.frenzyLost = true; x.status.frenzyLostWas = false } } }
  say(game, 'good', `${u.name} sounds the HORN OF THE WILD HUNT: ${units.length} friendly unit${units.length === 1 ? '' : 's'} Frenzied until the end of the turn.`)
}
export function hornEnds (game) {
  if (game.hornUntil && game.hornUntil.key !== turnKey(game)) { game.hornUntil.revert(); game.hornUntil = null; say(game, '', 'The Horn of the Wild Hunt falls silent: its Frenzy ends.') }
}

// A Cackle of Sprites — when its combat is chosen, one enemy unit it fights: D3 S2
// AP -1 hits (combat.js fightCombatInner; the unit is its player's choice, asked; with no player, the first)
export async function murderOfSpites (game, u, units, spellHits, ask) {
  for (const c of [u, ...(u.joined || [])].filter(c => live(c) && (c.items || []).includes('a-cackle-of-sprites'))) {
    const host = hostIn(game, c) || c
    const foes = units.filter(o => o.side !== c.side && host.engagedWith?.[o.id] && live(o))
    const foe = ask && foes.length > 1 ? await ask(`${game.sides[c.side].name}: ${c.name}'s Cackle of Sprites — which enemy unit?`, foes.map(o => [unitLabel(o, foes), o])) ?? foes[0] : foes[0]
    if (!foe) continue
    const n = Math.ceil(rollDice(game.rng, 1)[0] / 2)
    say(game, 'roll', `${c.name}'s Cackle of Sprites swarms ${foe.name}: D3 = ${n} Strength 2 hits, AP -1.`)
    spellHits(game, foe, n, 2, -1, { nonMagical: true, label: 'A Cackle of Sprites: ' })
  }
}
// A Bewilderment of Pucks — in the Combat phase, a single enemy unit in base contact with the
// bearer -1 Weapon Skill and Initiative (combat.js). The unit is its player's choice, asked when its combat is chosen
// (chooseBefuddled; with no player, the first); until then, each enemy unit engaged with the bearer's unit.
export const befuddled = (game, a, b) => [b, ...(b.joined || [])].some(c => live(c) && (c.items || []).includes('a-bewilderment-of-pucks') && (c.status.befuddle?.key !== `${game.round}:${game.active}` || c.status.befuddle.id === (hostIn(game, a) || a).id)) && !!(a.engagedWith?.[b.id] || (hostIn(game, a)?.engagedWith?.[b.id]))
export async function chooseBefuddled (game, u, units, ask) {
  for (const c of [u, ...(u.joined || [])].filter(c => live(c) && (c.items || []).includes('a-bewilderment-of-pucks'))) {
    const key = `${game.round}:${game.active}`
    if (c.status.befuddle?.key === key) continue
    const host = hostIn(game, c) || c
    const foes = units.filter(o => o.side !== c.side && host.engagedWith?.[o.id] && live(o))
    if (!foes.length) continue
    const foe = ask && foes.length > 1 ? await ask(`${game.sides[c.side].name}: ${c.name}'s Befuddlement of Mischiefs — which enemy unit is befuddled (-1 Weapon Skill and Initiative)?`, foes.map(o => [unitLabel(o, foes), o])) : foes[0]
    c.status.befuddle = { key, id: (foe || foes[0]).id }
    say(game, '', `${c.name}'s Befuddlement of Mischiefs: ${(foe || foes[0]).name} -1 Weapon Skill and Initiative this phase.`)
  }
}
// A Tangle of Snarelings — its opponent in a challenge -1 To Hit (combat.js)
export const netlings = b => (b.items || []).includes('a-tangle-of-snarelings')
// A Keening of Sorrows — enemy units within 6" -1 Leadership for Fear, Panic and Terror
// tests (to 2) (leadership.js)
export const lamenting = (game, u, distanceBetween) => game.units.some(c => c.side !== u.side && c.placed && live(c) && !c.status.fleeing && (c.items || []).includes('a-keening-of-sorrows') && distanceBetween(hostIn(game, c) || c, u) <= 6)
// Wraithstone — enemy units within 6" of its bearer (not fleeing) -1 Leadership (to 2)
export const wraithstoned = (game, u, distanceBetween) => game.units.some(c => c.side !== u.side && c.placed && live(c) && !c.status.fleeing && (c.items || []).includes('wraithstone') && distanceBetween(hostIn(game, c) || c, u) <= 6)

// Shadewood Coven — Sisters of the Bramble know one spell, rolled at random from
// Battle Magic or Elementalism (its lore chosen on the muster list; Battle Magic if none) and casts it as a Bound
// spell: Power Level 1 with a Handmaiden of the Thorn, 2 with her and a standard bearer, else 0. (Swapping it for the
// lore's signature spell is not offered: the rolled spell is kept.) (magic.js boundSpellsOf)
export function covenSpell (game, u, loreSpells) {
  const lore = ['battle-magic', 'elementalism'].includes(u.lore) ? u.lore : 'battle-magic'
  const spells = loreSpells(lore).filter(s => s.number)
  if (!spells.length) return
  const r = rollDice(game.rng, 1)[0]
  const s = spells.find(x => x.number === r) || spells[0]
  u.covenSpell = s.slug
  say(game, 'roll', `${u.name} (Shadewood Coven) roll for their spell from ${s.loreName || lore}: D6 = ${r} — ${s.name}.`)
}
export function covenPower (u) {
  const champ = alive(u).some(m => m.role === 'champion')
  const std = alive(u).some(m => m.role === 'standard')
  return champ && std ? 2 : champ ? 1 : 0
}
