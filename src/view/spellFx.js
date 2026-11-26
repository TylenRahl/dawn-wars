// SPELLS ON THE TABLE: an animation for every spell cast. Exports createSpellFx(layer, { ppi, game }), used by
// view/board.js, and LORE_LOOKS, spellLook and loreLessLook.
//
// Every lore of magic has its own colour AND its own shape of particle (LORE_LOOKS: flames for Battle Magic, skulls
// for Necromancy, leaves for the Wilds, lightning for Big Ruck Magic ...). The spell's kind (its category) decides how
// those particles move:
//   Magic Missile   the particles gather at the caster, then fly as a bolt to the target and burst on it
//   Assailment      a sudden burst on the target, no flight
//   Hex             a ring of particles closes in on the target and sinks into it (a curse)
//   Enchantment     a ring at the target's feet and particles spreading out and fading (a blessing)
//   Magical Vortex  a whirl of particles turning where the vortex is placed
//   Conveyance      a flash where the target stands and a streak to the caster
// It is called from ui/phases.js just before the engine works out the spell (rules/spells.js effects.resolve),
// and the engine waits for the IMPACT (the bolt arriving) so the dead fall as it lands. It decides nothing.
// Everything is in inches, on a layer of view/board.js's world. No Math.random: a seeded noise per cast.

import { Graphics } from 'pixi.js'
import { modelSlots } from '../rules/units.js'
import { slotsWithJoined } from './joinedSlots.js'

// THE LOOKS: one per lore (the lore's slug in data/spells.js). `motif` is the particle shape (MOTIFS below),
// `colour` its main colour, `glow` the light at its heart.
export const LORE_LOOKS = {
  'battle-magic': { motif: 'flame', colour: 0xff8a20, glow: 0xffe27a },             // orange-gold fire
  'elementalism': { motif: 'elements', colour: 0xd04a2a, glow: 0xffffff },           // fire, water, earth and air in turn
  'illusion': { motif: 'shards', colour: 0xff7ad8, glow: 0xffffff },                 // shifting rainbow mirror shards
  'necromancy': { motif: 'skulls', colour: 0x7ae05a, glow: 0xd8ffb0 },               // sickly green skulls
  'unmade-rites': { motif: 'runes', colour: 0xe0204a, glow: 0xff9ab0 },               // crimson Unmade runes
  'dark-magic': { motif: 'tendrils', colour: 0x7a2ad0, glow: 0x2a0a40 },             // purple-black tendrils
  'high-magic': { motif: 'rays', colour: 0xd8ecff, glow: 0xffffff },                 // white star-light
  'lore-of-the-wilds': { motif: 'leaves', colour: 0x5aa83a, glow: 0xc8f08a },        // green leaves
  'big-ruck-magic': { motif: 'lightning', colour: 0x8aff3a, glow: 0xf0ffd0 },          // lime-green lightning
  'troll-magic': { motif: 'bubbles', colour: 0xb8c03a, glow: 0xf0f0a0 },             // bilious yellow bubbles
  'lore-of-the-gloaming': { motif: 'smoke', colour: 0x4a4a7a, glow: 0xa0a0d0 },  // indigo shadow smoke
  'lore-of-primal-magic': { motif: 'thorns', colour: 0xc03a1a, glow: 0xffa070 },     // blood-red thorns
  'lore-of-the-dominion': { motif: 'star8', colour: 0xd0d020, glow: 0xffffff },             // eight-pointed star, shifting colour
  'lore-of-the-unmade': { motif: 'pinkfire', colour: 0xff4ac8, glow: 0x7ac0ff },        // pink and blue flames
  'lore-of-the-moon-jade': { motif: 'water', colour: 0x2a5ad0, glow: 0xb0d8ff },               // deep blue water drops
  'lore-of-the-sun-jade': { motif: 'sunburst', colour: 0xffc020, glow: 0xfff4c0 },           // golden suns
  'lore-of-the-mere': { motif: 'motes', colour: 0x9ad8ff, glow: 0xffffff },          // pale chalice-light motes
  'lore-of-the-gnawing-one': { motif: 'warp', colour: 0x5aff2a, glow: 0x101010 },     // warp-green crackle, black heart
  'lore-of-aelsyr': { motif: 'rings', colour: 0xc0a0ff, glow: 0xffffff },           // violet-white rings
  'lore-of-the-bull-of-ash': { motif: 'embers', colour: 0xff5a10, glow: 0x2a1a10 },           // magma embers and black smoke
  'lore-of-beasts': { motif: 'claws', colour: 0xb07a3a, glow: 0xffe0b0 },            // amber claw marks
  'lore-of-kheshet': { motif: 'sand', colour: 0xe0c070, glow: 0xfff0c0 },          // whirling desert sand
  'lore-of-lorne-wood': { motif: 'pollen', colour: 0xd0e040, glow: 0xffffd0 },           // golden-green spores
  'lore-of-undeath': { motif: 'ghosts', colour: 0x7af0e0, glow: 0xe0fffa },          // cyan ghosts
  'lore-of-the-makers': { motif: 'glyphs', colour: 0x20d0b0, glow: 0xffe060 },          // turquoise temple glyphs
  'lore-of-vharnest': { motif: 'crescents', colour: 0x5a2a8a, glow: 0xd0b0ff },     // dark violet blades
  'lore-of-bosher': { motif: 'fist', colour: 0x3a9a2a, glow: 0xa0ff70 },               // a green stomping fist
  'lore-of-wangler': { motif: 'swirl', colour: 0x30c0a0, glow: 0xc0fff0 },              // sly sea-green spirals
  'lore-of-the-hunger-below': { motif: 'teeth', colour: 0xa01a2a, glow: 0xffe8d0 },     // red jaws
  // the spells with no lore (data/spells.js lore ''), by their name in loreLessLook
  'runes-of-the-anvil': { motif: 'anvil', colour: 0x4a9aff, glow: 0xffffff },        // blue rune sparks off the Anvil
  'light': { motif: 'beams', colour: 0xfff0a0, glow: 0xffffff },                     // white-gold light
  'storm-dragon': { motif: 'storm', colour: 0x4ac0ff, glow: 0xffffff }               // blue storm lightning
}
export const DEFAULT_LOOK = { motif: 'arcane', colour: 0xa890ff, glow: 0xf0e8ff }

export function loreLessLook (name = '') {
  if (/bull of ash|storm of ash/i.test(name)) return LORE_LOOKS['lore-of-the-bull-of-ash']
  if (/^rune of/i.test(name)) return LORE_LOOKS['runes-of-the-anvil']
  if (/^light of/i.test(name)) return LORE_LOOKS.light
  if (/storm dragon/i.test(name)) return LORE_LOOKS['storm-dragon']
  return DEFAULT_LOOK
}
export function spellLook (spell) {
  return (spell?.lore && LORE_LOOKS[spell.lore]) || loreLessLook(spell?.name) || DEFAULT_LOOK
}

// a small seeded noise (never Math.random: a replay draws the same)
function rng (seed) {
  let s = seed >>> 0 || 1
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
const ease = k => k * k * (3 - 2 * k)
// a colour round the colour wheel: hue in degrees, full colour
function hue (h) {
  h = ((h % 360) + 360) % 360
  const f = n => { const k = (n + h / 60) % 6; return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)))) }
  return (f(5) << 16) | (f(3) << 8) | f(1)
}
// points turned by `a` round (x, y): [dx, dy, dx, dy ...] -> flat list
function turned (x, y, a, pts) {
  const c = Math.cos(a); const s = Math.sin(a); const out = []
  for (let i = 0; i < pts.length; i += 2) out.push(x + pts[i] * c - pts[i + 1] * s, y + pts[i] * s + pts[i + 1] * c)
  return out
}

// THE PARTICLE SHAPES. Each draws one particle at (x, y), `s` inches across, alpha `al`; `p` is the particle
// ({ a: its heading, seed: 0-1, t: 0-1 through its life }), `now` the effects' clock in ms, `L` the look.
const MOTIFS = {
  flame (g, x, y, s, al, p, now, L) {
    const r = s * 0.42 * (0.85 + 0.15 * Math.sin(p.seed * 40 + now * 0.025))
    g.poly(turned(x, y, p.a, [r * 2.4, 0, 0, -r, -r * 0.4, 0, 0, r])).fill({ color: L.colour, alpha: al * 0.85 })
    g.circle(x, y, r).fill({ color: L.colour, alpha: al })
    g.circle(x, y, r * 0.5).fill({ color: L.glow, alpha: al })
  },
  elements (g, x, y, s, al, p, now, L) {
    const kinds = [0xe04a1a, 0x2a7ae0, 0x8a6a3a, 0xe8f4ff]
    const c = kinds[Math.floor(p.seed * 4)]
    g.circle(x, y, s * 0.5).fill({ color: c, alpha: al * 0.35 })
    g.circle(x, y, s * 0.28).fill({ color: c, alpha: al })
    g.circle(x, y, s * 0.12).fill({ color: L.glow, alpha: al })
  },
  shards (g, x, y, s, al, p, now) {
    const c = hue(p.seed * 360 + now * 0.3)
    g.poly(turned(x, y, p.a + now * 0.006, [s * 0.5, 0, -s * 0.3, -s * 0.2, -s * 0.15, s * 0.3])).fill({ color: c, alpha: al * 0.9 })
      .stroke({ width: s * 0.05, color: 0xffffff, alpha: al * 0.8 })
  },
  skulls (g, x, y, s, al, p, now, L) {
    const r = s * 0.32
    g.circle(x, y, r * 1.6).fill({ color: L.colour, alpha: al * 0.25 })
    g.circle(x, y - r * 0.15, r).fill({ color: L.glow, alpha: al })
    g.rect(x - r * 0.55, y + r * 0.55, r * 1.1, r * 0.5).fill({ color: L.glow, alpha: al })
    g.circle(x - r * 0.38, y - r * 0.1, r * 0.26).fill({ color: 0x0a1a08, alpha: al })
    g.circle(x + r * 0.38, y - r * 0.1, r * 0.26).fill({ color: 0x0a1a08, alpha: al })
  },
  runes (g, x, y, s, al, p, now, L) {
    const a = p.a + now * 0.004
    const st = { width: s * 0.1, color: L.colour, alpha: al }
    g.circle(x, y, s * 0.45).fill({ color: L.colour, alpha: al * 0.2 })
    g.poly(turned(x, y, a, [0, -s * 0.35, 0, s * 0.35]), false).stroke(st)
    g.poly(turned(x, y, a, [0, -s * 0.1, s * 0.25, -s * 0.32]), false).stroke(st)
    g.poly(turned(x, y, a, [0, s * 0.05, -s * 0.25, s * 0.3]), false).stroke(st)
    g.circle(x, y, s * 0.07).fill({ color: L.glow, alpha: al })
  },
  tendrils (g, x, y, s, al, p, now, L) {
    const pts = []
    for (let i = 0; i <= 6; i++) { const k = i / 6; pts.push(-k * s * 1.4, Math.sin(k * 6 + now * 0.012 + p.seed * 9) * s * 0.25) }
    const line = turned(x, y, p.a, pts)
    g.poly(line, false).stroke({ width: s * 0.22, color: L.glow, alpha: al * 0.7 })
    g.poly(line, false).stroke({ width: s * 0.1, color: L.colour, alpha: al })
    g.circle(x, y, s * 0.16).fill({ color: L.colour, alpha: al })
  },
  rays (g, x, y, s, al, p, now, L) {
    const a = now * 0.003 + p.seed * 6
    for (const b of [a, a + Math.PI / 2]) g.poly(turned(x, y, b, [s * 0.6, 0, 0, s * 0.07, -s * 0.6, 0, 0, -s * 0.07])).fill({ color: L.colour, alpha: al })
    g.circle(x, y, s * 0.25).fill({ color: L.colour, alpha: al * 0.35 })
    g.circle(x, y, s * 0.1).fill({ color: L.glow, alpha: al })
  },
  leaves (g, x, y, s, al, p, now, L) {
    const a = p.a + now * 0.005 * (p.seed > 0.5 ? 1 : -1)
    g.poly(turned(x, y, a, [s * 0.4, 0, s * 0.1, -s * 0.18, -s * 0.3, -s * 0.08, -s * 0.4, 0, -s * 0.3, s * 0.08, s * 0.1, s * 0.18])).fill({ color: p.seed > 0.7 ? L.glow : L.colour, alpha: al })
    g.poly(turned(x, y, a, [s * 0.4, 0, -s * 0.45, 0]), false).stroke({ width: s * 0.03, color: 0x2a4a1a, alpha: al })
  },
  lightning (g, x, y, s, al, p, now, L, core = 0xffffff) {
    const r = rng(Math.floor(now / 70) * 31 + Math.floor(p.seed * 1e6))
    const pts = [0, 0]
    for (let i = 1; i <= 4; i++) pts.push(-i * s * 0.35, (r() - 0.5) * s * 0.6)
    const line = turned(x, y, p.a, pts)
    g.poly(line, false).stroke({ width: s * 0.2, color: L.colour, alpha: al * 0.6 })
    g.poly(line, false).stroke({ width: s * 0.07, color: core, alpha: al })
  },
  bubbles (g, x, y, s, al, p, now, L) {
    const r = s * (0.18 + 0.2 * p.seed) * (1 + 0.15 * Math.sin(now * 0.02 + p.seed * 20))
    g.circle(x, y, r).fill({ color: L.colour, alpha: al * 0.35 }).stroke({ width: s * 0.05, color: L.colour, alpha: al })
    g.circle(x - r * 0.35, y - r * 0.35, r * 0.25).fill({ color: L.glow, alpha: al })
  },
  smoke (g, x, y, s, al, p, now, L) {
    const r = s * (0.45 + 0.4 * p.t)
    g.circle(x + r * 0.2, y + r * 0.1, r).fill({ color: 0x14141e, alpha: al * 0.35 })
    g.circle(x, y, r * 0.8).fill({ color: L.colour, alpha: al * 0.55 })
    g.circle(x - r * 0.2, y - r * 0.2, r * 0.3).fill({ color: L.glow, alpha: al * 0.4 })
  },
  thorns (g, x, y, s, al, p, now, L) {
    const st = { width: s * 0.08, color: L.colour, alpha: al }
    g.poly(turned(x, y, p.a, [s * 0.5, 0, -s * 0.5, 0]), false).stroke(st)
    for (const k of [-0.3, 0, 0.3]) g.poly(turned(x, y, p.a, [k * s, 0, (k - 0.15) * s, -s * 0.2, (k + 0.05) * s, 0, (k - 0.15) * s, s * 0.2]), false).stroke(st)
    g.circle(x + Math.cos(p.a) * s * 0.5, y + Math.sin(p.a) * s * 0.5, s * 0.07).fill({ color: L.glow, alpha: al })
  },
  star8 (g, x, y, s, al, p, now) {
    const c = hue(now * 0.25 + p.seed * 120)
    const a0 = now * 0.002 + p.seed * 3
    for (let i = 0; i < 8; i++) {
      const a = a0 + i * Math.PI / 4
      g.poly(turned(x, y, a, [0, 0, s * 0.42, 0]), false).stroke({ width: s * 0.06, color: c, alpha: al })
      g.poly(turned(x, y, a, [s * 0.5, 0, s * 0.36, -s * 0.07, s * 0.36, s * 0.07])).fill({ color: c, alpha: al })
    }
    g.circle(x, y, s * 0.1).fill({ color: 0xffffff, alpha: al })
  },
  pinkfire (g, x, y, s, al, p, now, L) {
    MOTIFS.flame(g, x, y, s, al, p, now, p.seed > 0.5 ? L : { colour: L.glow, glow: 0xffffff })
  },
  water (g, x, y, s, al, p, now, L) {
    const r = s * 0.22
    g.poly(turned(x, y, p.a, [-r * 3, 0, 0, -r, r, 0, 0, r])).fill({ color: L.colour, alpha: al * 0.9 })
    g.circle(x, y, r).fill({ color: L.colour, alpha: al })
    g.circle(x + r * 0.3, y - r * 0.3, r * 0.35).fill({ color: L.glow, alpha: al })
  },
  sunburst (g, x, y, s, al, p, now, L) {
    const a0 = now * 0.004 + p.seed * 6
    for (let i = 0; i < 6; i++) g.poly(turned(x, y, a0 + i * Math.PI / 3, [s * 0.5, 0, s * 0.2, -s * 0.08, s * 0.2, s * 0.08])).fill({ color: L.colour, alpha: al })
    g.circle(x, y, s * 0.22).fill({ color: L.colour, alpha: al })
    g.circle(x, y, s * 0.12).fill({ color: L.glow, alpha: al })
  },
  motes (g, x, y, s, al, p, now, L) {
    const tw = 0.7 + 0.3 * Math.sin(now * 0.015 + p.seed * 30)
    g.circle(x, y, s * 0.45).fill({ color: L.colour, alpha: al * 0.2 * tw })
    g.circle(x, y, s * 0.2).fill({ color: L.colour, alpha: al * 0.6 * tw })
    g.circle(x, y, s * 0.08).fill({ color: L.glow, alpha: al })
  },
  warp (g, x, y, s, al, p, now, L) { MOTIFS.lightning(g, x, y, s * 1.2, al, p, now, L, L.glow) },
  rings (g, x, y, s, al, p, now, L) {
    const r = s * (0.15 + 0.45 * ((p.t * 2 + p.seed) % 1))
    g.circle(x, y, r).stroke({ width: s * 0.06, color: L.colour, alpha: al })
    g.circle(x, y, r * 0.45).stroke({ width: s * 0.04, color: L.glow, alpha: al * 0.8 })
  },
  embers (g, x, y, s, al, p, now, L) {
    g.circle(x - s * 0.1, y + s * 0.1, s * (0.3 + 0.3 * p.t)).fill({ color: L.glow, alpha: al * 0.5 })
    g.poly(turned(x, y, p.a + now * 0.008, [s * 0.18, 0, 0, s * 0.18, -s * 0.18, 0, 0, -s * 0.18])).fill({ color: L.colour, alpha: al })
    g.circle(x, y, s * 0.07).fill({ color: 0xfff0a0, alpha: al })
  },
  claws (g, x, y, s, al, p, now, L) {
    for (const k of [-1, 0, 1]) {
      const o = k * s * 0.18
      g.poly(turned(x, y, p.a, [-s * 0.45, o - s * 0.06, 0, o + s * 0.05, s * 0.45, o - s * 0.06]), false).stroke({ width: s * 0.07, color: k ? L.colour : L.glow, alpha: al })
    }
  },
  sand (g, x, y, s, al, p, now, L) {
    for (let i = 0; i < 4; i++) {
      const a = p.seed * 20 + i * 1.7 + now * 0.004
      g.circle(x + Math.cos(a) * s * 0.3 * (i / 3), y + Math.sin(a) * s * 0.3 * (i / 3), s * 0.06).fill({ color: i % 2 ? L.glow : L.colour, alpha: al })
    }
  },
  pollen (g, x, y, s, al, p, now, L) {
    for (let i = 0; i < 3; i++) {
      const a = p.seed * 9 + i * 2.1
      g.circle(x + Math.cos(a) * s * 0.2, y + Math.sin(a) * s * 0.2, s * 0.09).fill({ color: L.colour, alpha: al })
    }
    g.circle(x, y, s * 0.3).fill({ color: L.glow, alpha: al * 0.25 })
  },
  ghosts (g, x, y, s, al, p, now, L) {
    const r = s * 0.25
    const w = Math.sin(now * 0.015 + p.seed * 10) * r * 0.5
    g.poly(turned(x, y, p.a, [r, -r, r, r, -r * 3, w + r * 0.3, -r * 3.4, w, -r * 3, w - r * 0.3])).fill({ color: L.colour, alpha: al * 0.45 })
    g.circle(x, y, r).fill({ color: L.glow, alpha: al * 0.85 })
    g.circle(x + Math.cos(p.a) * r * 0.2, y + Math.sin(p.a) * r * 0.2, r * 0.3).fill({ color: 0x0a2a2a, alpha: al })
  },
  glyphs (g, x, y, s, al, p, now, L) {
    const a = p.seed * 6
    g.poly(turned(x, y, a, [-s * 0.25, -s * 0.25, s * 0.25, -s * 0.25, s * 0.25, s * 0.25, -s * 0.25, s * 0.25])).stroke({ width: s * 0.07, color: L.colour, alpha: al })
    g.poly(turned(x, y, a, [-s * 0.1, -s * 0.1, s * 0.1, -s * 0.1, s * 0.1, s * 0.1])).fill({ color: L.glow, alpha: al })
  },
  crescents (g, x, y, s, al, p, now, L) {
    const a = p.a + now * 0.01
    g.poly(turned(x, y, a, [0, -s * 0.45, s * 0.35, 0, 0, s * 0.45, s * 0.12, 0])).fill({ color: L.colour, alpha: al })
      .stroke({ width: s * 0.04, color: L.glow, alpha: al })
  },
  fist (g, x, y, s, al, p, now, L) {
    const r = s * 0.3
    g.circle(x, y, r * 1.8).fill({ color: L.glow, alpha: al * 0.2 })
    g.circle(x, y, r).fill({ color: L.colour, alpha: al })
    for (let i = -1.5; i <= 1.5; i++) {
      const at = turned(x, y, p.a, [r * 0.9, i * r * 0.45])
      g.circle(at[0], at[1], r * 0.28).fill({ color: L.glow, alpha: al })
    }
  },
  swirl (g, x, y, s, al, p, now, L) {
    const pts = []
    const a0 = now * 0.01 + p.seed * 6
    for (let i = 0; i <= 12; i++) { const k = i / 12; const a = a0 + k * 9; pts.push(x + Math.cos(a) * s * 0.45 * k, y + Math.sin(a) * s * 0.45 * k) }
    g.poly(pts, false).stroke({ width: s * 0.08, color: L.colour, alpha: al })
    g.circle(x, y, s * 0.08).fill({ color: L.glow, alpha: al })
  },
  teeth (g, x, y, s, al, p, now, L) {
    const a = p.a + Math.PI / 2
    for (const k of [-1, 0, 1]) g.poly(turned(x, y, a, [k * s * 0.22 - s * 0.1, 0, k * s * 0.22 + s * 0.1, 0, k * s * 0.22, s * 0.32])).fill({ color: L.glow, alpha: al })
    g.poly(turned(x, y, a, [-s * 0.4, 0, s * 0.4, 0]), false).stroke({ width: s * 0.12, color: L.colour, alpha: al })
  },
  anvil (g, x, y, s, al, p, now, L) {
    MOTIFS.runes(g, x, y, s, al, p, now, L)
    g.circle(x + Math.cos(p.a) * s * 0.5, y + Math.sin(p.a) * s * 0.5, s * 0.08).fill({ color: 0xffffff, alpha: al })
  },
  beams (g, x, y, s, al, p, now, L) {
    g.poly(turned(x, y, p.a, [-s * 0.9, 0, s * 0.3, 0]), false).stroke({ width: s * 0.18, color: L.colour, alpha: al * 0.5 })
    g.poly(turned(x, y, p.a, [-s * 0.9, 0, s * 0.3, 0]), false).stroke({ width: s * 0.06, color: L.glow, alpha: al })
  },
  storm (g, x, y, s, al, p, now, L) {
    MOTIFS.lightning(g, x, y, s * 1.3, al, p, now, L)
    g.circle(x, y, s * 0.35).fill({ color: L.colour, alpha: al * 0.25 })
  },
  arcane (g, x, y, s, al, p, now, L) {
    g.poly(turned(x, y, now * 0.004 + p.seed * 6, [s * 0.35, 0, 0, s * 0.15, -s * 0.35, 0, 0, -s * 0.15])).fill({ color: L.colour, alpha: al })
    g.circle(x, y, s * 0.08).fill({ color: L.glow, alpha: al })
  }
}
export const MOTIF_NAMES = Object.keys(MOTIFS)

export function createSpellFx (layer, { ppi, game }) {
  globalThis.__spellLayer = layer // (for the harnesses)
  const fx = []
  let serial = 0
  let waiting = []
  let clock = 0
  let last = null
  function tick (wall) {
    const step = last == null ? 16 : Math.max(0, Math.min(50, wall - last))
    last = wall
    clock += step
    for (let i = fx.length - 1; i >= 0; i--) {
      let live = false
      try { live = fx[i].update(clock) !== false } catch (err) { console.error('spellFx', err); (globalThis.__spellFxErrors ??= []).push(String(err?.stack || err).slice(0, 300)) }
      if (live) continue
      try { fx[i].done?.() } catch (err) { console.error('spellFx', err) }
      fx.splice(i, 1)
    }
    if (!fx.length && waiting.length) { const w = waiting; waiting = []; w.forEach(r => r()) }
  }
  // a particle's size: about 0.7" on the table, never smaller than about 9 px
  const size = () => 0.7 * Math.max(1, 13 / Math.max(1, ppi()))

  // where a unit is and how far it spreads: the middle of its models (a joined character: its host's)
  function placeOf (u) {
    if (!u) return null
    if (u.x != null && u.y != null && !u.models) return { at: { x: u.x, y: u.y }, r: 2 }
    const host = u.status?.joinedTo ? (u.joinedHost || game?.units?.find(x => x.id === u.status.joinedTo)) : null
    let slots = []
    try { slots = (host ? slotsWithJoined(host) : u.joined?.length ? slotsWithJoined(u) : modelSlots(u)).map(s => s.at) } catch { slots = [] }
    if (!slots.length) return u.pos ? { at: { ...u.pos }, r: 1 } : null
    const at = { x: slots.reduce((a, s) => a + s.x, 0) / slots.length, y: slots.reduce((a, s) => a + s.y, 0) / slots.length }
    const r = Math.max(0.8, ...slots.map(s => Math.hypot(s.x - at.x, s.y - at.y))) + 0.4
    return { at, r }
  }

  // ONE EFFECT: `draw(g, now)` every frame until it returns false
  function effect (start, draw) {
    const g = new Graphics()
    layer.addChild(g)
    fx.push({
      update (now) { g.clear(); if (now < start) return true; return draw(g, now) !== false },
      done () { g.destroy() }
    })
  }

  // a glowing ring on the table, `r` inches, growing or shrinking
  const ring = (g, at, r, L, al, w = 0.12) => {
    g.circle(at.x, at.y, r).stroke({ width: w * size(), color: L.colour, alpha: al })
    g.circle(at.x, at.y, r).stroke({ width: w * size() * 0.35, color: L.glow, alpha: al })
  }

  // THE GATHERING at the caster: particles drawn in from a ring round it (all spells)
  function gather (at, L, start, dur, r0) {
    const r = rng(++serial * 7907)
    const ps = Array.from({ length: 12 }, () => ({ a: r() * Math.PI * 2, seed: r(), t: 0 }))
    effect(start, (g, now) => {
      const k = (now - start) / dur
      if (k >= 1) return false
      const s = size()
      for (const p of ps) {
        const d = r0 * (1 - ease(k)) + 0.2
        const a = p.a + k * 2.5
        p.t = k
        MOTIFS[L.motif](g, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, s * 0.8, Math.min(1, k * 3), { ...p, a: a + Math.PI }, now, L)
      }
      g.circle(at.x, at.y, 0.3 + 0.6 * k).fill({ color: L.colour, alpha: 0.25 * k })
    })
  }

  // THE BURST on the target: particles thrown out from the middle, a ring going out
  function burst (at, L, start, r0, { inward = false, dur = 750, n = 18 } = {}) {
    const r = rng(++serial * 104729)
    const ps = Array.from({ length: n }, () => ({ a: r() * Math.PI * 2, seed: r(), d: 0.4 + r() * 0.6, t: 0 }))
    effect(start, (g, now) => {
      const k = (now - start) / dur
      if (k >= 1) return false
      const s = size()
      const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
      const out = inward ? 1 - ease(k) : ease(k)
      ring(g, at, Math.max(0.2, r0 * (inward ? 1.3 - k : 0.3 + 1.0 * k)), L, 0.7 * fade)
      if (!inward && k < 0.25) g.circle(at.x, at.y, r0 * 0.6).fill({ color: L.glow, alpha: 0.5 * (1 - k / 0.25) })
      for (const p of ps) {
        const d = r0 * p.d * (inward ? 0.15 + 1.1 * out : 0.2 + 1.1 * out)
        p.t = k
        MOTIFS[L.motif](g, at.x + Math.cos(p.a) * d, at.y + Math.sin(p.a) * d, s, fade, { ...p, a: inward ? p.a + Math.PI : p.a }, now, L)
      }
      if (inward && k > 0.7) g.circle(at.x, at.y, r0 * 0.5).fill({ color: L.colour, alpha: 0.45 * (1 - k) / 0.3 })
    })
  }

  // THE BOLT from the caster to the target (a Magic Missile): a head of particles and a trail behind it
  function bolt (a, b, L, start) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const dur = Math.max(350, Math.min(1000, 180 + dist * 28))
    const ang = Math.atan2(b.y - a.y, b.x - a.x)
    const r = rng(++serial * 1299709)
    const ps = Array.from({ length: 10 }, () => ({ seed: r(), off: r(), side: r() - 0.5, t: 0 }))
    effect(start, (g, now) => {
      const k = (now - start) / dur
      if (k >= 1) return false
      const s = size()
      const e = k
      const head = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e }
      g.circle(head.x, head.y, s * 0.9).fill({ color: L.colour, alpha: 0.3 })
      for (const p of ps) {
        const back = p.off * Math.min(2.5, dist * e)
        const wob = p.side * s * 0.8 * Math.sin(now * 0.02 + p.seed * 10)
        const x = head.x - Math.cos(ang) * back - Math.sin(ang) * wob
        const y = head.y - Math.sin(ang) * back + Math.cos(ang) * wob
        p.t = k
        MOTIFS[L.motif](g, x, y, s * (1.1 - p.off * 0.5), 1 - p.off * 0.6, { ...p, a: ang }, now, L)
      }
      g.circle(head.x, head.y, s * 0.3).fill({ color: L.glow, alpha: 0.9 })
    })
    return dur
  }

  // THE VORTEX: particles whirling round the point, drawn in and thrown out
  function vortex (at, L, start, r0) {
    const dur = 1500
    const r = rng(++serial * 15485863)
    const ps = Array.from({ length: 22 }, () => ({ a: r() * Math.PI * 2, seed: r(), d: 0.2 + r() * 0.8, t: 0 }))
    effect(start, (g, now) => {
      const k = (now - start) / dur
      if (k >= 1) return false
      const s = size()
      const fade = Math.min(1, k * 4, (1 - k) * 4)
      ring(g, at, r0, L, 0.5 * fade, 0.08)
      g.circle(at.x, at.y, r0 * 0.35).fill({ color: L.colour, alpha: 0.3 * fade })
      for (const p of ps) {
        const a = p.a + (now - start) * 0.006 * (1.5 - p.d)
        const d = r0 * p.d * (0.85 + 0.15 * Math.sin(now * 0.008 + p.seed * 7))
        p.t = k
        MOTIFS[L.motif](g, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, s, fade, { ...p, a: a + Math.PI / 2 }, now, L)
      }
    })
    return dur
  }

  // a cast: returns a promise that resolves when the spell STRIKES (the engine then works it out)
  function cast ({ caster, spell, target, perfect = false }) {
    const L = spellLook(spell)
    const from = placeOf(caster)
    const to = placeOf(target) || from
    if (!from) return Promise.resolve()
    const start = clock
    const gatherMs = 380
    gather(from.at, L, start, gatherMs, Math.max(1.2, Math.min(2.5, from.r)))
    if (perfect) burst(from.at, L, start + gatherMs - 120, 2.2, { dur: 500, n: 10 }) // a perfect invocation flares at the caster
    let impact = gatherMs
    const cat = spell?.category || ''
    if (cat === 'Magic Missile') {
      impact += bolt(from.at, to.at, L, start + gatherMs)
      burst(to.at, L, start + impact, Math.max(1.2, to.r))
    } else if (cat === 'Assailment') {
      burst(to.at, L, start + gatherMs, Math.max(1, to.r), { dur: 650, n: 22 })
      impact += 150
    } else if (cat === 'Hex') {
      burst(to.at, L, start + gatherMs, Math.max(1.2, to.r), { inward: true, dur: 900 })
      impact += 700
    } else if (cat === 'Enchantment') {
      burst(to.at, L, start + gatherMs, Math.max(1.2, to.r), { dur: 1000, n: 16 })
      impact += 250
    } else if (cat === 'Magical Vortex') {
      vortex(to.at, L, start + gatherMs, Math.max(1.5, to.r))
      impact += 500
    } else { // Conveyance, and anything else
      burst(to.at, L, start + gatherMs, Math.max(1, to.r), { inward: true, dur: 450, n: 12 })
      burst(to.at, L, start + gatherMs + 450, Math.max(1, to.r), { dur: 500, n: 12 })
      if (to !== from) bolt(to.at, from.at, L, start + gatherMs)
      impact += 450
    }
    // the engine waits for the strike, never longer than 2 seconds (a stalled page must not hold the game)
    return new Promise(res => {
      const at = start + impact
      fx.push({ update (now) { if (now >= at) { res(); return false } return true } })
      setTimeout(res, 2000)
    })
  }

  return {
    tick,
    cast (e) { try { return cast(e) } catch (err) { console.error('spellFx', err); (globalThis.__spellFxErrors ??= []).push(String(err?.stack || err)); return Promise.resolve() } },
    settle (cap = 2500) {
      if (!fx.length) return Promise.resolve()
      return new Promise(res => { waiting.push(res); setTimeout(res, cap) })
    },
    get busy () { return fx.length }
  }
}
