// THE BEAST PACK. A unit of Beast Keepers, each taking one to three Shadewood Hounds (+8 points each), Forest Cats (+6 points
// each) or Sylvan Boars (+11 points each), or one Bear of Lorne (+20 points), every Keeper in the pack the same kind.
// Keeper: M5 WS4 BS4 S3 T3 W1 I4 A1 Ld8, Regular Infantry, 25 x 25 mm, hand weapon and light armour; Elven Reflexes, Motley
// Crew, Move Through Cover, Run with the Pack, Skirmishers. The army data has the pack with no stat line; this module builds it
// from the Keeper and the four beasts' own entries (their profiles and rules), at load. The beasts are extra models of the unit
// (Motley Crew), each carrying the rules that are its own (`rules`, read by combat.js).
//
// One base size per unit in this game: the pack stands on the beasts' 25 x 50 mm (the majority of its models, as a Keeper
// takes one to three beasts); a Keeper alone would be 25 x 25 mm.
import { ARMIES } from '../data/armies.js'

// [army, pack entry, the beasts' entries] in this copy of the data
const WHERE = [['lornefolk-of-lorne-wood', 'lornefolk-beast-pack', ['deepwood-hounds', 'forest-cat', 'sylvan-boar', 'bear-of-lorne']]]
// per Keeper: the most of each kind, in the order of WHERE's beasts
const MOST = [3, 3, 3, 1]
// the beast's rules that are its own model's, not the Keeper's: weapon and model rules (the rest are the pack's)
const OWN = /^(Armour Bane|Furious Charge|Razor Tusks|Cleaving Blow|Armoured Hide|Fear)/
const KEEPER = { Name: 'Beast Keeper', M: '5', WS: '4', BS: '4', S: '3', T: '3', W: '1', I: '4', A: '1', Ld: '8' }

export const BEAST_PACK_ID = new Set(WHERE.map(w => w[1]))
// the per-model option names (the beasts' profile rows) and how many each Keeper may take
export const PACK_BEASTS = new Map()

for (const [army, packId, beastIds] of WHERE) {
  const units = ARMIES[army]?.units
  const pack = units?.find(u => u.id === packId)
  if (!pack) continue
  const beasts = beastIds.map(id => units.find(u => u.id === id) || Object.values(ARMIES).flatMap(a => a.units).find(u => u.id === id))
  if (beasts.some(b => !b?.profile?.length)) continue
  const rows = beasts.map((b, i) => {
    const row = { ...b.profile[0] }
    row.rules = (b.specialRules || []).map(r => r.name || r).filter(r => OWN.test(r))
    PACK_BEASTS.set(row.Name, { most: MOST[i], points: b.points })
    return row
  })
  pack.profile = [{ ...KEEPER }, ...rows]
  pack.troopType = ['Regular Infantry']
  pack.base = { model: [25, 50] }
  pack.equipment = [{ name: 'Hand weapons', points: 0, perModel: true, active: true }]
  pack.armor = [{ name: 'Light armour', points: 0, perModel: true, active: true }]
  pack.options = [...rows.map(r => ({ name: r.Name, points: PACK_BEASTS.get(r.Name).points, perModel: true, minimum: 0, maximum: 0, stackable: true })),
    ...pack.options.filter(o => !rows.some(r => r.Name === o.name))]
  pack.specialRules = (pack.builderSpecialRules || []).map(name => ({ name }))
  pack.equipmentText = 'Beast Keepers: Hand weapon and light armour\nBeasts: Hand weapons (claws, fangs, tusks, teeth)'
}

// The pack's own check: one kind of beast, one to three of it for each Keeper (a Bear: exactly one each).
export function beastPackProblems (entry, sel) {
  if (!BEAST_PACK_ID.has(entry.id)) return []
  const taken = Object.entries(sel.counts || {}).map(([i, n]) => ({ name: entry.options[i]?.name, n })).filter(x => x.n && PACK_BEASTS.has(x.name))
  const keepers = sel.count
  if (taken.length === 0) return [`${entry.name}: each Beast Keeper must take beasts`]
  if (taken.length > 1) return [`${entry.name}: one kind of beast only, not ${taken.map(x => x.name).join(' and ')}`]
  const [{ name, n }] = taken
  const most = PACK_BEASTS.get(name).most
  if (n < keepers) return [`${entry.name}: ${keepers} Beast Keepers need at least ${keepers} ${name}${keepers === 1 ? '' : 's'} (one each)`]
  if (n > keepers * most) return [`${entry.name}: at most ${most} ${name}${most === 1 ? '' : 's'} for each Beast Keeper, so ${keepers * most}`]
  return []
}

// Run with the Pack: the unit may use the Movement of the majority of its models — the M held by more than half of its living models, else null (then the slowest, as any unit).
export function packMovement (models) {
  const ms = models.filter(m => m.wounds > 0 && typeof m.profile.M === 'number').map(m => m.profile.M)
  const tally = new Map()
  for (const m of ms) tally.set(m, (tally.get(m) || 0) + 1)
  for (const [m, n] of tally) if (n * 2 > ms.length) return m
  return null
}
