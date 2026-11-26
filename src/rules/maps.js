// Named maps: battlefields laid out by hand, chosen on the Battle setup screen in place of random terrain. Exports
// MAPS, mapTerrain (a map's features) and setCustomMaps (adds the player's own maps); used by game.js, the setup
// screen and the map editor.
//
// Terrain goes down before deployment, wherever the players agree; a map is such a layout agreed in advance, kept
// clear of the centre as the recommended set-up asks. Every feature is the same record the random terrain makes
// (terrain.js generateTerrain: { id, kind, at, size, poly }, inches), so every rule about terrain (movement, sight,
// cover, charges) treats it the same. The dice seed still decides every roll.
//
// Blue deploys along the near edge (y 36" to 48"), red along the far edge (y 0" to 12"), game.js deployZone.

// a closed outline round `at`, `rx` by `ry` inches, turned by `a` radians, its edge nudged in and out by `wob` (fixed
// numbers, so the map is the same every time)
function blob (at, rx, ry, a, wob) {
  const n = wob.length
  return wob.map((k, i) => {
    const t = i / n * Math.PI * 2
    const x = Math.cos(t) * rx * k; const y = Math.sin(t) * ry * k
    return { x: at.x + x * Math.cos(a) - y * Math.sin(a), y: at.y + x * Math.sin(a) + y * Math.cos(a) }
  })
}
// a rectangle `w` by `d` round `at`, turned by `a`
function box (at, w, d, a) {
  const c = Math.cos(a); const s = Math.sin(a)
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, y]) => ({ x: at.x + x * c - y * s, y: at.y + x * s + y * c }))
}
// a strip `len` long and `wide` across through `at` along `a`, bending by `bend` radians at its middle (a stream)
function strip (at, len, wide, a, bend) {
  const d1 = { x: Math.cos(a), y: Math.sin(a) }; const d2 = { x: Math.cos(a + bend), y: Math.sin(a + bend) }
  const h = len / 2; const w = wide / 2
  const p0 = { x: at.x - d1.x * h, y: at.y - d1.y * h }; const p2 = { x: at.x + d2.x * h, y: at.y + d2.y * h }
  const n1 = { x: -d1.y * w, y: d1.x * w }; const n2 = { x: -d2.y * w, y: d2.x * w }
  return [{ x: p0.x - n1.x, y: p0.y - n1.y }, { x: at.x - n1.x, y: at.y - n1.y }, { x: p2.x - n2.x, y: p2.y - n2.y },
    { x: p2.x + n2.x, y: p2.y + n2.y }, { x: at.x + n1.x, y: at.y + n1.y }, { x: p0.x + n1.x, y: p0.y + n1.y }]
}

const WOB = [1, 0.92, 1.06, 0.97, 1.1, 0.9, 1.03, 0.95, 1.08, 0.94]

// RHENMARK CROSSING, for 1000 points. Every feature has its twin turned half round the table's centre (36", 24"), so
// each side finds the same ground: a hill in its own deployment zone for its war machine, a wood on its left in
// no-man's land, an impassable feature on its right (rocks for blue, a farmhouse for red: both impassable and blocking
// sight), a low wall and a stream on each half. As the recommended set-up asks, nothing stands within 12" of the
// centre (Placing Terrain Battlefield Terrain; maps.test.js checks it).
const twin = f => ({ ...f, at: { x: 72 - f.at.x, y: 48 - f.at.y }, poly: f.poly.map(p => ({ x: 72 - p.x, y: 48 - p.y })) })
const HALF = [
  { kind: 'hill', at: { x: 48, y: 41 }, size: 8, poly: blob({ x: 48, y: 41 }, 4.5, 3, 0.1, WOB) },
  { kind: 'wood', at: { x: 14, y: 29 }, size: 7, poly: blob({ x: 14, y: 29 }, 3.8, 3.2, 0.5, WOB) },
  { kind: 'wall', at: { x: 20, y: 21 }, size: 7, poly: box({ x: 20, y: 21 }, 7, 0.5, 0) },
  { kind: 'stream', at: { x: 51, y: 34 }, size: 11, poly: strip({ x: 51, y: 34 }, 11, 1.5, 0.25, -0.2) }
]
const RC = [
  ...HALF.flatMap(f => [f, twin(f)]),
  { kind: 'rocks', at: { x: 64, y: 31 }, size: 4.5, poly: blob({ x: 64, y: 31 }, 2.4, 2, 0.3, WOB) },
  { kind: 'building', at: { x: 8, y: 17 }, size: 5, poly: box({ x: 8, y: 17 }, 5, 3.5, 0.3) }
]

// TALVAR FIELDS, for 2000 points. The table stays 48" x 72", the usual size for games of 2,000 to 3,000 points.
// Made for bigger armies with
// more war machines: TWO hills in each deployment zone (the Concord Realm's two cannons and mortar, the Rukka' two Rock Chuckas),
// the woods and the streams out on the flanks and a low wall each side of the middle, so the long battle lines have room,
// and one impassable feature each side of no-man's land (rocks, a farmhouse). Twinned half round the centre like
// Rhenmark Crossing, and nothing within 12" of the centre (maps.test.js checks every map).
const HALF2 = [
  { kind: 'hill', at: { x: 17, y: 41.5 }, size: 8, poly: blob({ x: 17, y: 41.5 }, 4.5, 3, -0.1, WOB) },
  { kind: 'hill', at: { x: 55, y: 41.5 }, size: 8, poly: blob({ x: 55, y: 41.5 }, 4.5, 3, 0.15, WOB) },
  { kind: 'wood', at: { x: 7, y: 30 }, size: 7, poly: blob({ x: 7, y: 30 }, 3.6, 3.2, 0.4, WOB) },
  { kind: 'wall', at: { x: 22, y: 32 }, size: 6, poly: box({ x: 22, y: 32 }, 6, 0.5, 0.12) },
  { kind: 'stream', at: { x: 64, y: 29 }, size: 10, poly: strip({ x: 64, y: 29 }, 10, 1.5, 1.2, -0.25) }
]
const TF = [
  ...HALF2.flatMap(f => [f, twin(f)]),
  { kind: 'rocks', at: { x: 48, y: 34 }, size: 4, poly: blob({ x: 48, y: 34 }, 2.2, 1.8, 0.3, WOB) },
  { kind: 'building', at: { x: 24, y: 14 }, size: 5, poly: box({ x: 24, y: 14 }, 4.5, 3.2, 0.2) }
]

export const MAPS = {
  'field-1000': { id: 'field-1000', name: 'Rhenmark Crossing', points: 1000, features: RC },
  'field-2000': { id: 'field-2000', name: 'Talvar Fields', points: 2000, features: TF }
}

// A map's terrain for a new battle: copies (a battle may change its terrain, e.g. a vortex), with ids.
export function mapTerrain (id) {
  const m = MAPS[id]
  if (!m) return null
  return m.features.map((f, i) => ({ id: `m${i + 1}`, kind: f.kind, at: { ...f.at }, size: f.size, poly: f.poly.map(p => ({ ...p })) }))
}

// THE PLAYER'S OWN MAPS (the map editor, rules/customMaps.js): put into MAPS beside the named ones, so the Battle setup
// screen lists them and mapTerrain lays them like any other. `records`: the saved maps (ui/customMapsStore.js).
export function setCustomMaps (records, featuresOf) {
  for (const id of Object.keys(MAPS)) if (MAPS[id].custom) delete MAPS[id]
  for (const r of records) MAPS[r.id] = { id: r.id, name: r.name, points: r.points, features: featuresOf(r), custom: true }
}
