// THE MAP EDITOR, the script behind map-editor.html. Exports nothing.
// The table and the terrain are the game's own board (view/board.js) over a stand-in game that holds only terrain, so a
// map looks here exactly as it will in battle. What a map IS — pieces, their outlines, the advice — is
// rules/customMaps.js; the browser storage is ui/customMapsStore.js. This file is the screen and the mouse.
import { createBoard } from '../view/board.js'
import { TERRAIN_KINDS } from '../rules/terrain.js'
import { pointInPoly } from '../rules/geometry.js'
import { MAPS } from '../rules/maps.js'
import { MAP_KINDS, newPiece, polyOf, allPieces, featuresOf, checkMap, pieceFromFeature, validateRecord, newMapId, TABLE } from '../rules/customMaps.js'
import { loadCustomMaps, listCustomRecords, saveCustomRecord, deleteCustomRecord } from '../ui/customMapsStore.js'

const $ = id => document.getElementById(id)
// the colours the board fills each kind with (view/board.js drawTerrain), for the buttons' swatches
const SWATCH = { wood: '#2c3b22', hill: '#6b7a45', wall: '#8a8378', rocks: '#5a5650', marsh: '#3f4a32', stream: '#3f6f8a', building: '#6b4a32' }
const DEG = Math.PI / 180

loadCustomMaps()
const blank = () => ({ id: null, name: 'My map', points: 2000, mirror: true, pieces: [] })
let map = blank()
let sel = null // index into map.pieces
let tool = null // a kind being placed
let drag = null
let dirty = false

// the stand-in game the board draws: terrain only, the deployment zones shown
const game = { terrain: [], units: [], effects: [], phase: 'deploy', deploy: { zoneDepth: 12 }, active: 0, round: 0, listeners: new Set() }
const board = await createBoard($('stage'), game, {
  down (p) {
    if (tool) {
      const piece = newPiece(tool, snap(p))
      map.pieces.push(piece); sel = map.pieces.length - 1; tool = null; changed(); return
    }
    const hit = pieceAt(p)
    if (hit == null) { sel = null; draw(); return }
    sel = hit.i
    const at = hit.twin ? { x: TABLE.w - map.pieces[sel].at.x, y: TABLE.h - map.pieces[sel].at.y } : map.pieces[sel].at
    drag = { twin: hit.twin, off: { x: p.x - at.x, y: p.y - at.y }, moved: false }
    draw()
  },
  move (p) {
    $('at').textContent = `${p.x.toFixed(1)}", ${p.y.toFixed(1)}"`
    if (!drag || sel == null) return
    let q = snap({ x: p.x - drag.off.x, y: p.y - drag.off.y })
    if (drag.twin) q = { x: TABLE.w - q.x, y: TABLE.h - q.y }
    map.pieces[sel].at = q
    drag.moved = true
    changed(false)
  },
  up () { if (drag?.moved) changed(); drag = null },
  right () { tool = null; sel = null; draw() }
})

const snap = p => $('snap').checked ? { x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 } : { x: +p.x.toFixed(2), y: +p.y.toFixed(2) }
// the piece under table point p (the last drawn first); a twin answers for its original
function pieceAt (p) {
  for (let i = map.pieces.length - 1; i >= 0; i--) {
    if (pointInPoly(p, polyOf(map.pieces[i]))) return { i, twin: false }
    if (map.mirror && pointInPoly(p, polyOf({ ...map.pieces[i], at: { x: TABLE.w - map.pieces[i].at.x, y: TABLE.h - map.pieces[i].at.y }, a: map.pieces[i].a + Math.PI }))) return { i, twin: true }
  }
  return null
}

// ---- drawing ----
function draw () {
  game.terrain = featuresOf(map).map((f, i) => ({ id: `e${i}`, ...f }))
  const lines = []
  const outline = (poly, colour) => poly.forEach((q, k) => lines.push({ from: q, to: poly[(k + 1) % poly.length], colour }))
  if (sel != null && map.pieces[sel]) {
    const p = map.pieces[sel]
    outline(polyOf(p), 0xffd34a)
    if (map.mirror) outline(polyOf({ ...p, at: { x: TABLE.w - p.at.x, y: TABLE.h - p.at.y }, a: p.a + Math.PI }), 0xb89a40)
  }
  // the table's centre lines, faint
  lines.push({ from: { x: TABLE.w / 2, y: 0 }, to: { x: TABLE.w / 2, y: TABLE.h }, colour: 0x2a3424 }, { from: { x: 0, y: TABLE.h / 2 }, to: { x: TABLE.w, y: TABLE.h / 2 }, colour: 0x2a3424 })
  board.setLines(lines)
  board.setCircles([{ at: { x: TABLE.w / 2, y: TABLE.h / 2 }, r: 12, colour: 0xc0b080 }])
  panel()
}
function changed (full = true) { dirty = true; draw(); if (full) status('') }
const status = (t, bad = false) => { $('status').textContent = t; $('status').style.color = bad ? '#ff9a8a' : '#9fd08a' }

// ---- the side panel ----
function panel () {
  $('name').value = map.name
  $('points').value = String(map.points)
  $('mirror').checked = map.mirror
  $('hint').textContent = tool ? `Click the table to place a ${TERRAIN_KINDS[tool].name.toLowerCase()} (right-click: cancel).` : sel != null ? 'Drag to move. Q / E turn, [ / ] width, - / = depth, Delete removes.' : 'Pick a kind of terrain, then click the table to place it.'
  for (const b of $('kinds').children) b.classList.toggle('on', b.dataset.kind === tool)
  const box = $('selected')
  if (sel == null || !map.pieces[sel]) { box.textContent = 'Nothing selected. Click a piece on the table.' } else {
    const p = map.pieces[sel]
    const k = TERRAIN_KINDS[p.kind]
    const what = [k.impassable ? 'impassable' : '', k.dangerous ? 'dangerous' : '', k.difficult ? 'difficult terrain' : '', k.linear ? 'a low linear obstacle' : '', k.blocksSight === 'solid' ? 'blocks sight' : k.blocksSight ? 'no sight through it unless in it' : '', k.cover ? 'cover' : ''].filter(Boolean).join(', ') || 'open ground'
    box.innerHTML = ''
    const kind = document.createElement('select')
    for (const kk of MAP_KINDS) kind.append(new Option(TERRAIN_KINDS[kk].name, kk, false, kk === p.kind))
    kind.onchange = () => { p.kind = kind.value; changed() }
    const num = (v, step, fn) => { const i = document.createElement('input'); i.type = 'number'; i.step = step; i.value = v; i.onchange = () => { const n = +i.value; if (Number.isFinite(n)) { fn(n); changed() } }; return i }
    const g = document.createElement('div'); g.className = 'grid2'
    const row = (label, el) => { g.append(Object.assign(document.createElement('span'), { textContent: label }), el) }
    row('Kind', kind)
    row('Across (")', num(+p.w.toFixed(2), 0.5, n => { p.w = Math.max(0.3, n) }))
    row('Deep (")', num(+p.d.toFixed(2), 0.5, n => { p.d = Math.max(0.3, n) }))
    row('Turned (°)', num(Math.round((p.a || 0) / DEG), 15, n => { p.a = n * DEG }))
    row('Centre x (")', num(+p.at.x.toFixed(2), 0.5, n => { p.at.x = n }))
    row('Centre y (")', num(+p.at.y.toFixed(2), 0.5, n => { p.at.y = n }))
    box.append(g, Object.assign(document.createElement('div'), { className: 'keys', textContent: `In the game: ${what}.` }))
    const dup = Object.assign(document.createElement('button'), { textContent: 'Duplicate (D)', onclick: duplicate })
    const del = Object.assign(document.createElement('button'), { textContent: 'Delete (Del)', onclick: remove })
    box.append(dup, del)
  }
  const cs = checkMap(map)
  $('checks').replaceChildren(...(cs.length ? cs.map(c => Object.assign(document.createElement('div'), { className: c.level, textContent: c.text })) : [Object.assign(document.createElement('div'), { className: 'ok', textContent: 'Nothing to say: inside the table, no overlaps, clear of the centre.' })]))
  $('delete').disabled = !map.id
}

for (const k of MAP_KINDS) {
  const b = document.createElement('button')
  b.dataset.kind = k
  b.innerHTML = `<span class="sw" style="background:${SWATCH[k]}"></span>${TERRAIN_KINDS[k].name}`
  b.onclick = () => { tool = tool === k ? null : k; sel = null; draw() }
  $('kinds').append(b)
}
$('name').oninput = () => { map.name = $('name').value; dirty = true }
$('points').onchange = () => { map.points = +$('points').value; dirty = true }
$('mirror').onchange = () => { map.mirror = $('mirror').checked; changed() }

function duplicate () { if (sel == null) return; const p = map.pieces[sel]; map.pieces.push({ ...p, at: { x: p.at.x + 2, y: p.at.y + 2 }, shape: p.shape.map(q => ({ ...q })) }); sel = map.pieces.length - 1; changed() }
function remove () { if (sel == null) return; map.pieces.splice(sel, 1); sel = null; changed() }

window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
  if (e.key === 'Home') { board.home(); return }
  if (e.key === 'Escape') { tool = null; sel = null; draw(); return }
  if (sel == null) return
  const p = map.pieces[sel]
  const turn = (e.shiftKey ? 5 : 15) * DEG
  const k = e.key
  if (k === 'q' || k === 'Q') p.a = (p.a || 0) - turn
  else if (k === 'e' || k === 'E') p.a = (p.a || 0) + turn
  else if (k === '[') p.w = Math.max(0.5, p.w - 0.5)
  else if (k === ']') p.w += 0.5
  else if (k === '-') p.d = Math.max(0.3, p.d - 0.5)
  else if (k === '=' || k === '+') p.d += 0.5
  else if (k === 'ArrowLeft') p.at.x -= 0.5
  else if (k === 'ArrowRight') p.at.x += 0.5
  else if (k === 'ArrowUp') p.at.y -= 0.5
  else if (k === 'ArrowDown') p.at.y += 0.5
  else if (k === 'd' || k === 'D') return duplicate()
  else if (k === 'Delete' || k === 'Backspace') return remove()
  else return
  e.preventDefault()
  changed()
})

// ---- opening, saving ----
function fillOpen () {
  const o = $('open')
  o.replaceChildren(new Option('— open a map —', ''))
  const mine = listCustomRecords()
  if (mine.length) { const g = document.createElement('optgroup'); g.label = 'Your maps'; for (const r of mine) g.append(new Option(`${r.name} (${r.points} pts)`, 'mine:' + r.id)); o.append(g) }
  const g = document.createElement('optgroup'); g.label = 'The named maps (opened as a copy)'
  for (const m of Object.values(MAPS).filter(m => !m.custom)) g.append(new Option(`${m.name} (${m.points} pts)`, 'named:' + m.id))
  o.append(g)
}
$('open').onchange = () => {
  const v = $('open').value
  if (!v) return
  if (dirty && map.pieces.length && !confirm('Leave this map without saving it?')) { $('open').value = ''; return }
  if (v.startsWith('mine:')) { const r = listCustomRecords().find(x => x.id === v.slice(5)); if (r) map = structuredClone(r) }
  if (v.startsWith('named:')) {
    const m = MAPS[v.slice(6)]
    // (each feature as it stands; not mirrored, since the named maps already hold both twins)
    map = { id: null, name: `${m.name} (copy)`, points: m.points, mirror: false, pieces: m.features.map(pieceFromFeature) }
  }
  sel = null; tool = null; dirty = false; $('open').value = ''
  history.replaceState(null, '', map.id ? `?edit=${encodeURIComponent(map.id)}` : location.pathname)
  draw(); status(map.id ? `Opened ${map.name}.` : `Opened a copy of ${map.name}: Save keeps it as your map.`)
}
function save () {
  map.name = $('name').value.trim() || 'My map'
  if (!map.id) map.id = newMapId(map.name, [...listCustomRecords().map(r => r.id), ...Object.keys(MAPS)])
  const ok = saveCustomRecord(map)
  if (ok) { dirty = false; fillOpen(); history.replaceState(null, '', `?edit=${encodeURIComponent(map.id)}`); status(`Saved "${map.name}". Battle setup lists it under Battlefield.`) } else status('Could not save (is this a private window?).', true)
  panel()
  return ok
}
$('save').onclick = save
$('try').onclick = () => { if (save()) window.open(`./index.html?battle=default&map=${encodeURIComponent(map.id)}`, '_blank') }
$('new').onclick = () => { if (dirty && map.pieces.length && !confirm('Start a new map without saving this one?')) return; map = blank(); sel = null; tool = null; dirty = false; history.replaceState(null, '', location.pathname); draw(); status('') }
$('delete').onclick = () => { if (!map.id || !confirm(`Delete "${map.name}" from this browser?`)) return; deleteCustomRecord(map.id); map = blank(); sel = null; dirty = false; fillOpen(); history.replaceState(null, '', location.pathname); draw(); status('Deleted.') }
$('export').onclick = () => {
  const { record } = validateRecord({ ...map, id: map.id || newMapId(map.name) })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(record, null, 1)], { type: 'application/json' }))
  a.download = `${record.id}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
$('import').onclick = () => $('file').click()
$('file').onchange = async () => {
  const f = $('file').files[0]; $('file').value = ''
  if (!f) return
  try {
    const { record, error } = validateRecord(JSON.parse(await f.text()))
    if (!record) { status(`That file is not a map: ${error}.`, true); return }
    // (a map whose id is taken here comes in as a new map beside it)
    if (listCustomRecords().some(r => r.id === record.id)) record.id = newMapId(record.name, [...listCustomRecords().map(r => r.id), ...Object.keys(MAPS)])
    map = record; sel = null; dirty = true; draw(); status(`Imported "${record.name}": Save keeps it.`)
  } catch { status('That file could not be read as a map.', true) }
}
window.addEventListener('beforeunload', e => { if (dirty && map.pieces.length) e.preventDefault() })

fillOpen()
const editing = new URLSearchParams(location.search).get('edit')
const start = editing && listCustomRecords().find(r => r.id === editing)
if (start) map = structuredClone(start)
draw()
// the headless harness's hook
window.__editor = { get map () { return map }, board, screenAt: (x, y) => { const r = $('stage').querySelector('canvas').getBoundingClientRect(); const s = board.toScreen({ x, y }); return { x: r.left + s.x, y: r.top + s.y } } }
