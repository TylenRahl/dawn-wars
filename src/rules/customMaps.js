// The player's own maps, without any screen: a map made in the map editor (src/mapEditor/mapEditor.js) is a list of pieces,
// and this file turns each into the same terrain feature the random terrain and the named maps make ({ kind, at,
// size, poly }, inches; terrain.js, maps.js), so every rule about terrain treats it the same. Also checks a map and
// validates a saved record. Used by the map store (ui/customMapsStore.js) and the editor.
//
// A piece: { kind, at: {x, y}, w, d, a, shape }. `w` by `d` inches, turned by `a` radians round `at`. `shape` is its
// outline in a unit box (-0.5 to 0.5 each way, before turning): drawn from the kind when a piece is placed, or taken
// from a named map's feature when one is opened to edit.
//
// Advice (checkMap), none of which stops a map being saved or played: the recommended set-up keeps every feature
// at least 12" from the centre; a feature is 2" to 8" across; about one feature for every 12" of the longest edge
// (six on a 72" table).

import { TERRAIN_KINDS } from './terrain.js'
import { pointInPoly, polysOverlap } from './geometry.js'

export const TABLE = { w: 72, h: 48 }
// the kinds a map may hold (a Hornstone is the Hornkin's own, placed with the army; a vortex is a spell's)
export const MAP_KINDS = ['wood', 'hill', 'wall', 'rocks', 'marsh', 'stream', 'building']
// a new piece's size, inches across by deep
export const NEW_SIZE = { wood: [7, 6], hill: [8, 6], wall: [6, 0.5], rocks: [4.5, 4], marsh: [6, 5], stream: [10, 1.5], building: [5, 3.5] }
const WOB = [1, 0.92, 1.06, 0.97, 1.1, 0.9, 1.03, 0.95, 1.08, 0.94]

// a kind's outline in the unit box (the same outlines as maps.js blob / box / strip)
export function shapeOf (kind) {
  if (kind === 'wall' || kind === 'building') return [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([x, y]) => ({ x, y }))
  if (kind === 'stream') {
    // a strip bending a little at its middle (a stream)
    const b = 0.12
    return [{ x: -0.5, y: -0.5 }, { x: 0, y: -0.5 }, { x: 0.5, y: -0.5 + b }, { x: 0.5, y: 0.5 + b }, { x: 0, y: 0.5 }, { x: -0.5, y: 0.5 }]
  }
  return WOB.map((k, i) => { const t = i / WOB.length * Math.PI * 2; return { x: Math.cos(t) * 0.5 * k, y: Math.sin(t) * 0.5 * k } })
}

export function newPiece (kind, at) {
  const [w, d] = NEW_SIZE[kind] || [5, 5]
  return { kind, at: { x: at.x, y: at.y }, w, d, a: 0, shape: shapeOf(kind) }
}

// the piece's outline on the table
export function polyOf (p) {
  const c = Math.cos(p.a || 0); const s = Math.sin(p.a || 0)
  return p.shape.map(q => { const x = q.x * p.w; const y = q.y * p.d; return { x: p.at.x + x * c - y * s, y: p.at.y + x * s + y * c } })
}

// a named map's feature as a piece: its outline fitted into the unit box round its own middle
export function pieceFromFeature (f) {
  const xs = f.poly.map(q => q.x); const ys = f.poly.map(q => q.y)
  const x0 = Math.min(...xs); const x1 = Math.max(...xs); const y0 = Math.min(...ys); const y1 = Math.max(...ys)
  const w = Math.max(0.1, x1 - x0); const d = Math.max(0.1, y1 - y0)
  const at = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }
  return { kind: f.kind, at, w, d, a: 0, shape: f.poly.map(q => ({ x: (q.x - at.x) / w, y: (q.y - at.y) / d })) }
}

// its twin, turned half round the table's centre (as the named maps are made: each side finds the same ground)
export const twinOf = p => ({ ...p, at: { x: TABLE.w - p.at.x, y: TABLE.h - p.at.y }, a: (p.a || 0) + Math.PI, twin: true })

// every piece of the map, the twins too when it is mirrored
export const allPieces = map => map.mirror ? map.pieces.flatMap(p => [p, twinOf(p)]) : map.pieces

// the map's terrain features, as maps.js MAPS holds them
export function featuresOf (map) {
  return allPieces(map).map(p => ({ kind: p.kind, at: { ...p.at }, size: +Math.max(p.w, p.d).toFixed(2), poly: polyOf(p) }))
}

// ADVICE about the map (none of it stops it being saved): [{ level: 'warn' | 'note', text }]
export function checkMap (map) {
  const out = []
  const fs = featuresOf(map)
  const centre = { x: TABLE.w / 2, y: TABLE.h / 2 }
  const name = f => TERRAIN_KINDS[f.kind]?.name || f.kind
  fs.forEach((f, i) => {
    if (f.poly.some(q => q.x < 0 || q.y < 0 || q.x > TABLE.w || q.y > TABLE.h)) out.push({ level: 'warn', i, text: `${name(f)} ${i + 1} goes over the table's edge.` })
    // (the recommended set-up: no feature within 12" of the centre)
    const near = f.poly.some(q => Math.hypot(q.x - centre.x, q.y - centre.y) < 12) || pointInPoly(centre, f.poly)
    if (near) out.push({ level: 'note', i, text: `${name(f)} ${i + 1} is within 12" of the centre (the recommended set-up keeps it clear).` })
    // (The Size of Things: 2" to 8" across is one feature; a stream or a wall is long and thin by nature)
    if (!['stream', 'wall'].includes(f.kind) && (f.size > 8.01 || f.size < 1.99)) out.push({ level: 'note', i, text: `${name(f)} ${i + 1} is ${f.size}" across: 2" to 8" counts as one feature.` })
  })
  for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
    if (polysOverlap(fs[i].poly, fs[j].poly, 0)) out.push({ level: 'warn', i, text: `${name(fs[i])} ${i + 1} and ${name(fs[j])} ${j + 1} overlap.` })
  }
  // (How much terrain: about one feature for every 12" of the longest edge)
  const want = Math.round(TABLE.w / 12)
  if (fs.length < want) out.push({ level: 'note', text: `${fs.length} feature${fs.length === 1 ? '' : 's'}: about ${want} is usual on a ${TABLE.w}" table (one per 12" of the longest edge).` })
  return out
}

// A saved map, checked: { record } or { error }. What the store and the import accept.
export function validateRecord (r) {
  if (!r || typeof r !== 'object') return { error: 'not a map' }
  if (typeof r.id !== 'string' || !r.id) return { error: 'no id' }
  if (!Array.isArray(r.pieces)) return { error: 'no pieces' }
  const num = v => typeof v === 'number' && Number.isFinite(v)
  const pieces = []
  for (const p of r.pieces) {
    if (!p || !MAP_KINDS.includes(p.kind) || !num(p.at?.x) || !num(p.at?.y) || !num(p.w) || !num(p.d)) return { error: 'a piece is damaged' }
    const shape = Array.isArray(p.shape) && p.shape.length >= 3 && p.shape.every(q => num(q?.x) && num(q?.y)) ? p.shape.map(q => ({ x: q.x, y: q.y })) : shapeOf(p.kind)
    pieces.push({ kind: p.kind, at: { x: p.at.x, y: p.at.y }, w: p.w, d: p.d, a: num(p.a) ? p.a : 0, shape })
  }
  return { record: { format: 'dw-map', version: 1, id: r.id, name: String(r.name || 'My map').slice(0, 60), points: num(r.points) ? r.points : 2000, mirror: !!r.mirror, pieces } }
}

// the id a new map gets: from its name, made unique among `taken`
export function newMapId (name, taken = []) {
  const base = 'my-' + (String(name || 'map').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'map')
  let id = base; let n = 2
  while (taken.includes(id)) id = `${base}-${n++}`
  return id
}
