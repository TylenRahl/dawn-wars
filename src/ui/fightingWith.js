// The stats panel's "Fighting with" line: the combat weapon(s) a unit with more than one chose for this turn's fight.
// Exports fightingWith(game, u), used by ui/battle.js. Shows what the engine recorded; decides nothing.
import { combatWeaponChoices, weaponChosenThisTurn } from '../rules/weaponChoice.js'

// '' when no choice is current (none made, or made in an earlier turn: weaponChosenThisTurn), else e.g. 'Great weapon'
// or, for a Motley Crew, 'Great weapons: Great weapon; Additional hand weapons: Hand weapon'.
export function fightingWith (game, u) {
  if (!u || !weaponChosenThisTurn(game, u)) return ''
  const wc = u.status.weaponChoice
  const charged = !!u.status?.charged && !u.status?.hesitated
  const nameOf = (id, kit) => combatWeaponChoices(u, { charged, kit }).find(o => o.id === id)?.name || id
  const parts = []
  if (wc.unit) parts.push(nameOf(wc.unit, null))
  for (const [kit, id] of Object.entries(wc.kits || {})) if (id) parts.push(`${kit}: ${nameOf(id, kit)}`)
  return parts.join('; ')
}
