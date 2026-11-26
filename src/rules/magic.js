// Magic: Wizards, their spells, casting, dispelling and backlashes. Exports wizardLevel, generateSpells, the casting
// and dispel steps and backlash; used by game.js, turn.js and the battle screens. The spells' own effects are in
// spells.js; the spell list (casting values, ranges, lores) is src/data/spells.js.
//
// Levels of Wizardry: Level 1 to 4.
// Spells: before deployment, roll a D6 per Level, re-rolling duplicates; a Wizard may then swap one for its lore's
//   signature spell.
// Casting spells: Enchantment and Hex in the Conjuration sub-phase, Conveyance in
//   Remaining Moves, Magic Missile and Magical Vortex in the Shooting phase, Assailment in combat;
//   as many casting attempts a turn as its Level, each spell once a turn; engaged Wizards cast only
//   Assailment or range 'Self' spells.
// Casting: 2D6 + Level/2 (rounded up); cast if it equals or beats the casting value.
// Backlash: a natural double 1 is a backlash — roll on the Backlash table.
// Perfect Invocations: a natural double 6 is cast whatever the value, and cannot
//   be dispelled.
// Magic Resistance (-X) on the target lowers the Casting roll.
// Choosing a Target: in the vision arc (no line of sight needed), in range, not
//   engaged in combat.
// Dispels: Wizardly — a Wizard within Dispel range (18" at Level 1-2, 24" at 3-4) of the caster, 2D6 + Level/2;
//   Fated — once a turn, 2D6. Dispelled if it EXCEEDS the casting result.
// OUTCLASSED IN THE ART: a natural double 1 on a Wizardly dispel: the dispeller
//   rolls on the Backlash table.
// UNBINDING: a natural double 6 on any dispel dispels it (not a perfect invocation).
// Backlash table: 2-4 Dimensional Cascade (5" template, S10 AP-4); 5-6 Calamitous
//   Detonation (3", S6 AP-2); 7 Careless Conjuration (S4 AP-1 hit on the Wizard); 8-9 Barely
//   Controlled Power (cast at its value, no more spells this turn); 10-12 Power Drain (perfect
//   invocation, no more spells this turn).
// Wizards and armour: a Wizard in armour or with a shield cannot cast or dispel.
// Channelling the Eight Threads (optional, game.options.channelling): each Wizard
//   has a pool of Channelling dice (Level 1 D3, 2 D3+1, 3 2D3, 4 2D3+1), rolled just before its
//   spells. One die: re-roll one spell when generating; an extra D6 on a Wizardly dispel (discard
//   the lowest); add a rolled D6 in inches to a spell's range or the Dispel range. Two dice:
//   re-roll a failed Casting or Dispel roll (never to avoid a backlash). With three dice, a double
//   1 or 6 on any two of them counts.

import { unmadeOfCipher, godOf } from './unmade.js'
import { celestialWizard, elementalMastery } from './shen.js'
import { sorcerersCurse, blackshardWizard } from './chaosdwarfs.js'
import { screenedTeam } from './gnawkin.js'
import { covenant } from './tombkings.js'
import { elfWizardArmour } from './highelves.js'
import { covenPower, nearWood } from './woodelves.js'
import { cursedCovenPower } from './darkelves.js'
import { shareInWoods } from './terrain.js'
import { currentGame } from './lyonne.js'
import { soulEaterNerve, darkSorcery, dtp } from './hornkin.js'
import { cipherCasting } from './dominion.js'
import { standsBack } from './dwarfs.js'
import { untutored } from './renegade.js'
import { touchingNatural } from './ambush.js'
import { polyDist as polyDistM } from './geometry.js'
import { castingValueFor, wandBackfire, feedback, transmogrificationRoll, glowyAmulet } from './arcane.js'
import { commandRange } from './leadership.js'
import { protectedBoss, syphonedStrength } from './trolls.js'
import { say, onTable, sideName } from './game.js'
import { rollDice, d6, d3, testLeadership } from './dice.js'
import { ruleValue, distanceBetween, centre, isDead, corners, hasRule } from './units.js'
import { unitMass } from './troops.js'
import { pointInPoly, pointSegDist } from './geometry.js'
import { SPELLS } from '../data/spells.js'
import { hostOf } from './joining.js'
import { itemFlag, itemWith, itemName, itemSum, spendItem, itemLeft, EFFECTS as ITEM_EFFECTS } from './items.js'
import { offerPloy, canPloy, usePloy } from './ploys.js'
import { rollRuse, dispelRuse, useDispelRuse, RUSE_NAMES } from './ruses.js'
import { applyWounds } from './damage.js'

export const wizardLevel = u => {
  const levels = [...u.special].filter(s => /^Level \d Wizard$/.test(s)).map(s => Number(s.match(/\d/)[0]))
  const lv = levels.length ? Math.max(...levels) : (u.special.has('Wizard') ? 1 : 0)
  // (Spirit of Vaelgrath: while his spirit rebels, Level 1)
  return u.status?.spiritRebels ? Math.min(lv, 1) : lv
}
export const isWizard = u => wizardLevel(u) > 0 && !u.status.removed && !isDead(u)
// Rune Lore — an Anvil of Ruin, Runelord or Runesmith dispels as if a Wizard, with its own Dispel
// range and modifier (24" +3, 21" +2, 18" +1) in place of a Level of Wizardry
const RUNE_LORE = { 'anvil-of-ruin': [24, 3], runelord: [21, 2], runesmith: [18, 1] }
const runeLoreOf = u => u.special?.has('Rune Lore') ? (RUNE_LORE[u.entryId] || [18, 1]) : null
export const canDispel = u => !u.status.removed && !isDead(u) && ((u.wizard && isWizard(u)) || !!runeLoreOf(u))
const dispelState = u => u.wizard || (u.runeLore = u.runeLore || {})
export const halfLevel = u => runeLoreOf(u) && !isWizard(u) ? runeLoreOf(u)[1] : Math.ceil(wizardLevel(u) / 2)
// (Idol of Wangler, Book of Iselde: +3" — Idol of Wangler)
// (Oaken Stave: +3" within 3" of a woodland terrain feature)
const oaken = u => (u.items || []).includes('oaken-stave') && !!currentGame() && nearWood(currentGame(), hostOf(currentGame(), u) || u, 3)
export const dispelRange = u => (runeLoreOf(u) && !isWizard(u) ? runeLoreOf(u)[0] : wizardLevel(u) >= 3 ? 24 : 18) + itemSum(u, 'dispelRange') + (oaken(u) ? 3 : 0)
// (magic armour counts too, except the Armour of Aschenbrand, which a Wizard may wear: Armour of Aschenbrand)
// (Dominion Armour Dominion Hosts: a Wizard with Dominion Armour may wear armour without penalty)
export const armoured = u => !hasRule(u, 'Dominion Armour') && !elfWizardArmour(u) && !blackshardWizard(u) && !celestialWizard(u) && ((u.armour && !/^$/.test(u.armour) && !/no armour/i.test(u.armour)) || u.kit?.shield || (u.items || []).some(id => ITEM_EFFECTS[id]?.armour && !ITEM_EFFECTS[id]?.flags?.wizardArmour))

export function loreSpells (lore) {
  return Object.values(SPELLS).filter(s => s.lore === lore).sort((a, b) => (a.number ?? 9) - (b.number ?? 9))
}

// Spell generation, before deployment. Returns what was rolled, for the log.
export function generateSpells (game, u) {
  const level = wizardLevel(u)
  const lore = u.lore
  const spells = loreSpells(lore).filter(s => s.number)
  // Tome of Midnight: one more spell than its Level gives (it still casts only its Level's number)
  // (Tome of Kelthar: the same)
  const count = Math.min(level + ((u.items || []).includes('tome-of-midnight') || (u.items || []).includes('tome-of-kelthar') || (u.items || []).includes('spell-familiar') || (u.items || []).includes('learned-fen-shao') || (u.items || []).includes('scrolls-of-shu-an') || (u.items || []).includes('twin-heads') ? 1 : 0), 6)
  // Arcane Familiar: spells from two lores, each rolled separately (here the rolls alternate between
  // them, starting with its first lore — the rule does not say how many from each; our guess)
  const lore2 = (u.items || []).includes('arcane-familiar') && u.lore2 && u.lore2 !== lore ? u.lore2 : null
  if (!spells.length) {
    say(game, 'bad', `${u.name}: the ${lore} lore is not in the game yet; it knows no spells.`)
    u.wizard = { level, lore, spells: [], castThisTurn: [], attempts: 0, channel: 0 }
    if (u.ruseBought) rollRuse(game, u) // (its Ruse is still its own)
    return
  }
  const known = new Set()
  const rolls = []
  // the Channelling pool is rolled immediately before the spells (Channelling the Eight Threads)
  let channel = 0
  if (game.options?.channelling) {
    const d = Array.from({ length: level >= 3 ? 2 : 1 }, () => d3(game.rng))
    channel = d.reduce((a, b) => a + b, 0) + (level === 2 || level === 4 ? 1 : 0)
    say(game, 'roll', `${u.name} (Level ${level}) rolls its Channelling dice: ${level >= 3 ? '2D3' : 'D3'}${level === 2 || level === 4 ? '+1' : ''} = ${d.join('+')}${level === 2 || level === 4 ? '+1' : ''} = ${channel}.`)
  }
  // Sorcerous Ruses: a Wizard's Ruse is rolled immediately before its spells
  let ruse = null
  if (u.ruseBought) { u.wizard = { level, lore }; rollRuse(game, u); ruse = u.wizard.ruse }
  const known2 = new Set()
  const spells2 = lore2 ? loreSpells(lore2).filter(s => s.number) : []
  // Lore Familiar: no random spells — its player chooses (in the battle's setup, ui/battle.js:
  // chooseSpells); until then it knows the lowest-numbered ones
  const familiar = (u.items || []).includes('lore-familiar')
  for (let k = 0; known.size + known2.size < count && k < 100; k++) {
    const second = spells2.length && (known.size + known2.size) % 2 === 1
    if (familiar) { for (const s of spells) if (known.size < count) known.add(s.number); break }
    const r = d6(game.rng)
    rolls.push(second ? `${r} (${lore2})` : r)
    ;(second ? known2 : known).add(r)
  }
  const list = [...[...known].sort().map(n => spells.find(s => s.number === n)?.slug), ...[...known2].sort().map(n => spells2.find(s => s.number === n)?.slug)].filter(Boolean)
  u.wizard = { level, lore, lore2, spells: list, castThisTurn: [], attempts: 0, bewildered: 0, noMoreThisTurn: false, channel, rangeBonus: 0, ruse, familiar }
  // Grimoire of Olvric: it knows all seven spells of its lore (it still casts only its Level's number)
  if ((u.items || []).includes('grimoire-of-olvric')) { u.wizard.spells = loreSpells(lore).map(s => s.slug); say(game, '', `${u.name}'s Grimoire of Olvric: it knows every spell of its lore.`) }
  // Infernal Familiar: Ruinbolt or Winds of the Dominion as well (its player chooses at setup; Ruinbolt until then)
  if ((u.items || []).includes('infernal-familiar')) { u.wizard.infernal = 'ruinbolt'; u.wizard.infernalGranted = !list.includes('ruinbolt'); if (u.wizard.infernalGranted) u.wizard.spells.push('ruinbolt') }
  if (familiar) { say(game, '', `${u.name} (Level ${level} Wizard, Lore Familiar): its spells are chosen, not rolled — ${u.wizard.spells.map(s => SPELLS[s].name).join(', ')} for now.`); return }
  say(game, 'roll', `${u.name} (Level ${level} Wizard, ${SPELLS[u.wizard.spells[0]]?.loreName || lore}) rolls for spells: ${rolls.join(', ')}${rolls.length > known.size + known2.size ? ' (duplicates re-rolled)' : ''} — knows ${u.wizard.spells.map(s => SPELLS[s].name).join(', ')}.`)
}

// Channelled Spells: one Channelling die re-rolls one spell, before the signature swap; the
// result stands even if the same spell comes up again (duplicates of its OTHER spells re-rolled).
// Lore Familiar: the Wizard's player chooses its spells from its lore, the signature spell too
export function chooseSpells (game, u, slugs) {
  const ok = slugs.filter(x => SPELLS[x]?.lore === u.wizard.lore).slice(0, Math.max(1, u.wizard.spells.filter(x => SPELLS[x]?.lore === u.wizard.lore).length))
  if (!ok.length) return
  const others = u.wizard.spells.filter(x => SPELLS[x]?.lore !== u.wizard.lore)
  u.wizard.spells = [...ok, ...others]
  say(game, '', `${u.name} chooses its spells (Lore Familiar): ${ok.map(x => SPELLS[x].name).join(', ')}.`)
}
// Infernal Familiar: Ruinbolt or Winds of the Dominion, in addition to its other spells
export function chooseInfernal (game, u, slug) {
  if (!u.wizard?.infernal || !['ruinbolt', 'winds-of-the-dominion'].includes(slug)) return
  // (only the spell the familiar gave is taken back: one the Wizard knew already stays)
  if (u.wizard.infernalGranted) u.wizard.spells = u.wizard.spells.filter(x => x !== u.wizard.infernal)
  u.wizard.infernal = slug
  u.wizard.infernalGranted = !u.wizard.spells.includes(slug)
  if (u.wizard.infernalGranted) u.wizard.spells.push(slug)
  say(game, '', `${u.name}'s Infernal Familiar whispers ${SPELLS[slug].name}.`)
}
export function channelSpell (game, u, slug) {
  const w = u.wizard
  if (!w || (w.channel || 0) < 1) return false
  const spells = loreSpells(w.lore).filter(s => s.number)
  const others = new Set(w.spells.filter(x => x !== slug).map(x => SPELLS[x].number))
  const rolls = []
  let r
  do { r = d6(game.rng); rolls.push(r) } while (others.has(r))
  w.channel--
  const now = spells.find(s => s.number === r).slug
  w.spells = w.spells.map(x => x === slug ? now : x)
  say(game, 'roll', `${u.name} spends a Channelling die to re-roll ${SPELLS[slug].name}: ${rolls.join(', ')} — ${SPELLS[now].name}. ${w.channel} Channelling ${w.channel === 1 ? 'die' : 'dice'} left.`)
  return true
}

// Range Magnification: one Channelling die, rolled, adds that many inches to the next spell's range.
export function magnifyRange (game, u) {
  const w = u.wizard
  if (!w || (w.channel || 0) < 1) return 0
  w.channel--
  const r = d6(game.rng)
  w.rangeBonus = r
  say(game, 'roll', `${u.name} spends a Channelling die to magnify its range: +${r}". ${w.channel} left.`)
  return r
}

// A spell's range in inches. A rolled range such as Gaze of Bosher's 5D6" is taken at its most (30") for
// choosing a target; the spell rolls its own length when cast.
export const baseRange = s => { const r = String(s.range || ''); const d = r.match(/(\d+)D6/i); return d ? Number(d[1]) * 6 : Number((r.match(/\d+/) || [0])[0]) }

// Lore of Bosher / Lore of Wangler: a Wizard with the 'Lore of Bosher' (or
// Wangler) special rule who discards a spell may take its lore's signature spell or Gaze of Bosher (Wangler's Curse)
export function swapChoices (u) {
  const out = []
  const sig = signatureOf(u.wizard?.lore)
  if (sig) out.push(sig)
  // (the spells these rules list: every spell of the Lore of Bosher, Gaze of Bosher and Brain
  // Bursta, or of the Lore of Wangler, Wangler's Curse and Dead Itchy)
  if (hasRule(u, 'Lore of Bosher')) out.push(...loreSpells('lore-of-bosher'))
  if (hasRule(u, 'Lore of Wangler')) out.push(...loreSpells('lore-of-wangler'))
  // (Lore of the Mere: the same, from the Lore of the Mere)
  if (hasRule(u, 'Lore of the Mere')) out.push(...loreSpells('lore-of-the-mere'))
  // Lore of Aelsyr: or one of the Lore of Aelsyr's spells
  if (hasRule(u, 'Lore of Aelsyr')) out.push(...loreSpells('lore-of-aelsyr'))
  // Lore of the Hunger Below: or one of the Hunger Below's spells
  if (hasRule(u, 'Lore of the Hunger Below')) out.push(...loreSpells('lore-of-the-hunger-below'))
  // Lore of Beasts: or one of the Lore of Beasts' spells
  if (hasRule(u, 'Lore of Beasts')) out.push(...loreSpells('lore-of-beasts'))
  // Lore of Lorne Wood: or Flock of Doom, Forest Walker or Tree Singing
  if (hasRule(u, 'Lore of Lorne Wood')) out.push(...loreSpells('lore-of-lorne-wood'))
  // Lore of Vharnest: or Black Horror or Cursing Word
  if (hasRule(u, 'Lore of Vharnest')) out.push(...loreSpells('lore-of-vharnest'))
  // Lore of Undeath: or Hellish Vigour, Raise Dead or Vesper's Danse Macabre
  if (hasRule(u, 'Lore of Undeath')) out.push(...loreSpells('lore-of-undeath'))
  // Lore of Kheshet: or one of the three Incantations
  if (hasRule(u, 'Lore of Kheshet')) out.push(...loreSpells('lore-of-kheshet'))
  // Lore of the Gnawing One: or Cloud of Corruption, Rat's Leap or Wyrd Lightning
  if (hasRule(u, 'Lore of the Gnawing One')) out.push(...loreSpells('lore-of-the-gnawing-one'))
  // Lore of Ixmara: or Apotheosis or Monsoon
  if (hasRule(u, 'Lore of the Makers')) out.push(...loreSpells('lore-of-the-makers'))
  // Lore of the Bull of Ash: or Curse of the Bull of Ash, Flames of the Bull of Ash or Storm of Ash
  if (hasRule(u, 'Lore of the Bull of Ash')) out.push(...loreSpells('lore-of-the-bull-of-ash'))
  // Lore of the Moon Jade, Lore of the Sun Jade: or one of their spells
  if (hasRule(u, 'Lore of the Moon Jade')) out.push(...loreSpells('lore-of-the-moon-jade'))
  // Lore of the Unmade: or the spell of its Unmade Alignment
  if (hasRule(u, 'Lore of the Unmade')) out.push(...loreSpells('lore-of-the-unmade').filter(s => (s.text || '').startsWith(`Unmade of ${godOf(u)} only`)))
  if (hasRule(u, 'Lore of the Sun Jade')) out.push(...loreSpells('lore-of-the-sun-jade'))
  // Lore of the Dominion: or the spell of its Mark of the Dominion
  if (hasRule(u, 'Lore of the Dominion')) {
    const mark = { 'Mark of the Unbound': 'winds-of-the-dominion', 'Mark of Rapture': 'acquiescence', 'Mark of Cipher': 'sullen-fire', 'Mark of Endurance': 'fleshy-abundance' }
    for (const [m, slug] of Object.entries(mark)) if (hasRule(u, m) && SPELLS[slug]) out.push(SPELLS[slug])
  }
  // Tome of the Dark Gods: any spell of the Lore of the Dominion, as if it had that Mark
  if ((u.items || []).includes('tome-of-the-dark-gods')) {
    for (const slug of ['winds-of-the-dominion', 'acquiescence', 'sullen-fire', 'fleshy-abundance']) if (SPELLS[slug]) out.push(SPELLS[slug])
  }
  return [...new Map(out.filter(x => x && !u.wizard.spells.includes(x.slug)).map(x => [x.slug, x])).values()]
}
export function signatureOf (lore) {
  return loreSpells(lore).find(s => /signature/i.test(s.type))
}
export function swapForSignature (game, u, slug, take = null) {
  const sig = take ? SPELLS[take] : signatureOf(u.wizard.lore)
  if (!sig) return
  u.wizard.spells = u.wizard.spells.map(s => s === slug ? sig.slug : s)
  const own = sig.slug === signatureOf(u.wizard.lore)?.slug
  say(game, '', `${u.name} swaps ${SPELLS[slug].name} for ${own ? 'its signature spell, ' : `${sig.loreName}'s `}${sig.name}.`)
}

// Which phase a spell belongs to (Casting spells)
export const CATEGORY_PHASE = { Enchantment: 'conjuration', Hex: 'conjuration', Conveyance: 'remaining', 'Magic Missile': 'shoot', 'Magical Vortex': 'shoot', Assailment: 'fight' }

// Twin-tailed Wand: once a turn, one of its spells may be attempted a second time
export const wandRepeat = u => (u.items || []).includes('twin-tailed-wand') && !u.wizard?.wandUsed
export function castable (game, u) {
  if (!u.wizard || !isWizard(u)) return []
  const w = u.wizard
  // (Scroll of Transmogrification: a frog casts nothing — arcane.js)
  if (u.status.frog) return []
  if (u.status.fleeing || u.status.stupid || w.noMoreThisTurn || (w.attempts >= w.level && !wandRepeat(u))) return []
  if (armoured(u)) return []
  const engaged = u.status.engaged || (hostOf(game, u)?.status.engaged)
  return w.spells.map(s => SPELLS[s]).filter(s => {
    if (!s || (w.stolen || []).includes(s.slug) || (w.forbidden || []).includes(s.slug)) return false // (Spell Thief; an Infernal Familiar's spell lost to a backlash)
    if (w.castThisTurn.includes(s.slug) ? !wandRepeat(u) : w.attempts >= w.level) return false
    if (CATEGORY_PHASE[s.category] !== game.sub) return false
    if (engaged && s.category !== 'Assailment' && !/self/i.test(s.range) && !s.engagedOk) return false
    return true
  })
}

// The units a spell may target from this Wizard.
// `anywhere`: Towering Conjuration (ploy) — any target, whatever its
// range or line of sight
// Where a Magical Vortex may be placed: its centre within the spell's range of the caster (measured
// from the caster's base, as all ranges are), with its range items and a magnified range, not on a model.
export function vortexPointOk (game, u, s, p) {
  const range = baseRange(s) + (itemFlag(u, 'spellRange', { personal: true }) || 0) + (u.wizard?.rangeBonus || 0)
  const from = hostOf(game, u) || u
  const cs = corners(from)
  const d = pointInPoly(p, cs) ? 0 : Math.min(...cs.map((c, i) => pointSegDist(p, c, cs[(i + 1) % cs.length])))
  if (d > range) return { ok: false, range, reason: `that is ${d.toFixed(1)}" from ${u.name}, more than ${range}"` }
  const on = onTable(game).find(o => pointInPoly(p, corners(o)))
  if (on) return { ok: false, range, reason: `that is on ${on.name}` }
  // Magical Vortex: its template is placed "not touching the bases of any models" (its size from the
  // spell's text: 'a small (3") blast template' or 'a large (5") blast template')
  const size = Number((String(s.text || '').match(/(\d)"\)? (?:blast )?template/) || [])[1] || 3)
  const tpl = Array.from({ length: 16 }, (_, i) => ({ x: p.x + Math.cos(i / 16 * Math.PI * 2) * size / 2, y: p.y + Math.sin(i / 16 * Math.PI * 2) * size / 2 }))
  const near = onTable(game).find(o => polyDistM(corners(o), tpl) < 1e-6)
  if (near) return { ok: false, range, reason: `its ${size}" template would touch ${near.name}` }
  return { ok: true, range }
}
export function spellTargets (game, u, s, { anywhere = false } = {}) {
  if (/self/i.test(s.range)) return [hostOf(game, u) || u]
  // Idol of Bosher: +3" to the range of all the bearer's spells
  const range = baseRange(s) + (itemFlag(u, 'spellRange', { personal: true }) || 0) + (u.wizard?.rangeBonus || 0)
  const friendly = s.category === 'Enchantment' || s.category === 'Conveyance'
  const caster = hostOf(game, u) || u
  // the spells' own exceptions: Vindictive Glare may target an engaged unit;
  // Hand of Wangler only friendly characters, engaged or with a unit (Hand of Wangler or Bosher)
  // (Rat's Leap: friendly infantry characters, even engaged)
  // (Apotheosis: friendly infantry or cavalry characters, even engaged)
  // (Curse of the Bull of Ash: an enemy character, even one with a unit or engaged)
  const charactersOnly = s.slug === 'hand-of-wangler-or-bosher' || s.slug === 'rats-leap' || s.slug === 'apotheosis' || s.slug === 'curse-of-the-bull-of-ash'
  // (Sapping Blight may be aimed at an enemy unit that is in combat)
  // (Accursed Mirror, Great Bastion: may target an engaged unit)
  const allowEngaged = s.slug === 'accursed-mirror' || s.slug === 'great-bastion' || s.slug === 'curse-of-the-bull-of-ash' || s.slug === 'vindictive-glare' || s.slug === 'sapping-blight' || s.slug === 'fury-of-the-bloodied-god' || charactersOnly
  const pool = charactersOnly ? game.units.filter(c => c.placed && !c.status.removed && !isDead(c) && (c.troopType || []).includes('Character')) : onTable(game)
  const closestEnemy = onTable(game).filter(t => t.side !== u.side && !t.status.engaged).sort((a, b) => distanceBetween(caster, a) - distanceBetween(caster, b))[0]
  return pool.filter(t => {
    if (friendly ? t.side !== u.side : t.side === u.side) return false
    if (s.category === 'Assailment') return !!caster.engagedWith?.[t.id]
    if (t.status.engaged && !allowEngaged) return false
    // Mind the Boss: not while within 3" of his Trolls, unless the closest target
    if (!friendly && protectedBoss(game, t, closestEnemy)) return false
    // Stand Back Chief (dwarfs.js)
    if (!friendly && standsBack(game, t)) return false
    // Targeting Weapon Teams: nor by enemy spells (gnawkin.js)
    if (!friendly && t !== closestEnemy && screenedTeam(game, t, distanceBetween)) return false
    // Mantle of Drifting Shadow: not targeted by spells from more than 6" away
    if (!friendly && itemFlag(t, 'farShotImmune', { personal: true }) && distanceBetween(caster, t) > 6) return false
    if (charactersOnly && t === u) return true
    // Forest Walker: only a friendly Lornefolk character completely within a woodland terrain feature
    if (s.slug === 'forest-walker' && !((t.troopType || []).includes('Character') && shareInWoods(game, t) >= 1)) return false
    if (anywhere) return true
    if (distanceBetween(caster, t) > range) return false
    // vision arc: the front arc of the Wizard (or its unit)
    return t === caster || inVision(caster, t)
  })
}
function inVision (u, t) {
  const f = { x: Math.cos(u.facing), y: Math.sin(u.facing) }
  const r = { x: -f.y, y: f.x }
  const [fl, fr] = corners(u)
  return corners(t).concat([centre(t)]).some(p => {
    const a = (p.x - fl.x) * f.x + (p.y - fl.y) * f.y
    return a >= 0 && ((p.x - fl.x) * r.x + (p.y - fl.y) * r.y) >= -a && ((p.x - fr.x) * r.x + (p.y - fr.y) * r.y) <= ((p.x - fr.x) * f.x + (p.y - fr.y) * f.y)
  })
}

// Cast: returns { cast, result, perfect, dice }. `ask(question, answers)` lets the other player dispel.
// `free`: a second casting by Duplicitous Duplication: it does not
// count towards the Wizard's attempts this turn.
// Sceptre of Power: a natural double on the Casting roll — after it is resolved, a Strength 10 hit,
// AP -3, on the bearer
export async function castSpell (game, u, slug, target, ask, effects, opts = {}) {
  if (u.wizard) { u.wizard.sceptreDouble = false; u.wizard.chalicePerfect = false }
  const r = await castSpellInner(game, u, slug, target, ask, effects, opts)
  // (The Plague Chalice: each perfect invocation by its bearer, a S4 hit with no Armour Roll)
  if (u.wizard?.chalicePerfect && !u.status.removed && !isDead(u)) { u.wizard.chalicePerfect = false; say(game, 'bad', `The Plague Chalice exacts its price: a Strength 4 hit on ${u.name}, no Armour Roll.`); effects.hitModel(game, u, 4, -10) }
  if (u.wizard?.sceptreDouble && !u.status.removed && !isDead(u)) { u.wizard.sceptreDouble = false; say(game, 'bad', `A natural double: the Sceptre of Power strikes ${u.name} — a Strength 10 hit, AP -3.`); effects.hitModel(game, u, 10, -3) }
  return r
}
async function castSpellInner (game, u, slug, target, ask, effects, { free = false } = {}) {
  const s = SPELLS[slug]
  const w = u.wizard
  // Runed Gutplate: a spell aimed at its unit, a D6 — 3+ the Wizard must choose another target (the
  // attempt is not made, nor counted)
  if (target?.id && target.side !== u.side && itemFlag(target, 'runedGutplate')) {
    const r = d6(game.rng)
    say(game, 'roll', `${target.name}'s Runed Gutplate roars at ${s.name}: D6 = ${r}${r >= 3 ? ' — another target must be chosen' : ' — no effect'}.`)
    if (r >= 3) return { cast: false, retarget: true }
  }
  // (the Twin-tailed Wand's second attempt of a spell is used up by it)
  if (!free && w.castThisTurn.includes(slug)) { w.wandUsed = true; say(game, '', `${u.name} points its Twin-tailed Wand: ${s.name} a second time.`) } else if (!free && w.attempts >= w.level) w.wandUsed = true
  if (!free) { w.attempts++; w.castThisTurn.push(slug) }
  // the casting value to reach (Becalming Orb raises it: arcane.js)
  const cv = castingValueFor(game, u, s)
  // Soul Eater: near a Gazehorn, a Leadership test first; failed, failing to cast is a backlash (hornkin.js)
  const nerveLost = soulEaterNerve(game, u)
  if (cv !== s.castingValue) say(game, '', `${u.name} is within 15" of a Becalming Orb: ${s.name}'s casting value is ${cv}.`)
  // Scroll of Invocation: single use, instead of a Casting roll — cast as if the minimum casting
  // value had been rolled; it may be dispelled as normal
  if (!free && ask && (u.items || []).includes('scroll-of-invocation') && itemLeft(u, 'scroll-of-invocation') > 0 && await ask(`${u.name} is about to cast ${s.name}. Read its Scroll of Invocation (single use): cast at its casting value, ${cv}, with no Casting roll?`, [['Read the scroll', true], ['Roll as usual', false]])) {
    spendItem(u, 'scroll-of-invocation')
    say(game, 'roll', `${u.name} reads its Scroll of Invocation: ${s.name} is cast with a result of ${cv}.`)
    return finishCast(game, u, s, target, cv, false, ask, effects)
  }
  // Power Scroll: single use, an extra D6 on the Casting roll, the lowest discarded; a double 1 on
  // any two of the dice miscasts
  const scroll = !free && ask && (u.items || []).includes('power-scroll') && itemLeft(u, 'power-scroll') > 0 && await ask(`${u.name} is about to cast ${s.name}. Use its Power Scroll (single use): an extra D6, discard the lowest — a double 1 on any two dice miscasts?`, [['Use the Power Scroll', true], ['No', false]])
  if (scroll) { spendItem(u, 'power-scroll'); say(game, '', `${u.name} uses its Power Scroll.`) }
  // Sacrament of the Mere: single use, +2 to a Casting roll (it does not undo a double 1)
  const sacrament = !free && ask && (u.items || []).includes('sacrament-of-the-mere') && itemLeft(u, 'sacrament-of-the-mere') > 0 && await ask(`${u.name} is about to cast ${s.name}. Take the Sacrament of the Mere (single use): +2 to this Casting roll?`, [['Take it', true], ['No', false]])
  if (sacrament) { spendItem(u, 'sacrament-of-the-mere'); say(game, '', `${u.name} takes the Sacrament of the Mere.`) }
  const mr = resistanceOf(u, target)
  const bew = w.bewildered || 0
  // the bearer's arcane items: Rod of Might and Wand of Jet +1; Book of Iselde +1
  // unless a natural double; Wizard's Staff +1 for an Assailment spell or a Magic Missile
  // Winds of Power (Arcane Magic ploy): an extra D6, the lowest discarded; a double 1
  // among them can be avoided by discarding one of the 1s
  const power = await offerPloy(game, u.side, 'power', ask, `${u.name} is about to cast ${s.name}.`)
  // Spell Eater: the next Casting roll after a Spell Eater rolls an extra D6 too (same keep rule)
  const eaten = !!w.spellEaten
  if (eaten) { w.spellEaten = false; say(game, '', `${u.name} unleashes the devoured spell's power: an extra D6 (Spell Eater).`) }
  const keep = all => {
    if (all.length < 3) return all
    const ones = all.filter(d => d === 1).length
    if (ones >= 2 && scroll) return [1, 1] // (the Power Scroll: a double 1 on any two dice is a backlash)
    if (ones >= 2) { const other = all.filter(d => d !== 1); return other.length ? [Math.max(...other), 1] : [1, 1] }
    return [...all].sort((a, b) => b - a).slice(0, 2)
  }
  // Infernal Puppet: an enemy within 15", neither fleeing nor engaged, makes the caster add a D6 and drop the
  // highest die (used whenever it can be: our guess at the player's choice)
  const puppeteer = game.units.find(k => k.side !== u.side && k.placed && !k.status.removed && !isDead(k) && (k.items || []).includes('infernal-puppet') && !k.status.fleeing && !(hostOf(game, k) || k).status.engaged && distanceBetween(hostOf(game, k) || k, hostOf(game, u) || u) <= 15)
  const roll = all0 => {
    let all = all0
    if (puppeteer) { const x = d6(game.rng); const arr = [...all, x]; arr.splice(arr.indexOf(Math.max(...arr)), 1); say(game, 'roll', `${puppeteer.name}'s Infernal Puppet: ${u.name} rolls an extra D6 (${x}) and discards the highest — ${arr.join(', ')}.`); all = arr }
    const dice = keep(all)
    const double = dice[0] === dice[1]
    const items = []
    for (const id of u.items || []) {
      if (itemLeft(u, id) <= 0) continue
      if (id === 'rod-of-might' || id === 'wand-of-jet') items.push([itemName(id), 1])
      if (id === 'book-of-iselde' && !double) items.push([itemName(id), 1])
      if (id === 'wizards-staff' && (s.category === 'Assailment' || s.category === 'Magic Missile')) items.push([itemName(id), 1])
    }
    // Safety in Numbers: joined to a unit of Rukka of Unit Mass 10 or more, +1 to cast
    const mob = hostOf(game, u)
    // (a unit entirely of Rukka: Rukka Mobs, Iron Rukka, Big Lumps, Boar Ladz — not if a Nipper character has joined it)
    if (hasRule(u, 'Safety in Numbers') && mob && /\brukka\b|big lumps|boar lad/i.test(mob.name) && !/nipper|hobgoblin|sniv|troll/i.test(mob.name) && !(mob.joined || []).some(c => !c.status.removed && /nipper|hobgoblin/i.test(c.name)) && unitMass(mob) >= 10) items.push(['Safety in Numbers', 1])
    if (syphonedStrength(game, u)) items.push(['Syphoned Strength', 1])
    // Mark of Cipher: with a Cipher unit of Unit Mass 10+ (dominion.js)
    if (cipherCasting(game, u, mob)) items.push(['Mark of Cipher', 1])
    // Null Stone: every Wizard within the bearer's Command range -1
    if (game.units.some(k => k.placed && !k.status.removed && !isDead(k) && (k.items || []).includes('null-stone') && distanceBetween(hostOf(game, k) || k, hostOf(game, u) || u) <= commandRange(k))) items.push(['Null Stone', -1])
    // Stone of Spite: every Wizard -2 while it lasts
    if (game.stoneOfSpite) items.push(['Stone of Spite', -2])
    // Hornstones, Dark Sorcery: +1 for Hornkin Wizards near their Hornstone, -1 for enemies (hornkin.js)
    const sorcery = darkSorcery(game, hostOf(game, u) || u, dtp)
    if (sorcery) items.push(['Dark Sorcery (the Hornstone)', sorcery])
    // Skull of Vashtor: its bearer and any Wizard within 3" (friend or foe) +1
    if (game.units.some(k => k.placed && !k.status.removed && !isDead(k) && (k.items || []).includes('skull-of-vashtor') && (k === u || distanceBetween(hostOf(game, k) || k, hostOf(game, u) || u) <= 3))) items.push(['Skull of Vashtor', 1])
    // Sceptre of Power: +1 (and a natural double costs a S10 AP -3 hit, below)
    if ((u.items || []).includes('sceptre-of-power')) items.push(['Sceptre of Power', 1])
    // Dagger of the Dark Pantheon: the Wounds it took, +1 each, on this roll (spent)
    if (u.status.pantheon) { items.push(['Dagger of the Dark Pantheon', u.status.pantheon]); u.status.pantheon = 0 }
    if (sacrament) items.push(['Sacrament of the Mere', 2])
    // Covenant of Power: a Grave Priest within 12" of a Urn of Souls +1 (tombkings.js)
    if (covenant(game, u, false, distanceBetween)) items.push(['Covenant of Power', 1])
    // Mastery of the Elemental Winds: once a turn, within 6" of another such Wizard, +1 (shen.js)
    if (mastery) items.push(['Mastery of the Elemental Winds', 1])
    // Unmade of Cipher: +1 (unmade.js)
    if (unmadeOfCipher(u)) items.push(['Unmade of Cipher', 1])
    // Sigil of the Mage Queen: single use, before the Casting roll — +2
    if (sigil) items.push(['Sigil of the Mage Queen', 2])
    // Heart of the Wilds: +1 within a natural terrain feature (woods, difficult or dangerous ground)
    if ((u.items || []).includes('heart-of-the-wilds') && touchingNatural(game, hostOf(game, u) || u)) items.push(['Heart of the Wilds', 1])
    // Witch Bane: every Wizard within its Command range, friend or foe, -2 to cast
    const bane = game.units.find(o => o.placed && !o.status.removed && !isDead(o) && hasRule(o, 'Witch Bane') && distanceBetween(hostOf(game, o) || o, hostOf(game, u) || u) <= commandRange(o))
    if (bane) items.push([`Witch Bane (${bane.name})`, -2])
    // Tome of Midnight: +1 to cast Unmade Rites, Dark Magic or Necromancy
    if ((u.items || []).includes('tome-of-midnight') && ['unmade-rites', 'dark-magic', 'necromancy'].includes(s.lore)) items.push(['Tome of Midnight', 1])
    // Staff of Ka-Blam: +D3 to any Casting roll
    if ((u.items || []).includes('staff-of-ka-blam') && itemLeft(u, 'staff-of-ka-blam') > 0) items.push(['Staff of Ka-Blam D3', Math.ceil(d6(game.rng) / 2)])
    const bonus = items.reduce((a, [, v]) => a + v, 0)
    const result = dice[0] + dice[1] + halfLevel(u) - mr - bew + bonus
    // Rod of Might: a natural double 1 OR 2 miscasts
    const miscasts = (dice[0] === 1 && dice[1] === 1) || (dice[0] === 2 && dice[1] === 2 && itemFlag(u, 'miscastOn2', { personal: true })) || (nerveLost && result < cv && !(dice[0] === 6 && dice[1] === 6)) || (dice[0] === dice[1] && (game.hellheart?.[1 - u.side] || 0) > 0)
    const head = `${u.name} casts ${s.name} (casting value ${s.castingValue}+${target?.name ? `, at ${target.name}` : ''}): Casting roll ${all.length > 2 ? `${all.join(', ')} (Winds of Power, keeps ${dice.join('+')})` : dice.join('+')} + ${halfLevel(u)} (Level ${w.level} halved)${mr ? ` - ${mr} Magic Resistance` : ''}${bew ? ` - ${bew} Bewildered` : ''}${items.map(([n, v]) => v < 0 ? ` - ${-v} ${n}` : ` + ${v} ${n}`).join('')} = ${result}`
    // (The Plague Chalice: any natural double but 1s is a perfect invocation for its bearer)
    const chalice = (u.items || []).includes('the-plague-chalice') && dice[0] === dice[1] && dice[0] !== 1
    w.chalicePerfect = chalice
    return { dice, all, result, miscasts, perfect: (dice[0] === 6 && dice[1] === 6) || chalice, head }
  }
  const mastery = elementalMastery(game, u, distanceBetween, hostOf)
  let sigil = false
  if ((u.items || []).includes('sigil-of-the-mage-queen') && itemLeft(u, 'sigil-of-the-mage-queen') > 0 && ask && await ask(`${u.name} casts ${s.name}: use the Sigil of the Mage Queen (single use, +2 to this Casting roll)?`, [['Use it', true], ['Keep it', false]])) { spendItem(u, 'sigil-of-the-mage-queen'); sigil = true }
  const n = 2 + (power ? 1 : 0) + (eaten ? 1 : 0) + (scroll ? 1 : 0)
  let c = roll(rollDice(game.rng, n))
  w.sceptreDouble = (u.items || []).includes('sceptre-of-power') && c.dice[0] === c.dice[1]
  // Tome of Spellcraft, Nobby's Knobbly Staff, Idol of Bosher: once a turn, re-roll a Casting roll
  // (Neravel's Blessing: once a turn, a single failed Casting roll re-rolled)
  // (Wand of Wych Elm: within 3" of a woodland terrain feature, once a turn, a failed Casting roll)
  // (each item's 'once per turn' is its own: the Wand's use is kept apart from the others' castRerolled)
  const wandOk = (u.items || []).includes('wand-of-wych-elm') && w.wandTurn !== `${game.round}:${game.active}` && nearWood(game, hostOf(game, u) || u, 3)
  // (Sesketh's Blessing: once per game, a single failed Casting roll re-rolled)
  const rr = (!w.castRerolled && itemWith(u, 'rerollCast')) || (!w.castRerolled && hasRule(u, "Neravel's Blessing") ? 'neravel' : null) || (wandOk ? 'wand-of-wych-elm' : null) || (hasRule(u, "Sesketh's Blessing") && !u.status.seskethUsed ? 'sesketh' : null)
  const rrName = rr === 'neravel' ? "Neravel's Blessing" : rr === 'sesketh' ? "Sesketh's Blessing" : itemName(rr)
  if (rr && ask && ((rr !== 'neravel' && rr !== 'wand-of-wych-elm' && rr !== 'sesketh') || !c.miscasts) && (c.miscasts || (!c.perfect && c.result < cv))) {
    const yes = await ask(`${c.head} — ${c.miscasts ? 'a BACKLASH' : 'not cast'}. Re-roll the Casting roll (${rrName}, once a turn)?`, [['Re-roll it', true], ['Keep it', false]])
    if (yes) { if (rr === 'wand-of-wych-elm') w.wandTurn = `${game.round}:${game.active}`; else if (rr === 'sesketh') u.status.seskethUsed = true; else w.castRerolled = true; c.itemRerolled = true; say(game, 'roll', `${c.head} — re-rolled with ${rrName}.`); c = { ...roll(rollDice(game.rng, n)), itemRerolled: true } }
  }
  // Channelled Luck: two Channelling dice re-roll a failed Casting roll (not a backlash)
  // (Re Rolls: not if the dice were already re-rolled by an item)
  if (game.options?.channelling && ask && !c.itemRerolled && (w.channel || 0) >= 2 && !c.miscasts && !c.perfect && c.result < cv) {
    const yes = await ask(`${c.head} — not cast. Spend two Channelling dice (${w.channel} left) to re-roll it?`, [['Re-roll it', true], ['Keep it', false]])
    if (yes) { w.channel -= 2; say(game, 'roll', `${c.head} — not cast; ${u.name} spends two Channelling dice to re-roll.`); c = { ...roll(rollDice(game.rng, n)), itemRerolled: true } }
  }
  // Fated Conjuration (ploy): a failed Casting roll or a backlash is re-rolled
  if (!c.itemRerolled && (c.miscasts || (!c.perfect && c.result < cv)) && await offerPloy(game, u.side, 'fated', ask, `${c.head} — ${c.miscasts ? 'a BACKLASH' : 'not cast'}.`)) {
    say(game, 'roll', `${c.head} — ${c.miscasts ? 'a backlash' : 'not cast'}; re-rolled (Fated Conjuration).`)
    c = { ...roll(rollDice(game.rng, n)), itemRerolled: true }
  }
  // Absolute Power (ploy): a natural double (not 1s) that beats the casting value: a perfect invocation
  if (!c.miscasts && !c.perfect && new Set(c.all).size < c.all.length && !(c.all.filter(x => x === 1).length >= 2) && c.result > cv && await offerPloy(game, u.side, 'absolute', ask, `${c.head} — a natural double.`)) c.perfect = true
  w.rangeBonus = 0
  const { dice, result, head } = c
  // Wand of Jet: any natural double destroys it
  if (dice[0] === dice[1] && (u.items || []).includes('wand-of-jet') && itemLeft(u, 'wand-of-jet') > 0) { spendItem(u, 'wand-of-jet'); say(game, 'bad', `A natural double: ${u.name}'s Wand of Jet shatters.`) }
  // Staff of Ka-Blam: a natural double 1 or double 6: a 5" template over the bearer, S6 AP -1, and
  // the staff is destroyed (as well as the double's own effects)
  if ((u.items || []).includes('staff-of-ka-blam') && itemLeft(u, 'staff-of-ka-blam') > 0 && dice[0] === dice[1] && (dice[0] === 1 || dice[0] === 6)) {
    spendItem(u, 'staff-of-ka-blam')
    say(game, 'bad', `A natural double ${dice[0]}: the Staff of Ka-Blam EXPLODES — a 5" template over ${u.name}, Strength 6, AP -1.`)
    effects.template(game, centre(hostOf(game, u) || u), 2.5, 6, -1, u)
  }
  if (c.miscasts) {
    say(game, 'roll', `${head} — a natural double ${dice[0]}: BACKLASH!`)
    // Infernal Familiar: a backlash on its chosen spell: never again this game
    if (w.infernal === s.slug && w.infernalGranted) { w.forbidden = [...(w.forbidden || []), s.slug]; say(game, 'bad', `${u.name} backlash ${s.name}, its Infernal Familiar's spell: it cannot cast it again this game.`) }
    // Twin-tailed Wand: instead of the Backlash table, D3 wounds (no armour or Regeneration save)
    if ((u.items || []).includes('twin-tailed-wand')) { wandBackfire(game, u); return { cast: false } }
    const m = await backlash(game, u, effects, ask)
    if (m === 'cast') return finishCast(game, u, s, target, cv, false, ask, effects)
    if (m === 'perfect') return finishCast(game, u, s, target, result, true, ask, effects)
    return { cast: false }
  }
  if (c.perfect) {
    say(game, 'roll', `${head} — ${dice[0] === 6 && dice[1] === 6 ? 'a natural double 6' : 'Absolute Power'}: PERFECT INVOCATION, it cannot be dispelled.`)
    return finishCast(game, u, s, target, result, true, ask, effects)
  }
  if (result < cv) { say(game, 'roll', `${head} — not cast.`); return { cast: false } }
  say(game, 'roll', `${head} — CAST.`)
  return finishCast(game, u, s, target, result, false, ask, effects)
}

// ---- Bound spells ----
// Bound spells: a Bound spell (here from a magic item, items.js `bound`) is cast in
//   the usual manner, its Power Level added to the 2D6 Casting roll; no backlash, no perfect
//   invocation; it may be dispelled (with no risk of being outclassed); one Bound spell per model a
//   phase; it does not make the model a Wizard.
// Magic Resistance Magic: an enemy target's Magic Resistance (the best of its unit and
// joined characters) lowers the casting result of any spell, Bound spells included.
export const resistanceOf = (caster, target) => target?.special && target.side !== caster.side ? Math.max(0, ...[target, ...(target.joined || [])].map(x => Math.abs(Number(ruleValue(x, 'Magic Resistance') || 0)))) : 0

export function boundSpellsOf (u) {
  const out = (u.items || []).filter(id => ITEM_EFFECTS[id]?.bound && itemLeft(u, id) > 0).map(id => ({ item: id, slug: ITEM_EFFECTS[id].bound.spell, power: ITEM_EFFECTS[id].bound.power, singleUse: !!ITEM_EFFECTS[id].bound.singleUse }))
  // Strike the Runes: the Anvil of Ruin's own Bound spells, Power Level 2
  // Leering Spirit: Mirefang's Leering Spirit casts Devolve as a Bound spell, Power Level 3 (here
  // cast from Mirefang himself: the marker is not placed — a simplification)
  if (u.special?.has('Leering Spirit')) out.push({ item: null, slug: 'devolve', power: 3, singleUse: false })
  if (u.special?.has('Storm Call')) out.push({ item: null, slug: 'thunderwyrm-elder-storm-call', power: 1, singleUse: false })
  // Shadewood Coven: the Sisters' one spell, Power Level 0-2 (woodelves.js)
  if (u.special?.has('Shadewood Coven') && u.covenSpell) out.push({ item: null, slug: u.covenSpell, power: covenPower(u), singleUse: false })
  // Cursed Coven: the Hexfire Warlocks' spell, Power Level 0-2 (darkelves.js)
  // Vortex of Souls: a Urn of Souls' two Bound spells, Power Level 2
  if (u.special?.has('Vortex of Souls')) for (const slug of ['light-of-death', 'light-of-protection']) out.push({ item: null, slug, power: 2, singleUse: false })
  if (u.special?.has('Cursed Coven') && u.covenSpell) out.push({ item: null, slug: u.covenSpell, power: cursedCovenPower(u, unitMass), singleUse: false })
  if (u.special?.has('Strike the Runes')) for (const slug of ['rune-of-oath-and-steel', 'rune-of-hearth-and-home', 'rune-of-haste-and-urgency', 'rune-of-wrath-and-ruin']) out.push({ item: null, slug, power: 2, singleUse: false })
  return out
}
const phaseKey = game => `${game.round}:${game.active}:${game.sub}`
export function boundCastable (game, u) {
  if (u.status.removed || isDead(u) || u.status.fleeing || u.status.stupid) return []
  if (u.status.boundPhase === phaseKey(game)) return []
  // (a Wizard told 'no more spells this turn' by its Backlash table casts no Bound spell either)
  if (u.wizard?.noMoreThisTurn) return []
  const engaged = u.status.engaged || (hostOf(game, u)?.status.engaged)
  return boundSpellsOf(u).filter(b => {
    const s = SPELLS[b.slug]
    if (!s || CATEGORY_PHASE[s.category] !== game.sub) return false
    if ((u.wizard?.stolen || []).includes(b.slug)) return false // (Spell Thief)
    if (engaged && s.category !== 'Assailment' && !/self/i.test(s.range)) return false
    return true
  })
}
export async function castBound (game, u, b, target, ask, effects, { again = false } = {}) {
  u.boundPower = b.power // (Unmade Heart reads it when dispelling)
  const s = SPELLS[b.slug]
  u.status.boundPhase = phaseKey(game)
  if (b.singleUse && !again) spendItem(u, b.item)
  const dice = rollDice(game.rng, 2)
  const mr = resistanceOf(u, target)
  // (Covenant of Power: within 12" of a Urn of Souls, not its own Bound spells: +1)
  const cov = covenant(game, u, true, distanceBetween) ? 1 : 0
  let result = dice[0] + dice[1] + b.power - mr + cov
  // (Becalming Orb: "any spell they attempt" — Bound spells too)
  const cvB = castingValueFor(game, u, s)
  // Fated Conjuration (ploy): a failed Bound spell's Casting roll may be re-rolled
  if (result < cvB && await offerPloy(game, u.side, 'fated', ask, `${u.name}'s Bound ${s.name}: ${dice.join('+')} + ${b.power} = ${result}, not cast.`)) {
    say(game, 'roll', `${u.name}'s Bound ${s.name}: ${dice.join('+')} — not cast; re-rolled (Fated Conjuration).`)
    const again = rollDice(game.rng, 2); dice[0] = again[0]; dice[1] = again[1]
    result = dice[0] + dice[1] + b.power - mr + cov
  }
  const head = `${u.name} casts ${s.name} ${b.item ? `from its ${itemName(b.item)}` : u.covenSpell === b.slug ? `as a Bound spell, Power Level ${b.power} (${u.special?.has('Cursed Coven') ? 'Cursed' : 'Deepwood'} Coven)` : b.slug === 'thunderwyrm-elder-storm-call' ? 'by calling the storm' : b.slug === 'devolve' ? 'through its Leering Spirit' : 'by striking the Anvil'} (Bound spell, casting value ${cvB}+${target?.name ? `, at ${target.name}` : ''}): Casting roll ${dice.join('+')} + ${b.power} (Power Level)${mr ? ` - ${mr} Magic Resistance` : ''} = ${result}${b.singleUse ? ' (single use: the item is spent)' : ''}`
  if (result < cvB) { say(game, 'roll', `${head} — not cast.`); return { cast: false } }
  say(game, 'roll', `${head} — CAST.`)
  // Absolute Power (ploy): a natural double (not 1s) beating the casting value — a perfect invocation
  const perfect = dice[0] === dice[1] && dice[0] !== 1 && result > cvB && await offerPloy(game, u.side, 'absolute', ask, `${u.name}'s Bound ${s.name}: a natural double.`)
  if (perfect) say(game, 'good', `${s.name} is cast with a PERFECT INVOCATION: it cannot be dispelled.`)
  target = await spellAttraction(game, u, s, target, ask)
  const dd = perfect ? await spellEaterVsPerfect(game, u, s, ask) : await tryDispel(game, u, s, result, ask, effects, { bound: true, target })
  if (dd === 'reflected') return reflect(game, u, s, result, ask, effects)
  if (dd && typeof dd !== 'object') return { cast: false, dispelled: true }
  await effects.resolve(game, u, s, target, { perfect: !!perfect, result, ask })
  if (dd?.after) dd.after()
  // Ring of Doom: each time it is cast, the opponent rolls a D6; on a 4+ the bearer
  // loses 1 Toughness (to a minimum of 1)
  if (ITEM_EFFECTS[b.item]?.bound?.doom && !u.status.removed) {
    const d = d6(game.rng)
    const hit = d >= 4
    if (hit) for (const m of u.models) { m.profile = { ...m.profile, T: Math.max(1, (m.profile.T ?? 3) - 1) } }
    say(game, hit ? 'bad' : 'roll', `Ring of Doom: the opponent rolls ${d}${hit ? ` — ${u.name}'s Toughness falls to ${u.models[0].profile.T}` : ' — no harm'}.`)
  }
  return { cast: true, result }
}

async function finishCast (game, u, s, target, result, perfect, ask, effects) {
  // (the Amulet of Spell Attraction draws the spell before any dispel is tried)
  target = await spellAttraction(game, u, s, target, ask)
  const d = perfect ? await spellEaterVsPerfect(game, u, s, ask) : await tryDispel(game, u, s, result, ask, effects, { target })
  if (d === 'reflected') return reflect(game, u, s, result, ask, effects)
  if (d && typeof d !== 'object') return { cast: false, dispelled: true }
  await effects.resolve(game, u, s, target, { perfect, result, ask })
  if (d?.after) d.after()
  return { cast: true, perfect, result }
}

// Amulet of Spell Attraction: once a turn, when a Magic Missile or Hex is aimed at a friendly unit in the bearer's
// Command range, the bearer may test Leadership and, on a pass, take the spell itself
async function spellAttraction (game, caster, s, target, ask) {
  if (!ask || !target?.id || target.side === caster.side || !['Magic Missile', 'Hex'].includes(s.category)) return target
  const key = `${game.round}:${game.active}`
  const bearers = game.units.filter(b => b.side === target.side && b.placed && !b.status.removed && !isDead(b) && (b.items || []).includes('amulet-of-spell-attraction') && b.status.attractTurn !== key && (b === target || hostOf(game, b) === target || distanceBetween(hostOf(game, b) || b, target) <= commandRange(b)))
  for (const b of bearers) {
    if (b === target) continue
    const go = await ask(`${sideName(game, b.side)}: ${s.name} targets ${target.name}. ${b.name} may test Leadership to draw it onto itself (Amulet of Spell Attraction, once a turn)?`, [['Test Leadership', true], ['No', false]])
    if (!go) continue
    b.status.attractTurn = key
    const ld = Math.max(...b.models.filter(m => m.wounds > 0).map(m => m.profile.Ld ?? 0))
    const t = testLeadership(game.rng, ld)
    say(game, 'roll', `${b.name}: Amulet of Spell Attraction, Leadership test ${t.dice.join('+')} = ${t.total} against ${ld} — ${t.passed ? 'passed' : 'failed'}.`)
    if (!t.passed) continue
    const yes = await ask(`${b.name} may take ${s.name} itself instead of ${target.name}. Redirect it?`, [['Redirect it', true], ['Leave it', false]])
    if (yes) { say(game, 'good', `${s.name} is drawn onto ${b.name} (Amulet of Spell Attraction).`); return b }
  }
  return target
}

// The other player's dispel attempt.
async function tryDispel (game, caster, s, result, ask, effects, { bound = false, target = null } = {}) {
  const foe = 1 - caster.side
  const chan = !!game.options?.channelling
  const away = w => distanceBetween(hostOf(game, w) || w, hostOf(game, caster) || caster)
  // (a Rune Lore model in its deepsteel dispels all the same: Rune Lore)
  const able = game.units.filter(w => w.side === foe && canDispel(w) && !w.status.fleeing && (!armoured(w) || !w.wizard) && w.placed && !w.status.frog)
  const answers = []
  for (const w of able) {
    const inRange = away(w) <= dispelRange(w)
    const dice = w.wizard?.channel || 0
    if (inRange) answers.push([`Wizardly dispel with ${w.name} (2D6 + ${halfLevel(w)})`, { w }])
    if (inRange && chan && dice >= 1) answers.push([`Wizardly dispel with ${w.name}, channelling: 3D6 discard the lowest (${dice} Channelling ${dice === 1 ? 'die' : 'dice'})`, { w, channel: true }])
    // Range Magnification: out of range by no more than a D6 could make up
    if (!inRange && chan && dice >= 1 && away(w) <= dispelRange(w) + 6) answers.push([`${w.name}: magnify its Dispel range with a Channelling die (needs ${Math.ceil(away(w) - dispelRange(w))}+), then dispel`, { w, magnify: true }])
  }
  // Feedback Scroll, Scroll of Transmogrification: used instead of a Wizardly dispel;
  // Unweaving scroll: an extra D6 for a Wizardly dispel (single use, a double 1 on any two outclasses)
  for (const w of able.filter(w => away(w) <= dispelRange(w))) {
    if ((w.items || []).includes('feedback-scroll') && itemLeft(w, 'feedback-scroll') > 0) answers.push([`${w.name}: read the Feedback Scroll instead (the spell is cast; then 2D6, each 4+ costs the caster a Wound)`, { w, item: 'feedback-scroll' }])
    if ((w.items || []).includes('scroll-of-transmogrification') && itemLeft(w, 'scroll-of-transmogrification') > 0) answers.push([`${w.name}: read the Scroll of Transmogrification instead (the spell is cast; the caster may become a frog)`, { w, item: 'scroll-of-transmogrification' }])
    if ((w.items || []).includes('unweaving-scroll') && itemLeft(w, 'unweaving-scroll') > 0) answers.push([`Wizardly dispel with ${w.name} and its Unweaving Scroll: 3D6, discard the lowest`, { w, unweavingScroll: true }])
    // Silver Mirror: the same, and a dispelled spell's caster takes a Strength 4 hit, AP -2
    if ((w.items || []).includes('silver-mirror') && itemLeft(w, 'silver-mirror') > 0) answers.push([`Wizardly dispel with ${w.name} and its Silver Mirror: 3D6, discard the lowest — the caster takes a S4 hit if it works`, { w, unweavingScroll: true, mirror: true }])
  }
  // Rune of Spellbreaking: single use, instead of a dispel attempt — dispelled, no roll
  // Master Rune of Balance: once a turn, an extra D6 for the Dispel roll, the lowest discarded
  for (const w of able.filter(w => away(w) <= dispelRange(w))) {
    // (Blood of the Nightfather: the same)
    for (const id of [...new Set(w.items || [])].filter(id => ITEM_EFFECTS[id]?.flags?.spellbreaking)) if (itemLeft(w, id) > 0) answers.push([`${w.name}: ${itemName(id)} (single use) — dispelled, no roll`, { w, spellbreak: id }])
    if (itemLeft(w, 'the-tricksters-pendant') > 0) answers.push([`Wizardly dispel with ${w.name} and the Trickster's Pendant (single use): 3D6, discard the lowest`, { w, unweavingScroll: true, trickster: true }])
    if ((w.items || []).includes('master-rune-of-balance') && w.status.balanceTurn !== `${game.round}:${game.active}`) answers.push([`Wizardly dispel with ${w.name} and its Master Rune of Balance: 3D6, discard the lowest`, { w, unweavingScroll: true, balance: true }])
  }
  // Glowy Green Amulet: the target's bearer, instead of a Wizardly dispel: 2+ dispels; a 1, it explodes
  // Glittering Wotnots: likewise, a D6 — 4+ the spell is reflected onto its caster and its unit
  for (const b of game.units.filter(b => b.side === foe && b.placed && !b.status.removed && !isDead(b) && !b.status.frog && (b.items || []).includes('glittering-wotnots') && target?.id && (target === b || hostOf(game, b) === target))) answers.push([`${b.name}: the Glittering Wotnots (D6, 4+ reflects the spell onto its caster)`, { wotnots: b }])
  for (const b of game.units.filter(b => b.side === foe && b.placed && !b.status.removed && !isDead(b) && glowyAmulet(game, b, target))) answers.push([`${b.name}: the Glowy Green Amulet (D6, 2+ dispels; a 1 destroys it and costs a Wound)`, { glowy: b }])
  // Sorcerous Ruses: a Wizard with an unused Ruse may use it instead of a Wizardly dispel
  for (const w of able.filter(w => away(w) <= dispelRange(w) && dispelRuse(w))) answers.push([`${w.name}: Sorcerous Ruse — ${RUSE_NAMES[dispelRuse(w)]} (instead of a dispel)`, { w, ruse: true }])
  // Unseen Assailment (ploy): any Wizard, whatever its Dispel range, even engaged (not fleeing or Stupid)
  if (canPloy(game, foe, 'unseen')) {
    for (const w of game.units.filter(w => w.side === foe && canDispel(w) && !w.status.fleeing && !w.status.stupid && !w.status.frog && !armoured(w) && w.placed && !answers.some(a => a[1]?.w === w))) answers.push([`${w.name}: Unseen Assailment (ploy) — dispel from anywhere`, { w, unseen: true }])
  }
  if (!game.fatedDispelUsed?.[foe + ':' + game.round + ':' + game.active]) answers.push(['Fated dispel (2D6, once a turn)', 'fated'])
  answers.push(['No dispel', null])
  const choice = ask ? await ask(`${sideName(game, foe)}: dispel ${s.name}? It must be beaten: casting result ${result}.`, answers) : null
  if (!choice) { say(game, '', `${game.sides[foe].name} does not dispel.`); return false }
  if (choice.unseen) usePloy(game, foe, 'unseen', `${choice.w.name} dispels from wherever it is`)
  if (choice.wotnots) {
    const r = d6(game.rng)
    // (the caster may try a Wizardly dispel against its own reflected spell: not offered here, a gap)
    say(game, 'roll', `${choice.wotnots.name}'s Glittering Wotnots: D6 = ${r} — ${r >= 4 ? `the spell is REFLECTED onto ${caster.name}` : 'no effect, the spell is cast as normal'}.`)
    return r >= 4 ? 'reflected' : false
  }
  if (choice.glowy) {
    const b = choice.glowy
    const r = d6(game.rng)
    if (r >= 2) { say(game, 'roll', `${b.name}'s Glowy Green Amulet: D6 = ${r} — ${s.name} is DISPELLED.`); return true }
    spendItem(b, 'glowy-green-amulet')
    say(game, 'bad', `${b.name}'s Glowy Green Amulet: D6 = 1 — it EXPLODES: destroyed, and ${b.name} loses a Wound.`)
    applyWounds(game, b, 1, 'the Glowy Green Amulet')
    return false
  }
  if (choice.item) {
    spendItem(choice.w, choice.item)
    const lv = wizardLevel(caster)
    say(game, '', `${choice.w.name} reads its ${itemName(choice.item)}: ${s.name} is cast as normal.`)
    return { after: () => choice.item === 'feedback-scroll' ? feedback(game, caster) : transmogrificationRoll(game, caster, lv) }
  }
  if (choice.spellbreak) {
    spendItem(choice.w, choice.spellbreak); say(game, 'good', `${choice.w.name} uses its ${itemName(choice.spellbreak)}: ${s.name} is DISPELLED.`)
    // (The Vortex Shard: and every Remains in Play spell in play, friendly ones too)
    if (ITEM_EFFECTS[choice.spellbreak]?.flags?.vortexShard) { const rip = (game.effects || []).filter(e => e.until === 'casterGone' || e.rip || e.kind === 'vortex'); for (const e of rip) { if (e.revert) e.revert(); if (e.say) say(game, '', e.say) } game.effects = (game.effects || []).filter(e => !rip.includes(e)); say(game, 'good', `The Vortex Shard: ${rip.length} Remains in Play spell${rip.length === 1 ? '' : 's'} dispelled.`) }
    return true
  }
  if (choice.trickster) spendItem(choice.w, 'the-tricksters-pendant')
  else if (choice.balance) choice.w.status.balanceTurn = `${game.round}:${game.active}`
  else if (choice.unweavingScroll) spendItem(choice.w, choice.mirror ? 'silver-mirror' : 'unweaving-scroll')
  if (choice.ruse) return ruseOutcome(game, choice.w, caster, s, useDispelRuse(game, choice.w, caster, s))
  if (choice.magnify) {
    choice.w.wizard.channel--
    const r = d6(game.rng)
    const reach = dispelRange(choice.w) + r
    say(game, 'roll', `${choice.w.name} spends a Channelling die to magnify its Dispel range: ${dispelRange(choice.w)}" + ${r} = ${reach}", the caster is ${away(choice.w).toFixed(1)}" away — ${reach >= away(choice.w) ? 'in range' : 'still out of range; no dispel'}.`)
    if (reach < away(choice.w)) return false
  }
  // Dissolution (ploy): dispelled, no roll needed
  if (await offerPloy(game, foe, 'dissolution', ask, `${choice === 'fated' ? 'A Fated dispel' : `${choice.w.name}'s dispel`} of ${s.name}.`)) { say(game, 'good', `${s.name} is DISPELLED (Dissolution).`); return true }
  // Winds of Fortune (ploy): an extra D6, the lowest discarded; a double 1 can be avoided
  const fortune = await offerPloy(game, foe, 'fortune', ask, `${choice === 'fated' ? 'A Fated dispel' : `${choice.w.name}'s dispel`} of ${s.name}.`)
  if (choice === 'fated') {
    game.fatedDispelUsed = { ...(game.fatedDispelUsed || {}), [foe + ':' + game.round + ':' + game.active]: true }
    const rollF = () => { const all = rollDice(game.rng, fortune ? 3 : 2); const kept = [...all].sort((a, b) => b - a).slice(0, 2); return { all, kept, n: kept[0] + kept[1], sixes: all.filter(x => x === 6).length >= 2 } }
    let f = rollF()
    // Fortuitous Intervention (ploy): a failed Dispel roll is re-rolled
    if (!(f.n > result || f.sixes) && await offerPloy(game, foe, 'fortuitous', ask, `Fated dispel ${f.all.join('+')} = ${f.n} against ${result}: failed.`)) { say(game, 'roll', `Fated dispel ${f.all.join('+')} = ${f.n} — failed; re-rolled (Fortuitous Intervention).`); f = rollF() }
    const ok = f.n > result || f.sixes
    say(game, 'roll', `Fated dispel: ${f.all.join('+')}${f.all.length > 2 ? ` (keeps ${f.kept.join('+')})` : ''} = ${f.n}, needs more than ${result}${f.sixes ? ' — natural double 6, UNBINDING' : ''} — ${ok ? 'DISPELLED' : 'failed'}.`)
    return ok
  }
  const w = choice.w
  if (choice.channel) w.wizard.channel--
  // (Dagger of the Dark Pantheon: its stored bonus, spent on this Dispel roll)
  const pan = w.status.pantheon || 0
  w.status.pantheon = 0
  // with an extra Channelling die, the lowest is discarded; a double 1 or 6 on any two dice counts
  const read = d => {
    const kept = [...d].sort((a, b) => b - a).slice(0, 2)
    // (Winds of Fortune: a double 1 among three dice is avoided by discarding one of the 1s)
    // (Unweaving scroll: with its extra dice, a double 1 on any two still outclasses)
    const ones = d.filter(x => x === 1).length >= (fortune && !choice.unweavingScroll ? 3 : 2)
    const sixes = d.filter(x => x === 6).length >= 2
    const double = new Set(d).size < d.length // a natural double on any two of the dice
    // the dispeller's arcane items: Wizard's Familiar and Wand of Jet +1; Book of Iselde +1 unless a natural double
    // (Arcane Backlash: Lady Élisse +1 to her Dispel rolls)
    // (Prayer Icon of Ombrelle: +1 against a Hex)
    const nullS = game.units.some(k => k.placed && !k.status.removed && !isDead(k) && (k.items || []).includes('null-stone') && distanceBetween(hostOf(game, k) || k, hostOf(game, w) || w) <= commandRange(k)) ? -1 : 0
    const bonus = pan + nullS + itemSum(w, 'dispelBonus') + ((w.items || []).includes('book-of-iselde') && !double ? 1 : 0) + (hasRule(w, 'Arcane Backlash') ? 1 : 0) + (s.category === 'Hex' ? itemSum(w, 'hexDispel') : 0)
    // (Unmade Heart: its Level counts as one more than the caster's, or the Bound spell's Power Level)
    const lvBonus = (w.items || []).includes('unmade-heart') ? Math.ceil(((bound ? (caster.boundPower || 1) : wizardLevel(caster)) + 1) / 2) : halfLevel(w)
    return { d, kept, ones, sixes, double, bonus, total: kept[0] + kept[1] + lvBonus - (dispelState(w).bewildered || 0) + bonus }
  }
  const text = r => `${r.d.join('+')}${r.d.length > 2 ? ` (discard the lowest: ${r.kept.join('+')})` : ''} + ${halfLevel(w)}${r.bonus ? ` + ${r.bonus} (items)` : ''} = ${r.total}`
  // (Oaken Stave: within 3" of a wood, an extra D6, the lowest discarded)
  const nd = (choice.channel ? 3 : 2) + (fortune ? 1 : 0) + (choice.unweavingScroll ? 1 : 0) + (oaken(w) ? 1 : 0)
  let r = read(rollDice(game.rng, nd))
  // Idol of Wangler, Scroll of Disruption: once a turn, re-roll the Dispel roll
  const rr = itemWith(w, 'rerollDispel')
  if (rr && ask && !dispelState(w).dispelRerolled && !r.sixes && (r.ones || r.total <= result)) {
    const yes = await ask(`Wizardly dispel by ${w.name}: ${text(r)} against ${result}. Re-roll the Dispel roll (${itemName(rr)}, once a turn)?`, [['Re-roll it', true], ['Keep it', false]])
    if (yes) {
      dispelState(w).dispelRerolled = true
      say(game, 'roll', `${w.name} re-rolls its Dispel roll ${r.d.join('+')} with the ${itemName(rr)}.`)
      r = { ...read(rollDice(game.rng, r.d.length)), itemRerolled: true }
    }
  }
  // Channelled Luck: two Channelling dice re-roll a failed Dispel roll (not to avoid being outclassed)
  if (chan && ask && !r.itemRerolled && (w.wizard?.channel || 0) >= 2 && !r.ones && !r.sixes && r.total <= result) {
    const yes = await ask(`Wizardly dispel by ${w.name}: ${text(r)} against ${result} — failed. Spend two Channelling dice (${w.wizard.channel} left) to re-roll it?`, [['Re-roll it', true], ['Keep it', false]])
    if (yes) { w.wizard.channel -= 2; say(game, 'roll', `Wizardly dispel by ${w.name}: ${text(r)} — failed; two Channelling dice spent to re-roll.`); r = { ...read(rollDice(game.rng, r.d.length)), itemRerolled: true } }
  }
  // Fortuitous Intervention (ploy): a failed Dispel roll, even outclassed, is re-rolled
  if (!r.itemRerolled && !r.sixes && ((r.ones && !bound) || r.total <= result) && await offerPloy(game, foe, 'fortuitous', ask, `${w.name}'s Dispel roll ${text(r)} against ${result}: ${r.ones && !bound ? 'outclassed' : 'failed'}.`)) { say(game, 'roll', `Wizardly dispel by ${w.name}: ${text(r)} — ${r.ones && !bound ? 'outclassed' : 'failed'}; re-rolled (Fortuitous Intervention).`); r = { ...read(rollDice(game.rng, r.d.length)), itemRerolled: true } }
  // Sceptre of Power: a natural double on a Dispel roll too — a S10 AP -3 hit on the bearer
  if (r.double && (w.items || []).includes('sceptre-of-power')) { say(game, 'bad', `A natural double: the Sceptre of Power strikes ${w.name} — a Strength 10 hit, AP -3.`); effects.hitModel(game, w, 10, -3) }
  if (r.double && (w.items || []).includes('wand-of-jet') && itemLeft(w, 'wand-of-jet') > 0) { spendItem(w, 'wand-of-jet'); say(game, 'bad', `A natural double: ${w.name}'s Wand of Jet shatters.`) }
  // (a dispel against a Bound spell can never be Outclassed in the Art)
  if (r.ones && !bound) {
    say(game, 'roll', `Wizardly dispel by ${w.name}: ${r.d.join('+')} — a double 1, OUTCLASSED IN THE ART. It rolls on the Backlash table (reading 'cast' as 'dispel').`)
    const m = await backlash(game, w, effects, ask, { dispel: true })
    // OUTCLASSED IN THE ART: 8-9 the spell IS dispelled; 10-12 an unbinding
    if (m) { say(game, 'good', `${s.name} is ${m === 'perfect' ? 'unbound' : 'dispelled'} all the same.`); return true }
    return false
  }
  // Arcane Backlash: any natural double but 1s: the spell is unbound and its caster loses a Wound
  const arcaneBacklash = hasRule(w, 'Arcane Backlash') && r.double && !r.ones && !r.sixes
  const ok = r.total > result || r.sixes || arcaneBacklash
  say(game, 'roll', `Wizardly dispel by ${w.name}: ${text(r)}, needs more than ${result}${r.sixes ? ' — natural double 6, UNBINDING' : arcaneBacklash ? ' — a natural double: ARCANE BACKLASH, the spell is unbound' : ''} — ${ok ? 'DISPELLED' : 'failed'}.`)
  if (arcaneBacklash && !caster.status.removed) { say(game, 'bad', `Arcane Backlash: ${caster.name} loses a Wound.`); applyWounds(game, caster, 1, 'Arcane Backlash') }
  // (The Trickster's Pendant: dispelled, its caster attempts no more spells this turn)
  if (ok && choice.trickster && caster.wizard) { caster.wizard.noMoreThisTurn = true; say(game, 'good', `The Trickster's Pendant: ${caster.name} can attempt no more spells this turn.`) }
  if (ok && choice.mirror && !caster.status.removed) { say(game, 'bad', `The Silver Mirror flashes back at ${caster.name}: a Strength 4 hit, AP -2.`); effects.hitModel(game, caster, 4, -2) }
  return ok
}

// What a Ruse's outcome does: true (dispelled), false (cast) or 'reflected'.
function ruseOutcome (game, w, caster, s, out) {
  const o = typeof out === 'string' ? { result: out } : out
  // Unmade Assailants: the caster also loses a single Wound (no Regeneration)
  if (o.wound && !caster.status.removed) { say(game, 'bad', `Unmade Assailants: ${caster.name} loses a Wound.`); applyWounds(game, caster, 1, 'Unmade Assailants') }
  // Magical Syphon: every other enemy spell in play is dispelled too
  if (o.syphon) {
    // (spells only: not a Big Ruck or a potion)
    const theirs = (game.effects || []).filter(e => !['big-ruck', 'potion'].includes(e.kind) && game.units.find(x => x.id === e.casterId)?.side === caster.side)
    for (const e of theirs) { if (e.revert) e.revert(); if (e.say) say(game, '', e.say) }
    game.effects = (game.effects || []).filter(e => !theirs.includes(e))
    if (theirs.length) say(game, 'good', `Magical Syphon: ${theirs.length} other enemy spell${theirs.length === 1 ? '' : 's'} in play dispelled.`)
  }
  return o.result === 'reflected' ? 'reflected' : o.result === 'dispelled'
}
// Spell Eater: Spell Eater may still try against a perfect invocation (a natural double 6 dispels it)
async function spellEaterVsPerfect (game, caster, s, ask) {
  const foe = 1 - caster.side
  // (it must be a Wizard able to attempt a Wizardly dispel: in range, not in armour)
  const eaters = game.units.filter(w => w.side === foe && w.wizard && isWizard(w) && w.placed && !w.status.fleeing && !w.status.frog && !armoured(w) && distanceBetween(hostOf(game, w) || w, hostOf(game, caster) || caster) <= dispelRange(w) && dispelRuse(w) === 'spell-eater')
  if (!eaters.length || !ask) return false
  const w = await ask(`${sideName(game, foe)}: ${s.name} was cast with a perfect invocation. Use Spell Eater (needs a natural double 6)?`, [...eaters.map(x => [`${x.name}: Spell Eater`, x]), ['No', null]])
  if (!w) return false
  return useDispelRuse(game, w, caster, s, { perfect: true }) === 'dispelled'
}
// Duplicitous Mirror: the spell turns back on its caster and the caster's unit
async function reflect (game, u, s, result, ask, effects) {
  const host = hostOf(game, u) || u
  // (a Magical Vortex is placed at a point: the caster's own position)
  const t = s.category === 'Magical Vortex' ? centre(host) : host
  say(game, 'good', `Duplicitous Mirror: ${s.name} is turned back upon ${host.name}!`)
  await effects.resolve(game, u, s, t, { perfect: false, result, ask, reflected: true })
  return { cast: true, reflected: true, result }
}

// The Backlash table. Returns 'cast', 'perfect' or null.
// `dispel`: rolled for an Outclassed in the Art dispel, not a spell's backlash (the ploys are for spells)
export async function backlash (game, u, effects, ask = null, { dispel = false } = {}) {
  // Staff of Solidity: single use, no roll on the Backlash table
  if (itemLeft(u, 'staff-of-solidity') > 0) { spendItem(u, 'staff-of-solidity'); say(game, 'good', `${u.name}'s Staff of Solidity absorbs the backlash (single use): no roll on the Backlash table.`); return null }
  // Sorcerer's Curse: a Toughness test first; failed, a Wound and +1 Toughness instead (chaosdwarfs.js)
  if (!dispel && sorcerersCurse(game, u, applyWounds)) return null
  // Untutored Arcanist: an extra D6, the highest discarded
  const roll2 = () => {
    if (!untutored(u)) return rollDice(game.rng, 2)
    const d = rollDice(game.rng, 3)
    const kept = [...d].sort((x, y) => x - y).slice(0, 2)
    say(game, 'roll', `${u.name} is an Untutored Arcanist: Backlash table 3D6 ${d.join(', ')}, the highest discarded — ${kept.join('+')}.`)
    return kept
  }
  let dice = roll2()
  // Unerring Confidence (ploy): roll twice and choose; Twist of Fate (ploy): re-roll it
  let ployed = false
  if (!dispel && await offerPloy(game, u.side, 'confidence', ask, `${u.name} miscasts, before the Backlash table.`)) {
    const other = roll2()
    const pick = await ask(`Unerring Confidence: Backlash table ${dice.join('+')} = ${dice[0] + dice[1]} or ${other.join('+')} = ${other[0] + other[1]}?`, [[`${dice[0] + dice[1]}`, dice], [`${other[0] + other[1]}`, other]])
    say(game, 'roll', `Unerring Confidence: ${dice.join('+')} and ${other.join('+')} — ${pick.join('+')} chosen.`)
    dice = pick
  } else if (!dispel && await offerPloy(game, u.side, 'twist', ask, `${u.name} miscasts: Backlash table ${dice.join('+')} = ${dice[0] + dice[1]}.`)) {
    const again = roll2()
    say(game, 'roll', `Twist of Fate: Backlash table ${dice.join('+')} re-rolled: ${again.join('+')} = ${again[0] + again[1]} (it must stand).`)
    dice = again
    ployed = true
  }
  // Earthing Rod: single use — the Wizard CAN re-roll the result on the Backlash table
  if (!ployed && (u.items || []).includes('earthing-rod') && itemLeft(u, 'earthing-rod') > 0 && ask) {
    const yes = await ask(`${u.name} miscasts: Backlash table ${dice.join('+')} = ${dice[0] + dice[1]}. Use its Earthing Rod (once a game) to re-roll it?`, [['Re-roll it', true], ['Keep it', false]])
    if (yes) {
      const again = roll2()
      say(game, 'roll', `Backlash table ${dice.join('+')} = ${dice[0] + dice[1]} — ${u.name} uses its Earthing Rod and re-rolls: ${again.join('+')} = ${again[0] + again[1]}.`)
      spendItem(u, 'earthing-rod')
      dice = again
    }
  }
  const n = dice[0] + dice[1]
  const at = centre(hostOf(game, u) || u)
  if (n <= 4) {
    say(game, 'bad', `Backlash table ${dice.join('+')} = ${n}: DIMENSIONAL CASCADE — a 5" template on the Wizard, Strength 10, AP -4 hits.`)
    effects.template(game, at, 2.5, 10, -4, u)
    return null
  }
  if (n <= 6) {
    say(game, 'bad', `Backlash table ${dice.join('+')} = ${n}: CALAMITOUS DETONATION — a 3" template on the Wizard, Strength 6, AP -2 hits.`)
    effects.template(game, at, 1.5, 6, -2, u)
    return null
  }
  if (n === 7) {
    say(game, 'bad', `Backlash table 7: CARELESS CONJURATION — ${u.name} suffers a Strength 4, AP -1 hit.`)
    effects.hitModel(game, u, 4, -1)
    return null
  }
  if (n <= 9) {
    say(game, 'bad', `Backlash table ${dice.join('+')} = ${n}: BARELY CONTROLLED POWER — the spell goes off at exactly its casting value; no more spells this turn.`)
    if (u.wizard) u.wizard.noMoreThisTurn = true
    return 'cast'
  }
  say(game, 'good', `Backlash table ${dice.join('+')} = ${n}: POWER DRAIN — cast with a perfect invocation; no more spells this turn.`)
  if (u.wizard) u.wizard.noMoreThisTurn = true
  return 'perfect'
}

export function newTurnForWizards (game) {
  for (const u of game.units) if (u.wizard) Object.assign(u.wizard, { castThisTurn: [], attempts: 0, noMoreThisTurn: false, castRerolled: false, dispelRerolled: false, rangeBonus: 0, wandUsed: false })
}

