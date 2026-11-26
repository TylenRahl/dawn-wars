// Display names: swaps the older names still inside the data for the names the player sees, at the moment text
// reaches the screen, so every id, key and data file stays as it is. Exports forDisplay(text), armyTitle and the
// EXACT / ARMY_TITLES / TERMS tables; used by the screens (ui/film.js, ui/shownNames.js) and the board (view/board.js).
//
// The tables are src/rules/names/*.json, one per army plus common.json (lores, spells, common items, weapons) and
// core.json (the game's own words); rules/names/README.md is the naming guide. art-tools/names_to_js.mjs turns the
// JSON files into names/index.js, which is what is imported here (plain JS, so the node tests and Vite read it alike).
//
// forDisplay(text): whole phrases, longest first, never inside a word; a replaced phrase is held as a placeholder until
// the end, so a new name is never renamed again. Then TERMS: the core rule words inside sentences and the short stat
// labels.

import { TABLES } from './names/index.js'

// every table merged into one: the same old phrase reads the same everywhere (rules/names/README.md)
export const EXACT = new Map()
for (const t of TABLES) for (const [k, v] of Object.entries(t.names ?? {})) if (!EXACT.has(k)) EXACT.set(k, v)
// the army's new name, by id (the army chooser, the film's cards)
export const ARMY_TITLES = Object.fromEntries(TABLES.filter(t => t.title && t.army !== 'common' && t.army !== 'core').map(t => [t.army, t.title]))

// THE CORE WORDS: the characteristics and phases inside sentences. Case kept.
const STAT = { M: 'M', WS: 'CM', BS: 'Mk', S: 'Mi', T: 'Re', W: 'HP', I: 'Rf', A: 'St', Ld: 'Rs' }
export const TERMS = [
  // (the game's own name is in core.json, which wins over every army table)
  ['\\bWeapon Skill\\b', 'Combat Mastery'],
  ['\\bBallistic Skill\\b', 'Marksmanship'],
  ['\\bStrength\\b', 'Might'],
  ['\\bToughness\\b', 'Resilience'],
  ['\\bWounds\\b', 'Hit Points'],
  ['\\bWound characteristic\\b', 'Hit Points characteristic'],
  ['\\bInitiative\\b', 'Reflexes'],
  ['\\bLeadership\\b', 'Resolve'],
  ['\\bArmour Piercing\\b', 'Pierce'],
  ['\\bShooting phase\\b', 'Fire Phase'],
  ['\\bCombat phase\\b', 'Melee Phase'],
  ['\\bMovement phase\\b', 'Manoeuvre Phase'],
  // COMBAT AND SHOOT IN SENTENCES: a fight is a melee, to shoot is to
  // fire, as the phases are named. "Combat Mastery" (the new Weapon Skill) is never touched.
  // (one fight is "a melee"; more than one are "clashes", which reads better than "melees")
  ['\\b[Cc]lose combats?\\b', m => m.endsWith('s') ? (m[0] === 'C' ? 'Clashes' : 'clashes') : (m[0] === 'C' ? 'Melee' : 'melee')],
  [String.raw`\b[Cc]ombat(s?)\b(?! Mastery)`, m => m.endsWith('s') ? (m[0] === 'C' ? 'Clashes' : 'clashes') : (m[0] === 'C' ? 'Melee' : 'melee')],
  [String.raw`\b[Ss]hoot(s|ing|er|ers)?\b`, m => ({ '': 'fire', s: 'fires', ing: 'firing', er: 'firing unit', ers: 'firing units' })[m.slice(5).toLowerCase()].replace(/^f/, f => m[0] === 'S' ? 'F' : f)],
  // the past of shoot, after the words that mark it as one ("has already shot", "Now: has shot"), not "a shot"
  [String.raw`(?<=\b(?:has|have|had|already|not|never|just|was|were|been|be|being|is|are) )shot\b`, () => 'fired'],
  // the phases in capitals ("— SHOOTING PHASE." in the log), and one Wound, which is one Hit Point ("loses 1 Wound", "lose a Wound")
  [String.raw`\b(?:SHOOTING|COMBAT|MOVEMENT) PHASE\b`, m => ({ SHOOTING: 'FIRE', COMBAT: 'MELEE', MOVEMENT: 'MANOEUVRE' })[m.split(' ')[0]] + ' PHASE'],
  [String.raw`(?<=\b(?:\d+|a|one|last|single) )Wound\b`, () => 'Hit Point'],
  // the same words in capitals (a heading drawn in capitals from its text)
  [String.raw`\b(?:CLOSE COMBAT|COMBATS?|SHOOT(?:S|ING)?)\b`, m => ({ 'CLOSE COMBAT': 'MELEE', COMBAT: 'MELEE', COMBATS: 'CLASHES', SHOOT: 'FIRE', SHOOTS: 'FIRES', SHOOTING: 'FIRING' })[m]],
  // a printed stat line ("WS3 BS3 S3", "WS 4, BS 3"): two or more label-and-number items in a row take the new stat headings
  [String.raw`(?<![\w-])(?:(?:WS|BS|S|T|W|I|A|Ld) ?\d+\+?,? ?){2,}`, run => run.replace(/(WS|BS|Ld|S|T|W|I|A)( ?\d)/g, (m, l, rest) => STAT[l] + rest), 'g'],
  // "(+1 Weapon Skill)" is above; "+1 WS", "-1 Ld" alone
  [String.raw`(?<=[+-]\d )(WS|BS|Ld)(?![\w-])`, m => STAT[m], 'g']
]
// A text that is nothing but a stat heading ("WS" in a table's header cell) takes the new stat heading. Only whole texts,
// so "A" or "S" inside a sentence is never touched. "Combat" alone (a weapon's range cell) is Melee and "Shooting" alone is Fire
const HEADING = { WS: 'CM', BS: 'Mk', S: 'Mi', T: 'Re', W: 'HP', I: 'Rf', A: 'St', Ld: 'Rs', Strength: 'Might', Combat: 'Melee', Shooting: 'Fire' }

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const capitalise = s => s.charAt(0).toUpperCase() + s.slice(1)
const token = i => '' + String.fromCharCode(0xE100 + i) + ''
const TOKEN = /([-])/g

let compiled = null
function compile () {
  if (compiled) return compiled
  const table = new Map(EXACT)
  // "halberd" also matches "Halberd" at the start of a sentence; an all-capitals key text ("REALM KNIGHTS" on a card) too
  for (const [k, v] of [...table]) {
    if (/^[a-z]/.test(k) && !table.has(capitalise(k))) table.set(capitalise(k), capitalise(v))
    if (/[a-z]/.test(k) && k.length > 3 && !table.has(k.toUpperCase())) table.set(k.toUpperCase(), v.toUpperCase())
  }
  const keys = [...table.keys()].sort((a, b) => b.length - a.length)
  // (one alternation of every key; a key ending or starting in a non-word character, "Big Ruck", is bounded by the
  // characters around it instead of a word edge)
  const exact = keys.length ? new RegExp(`(?<![A-Za-z0-9À-ÿ])(?:${keys.map(escapeRegExp).join('|')})(?![A-Za-z0-9À-ÿ])`, 'g') : null
  const terms = TERMS.map(([source, replacement, flags = 'g']) => ({ whole: new RegExp(source, flags), replacement }))
  compiled = { table, exact, terms }
  return compiled
}

export function forDisplay (text) {
  if (typeof text !== 'string' || text === '') return text
  const trimmed = text.trim()
  if (HEADING[trimmed]) return text.replace(trimmed, HEADING[trimmed])
  const { table, exact, terms } = compile()
  const out = []
  let s = exact ? text.replace(exact, match => { out.push(table.get(match)); return token(out.length - 1) }) : text
  for (const { whole, replacement } of terms) {
    s = s.replace(whole, (match, ...rest) => {
      let rep = typeof replacement === 'function' ? replacement(match) : match.replace(new RegExp(whole.source, whole.flags.replace('g', '')), replacement)
      if (typeof replacement !== 'function' && /^[A-Z]/.test(match) && !/^[A-Z]/.test(rep)) rep = capitalise(rep)
      out.push(rep)
      return token(out.length - 1)
    })
  }
  if (!out.length) return text
  const value = i => out[i.charCodeAt(0) - 0xE100]
  // "a Rukka" -> "a Rukka" is fine; "an Realm Knight" -> "a Realm Knight": the article follows the new first letter
  s = s.replace(/\b(a|an|A|An) (?=([-]))/g, (m, article, i) => {
    const an = /^[AEIOUaeiou]/.test(value(i))
    const lower = article === article.toLowerCase()
    return `${an ? (lower ? 'an' : 'An') : (lower ? 'a' : 'A')} `
  })
  // "the The Concord Realm" -> "the Concord Realm": a new name that carries its own "The" drops it after an article, or
  // inside a sentence
  s = s.replace(TOKEN, (m, i, at) => {
    const v = value(i)
    if (!/^The /.test(v)) return v
    const before = s.slice(Math.max(0, at - 4), at)
    if (at === 0 || /(^|[.:!?(]\s*)$/.test(s.slice(Math.max(0, at - 3), at))) return /\b(the|The) $/.test(before) ? v.slice(4) : v
    return v.slice(4)
  })
  return s
}

// the army's own new name by id ("concord-realm" -> "The Concord Realm"), or the id if it has none
export const armyTitle = id => ARMY_TITLES[id] ?? id
