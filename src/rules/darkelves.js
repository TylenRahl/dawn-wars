// The Vhar's own army rules, as small functions and tables that the shared rules modules call at the
// right moment (combat, damage, Leadership, magic and others; each comment says where).

import { say } from './game.js'
import { hasRule, alive, isDead } from './units.js'
import { rollDice } from './dice.js'

const live = c => !c.status?.removed && !isDead(c)
const turnKey = game => `${game.round}:${game.active}`
const hostIn = (game, c) => game?.units?.find(h => (h.joined || []).includes(c)) || null

// Untouchable saves (damage.js saveFor):
// Dark Runes 5+ against non-magical attacks; Pendant of Vaelith 5+ against
// Strength 4 or lower, 4+ against Strength 5 or higher
export function deWards (u, strength) {
  const out = []
  if (hasRule(u, 'Dark Runes')) out.push({ value: 5, nonMagical: true, source: 'Dark Runes' })
  if ((u.items || []).includes('pendant-of-vaelith')) out.push({ value: (strength ?? 0) >= 5 ? 4 : 5, source: 'the Pendant of Vaelith' })
  return out
}
// Sea Dragon Cloak — +1 armour value against non-magical shooting (to 2+) (damage.js)
export const seaDragonCloak = u => hasRule(u, 'Sea Dragon Cloak')

// Eternal Hatred — against Ilthari, Hatred in every round of combat (not its mount)
export const eternalHatred = (a, b) => hasRule(a, 'Eternal Hatred') && b.army === 'ilthari-realms'

// Murderous — fighting with a single non-magical hand weapon, natural 1s To Wound re-rolled
// (not its mount) (combat.js)
export const murderous = (a, g) => hasRule(a, 'Murderous') && !g.isMount && !g.itemId && /^hand weapons?$/i.test(String(g.weapon || '').replace(/,.*$/, '').trim())

// Extra Attacks as a model's own rule: '+remaining Wounds' (a War Hydra: its Wounds
// left), '+D3' (Rune of the Bloodied God) — rolled once when its combat is chosen (here: once a turn) (combat.js)
export function ownExtraAttacks (game, a, roll) {
  const r = [...(a.special || [])].find(x => x.startsWith('Extra Attacks'))
  const rune = (a.items || []).includes('rune-of-the-bloodied-god')
  if (!r && !rune) return 0
  if (r && /remaining Wounds/i.test(r)) return Math.max(0, alive(a).find(m => m.role !== 'handler')?.wounds ?? 0)
  if (a.status.ownXA?.key === turnKey(game)) return a.status.ownXA.n
  const m = (r || 'Extra Attacks (+D3)').match(/\(\+(D?)(\d+)\)/)
  const n = !m ? 1 : m[1] ? roll(Number(m[2])) : Number(m[2])
  a.status.ownXA = { key: turnKey(game), n }
  if (m?.[1]) say(game, 'roll', `${a.name}: Extra Attacks (+D${m[2]}) = ${n}.`)
  return n
}

// Abyssal Howl — enemy units within 6" -1 Leadership (to 2), not cumulative;
// Cry of War — within the Command range of a Blood Crone with it (not fleeing), -1 (leadership.js)
export const abyssalHowl = (game, u, distanceBetween) => game.units.some(c => c.side !== u.side && c.placed && live(c) && hasRule(c, 'Abyssal Howl') && distanceBetween(c, u) <= 6)
export const cryOfWar = (game, u, distanceBetween, commandRange) => game.units.some(c => c.side !== u.side && c.placed && live(c) && !c.status.fleeing && (c.items || []).includes('cry-of-war') && distanceBetween(hostIn(game, c) || c, u) <= commandRange(c))

// Dance of Death — after a successful charge, the target's Maximum Rank Bonus is 1 lower for that turn's Combat
// phase (charge.js, combat.js rankBonus)
export function danceOfDeath (game, u, t) {
  if (!hasRule(u, 'Dance of Death')) return
  t.status.danceOfDeath = turnKey(game)
  say(game, '', `${u.name}'s Dance of Death: ${t.name} -1 to its Maximum Rank Bonus this Combat phase.`)
}
export const dancedOn = (game, u) => u.status?.danceOfDeath === turnKey(game)

// Goad Beast — in its own Command sub-phase, a friendly monster within its Command range
// (its own mount too) +D3 Attacks (to 10) until the end of the turn (ui/phases.js; combat.js reads status.goaded)
export const canGoad = (game, u) => hasRule(u, 'Goad Beast') && live(u) && u.side === game.active && u.status.goadTurn !== turnKey(game) && !u.status.fleeing
const isMonster = x => /Behemoth|Monstrous Creature|Monster/.test((x.troopType || []).join(' ') + ' ' + (x.category || ''))
export function goadTargets (game, u, distanceBetween, commandRange) {
  // (its own mount, if a monster: a Manticore or Black Dragon — the High Beastmaster's ridden monsters)
  const own = u.mount && /Monstrous Creature|Behemoth/.test((u.mount.troopType || []).join(' ') || '') || /manticore|dragon/i.test(u.mount?.name || '') ? [u] : []
  return [...own, ...game.units.filter(x => x !== u && x.side === u.side && x.placed && live(x) && isMonster(x) && distanceBetween(hostIn(game, u) || u, x) <= commandRange(u))]
}
export function goad (game, u, t) {
  u.status.goadTurn = turnKey(game)
  const n = Math.ceil(rollDice(game.rng, 1)[0] / 2)
  t.status.goaded = { key: turnKey(game), n, mount: t === u }
  say(game, 'roll', `${u.name} goads ${t === u ? 'its mount' : t.name}: D3 = ${n} — +${n} Attacks this turn.`)
}
// (its own mount: the mount's Attacks, combat.js mount group; another monster: its own)
export const goaded = (game, a, mount = false) => a.status?.goaded?.key === turnKey(game) && !!a.status.goaded.mount === mount ? a.status.goaded.n : 0

// Cursed Coven — Hexfire Warlocks know a single spell from Dark Magic or Unmade Rites, chosen
// before deployment (its player's choice, asked: ui/battle.js, `slug`; with no player, the lore's first numbered
// spell), cast as a Bound spell: Power Level 2 with a Master and Unit Mass 10+, 1 with a Master, else 0 (magic.js
// boundSpellsOf)
export const covenChoices = loreSpells => [...loreSpells('dark-magic'), ...loreSpells('unmade-rites')]
export function covenOfDoom (game, u, loreSpells, slug = null) {
  const lore = ['dark-magic', 'unmade-rites'].includes(u.lore) ? u.lore : 'dark-magic'
  const s = (slug && covenChoices(loreSpells).find(x => x.slug === slug)) || loreSpells(lore).find(x => x.number)
  if (!s) return
  u.covenSpell = s.slug
  say(game, '', `${u.name} (Cursed Coven) know ${s.name}.`)
}
export function cursedCovenPower (u, unitMass) {
  const master = alive(u).some(m => m.role === 'champion')
  return master && unitMass(u) >= 10 ? 2 : master ? 1 : 0
}

// Petrifying gaze — To Wound against the target's Initiative instead of its Toughness; no
// Armour Roll (shooting.js)
export const petrifying = w => w.key === 'petrifying gaze'
