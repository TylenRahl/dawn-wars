// SHOTS ON THE TABLE: missiles flying for every volley, and breath weapons as a coloured spray of fire.
// Exports createShotFx(layer, { ppi }), used by view/board.js, and missileOf, magicColour and breathLook
// (tested in shotFx.test.js).
//
// The engine tells the table what happened (game.onShot, called from rules/shooting.js shootWeapon once the
// To Hit dice are rolled, and from rules/specialShots.js / warMachines.js when a flame template is laid). This
// draws it and decides nothing: a volley flies one missile per shot (at most MAX_DRAWN), the hits into the
// target's models and the misses into the ground round it, as the dice already said in the log.
// Everything is in inches, on a layer of view/board.js's world.
//
// The breath is a spray: puff after puff of the white-hot explosion frames flying down the flame template, swelling and cooling to
// smoke. Its colours are turned to the breath's own (BREATH_LOOKS) on a recoloured copy of the fire pictures, made
// once per colour: a live colour filter cost seconds a frame on a software-drawn page.

import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { modelSlots, isDead } from '../rules/units.js'
import { slotsWithJoined } from './joinedSlots.js'

const MAX_DRAWN = 30

// WHAT A WEAPON THROWS, by its name. Every missile weapon in data/weapons.js gets one of:
//   'bolt'    crossbows, handbows: straight and fast, a faint streak
//   'bigbolt' bolt throwers, harpoons, crane guns: the bolt, big
//   'arrow'   bows: a high arc, a shadow under it, misses stuck in the ground
//   'dart'    blowpipes, thorns, barbs: small and straight
//   'javelin' javelins, throwing spears, bolas: a low arc, misses stuck in the ground
//   'axe'     throwing axes and weapons, the nipper-hewer: a low arc, spinning
//   'stone'   slings, hurled rocks: a small stone on a low arc
//   'bomb'    bombs, globes, charges, grenades: a lobbed pot that bursts where it lands
//   'bullet'  handguns, pistols, rifles, blunderbusses, organ guns, ratling guns: a flash and smoke at the muzzle, a streak
//   'magic'   warp, Cipher, wands, gazes and the like: a glowing bolt in its own colour
// Anything not named here is drawn as a 'dart' rather than not at all.
export function missileOf (name = '', key = '') {
  const s = `${name} ${key}`.toLowerCase()
  if (/crossbow|handbow/.test(s)) return 'bolt'
  if (/bolt thrower|harpoon|crane gun/.test(s)) return 'bigbolt'
  if (/blowpipe|razor barbs|thornspitter/.test(s)) return 'dart'
  if (/\bbows?\b|longbow|shortbow|warbow|greatbow|lifetaker|hawk's talon|hunter's scorn/.test(s)) return 'arrow'
  if (/javelin|spear|bolas|chaintrap/.test(s)) return 'javelin'
  if (/throwing|hewer|death's heads/.test(s)) return 'axe'
  if (/sling|hurl/.test(s)) return 'stone'
  if (/bomb|globe|charges|incendiar|naptha|grenade|torpedo/.test(s)) return 'bomb'
  if (/gun|pistol|rifle|musket|jezzail|arquebus|blunderbuss|cannonade|grapeshot|rapid fire|hailshot|shotbelly|chatter|rivet|thunderclap|organ|embergun/.test(s)) return 'bullet'
  if (/warp|wyrd|cipher|wand|gaze|hexfire|torrent|lightning|lost sun|the smith|strangleroots|slythey|flame/.test(s)) return 'magic'
  return 'dart'
}
// a magic missile's colour
export function magicColour (name = '') {
  const s = name.toLowerCase()
  // (the data still has one of the older words: the Banner of the Warped Moon)
  if (/warp|wyrd/.test(s)) return 0x7aff4a
  // (the Wyrmflame pistols were wyrmflame pistols: no magic colour)
  if (/cipher|hexfire|(?<!wyrm)flame/.test(s)) return 0xff6ae0
  if (/gaze|petrif/.test(s)) return 0xc8d0b0
  if (/strangleroots|slythey|thorn/.test(s)) return 0x9ad050
  if (/sun|the smith/.test(s)) return 0xffd060
  return 0xa890ff
}

// THE BREATHS' COLOURS. `hue` turns the orange fire round the colour wheel (degrees), `sat` and `bright`
// scale it; `smoke` tints the smoke it cools to. First the dragon (by the shooter's name), then the breath.
const FIRE = { hue: 0, sat: 1, bright: 1, smoke: 0xffffff }
const DRAGONS = [
  [/star[ -]dragon/i, { hue: 185, sat: 1.2, bright: 1.15, smoke: 0xc8d8ff }],   // blue flames
  [/moon[ -]dragon/i, { hue: 200, sat: 0.35, bright: 1.35, smoke: 0xe8eeff }],  // silver-white fire
  [/sun[ -]dragon/i, { hue: 12, sat: 1.25, bright: 1.15, smoke: 0xfff0c8 }],    // golden fire
  [/black[ -]dragon/i, { hue: 75, sat: 0.9, bright: 0.85, smoke: 0x7a8a50 }],   // noxious green
  [/zombie[ -]dragon/i, { hue: 55, sat: 0.65, bright: 0.85, smoke: 0x8a9070 }], // corpse yellow-green
  [/forest[ -]dragon/i, { hue: 120, sat: 0.6, bright: 1.1, smoke: 0xd0f0e8 }],  // pale teal
  [/dominion[ -]dragon/i, { hue: 240, sat: 1.1, bright: 0.95, smoke: 0x9070a0 }],  // purple
  [/emperor[ -]dragon/i, { hue: 0, sat: 1.15, bright: 1.1, smoke: 0xffffff }]
]
const BREATHS = [
  [/dark fire of the dominion/i, { hue: 240, sat: 1.1, bright: 0.95, smoke: 0x9070a0 }],
  [/sorcerous exhalation/i, { hue: 285, sat: 1.2, bright: 1.05, smoke: 0xd0a0d0 }],
  [/noxious breath/i, { hue: 75, sat: 0.9, bright: 0.85, smoke: 0x7a8a50 }],
  [/pestilential|contagion|billowing death/i, { hue: 55, sat: 0.65, bright: 0.85, smoke: 0x8a9070 }],
  [/soporific/i, { hue: 120, sat: 0.6, bright: 1.1, smoke: 0xd0f0e8 }],
  [/chill breath/i, { hue: 170, sat: 0.5, bright: 1.3, smoke: 0xe0f0ff }],
  [/acidic vomit|venom spray|wyrdfire/i, { hue: 60, sat: 1.3, bright: 1, smoke: 0x90a060 }],
  [/briny breath/i, { hue: 150, sat: 0.8, bright: 1, smoke: 0xa0c8c0 }],
  [/swamp breath/i, { hue: 40, sat: 0.45, bright: 0.75, smoke: 0x70684a }],
  [/desiccation/i, { hue: 0, sat: 0.3, bright: 1.05, smoke: 0xd8c8a0 }],
  [/steam gun|steam/i, { hue: 0, sat: 0, bright: 1.45, smoke: 0xf4f4f4 }],
  [/swarming mass/i, { hue: 0, sat: 0, bright: 0.45, smoke: 0x302c28 }],
  [/bull of ash/i, { hue: -18, sat: 1.3, bright: 0.95, smoke: 0x604030 }],
  [/breath of change/i, { hue: 200, sat: 1.4, bright: 1.1, smoke: 0xb0a0ff }]
]
export function breathLook (shooterName = '', weapon = '', key = '') {
  for (const [re, look] of DRAGONS) if (re.test(shooterName)) return look
  for (const [re, look] of BREATHS) if (re.test(`${weapon} ${key}`)) return look
  return FIRE
}

// a small seeded noise for where each missile goes (never Math.random: a replay draws the same)
function rng (seed) {
  let s = seed >>> 0 || 1
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

const ease = k => k * k * (3 - 2 * k)

// THE FIRE IN ANOTHER COLOUR: the picture's pixels turned round the colour wheel by `look.hue` degrees (the CSS
// hue-rotate matrix), their saturation and brightness scaled. Made once per picture and colour.
const recolourCache = new Map()
function recoloured (tex, look, name) {
  if (look === FIRE) return tex
  const key = `${name}|${look.hue}|${look.sat}|${look.bright}`
  if (recolourCache.has(key)) return recolourCache.get(key)
  let out = tex
  try {
    const src = tex.source.resource
    const w = tex.source.width; const h = tex.source.height
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h
    const cx = cv.getContext('2d')
    cx.drawImage(src, 0, 0)
    const img = cx.getImageData(0, 0, w, h); const d = img.data
    const a = look.hue * Math.PI / 180; const c = Math.cos(a); const sn = Math.sin(a)
    const m = [
      0.213 + c * 0.787 - sn * 0.213, 0.715 - c * 0.715 - sn * 0.715, 0.072 - c * 0.072 + sn * 0.928,
      0.213 - c * 0.213 + sn * 0.143, 0.715 + c * 0.285 + sn * 0.140, 0.072 - c * 0.072 - sn * 0.283,
      0.213 - c * 0.213 - sn * 0.787, 0.715 - c * 0.715 + sn * 0.715, 0.072 + c * 0.928 + sn * 0.072
    ]
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]; const g = d[i + 1]; const b = d[i + 2]
      let R = m[0] * r + m[1] * g + m[2] * b; let G = m[3] * r + m[4] * g + m[5] * b; let B = m[6] * r + m[7] * g + m[8] * b
      const L = 0.2126 * R + 0.7152 * G + 0.0722 * B
      R = (L + (R - L) * look.sat) * look.bright; G = (L + (G - L) * look.sat) * look.bright; B = (L + (B - L) * look.sat) * look.bright
      d[i] = Math.max(0, Math.min(255, R)); d[i + 1] = Math.max(0, Math.min(255, G)); d[i + 2] = Math.max(0, Math.min(255, B))
    }
    cx.putImageData(img, 0, 0)
    out = Texture.from(cv)
  } catch (err) { console.error('shotFx recolour', err) }
  recolourCache.set(key, out)
  return out
}

export function createShotFx (layer, { ppi }) {
  globalThis.__shotLayer = layer // (for the harnesses)
  const fx = []      // live effects: { update (now) -> false when done }
  let serial = 0
  let waiting = []   // settle() promises
  let pending = 0    // breaths still loading their pictures
  const textures = {}
  const load = name => (textures[name] ??= Assets.load(`/images/fx-${name}.png`).catch(err => { (globalThis.__shotFxErrors ??= []).push(`load ${name}: ${err?.message || err}`); return null }))
  // loaded now, so the first breath of the battle does not wait for its pictures
  for (const n of ['explosion-000', 'explosion-001', 'smoke-000', 'smoke-001', 'smoke-002']) load(n)

  // THE EFFECTS' OWN CLOCK: it moves with the frames but at most 50 ms a frame, so a slow frame pauses a flight or a
  // flame instead of skipping it (on a software-drawn page one frame took seconds and the breath was never seen)
  let clock = 0
  let last = null
  function tick (wall) {
    const step = last == null ? 16 : Math.max(0, Math.min(50, wall - last))
    last = wall
    clock += step
    const now = clock
    // (one effect that throws is dropped; it never stalls the others or settle())
    for (let i = fx.length - 1; i >= 0; i--) {
      let live = false
      try { live = fx[i].update(now) !== false } catch (err) { console.error('shotFx', err); (globalThis.__shotFxErrors ??= []).push(String(err?.stack || err).slice(0, 300)) }
      if (live) continue
      try { fx[i].done?.() } catch (err) { console.error('shotFx', err) }
      fx.splice(i, 1)
    }
    if (!fx.length && !pending && waiting.length) { const w = waiting; waiting = []; w.forEach(r => r()) }
  }

  // how big a missile is drawn: true size zoomed in, never smaller than about 12 px long
  const grow = () => Math.max(1, 14 / Math.max(1, ppi()))

  // THE MISSILES' LOOKS (missileOf): how each is drawn, flies and lands
  const MISSILES = {
    bolt: { speed: 13, base: 160, arc: 0, trail: 0xf0e6c8, stick: true, spread: 260 },
    bigbolt: { speed: 11, base: 180, arc: 0, trail: 0xf0e6c8, stick: true, spread: 120, size: 2.2 },
    arrow: { speed: 30, base: 380, arc: 0.22, shadow: true, stick: true, spread: 420 },
    dart: { speed: 12, base: 140, arc: 0, stick: false, spread: 260, dust: true },
    javelin: { speed: 26, base: 320, arc: 0.14, shadow: true, stick: true, spread: 300 },
    axe: { speed: 26, base: 320, arc: 0.12, shadow: true, spin: 18, spread: 300, dust: true },
    stone: { speed: 22, base: 260, arc: 0.12, shadow: true, spread: 300, dust: true },
    bomb: { speed: 28, base: 380, arc: 0.25, shadow: true, spin: 6, spread: 300, burst: 'fire' },
    bullet: { speed: 5, base: 70, arc: 0, trail: 0xfff0b0, muzzle: true, spread: 340, dust: true },
    magic: { speed: 10, base: 160, arc: 0, glow: true, spread: 260, burst: 'glow' }
  }

  function missileShape (kind, colour) {
    const g = new Graphics()
    if (kind === 'bolt' || kind === 'bigbolt') {
      g.rect(-0.28, -0.045, 0.5, 0.09).fill(0x4a3420)
      g.poly([0.2, -0.1, 0.38, 0, 0.2, 0.1]).fill(0x5a6068)
      g.poly([-0.28, -0.04, -0.36, -0.11, -0.18, -0.04]).fill(0x9a3a2a)
      g.poly([-0.28, 0.04, -0.36, 0.11, -0.18, 0.04]).fill(0x9a3a2a)
    } else if (kind === 'arrow') {
      g.rect(-0.45, -0.03, 0.82, 0.06).fill(0x8a6038)
      g.poly([0.35, -0.08, 0.52, 0, 0.35, 0.08]).fill(0xc8d0d8)
      g.poly([-0.45, -0.03, -0.6, -0.12, -0.3, -0.03]).fill(0xf0ece0)
      g.poly([-0.45, 0.03, -0.6, 0.12, -0.3, 0.03]).fill(0xf0ece0)
    } else if (kind === 'javelin') {
      g.rect(-0.6, -0.035, 1.05, 0.07).fill(0x7a5630)
      g.poly([0.42, -0.08, 0.66, 0, 0.42, 0.08]).fill(0xb8c0c8)
    } else if (kind === 'axe') {
      g.rect(-0.22, -0.03, 0.44, 0.06).fill(0x6a4a2a)
      g.poly([0.1, -0.03, 0.26, -0.2, 0.3, 0.02, 0.1, 0.05]).fill(0xb0b8c0)
    } else if (kind === 'dart') {
      g.rect(-0.18, -0.025, 0.36, 0.05).fill(0x3a3026)
      g.poly([0.15, -0.05, 0.26, 0, 0.15, 0.05]).fill(0x707a70)
    } else if (kind === 'stone') {
      g.circle(0, 0, 0.09).fill(0x8a8478)
    } else if (kind === 'bomb') {
      g.circle(0, 0, 0.16).fill(0x2a2622)
      g.circle(0.12, -0.12, 0.05).fill(0xffc040)
    } else if (kind === 'bullet') {
      g.rect(-0.25, -0.025, 0.4, 0.05).fill({ color: 0xfff0b0, alpha: 0.9 })
    } else if (kind === 'magic') {
      g.circle(0, 0, 0.32).fill({ color: colour, alpha: 0.25 })
      g.circle(0, 0, 0.18).fill({ color: colour, alpha: 0.7 })
      g.circle(0, 0, 0.08).fill(0xffffff)
    } else if (kind === 'ball') {
      g.circle(0, 0, 0.22).fill(0x1e1e22)
      g.circle(-0.06, -0.06, 0.07).fill(0x5a5a62)
    } else if (kind === 'rock') {
      g.poly([-0.3, -0.1, -0.1, -0.3, 0.25, -0.22, 0.32, 0.1, 0.05, 0.3, -0.25, 0.2]).fill(0x7a7468)
      g.circle(0.05, -0.08, 0.1).fill(0x9a9488)
    } else if (kind === 'rocket') {
      g.rect(-0.35, -0.07, 0.6, 0.14).fill(0x5a3a2a)
      g.poly([0.25, -0.1, 0.42, 0, 0.25, 0.1]).fill(0xb03020)
      g.circle(-0.42, 0, 0.12).fill({ color: 0xffb040, alpha: 0.85 })
    }
    return g
  }

  // a puff, a flash or a burst on the table: `kind` 'dust' (pale earth), 'smoke' (grey), 'fire' (an explosion going to
  // smoke), 'flash' (a muzzle flash), 'glow' (a magic bolt's end, in `colour`); `r` its size in inches
  function puff (at, { kind = 'dust', r = 0.5, start = clock, dur = 500, colour = 0xffffff } = {}) {
    const g = new Graphics()
    g.alpha = 0
    layer.addChild(g)
    fx.push({
      update (now) {
        const q = (now - start) / dur
        if (q < 0) return true
        if (q >= 1) return false
        g.clear(); g.alpha = 1
        const rr = r * (0.4 + 0.6 * Math.sqrt(q))
        const fade = 1 - q
        if (kind === 'flash') {
          g.circle(at.x, at.y, rr * 1.4).fill({ color: 0xffd060, alpha: 0.5 * fade })
          g.circle(at.x, at.y, rr * 0.7).fill({ color: 0xffffff, alpha: 0.9 * fade })
        } else if (kind === 'fire') {
          g.circle(at.x, at.y, rr * 1.15).fill({ color: 0x4a4440, alpha: 0.45 * fade })
          if (q < 0.55) {
            g.circle(at.x, at.y, rr).fill({ color: 0xff7a20, alpha: 0.85 * (1 - q / 0.55) })
            g.circle(at.x, at.y, rr * 0.55).fill({ color: 0xfff0a0, alpha: 0.9 * (1 - q / 0.55) })
          }
        } else if (kind === 'glow') {
          g.circle(at.x, at.y, rr * 1.3).fill({ color: colour, alpha: 0.35 * fade })
          g.circle(at.x, at.y, rr * 0.6).fill({ color: 0xffffff, alpha: 0.7 * fade })
        } else {
          const c = kind === 'smoke' ? 0xb8b4ae : 0xc9b994
          g.circle(at.x + rr * 0.12, at.y + rr * 0.15, rr).fill({ color: 0x5a4c38, alpha: 0.25 * fade })
          g.circle(at.x, at.y, rr).fill({ color: c, alpha: 0.6 * fade })
        }
        return true
      },
      done () { g.destroy() }
    })
  }

  // ONE MISSILE from `a` to `land`, starting at `start` (the effects' clock). `hit`: it goes into a model and is gone.
  function fly (kind, a, land, start, hit, { colour = 0xffffff, size = 1 } = {}) {
    const m = MISSILES[kind] || MISSILES.dart
    const dist = Math.hypot(land.x - a.x, land.y - a.y)
    const dur = m.base + dist * m.speed
    const missile = missileShape(kind, colour)
    const shadow = m.shadow ? missileShape(kind, colour) : null
    if (shadow) { shadow.tint = 0x000000; shadow.alpha = 0 }
    const trail = m.trail || m.glow ? new Graphics() : null
    missile.alpha = 0
    if (shadow) layer.addChild(shadow)
    if (trail) layer.addChild(trail)
    layer.addChild(missile)
    const ang = Math.atan2(land.y - a.y, land.x - a.x)
    const peak = m.arc ? Math.min(6, dist * m.arc) : 0
    const big = (m.size || 1) * size
    if (m.muzzle) { puff(a, { kind: 'flash', r: 0.35, start, dur: 120 }); puff(a, { kind: 'smoke', r: 0.7, start, dur: 900 }) }
    let landed = null
    fx.push({
      update (now) {
        const k = (now - start) / dur
        if (k < 0) return true
        const sz = grow() * big
        if (k <= 1) {
          const e = peak ? ease(k) * 0.3 + k * 0.7 : k
          const g = { x: a.x + (land.x - a.x) * e, y: a.y + (land.y - a.y) * e }
          const h = peak * Math.sin(Math.PI * e) // its height above the table, in inches
          missile.alpha = 1
          missile.position.set(g.x, g.y)
          // a missile high in the air is nearer the eye: drawn a little larger at the top of its arc
          missile.rotation = m.spin ? ang + (now - start) / 1000 * m.spin : ang
          missile.scale.set(sz * (1 + h * 0.09), sz * (1 + h * 0.06))
          if (shadow) {
            shadow.position.set(g.x + h * 0.35, g.y + h * 0.45)
            shadow.rotation = missile.rotation
            shadow.scale.set(sz, sz)
            shadow.alpha = 0.28
          }
          if (trail) {
            const back = Math.min(m.glow ? 1.2 : 1.8, dist * e)
            trail.clear()
            trail.moveTo(g.x - Math.cos(ang) * back, g.y - Math.sin(ang) * back).lineTo(g.x, g.y)
              .stroke({ width: (m.glow ? 0.14 : 0.05) * sz, color: m.glow ? colour : m.trail, alpha: m.glow ? 0.55 : 0.45 })
          }
          return true
        }
        // landed
        if (!landed) {
          landed = now
          trail?.clear()
          if (shadow) shadow.alpha = 0
          if (m.burst === 'fire') puff(land, { kind: 'fire', r: 0.9, start: now, dur: 650 })
          else if (m.burst === 'glow') puff(land, { kind: 'glow', r: 0.6, start: now, dur: 380, colour })
          else if (!hit && m.dust) puff(land, { kind: 'dust', r: 0.35, start: now, dur: 450 })
        }
        // into a model, or burst, or a stone or a bullet in the dirt: gone
        if (hit || !m.stick) { missile.alpha = 0; return now - landed < 120 }
        // a miss stays stuck in the ground, short (it went in), then fades
        const q = (now - landed) / 1400
        missile.scale.set(sz * 0.6, sz)
        missile.alpha = q < 0.6 ? 1 : Math.max(0, 1 - (q - 0.6) / 0.4)
        return q < 1
      },
      done () { missile.destroy(); shadow?.destroy(); trail?.destroy() }
    })
    return dur
  }

  // where a unit's models stand, the front first: [{ x, y }]
  const spots = u => {
    const s = (u.joined?.length ? slotsWithJoined(u) : modelSlots(u)).slice().sort((a, b) => a.rank - b.rank)
    return s.map(x => x.at)
  }

  function volley ({ shooter, target, weapon, key, shots, hits }) {
    const kind = missileOf(weapon, key)
    if (!kind || !shots || isDead(shooter)) return
    const from = spots(shooter); const at = spots(target)
    if (!from.length || !at.length) return
    const n = Math.min(MAX_DRAWN, shots)
    const nh = Math.round(hits * n / shots)
    const r = rng(++serial * 7919 + shots * 31 + hits)
    // the shots in a shuffled order, so hits and misses are mixed in the flight
    const order = Array.from({ length: n }, (_, i) => i < nh).sort(() => r() - 0.5)
    const spread = (MISSILES[kind] || MISSILES.dart).spread
    const colour = magicColour(weapon)
    order.forEach((hit, i) => {
      const a = from[Math.floor(r() * Math.min(from.length, Math.max(n, 1)))] || from[0]
      const tgt = at[Math.floor(r() * at.length)]
      const land = hit ? { x: tgt.x + (r() - 0.5) * 0.4, y: tgt.y + (r() - 0.5) * 0.4 } : (() => {
        const ang = r() * Math.PI * 2; const d = 0.9 + r() * 1.8
        return { x: tgt.x + Math.cos(ang) * d, y: tgt.y + Math.sin(ang) * d }
      })()
      fly(kind, a, land, clock + (i / Math.max(1, n)) * spread + r() * 90, hit, { colour })
    })
  }

  // A CANNON (rules/warMachines.js cannonFire): the flash and smoke at the muzzle, the ball out to where it strikes
  // (a burst of earth), then its bounce along the ground to where it stops, kicking up dust.
  function cannon ({ shooter, from, strike, end }) {
    const start = clock
    puff(from, { kind: 'flash', r: 0.7, start, dur: 160 })
    puff(from, { kind: 'smoke', r: 1.6, start, dur: 1300 })
    const t1 = fly('ball', from, strike, start, false, { size: 1.7 })
    puff(strike, { kind: 'dust', r: 1.1, start: start + t1, dur: 600 })
    if (end && Math.hypot(end.x - strike.x, end.y - strike.y) > 0.2) {
      const t2 = fly('ball', strike, end, start + t1, false, { size: 1.7 })
      for (let q = 1; q <= 3; q++) {
        const p = { x: strike.x + (end.x - strike.x) * q / 3, y: strike.y + (end.y - strike.y) * q / 3 }
        puff(p, { kind: 'dust', r: 0.6, start: start + t1 + t2 * q / 3, dur: 500 })
      }
    }
  }

  // A STONE, A POT OR A ROCKET COMING DOWN (rules/warMachines.js blastDamage): from the machine, high, onto the template
  // at `at`, then a burst the template's size (fire for rockets, mortars and bombs; earth for stones).
  function lob ({ shooter, at, r, weapon = '', key = '' }) {
    const from = shooter ? (spots(shooter)[0] || shooter.pos) : null
    if (!from) return
    const s = `${weapon} ${key}`.toLowerCase()
    const kind = /rocket/.test(s) ? 'rocket' : 'rock'
    const fiery = /rocket|mortar|bomb|grenade|blightclaw|blightflail|blight censer|\brotsword\b|wailing|incendiar|fire/.test(s)
    const start = clock
    if (/mortar|bombard/.test(s)) { puff(from, { kind: 'flash', r: 0.6, start, dur: 160 }); puff(from, { kind: 'smoke', r: 1.4, start, dur: 1200 }) }
    const m = MISSILES.stone
    const dist = Math.hypot(at.x - from.x, at.y - from.y)
    // (a lobbed shot: a high arc, slower)
    MISSILES.lobbed ??= { ...m, arc: 0.35, base: 450, speed: 26 }
    const t1 = flyAs('lobbed', kind, from, at, start)
    puff(at, { kind: fiery ? 'fire' : 'dust', r: Math.max(1, r || 1.5), start: start + t1, dur: 750 })
    if (!fiery) puff(at, { kind: 'dust', r: Math.max(1, r || 1.5) * 1.4, start: start + t1 + 80, dur: 900 })
    return dist
  }
  // fly with one look's movement and another's picture (the lobbed stone and the rocket)
  function flyAs (motion, shape, a, land, start) {
    const saved = MISSILES[shape]
    MISSILES[shape] = MISSILES[motion]
    try { return fly(shape, a, land, start, false, { size: 1.9 }) } finally { if (saved) MISSILES[shape] = saved; else delete MISSILES[shape] }
  }

  // THE BREATH: a spray of puffs (every = 18, pour = 450, speed = 16, linger = 1, below), along
  // the flame template (rules/spells.js flameTemplate: 0.5" at the mouth, about 3" across, 8.3" long).
  async function breath ({ shooter, from, to, weapon, key }) {
    // (a character's dragon is its mount: the unit's name, its mount and its chosen mount are all looked at)
    const look = breathLook([shooter?.name, shooter?.mountChoice, shooter?.mount?.name, shooter?.entryId].filter(Boolean).join(' '), weapon, key)
    const hot = await Promise.all(['explosion-000', 'explosion-001'].map(load))
    const smoke = await Promise.all(['smoke-000', 'smoke-001', 'smoke-002'].map(load))
    if (hot.some(x => !x) || smoke.some(x => !x)) return
    const t = { from, angle: Math.atan2(to.y - from.y, to.x - from.x), length: 8.3, narrow: 0.5, wide: 3.0 }
    const halfWidth = x => t.narrow / 2 + (t.wide / 2 - t.narrow / 2) * Math.min(1, Math.max(0, x / t.length))
    const along = (x, y) => ({ x: t.from.x + Math.cos(t.angle) * x - Math.sin(t.angle) * y, y: t.from.y + Math.sin(t.angle) * x + Math.cos(t.angle) * y })
    const box = new Container()
    const fire = hot.map((x, i) => recoloured(x, look, `hot${i}`))
    layer.addChild(box)
    const r = rng(++serial * 104729)
    const every = 18; const pour = 450; const speed = 16; const linger = 1
    const flight = t.length / speed * 1000
    const life = flight * (1 + 0.6 * linger)
    const t0 = clock
    const puffs = []
    for (let born = 0; born < pour; born += every) {
      const sp = new Sprite(fire[0])
      sp.anchor.set(0.5)
      sp.rotation = r() * Math.PI * 2
      sp.alpha = 0
      box.addChild(sp)
      puffs.push({ sp, born, side: r() * 2 - 1, reach: 0.85 + r() * 0.2 })
    }
    fx.push({
      update (now) {
        const ms0 = now - t0
        if (ms0 > pour + life) return false
        for (const p of puffs) {
          const ms = ms0 - p.born
          if (ms < 0 || ms > life) { p.sp.alpha = 0; continue }
          const k = ms / flight
          const x = t.length * p.reach * Math.min(1, k) + (k > 1 ? (k - 1) * 0.8 : 0)
          const at = along(x, p.side * halfWidth(x) * 0.8)
          p.sp.position.set(at.x, at.y)
          const cool = ms / life
          // (big puffs: the table is seen whole, about 10 px an inch, and a breath fills a
          // template 3" across; zoomed out further they grow again, like the arrows)
          const inches = (0.35 + 1.4 * Math.min(1, k) + 0.4 * Math.max(0, k - 1)) * 1.6 * Math.max(1, 12 / Math.max(1, ppi()))
          if (cool < 0.5) {
            p.sp.texture = fire[cool < 0.2 ? 0 : 1]
            p.sp.tint = 0xffffff
            p.sp.scale.set(inches / 64)
            p.sp.alpha = 1
          } else {
            p.sp.texture = smoke[Math.min(2, Math.floor((cool - 0.5) / 0.5 * 3))]
            p.sp.tint = look.smoke
            p.sp.scale.set(inches * 1.3 / 24)
            p.sp.alpha = 0.75 * (1 - cool)
          }
        }
        return true
      },
      done () { box.destroy({ children: true }) }
    })
  }

  return {
    tick,
    play (e) {
      try {
        if (e.kind === 'volley') volley(e)
        else if (e.kind === 'cannon') cannon(e)
        else if (e.kind === 'lob') lob(e)
        else if (e.kind === 'breath') { pending++; breath(e).catch(err => { console.error('shotFx', err); (globalThis.__shotFxErrors ??= []).push(String(err?.stack || err)) }).finally(() => { pending-- }) }
      } catch (err) { console.error('shotFx', err) }
    },
    // resolves once every shot has landed and every flame has burnt out (at most `cap` ms)
    settle (cap = 3500) {
      if (!fx.length && !pending) return Promise.resolve()
      return new Promise(res => { waiting.push(res); setTimeout(res, cap) })
    },
    get busy () { return fx.length + pending }
  }
}
