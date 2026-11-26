// THE INTRO'S SPRITE SCENES, drawn for src/ui/intro.js: the heroes' walk to the castle between two
// lines of halberdiers, the throne room (evil heroes on the left, good heroes taking the right, the
// king raising a ball of energy that fills the screen at 1:10), the reels, and the clash on the table.
// Exports the picture lists (GOOD, EVIL, KING, the reel pools, the table's units) and the drawing
// functions intro.js calls.
//
// Drawn at the screen's full resolution (intro.js's second canvas), so the game's own unit
// pictures (/dw/images, top-down tokens facing up the picture) keep their pixels. The times and
// moves are introTimeline.js's; this file only draws them. Decoration: no game state, no dice.

import { CUES, CORRIDOR, walkAt, throneAt, reelAt, reelsAt, tableAt, REEL_STOPS, REELS, flashAt, chosenAt } from './introTimeline.js'

// the pictures used: the game's own unit pictures
export const HALBERDIERS = ['dw-emp-halberdier', 'dw-emp-halberdier-v1', 'dw-emp-halberdier-v2', 'dw-emp-halberdier-v3', 'dw-emp-halberdier-standard', 'dw-emp-halberdier-musician']
// the heroes who walk in and take the right: a leader from each of six good armies
export const GOOD = ['dw-emp-general', 'dw-dw-king', 'dw-he-prince', 'dw-brt-lord', 'dw-we-gladelord', 'dw-lz-saurushero']
// waiting on the left: a leader from each of six evil armies
export const EVIL = ['dw-og-gaffer', 'dw-woc-lord', 'dw-vc-vampire', 'dw-de-dreadlord', 'dw-sk-warlord', 'dw-bm-herdlord']
export const KING = 'dw-emp-general-great'     // drawn twice the size
export const QUEEN = 'dw-brt-prophetess'       // there is no queen picture; the Prophetess is the nearest
// part 3. The reels: every evil and every good hero and lord, a reel each side; the heads they
// stop on. (Good and evil is for the intro only: Concord Realm, Lyonne, Deephold, Ilthari,
// Lornefolk, Saurians, Jade Dominion of Shen and the Broken Crowns good; the rest evil.)
export const EVIL_HEAD = 'dw-woc-lord'
export const GOOD_HEAD = 'dw-emp-general'
export const EVIL_POOL = [EVIL_HEAD, 'dw-og-gaffer', 'dw-vc-vampire', 'dw-de-dreadlord', 'dw-sk-warlord', 'dw-bm-herdlord', 'dw-dc-prince', 'dw-cd-sorcerer', 'dw-tk-king', 'dw-vc-necromancer', 'dw-sk-seer', 'dw-de-sorceress', 'dw-woc-sorcerer', 'dw-bm-shaman']
export const GOOD_POOL = [GOOD_HEAD, 'dw-dw-king', 'dw-he-prince', 'dw-brt-lord', 'dw-we-gladelord', 'dw-lz-saurushero', 'dw-gc-lord', 'dw-ren-prince', 'dw-emp-master-mage', 'dw-he-mage', 'dw-dw-thane', 'dw-emp-priest-of-saint-halvar', 'dw-lz-skinkhero', 'dw-we-mage']
// the table: three regiments a side (champion, standard and musician in the front rank), the head
// in front, with the evil side's monsters, and two units of human knights on the good side who
// charge them.
const regiment = base => [base, `${base}-champion`, `${base}-standard`, `${base}-musician`]
export const EVIL_UNITS = ['dw-woc-warrior', 'dw-og-rukka-lad', 'dw-sk-rankrat'].map(regiment)
export const GOOD_UNITS = ['dw-emp-halberdier', 'dw-dw-warrior', 'dw-he-spearman'].map(regiment)
export const MONSTERS = ['dw-og-giant', 'dw-woc-dominion-dragon', 'dw-og-broodmaw']
export const KNIGHTS = [regiment('dw-emp-knight'), regiment('dw-brt-knight')]
export const GOOD_MONSTER = 'dw-emp-griffon-rider'
export const SCENE_SPRITES = [...new Set([...HALBERDIERS, ...GOOD, ...EVIL, KING, QUEEN, ...EVIL_POOL, ...GOOD_POOL, ...EVIL_UNITS.flat(), ...GOOD_UNITS.flat(), ...MONSTERS, ...KNIGHTS.flat(), GOOD_MONSTER])]

// a deterministic wobble (no Math.random: the same second draws the same picture)
const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v) }

export function createScenes (h, sprites, ship) {
  let W = 0, H = 0, TS = 80
  function size (w, hh) { W = w; H = hh; TS = Math.max(48, Math.round(Math.min(H / 11.5, W / 15))) }

  function token (key, x, y, rot = 0, k = 1, alpha = 1, fit = false) {
    const img = sprites[key]
    if (!img?.complete || !img.naturalWidth) return
    if (fit) k *= 80 / Math.max(img.naturalWidth, img.naturalHeight)   // (the reels: every hero one size)
    // (every picture is 2 pixels a millimetre: a 25 mm token is 80 by 80, a knight 96 by 192, so
    // its own size gives the model's size against the others)
    const sw = TS * k * img.naturalWidth / 80, sh = TS * k * img.naturalHeight / 80
    h.save()
    h.globalAlpha *= alpha   // (inside a picture that is itself fading)
    h.translate(Math.round(x), Math.round(y))
    h.rotate(rot)
    h.fillStyle = 'rgba(0,0,0,.28)'; h.beginPath(); h.ellipse(3, 5, sw * 0.36, sh * 0.3, 0, 0, 7); h.fill()
    h.drawImage(img, -sw / 2, -sh / 2, sw, sh)
    h.restore()
  }

  // ---- the walk -------------------------------------------------------------------------------
  const flakes = Array.from({ length: 220 }, (_, i) => ({ x: hash(i), y: hash(i + 500), z: hash(i + 900) }))
  function walk (t) {
    const w = walkAt(t)
    const step = TS * 0.95                       // a token's room along the corridor
    const camY = H * 0.62
    const Y = along => camY - (along - w.along) * step
    // the snow, and the stone way under it, flagstones scrolling with the walk
    h.fillStyle = '#e4eaf0'; h.fillRect(0, 0, W, H)
    for (let i = 0; i < 160; i++) {
      const gx = hash(i * 3) * W, a = hash(i * 7) * (CORRIDOR + 8) - 4
      h.fillStyle = i % 3 ? '#d2dae4' : '#f6f9fc'
      h.beginPath(); h.ellipse(gx, Y(a), TS * (0.3 + hash(i) * 0.5), TS * 0.16, 0, 0, 7); h.fill()
    }
    const pw = TS * 3.1
    h.fillStyle = '#8a8478'; h.fillRect(W / 2 - pw / 2 - 4, 0, pw + 8, H)
    for (let r = -6; r < CORRIDOR + 6; r++) {
      for (let c = 0; c < 4; c++) {
        const off = (r % 2) * 0.5
        const x0 = W / 2 - pw / 2 + ((c + off) % 4) * pw / 4
        const y0 = Y(r * 0.5) - step * 0.25
        h.fillStyle = ['#b0aa9c', '#a49e90', '#bab4a6'][Math.floor(hash(r * 5 + c) * 3)]
        h.fillRect(x0 + 2, y0 + 2, pw / 4 - 4, step * 0.5 - 4)
        if (hash(r * 11 + c) < 0.4) { h.fillStyle = 'rgba(246,249,252,.8)'; h.fillRect(x0 + 4, y0 + 3, pw / 8, 4) }
      }
    }
    // the landed airship behind them at the start
    if (ship) {
      h.save(); h.imageSmoothingEnabled = false
      const sw = TS * 3.4, sh = sw * 56 / 40
      h.drawImage(ship, W / 2 - sw / 2, Y(-2.6) - sh / 2, sw, sh)
      h.restore()
    }
    // the castle's gate wall at the end of the corridor: only the wall and the open gate
    const gy = Y(CORRIDOR + 0.6)
    if (gy > -H) {
      h.fillStyle = '#4a4740'; h.fillRect(0, gy - H, W, H)
      h.fillStyle = '#6e6b62'
      for (let x = 0; x < W; x += TS * 0.5) h.fillRect(x, gy - TS * 0.3, TS * 0.3, TS * 0.3)
      for (let y = gy - TS * 0.7; y > gy - H; y -= TS * 0.4) for (let x = ((y / (TS * 0.4)) % 2) * TS * 0.3; x < W; x += TS * 0.6) { h.fillStyle = '#56534b'; h.fillRect(x, y, TS * 0.56, TS * 0.36) }
      h.fillStyle = '#0c0a08'; h.beginPath(); h.roundRect(W / 2 - pw * 0.42, gy - TS * 1.8, pw * 0.84, TS * 1.8, [pw * 0.42, pw * 0.42, 0, 0]); h.fill()
      h.fillStyle = '#7a5634'; h.fillRect(W / 2 - pw * 0.42, gy - 6, pw * 0.84, 8)
    }
    // the two lines: halberdiers either side, facing in
    for (let r = 0; r <= CORRIDOR; r++) {
      const y = Y(r)
      if (y < -TS || y > H + TS) continue
      const breathe = Math.sin(t * 1.8 + r) * 0.02
      token(HALBERDIERS[r % 4 === 2 ? 4 : r % 4 === 0 ? (r % 8 ? 5 : 0) : r % 4], W / 2 - pw / 2 - TS * 0.6, y, Math.PI / 2 + breathe)
      token(HALBERDIERS[(r + 2) % 4 === 2 ? 4 : (r + 1) % 4], W / 2 + pw / 2 + TS * 0.6, y, -Math.PI / 2 - breathe)
    }
    // the heroes, in pairs, walking: a bob and a sway to each step
    GOOD.forEach((key, i) => {
      const pair = Math.floor(i / 2), side = i % 2 ? 1 : -1
      const a = w.along - pair * 1.25
      if (a > CORRIDOR + 0.6) return
      const ph = w.step + i * 1.7
      token(key, W / 2 + side * TS * 0.62, Y(a) + Math.abs(Math.sin(ph)) * -4, Math.sin(ph) * 0.06)
    })
    // falling snow
    h.fillStyle = '#ffffff'
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i]
      h.globalAlpha = 0.5 + 0.5 * f.z
      const x = ((f.x + t * 0.01 * (1 + f.z) + Math.sin(t * 0.7 + i) * 0.006) % 1) * W
      const y = ((f.y + t * (0.07 + 0.08 * f.z)) % 1) * H
      const s = 2 + Math.round(f.z * 3)
      h.fillRect(x, y, s, s)
    }
    h.globalAlpha = 1
    // the gate's dark coming up as they go in
    if (t > CUES.gate) { h.fillStyle = `rgba(0,0,0,${Math.min(1, (t - CUES.gate) / 1.2)})`; h.fillRect(0, 0, W, H) }
  }

  // ---- the throne room ------------------------------------------------------------------------
  function throne (t) {
    const s = throneAt(t)
    h.save()
    // in a little closer as it goes on, towards the dais
    const fx = W / 2, fy = H * 0.3
    h.translate(fx, fy); h.scale(s.zoom, s.zoom); h.translate(-fx, -fy)
    // the floor: dark and light flagstones
    const tile = TS * 0.8
    for (let y = -tile; y < H + tile; y += tile) for (let x = 0; x < W + tile; x += tile) {
      const k = (Math.floor(x / tile) + Math.floor(y / tile)) % 2
      h.fillStyle = k ? '#45403a' : '#3a3530'; h.fillRect(x, y, tile, tile)
      h.fillStyle = 'rgba(255,255,255,.04)'; h.fillRect(x + 2, y + 2, tile - 4, 3)
    }
    // (the dais below the title, which stays at the top of the screen)
    const top = H * 0.16, daisY = H * 0.23, daisH = TS * 1.9
    // the carpet up the middle
    const cw = TS * 1.7
    h.fillStyle = '#c9a040'; h.fillRect(W / 2 - cw / 2 - 5, daisY, cw + 10, H)
    h.fillStyle = '#7a1c1c'; h.fillRect(W / 2 - cw / 2, daisY, cw, H)
    h.fillStyle = '#9a2a24'; for (let y = daisY + 20; y < H; y += TS * 0.8) h.fillRect(W / 2 - 8, y, 16, 16)
    // the end wall with its banners
    h.fillStyle = '#26221e'; h.fillRect(0, 0, W, top)
    h.fillStyle = '#4a4740'; for (let x = 0; x < W; x += TS * 0.6) h.fillRect(x, top - 10, TS * 0.56, 8)
    const banners = ['#7a1c1c', '#2a4a8a', '#e8d050', '#2a4a8a', '#7a1c1c']
    banners.forEach((c, i) => {
      const bx = W * (0.18 + i * 0.16), bw = TS * 0.7
      const sway = Math.sin(t * 0.8 + i) * 2
      h.fillStyle = c; h.beginPath(); h.moveTo(bx - bw / 2, 0); h.lineTo(bx + bw / 2, 0); h.lineTo(bx + bw / 2 + sway, top + TS * 0.9); h.lineTo(bx + sway, top + TS * 0.6); h.lineTo(bx - bw / 2 + sway, top + TS * 0.9); h.closePath(); h.fill()
      h.fillStyle = 'rgba(0,0,0,.25)'; h.fillRect(bx - bw / 2, 0, bw, 6)
    })
    // the dais and its steps, the two thrones
    const dw = TS * 6
    for (let k = 2; k >= 0; k--) { h.fillStyle = ['#8a8478', '#9a958a', '#aaa498'][k]; h.fillRect(W / 2 - dw / 2 - k * 14, daisY, dw + k * 28, daisH + k * 12) }
    for (const dx of [-0.85, 0.85]) {
      const tx = W / 2 + dx * TS
      h.fillStyle = '#3a2a18'; h.fillRect(tx - TS * 0.62, daisY - TS * 0.1, TS * 1.24, TS * 0.5)
      h.fillStyle = '#c9a040'; h.fillRect(tx - TS * 0.62, daisY - TS * 0.1, TS * 1.24, 5)
      h.fillStyle = '#7a1c1c'; h.fillRect(tx - TS * 0.45, daisY + TS * 0.3, TS * 0.9, TS * 0.8)
    }
    // pillars down both sides
    for (let y = H * 0.4; y < H + TS; y += TS * 1.9) {
      for (const px of [W * 0.07, W * 0.93]) {
        h.fillStyle = 'rgba(0,0,0,.35)'; h.beginPath(); h.arc(px + 6, y + 8, TS * 0.5, 0, 7); h.fill()
        const g = h.createRadialGradient(px - TS * 0.15, y - TS * 0.15, 2, px, y, TS * 0.5)
        g.addColorStop(0, '#aaa498'); g.addColorStop(1, '#5a564e')
        h.fillStyle = g; h.beginPath(); h.arc(px, y, TS * 0.5, 0, 7); h.fill()
      }
    }
    // the evil heroes on the left, already there, facing across the hall
    const rows = EVIL.length
    const slotY = i => daisY + daisH + TS * 0.7 + i * ((H * 0.97 - daisY - daisH - TS * 0.7) / rows)
    const leftX = W / 2 - Math.max(W * 0.2, TS * 2.6), rightX = W / 2 + Math.max(W * 0.2, TS * 2.6)
    EVIL.forEach((key, i) => token(key, leftX - (i % 2) * TS * 0.9, slotY(i), Math.PI / 2 + Math.sin(t * 1.3 + i) * 0.03))
    // the good heroes: up the carpet in their pairs, then aside to the right, then turning to face them
    GOOD.forEach((key, i) => {
      const pair = Math.floor(i / 2), side = i % 2 ? 1 : -1
      const startY = H + TS * (1 + pair * 1.3)
      const k = Math.max(0, Math.min(1, s.enter * 1.25 - pair * 0.12))
      const walkY = startY + (slotY(i) - startY) * k
      const x = W / 2 + side * TS * 0.55 + (rightX + (i % 2) * TS * 0.9 - (W / 2 + side * TS * 0.55)) * s.aside
      const moving = (k > 0 && k < 1) || (s.aside > 0 && s.aside < 1)
      const bob = moving ? Math.sin(t * 9 + i) * 0.06 : 0
      token(key, x, walkY, -Math.PI / 2 * s.turn + bob)
    })
    // the king and his wife on their thrones, facing down the hall
    token(QUEEN, W / 2 + 0.85 * TS, daisY + TS * 0.62, Math.PI, 1.4)
    token(KING, W / 2 - 0.85 * TS, daisY + TS * 0.62, Math.PI, 2)
    // braziers: their fire, and the warm light they throw
    for (const [bx, by] of [[W / 2 - dw / 2 - TS * 0.6, daisY + daisH * 0.6], [W / 2 + dw / 2 + TS * 0.6, daisY + daisH * 0.6], [W * 0.07, H * 0.4 - TS], [W * 0.93, H * 0.4 - TS]]) {
      const fl = 0.85 + 0.15 * Math.sin(t * 11 + bx) * Math.sin(t * 7.3 + by)
      h.save(); h.globalCompositeOperation = 'lighter'
      const g = h.createRadialGradient(bx, by, 0, bx, by, TS * 2.4 * fl)
      g.addColorStop(0, 'rgba(255,170,70,.35)'); g.addColorStop(1, 'rgba(255,120,40,0)')
      h.fillStyle = g; h.fillRect(bx - TS * 2.5, by - TS * 2.5, TS * 5, TS * 5)
      h.restore()
      h.fillStyle = '#3a3430'; h.beginPath(); h.arc(bx, by, TS * 0.32, 0, 7); h.fill()
      h.fillStyle = '#ff9a30'; h.beginPath(); h.arc(bx, by, TS * 0.22 * fl, 0, 7); h.fill()
      h.fillStyle = '#ffe080'; h.beginPath(); h.arc(bx, by, TS * 0.1 * fl, 0, 7); h.fill()
    }
    // the room darkens as the king gathers the energy
    if (s.gather > 0) { h.fillStyle = `rgba(10,6,20,${0.45 * s.gather})`; h.fillRect(-W, -H, W * 3, H * 3) }
    // the ball of energy, held before the king, crackling
    if (s.ball > 0) {
      const bx = W / 2 - 0.85 * TS, by = daisY + TS * 1.75
      const r = Math.max(2, s.ball * H) * (1 + 0.06 * Math.sin(t * 23))
      h.save(); h.globalCompositeOperation = 'lighter'
      const g = h.createRadialGradient(bx, by, 0, bx, by, r * 1.8)
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,236,160,.95)'); g.addColorStop(0.6, 'rgba(120,200,255,.55)'); g.addColorStop(1, 'rgba(80,120,255,0)')
      h.fillStyle = g; h.beginPath(); h.arc(bx, by, r * 1.8, 0, 7); h.fill()
      // the lightning round it: new forks twelve times a second
      const seed = Math.floor(t * 12)
      h.strokeStyle = 'rgba(210,235,255,.9)'; h.lineWidth = 2
      for (let k = 0; k < 7; k++) {
        let a = hash(seed * 13 + k) * Math.PI * 2, d = r * 0.6
        h.beginPath(); h.moveTo(bx + Math.cos(a) * d, by + Math.sin(a) * d)
        for (let j = 0; j < 5; j++) { a += (hash(seed * 31 + k * 7 + j) - 0.5) * 0.9; d += r * 0.28; h.lineTo(bx + Math.cos(a) * d, by + Math.sin(a) * d) }
        h.stroke()
      }
      h.restore()
    }
    h.restore()
    if (s.white > 0) { h.fillStyle = `rgba(255,248,226,${s.white})`; h.fillRect(0, 0, W, H) }
  }

  // ---- the reels: the screen split, four reels a side stopping one by one ------------------
  // No machine round them: four columns of heroes a side running down the screen, stopping one
  // after another, the last at 1:30 on the side's head. The order they stop in, by
  // column: the outer one, the inner one, the second, then the third, the head's (mirrored on the
  // good side, so the two heads stop either side of the middle). Each reel has its own order of
  // the pool (a fixed shuffle); the first three stop on lieutenants, the last on the head.
  const COLUMN_OF_STOP = [0, 3, 1, 2]
  const strips = side => Array.from({ length: REELS }, (_, r) => {
    const pool = side ? GOOD_POOL : EVIL_POOL
    const head = side ? GOOD_HEAD : EVIL_HEAD
    const order = pool.map((k, i) => ({ k, w: hash(i * 17 + r * 101 + side * 7) })).sort((a, b) => a.w - b.w).map(o => o.k)
    const stopOn = order.indexOf(r === REELS - 1 ? head : pool[1 + r])
    return { order, stopOn }
  })
  const STRIPS = [strips(0), strips(1)]
  function reels (t) {
    const s = reelsAt(t)
    const half = W / 2
    for (const side of [0, 1]) {
      const x0 = side * half
      // the two halves: evil dark red, good dark blue
      const g = h.createLinearGradient(x0, 0, x0, H)
      g.addColorStop(0, side ? '#0a1428' : '#1e0606'); g.addColorStop(1, side ? '#1a3462' : '#4e1010')
      h.fillStyle = g; h.fillRect(x0, 0, half, H)
      const rowH = TS * 1.45, mid = H * 0.58
      for (let r = 0; r < REELS; r++) {
        const strip = STRIPS[side][r]
        const n = strip.order.length
        const final = n * 6 + strip.stopOn
        const pos = reelAt(t, r, final, side)
        const speed = Math.abs(reelAt(t + 0.02, r, final, side) - pos) / 0.02
        const stopAt = REEL_STOPS[side][r]
        const stopped = t >= stopAt
        const col = side ? 3 - COLUMN_OF_STOP[r] : COLUMN_OF_STOP[r]
        const cx = x0 + half * (0.16 + col * 0.227)
        const base = Math.floor(pos)
        for (let i = base - 5; i <= base + 5; i++) {
          const key = strip.order[((i % n) + n) % n]
          const y = mid + (pos - i) * rowH
          if (y < -rowH || y > H + rowH) continue
          const onLine = stopped && i === Math.round(pos)
          if (speed > 3) {
            // a blur of copies while it spins fast
            token(key, cx, y - rowH * 0.2, 0, 1, 0.3, true); token(key, cx, y + rowH * 0.2, 0, 1, 0.3, true)
            token(key, cx, y, 0, 1, 0.55, true)
          } else {
            // once stopped, the one it stopped on lit and larger, the rest dimmed
            const lit = onLine ? Math.min(1, (t - stopAt) / 0.3) : 0
            const big = r === REELS - 1 && onLine ? 1 + 0.8 * chosenAt(t, side) : 1 + 0.25 * lit
            if (onLine) {
              h.save(); h.globalCompositeOperation = 'lighter'
              const gg = h.createRadialGradient(cx, y, 0, cx, y, TS * big)
              gg.addColorStop(0, side ? 'rgba(120,170,255,.55)' : 'rgba(255,90,60,.55)'); gg.addColorStop(1, 'rgba(0,0,0,0)')
              h.globalAlpha *= lit; h.fillStyle = gg; h.fillRect(cx - TS * 2, y - TS * 2, TS * 4, TS * 4)
              h.restore()
            }
            token(key, cx, y, 0, big, stopped && !onLine ? 0.35 : 1, true)
            if (onLine) burst(cx, y, flashAt(t, side, r), r === REELS - 1, side)
          }
        }
      }
      // the columns fade out at the top and bottom of the screen
      const fade = h.createLinearGradient(0, 0, 0, H)
      fade.addColorStop(0, side ? 'rgba(10,20,40,1)' : 'rgba(30,6,6,1)'); fade.addColorStop(0.24, 'rgba(0,0,0,0)')
      fade.addColorStop(0.86, 'rgba(0,0,0,0)'); fade.addColorStop(1, side ? 'rgba(26,52,98,1)' : 'rgba(78,16,16,1)')
      h.fillStyle = fade; h.fillRect(x0, 0, half, H)
    }
    // the split down the middle
    h.fillStyle = '#d2a94b'; h.fillRect(W / 2 - 2, 0, 4, H)
    // a head chosen: its half flashes white for a moment
    for (const side of [0, 1]) {
      const f = flashAt(t, side, REELS - 1)
      if (f > 0) { h.fillStyle = `rgba(255,250,235,${(f * f * 0.75).toFixed(3)})`; h.fillRect(side * W / 2, 0, W / 2, H) }
    }
    if (s.white > 0) { h.fillStyle = `rgba(255,248,226,${s.white})`; h.fillRect(0, 0, W, H) }
  }

  // the flash when a reel stops on someone: a white bloom, a ring going out and rays turning;
  // larger for a head
  function burst (x, y, f, head, side) {
    if (f <= 0) return
    const k = 1 - f, R = TS * (head ? 2.6 : 1.5)
    h.save(); h.globalCompositeOperation = 'lighter'
    const g = h.createRadialGradient(x, y, 0, x, y, R * (0.5 + k))
    g.addColorStop(0, `rgba(255,255,255,${f})`); g.addColorStop(0.4, side ? `rgba(150,200,255,${f * 0.8})` : `rgba(255,160,90,${f * 0.8})`); g.addColorStop(1, 'rgba(0,0,0,0)')
    h.fillStyle = g; h.beginPath(); h.arc(x, y, R * (0.5 + k), 0, 7); h.fill()
    h.strokeStyle = `rgba(255,248,220,${f})`; h.lineWidth = 3 + 4 * f
    h.beginPath(); h.arc(x, y, R * (0.3 + 1.2 * k), 0, 7); h.stroke()
    h.lineWidth = 2
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + k * 1.2
      const r0 = R * (0.35 + k * 0.6), r1 = R * (0.8 + k * 1.4) * (i % 2 ? 0.7 : 1)
      h.beginPath(); h.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); h.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); h.stroke()
    }
    h.restore()
  }

  // ---- the game table: floating above the clouds rather than on a brown ground; the armies fade
  // on, the evil monsters and the knights who charge them; they clash and go to white -----------
  const clouds = Array.from({ length: 26 }, (_, i) => ({ x: hash(i * 3 + 1), y: hash(i * 5 + 2), v: 0.004 + hash(i) * 0.01, n: 5 + Math.floor(hash(i * 9) * 5), w: 0.05 + hash(i * 13) * 0.07 }))
  function sky (t) {
    const g = h.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#4b86c8'); g.addColorStop(0.55, '#74a8dc'); g.addColorStop(1, '#9cc8ec')
    h.fillStyle = g; h.fillRect(-20, -20, W + 40, H + 40)
    for (const [i, c] of clouds.entries()) {
      const cx = (((c.x + t * c.v) % 1.3) - 0.15) * W, cy = c.y * H
      for (let k = 0; k < c.n; k++) {
        const dx = (hash(i * 31 + k) - 0.5) * c.w * W * 2, dy = (hash(i * 37 + k) - 0.5) * c.w * W * 0.6, r = (0.4 + hash(i * 41 + k) * 0.6) * c.w * W * 0.5
        h.fillStyle = '#b9c9dc'; h.beginPath(); h.arc(cx + dx, cy + dy + r * 0.2, r, 0, 7); h.fill()
        h.fillStyle = '#f4f7fb'; h.beginPath(); h.arc(cx + dx, cy + dy, r * 0.92, 0, 7); h.fill()
      }
    }
  }
  function table (t) {
    const s = tableAt(t)
    const th = H * 0.8, ty = H * 0.17, tw = W * 0.92, tx = W * 0.04
    const u = Math.min(TS * 0.55, th * 0.3 / 5.6)   // a 25 mm model's room: five files fit a third of the table
    const k = u / TS
    // the shake while they fight
    const shake = s.fight > 0 && s.white < 0.9 ? 4 * Math.exp(-s.fight * 0.6) : 0
    h.save()
    h.translate(Math.sin(t * 61) * shake, Math.cos(t * 47) * shake)
    sky(t)
    // the table: its shadow on the clouds, the earth it floats on, the felt and its 6-inch grid
    h.fillStyle = 'rgba(20,30,60,.22)'; h.fillRect(tx + 30, ty + 40, tw, th)
    h.fillStyle = '#6b4a2e'; h.beginPath(); h.moveTo(tx, ty + th)
    for (let x = 0; x <= tw; x += tw / 24) h.lineTo(tx + x, ty + th + 16 + 14 * Math.abs(Math.sin(x * 0.03)))
    h.lineTo(tx + tw, ty + th); h.fill()
    h.fillStyle = '#583b24'; h.fillRect(tx + tw, ty + 8, 10, th)
    h.fillStyle = '#4f6a32'; h.fillRect(tx - 3, ty - 3, tw + 6, th + 6)
    h.fillStyle = '#3b4a35'; h.fillRect(tx, ty, tw, th)
    const sq = th / 8
    h.strokeStyle = 'rgba(0,0,0,.16)'; h.lineWidth = 1
    for (let x = tx; x <= tx + tw; x += sq) { h.beginPath(); h.moveTo(x, ty); h.lineTo(x, ty + th); h.stroke() }
    for (let y = ty; y <= ty + th; y += sq) { h.beginPath(); h.moveTo(tx, y); h.lineTo(tx + tw, y); h.stroke() }

    const rowsY = [ty + th * 0.2, ty + th * 0.5, ty + th * 0.8]
    const laneY = [ty + th * 0.2, ty + th * 0.5, ty + th * 0.8]
    const jitter = (i, a) => s.fight > 0 ? (hash(i + Math.floor(t * 10) * 31) - 0.5) * a : 0
    const at = (side, from, to, c) => { const dir = side ? -1 : 1; const x = W / 2 - dir * from * W; return x + dir * (from - to) * W * c }
    // the regiments at the back, five files by three ranks, advancing a little
    const block = (units, side, b, alpha) => {
      if (alpha <= 0) return
      const dir = side ? -1 : 1
      const bx = at(side, 0.33, 0.24, s.charge)
      const by = rowsY[b]
      for (let rank = 0; rank < 3; rank++) for (let file = 0; file < 5; file++) {
        const key = rank === 0 && file > 0 && file < 4 ? units[b][file] : units[b][0]
        const i = side * 1000 + b * 100 + rank * 10 + file
        token(key, bx + dir * (1 - rank) * u + jitter(i, 5), by + (file - 2) * u + jitter(i + 7, 5), dir * Math.PI / 2, k, alpha)
      }
    }
    for (let b = 0; b < 3; b++) { block(EVIL_UNITS, 0, b, s.unit(b * 2)); block(GOOD_UNITS, 1, b, s.unit(b * 2 + 1)) }
    // the evil monsters in front: the Giant, the Dominion Dragon behind the head, the Broodmaw
    const monsterX = [at(0, 0.18, 0.045, s.charge), at(0, 0.24, 0.16, s.charge), at(0, 0.18, 0.045, s.charge)]
    MONSTERS.forEach((key, i) => {
      const lane = i === 1 ? laneY[1] : laneY[i]
      token(key, monsterX[i] + jitter(300 + i, 7), lane + jitter(310 + i, 7), Math.PI / 2 + Math.sin(t * 1.6 + i) * 0.03, k, s.unit(i === 1 ? 6 : i * 2 + 0.5))
    })
    // the good side's griffon behind its head
    token(GOOD_MONSTER, at(1, 0.24, 0.16, s.charge) + jitter(320, 7), laneY[1] + jitter(321, 7), -Math.PI / 2 + Math.sin(t * 2.1) * 0.03, k, s.unit(6.5))
    // the knights: five abreast in one rank, opposite the Giant and the Broodmaw, and they CHARGE
    // them: from their line nearly to the monsters' front, the fastest thing on the table
    const ride = s.charge * s.charge * (3 - 2 * s.charge)
    KNIGHTS.forEach((unit, j) => {
      const lane = laneY[j ? 2 : 0]
      const kx = at(1, 0.2, 0.0 - 0.012, ride)
      const a = s.unit(j ? 5.5 : 1.5)
      for (let file = 0; file < 5; file++) {
        const key = file > 0 && file < 4 ? unit[file] : unit[0]
        const gallop = s.charge > 0 && s.charge < 1 ? Math.sin(t * 22 + file) * 3 : 0
        token(key, kx + gallop + jitter(400 + j * 10 + file, 6), lane + (file - 2) * u * 1.2 + jitter(410 + j * 10 + file, 6), -Math.PI / 2, k, a)
      }
    })
    // the two heads, who meet in the middle
    const headX = side => { const dir = side ? -1 : 1; const from = W / 2 - dir * W * 0.11; return from + (W / 2 - dir * 0.6 * u - from) * s.charge }
    token(EVIL_HEAD, headX(0) + jitter(5, 8), laneY[1] + jitter(6, 8), Math.PI / 2, k * 1.2, s.unit(7))
    token(GOOD_HEAD, headX(1) + jitter(8, 8), laneY[1] + jitter(9, 8), -Math.PI / 2, k * 1.2, s.unit(7))
    // the fighting: flashes of steel along the line where they meet
    if (s.fight > 0) {
      const seed = Math.floor(t * 14)
      h.save(); h.globalCompositeOperation = 'lighter'
      for (let q = 0; q < 12; q++) {
        const fx = W / 2 + (hash(seed * 7 + q) - 0.5) * u * 3
        const fy = laneY[Math.floor(hash(seed * 3 + q) * 3)] + (hash(seed * 11 + q) - 0.5) * u * 5
        const r = u * (0.3 + hash(seed + q * 5) * 0.5)
        const g = h.createRadialGradient(fx, fy, 0, fx, fy, r)
        g.addColorStop(0, 'rgba(255,255,230,.95)'); g.addColorStop(1, 'rgba(255,190,80,0)')
        h.fillStyle = g; h.beginPath(); h.arc(fx, fy, r, 0, 7); h.fill()
      }
      h.restore()
      h.fillStyle = 'rgba(200,190,160,.18)'
      for (let q = 0; q < 16; q++) { const a = hash(q * 13) * 6.3; h.beginPath(); h.arc(W / 2 + Math.cos(a + t) * u * 2.5, ty + th * hash(q * 5), u * (0.6 + s.fight * 0.3), 0, 7); h.fill() }
    }
    h.restore()
    // the white light, out from where they meet, until it is all there is
    if (s.white > 0) {
      h.save(); h.globalCompositeOperation = 'lighter'
      const r = Math.hypot(W, H) * s.white * 1.2
      const g = h.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(1, r))
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.7, 'rgba(255,248,226,.9)'); g.addColorStop(1, 'rgba(255,248,226,0)')
      h.fillStyle = g; h.fillRect(0, 0, W, H)
      h.restore()
      if (s.white > 0.85) { h.fillStyle = `rgba(255,252,240,${(s.white - 0.85) / 0.15})`; h.fillRect(0, 0, W, H) }
    }
  }

  return { size, walk, throne, reels, table }
}
