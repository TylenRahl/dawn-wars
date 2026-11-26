// The table, drawn with PixiJS. The engine works in inches; this file is the only place an
// inch becomes a pixel (`ppi`, pixels per inch, which the zoom changes).
//
// Exports createBoard(host, game, handlers), used by ui/battle.js and the map editor. It draws and
// it reports clicks. It decides nothing: the battle screen (ui/battle.js, ui/phases.js) turns a
// click into a call on the engine.

import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import { TABLE, deployZone, onTable } from '../rules/game.js'
import { corners, modelSlots, isDead } from '../rules/units.js'
import { spriteKey, crewKey } from './spriteMap.js'
import { contactLines, drawDust } from './dust.js'
import { slotsWithJoined } from './joinedSlots.js'
import { createShotFx } from './shotFx.js'
import { createSpellFx } from './spellFx.js'
import { forDisplay } from '../rules/displayNames.js'

const SIDE_COLOUR = [0x4a8ee8, 0xe05a48]
const FELT = 0x3b4a35

export async function createBoard (host, game, handlers) {
  const app = new Application()
  await app.init({ background: '#0e0c0a', resizeTo: host, antialias: true })
  host.append(app.canvas)
  app.canvas.addEventListener('contextmenu', e => e.preventDefault())

  // the pictures
  let manifest = null
  const textures = {}
  try {
    manifest = await (await fetch('/dw/images/manifest.json')).json()
    await Promise.all(Object.entries(manifest).map(async ([k, v]) => {
      try {
        textures[k] = await Assets.load(`/dw/images/${v.file}`)
        // mip levels, so a picture drawn smaller than its pixels can be blended down (pictureFilter below)
        textures[k].source.autoGenerateMipmaps = true
        textures[k].source.updateMipmaps()
        textures[k].source.scaleMode = 'nearest'
      } catch {}
    }))
  } catch { manifest = null }

  const world = new Container()
  app.stage.addChild(world)
  const table = new Graphics()
  const ground = new Graphics()
  const zones = new Graphics()
  const unitLayer = new Container()
  const overlay = new Graphics()
  const labels = new Container()
  // the dust of every close combat (view/dust.js), over the models and under the lines and circles
  const dust = new Graphics()
  // arrows, bolts and breath (view/shotFx.js), over the dust
  const shotLayer = new Container()
  world.addChild(table, ground, zones, unitLayer, dust, shotLayer, overlay, labels)

  let ppi = 1
  let pan = { x: 0, y: 0 }
  let userZoomed = false
  // The page's plates sit over the canvas's edges; it says how far in pixels with --fit-left,
  // --fit-right, --fit-top and --fit-bottom (ow.css, #table-wrap), and the table is fitted into
  // the open middle. On a window too narrow for that the insets are dropped.
  const inset = name => parseFloat(getComputedStyle(host).getPropertyValue(name)) || 0
  // where the whole table sits in the open middle of the screen (fit() applies it; the film's camera glides back to it)
  function fitTarget () {
    const pad = 20
    const w = app.renderer.width / app.renderer.resolution; const h = app.renderer.height / app.renderer.resolution
    let l = inset('--fit-left'), r = inset('--fit-right'), t = inset('--fit-top'), b = inset('--fit-bottom')
    if (w - l - r < 300) { l = 0; r = 0 }
    if (h - t - b < 200) { t = 0; b = 0 }
    const z = Math.min((w - l - r - pad * 2) / TABLE.w, (h - t - b - pad * 2) / TABLE.h)
    return { ppi: z, pan: { x: l + (w - l - r - TABLE.w * z) / 2, y: t + (h - t - b - TABLE.h * z) / 2 } }
  }
  function fit () { const f = fitTarget(); ppi = f.ppi; pan = f.pan }
  fit()

  // THE CAMERA GLIDE (used by the match film to zoom in on the action):
  // the zoom and the pan slide to `to` over `ms` on animation frames (the film's renderer steps those). Only the
  // world's scale and place change each frame; the table is redrawn once at the end.
  function glideCamera (to, ms) {
    return new Promise(resolve => {
      const from = { ppi, pan: { ...pan } }
      const t0 = performance.now()
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms)); const e = k * k * (3 - 2 * k)
        ppi = from.ppi + (to.ppi - from.ppi) * e
        pan = { x: from.pan.x + (to.pan.x - from.pan.x) * e, y: from.pan.y + (to.pan.y - from.pan.y) * e }
        world.position.set(pan.x, pan.y); world.scale.set(ppi)
        if (k < 1) requestAnimationFrame(step); else { redraw(); resolve() }
      }
      requestAnimationFrame(step)
    })
  }

  const toScreen = p => ({ x: pan.x + p.x * ppi, y: pan.y + p.y * ppi })
  const toTable = (sx, sy) => ({ x: (sx - pan.x) / ppi, y: (sy - pan.y) / ppi })

  let selected = null
  let highlights = new Map() // unit id -> colour
  let ghosts = []            // [{ unit-like with pos/facing/files/base/models, ok }]
  let lines = []             // [{ from, to, colour, label }]
  let circles = []           // [{ at, r, colour }]
  // the moving unit's guides (ui/phases.js moveMode): { gauge: { at, left, of }, arcs: [{ centre, r, from, to, colour }] }
  let guides = null

  // SHRUNK PICTURES ARE BLENDED, ENLARGED ONES STAY CRISP. The pictures carry 2 px per
  // mm, about 51 per inch; at the whole-table view the board shows ~13 px per inch, so each picture
  // is drawn at a quarter of its size. Picking the nearest pixel then drops three in four and the
  // models look scratchy; blending through the mip levels keeps them whole. Zoomed in past 51 px per
  // inch the pixel art is enlarged, and nearest keeps its hard pixels.
  const PICTURE_PX_PER_IN = 2 * 25.4
  let pictureFilter = 'nearest'
  function setPictureFilter () {
    const want = ppi < PICTURE_PX_PER_IN ? 'linear' : 'nearest'
    if (want === pictureFilter) return
    pictureFilter = want
    for (const t of Object.values(textures)) t.source.scaleMode = want
  }

  function drawTable () {
    setPictureFilter()
    world.position.set(pan.x, pan.y)
    world.scale.set(ppi)
    table.clear()
    table.rect(0, 0, TABLE.w, TABLE.h).fill(FELT)
    for (let x = 6; x < TABLE.w; x += 6) table.moveTo(x, 0).lineTo(x, TABLE.h)
    for (let y = 6; y < TABLE.h; y += 6) table.moveTo(0, y).lineTo(TABLE.w, y)
    table.stroke({ width: 1 / ppi, color: 0x000000, alpha: 0.18 })
    table.rect(0, 0, TABLE.w, TABLE.h).stroke({ width: 2 / ppi, color: 0x1c140c })
    drawTerrain()
    zones.clear()
    if (game.phase === 'deploy') {
      for (const s of [0, 1]) {
        const z = deployZone(game, s)
        zones.poly(z.flatMap(p => [p.x, p.y])).fill({ color: SIDE_COLOUR[s], alpha: 0.10 })
        zones.poly(z.flatMap(p => [p.x, p.y])).stroke({ width: 1.5 / ppi, color: SIDE_COLOUR[s], alpha: 0.6 })
      }
    }
  }

  // terrain (src/rules/terrain.js): woods, hills, low walls, rocks, a marsh, a stream, a building — drawn flat, from above
  function drawTerrain () {
    ground.clear()
    for (const f of game.terrain || []) {
      const pts = f.poly.flatMap(p => [p.x, p.y])
      if (f.kind === 'hill') {
        ground.poly(pts).fill({ color: 0x6b7a45 }).stroke({ width: 2 / ppi, color: 0x4a5530 })
        // a contour line inside
        const c = f.at
        ground.poly(f.poly.flatMap(p => [c.x + (p.x - c.x) * 0.6, c.y + (p.y - c.y) * 0.6])).stroke({ width: 1.5 / ppi, color: 0x86955a })
      } else if (f.kind === 'wood') {
        ground.poly(pts).fill({ color: 0x2c3b22 }).stroke({ width: 2 / ppi, color: 0x1b2614 })
        // trees: a few dark crowns inside the boundary, placed from the outline (no randomness)
        f.poly.forEach((p, i) => {
          const q = { x: f.at.x + (p.x - f.at.x) * (0.35 + 0.25 * (i % 2)), y: f.at.y + (p.y - f.at.y) * (0.35 + 0.25 * (i % 2)) }
          ground.circle(q.x, q.y, 0.7).fill({ color: 0x1f4a1c }).stroke({ width: 1 / ppi, color: 0x10200e })
        })
        ground.circle(f.at.x, f.at.y, 0.9).fill({ color: 0x245a20 }).stroke({ width: 1 / ppi, color: 0x10200e })
      } else if (f.kind === 'wall') {
        ground.poly(pts).fill({ color: 0x8a8378 }).stroke({ width: 1.5 / ppi, color: 0x3c3934 })
      } else if (f.kind === 'marsh') {
        ground.poly(pts).fill({ color: 0x3f4a32 }).stroke({ width: 2 / ppi, color: 0x2a3322 })
        // pools of standing water and reed tufts, placed from the outline
        f.poly.forEach((p, i) => { const q = { x: f.at.x + (p.x - f.at.x) * 0.45, y: f.at.y + (p.y - f.at.y) * 0.45 }; if (i % 2) ground.ellipse(q.x, q.y, 0.7, 0.4).fill({ color: 0x4d5f5a }); else ground.circle(q.x, q.y, 0.2).fill({ color: 0x6f7a3a }) })
      } else if (f.kind === 'stream') {
        ground.poly(pts).fill({ color: 0x3f6f8a }).stroke({ width: 1.5 / ppi, color: 0x6b5a3a })
      } else if (f.kind === 'building') {
        ground.poly(pts).fill({ color: 0x6b4a32 }).stroke({ width: 2 / ppi, color: 0x2a1a10 })
        // the roof ridge
        ground.moveTo((pts[0] + pts[6]) / 2, (pts[1] + pts[7]) / 2).lineTo((pts[2] + pts[4]) / 2, (pts[3] + pts[5]) / 2).stroke({ width: 2 / ppi, color: 0x8a6a48 })
      } else if (f.kind === 'hornstone') {
        ground.poly(pts).fill({ color: 0x4a3f3a }).stroke({ width: 2 / ppi, color: 0x8a1a1a })
        ground.circle(f.at.x, f.at.y, 0.8).fill({ color: 0x8a1a1a })
      } else if (f.kind === 'rocks') {
        ground.poly(pts).fill({ color: 0x5a5650 }).stroke({ width: 2 / ppi, color: 0x2a2826 })
        ground.poly(f.poly.flatMap(p => [f.at.x + (p.x - f.at.x) * 0.5, f.at.y + (p.y - f.at.y) * 0.5])).fill({ color: 0x6e6a63 })
      }
    }
  }

  const unitViews = new Map()
  function modelSprite (unit, model, w, d) {
    const key = spriteKey(unit, model, manifest, `${game.round}:${game.active}`)
    if (key && textures[key]) {
      const s = new Sprite(textures[key])
      s.anchor.set(0.5)
      // a TOKEN picture is bigger than its base and spills onto its neighbours (the manifest's
      // 'overhang'); the footprint stays the base
      const ov = manifest[key]?.overhang || 1
      s.width = w * ov; s.height = d * ov
      return s
    }
    const g = new Graphics()
    g.rect(-w / 2, -d / 2, w, d).fill(unit.side === 0 ? 0x2a4f80 : 0x7a2a22).stroke({ width: 0.04, color: 0x101010 })
    const role = { champion: 'C', standard: 'S', musician: 'M' }[model.role]
    if (role) g.circle(0, 0, Math.min(w, d) * 0.25).fill(0xd8a93c)
    return g
  }

  function drawUnit (unit, alpha = 1, isSelected = unit === selected) {
    const c = new Container()
    c.alpha = alpha
    // a character with the unit stands in its front rank and the model it displaced at the back
    // (view/joinedSlots.js); a ghost or a unit on its own is laid out as before
    const slots = unit.joined?.length ? slotsWithJoined(unit) : modelSlots(unit)
    const isMachine = /war machine/.test(unit.category)
    for (const s of slots) {
      const owner = s.unit || unit
      const sp = modelSprite(owner, s.model, owner.base.w, owner.base.d)
      sp.position.set(s.at.x, s.at.y)
      sp.rotation = unit.facing + Math.PI / 2
      c.addChild(sp)
    }
    if (isMachine && unit.crewBase) {
      // the crew stand behind the machine; drawn only, not part of its footprint
      const key = crewKey(unit, manifest)
      const n = Math.min(3, unit.crewCount ?? 3)
      for (let i = 0; i < n; i++) {
        const sp = key && textures[key] ? Object.assign(new Sprite(textures[key]), {}) : new Graphics().rect(-0.5, -0.5, 1, 1).fill(0x555555)
        if (sp.anchor) sp.anchor.set(0.5)
        sp.width = unit.crewBase.w; sp.height = unit.crewBase.d
        const back = unit.base.d + unit.crewBase.d / 2 + 0.05
        const across = (i - (n - 1) / 2) * (unit.crewBase.w + 0.05)
        const fx = Math.cos(unit.facing); const fy = Math.sin(unit.facing)
        sp.position.set(unit.pos.x - fx * back - fy * across, unit.pos.y - fy * back + fx * across)
        sp.rotation = unit.facing + Math.PI / 2
        c.addChild(sp)
      }
    }
    // the footprint outline in the side's colour; gold when selected
    const outline = new Graphics()
    const cs = corners(unit)
    const hl = highlights.get(unit.id)
    const colour = isSelected ? 0xffd34a : hl ?? SIDE_COLOUR[unit.side]
    outline.poly(cs.flatMap(p => [p.x, p.y])).stroke({ width: (isSelected ? 3 : 2) / ppi, color: colour })
    // the front edge, thicker, so facing reads at a glance
    outline.moveTo(cs[0].x, cs[0].y).lineTo(cs[1].x, cs[1].y).stroke({ width: 4 / ppi, color: colour })
    if (unit.status.fleeing) outline.poly(cs.flatMap(p => [p.x, p.y])).fill({ color: 0xffffff, alpha: 0.18 })
    c.addChild(outline)
    return c
  }

  // THE GLIDE. The rules
  // move a unit at once; the table slides it there from where it was last drawn, straight, turning
  // the short way round, about a fifth of a second per inch (half a second to two; a tenth of a
  // second per inch looked too quick). Drawing
  // only: the game state is already final while a unit is still sliding. Nothing glides in
  // deployment, where a unit is picked up and put down.
  const shown = new Map()  // unit id -> { pos, facing } where it was last asked to stand
  const glides = new Map() // unit id -> { from, to, t0, dur }
  let gliding = false
  const angleBetween = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a))
  const ease = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
  function glideAt (u, now) {
    const to = { pos: { x: u.pos.x, y: u.pos.y }, facing: u.facing }
    const last = shown.get(u.id)
    shown.set(u.id, to)
    let g = glides.get(u.id)
    const changed = last && (Math.hypot(to.pos.x - last.pos.x, to.pos.y - last.pos.y) > 0.01 || Math.abs(angleBetween(last.facing, to.facing)) > 0.001)
    if (changed) {
      if (game.phase === 'deploy') { glides.delete(u.id); return null }
      // from where it is drawn now: a unit moved again mid-slide carries on from there
      const from = g ? frameOf(g, now) : last
      const dist = Math.hypot(to.pos.x - from.pos.x, to.pos.y - from.pos.y) + Math.abs(angleBetween(from.facing, to.facing)) * 2
      g = { from, to, t0: now, dur: Math.max(500, Math.min(2000, dist * 200)) }
      glides.set(u.id, g)
    }
    if (!g) return null
    if (now - g.t0 >= g.dur) { glides.delete(u.id); return null }
    return frameOf(g, now)
  }
  function frameOf (g, now) {
    const k = ease(Math.min(1, (now - g.t0) / g.dur))
    return {
      pos: { x: g.from.pos.x + (g.to.pos.x - g.from.pos.x) * k, y: g.from.pos.y + (g.to.pos.y - g.from.pos.y) * k },
      facing: g.from.facing + angleBetween(g.from.facing, g.to.facing) * k
    }
  }

  function redraw () {
    drawTable()
    // (the page's action pips follow the camera: src/ui/pips.js)
    handlers.camera?.()
    unitLayer.removeChildren().forEach(c => c.destroy({ children: true }))
    labels.removeChildren().forEach(c => c.destroy())
    const now = performance.now()
    for (const u of game.units) {
      if (!u.placed || isDead(u) || u.status.removed) continue
      // a joined character is drawn by its unit, in its front rank
      if (u.status.joinedTo && game.units.some(h => h.id === u.status.joinedTo && !h.status.removed && !isDead(h))) continue
      const at = glideAt(u, now)
      const sel = u === selected || (!!selected && selected.status?.joinedTo === u.id) // (a joined character picked: its unit lights up)
      unitLayer.addChild(at ? drawUnit({ ...u, pos: at.pos, facing: at.facing }, 1, sel) : drawUnit(u, 1, sel))
    }
    if (glides.size && !gliding) { gliding = true; requestAnimationFrame(() => { gliding = false; redraw() }) }
    for (const g of ghosts) {
      const c = drawUnit(g.unit, 0.55)
      const tint = new Graphics()
      tint.poly(corners(g.unit).flatMap(p => [p.x, p.y])).stroke({ width: 3 / ppi, color: g.ok ? 0x7fe07f : 0xff5050 })
      c.addChild(tint)
      unitLayer.addChild(c)
    }
    overlay.clear()
    for (const l of lines) {
      overlay.moveTo(l.from.x, l.from.y).lineTo(l.to.x, l.to.y).stroke({ width: 2 / ppi, color: l.colour ?? 0xffffff, alpha: 0.9 })
      if (l.label) {
        const t = new Text({ text: forDisplay(l.label), style: { fill: 0xffffff, fontSize: 14, fontFamily: 'Georgia', stroke: { color: 0x000000, width: 3 } } })
        t.scale.set(1 / ppi)
        t.position.set((l.from.x + l.to.x) / 2, (l.from.y + l.to.y) / 2)
        labels.addChild(t)
      }
    }
    for (const c of circles) overlay.circle(c.at.x, c.at.y, c.r).stroke({ width: 2 / ppi, color: c.colour ?? 0xffffff, alpha: 0.7 })
    drawGuides()
    // spells that stay on the table (Magical Vortex templates, spells.js)
    for (const v of (game.effects || []).filter(e => e.kind === 'vortex')) {
      overlay.circle(v.at.x, v.at.y, v.r).fill({ color: v.side === 0 ? 0xff7030 : 0x40d040, alpha: 0.28 }).stroke({ width: 2 / ppi, color: 0xffe080, alpha: 0.9 })
    }
  }

  // THE MOVE GUIDES, so a player can see whether a wheel still fits. A bar beside the ghost, its level the inches left of the
  // move, falling as the move is used; and the arc the wheeling corner can still travel. A fixed size on the screen
  // (so it reads the same at any zoom); drawn in table inches like everything else here.
  function drawGuides () {
    if (!guides) return
    for (const a of guides.arcs || []) {
      const steps = Math.max(2, Math.ceil(Math.abs(a.to - a.from) / 0.05))
      for (let i = 0; i <= steps; i++) {
        if (i % 2) continue // dashed
        const t0 = a.from + (a.to - a.from) * i / steps; const t1 = a.from + (a.to - a.from) * Math.min(steps, i + 1) / steps
        overlay.moveTo(a.centre.x + Math.cos(t0) * a.r, a.centre.y + Math.sin(t0) * a.r).lineTo(a.centre.x + Math.cos(t1) * a.r, a.centre.y + Math.sin(t1) * a.r)
      }
      overlay.stroke({ width: 2 / ppi, color: a.colour ?? 0xffe080, alpha: 0.85 })
      const e = { x: a.centre.x + Math.cos(a.to) * a.r, y: a.centre.y + Math.sin(a.to) * a.r }
      overlay.circle(e.x, e.y, 4 / ppi).fill({ color: a.colour ?? 0xffe080, alpha: 0.95 })
    }
    const g = guides.gauge
    if (!g) return
    const h = 90 / ppi; const w = 10 / ppi
    const x = g.at.x; const top = g.at.y - h / 2
    const k = g.of > 0 ? Math.max(0, Math.min(1, g.left / g.of)) : 0
    const colour = k > 0.5 ? 0x7fe07f : k > 0.15 ? 0xffc040 : 0xff5050
    overlay.rect(x, top, w, h).fill({ color: 0x14110c, alpha: 0.85 }).stroke({ width: 1.5 / ppi, color: 0xe6dcc6, alpha: 0.9 })
    if (k > 0) overlay.rect(x, top + h * (1 - k), w, h * k).fill({ color: colour, alpha: 0.95 })
    for (let i = 1; i < Math.floor(g.of); i++) { const y = top + h * (1 - i / g.of); overlay.moveTo(x, y).lineTo(x + w * 0.4, y) }
    overlay.stroke({ width: 1 / ppi, color: 0x000000, alpha: 0.6 })
    const t = new Text({ text: `${g.left.toFixed(1)}"\nleft\nof ${g.of}"`, style: { fill: colour, fontSize: 15, fontWeight: 'bold', fontFamily: 'Georgia', align: 'left', stroke: { color: 0x000000, width: 3 } } })
    t.scale.set(1 / ppi)
    t.position.set(x + w + 4 / ppi, g.at.y - 24 / ppi)
    labels.addChild(t)
  }

  // ---- input ----
  const canvas = app.canvas
  let panning = null
  const local = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const unitAt = p => {
    const live = onTable(game).slice().reverse()
    return live.find(u => {
      const cs = corners(u)
      let inside = false
      for (let i = 0, j = cs.length - 1; i < cs.length; j = i++) {
        const a = cs[i]; const b = cs[j]
        if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside
      }
      return inside
    }) || null
  }
  // THE TAPE MEASURE: hold Shift and drag. Measuring is allowed at any time; it changes nothing.
  let measuring = null
  canvas.addEventListener('pointerdown', e => {
    const s = local(e)
    if (e.button === 1 || e.button === 2) { panning = { sx: s.x, sy: s.y, px: pan.x, py: pan.y, moved: false, button: e.button }; return }
    if (e.button === 0 && e.shiftKey) { measuring = { from: toTable(s.x, s.y), to: toTable(s.x, s.y) }; drawTape(); return }
    const p = toTable(s.x, s.y)
    handlers.down?.(p, unitAt(p), e)
  })
  canvas.addEventListener('pointermove', e => {
    const s = local(e)
    if (panning) {
      if (Math.hypot(s.x - panning.sx, s.y - panning.sy) > 4) panning.moved = true
      pan = { x: panning.px + s.x - panning.sx, y: panning.py + s.y - panning.sy }
      userZoomed = true
      redraw()
      return
    }
    const p = toTable(s.x, s.y)
    if (measuring) { measuring.to = p; drawTape(); return }
    handlers.move?.(p, e)
  })
  window.addEventListener('pointerup', e => {
    if (panning) {
      const wasRight = panning.button === 2 && !panning.moved
      panning = null
      if (wasRight) { const s = local(e); const p = toTable(s.x, s.y); handlers.right?.(p, unitAt(p), e) }
      return
    }
    if (measuring) { measuring = null; drawTape(); return }
    if (e.target !== canvas) return
    const s = local(e)
    handlers.up?.(toTable(s.x, s.y), e)
  })
  canvas.addEventListener('wheel', e => {
    e.preventDefault()
    const s = local(e)
    const before = toTable(s.x, s.y)
    ppi = Math.max(4, Math.min(80, ppi * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
    pan = { x: s.x - before.x * ppi, y: s.y - before.y * ppi }
    userZoomed = true
    redraw()
  }, { passive: false })
  new ResizeObserver(() => { if (!userZoomed) fit(); redraw() }).observe(host)

  const tape = new Graphics()
  const tapeLabel = new Text({ text: '', style: { fill: 0xffe080, fontSize: 16, fontFamily: 'Georgia', stroke: { color: 0x000000, width: 4 } } })
  world.addChild(tape, tapeLabel)
  function drawTape () {
    tape.clear(); tapeLabel.text = ''
    if (!measuring) return
    const { from, to } = measuring
    tape.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: 3 / ppi, color: 0xffe080 })
    tape.circle(from.x, from.y, 3 / ppi).fill(0xffe080)
    const d = Math.hypot(to.x - from.x, to.y - from.y)
    tapeLabel.text = `${d.toFixed(1)}"`
    tapeLabel.scale.set(1 / ppi)
    tapeLabel.position.set(to.x + 8 / ppi, to.y - 20 / ppi)
  }

  // THE DUST, every frame while any units are engaged. A unit
  // still gliding into contact is left out until it arrives.
  // THE SHOTS: the engine tells the table each volley and breath (game.onShot, rules/shooting.js and specialShots.js)
  const shotFx = createShotFx(shotLayer, { ppi: () => ppi })
  game.onShot = e => shotFx.play(e)
  app.ticker.add(() => shotFx.tick(performance.now()))
  // THE SPELLS: each lore its own colour and particles (view/spellFx.js); ui/phases.js plays one before a spell resolves
  const spellFx = createSpellFx(shotLayer, { ppi: () => ppi, game })
  app.ticker.add(() => spellFx.tick(performance.now()))
  let dustOn = false
  app.ticker.add(() => {
    const lines = contactLines(game.units, u => glides.has(u.id))
    if (!lines.length) { if (dustOn) { dust.clear(); dustOn = false } return }
    dustOn = true
    drawDust(dust, lines, performance.now() / 1000)
  })

  redraw()
  return {
    redraw,
    select (u) { selected = u; redraw() },
    setHighlights (m) { highlights = m; redraw() },
    setGhosts (g) { ghosts = g; redraw() },
    setLines (l) { lines = l; redraw() },
    setCircles (c) { circles = c; redraw() },
    setGuides (g) { guides = g; redraw() },
    clearOverlays () { ghosts = []; lines = []; circles = []; guides = null; highlights = new Map(); redraw() },
    home () { userZoomed = false; fit(); redraw() },
    // the camera: close in on table point `p` (`zoom` times the whole-table view), or glide back to the whole table
    zoomTo (p, zoom = 2.5, ms = 900) {
      const f = fitTarget(); const z = f.ppi * zoom
      const c = { x: f.pan.x + TABLE.w * f.ppi / 2, y: f.pan.y + TABLE.h * f.ppi / 2 }
      userZoomed = true
      return glideCamera({ ppi: z, pan: { x: c.x - p.x * z, y: c.y - p.y * z } }, ms)
    },
    zoomHome (ms = 900) { userZoomed = false; return glideCamera(fitTarget(), ms) },
    // waits for every arrow, bolt and flame on the table to finish (the shoot button waits on it, so the dead
    // are taken away after the missiles reach them)
    settle: cap => Promise.all([shotFx.settle(cap), spellFx.settle(cap)]),
    // a spell's look on the table; resolves when it strikes (view/spellFx.js)
    castSpellFx: e => spellFx.cast(e),
    get shotsFlying () { return shotFx.busy },
    toScreen,
    unitAt,
    get ppi () { return ppi },
    // how many units are sliding now (the glide), for the harnesses
    get gliding () { return glides.size },
    hasSprites: () => !!manifest
  }
}
