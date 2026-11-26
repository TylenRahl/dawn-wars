// The army list builder: pick an army and a points limit, add units, set their size, weapons,
// armour, mount, options and command, and save. Lists live in localStorage under LIST_KEY; the
// default lists (src/rules/defaultLists.js) are always offered as well. Exports showLists(), savedLists(),
// allLists() and LIST_KEY, used by src/main.js and the battle setup (ui/setup.js).
//
// THE LAYOUT. A top bar with the
// points; on the left the army's categories, each with the units taken and an add button per entry;
// in the middle ONE unit at a time, its choices grouped under headings; on the right the checks.
// The styles are in builder.css.

import { statsBlock, fieldedFor } from './unitStats.js'
import { PLAYABLE, ARMY_NAMES, armyEntries, findEntry, newUnit, unitCost, checkList, itemChoices, whirlersAllowed, WHIRLER_POINTS, canBeRegiment, detachmentChoices, nextKey, isWizardSel, optionOffered, loresFor, champItemChoices, compositionFor } from '../rules/roster.js'
import { DEFAULT_LISTS, MORE_LISTS } from '../rules/defaultLists.js'
import { IMPLEMENTED_LORES } from '../rules/spells.js'
import { isPlayableMountName } from '../rules/mounts.js'
import { spriteKey } from '../view/spriteMap.js'
import { itemText } from '../data/itemText.js'

export const LIST_KEY = 'dw-army-lists'

export function savedLists () {
  try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]') } catch { return [] }
}
function storeLists (lists) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(lists)) } catch {}
}
export function allLists () {
  return [...DEFAULT_LISTS, ...MORE_LISTS, ...savedLists()]
}

const CAT_NAMES = { characters: 'Characters', core: 'Core', special: 'Special', rare: 'Rare', mercenaries: 'Mercenaries' }
const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props)
  for (const k of kids) e.append(k)
  return e
}

// the unit pictures (the battle's own manifest, view/board.js), loaded once
let manifest = null
let manifestLoad = null
function loadManifest (then) {
  if (manifest || manifestLoad) return
  manifestLoad = fetch('/dw/images/manifest.json').then(r => r.json()).then(m => { manifest = m; then() }).catch(() => {})
}

export function showLists ({ onBack }) {
  const host = document.getElementById('lists')
  host.hidden = false
  let list = { name: 'New army', army: PLAYABLE[0], points: 2000, units: [] }
  let sel = -1            // the unit shown in the middle (an index into list.units)
  let loadOpen = false    // the Load menu under the top bar
  let boardOpen = false   // the middle shows the whole list stood on a table instead of one unit

  function render () {
    loadManifest(render)
    if (sel >= list.units.length) sel = list.units.length - 1
    const check = checkList(list)
    // every render rebuilds the page: keep the left column where it was scrolled to (otherwise adding
    // a unit would throw the sidebar back to the top)
    const sideScroll = host.querySelector('.sidebar')?.scrollTop || 0
    host.replaceChildren()
    const wrap = el('div', { className: 'dw-builder' })
    wrap.append(topBar(check))
    if (loadOpen) wrap.append(loadMenu())
    // (with the Board on the Checks column is dropped, so the table gets its width)
    const body = el('div', { className: 'builder-body' + (boardOpen ? ' board-on' : '') })
    body.append(sidebar(check), boardOpen ? boardPanel() : mainPanel(check))
    if (!boardOpen) body.append(checksPanel(check))
    wrap.append(body)
    host.append(wrap)
    body.querySelector('.sidebar').scrollTop = sideScroll
  }

  // ---- the top bar: the list's name, army, points used of the limit, Load / Save / Back
  function topBar (check) {
    const bar = el('div', { className: 'top-bar' })
    bar.append(el('div', { className: 'top-bar-title', textContent: 'Army Lists' }))
    const name = el('input', { className: 'list-name', value: list.name, size: 18, title: 'The list\'s name (Save keeps it under this name)' })
    name.oninput = () => { list.name = name.value }
    const army = el('select', { className: 'list-army' })
    for (const a of PLAYABLE) army.append(el('option', { value: a, textContent: ARMY_NAMES[a], selected: a === list.army }))
    army.onchange = () => { list = { ...list, army: army.value, units: [] }; sel = -1; render() }
    bar.append(name, army)
    const over = check.total > list.points
    const pts = el('input', { className: 'points-limit', type: 'number', value: list.points, min: 500, step: 250, title: 'The points limit' })
    pts.onchange = () => { list.points = +pts.value || 2000; render() }
    const pct = Math.min(100, Math.round(100 * check.total / (list.points || 1)))
    bar.append(el('div', { className: 'points-display' },
      el('div', {},
        el('span', { className: 'points-used' + (over ? ' over' : ''), textContent: String(check.total) }),
        el('span', { className: 'points-total' }, ' / ', pts, ' pts'),
        el('div', { className: 'points-bar-wrap' }, el('div', { className: 'points-bar' + (over ? ' over' : ''), style: `width:${pct}%` })))))
    const load = el('button', { className: 'validate-btn' + (loadOpen ? ' on' : ''), textContent: 'Load' })
    load.onclick = () => { loadOpen = !loadOpen; render() }
    const board = el('button', { className: 'validate-btn' + (boardOpen ? ' on' : ''), textContent: 'Board', title: 'Every unit in the list stood on a table' })
    board.onclick = () => { boardOpen = !boardOpen; render() }
    const save = el('button', { className: 'validate-btn go', textContent: 'Save' })
    save.onclick = () => {
      const lists = savedLists().filter(l => l.name !== list.name)
      lists.push(structuredClone({ ...list, saved: true }))
      storeLists(lists)
      render()
    }
    const back = el('button', { className: 'validate-btn', textContent: 'Back' })
    back.onclick = () => { host.hidden = true; onBack() }
    bar.append(board, load, save, back)
    return bar
  }

  // ---- the Load menu: every default and saved list; a saved one can be deleted
  function loadMenu () {
    const saved = el('div', { className: 'saved load-menu' })
    for (const l of allLists()) {
      const b = el('button', { textContent: `${l.name} (${ARMY_NAMES[l.army]}, ${l.points})` })
      b.onclick = () => { list = structuredClone(l); delete list.saved; delete list.builtIn; sel = list.units.length ? 0 : -1; loadOpen = false; render() }
      saved.append(b)
      if (l.saved) {
        const del = el('button', { textContent: '✕', title: 'Delete this saved list' })
        del.onclick = () => { storeLists(savedLists().filter(x => x.name !== l.name)); render() }
        saved.append(del)
      }
    }
    return saved
  }

  // ---- the left column: a heading per category with its share of the points, the units taken
  // (green edge legal, red edge with a problem), then a button per entry to add one
  function sidebar (check) {
    const side = el('div', { className: 'sidebar entry-list' })
    const entries = armyEntries(list.army)
    const comp = compositionFor(list.army)
    for (const cat of Object.keys(CAT_NAMES)) {
      const of = entries.filter(e => e.category === cat)
      if (!of.length) continue
      const sec = el('div', { className: 'sidebar-section' })
      const p = check.byCat[cat] || 0
      const rule = comp[cat] || {}
      const limit = rule.max != null ? `up to ${Math.round(rule.max * 100)}%` : rule.min != null ? `at least ${Math.round(rule.min * 100)}%` : ''
      const bad = (rule.max != null && p > rule.max * list.points) || (rule.min != null && p < rule.min * list.points)
      sec.append(el('div', { className: 'sidebar-heading' + (bad ? ' bad' : '') }, el('span', { textContent: `${CAT_NAMES[cat]} · ${p} pts${limit ? ' · ' + limit : ''}` })))
      list.units.forEach((u, i) => {
        const e = findEntry(list.army, u.entryId)
        if (e.category !== cat) return
        const mine = unitProblems(check, e)
        const row = el('div', { className: `sidebar-slot ${mine.length ? 'invalid' : 'valid'}${i === sel ? ' active' : ''}${u.detachmentOf ? ' detachment' : ''}`, title: mine.join('\n') })
        row.onclick = () => { sel = i; render() }
        const rm = el('button', { className: 'slot-remove', textContent: '✕', title: 'Remove' })
        rm.onclick = ev => { ev.stopPropagation(); removeUnit(i) }
        row.append(el('span', { className: 'slot-name', textContent: (u.detachmentOf ? '↳ ' : '') + e.name }),
          el('span', { className: 'slot-badge', textContent: String(u.count) }),
          el('span', { className: 'slot-pts', textContent: String(unitCost(e, u).total) }), rm)
        sec.append(row)
      })
      for (const e of of) {
        const b = el('button', { className: 'add-slot-btn' }, el('span', { textContent: '+ ' + e.name }), el('span', { textContent: `${e.points}`, className: 'pts' }))
        b.onclick = () => { list.units.push(newUnit(e)); sel = list.units.length - 1; render() }
        sec.append(b)
      }
      side.append(sec)
    }
    return side
  }

  function removeUnit (i) {
    // removing a regiment removes its detachments too
    const k = list.units[i].key
    list.units.splice(i, 1)
    if (k) list.units = list.units.filter(x => x.detachmentOf !== k)
    if (sel >= i) sel = Math.max(list.units.length ? 0 : -1, sel - 1)
    render()
  }

  // the list's problems that name this entry (checkList words each one "<entry name>: ...")
  const unitProblems = (check, e) => check.problems.filter(p => p.startsWith(e.name + ':') || p.startsWith(e.name + ' '))

  // ---- the right column: the army composition by category, then every problem checkList found
  function checksPanel (check) {
    const panel = el('div', { className: 'checks-panel' })
    panel.append(el('div', { className: 'val-title', textContent: 'Checks' }),
      el('div', { className: 'val-source', textContent: 'Grand Host composition and the army list rules' }))
    const item = (pass, text) => el('div', { className: `val-item ${pass ? 'pass' : 'fail'}` }, el('span', { className: `val-icon ${pass ? 'pass' : 'fail'}`, textContent: pass ? '✓' : '✕' }), el('span', { className: 'val-text', textContent: text }))
    panel.append(item(check.total <= list.points, `${check.total} of ${list.points} points`))
    const comp = compositionFor(list.army)
    for (const [cat, rule] of Object.entries(comp)) {
      const p = check.byCat[cat] || 0
      if (rule.max != null) panel.append(item(p <= rule.max * list.points, `${CAT_NAMES[cat]}: ${p} points, up to ${Math.round(rule.max * 100)}% (${Math.floor(rule.max * list.points)})`))
      if (rule.min != null) panel.append(item(p >= rule.min * list.points, `${CAT_NAMES[cat]}: ${p} points, at least ${Math.round(rule.min * 100)}% (${Math.ceil(rule.min * list.points)})`))
    }
    // (the points and percentage problems are already the rows above)
    const others = check.problems.filter(p => !/is over the .*-point limit$/.test(p) && !/^(characters|core|special|rare|mercenaries): \d+ points is (over|under) /.test(p))
    for (const p of others) panel.append(item(false, p))
    panel.append(el('div', { className: check.problems.length ? 'problems' : 'ok', textContent: check.problems.length ? `${check.problems.length} problem${check.problems.length === 1 ? '' : 's'}` : 'A legal army.' }))
    return panel
  }

  // ---- the middle, with Board on: the whole list stood on a table, a column per category, each
  // unit's models drawn with the battle's own pictures. Clicking a unit opens it.
  function boardPanel () {
    const main = el('div', { className: 'main-panel board-panel' })
    const table = el('div', { className: 'dw-board' })
    const cats = Object.keys(CAT_NAMES).filter(c => list.units.some(u => findEntry(list.army, u.entryId)?.category === c))
    table.style.gridTemplateColumns = `repeat(${Math.max(cats.length, 1)}, 1fr)`
    for (const cat of cats) {
      const units = el('div', { className: 'board-col-units' })
      const col = el('div', { className: 'board-col' }, el('div', { className: 'board-col-head', textContent: CAT_NAMES[cat] }), units)
      list.units.forEach((u, i) => {
        const e = findEntry(list.army, u.entryId)
        if (e?.category !== cat) return
        const fielded = fieldedFor(list.army, u)
        const models = el('div', { className: 'board-models' })
        const all = fielded ? fielded.models : []
        for (const m of all.slice(0, 30)) {
          const k = manifest && spriteKey(fielded, m, manifest)
          if (!k) { models.append(el('span', { className: 'board-base', textContent: (m.name || e.name)[0] })); continue }
          // a bigger base stands taller: 30px for a 25mm base, a monster up to 84px
          const mm = Math.max(...(manifest[k].baseMm || [25, 25]))
          models.append(el('img', { src: `/dw/images/${manifest[k].file}`, alt: m.name, title: m.name, style: `height:${Math.min(84, Math.round(30 * mm / 25))}px` }))
        }
        const g = el('div', { className: 'board-unit' + (i === sel ? ' active' : ''), title: e.name },
          models, el('span', { className: 'board-tag', textContent: `${e.name}${all.length > 1 ? ' ×' + all.length : ''} · ${unitCost(e, u).total}` }))
        g.onclick = () => { sel = i; boardOpen = false; render() }
        units.append(g)
      })
      table.append(col)
    }
    if (!cats.length) table.append(el('div', { className: 'empty-text board-empty', textContent: 'Nothing on the table yet: add a unit from the left' }))
    main.append(table)
    return main
  }

  // ---- the middle: the one selected unit
  function mainPanel (check) {
    const main = el('div', { className: 'main-panel' })
    if (sel < 0 || !list.units[sel]) {
      main.append(el('div', { className: 'empty-state' }, el('div', { className: 'empty-text', textContent: list.units.length ? 'Pick a unit on the left' : 'Add a unit from the left' })))
      return main
    }
    main.append(unitPanel(list.units[sel], sel, check))
    return main
  }

  function unitPanel (u, i, check) {
    const e = findEntry(list.army, u.entryId)
    const panel = el('div', { className: 'unit-row' })
    const cost = unitCost(e, u)
    const reg = u.detachmentOf ? list.units.find(x => x.key === u.detachmentOf) : null
    const mine = unitProblems(check, e)
    const del = el('button', { className: 'remove-unit-btn', textContent: 'Remove' })
    del.onclick = () => removeUnit(i)
    panel.append(el('header', { className: 'panel-header' },
      el('div', {},
        el('b', { className: 'panel-title', textContent: e.name }),
        el('div', { className: 'panel-subtitle', textContent: [CAT_NAMES[e.category], reg ? `detachment of ${findEntry(list.army, reg.entryId).name}` : ''].filter(Boolean).join(' · ') }),
        ...mine.map(p => el('div', { className: 'panel-problem', textContent: p }))),
      del))
    const section = (name) => { const s = el('div', { className: 'dw-section' }); s.append(el('div', { className: 'section-label', textContent: name })); return s }
    const add = (s) => { if (s.children.length > 1) panel.append(s) }
    const field = (label, ...kids) => el('label', { className: 'roster-field' }, el('span', { textContent: label }), ...kids)

    // the unit's size: a stepper, the number typed in the middle
    const sizeS = section('Size')
    if (!(e.category === 'characters' || e.unitSize === '1')) {
      const min = u.detachmentOf ? 5 : (e.minimum || 1)
      const set = n => { u.count = Math.max(1, n || 1); render() }
      const minus = el('button', { className: 'qty-btn', textContent: '−', disabled: u.count <= min, title: u.count <= min ? `at least ${min}` : '' })
      minus.onclick = () => set(u.count - 1)
      const plus = el('button', { className: 'qty-btn', textContent: '+', disabled: !!e.maximum && u.count >= e.maximum, title: e.maximum && u.count >= e.maximum ? `at most ${e.maximum}` : '' })
      plus.onclick = () => set(u.count + 1)
      const val = el('input', { className: 'qty-val unit-count', type: 'number', value: u.count, min })
      val.onchange = () => set(+val.value)
      sizeS.append(el('div', { className: 'roster-field' }, el('span', { textContent: 'Models' }), el('div', { className: 'qty-control' }, minus, val, plus), el('span', { className: 'roster-note', textContent: `${min}${e.maximum ? ' to ' + e.maximum : ' or more'}` })))
    }
    add(sizeS)

    // its stat lines, saves and weapons, as they stand with the choices below (ui/unitStats.js), and its pictures
    const fielded = fieldedFor(list.army, u)
    const statsS = section('Profile')
    statsS.append(statsBlock(fielded))
    if (manifest && fielded) {
      const seen = new Set()
      const pics = el('div', { className: 'dw-pics' })
      for (const m of fielded.models) {
        const k = spriteKey(fielded, m, manifest)
        if (!k || seen.has(k) || seen.size >= 6) continue
        seen.add(k)
        pics.append(el('img', { src: `/dw/images/${manifest[k].file}`, alt: m.name, title: m.name + (m.role && m.role !== 'rank' ? ` (${m.role})` : '') }))
      }
      if (seen.size) statsS.append(pics)
    }
    add(statsS)

    // its special rules (Aquatic, Cold Blooded...), as the battle's unit card lists them (ui/battle.js)
    const rules = fielded ? [...fielded.special] : (e.specialRules || []).map(r => (r.name || r).replace(/\*+$/, ''))
    const rulesS = section('Special rules')
    if (rules.length) rulesS.append(el('div', { className: 'special-rules' }, ...rules.map(r => el('span', { className: 'rule-chip', textContent: r }))))
    add(rulesS)

    const pick = (into, label, key, opts) => {
      const optional = key === 'armor' && opts.length && !opts.some(o => o.active)
      if (!opts.length || (opts.length === 1 && !optional)) return
      const s = el('select')
      if (optional) s.append(el('option', { value: -1, textContent: 'None', selected: u[key] == null }))
      opts.forEach((o, j) => s.append(el('option', { value: j, textContent: `${o.name}${o.points ? ` (+${o.points}${o.perModel ? '/model' : ''})` : ''}${key === 'mount' && !isPlayableMountName(o.name) && !(e.profile || []).some(r => r.Name === o.name) ? ' (not playable yet)' : ''}`, selected: u[key] === j })))
      s.onchange = () => { u[key] = +s.value < 0 ? null : +s.value; render() }
      into.append(field(label, s))
    }
    const tick = (into, key, opts) => opts.forEach((o, j) => {
      if (o.hidden) return
      if (o.needs && !u[key].some(x => opts[x]?.name === o.needs)) return
      const c = el('input', { type: 'checkbox', checked: u[key].includes(j) })
      c.onchange = () => {
        u[key] = c.checked ? [...u[key], j] : u[key].filter(x => x !== j)
        // an 'exclusive' option replaces the one ticked before it (one Order, one specialism)
        if (c.checked && o.exclusive) u[key] = u[key].filter(x => x === j || !opts[x]?.exclusive || (opts[x].group || '') !== (o.group || ''))
        // (an option that needs another goes when that one is unticked: a Noble Outlaw's handgun)
        if (!c.checked) u[key] = u[key].filter(x => opts[x]?.needs !== o.name)
        render()
      }
      into.append(el('label', { className: 'tick' }, c, ` ${o.name}`, o.points ? el('span', { className: 'pts', textContent: ` +${o.points}${o.perModel ? '/model' : ''}` }) : ''))
    })

    // weapons, armour and mount
    const gearS = section('Wargear')
    pick(gearS, 'Weapons', 'equipment', e.equipment)
    pick(gearS, 'Armour', 'armor', e.armor)
    pick(gearS, 'Mount', 'mount', e.mounts)
    add(gearS)

    // the command group (General, Battle Standard Bearer; champion, standard, musician)
    const cmdS = section('Command')
    if (!u.detachmentOf) tick(cmdS, 'command', e.command)
    add(cmdS)

    // a Wizard's level, its lore, a second lore with an Arcane Familiar, a Sorcerous Ruse
    const magicS = section('Wizard')
    e.options.forEach((o, i) => {
      if (!o.options || !u.options.includes(i)) return
      const s = el('select')
      o.options.forEach((x, j) => s.append(el('option', { value: j, textContent: `${x.name}${x.points ? ` (+${x.points})` : ''}`, selected: (u.optionSub?.[i] ?? 0) === j })))
      s.onchange = () => { u.optionSub = { ...(u.optionSub || {}), [i]: +s.value }; render() }
      magicS.append(field(o.name, s))
    })
    const lores = loresFor(e, u)
    if (lores.length) {
      if (!u.lore || !lores.includes(u.lore)) u.lore = lores[0]
      const s = el('select')
      for (const l of lores) s.append(el('option', { value: l, textContent: l.replace(/-/g, ' ') + (IMPLEMENTED_LORES.includes(l) ? '' : ' (not playable yet)'), selected: u.lore === l }))
      s.onchange = () => { u.lore = s.value; render() }
      magicS.append(field('Lore', s))
      // an Arcane Familiar: spells from a second lore
      if ((u.items || []).includes('arcane-familiar')) {
        const s2 = el('select')
        for (const l of lores.filter(l => l !== u.lore)) s2.append(el('option', { value: l, textContent: l.replace(/-/g, ' ') + (IMPLEMENTED_LORES.includes(l) ? '' : ' (not playable yet)'), selected: u.lore2 === l }))
        if (!u.lore2 || u.lore2 === u.lore) u.lore2 = lores.find(l => l !== u.lore) || null
        s2.onchange = () => { u.lore2 = s2.value; render() }
        magicS.append(field('Second lore (Arcane Familiar)', s2))
      }
    }
    // Sorcerous Ruses (an optional rule): 0-1 per Wizard, +25 points
    if (isWizardSel(e, u) || u.ruse) {
      const c = el('input', { type: 'checkbox', checked: !!u.ruse })
      c.onchange = () => { u.ruse = c.checked; render() }
      magicS.append(el('label', { className: 'tick', title: 'Optional Eight Threads rule: a roll on the Sorcerous Ruses table before the battle' }, c, ' Sorcerous Ruse', el('span', { className: 'pts', textContent: ' +25' })))
    }

    // the unit's other options; 'Detachment' is not playable yet (see armyEntries in roster.js)
    const optS = section('Options')
    tick(optS, 'options', e.options.map(o => o.name === 'Detachment' || o.stackable || !optionOffered(list.army, o) ? { ...o, hidden: true } : o))
    // Gloom Nipper Whirlers hidden in the mob
    if (e.id === 'gloom-nipper-mob') {
      const max = whirlersAllowed(e, u)
      const s = el('select')
      for (let k = 0; k <= Math.max(max, u.whirlers || 0); k++) s.append(el('option', { value: k, textContent: `${k}${k ? ` (+${k * WHIRLER_POINTS})` : ''}${k > max ? ' — too many' : ''}`, selected: (u.whirlers || 0) === k }))
      s.onchange = () => { u.whirlers = +s.value; render() }
      optS.append(field('Whirlers (one per 10, up to 3)', s))
    }
    // All Sneaky Like: with Titch in the list, 0-1 Wolf Rider Mob may have Ambushers
    if ((e.id === 'nipper-wolf-rider-mob' && list.units.some(x => x.entryId === 'titch-toothnicker')) || u.ambushers) {
      const c = el('input', { type: 'checkbox', checked: !!u.ambushers })
      c.onchange = () => { u.ambushers = c.checked; render() }
      optS.append(el('label', { className: 'tick', title: "Titch's All Sneaky Like: held in reserve, arriving from a table edge" }, c, ' Ambushers (All Sneaky Like, free)'))
    }
    // per-model options (Motley Crew weapons, Gobbler Minders): how many models take each, as a stepper
    e.options.forEach((o, i) => {
      if (!o.stackable) return
      u.counts = u.counts || {}
      const min = o.minimum || 0
      const v = u.counts[i] ?? 0
      const set = n => { u.counts[i] = Math.max(min, n || 0); render() }
      const minus = el('button', { className: 'qty-btn', textContent: '−', disabled: v <= min })
      minus.onclick = () => set(v - 1)
      const plus = el('button', { className: 'qty-btn', textContent: '+' })
      plus.onclick = () => set(v + 1)
      const val = el('input', { className: 'qty-val', type: 'number', value: v, min })
      val.onchange = () => set(+val.value)
      optS.append(el('div', { className: 'model-row' }, el('span', { className: 'model-row-name', textContent: o.name }), el('div', { className: 'qty-control' }, minus, val, plus), el('span', { className: 'model-row-pts', textContent: `+${o.points} each` })))
    })
    add(optS)
    add(magicS)

    // magic items, then the champion's
    const itemsS = section('Magic items')
    itemsS.append(itemsLine(e, u, 'items', choices => itemChoices(list.army, e, u), 'Add a magic item…'))
    itemsS.append(itemsLine(e, u, 'champItems', () => champItemChoices(list.army, e, u), 'Add a champion\'s item…', "Champion's items:"))
    if ([...itemsS.querySelectorAll('select')].length) panel.append(itemsS)

    // a regimental unit may take up to two detachments
    if (canBeRegiment(e) && !u.detachmentOf) {
      const detS = section('Detachments')
      const have = list.units.filter(x => u.key && x.detachmentOf === u.key).length
      const s = el('select')
      s.append(el('option', { value: '', textContent: have >= 2 ? 'Two detachments (the most)' : `Add a detachment (${have} of 2)…` }))
      if (have < 2) for (const d of detachmentChoices(list.army)) s.append(el('option', { value: d.id, textContent: `${d.name} (${d.points}/model, 5 to ${Math.floor(u.count / 2)})` }))
      s.onchange = () => {
        if (!s.value) return
        if (!u.key) u.key = nextKey(list)
        const d = newUnit(findEntry(list.army, s.value))
        d.count = 5
        d.command = []
        d.detachmentOf = u.key
        const after = i + 1 + list.units.slice(i + 1).findIndex(x => x.detachmentOf !== u.key)
        list.units.splice(after <= i ? list.units.length : after, 0, d)
        render()
      }
      detS.append(el('div', { className: 'choices' }, s))
      panel.append(detS)
    }

    panel.append(el('div', { className: 'roster-cost' }, el('span', { className: 'roster-cost-label', textContent: 'Unit total' }), el('span', { className: 'roster-cost-pts pts', textContent: `${cost.total} pts` })))
    return panel
  }

  // Magic items: the ones taken (click ✕ to drop one), and a menu of the rest by category. An
  // item the unit cannot take says why; one whose rules are not in the game yet says so.
  const TYPE_NAMES = { weapon: 'Magic weapons', armor: 'Magic armour', talisman: 'Talismans', 'enchanted-item': 'Enchanted items', 'arcane-item': 'Arcane items', banner: 'Magic standards', 'knightly-virtue': 'Knightly Virtues', 'weapon-runes': 'Weapon runes', 'ranged-weapon-runes': "Engineers' weapon runes", 'armor-runes': 'Armour runes', 'talismanic-runes': 'Talismanic runes', 'banner-runes': 'Standard runes', 'engineering-runes': 'Engineering runes', 'runic-tattoos': 'Runic tattoos', 'gift-of-dominion': 'Gifts of Dominion', 'chaotic-trait': 'Chaotic Traits', 'dominion-mutation': 'Dominion Mutations', 'big-name': 'Big Names', 'elven-honour': 'Elven Honours', 'forest-spite': 'Forest Spites', 'gift-of-the-bloodied-god': 'Gifts of the Bloodied God', 'forbidden-poison': 'Forbidden Poisons', 'vampiric-power': 'Vampiric Powers', 'incantation-scroll': 'Incantation Scrolls', 'discipline-makers': 'Disciplines of the Makers', 'unmade-gift': 'Unmade Gifts' }
  // (key 'items' for the unit's own, 'champItems' for its champion's: rules/roster.js itemChoices, champItemChoices)
  function itemsLine (e, u, key, choicesOf, prompt, label = '') {
    u[key] = u[key] || []
    const choices = choicesOf()
    const line = el('div', { className: 'choices items' + (key === 'champItems' ? ' champ' : '') })
    if (!choices.length && !u[key].length) return line
    if (label) line.append(el('span', { textContent: label }))
    u[key].forEach((id, k) => {
      const c = choices.find(x => x.id === id)
      const x = el('button', { textContent: `${c?.item.name || id} (${c?.item.points ?? '?'}) ✕`, title: itemText(id, c?.item) })
      x.onclick = () => { u[key].splice(k, 1); render() }
      line.append(x)
    })
    const s = el('select')
    s.append(el('option', { value: '', textContent: prompt }))
    for (const [type, name] of Object.entries(TYPE_NAMES)) {
      const of = choices.filter(c => c.item.type === type)
      if (!of.length) continue
      const g = el('optgroup', { label: name })
      for (const c of of.sort((a, b) => b.item.points - a.item.points)) g.append(el('option', { value: c.id, disabled: !!c.why, textContent: `${c.item.name} (${c.item.points})${c.item.extremelyCommon || c.item.duplicable ? ' *' : ''}${c.why ? ` — ${c.why}` : ''}`, title: itemText(c.id, c.item) }))
      s.append(g)
    }
    s.onchange = () => { if (s.value) { u[key].push(s.value); render() } }
    line.append(s)
    return line
  }

  render()
}
