// THE INTRO'S WORLD MAP AND AIRSHIP: painted once onto canvases, then flown over by src/ui/intro.js.
// Exports paintWorld(), paintShip(frame), S, CASTLE and SHIP_LEN. The pieces: the castle, the fields
// and hedges, the hills, the sea and its creatures, the mountains. Drawn in world units (u) at S pixels a unit,
// north at the top. The net is 3 by 4 squares of F (introTimeline.js): the south row Concord Realm
// farmland, then the sea, then the mountains turning to snow, then the snowbound castle.
//
// Decoration. It decides nothing and reads no game state. Its own seeded random source, so the
// world is the same every load.

import { F, COLS, ROWS, LAND } from '../ui/introTimeline.js'

export const S = 8   // texture pixels a unit
export const CASTLE = [1.5 * F, 13]   // the castle's middle; its gate faces south, to the landing ground

function rng (seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const mixHex = (a, b, f) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, f))).toString(16).padStart(2, '0')).join('') }

// the drawing pen: small helpers, in world units
function pen (g) {
  const X = v => v * S
  const R = r => Math.max(0.5, r * S)
  return {
    circ (x, y, r, col, out) {
      if (out) { g.fillStyle = out; g.beginPath(); g.arc(X(x), X(y), R(r) + 1, 0, 7); g.fill() }
      g.fillStyle = col; g.beginPath(); g.arc(X(x), X(y), R(r), 0, 7); g.fill()
    },
    ell (x, y, rx, ry, rot, col, out) {
      if (out) { g.fillStyle = out; g.beginPath(); g.ellipse(X(x), X(y), R(rx) + 1, R(ry) + 1, rot, 0, 7); g.fill() }
      g.fillStyle = col; g.beginPath(); g.ellipse(X(x), X(y), R(rx), R(ry), rot, 0, 7); g.fill()
    },
    rect (x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(X(x)), Math.round(X(y)), Math.max(1, Math.round(R(w))), Math.max(1, Math.round(R(h)))) },
    poly (pts, col, out) {
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(X(x), X(y)) : g.moveTo(X(x), X(y))); g.closePath()
      if (out) { g.strokeStyle = out; g.lineWidth = 2; g.stroke() }
      g.fillStyle = col; g.fill()
    },
    line (pts, w, col) {
      g.strokeStyle = col; g.lineWidth = Math.max(1, R(w)); g.lineCap = 'round'; g.lineJoin = 'round'
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(X(x), X(y)) : g.moveTo(X(x), X(y))); g.stroke()
    },
    roundRect (x, y, w, h, r, col, out, lw) {
      g.beginPath(); g.roundRect(X(x), X(y), R(w), R(h), R(r))
      if (col) { g.fillStyle = col; g.fill() }
      if (out) { g.strokeStyle = out; g.lineWidth = lw || 2; g.stroke() }
    },
    // draw `fn` turned and scaled round (x, y)
    at (x, y, rot, k, fn) { g.save(); g.translate(X(x), X(y)); g.rotate(rot); g.scale(k, k); g.translate(-X(x), -X(y)); fn(); g.restore() }
  }
}

// The coast lines: the south shore of the sea (beach on the farmland's north edge) and its north shore
const southShore = x => 3 * F - 3 + Math.sin(x * 0.11) * 2.2 + Math.sin(x * 0.037 + 1) * 3
const northShore = x => 2 * F + 4 + Math.sin(x * 0.09 + 2) * 2.5 + Math.sin(x * 0.031) * 3.5
// how snowy the ground is, 0 green to 1 white
const snowOf = y => Math.max(0, Math.min(1, (118 - y) / 52))

export function paintWorld () {
  const W = COLS * F, H = ROWS * F
  const canvas = document.createElement('canvas')
  canvas.width = W * S; canvas.height = H * S
  const g = canvas.getContext('2d')
  const p = pen(g)
  const R0 = rng(1016)
  const rand = (a, b) => a + (b - a) * R0()

  // ---- the ground: green in the south, white in the north, in bands
  for (let y = 0; y < H; y += 0.5) {
    const s = snowOf(y)
    g.fillStyle = mixHex('#5b7a3c', '#e8eef4', s)
    g.fillRect(0, Math.floor(y * S), W * S, Math.ceil(0.5 * S) + 1)
  }
  // grass and snow patches
  for (let i = 0; i < 2600; i++) {
    const x = rand(0, W), y = rand(0, H)
    if (y > northShore(x) - 2 && y < southShore(x) + 2) continue
    const s = snowOf(y)
    const c = R0() < 0.5 ? mixHex('#557236', '#d4dee8', s) : mixHex('#64863f', '#f6f9fc', s)
    p.ell(x, y, rand(1, 4), rand(0.6, 2.4), 0, c)
  }
  for (let i = 0; i < 1200; i++) { const x = rand(0, W), y = rand(150, H); if (y < southShore(x) + 3) continue; p.rect(x, y, 0.15, 0.15, ['#e8e070', '#f0f0e8', '#c870a0'][Math.floor(R0() * 3)]) }

  // ---- the south: Concord Realm farmland
  const fieldCols = ['#c8a84a', '#7a5634', '#6b8f3a', '#9aa24c'], rowCols = ['#b08f38', '#5e3f24', '#5a7c30', '#878e3e']
  for (let fx = 4; fx < W - 10; fx += 10) {
    for (let fy = 3 * F + 6; fy < H - 6; fy += 8) {
      if (Math.abs(fx + 5 - 1.5 * F) < 12 && Math.abs(fy + 4 - 3.55 * F) < 10) continue     // the village
      if (fx < 30 && fy > 3.3 * F) continue                                                  // the wood, south-west
      if (fx > 2.55 * F && fy < 3.45 * F) continue                                           // the hills, north-east
      if (fy < southShore(fx) + 6) continue
      const k = Math.floor(R0() * 4)
      const f = { x: fx + rand(-0.4, 0.4), y: fy + rand(-0.4, 0.4), w: rand(8.5, 9.6), h: rand(6.5, 7.6) }
      p.rect(f.x, f.y, f.w, f.h, fieldCols[k])
      for (let y = f.y + 0.5; y < f.y + f.h - 0.2; y += 0.8) p.rect(f.x + 0.2, y, f.w - 0.4, 0.18, rowCols[k])
      p.line([[f.x - 0.4, f.y - 0.4], [f.x + f.w + 0.4, f.y - 0.4], [f.x + f.w + 0.4, f.y + f.h + 0.4]], 0.8, '#2f4a22')
      for (let x = f.x; x < f.x + f.w; x += 1.6) p.circ(x, f.y - 0.4, 0.45, '#3b5a2a')
    }
  }
  // the wood
  for (let i = 0; i < 260; i++) {
    const x = rand(0, 34), y = rand(3.3 * F, H)
    const r = rand(0.9, 1.7)
    if (R0() < 0.35) { p.poly([[x, y - r * 1.2], [x + r * 0.8, y + r * 0.6], [x - r * 0.8, y + r * 0.6]], '#1e4a24', '#0e2410') }
    else { p.circ(x, y, r, ['#2c5a24', '#244e1e', '#346a2a'][Math.floor(R0() * 3)], '#122a10'); p.circ(x - r * 0.3, y - r * 0.3, r * 0.45, '#4a8034') }
  }
  // the hills
  const hills = [{ x: 172, y: 206, rx: 14, ry: 8 }, { x: 184, y: 214, rx: 9, ry: 7 }, { x: 166, y: 218, rx: 8, ry: 6 }]
  for (const h of hills) {
    p.ell(h.x, h.y, h.rx, h.ry, 0, '#62783f', '#3e4f28')
    p.ell(h.x - h.rx * 0.08, h.y - h.ry * 0.1, h.rx * 0.72, h.ry * 0.7, 0, '#6f8748')
    p.ell(h.x - h.rx * 0.16, h.y - h.ry * 0.2, h.rx * 0.45, h.ry * 0.42, 0, '#7f9852')
    p.ell(h.x - h.rx * 0.24, h.y - h.ry * 0.3, h.rx * 0.2, h.ry * 0.18, 0, '#93ab60')
  }
  for (let i = 0; i < 30; i++) { const h = hills[i % 3]; const a = R0() * 6.3, d = R0() * 0.8; p.circ(h.x + Math.cos(a) * h.rx * d, h.y + Math.sin(a) * h.ry * d, rand(0.25, 0.6), '#9a958a', '#4a4740') }
  // the road north through the village to the harbour
  const road = [[1.5 * F + 4, H], [1.5 * F + 1, 3.75 * F], [1.5 * F - 2, 3.55 * F], [1.5 * F + 3, 3.3 * F], [1.5 * F, southShore(1.5 * F) + 1]]
  p.line(road, 2.2, '#6e5a3c'); p.line(road, 1.7, '#8f7650'); p.line(road, 0.5, '#a08860')
  const road2 = [[0, 3.6 * F], [1.5 * F - 8, 3.56 * F], [1.5 * F + 8, 3.54 * F], [W, 3.5 * F]]
  p.line(road2, 2.2, '#6e5a3c'); p.line(road2, 1.7, '#8f7650')
  // the village: roofs, the church, a windmill
  const Rt = rng(31)
  for (let i = 0; i < 30; i++) {
    const gx = i % 6, gy = Math.floor(i / 6)
    if (Rt() < 0.2) continue
    const hx = 1.5 * F - 10 + gx * 3.3 + Rt() * 0.6, hy = 3.55 * F - 8 + gy * 3.2 + Rt() * 0.5
    if (Math.abs(hy - 3.55 * F) < 1.6) continue
    const w = 2 + Rt() * 0.8, h = 1.4 + Rt() * 0.5, c = ['#a8402c', '#8a5a34', '#6a5a4a', '#b05a3a'][Math.floor(Rt() * 4)]
    p.rect(hx - 0.1, hy - 0.1, w + 0.2, h + 0.2, '#2a1a10'); p.rect(hx, hy, w, h, c); p.rect(hx, hy + h / 2 - 0.08, w, 0.16, 'rgba(0,0,0,.35)')
  }
  { const cx = 1.5 * F + 6, cy = 3.55 * F - 4; p.rect(cx - 1.6, cy - 1, 4, 2, '#8a8478'); p.rect(cx - 1.6, cy - 0.08, 4, 0.16, '#5a5448'); p.circ(cx + 2.8, cy, 1, '#9a958a', '#3c3934'); p.circ(cx + 2.8, cy, 0.4, '#4a5a78') }
  { const wx = 1.5 * F - 20, wy = 3.4 * F; p.circ(wx, wy, 1.1, '#d8d0b8', '#4a4234'); p.circ(wx, wy, 0.45, '#8a5a34'); for (let k = 0; k < 4; k++) { const a = 0.4 + k * Math.PI / 2; p.line([[wx, wy], [wx + Math.cos(a) * 2.8, wy + Math.sin(a) * 2.8]], 0.45, '#e8e0c8'); p.line([[wx, wy], [wx + Math.cos(a) * 2.8, wy + Math.sin(a) * 2.8]], 0.15, '#5a4030') } }
  // trees in the hedgerows, and the sheep
  for (let i = 0; i < 120; i++) { const x = rand(34, W), y = rand(southShore(0) + 6, H); const r = rand(0.9, 1.5); p.circ(x, y, r, '#2c5a24', '#122a10'); p.circ(x - r * 0.3, y - r * 0.3, r * 0.45, '#3e7a32') }
  for (const [fx, fy] of [[60, 200], [130, 236], [40, 228], [150, 247]]) {
    for (let i = 0; i < 7; i++) {
      const x = fx + rand(-3, 3), y = fy + rand(-2, 2), h = R0() * 6.3, black = R0() < 0.12
      p.ell(x, y, 0.95, 0.67, h, black ? '#3a3632' : '#eeeae0', '#4a4238')
      p.circ(x + Math.cos(h) * 1, y + Math.sin(h) * 1, 0.32, '#2a2420')
    }
  }

  // ---- the sea, between its two shores
  const seaTop = []; const seaBot = []
  for (let x = -1; x <= W + 1; x += 1) { seaTop.push([x, northShore(x)]); seaBot.push([x, southShore(x)]) }
  // the beaches, then the water over them
  p.poly([...seaTop.map(([x, y]) => [x, y - 2.4]), ...seaBot.slice().reverse().map(([x, y]) => [x, y + 2.4])], '#d8c48c')
  p.poly([...seaTop.map(([x, y]) => [x, y - 1.4]), ...seaBot.slice().reverse().map(([x, y]) => [x, y + 1.4])], '#c2ad74')
  p.poly([...seaTop, ...seaBot.slice().reverse()], '#255479')
  p.poly([...seaTop.map(([x, y]) => [x, y + 3]), ...seaBot.slice().reverse().map(([x, y]) => [x, y - 3])], '#1f4a6c')
  p.line(seaTop.map(([x, y]) => [x, y + 0.6]), 0.35, 'rgba(240,248,255,.85)')
  p.line(seaBot.map(([x, y]) => [x, y - 0.6]), 0.35, 'rgba(240,248,255,.85)')
  for (let i = 0; i < 900; i++) {
    const x = rand(0, W), y = rand(northShore(x) + 2, southShore(x) - 2)
    g.globalAlpha = rand(0.25, 0.7); p.rect(x, y, rand(0.6, 1.8), 0.16, '#6ea6cc'); g.globalAlpha = 1
  }
  // islands: two with sand and surf, one with a lighthouse
  for (const [ix, iy, r] of [[24, 158, 9], [168, 150, 11], [118, 170, 3.5]]) {
    p.ell(ix, iy, r + 3, r * 0.7 + 3, 0, '#2f6a94'); p.ell(ix, iy, r + 1.6, r * 0.7 + 1.6, 0, 'rgba(240,248,255,.8)')
    p.ell(ix, iy, r + 1, r * 0.7 + 1, 0, '#d8c48c'); p.ell(ix, iy, r, r * 0.7, 0, '#5b7a3c')
    for (let k = 0; k < r * 2; k++) { const a = R0() * 6.3, d = R0() * r * 0.7; p.circ(ix + Math.cos(a) * d, iy + Math.sin(a) * d * 0.7, rand(0.8, 1.3), '#2c5a24', '#122a10') }
  }
  p.circ(118, 170, 1, '#f0ead8', '#5a5448'); p.circ(118, 170, 0.5, '#c8402a')
  // a whale, its spout; a sea serpent's coils; dolphins; sailing ships
  { const x = 70, y = 150; p.ell(x, y, 3.8, 1.3, 0.3, '#3c4a5c', '#1a222c'); p.poly([[x - 4.2, y - 2.2], [x - 3.4, y - 1], [x - 4.6, y - 0.4]], '#34404f'); for (let i = 0; i < 9; i++) { g.globalAlpha = 0.7; p.circ(x + 2.6 + Math.cos(i * 0.7) * 1.2, y - 2 + Math.sin(i * 0.7) * 0.8, 0.3, '#f4f8ff'); g.globalAlpha = 1 } }
  for (let k = 0; k < 6; k++) {
    const x = 128 + k * 2.6, y = 140 + Math.sin(x * 0.35) * 1.6
    if (k % 2) { g.globalAlpha = 0.4; p.ell(x, y, 1.4, 0.55, 0, '#123048'); g.globalAlpha = 1; continue }
    p.ell(x, y, 1.5, 0.75, 0, '#3f8a4a', '#1e3f22'); p.ell(x - 0.2, y - 0.25, 0.9, 0.3, 0, '#6fb46a')
  }
  { const x = 146, y = 140; p.ell(x + 0.8, y, 1.5, 0.75, 0, '#3f8a4a', '#1e3f22'); p.poly([[x + 1.9, y - 0.3], [x + 3.2, y - 0.1], [x + 1.9, y + 0.1]], '#3f8a4a', '#1e3f22'); p.circ(x + 1.5, y - 0.35, 0.16, '#f0d040') }
  for (const [x, y, d] of [[90, 176, 0.4], [94, 177.5, 0.5], [40, 140, -0.3]]) { p.ell(x, y, 1.35, 0.34, d, '#7d8a96', '#2c3640') }
  for (const [x, y, a] of [[100, 158, -0.4], [52, 172, 0.6], [150, 176, 1.2]]) {
    p.at(x, y, a, 1, () => { p.ell(x, y, 2.2, 0.8, 0, '#6a4a2a', '#2a1a0e'); p.rect(x - 0.15, y - 1.4, 0.3, 2.8, '#f0ead8'); p.rect(x - 1.2, y - 0.1, 2.4, 0.2, '#3a2a18') })
    g.globalAlpha = 0.5; p.line([[x - Math.sin(a) * 2.6, y + Math.cos(a) * 2.6], [x - Math.sin(a) * 6, y + Math.cos(a) * 6]], 0.2, '#cfe4f0'); g.globalAlpha = 1
  }
  // the harbour at the end of the road
  { const hx = 1.5 * F, hy = southShore(1.5 * F); p.rect(hx - 1, hy - 7, 2, 7, '#6a5034'); p.rect(hx - 4, hy - 7, 8, 1.4, '#6a5034'); for (let i = 0; i < 5; i++) p.rect(hx - 0.8, hy - 6.6 + i * 1.4, 1.6, 0.15, '#4a3420') }

  // ---- the north: pines, then mountains, more and whiter the further north
  for (let i = 0; i < 380; i++) {
    const x = rand(0, W), y = rand(46, northShore(x) - 4)
    const s = snowOf(y), r = rand(0.9, 1.6)
    p.poly([[x, y - r * 1.3], [x + r * 0.8, y + r * 0.6], [x - r * 0.8, y + r * 0.6]], '#1e4a24', '#0e2410')
    if (s > 0.3) p.poly([[x, y - r * 1.3], [x + r * 0.35, y - r * 0.3], [x - r * 0.35, y - r * 0.3]], '#f0f4f8')
  }
  const peaks = []
  for (let i = 0; i < 70; i++) {
    const y = rand(0, 108), x = rand(0, W)
    if (Math.abs(x - 1.5 * F) < 22 && y < 58) continue          // the castle, its open ground and the road to it
    if (Math.abs(x - 1.5 * F) < 9) continue                      // the airship's way north, low and clear
    peaks.push([x, y, rand(5, 11) * (1.3 - y / 160)])
  }
  peaks.sort((a, b) => a[1] - b[1])
  for (const [x, y, r] of peaks) mountain(p, x, y, r, snowOf(y))

  // ---- the castle in the snow, and the open ground before it where the ship lands
  p.ell(LAND[0], LAND[1], 16, 11, 0, '#dfe6ee')
  p.ell(LAND[0], LAND[1], 12, 8, 0, '#cfd8e2')
  p.circ(LAND[0], LAND[1], 5.5, '#9a958a', '#5a5448'); p.circ(LAND[0], LAND[1], 4.3, '#b8b2a4'); p.circ(LAND[0], LAND[1], 1.4, '#a8402c')
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.circ(LAND[0] + Math.cos(a) * 4.9, LAND[1] + Math.sin(a) * 4.9, 0.35, '#e8d050') }
  const gate = [CASTLE[0], CASTLE[1] + 13]
  const way = [[LAND[0], LAND[1] - 5], [gate[0], gate[1]]]
  p.line(way, 4.4, '#b8b2a4'); p.line(way, 3.6, '#c8c2b4')
  p.at(CASTLE[0], CASTLE[1], Math.PI / 2, 1.25, () => castle(p, CASTLE[0], CASTLE[1]))

  return canvas
}

// a mountain from above: lit and shaded faces, a snow cap the bigger the snowier the ground
function mountain (p, x, y, r, snow) {
  p.ell(x + r * 0.2, y + r * 0.25, r * 1.02, r * 0.82, 0, 'rgba(30,40,50,.22)')
  const pk = [x - r * 0.12, y - r * 0.18]
  const n = 12
  const rim = Array.from({ length: n }, (_, i) => { const a = i / n * 2 * Math.PI; const k = 0.86 + 0.14 * Math.sin(i * 1.9 + x * 0.7); return [x + Math.cos(a) * r * k, y + Math.sin(a) * r * 0.8 * k] })
  // each face shaded by how much it turns to the light (from the north-west)
  rim.forEach((q, i) => {
    const q2 = rim[(i + 1) % n]
    const a = (i + 0.5) / n * 2 * Math.PI
    const lit = 0.5 + 0.5 * Math.cos(a - 3.9)
    p.poly([pk, q, q2], mixHex(mixHex('#4e4e46', '#9a9a88', lit), mixHex('#7e8894', '#dce2ea', lit), snow * 0.8))
  })
  // the snow cap, ragged at its edge
  const capK = 0.3 + snow * 0.35
  const cap = rim.map(([px, py], i) => { const k = capK * (0.8 + 0.4 * ((i * 7 + Math.round(x)) % 3) / 2); return [pk[0] + (px - pk[0]) * k, pk[1] + (py - pk[1]) * k] })
  p.poly(cap, '#f4f7fa')
  p.poly([pk, cap[3], cap[4], cap[5], cap[6]], '#cdd6e0')
}

// the castle, its moat frozen and its roofs under snow; the
// gatehouse on its east side (turned to face south by the caller)
function castle (p, cx, cy) {
  p.roundRect(cx - 11, cy - 11, 22, 22, 3, '#a8c8dc', '#6a8aa0', 2)
  for (let i = 0; i < 10; i++) p.rect(cx - 10 + (i * 7) % 20, cy - 10.5 + (i % 5) * 0.2, 0.9, 0.12, '#e8f4fc')
  p.roundRect(cx - 8.6, cy - 8.6, 17.2, 17.2, 1.5, '#e4eaf0')
  p.rect(cx - 7.4, cy - 7.4, 14.8, 14.8, '#4a4740')
  p.rect(cx - 7, cy - 7, 14, 14, '#8d8a80')
  p.rect(cx - 5.8, cy - 5.8, 11.6, 11.6, '#dfe4ea')
  for (let i = 0; i < 14; i += 1.2) { p.rect(cx - 7 + i, cy - 7, 0.6, 0.45, '#f0f4f8'); p.rect(cx - 7 + i, cy + 6.55, 0.6, 0.45, '#f0f4f8'); p.rect(cx - 7, cy - 7 + i, 0.45, 0.6, '#f0f4f8'); p.rect(cx + 6.55, cy - 7 + i, 0.45, 0.6, '#f0f4f8') }
  p.rect(cx + 6.4, cy - 1.6, 4.9, 3.2, '#7a5634'); for (let i = 0; i < 5; i++) p.rect(cx + 6.6 + i, cy - 1.5, 0.12, 3, '#5a3e24')
  p.circ(cx + 7, cy - 2.4, 1.3, '#8d8a80', '#3c3934'); p.circ(cx + 7, cy + 2.4, 1.3, '#8d8a80', '#3c3934')
  p.rect(cx - 4.4, cy - 3.6, 6.4, 5.2, '#2e3646'); p.rect(cx - 4.2, cy - 3.4, 6, 4.8, '#4a5a78'); p.rect(cx - 4.2, cy - 3.4, 6, 2.2, '#eef2f6'); p.rect(cx - 4.2, cy - 1.1, 6, 0.3, '#2e3646')
  for (let i = 0; i < 6; i++) p.rect(cx - 4.2 + i, cy - 1.1, 0.08, 2.5, '#3e4c66')
  p.circ(cx + 2.6, cy + 2.6, 2.2, '#8d8a80', '#3c3934'); p.circ(cx + 2.6, cy + 2.6, 1.7, '#a8402c', '#5a2016'); p.circ(cx + 2.2, cy + 2.2, 0.8, '#f0f4f8')
  for (const [dx, dy] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) {
    p.circ(cx + dx, cy + dy, 2, '#8d8a80', '#3c3934'); p.circ(cx + dx, cy + dy, 1.55, '#a8402c', '#5a2016'); p.circ(cx + dx - 0.45, cy + dy - 0.45, 0.7, '#f0f4f8')
  }
  for (const [dx, dy, c] of [[2.6, 2.6, '#2a5aa8'], [-7, -7, '#e8d050'], [7, 7, '#e8d050']]) {
    p.rect(cx + dx, cy + dy - 0.1, 0.12, 0.12, '#2a1c10')
    p.poly([[cx + dx, cy + dy - 0.3], [cx + dx + 1.6, cy + dy - 0.1], [cx + dx + 1.4, cy + dy + 0.55], [cx + dx, cy + dy + 0.3]], c, '#2a1c10')
  }
}

// ---- the airship, drawn here because no picture of one exists ---------------------------------
// From behind and above, nose up the picture, as airships are seen in old top-down games. Two frames,
// for the propellers turning. Width 40, height 56 pixels; its length is SHIP_LEN u.
export const SHIP_LEN = 11
export function paintShip (frame) {
  const c = document.createElement('canvas')
  c.width = 40; c.height = 56
  const g = c.getContext('2d')
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h) }
  // the outriggers and propellers, at the sides by the gondola
  px(3, 33, 34, 2, '#3a2a18')
  for (const x of [3, 37]) {
    px(x - 2, 31, 4, 6, '#5a4030')
    if (frame) { px(x - 4, 33, 8, 2, '#d8d4c8') } else { px(x - 1, 29, 2, 10, '#d8d4c8') }
  }
  // the envelope: cloth panels, shaded down its right side, an Concord Realm band round it
  g.fillStyle = '#2a1c10'; g.beginPath(); g.ellipse(20, 24, 14, 23, 0, 0, 7); g.fill()
  g.fillStyle = '#c9b48a'; g.beginPath(); g.ellipse(20, 24, 13, 22, 0, 0, 7); g.fill()
  g.fillStyle = '#a8936a'; g.beginPath(); g.ellipse(24, 25, 9, 20, 0, 0, 7); g.fill()
  g.fillStyle = '#e6d6aa'; g.beginPath(); g.ellipse(15, 21, 5, 15, 0, 0, 7); g.fill()
  for (const x of [13, 20, 27]) px(x, 6, 1, 36, 'rgba(60,40,20,.35)')
  px(7, 22, 26, 4, '#a8402c'); px(7, 23, 26, 1, '#e8d050')
  px(19, 2, 2, 3, '#e8d050')                          // the nose cap
  // the tail fins, nearest the eye
  g.fillStyle = '#7a2a1c'
  g.beginPath(); g.moveTo(8, 50); g.lineTo(2, 54); g.lineTo(12, 46); g.fill()
  g.beginPath(); g.moveTo(32, 50); g.lineTo(38, 54); g.lineTo(28, 46); g.fill()
  px(18, 40, 4, 15, '#7a2a1c'); px(19, 41, 1, 13, '#a8402c')
  // the gondola's stern under it, with its lantern
  px(15, 44, 10, 6, '#3a2a18'); px(16, 45, 8, 4, '#6a4a2a'); px(17, 46, 6, 1, '#8a6a3a'); px(19, 49, 2, 2, '#f0c040')
  return c
}
