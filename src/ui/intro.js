// THE INTRO: the opening film over the menu. Exports playIntro(menu, { music, onDone }) and
// introWanted(), both used by src/main.js. The timing is introTimeline.js; the world map and the
// airship are src/view/scenery.js; the unit-picture scenes are introScenes.js. This file draws
// them, every frame, at the time the song is at.
//
// HOW IT DRAWS. One canvas at a third of the screen's resolution, enlarged with hard pixels, for a
// pixel-art look. Two ways of drawing the world:
//   - the CUBE (the start, and later the fold): the net's faces cut into small squares, each put
//     where netPoint() says in 3-D and drawn as two textured triangles, farthest first;
//   - the FLAT WORLD: a tilted flat map. For every row of the screen the ray through it
//     meets the ground at one distance, and along the row the ground point moves in a straight
//     line, so a row is a walk through the map's pixels. Far rows fade into the haze.
// Both use the same camera, so at the moment the cube lies flat the two pictures are the same.
//
// THE CLOCK is Imperio Antiguo's own time (music.js introSong()), so picture and song cannot
// drift. If the browser has not let the song start (no click on the page yet),
// a "Press any key" card waits first. With the menu music off it runs on the wall clock.
// Escape, Space or the corner button skips to the menu. ?intro=off skips it; ?intro=at:N starts
// at N seconds (for checking a moment by eye); ?intro=freeze:N holds still at N.
//
// Decoration. It decides nothing, reads no game state and never uses the game's dice.

import { CUES, END, F, COLS, ROWS, isFace, netPoint, unfoldAt, shipAt, cameraAt, snowAt, worldAt, FACES, sceneFade, reelsAt, jetsAt, bubbleAt, spaceAt, cubeView, shipScreenAt } from './introTimeline.js'
import { paintWorld, paintShip, S, SHIP_LEN } from '../view/scenery.js'
import { createScenes, SCENE_SPRITES } from './introScenes.js'

const K = 3   // screen pixels a picture pixel
// After the last cue (the buttons, 2:27) the picture goes on behind the menu: space, drifting,
// until the menu is left.

export function introWanted () { return new URLSearchParams(location.search).get('intro') !== 'off' }
// ?intro=freeze:N holds the picture still at N seconds (for checking a passing moment, a flash)
function frozenSecond () {
  const asked = /^freeze:(\d+(?:\.\d+)?)$/.exec(new URLSearchParams(location.search).get('intro') ?? '')
  return asked ? Number(asked[1]) : null
}
function startSecond () {
  const asked = /^at:(\d+(?:\.\d+)?)$/.exec(new URLSearchParams(location.search).get('intro') ?? '')
  return asked ? Number(asked[1]) : 0
}

// the colours, as the canvas's 32-bit pixels (little-endian: 0xAABBGGRR)
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const mixRgb = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k))
const pack = ([r, g, b]) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0

// `menu` is the #menu section: its title waits under .dw-intro until CUES.title, its buttons
// until the end. `music` is music.js introSong(). `onDone` when the menu is usable.
export function playIntro (menu, { music = null, onDone = null } = {}) {
  const canvas = document.createElement('canvas')
  canvas.className = 'dw-intro-canvas'
  document.body.prepend(canvas)
  const g = canvas.getContext('2d')
  // the second canvas, at the screen's own resolution, for the scenes made of the game's unit
  // pictures (introScenes.js): at a third of the resolution they would lose their pixels
  const hi = document.createElement('canvas')
  hi.className = 'dw-intro-canvas dw-intro-hi'
  canvas.after(hi)
  const h = hi.getContext('2d')
  const sprites = {}
  for (const key of SCENE_SPRITES) { const im = new Image(); im.src = `/dw/images/${key}.png`; sprites[key] = im }
  const skipBtn = Object.assign(document.createElement('button'), { className: 'dw-intro-skip', textContent: 'Skip' })
  document.body.append(skipBtn)
  menu.classList.add('dw-intro')

  // ---- the pictures, made once
  const world = paintWorld()
  const TW = world.width, TH = world.height
  const tex = new Uint32Array(world.getContext('2d').getImageData(0, 0, TW, TH).data.buffer)
  const CELL = F * S
  const filler = new Uint8Array(COLS * ROWS)
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) filler[r * COLS + c] = isFace(c, r) ? 0 : 1
  const ships = [paintShip(0), paintShip(1)]
  const scenes = createScenes(h, sprites, ships[0])

  // ---- the picture buffer
  let BW = 0, BH = 0, img = null, out = null, fl = 1
  function resize () {
    BW = Math.max(160, Math.ceil(innerWidth / K)); BH = Math.max(100, Math.ceil(innerHeight / K))
    canvas.width = BW; canvas.height = BH
    img = g.createImageData(BW, BH); out = new Uint32Array(img.data.buffer)
    fl = BW * 0.9
    hi.width = innerWidth; hi.height = innerHeight
    h.imageSmoothingEnabled = false
    scenes.size(hi.width, hi.height)
  }
  resize()
  addEventListener('resize', resize)

  // ---- the camera
  function basis (cam) {
    const { yaw: ps, pitch: ph } = cam
    const f = [Math.sin(ps) * Math.cos(ph), -Math.cos(ps) * Math.cos(ph), -Math.sin(ph)]
    const r = [Math.cos(ps), Math.sin(ps), 0]
    const u = [-f[2] * Math.sin(ps), f[2] * Math.cos(ps), f[0] * Math.sin(ps) - f[1] * Math.cos(ps)]
    const P = cam.target.map((v, i) => v - f[i] * cam.dist)
    return { f, r, u, P }
  }
  function project (B, q) {
    const v = [q[0] - B.P[0], q[1] - B.P[1], q[2] - B.P[2]]
    const z = v[0] * B.f[0] + v[1] * B.f[1] + v[2] * B.f[2]
    if (z < 0.5) return null
    const x = v[0] * B.r[0] + v[1] * B.r[1]
    const y = v[0] * B.u[0] + v[1] * B.u[1] + v[2] * B.u[2]
    return [BW / 2 + fl * x / z, BH / 2 - fl * y / z, z]
  }

  // ---- the flat world (a tilted map, one screen row at a time)
  const SKY_TOP = rgb('#4b86c8'), BLACK = [0, 0, 0]
  function drawGround (B, t, shown, haze) {
    const hz = pack(haze), dark = pack(mixRgb(BLACK, haze, shown))
    const [hr, hg, hb] = haze
    const NEAR = 100, FAR = 250
    const { f, r, u, P } = B
    for (let sy = 0; sy < BH; sy++) {
      const b = (sy - BH / 2) / fl
      const dz = f[2] - u[2] * b
      const row = sy * BW
      if (dz > -1e-4) {   // above the horizon: the sky
        const k = Math.min(1, sy / (BH * 0.5))
        out.fill(pack(mixRgb(mixRgb(BLACK, SKY_TOP, shown), haze, k)), row, row + BW)
        continue
      }
      const tt = -P[2] / dz
      const fog = Math.max(0, Math.min(1, (tt * Math.sqrt(1 + b * b) - NEAR) / (FAR - NEAR)))
      if (fog >= 1) { out.fill(hz, row, row + BW); continue }
      const a0 = -BW / 2 / fl
      let gx = (P[0] + tt * (f[0] + r[0] * a0 - u[0] * b)) * S
      let gy = (P[1] + tt * (f[1] + r[1] * a0 - u[1] * b)) * S
      const sx = tt * r[0] / fl * S, syy = tt * r[1] / fl * S
      const keep = 1 - fog
      for (let x = 0; x < BW; x++, gx += sx, gy += syy) {
        let ix = Math.floor(gx), iy = Math.floor(gy)
        let px
        const off = ix < 0 || iy < 0 || ix >= TW || iy >= TH
        if (off && shown <= 0) px = dark
        else {
          // beyond the net the map goes on, mirrored, so its coasts and bands carry on unbroken
          if (off) { ix = mirror(ix, TW); iy = mirror(iy, TH) }
          px = tex[iy * TW + ix]
          if (shown < 1 && (off || filler[((iy / CELL) | 0) * COLS + ((ix / CELL) | 0)])) {
            const k = shown
            px = pack([(px & 255) * k, ((px >> 8) & 255) * k, ((px >> 16) & 255) * k].map(Math.round))
          }
        }
        if (fog > 0) px = pack([((px & 255) * keep + hr * fog) | 0, (((px >> 8) & 255) * keep + hg * fog) | 0, (((px >> 16) & 255) * keep + hb * fog) | 0])
        out[row + x] = px
      }
    }
    g.putImageData(img, 0, 0)
  }

  const mirror = (i, n) => { const m = ((i % (2 * n)) + 2 * n) % (2 * n); return m < n ? m : 2 * n - 1 - m }

  // ---- the cube
  const N = 4   // squares a face side
  function drawCube (B, unfold, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, BW, BH)
    drawSpace(t, spaceAt(t))
    const quads = []
    const step = F / N
    for (const [c, r] of FACES) {
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const x0 = c * F + i * step, y0 = r * F + j * step
        const src = [[x0, y0], [x0 + step, y0], [x0 + step, y0 + step], [x0, y0 + step]]
        // (a hair inside the square, so a point on a fold line belongs to this face)
        const w = src.map(([x, y]) => netPoint(Math.min(Math.max(x, x0 + 1e-6), x0 + step - 1e-6), Math.min(Math.max(y, y0 + 1e-6), y0 + step - 1e-6), unfold))
        const s = w.map(q => project(B, q))
        if (s.some(v => !v)) continue
        const n = cross(sub(w[1], w[0]), sub(w[3], w[0]))
        quads.push({ src, s, z: (s[0][2] + s[1][2] + s[2][2] + s[3][2]) / 4, n })
      }
    }
    quads.sort((a, b) => b.z - a.z)
    const light = norm([-0.4, -0.6, 0.7])
    for (const q of quads) {
      tri(q.src[0], q.src[1], q.src[2], q.s[0], q.s[1], q.s[2])
      tri(q.src[0], q.src[2], q.src[3], q.s[0], q.s[2], q.s[3])
      // the faces turned away from the light a little darker. (The net's normal points down
      // for a face seen from inside, so the shade uses its size only.)
      const nn = norm(q.n)
      const lit = Math.abs(nn[0] * light[0] + nn[1] * light[1] + nn[2] * light[2])
      g.fillStyle = `rgba(0,0,0,${(0.45 * (1 - lit)).toFixed(3)})`
      g.beginPath(); q.s.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill()
    }
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l) }
  // one textured triangle: the map's triangle (in u) onto the screen's
  function tri (s0, s1, s2, d0, d1, d2) {
    const [ax, ay] = [s0[0] * S, s0[1] * S], [bx, by] = [s1[0] * S, s1[1] * S], [cx, cy] = [s2[0] * S, s2[1] * S]
    const den = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
    if (Math.abs(den) < 1e-9) return
    const a = ((d1[0] - d0[0]) * (cy - ay) - (d2[0] - d0[0]) * (by - ay)) / den
    const b = ((d1[1] - d0[1]) * (cy - ay) - (d2[1] - d0[1]) * (by - ay)) / den
    const c = ((d2[0] - d0[0]) * (bx - ax) - (d1[0] - d0[0]) * (cx - ax)) / den
    const d = ((d2[1] - d0[1]) * (bx - ax) - (d1[1] - d0[1]) * (cx - ax)) / den
    const e = d0[0] - a * ax - c * ay, f = d0[1] - b * ax - d * ay
    // the clip a half pixel wider than the triangle, so the seams do not show
    const mx = (d0[0] + d1[0] + d2[0]) / 3, my = (d0[1] + d1[1] + d2[1]) / 3
    const grow = p => { const dx = p[0] - mx, dy = p[1] - my, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.7, p[1] + dy / l * 0.7] }
    const [p0, p1, p2] = [grow(d0), grow(d1), grow(d2)]
    g.save()
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.clip()
    g.setTransform(a, b, c, d, e, f)
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)) - 1), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)) - 1)
    const x1 = Math.min(TW, Math.ceil(Math.max(ax, bx, cx)) + 1), y1 = Math.min(TH, Math.ceil(Math.max(ay, by, cy)) + 1)
    g.drawImage(world, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0)
    g.restore()
  }

  // ---- the airship and its shadow
  function drawShip (B, cam, t) {
    const s = shipAt(t)
    const sc = shipScreenAt(t)
    if (!s.seen || sc.gone) return
    const body = project(B, [s.x, s.y, s.alt + 2.5])
    const ground = project(B, [s.x, s.y, 0])
    // where the camera puts it; once the world folds away, held in the lower middle of the screen
    let x = BW / 2, y = BH * 0.66, len = BH * 0.2, rot = 0
    if (body && sc.anchor < 1) {
      const pl = SHIP_LEN * fl / body[2]
      x = body[0] + (x - body[0]) * sc.anchor; y = body[1] + (y - body[1]) * sc.anchor
      len = pl + (len - pl) * sc.anchor; rot = (s.yaw - cam.yaw) * (1 - sc.anchor)
    }
    // dropping in from above the top of the screen, a little larger as it comes
    const k = s.drop
    const big = 1 + (1 - k) * 0.6
    y = y * k + (-len * big) * (1 - k) + Math.sin(t * 2.1) * 0.6
    // jetting off to the right: turning to face it, then away faster and faster
    x += sc.x * BW
    rot += sc.turn * Math.PI / 2
    const wid = len * 40 / 56
    if (ground && k > 0.2 && sc.anchor < 1) {
      g.globalAlpha = 0.3 * k * (0.6 + 0.4 * (1 - s.alt / 10)) * (1 - sc.anchor)
      g.fillStyle = '#101810'
      g.beginPath(); g.ellipse(ground[0], ground[1], wid * 0.34, len * 0.3 * Math.min(1, 0.35 + Math.sin(cam.pitch)), s.yaw - cam.yaw, 0, 7); g.fill()
      g.globalAlpha = 1
    }
    const turning = t < CUES.landed + 1.5 || t >= CUES.flyAgain
    const frame = turning ? Math.floor(t * 18) % 2 : 0
    g.save()
    g.translate(Math.round(x), Math.round(y))
    // the streaks it leaves going off
    if (sc.x > 0.01) {
      g.strokeStyle = 'rgba(200,230,255,.5)'; g.lineWidth = 1
      for (let i = 0; i < 6; i++) { const off = (i - 2.5) * wid * 0.18; const l = len * (1 + sc.x * 8) * (0.6 + 0.4 * ((i * 7) % 3) / 2); g.beginPath(); g.moveTo(-len * 0.4, off); g.lineTo(-len * 0.4 - l, off); g.stroke() }
    }
    g.rotate(rot)
    // the jets: two flames from the stern, longer as it goes
    const jet = jetsAt(t)
    if (jet > 0) {
      g.save(); g.globalCompositeOperation = 'lighter'
      const fl0 = len * (0.28 + 0.08 * Math.sin(t * 40)) * jet * (1 + sc.x * 6)
      for (const dx of [-wid * 0.2, wid * 0.2]) {
        const sy = len * 0.4
        const grad = g.createLinearGradient(0, sy, 0, sy + fl0)
        grad.addColorStop(0, 'rgba(255,255,230,1)'); grad.addColorStop(0.3, 'rgba(255,190,70,.95)'); grad.addColorStop(0.7, 'rgba(255,90,30,.6)'); grad.addColorStop(1, 'rgba(120,60,255,0)')
        g.fillStyle = grad
        g.beginPath(); g.moveTo(dx - wid * 0.09, sy); g.lineTo(dx + wid * 0.09, sy); g.lineTo(dx, sy + fl0); g.closePath(); g.fill()
      }
      g.restore()
      // the jet engines themselves, under the outriggers
      g.fillStyle = '#4a4a52'
      for (const dx of [-wid * 0.2, wid * 0.2]) g.fillRect(Math.round(dx - wid * 0.08), Math.round(len * 0.3), Math.max(2, Math.round(wid * 0.16)), Math.max(2, Math.round(len * 0.12 * jet)))
    }
    g.drawImage(ships[frame], -wid * big / 2, -len * big / 2, wid * big, len * big)
    // the bubble round it, with a sheen going round
    const bub = bubbleAt(t)
    if (bub > 0) {
      const r = len * 0.72 * (0.6 + 0.4 * bub)
      g.fillStyle = `rgba(140,220,255,${(0.14 * bub).toFixed(3)})`; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill()
      g.strokeStyle = `rgba(190,240,255,${(0.75 * bub).toFixed(3)})`; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke()
      g.strokeStyle = `rgba(255,255,255,${(0.8 * bub).toFixed(3)})`; g.lineWidth = 2
      g.beginPath(); g.arc(0, 0, r * 0.82, -2.5, -1.7); g.stroke()
      const a = t * 1.7
      g.strokeStyle = `rgba(200,250,255,${(0.5 * bub).toFixed(3)})`; g.lineWidth = 1
      g.beginPath(); g.arc(0, 0, r * 0.95, a, a + 0.8); g.stroke()
    }
    g.restore()
  }

  // ---- space: the stars and planets behind the folding world (never pitch black), and
  // drifting past once the ship flies on through it
  const starField = Array.from({ length: 300 }, (_, i) => { const v = Math.sin(i * 41.3) * 9871.7, w = Math.sin(i * 77.9) * 5413.3, z = Math.sin(i * 13.1) * 3217.9; return { x: v - Math.floor(v), y: w - Math.floor(w), z: z - Math.floor(z) } })
  function drawSpace (t, a) {
    if (a <= 0) return
    const drift = Math.max(0, t - CUES.jets) * 0.006
    g.save()
    g.globalAlpha = a
    // two faint nebulae
    for (const [nx, ny, nr, c] of [[0.28, 0.32, 0.5, '90,50,140'], [0.75, 0.7, 0.45, '30,80,140']]) {
      const cx = (((nx - drift * 0.3) % 1.4) + 1.4) % 1.4 * BW, cy = ny * BH
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, nr * BH)
      gr.addColorStop(0, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`)
      g.fillStyle = gr; g.fillRect(0, 0, BW, BH)
    }
    // the stars, the near ones drifting faster
    for (const [i, st] of starField.entries()) {
      const x = ((((st.x - drift * (0.4 + st.z)) % 1) + 1) % 1) * BW, y = st.y * BH
      g.globalAlpha = a * (0.35 + 0.65 * st.z) * (0.75 + 0.25 * Math.sin(t * 3 + i))
      g.fillStyle = st.z > 0.9 ? '#ffe8c0' : st.z > 0.8 ? '#c8dcff' : '#ffffff'
      g.fillRect(x | 0, y | 0, st.z > 0.85 ? 2 : 1, st.z > 0.85 ? 2 : 1)
    }
    g.globalAlpha = a
    // a ringed gas giant, a small blue moon, a far red world
    const px = (f, sp) => ((((f + 0.25 - drift * sp) % 1.5) + 1.5) % 1.5 - 0.25) * BW   // f: across the screen at the fold
    planet(px(0.84, 0.12), BH * 0.4, BH * 0.1, ['#d8a860', '#b8783a', '#e8c890', '#a86a30'], true)
    planet(px(0.14, 0.2), BH * 0.74, BH * 0.045, ['#5a8ad0', '#3a6ab0', '#8ab4e8'], false)
    planet(px(0.2, 0.05), BH * 0.18, BH * 0.018, ['#c85a40', '#a04030'], false)
    g.restore()
  }
  function planet (x, y, r, bands, ring) {
    if (ring) { g.strokeStyle = 'rgba(230,210,170,.55)'; g.lineWidth = Math.max(1, r * 0.08); g.beginPath(); g.ellipse(x, y, r * 1.9, r * 0.45, -0.35, Math.PI, Math.PI * 2); g.stroke() }
    g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip()
    for (let i = 0; i < 9; i++) { g.fillStyle = bands[i % bands.length]; g.fillRect(x - r, y - r + i * r * 2 / 9, r * 2, r * 2 / 9 + 1) }
    const sh = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r * 1.1)
    sh.addColorStop(0, 'rgba(255,255,255,.15)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,20,.7)')
    g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2)
    g.restore()
    if (ring) { g.strokeStyle = 'rgba(240,220,180,.75)'; g.lineWidth = Math.max(1, r * 0.08); g.beginPath(); g.ellipse(x, y, r * 1.9, r * 0.45, -0.35, 0, Math.PI); g.stroke() }
  }

  // ---- snow falling over the north
  const flakes = Array.from({ length: 320 }, (_, i) => { const v = Math.sin(i * 91.7) * 43758.5; const w = Math.sin(i * 12.3) * 9631.1; return { x: v - Math.floor(v), y: w - Math.floor(w), z: (i % 7) / 7 } })
  function drawSnow (t, amount) {
    if (amount <= 0.01) return
    g.fillStyle = '#ffffff'
    const n = Math.floor(flakes.length * amount)
    for (let i = 0; i < n; i++) {
      const d = flakes[i]
      g.globalAlpha = 0.45 + 0.5 * d.z
      const x = ((d.x + Math.sin(t * 0.6 + i) * 0.01 + t * 0.012 * (1 + d.z) + 1) % 1) * BW
      const y = ((d.y + t * (0.08 + 0.1 * d.z)) % 1) * BH
      g.fillRect(x | 0, y | 0, d.z > 0.6 ? 2 : 1, d.z > 0.6 ? 2 : 1)
    }
    g.globalAlpha = 1
  }

  function frame (t) {
    const fade = sceneFade(t)
    hi.style.opacity = String(1 - fade.world)
    if (fade.world < 1) {
      // the walk, then the throne room; the dark between them
      h.fillStyle = '#000'; h.fillRect(0, 0, hi.width, hi.height)
      if (t < CUES.throneFrom) { scenes.walk(t); veil(1 - fade.walk / Math.max(1e-6, 1 - fade.world)) }
      else if (t < CUES.energy) { scenes.throne(t); veil(1 - fade.throne) }
      // the reels, then the game table under them as they fade
      else if (t < CUES.tableFrom - 0.2) scenes.reels(t)
      else {
        scenes.table(t)
        const r = reelsAt(t).show
        if (r > 0) { h.globalAlpha = r; scenes.reels(t); h.globalAlpha = 1 }
      }
    }
    if (fade.world <= 0) return
    const cam = cameraAt(t)
    const B = basis(cam)
    const unfold = unfoldAt(t)
    if (cubeView(t)) drawCube(B, unfold, t)
    else {
      const haze = mixRgb(rgb('#b8d0e4'), rgb('#e6ecf2'), snowAt(cam.target[1]))
      drawGround(B, t, worldAt(t), haze)
    }
    drawShip(B, cam, t)
    if (!cubeView(t)) drawSnow(t, snowAt(cam.target[1]))
    // out of the clash's white light, back over the world
    const w = 1 - Math.min(1, Math.max(0, (t - CUES.flyAgain) / 1.4))
    if (t >= CUES.flyAgain && w > 0) { g.fillStyle = `rgba(255,252,240,${w.toFixed(3)})`; g.fillRect(0, 0, BW, BH) }
  }

  function veil (a) { if (a > 0.001) { h.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`; h.fillRect(0, 0, hi.width, hi.height) } }

  // ---- the clock: the song's time while it plays; the wall clock otherwise
  const start = startSecond()
  let wall0 = performance.now() - start * 1000
  let sought = start === 0
  let following = true
  let skipped = false, done = false
  const t0 = performance.now()
  let gate = null
  const wantSong = music?.on?.() ?? false
  const frozen = frozenSecond()
  const now = () => {
    if (skipped) return END
    if (frozen !== null) return frozen
    const song = following ? (music?.time?.() ?? null) : null
    if (song !== null) {
      gate?.remove(); gate = null
      if (!sought) { sought = true; music.seek(start); wall0 = performance.now() - start * 1000; return start }
      // a song that would not seek (or stalls) is left to itself: the wall clock goes on
      const wall = (performance.now() - wall0) / 1000
      if (Math.abs(song - wall) > 1.5) { following = false; return wall }
      wall0 = performance.now() - song * 1000
      return song
    }
    // waiting for the song the browser has not let start: hold the first frame, and after a
    // moment ask for the press that lets it
    if (following && wantSong && !music.heard()) {
      if (!gate && performance.now() - t0 > 700) {
        gate = Object.assign(document.createElement('div'), { className: 'dw-intro-gate', textContent: 'Press any key to begin' })
        document.body.append(gate)
      }
      wall0 = performance.now() - start * 1000
      return start
    }
    return (performance.now() - wall0) / 1000
  }

  function finish () {
    if (done) return
    done = true
    menu.classList.add('dw-intro-title')
    menu.classList.remove('dw-intro')
    skipBtn.remove(); gate?.remove()
    document.removeEventListener('keydown', onKey)
    onDone?.()
  }
  function teardown () {
    removeEventListener('resize', resize)
    canvas.remove(); hi.remove()
  }
  function skip () { skipped = true; finish(); teardown() }
  skipBtn.addEventListener('click', skip)
  // (the press that lets a refused song start is not a skip)
  const onKey = e => { if (gate) return; if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); skip() } }
  document.addEventListener('keydown', onKey)

  function tick () {
    if (skipped) return
    const t = now()
    if (t >= CUES.title) menu.classList.add('dw-intro-title')
    // the menu left (Battle, Army Lists...): the picture goes with it
    if (done && menu.hidden) { teardown(); return }
    frame(t)
    if (t >= CUES.buttons) finish()   // the buttons drop in (ow.css); space drifts on behind them
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return { skip }
}
