// Army rules that give a unit other special rules: the Knightly Orders of the Concord Realm, the Witch Hunter's
// specialisms, and who counts as what for Hatred (X) and Fear of Elves. grantedRules is read by rulesOf (units.js),
// so every other rule sees the granted rules as the unit's own; joining, damage, combat and charge use the rest.
// Imports nothing from units.js: it works on the unit record alone.

// The Knightly Orders of the Concord Realm.
// The Knights, Inner Circle Knights and Clawsteed Knights entries of an Order carry it in their id
// (realm-knights-winter-fang, leopard-knights...); a Grand Master or Lord Commander buys it as an option.
export const ORDERS = {
  panther: 'Order of the Leopard Knights',
  'winter-fang': 'Order of the Winter Fang',
  'sunburst': 'Order of the Sunburst',
  'the-pale-keeper': 'Order of the Knights of the Pale Keeper',
  'ember-heart': 'Order of the Ember Heart'
}
// (what Order a unit belongs to never changes: kept on the unit, out of sight of anything that copies it)
export function orderOf (u) {
  if (!u) return null
  if (Object.prototype.hasOwnProperty.call(u, '_order')) return u._order
  const o = orderOf0(u)
  if (u.entryId) Object.defineProperty(u, '_order', { value: o, enumerable: false, writable: true })
  return o
}
function orderOf0 (u) {
  // Grand Master of the Leopard Knights: Torvald Brenner belongs to the Leopard Knights
  if (u.entryId === 'torvald-brenner') return 'panther'
  // (the Leopard Knights' entries put the Order first: leopard-knights, inner-circle-leopard-knights, clawsteed-leopard-knights)
  if (/^(?:inner-circle-|clawsteed-)?leopard-knights(?:-core)?$/.test(u.entryId || '')) return 'panther'
  const m = (u.entryId || '').match(/^(?:realm-knights|inner-circle-knights|clawsteed-knights)-(winter-fang|sunburst|the-pale-keeper|ember-heart)(?:-core)?$/)
  if (m) return m[1]
  for (const [k, name] of Object.entries(ORDERS)) if ((u.options || []).includes(name)) return k
  return null
}
// (the Order's own Grand Master or Lord Commander, or a unit of its Inner Circle Knights)
export const isOrderMaster = u => !!orderOf(u) && /^(grand-master|lord-commander|torvald-brenner|inner-circle-knights-|inner-circle-leopard-knights)/.test(u.entryId || '')

// The special rules each Order gives its models, and its masters besides.
const ORDER_RULES = {
  // Order of the Leopard Knights (Charge roll re-roll: charge.js chargeRoll)
  panther: { all: ['Hatred (Dominion Hosts + Hornkin Herds + Unmade models)'], master: ['Magic Resistance (-1)'] },
  // Order of the Winter Fang (the 5+ Ward against Flaming Attacks: orderWards)
  'winter-fang': { all: ['Furious Charge'], master: [] },
  // Order of the Sunburst (the +1 Melee Outcome on the charge: combat.js)
  'sunburst': { all: ['Evasive', 'Flaming Attacks'], master: [] },
  // Order of the Knights of the Pale Keeper (the 6+ Ward against non-magical attacks: orderWards)
  'the-pale-keeper': { all: ['Hatred (Undead models)'], master: ['Fear', 'Magical Attacks'] },
  // Order of the Ember Heart (+1 Initiative in the first round, the re-rolls: combat.js;
  // who may join: joining.js)
  'ember-heart': { all: ['Hatred (enemy Wizards + Rukka & Nippers)'], master: [] }
}

// Suffer Not: the Witch Hunter's specialism, chosen in the muster list (the
// builder's options 'The Witch', 'The Revenant'...), for the Witch Hunter and any unit it has joined
const SPECIALISMS = {
  'The Witch': ['Hatred (enemy Wizards)', 'Magic Resistance (-2)'],
  'The Revenant': ['Hatred (Undead models)', 'Flaming Attacks'],
  'The Mutant': ['Hatred (Dominion Hosts + Hornkin Herds)', 'Magic Resistance (-1)'],
  'The Unmade': ['Hatred (Unmade models)', 'Magical Attacks']
}
export const specialismOf = u => (u?.entryId === 'witch-hunter' && Object.keys(SPECIALISMS).find(k => u.special?.has(k))) || null

// Every rule granted to `u` by the above. `joined`: the characters with it (their specialisms reach it).
export function grantedRules (u, joined = []) {
  const out = []
  const o = orderOf(u)
  if (o) {
    out.push(...ORDER_RULES[o].all)
    if (isOrderMaster(u)) out.push(...ORDER_RULES[o].master)
  }
  for (const c of [u, ...joined.filter(c => !c.status?.removed && c.models?.some(m => m.wounds > 0))]) {
    const sp = specialismOf(c)
    if (sp) out.push(...SPECIALISMS[sp])
  }
  return out
}

// The Orders' Untouchable saves, in saveFor's form (damage.js)
export function orderWards (u) {
  const o = orderOf(u)
  if (o === 'the-pale-keeper') return [{ value: 6, nonMagical: true, source: ORDERS['the-pale-keeper'] }]
  if (o === 'winter-fang' && isOrderMaster(u)) return [{ value: 7, flaming: 5, source: ORDERS['winter-fang'] }]
  return []
}

// Who is who, for Hatred (X) and the like. Armies are told apart by their army id; Undead and
// Unmade models by their own special rules as well.
const ELVES = new Set(['ilthari-realms', 'lornefolk-of-lorne-wood', 'vhar'])
export const isElf = u => ELVES.has(u?.army)
const has = (u, name) => [...(u?.special || [])].some(r => r === name || r.startsWith(name + ' ('))
const KINDS = [
  [/^all enemies$/i, () => true],
  [/^enemy wizards?$/i, b => [...(b.special || [])].some(r => /^(Level \d )?Wizard$/.test(r))],
  [/^(enemy )?characters?$/i, b => (b.troopType || []).includes('Character')],
  [/^rukka (&|and) nippers?$/i, b => b.army === 'rukka-firms'],
  [/^undead( models)?$/i, b => has(b, 'Undead') || ['bloodsworn-courts', 'sand-kings-of-kheshet'].includes(b.army)],
  [/^dominion hosts$/i, b => b.army === 'dominion-hosts'],
  [/^(hornkin herds|beasts of dominion|hornkin)$/i, b => b.army === 'hornkin-herds'],
  [/^unmade( models)?$/i, b => has(b, 'Unmade') || b.army === 'the-unmade'],
  // (an army named: Ilthari are the Ilthari Realms' models, not every elf)
  [/^ilthari$/i, b => b.army === 'ilthari-realms'],
  [/^lornefolk$/i, b => b.army === 'lornefolk-of-lorne-wood'],
  [/^vhar$/i, b => b.army === 'vhar'],
  [/^elves$/i, b => isElf(b)],
  // (Dwarf Hide Banner: the Dwarfs' army)
  [/^dwarfs$/i, b => b.army === 'deephold-clans'],
  [/^gnawkin$/i, b => b.army === 'gnawkin'],
  // (the Concord Realm: its army, or a unit named for it — the Broken Crowns' Realm Archers)
  [/^concord realm$/i, b => b.army === 'concord-realm' || /\bRealm/i.test(b.name || '')],
  // (Unmade of Wrath and the rest: a god's Unmade — the same reading as unmade.js godOf)
  [/^unmade of (wrath|endurance|rapture|cipher)$/i, (b, part) => { const g = part.split(' ').pop().toLowerCase(); return [...(b?.special || [])].some(r => r.toLowerCase() === `unmade of ${g}`) }]
]
// Does a unit with these rules hate `b`? Hatred: "Hatred (X)" names whom.
export function hates (rules, b) {
  for (const r of rules.filter(r => r.startsWith('Hatred'))) {
    const inside = (r.match(/\(([^)]*)\)/) || [])[1] || 'all enemies'
    // ('Rukka & Nippers' is one name; elsewhere '&' joins two: 'Hornkin Herds & Unmade models')
    for (const part of inside.replace(/Rukka? & Nippers?/gi, 'Rukka and Nippers').split(/[+,&]/).map(x => x.trim()).filter(Boolean)) {
      const k = KINDS.find(([re]) => re.test(part))
      // (a name that is none of the kinds: the enemy's unit name or army, as a whole word)
      if (k ? k[1](b, part) : part.length > 2 && new RegExp(`\\b${part.replace(/s$/i, '').replace(/[^\w ]/g, '')}`, 'i').test(b.name + ' ' + (b.army || '').replace(/-/g, ' '))) return true
    }
  }
  return false
}
