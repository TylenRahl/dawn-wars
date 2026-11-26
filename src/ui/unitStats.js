// A unit's stat lines, Armour Roll and weapons, for display. Exports fieldedFor, unitSummary and statsBlock.
// Read from the same fielded unit the game plays with — fieldUnit, equip,
// saveFor, meleeWeaponOf, rangedWeaponsOf — so the builder shows exactly what the battle will use.
// Used by the army builder (ui/lists.js) and the battle's unit card (ui/battle.js).

import { fieldUnit } from '../rules/units.js'
import { equip, saveFor, meleeWeaponOf, rangedWeaponsOf } from '../rules/damage.js'

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); for (const k of kids) e.append(k); return e }
const KEYS = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'Ld']

// The fielded unit for a list selection (null when its entry has no stat line yet)
export function fieldedFor (armyId, sel) {
  try { const u = fieldUnit(armyId, sel, 0); equip(u); return u } catch { return null }
}

// "4+", or "–" for none (a 7+ save is no save)
const plus = v => v != null && v <= 6 ? `${Math.max(2, v)}+` : '–'
// AP as printed: "-1", or "–"
const ap = v => v ? String(v) : '–'

// { save, saveText, ward, regen, weapons: [{ name, range, S, AP, rules }] }
export function unitSummary (u) {
  const sv = saveFor(u)
  const weapons = []
  const m = meleeWeaponOf(u)
  if (m) weapons.push({ name: m.name, range: 'Combat', S: m.S ?? 'S', AP: m.AP && m.AP !== '-' ? m.AP : ap(m.ap), rules: (m.rules || []).join(', ') })
  // a lance (or the like) only counts on the charge
  const mc = meleeWeaponOf(u, { charged: true })
  if (mc && mc.name !== m?.name) weapons.push({ name: `${mc.name} (on the charge)`, range: 'Combat', S: mc.S ?? 'S', AP: mc.AP && mc.AP !== '-' ? mc.AP : ap(mc.ap), rules: (mc.rules || []).join(', ') })
  for (const w of rangedWeaponsOf(u)) weapons.push({ name: w.name.replace(/\s+Ranged$/i, ''), range: w.range ? `${w.range}"` : '–', S: w.S ?? '–', AP: ap(w.AP), rules: (w.rules || []).join(', ') })
  return { save: plus(sv.armour), saveText: sv.armourText, ward: sv.ward ? `${sv.ward}+` : null, wardText: sv.wardText, regen: sv.regen ? `${sv.regen}+` : null, weapons }
}

// The block: stat lines (each kind of model once, and its mount), the saves, the weapons
export function statsBlock (u) {
  const box = el('div', { className: 'unit-stats' })
  if (!u) { box.append(el('div', { className: 'us-note', textContent: 'No stat line in the game yet.' })); return box }
  const s = unitSummary(u)
  const t = el('table', { className: 'us-table' })
  const head = el('tr'); for (const k of ['', ...KEYS, 'Sv']) head.append(el('th', { textContent: k })); t.append(head)
  const seen = new Set()
  const rows = [...u.models.filter(m => m.wounds > 0), ...(u.mount ? [u.mount] : []), ...(u.crew || [])]
  rows.forEach((m, i) => {
    if (!m?.profile || seen.has(m.name)) return
    seen.add(m.name)
    const r = el('tr'); r.append(el('td', { className: 'us-name', textContent: m.name }))
    for (const k of KEYS) r.append(el('td', { textContent: m.profile[k] ?? '–' }))
    r.append(el('td', { className: 'us-sv', textContent: i === 0 ? s.save : '' }))
    t.append(r)
  })
  box.append(t)
  const saves = [`Armour Roll ${s.save}${s.saveText && s.saveText !== 'no armour' ? ` (${s.saveText})` : ''}`]
  if (s.ward) saves.push(`Untouchable save ${s.ward}${s.wardText ? ` (${s.wardText})` : ''}`)
  if (s.regen) saves.push(`Regeneration ${s.regen}`)
  box.append(el('div', { className: 'us-saves', textContent: saves.join(' · ') }))
  if (s.weapons.length) {
    const w = el('table', { className: 'us-weapons' })
    const wh = el('tr'); for (const k of ['Weapon', 'Range', 'S', 'AP', 'Rules']) wh.append(el('th', { textContent: k })); w.append(wh)
    for (const x of s.weapons) { const r = el('tr'); for (const v of [x.name, x.range, x.S, x.AP, x.rules || '–']) r.append(el('td', { textContent: v })); w.append(r) }
    box.append(w)
  }
  return box
}
