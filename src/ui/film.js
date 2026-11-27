// THE TEST MATCH FILM: a scripted match between the Concord Realm and the Rukka & Nippers, played through the real
// screens so it can be recorded as a video. Exports runFilm({ q }) and FILM_SEED.
//
// Loaded only with ?film (src/main.js). It plays the whole video inside the page on timers, so the stepped
// clock of an external frame renderer can film it frame by frame:
//   a title card; both armies built on camera in Army Lists (the real buttons, clicked by a visible pointer) and saved;
//   the Battle setup at 1000 points on the map Rhenmark Crossing; deployment; rounds 1 and 2; a closing card.
// It is a PLAYER, not a rule: every action goes through the screen's own buttons and modes (or, for a move, the
// engine's makeMove, which is what the Move pips call), every roll is the seeded game's, and every caption is read
// off what the game did (models lost, the log's words), never made up.
//
//   ?film&intro=off            the film, in real time (for a look in a browser)
//   ?film=2000                 the FULL match: the intro, 2000-point lists with wizards and magic
//                              items bought on camera, cannons, Rock Chuckas and a giant, the map Talvar Fields, every
//                              round to the end, the result
//   &render                    wait for window.__filmBegin() (the renderer calls it once the pictures have loaded)
//   &skipTo=N                  play rounds before N at full speed, with no pauses and no captions (to film the rest later)
//   &seed=N                    the dice seed (default FILM_SEED)
//   &quick                     no pauses anywhere (a quick check by the harness)

import { findEntry, ARMY_NAMES } from '../rules/roster.js'
import { centre, distanceBetween, isDead, alive, modelCount } from '../rules/units.js'
import { canDeclareCharge } from '../rules/charge.js'
import { canShoot, shootingTargets } from '../rules/shooting.js'
import { checkMove, makeMove, movementOf } from '../rules/movement.js'
import { onTable, unitsOf, whoDeploys, deployable, deployUnit } from '../rules/game.js'
import { isCharacter } from '../rules/joining.js'
import { isWarMachine } from '../rules/warMachines.js'
import { castable, spellTargets, vortexPointOk } from '../rules/magic.js'
import { hostOf } from '../rules/joining.js'
import { playIntro } from './intro.js'
import { forDisplay } from '../rules/displayNames.js'

// The page shows every name through forDisplay (ui/shownNames.js), so wherever the film finds a button or a choice by
// its words, both sides are put through forDisplay first.
const same = s => forDisplay(String(s ?? ''))

// (picked from seeds 1104, 7, 21, 42, 77, 128 played at full speed: 128 has the most happen in rounds 1-2 —
// the Pistoliers charge the Trolls, the Boar Ladz break the handgunners)
export const FILM_SEED = 128
const MAP = 'field-1000'
const E = 'concord-realm'; const O = 'rukka-firms'

// THE TWO ARMIES, as they are built on camera. Priced and checked with the builder's own checkList: Concord Realm 988, Rukka
// 998 of 1000, both legal. Each unit: the entry, the models, then the Wargear drop-downs and the ticks.
export const FILM_LISTS = [
  {
    name: 'Rhenmark Vanguard', army: E, // (typed into the list's name box, which the page's renaming does not reach)
    units: [
      { id: 'general-of-the-realm', weapons: 'Hand weapon', armour: 'Full plate armour', mount: 'On foot', ticks: ['Shield'], command: ['General'] },
      { id: 'captain-of-the-realm', weapons: 'Hand weapon', armour: 'Heavy armour', mount: 'On foot', ticks: ['Shield'], command: [] },
      { id: 'march-troops', count: 25, weapons: 'Halberds', armour: 'Light armour', command: ['Sergeant (champion)', 'Standard bearer', 'Musician'] },
      { id: 'march-troops', count: 20, weapons: 'Thrusting spears', armour: 'Light armour', ticks: ['Shields'], command: ['Sergeant (champion)', 'Standard bearer', 'Musician'] },
      { id: 'march-missile-troops', count: 10, weapons: 'Hand weapons, Crossbows', armour: 'Light armour', command: [] },
      { id: 'march-missile-troops', count: 10, weapons: 'Hand weapons, Handguns', armour: 'Light armour', command: [] },
      { id: 'realm-knights', count: 6, weapons: 'Hand weapons, Lances, Shields', armour: 'Heavy armour, Barding', command: ['Preceptor (champion)', 'Standard bearer', 'Musician'] },
      { id: 'pistoliers', count: 5, weapons: 'Hand weapons, Brace of pistols', armour: 'Heavy armour', command: ['Musician'] },
      { id: 'great-cannon', weapons: 'Great cannon, Hand weapons' }
    ]
  },
  {
    name: "Big Vic's Raiders", army: O,
    units: [
      { id: 'rukka-gaffer', weapons: 'Hand weapon', armour: 'Heavy armour', mount: 'On foot', ticks: ['Shield'], command: ['General'] },
      { id: 'rukka-top-lad', weapons: 'Hand weapon', armour: 'Heavy armour', mount: 'On foot', ticks: ['Shield'], command: [] },
      { id: 'gloom-nipper-top-lad', weapons: 'Hand weapon', armour: 'Light armour', mount: 'On foot', ticks: ['Shield'], command: [] },
      { id: 'rukka-mob', count: 25, weapons: 'Hand weapons', armour: 'Light armour', ticks: ['Shields'], command: ['Boss (champion)', 'Standard bearer', 'Musician'] },
      { id: 'rukka-mob', count: 15, weapons: 'Warbows', armour: 'Light armour', command: ['Musician'] },
      { id: 'gloom-nipper-mob', count: 25, weapons: 'Hand weapons, Shortbows', command: ['Boss (champion)', 'Standard bearer', 'Musician'] },
      { id: 'rukka-boar-lad-mob', count: 7, weapons: 'Cavalry spears', armour: 'Light armour', ticks: ['Shields'], command: ['Boss (champion)', 'Standard bearer', 'Musician'] },
      { id: 'nipper-wolf-rider-mob', count: 8, weapons: 'Hand weapons, Shortbows', armour: 'Light armour', command: ['Musician'] },
      { id: 'common-troll-mob-special', count: 3 },
      { id: 'nipper-rock-chucka', weapons: 'Stone thrower, Hand weapons' }
    ]
  }
]

// WHERE EACH UNIT IS PUT DOWN on Rhenmark Crossing (rules/maps.js): its front centre and its frontage (models wide).
// Blue's front edge on y 37 facing the far edge, red's on y 11 facing the near edge; each war machine on its own hill.
// A character joins the unit named by `join`.
const missile = (u, key) => (u.kit?.ranged || []).some(w => w.key.includes(key))
const DEPLOY = [
  // Concord Realm
  { side: 0, is: u => u.entryId === 'great-cannon', at: { x: 48, y: 39.5 } },
  { side: 0, is: u => u.entryId === 'march-troops' && modelCount(u) === 25, at: { x: 33, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'march-troops' && modelCount(u) === 20, at: { x: 25, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'march-missile-troops' && missile(u, 'crossbow'), at: { x: 41, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'march-missile-troops' && missile(u, 'handgun'), at: { x: 56, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'realm-knights', at: { x: 64, y: 37 }, files: 3 },
  { side: 0, is: u => u.entryId === 'pistoliers', at: { x: 15, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'general-of-the-realm', join: u => u.entryId === 'march-troops' && modelCount(u) === 25 },
  { side: 0, is: u => u.entryId === 'captain-of-the-realm', join: u => u.entryId === 'march-troops' && modelCount(u) === 20 },
  // Rukka & Nippers
  { side: 1, is: u => u.entryId === 'nipper-rock-chucka', at: { x: 24, y: 8.5 } },
  { side: 1, is: u => u.entryId === 'rukka-mob' && modelCount(u) === 25, at: { x: 39, y: 11 }, files: 5 },
  { side: 1, is: u => u.entryId === 'rukka-mob' && modelCount(u) === 15, at: { x: 31, y: 11 }, files: 5 },
  { side: 1, is: u => u.entryId === 'gloom-nipper-mob', at: { x: 47, y: 11 }, files: 5 },
  { side: 1, is: u => u.entryId === 'rukka-boar-lad-mob', at: { x: 56, y: 11 }, files: 4 },
  { side: 1, is: u => u.entryId === 'nipper-wolf-rider-mob', at: { x: 65, y: 11 }, files: 4 },
  { side: 1, is: u => u.entryId === 'common-troll-mob-special', at: { x: 16, y: 11 }, files: 3 },
  { side: 1, is: u => u.entryId === 'rukka-gaffer', join: u => u.entryId === 'rukka-mob' && modelCount(u) === 25 },
  { side: 1, is: u => u.entryId === 'rukka-top-lad', join: u => u.entryId === 'rukka-mob' && modelCount(u) === 15 },
  { side: 1, is: u => u.entryId === 'gloom-nipper-top-lad', join: u => u.entryId === 'gloom-nipper-mob' }
]

// THE 2000-POINT MATCH (?film=2000). Priced with the builder's own checkList: Concord Realm 1983, Rukka 1988 of 2000 (the Iron Rukka Mob is the Core entry: the builder's first '+ Iron Rukka Mob'), both
// legal. `wizard` is the Wizard level drop-down, `lore` the Lore drop-down, `items` the magic items bought
// from the unit's 'Add a magic item' menu (their ids).
export const FILM_LISTS_2000 = [
  {
    name: 'Talvar Muster', army: E,
    units: [
      { id: 'general-of-the-realm', weapons: 'Hand weapon', armour: 'Full plate armour', mount: 'On foot', ticks: ['Shield'], command: ['General'], items: ['oathblade'] },
      { id: 'captain-of-the-realm', weapons: 'Hand weapon', armour: 'Heavy armour', mount: 'On foot', command: ['Battle Standard Bearer'], items: ['griffon-standard'] },
      { id: 'wizard-lord', weapons: 'Hand weapon', mount: 'On foot', wizard: 'Level 4 Wizard', lore: 'battle-magic', items: ['power-scroll'] },
      { id: 'master-mage', weapons: 'Hand weapon', mount: 'On foot', wizard: 'Level 2 Wizard', lore: 'elementalism', items: ['unweaving-scroll'] },
      { id: 'march-troops', count: 30, weapons: 'Halberds', armour: 'Light armour', command: ['Sergeant (champion)', 'Standard bearer', 'Musician'] },
      { id: 'march-troops', count: 20, weapons: 'Thrusting spears', armour: 'Light armour', ticks: ['Shields'], command: ['Sergeant (champion)', 'Standard bearer', 'Musician'] },
      { id: 'kingsblades', count: 20, weapons: 'Hand weapons, Great weapons', armour: 'Full plate armour', command: ["Count's Champion (champion)", 'Standard bearer', 'Musician'] },
      { id: 'march-missile-troops', count: 10, weapons: 'Hand weapons, Crossbows', armour: 'Light armour', command: [] },
      { id: 'march-missile-troops', count: 10, weapons: 'Hand weapons, Handguns', armour: 'Light armour', command: [] },
      { id: 'realm-knights', count: 8, weapons: 'Hand weapons, Lances, Shields', armour: 'Heavy armour, Barding', command: ['Preceptor (champion)', 'Standard bearer', 'Musician'] },
      { id: 'pistoliers', count: 5, weapons: 'Hand weapons, Brace of pistols', armour: 'Heavy armour', command: ['Musician'] },
      { id: 'great-cannon', weapons: 'Great cannon, Hand weapons' },
      { id: 'great-cannon', weapons: 'Great cannon, Hand weapons' },
      { id: 'mortar', weapons: 'Mortar, Hand weapons' }
    ]
  },
  {
    name: "Iron Reg's Horde", army: O,
    units: [
      { id: 'rukka-gaffer', weapons: 'Hand weapon', armour: 'Heavy armour', mount: 'On foot', ticks: ['Shield'], command: ['General'], items: ['battleaxe-of-the-last-big-ruck'] },
      { id: 'iron-rukka-top-lad', weapons: 'Hand weapon', armour: 'Full plate armour', mount: 'On foot', command: ['Battle Standard Bearer'] },
      { id: 'rukka-big-head-case', weapons: 'Hand weapon', mount: 'On foot', wizard: 'Level 4 Wizard', lore: 'big-ruck-magic' },
      { id: 'gloom-nipper-odd-bod', weapons: 'Hand weapon', mount: 'On foot', wizard: 'Level 2 Wizard', lore: 'troll-magic' },
      { id: 'gloom-nipper-top-lad', weapons: 'Hand weapon', armour: 'Light armour', mount: 'On foot', ticks: ['Shield'], command: [] },
      { id: 'rukka-mob', count: 30, weapons: 'Hand weapons', armour: 'Light armour', ticks: ['Shields'], command: ['Boss (champion)', 'Standard bearer', 'Musician'] },
      { id: 'rukka-mob', count: 15, weapons: 'Warbows', armour: 'Light armour', command: ['Musician'] },
      { id: 'iron-rukka-mob-core', count: 15, weapons: 'Hand weapons', armour: 'Full plate armour', command: ['Boss (champion)', 'Standard bearer', 'Musician'] },
      { id: 'gloom-nipper-mob', count: 30, weapons: 'Hand weapons, Shortbows', command: ['Boss (champion)', 'Standard bearer', 'Musician'] },
      { id: 'nipper-mob', count: 20, weapons: 'Hand weapons, Shortbows', command: ['Boss (champion)', 'Standard bearer', 'Musician'] },
      { id: 'rukka-boar-lad-mob', count: 7, weapons: 'Cavalry spears', armour: 'Light armour', ticks: ['Shields'], command: ['Boss (champion)', 'Standard bearer', 'Musician'] },
      { id: 'nipper-wolf-rider-mob', count: 8, weapons: 'Hand weapons, Shortbows', armour: 'Light armour', command: ['Musician'] },
      { id: 'common-troll-mob-special', count: 3 },
      { id: 'giant', weapons: "Giant's club" },
      { id: 'nipper-rock-chucka', weapons: 'Stone thrower, Hand weapons' },
      { id: 'nipper-rock-chucka', weapons: 'Stone thrower, Hand weapons' }
    ]
  }
]
// WHERE EACH UNIT IS PUT DOWN on Talvar Fields (rules/maps.js field-2000): the war machines on the two hills of each
// zone (the mortar between them), the battle lines along y 37 (blue) and y 11 (red).
const nth = (entry, k) => (u, game) => u.entryId === entry && game.units.filter(x => x.side === u.side && x.entryId === entry).indexOf(u) === k
const DEPLOY_2000 = [
  { side: 0, is: nth('great-cannon', 0), at: { x: 17, y: 43 } },
  { side: 0, is: nth('great-cannon', 1), at: { x: 55, y: 43 } },
  { side: 0, is: u => u.entryId === 'mortar', at: { x: 36, y: 45 } },
  { side: 0, is: u => u.entryId === 'march-troops' && modelCount(u) === 30, at: { x: 29, y: 37 }, files: 6 },
  { side: 0, is: u => u.entryId === 'march-troops' && modelCount(u) === 20, at: { x: 20, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'kingsblades', at: { x: 38, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'march-missile-troops' && missile(u, 'crossbow'), at: { x: 46, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'march-missile-troops' && missile(u, 'handgun'), at: { x: 54, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'realm-knights', at: { x: 63, y: 37 }, files: 4 },
  { side: 0, is: u => u.entryId === 'pistoliers', at: { x: 9, y: 37 }, files: 5 },
  { side: 0, is: u => u.entryId === 'general-of-the-realm', join: u => u.entryId === 'march-troops' && modelCount(u) === 30 },
  { side: 0, is: u => u.entryId === 'captain-of-the-realm', join: u => u.entryId === 'march-troops' && modelCount(u) === 20 },
  { side: 0, is: u => u.entryId === 'wizard-lord', join: u => u.entryId === 'kingsblades' },
  { side: 0, is: u => u.entryId === 'master-mage', join: u => u.entryId === 'march-missile-troops' && missile(u, 'crossbow') },
  { side: 1, is: nth('nipper-rock-chucka', 0), at: { x: 17, y: 5 } },
  { side: 1, is: nth('nipper-rock-chucka', 1), at: { x: 55, y: 5 } },
  { side: 1, is: u => u.entryId === 'rukka-mob' && modelCount(u) === 30, at: { x: 38, y: 11 }, files: 6 },
  { side: 1, is: u => /^iron-rukka-mob/.test(u.entryId), at: { x: 30, y: 11 }, files: 5 },
  { side: 1, is: u => u.entryId === 'rukka-mob' && modelCount(u) === 15, at: { x: 46, y: 11 }, files: 5 },
  { side: 1, is: u => u.entryId === 'gloom-nipper-mob', at: { x: 22, y: 11 }, files: 6 },
  { side: 1, is: u => u.entryId === 'nipper-mob', at: { x: 54, y: 11 }, files: 5 },
  { side: 1, is: u => u.entryId === 'rukka-boar-lad-mob', at: { x: 62, y: 11 }, files: 4 },
  { side: 1, is: u => u.entryId === 'giant', at: { x: 68, y: 11 } },
  { side: 1, is: u => u.entryId === 'common-troll-mob-special', at: { x: 13, y: 11 }, files: 3 },
  { side: 1, is: u => u.entryId === 'nipper-wolf-rider-mob', at: { x: 6, y: 11 }, files: 4 },
  { side: 1, is: u => u.entryId === 'rukka-gaffer', join: u => u.entryId === 'rukka-mob' && modelCount(u) === 30 },
  { side: 1, is: u => u.entryId === 'iron-rukka-top-lad', join: u => /^iron-rukka-mob/.test(u.entryId) },
  { side: 1, is: u => u.entryId === 'rukka-big-head-case', join: u => u.entryId === 'rukka-mob' && modelCount(u) === 30 },
  { side: 1, is: u => u.entryId === 'gloom-nipper-odd-bod', join: u => u.entryId === 'gloom-nipper-mob' },
  { side: 1, is: u => u.entryId === 'gloom-nipper-top-lad', join: u => u.entryId === 'gloom-nipper-mob' }
]
const FILMS = {
  1000: { points: 1000, map: MAP, mapName: 'Rhenmark Crossing', lists: FILM_LISTS, deploy: DEPLOY, seed: FILM_SEED, stopAfter: 2, intro: false,
    title: 'Test match &middot; The Concord Realm v Rukka &amp; Nippers &middot; 1000 points',
    mapLine: 'Rhenmark Crossing: the same ground for both sides — a hill in each deployment zone for the war machines, a wood, a wall and a stream on each half.' },
  2000: { points: 2000, map: 'field-2000', mapName: 'Talvar Fields', lists: FILM_LISTS_2000, deploy: DEPLOY_2000, seed: 2000, stopAfter: null, intro: true, zoom: true,
    title: 'Full match &middot; The Concord Realm v Rukka &amp; Nippers &middot; 2000 points',
    mapLine: 'Talvar Fields, for 2000 points on the standard 48" x 72" table: two hills in each deployment zone for the cannons, the mortar and the Rock Chuckas, woods, walls and streams out on the flanks.' }
}

export async function runFilm ({ q }) {
  const F = FILMS[q.get('film') === '2000' ? 2000 : 1000]
  const seed = +(q.get('seed') || F.seed)
  const skipTo = +(q.get('skipTo') || 0)
  // (&quick: no pauses at all, for the harness's quick checks)
  const quick = q.has('quick')
  let fast = quick
  const wait = ms => fast ? Promise.resolve() : new Promise(r => setTimeout(r, ms))
  document.documentElement.classList.add('dw-film')

  // ---- the pointer, the captions and the cards ----
  const cursor = document.createElement('div')
  cursor.id = 'film-cursor'
  cursor.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 2 L3 20 L8 15 L11.5 22 L14.5 20.6 L11 13.8 L18 13.8 Z" fill="#fff" stroke="#1a140b" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  const caption = document.createElement('div')
  caption.id = 'film-caption'
  const card = document.createElement('div')
  card.id = 'film-card'
  document.body.append(card, caption, cursor)
  // NO POINTER DURING THE INTRO: hidden from the start, shown again once the intro is over (see 'Title')
  cursor.style.display = 'none'
  let cx = innerWidth / 2; let cy = innerHeight / 2
  const place = () => { cursor.style.transform = `translate(${cx}px, ${cy}px)` }
  place()
  // glide the pointer to (x, y) in `ms` on animation frames (the renderer steps those)
  const moveTo = (x, y, ms = 450) => new Promise(resolve => {
    if (fast) { cx = x; cy = y; place(); resolve(); return }
    const x0 = cx; const y0 = cy; const t0 = performance.now()
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms); const e = k * k * (3 - 2 * k)
      cx = x0 + (x - x0) * e; cy = y0 + (y - y0) * e; place()
      if (k < 1) requestAnimationFrame(step); else resolve()
    }
    requestAnimationFrame(step)
  })
  const pulse = () => { cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click') }
  const point = async el => {
    el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    const r = el.getBoundingClientRect()
    await moveTo(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2)
  }
  const click = async (el, after = 350) => { if (!el) throw new Error('film: nothing to click'); await point(el); pulse(); await wait(120); el.click(); await wait(after) }
  const setValue = async (el, value, after = 350) => {
    await point(el); pulse(); await wait(150)
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))
    await wait(after)
  }
  const type = async (el, text) => {
    await point(el); pulse(); await wait(150)
    el.value = ''
    for (const ch of text) { el.value += ch; el.dispatchEvent(new Event('input', { bubbles: true })); await wait(55) }
    el.dispatchEvent(new Event('change', { bubbles: true }))
    await wait(250)
  }
  const say = (text, hold = 0) => {
    if (fast) return Promise.resolve()
    caption.textContent = text
    caption.classList.toggle('on', !!text)
    return wait(hold)
  }
  const showCard = async (title, sub, ms) => {
    card.innerHTML = `<div class="t">${title}</div><div class="s">${sub}</div>`
    card.classList.add('on')
    await wait(ms)
    card.classList.remove('on')
    await wait(400)
  }
  const $ = s => document.querySelector(s)
  const $$ = s => [...document.querySelectorAll(s)]
  const buttonText = (root, re) => [...(typeof root === 'string' ? document.querySelectorAll(`${root} button`) : root.querySelectorAll('button'))].find(b => re.test(b.textContent.trim()) && !b.disabled)
  const until = async (fn, ms = 20000, every = 100) => { for (let t = 0; t < ms; t += every) { const v = fn(); if (v) return v; await new Promise(r => setTimeout(r, every)) } throw new Error('film: waited too long') }

  // the renderer starts the film once the page has loaded and time is frozen
  if (q.has('render')) await new Promise(r => { window.__filmBegin = r })
  // THE CHAPTERS, on the film's own clock (performance.now, stepped by the renderer): the mixer changes the music at
  // them and the video's description lists them
  const t0 = performance.now()
  window.__filmMarks = []
  const mark = (chapter, music = null) => { if (!fast) window.__filmMarks.push({ t: (performance.now() - t0) / 1000, chapter: same(chapter), music }) } // (the chapter list for the video description, in the shown names)
  // ---- the game's own intro (?film=2000): played to its end, on the wall clock the renderer steps (no song is played
  // in the page: the mixer lays Imperio Antiguo under it from this mark, and the intro is timed to that song) ----
  if (F.intro && !quick && !skipTo) {
    mark('Intro', 'intro')
    const menuEl = document.getElementById('menu')
    menuEl.classList.add('dw-intro')
    await new Promise(r => playIntro(menuEl, { music: null, onDone: r }))
    await wait(2500)
  }
  mark('Title', 'lists')
  cursor.style.display = ''

  // ---- the title ----
  await showCard('DAWN WARS: BROKEN PAST', F.title, 3500)

  // ---- the armies, built on camera ----
  for (const L of F.lists) { mark(`Army Lists: ${L.name}`); await buildList(L) }

  // ---- the battle setup ----
  mark('Battle setup', 'setup')
  await say(`Battle setup: ${F.points} points, both saved lists, the map ${F.mapName}.`)
  await click($('#m-battle'), 800)
  await setValue($('#setup-points'), String(F.points), 600)
  for (const [side, L] of [['blue', F.lists[0]], ['red', F.lists[1]]]) {
    const sel = $(`#army-${side}`)
    if (sel.value !== L.army) await setValue(sel, L.army, 500)
    const cardEl = await until(() => $$(`[data-pick-side="${side}"]`).find(c => same(c.querySelector('.bl-list-card-name')?.textContent) === same(L.name)))
    await click(cardEl, 600)
  }
  await setValue($('#setup-map'), F.map, 1200)
  await setValue($('#setup-seed'), String(seed), 600)
  await say(F.mapLine, 3500)
  // (the table loads its pictures in real time: the film holds — and the renderer neither steps its film nor captures —
  // until the battle screen says it is ready, so a render picked up part way lines up frame for frame)
  const ready = new Promise(r => window.addEventListener('dw-battle-ready', r, { once: true }))
  window.__filmHold = true
  await click($('[data-go]'), 0)
  await ready
  window.__filmHold = false

  // ---- the battle ----
  const probe = await until(() => window.__probe?.game?.units?.length && window.__probe, 120000, 200)
  const { game, ui, board } = probe
  // what each volley did (the board's own hook stays: the film only listens)
  let lastVolley = null
  const drawShot = game.onShot
  game.onShot = e => { if (e.kind === 'volley') lastVolley = e; drawShot?.(e) }
  await wait(1500)
  const toPage = p => probe.screenAt(p.x, p.y)
  const name = u => u.name.replace(/\s*\(.*$/, '')
  const sideName = s => s === 0 ? 'The Concord Realm' : 'The Rukka'
  const lostIn = u => modelCount(u) + (u.joined || []).filter(c => !c.status.removed).reduce((a, c) => a + modelCount(c), 0)

  // answer whatever the side panel asks: the first answer matching a preference, else the first
  const answer = async (prefs = []) => {
    const bs = [...document.querySelectorAll('#prompt button')].filter(b => !b.disabled)
    if (!bs.length) return false
    const b = prefs.map(re => bs.find(x => re.test(x.textContent))).find(Boolean) || bs[0]
    await click(b, 500)
    return true
  }
  // let the screen finish what it is doing: answer its questions, wait for slides and shots
  const settle = async (prefs = []) => {
    let quiet = 0
    for (let i = 0; i < 400 && quiet < 3; i++) {
      await new Promise(r => setTimeout(r, 150))
      if (board.gliding || board.shotsFlying) { quiet = 0; continue }
      // (the newest question: an earlier 'click a target' line can stay above a new one)
      const qs = [...document.querySelectorAll('#prompt .q')].pop()?.textContent || ''
      // (a question with answers that is not the deployment tray)
      if (document.querySelector('#prompt button') && !/pick a unit, then click/.test(qs) && !/click the enemy unit|click a target/.test(qs)) { await answer(prefs); quiet = 0; continue }
      quiet++
    }
    await board.settle?.()
  }
  // click the table and answer what the click asks while it is still running: a shot or a spell can stop for a
  // question (Multiple Shots, a dispel), and its promise only settles once that question is answered
  const downAndSettle = async (p, t, prefs = []) => {
    let done = false
    const run = Promise.resolve(ui.mode?.down?.(p, t)).finally(() => { done = true })
    for (let i = 0; !done && i < 60; i++) {
      await settle(prefs)
      // (still waiting for a click on the table that the film does not choose: let it go)
      if (!done && /^Click /.test([...document.querySelectorAll('#prompt .q')].pop()?.textContent || '')) ui.mode?.right?.()
    }
    if (!done) return
    await run
  }
  // THE CAMERA (?film=2000): in close on every combat, on
  // the war machines' and the spells' targets, then back out to the whole table (view/board.js zoomTo / zoomHome)
  let zoomed = false
  const zoomIn = async (p, z = 2.4) => { if (fast || !F.zoom || !p) return; zoomed = true; await board.zoomTo?.(p, z, 900); await wait(200) }
  const zoomOut = async () => { if (!zoomed) return; zoomed = false; if (fast) { board.home?.(); return } await board.zoomHome?.(800) }
  const mid = (a, b) => { const p = centre(a); const q = centre(b); return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } }
  const phaseButton = () => [...document.querySelectorAll('#phase-buttons button')].find(b => !b.disabled)
  const pressPhase = async () => { const b = await until(phaseButton); await click(b, 600); await settle() }

  // ---- deployment ----
  mark('Deployment', 'battle')
  await say('Deployment: the armies take turns to put a unit down in their own zones.')
  await settle([/deploys first/])
  for (let n = 0; n < 90 && game.phase === 'deploy'; n++) {
    const side = whoDeploys(game)
    if (side == null) break
    const left = deployable(game, side)
    const plan = F.deploy.find(d => d.side === side && left.some(u => d.is(u, game)))
    const u = plan ? left.find(x => plan.is(x, game)) : left[0]
    const btn = [...document.querySelectorAll('#prompt button')][left.indexOf(u)]
    if (btn) await click(btn, 300)
    if (plan?.join) {
      const host = game.units.find(h => h.side === side && h.placed && plan.join(h))
      if (host) {
        await say(`${sideName(side)}: ${name(u)} joins the ${name(host)}.`)
        const p = centre(host); const s = toPage(p)
        await moveTo(s.x, s.y, 500); pulse(); await wait(200)
        ui.mode?.down?.(p, host)
        await wait(900)
        continue
      }
    }
    if (plan?.files) u.files = plan.files
    let at = plan?.at || { x: 36, y: side === 0 ? 40 : 8 }
    // (a little to the side where the planned spot is taken)
    for (const dx of [0, 1.5, -1.5, 3, -3, 5, -5, 8, -8]) {
      const p = { x: at.x + dx, y: at.y }
      if (deployUnit(game, u, { pos: p, facing: u.facing, files: u.files, dry: true }).ok) { at = p; break }
    }
    await say(`${sideName(side)} deploys ${name(u)} (${modelCount(u)}).`)
    const s = toPage(at)
    ui.mode?.move?.(at)
    await moveTo(s.x, s.y, 600)
    ui.mode?.move?.(at)
    await wait(350); pulse()
    ui.mode?.down?.(at, null)
    await wait(fast ? 0 : 900)
    await settle()
  }
  await say('Both armies are down. Roll-off for the first turn.')
  await pressPhase()
  await settle([/goes first/])

  // ---- the turns ----
  const enemies = u => onTable(game).filter(o => o.side !== u.side)
  const nearest = (u, list) => list.slice().sort((a, b) => distanceBetween(u, a) - distanceBetween(u, b))[0]
  const shooterOnly = u => (u.kit?.ranged || []).length && !/Cavalry/.test((u.troopType || []).join(' '))
  let shownPhase = ''
  const banner = async () => {
    const k = `${game.round}:${game.active}:${game.phase}`
    if (k === shownPhase) return
    shownPhase = k
    if (game.round >= skipTo && !quick) fast = false
    const P = { strategy: 'Strategy', movement: 'Movement', shooting: 'Shooting', combat: 'Combat' }[game.phase]
    if (P === 'Strategy') mark(`Round ${game.round}: ${sideName(game.active)}`)
    if (P) await say(`Round ${game.round} · ${sideName(game.active)} · ${P} phase`, 1400)
  }

  const declareCharges = async () => {
    for (const u of unitsOf(game, game.active).filter(u => u.placed && !u.status.removed && !isDead(u) && !u.status.engaged && !u.status.fleeing && !isWarMachine(u) && !shooterOnly(u))) {
      const ts = enemies(u).filter(t => canDeclareCharge(game, u, t).ok)
      const t = nearest(u, ts)
      // (it charges when an average roll would reach: its Movement and about 7")
      if (!t || distanceBetween(u, t) > movementOf(u) + 7) continue
      ui.select(u); await wait(400)
      const b = buttonText('#actions', /^Charge/)
      if (!b) continue
      await click(b, 400)
      await say(`${name(u)} declare a charge on ${name(t)}, ${distanceBetween(u, t).toFixed(1)}" away.`)
      const s = toPage(centre(t)); await moveTo(s.x, s.y, 600); pulse()
      ui.mode?.down?.(centre(t), t)
      await wait(1200)
    }
  }

  const remainingMoves = async () => {
    for (const u of unitsOf(game, game.active).filter(u => u.placed && !u.status.removed && !isDead(u) && !u.status.moved && !u.status.engaged && !u.status.fleeing && !u.status.charged && !isWarMachine(u))) {
      // missile troops stand and shoot (moving costs them -1 To Hit) while anything is in range
      if (shooterOnly(u) && shootingTargets(game, u).length) continue
      const t = nearest(u, enemies(u))
      if (!t) continue
      const c = centre(u); const tc = centre(t)
      const want = Math.atan2(tc.y - c.y, tc.x - c.x)
      let turn = Math.atan2(Math.sin(want - u.facing), Math.cos(want - u.facing))
      turn = Math.max(-0.45, Math.min(0.45, turn))
      const far = distanceBetween(u, t) > 12
      // the Concord Realm's foot hold their line and advance steadily; everyone else goes as fast as it can
      const march = far && !(u.side === 0 && /Infantry/.test((u.troopType || []).join(' ')))
      const cap = movementOf(u) * (march ? 2 : 1)
      let plan = null
      for (let d = cap; d >= 0.5; d -= 0.5) {
        const p = [...(Math.abs(turn) > 0.05 ? [{ type: 'wheel', angle: turn }] : []), { type: 'forward', d }]
        if (checkMove(game, u, p, { march }).ok) { plan = p; break }
      }
      if (!plan) continue
      ui.select(u); await wait(300)
      const before = { ...u.pos }
      makeMove(game, u, plan, { march })
      ui.refresh()
      const moved = Math.hypot(u.pos.x - before.x, u.pos.y - before.y)
      await say(`${name(u)} ${march ? 'march' : 'advance'} ${moved.toFixed(1)}" towards ${name(t)}.`)
      await wait(400); await settle()
    }
  }

  const shootAll = async () => {
    for (const u of unitsOf(game, game.active).filter(u => u.placed && !u.status.removed && !isDead(u))) {
      if (!canShoot(game, u).ok) continue
      const ts = shootingTargets(game, u)
      if (!ts.length) continue
      const t = ts.slice().sort((a, b) => a.distance - b.distance)[0].unit
      ui.select(u); await wait(400)
      const b = buttonText('#actions', /^(Shoot|Fire)/) // (the button reads "Fire…" on screen)
      if (!b) continue
      await click(b, 400)
      const had = lostIn(t)
      lastVolley = null
      await say(`${name(u)} shoot at ${name(t)}.`)
      // (a war machine's shot is watched up close: the camera between the machine and its target)
      const big = isWarMachine(u)
      if (big) await zoomIn(mid(u, t), 1.6)
      const s = toPage(centre(t)); await moveTo(s.x, s.y, 500); pulse()
      await downAndSettle(centre(t), t)
      const dead = had - lostIn(t)
      const hits = lastVolley && lastVolley.shooter === u ? `${lastVolley.hits} hit${lastVolley.hits === 1 ? '' : 's'} from ${lastVolley.shots} shots, ` : ''
      await say(`${name(u)} shoot at ${name(t)}: ${hits}${dead ? `${dead} slain` : 'none slain'}.${t.status.fleeing ? ` ${name(t)} flee!` : ''}`, 2200)
      if (big) await zoomOut()
    }
  }

  // MAGIC: every Wizard of the side whose turn it is tries what it can in this sub-phase (rules/magic.js castable says
  // which spells: Enchantments and Hexes in Conjuration, Conveyance in Remaining Moves, Magic Missiles and Vortexes in
  // Shooting, Assailments in Combat), at the nearest enemy (an Enchantment at its own most needy unit). The screen's
  // own Cast button and target click; the dice, the dispel and the effect are the game's. The other side tries a
  // Wizardly dispel against a spell that would hurt it, and lets the rest through.
  const castAll = async () => {
    const wizards = game.units.filter(w => w.side === game.active && w.wizard && w.placed && !w.status.removed && !isDead(w))
    for (const w of wizards) {
      for (let tries = 0; tries < 5; tries++) {
        if (w.status.removed || isDead(w)) break
        let pick = null
        for (const s of castable(game, w)) {
          // (a Conveyance spell puts a unit down where the player clicks: the film leaves those alone)
          if (s.category === 'Conveyance') continue
          if (/self/i.test(s.range)) { pick = { s }; break }
          if (s.category === 'Magical Vortex') {
            const t = nearest(w, enemies(w)); if (!t) continue
            const from = centre(hostOf(game, w) || w); const to = centre(t)
            const range = vortexPointOk(game, w, s, from).range || 0
            const d = Math.hypot(to.x - from.x, to.y - from.y) || 1
            let p = null
            for (let k = Math.min(range, d - 1.5); k >= 2 && !p; k -= 1) { const q = { x: from.x + (to.x - from.x) * k / d, y: from.y + (to.y - from.y) * k / d }; if (vortexPointOk(game, w, s, q).ok) p = q }
            if (p) { pick = { s, p }; break }
            continue
          }
          const ts = spellTargets(game, w, s)
          const t = s.category === 'Enchantment' || s.category === 'Conveyance'
            ? (ts.filter(x => x.side === w.side).sort((a, b) => (b.status.engaged ? 1 : 0) - (a.status.engaged ? 1 : 0))[0])
            : nearest(w, ts.filter(x => x.side !== w.side))
          if (t) { pick = { s, t }; break }
        }
        if (!pick) break
        const host = hostOf(game, w) || w
        ui.select(host); await wait(400)
        const b = [...document.querySelectorAll('#actions button')].find(x => !x.disabled && same(x.textContent).includes(same(`Cast ${pick.s.name} (`)))
        if (!b) break
        const tries0 = w.wizard.attempts
        const logAt = game.log.length
        await say(`${name(w)} casts ${pick.s.name}${pick.t ? ` at ${name(pick.t)}` : ''} — ${pick.s.loreName || 'magic'}, ${pick.s.category}, casting value ${pick.s.castingValue}+.`)
        const harmful0 = ['Magic Missile', 'Assailment', 'Magical Vortex'].includes(pick.s.category)
        if (harmful0 && (pick.t || pick.p)) await zoomIn(pick.t ? mid(host, pick.t) : pick.p, 1.8)
        await click(b, 400)
        const at = pick.t ? centre(pick.t) : pick.p
        const harmful = ['Magic Missile', 'Assailment', 'Magical Vortex'].includes(pick.s.category)
        const prefs = harmful ? [/^Wizardly dispel with/, /No dispel/i] : [/No dispel/i, /^Keep/]
        if (at && ui.mode?.down) { const s = toPage(at); await moveTo(s.x, s.y, 500); pulse(); await downAndSettle(at, pick.t || null, prefs) }
        else await settle(prefs)
        // (a spell that still waits for a click on the table — a point the film does not choose — is let go)
        if (/^Click /.test([...document.querySelectorAll('#prompt .q')].pop()?.textContent || '')) { ui.mode?.right?.(); await settle() }
        await wait(900)
        const said = game.log.slice(logAt).map(l => l.text)
        const how = said.find(x => /PERFECT INVOCATION|BACKLASH/.test(x)) ? (said.find(x => /BACKLASH/.test(x)) ? 'BACKLASH!' : 'a perfect invocation!')
          : said.some(x => /dispels?\b|dispelled/i.test(x) && !/does not dispel/.test(x)) ? 'dispelled.'
          : said.some(x => /— CAST\./.test(x)) ? 'cast!' : said.some(x => /not cast/.test(x)) ? 'not cast.' : ''
        if (how) await say(`${name(w)}: ${pick.s.name} ${how}`, 1800)
        await zoomOut()
        if (w.wizard.attempts === tries0) break
      }
    }
  }

  const fightAll = async () => {
    for (let i = 0; i < 10; i++) {
      const b = buttonText('#actions', /^Fight:/)
      if (!b) break
      const label = b.textContent.replace(/^Fight:\s*/, '')
      const sides = game.units.filter(u => u.status.engaged && !u.status.removed)
      const had = new Map(sides.map(u => [u, lostIn(u)]))
      // the camera closes in on this fight: the first unit named in it and what it is engaged with
      const one = sides.find(u => same(label).includes(same(name(u))) && Object.keys(u.engagedWith || {}).length)
      const foe = one && game.units.find(x => x.id === Object.keys(one.engagedWith)[0])
      if (one && foe) await zoomIn(mid(one, foe), 2.8)
      await say(`Combat: ${label}.`)
      await click(b, 600)
      await settle([/Accept|Issue|Pursue|Hold|first|^OK/i])
      const lines = [...had].map(([u, n]) => `${name(u)} lose ${n - lostIn(u)}`).join(', ')
      const fled = [...had.keys()].filter(u => u.status.fleeing && !u.status.removed).map(name)
      const gone = [...had.keys()].filter(u => u.status.removed || isDead(u)).map(name)
      await say(`Melee Outcome: ${lines}.${fled.length ? ` ${fled.join(', ')} break and flee!` : ''}${gone.length ? ` ${gone.join(', ')} destroyed.` : ''}`, 2600)
      await zoomOut()
    }
  }

  if (skipTo > 1) fast = true
  for (let guard = 0; guard < 400; guard++) {
    if (game.phase === 'over') break
    await banner()
    const sub = game.sub
    // the stop: round 2 done, before the turn passes into round 3
    if (F.stopAfter && game.round === F.stopAfter && game.active !== game.first && game.phase === 'combat' && sub === 'fight' && !buttonText('#actions', /^Fight:/) && !skipTo) break
    if (F.stopAfter && game.round > F.stopAfter && !skipTo) break
    if (sub === 'conjuration') { await castAll(); await pressPhase(); continue }
    if (sub === 'charges') { await declareCharges(); await pressPhase(); await settle([/Stand & (Shoot|Fire)/, /Hold/]); continue }
    if (sub === 'remaining') { await remainingMoves(); await castAll(); await pressPhase(); continue }
    if (sub === 'shoot') { await castAll(); await shootAll(); await pressPhase(); continue }
    if (sub === 'fight') {
      await castAll()
      await fightAll()
      // the stop: the end of round 2, before the turn passes into round 3
      if (F.stopAfter && game.round === F.stopAfter && game.active !== game.first && !skipTo) break
      await pressPhase(); continue
    }
    await settle()
    await pressPhase()
  }

  fast = quick
  await say('')
  if (F.stopAfter) {
    mark('To be continued')
    await showCard('TO BE CONTINUED', `End of round ${F.stopAfter} &middot; seed ${seed} &middot; ${F.mapName}`, 4000)
  } else {
    // the result as the game scored it (rules/victory.js checkVictory, logged in the roll log)
    mark('The result')
    const r = game.result
    const who = r ? (r.winner == null ? 'A DRAW' : `${r.winner === 0 ? 'THE CONCORD REALM' : 'THE RUKKA &amp; NIPPERS'} WIN`) : 'THE BATTLE IS OVER'
    const vp = r ? `${game.sides[0].name} ${r.vp[0]} &middot; ${game.sides[1].name} ${r.vp[1]} Victory Points` : ''
    await say(r ? `The battle is over after round ${game.round}. ${who.replace('&amp;', '&')}.` : '', 2500)
    await showCard(who, `${vp}<br>seed ${seed} &middot; ${F.mapName} &middot; ${F.points} points`, 7000)
  }
  window.__filmDone = true

  // ---- building one army in Army Lists ----
  async function buildList (L) {
    await say(`Army Lists: building ${ARMY_NAMES[L.army]} to ${F.points} points.`)
    await click($('#m-lists'), 900)
    await type($('.list-name'), L.name)
    if ($('.list-army').value !== L.army) await setValue($('.list-army'), L.army, 700)
    await setValue($('.points-limit'), String(F.points), 600)
    for (const spec of L.units) {
      const e = findEntry(L.army, spec.id)
      const add = await until(() => [...document.querySelectorAll('.add-slot-btn')].find(b => same(b.textContent.trim()).startsWith(same('+ ' + e.name))))
      await say(`Add ${e.name}${spec.count ? ` × ${spec.count}` : ''}.`)
      await click(add, 600)
      if (spec.count) await setValue(await until(() => $('.unit-count')), String(spec.count), 450)
      const drop = (label, choice) => {
        const f = [...document.querySelectorAll('.unit-row label.roster-field')].find(l => same(l.querySelector('span')?.textContent) === same(label))
        const s = f?.querySelector('select')
        const o = s && [...s.options].find(o => same(o.textContent).startsWith(same(choice)))
        return o && s.value !== o.value ? [s, o.value] : null
      }
      for (const [label, choice] of [['Weapons', spec.weapons], ['Armour', spec.armour], ['Mount', spec.mount], ['Wizard', spec.wizard], ['Lore', spec.lore && spec.lore.replace(/-/g, ' ')]]) {
        if (!choice) continue
        const d = drop(label, choice)
        if (d) await setValue(d[0], d[1], 450)
      }
      const ticks = () => [...document.querySelectorAll('.unit-row label.tick')]
      const tickOf = n => ticks().find(l => same(l.textContent.trim()).startsWith(same(n)))
      for (const n of spec.ticks || []) { const l = tickOf(n); const c = l?.querySelector('input'); if (c && !c.checked) await click(c, 400) }
      // the command group exactly as listed (a default tick that is not wanted is taken off)
      // (each tick rebuilds the panel: the command ticks are found again before every click)
      const cmdTicks = () => { const sec = [...document.querySelectorAll('.unit-row .dw-section')].find(x => same(x.querySelector('.section-label')?.textContent) === same('Command')); return sec ? [...sec.querySelectorAll('label.tick')] : [] }
      for (let k = 0; k < cmdTicks().length; k++) {
        const l = cmdTicks()[k]
        const want = (spec.command || []).some(n => same(l.textContent.trim()).startsWith(same(n)))
        const c = l.querySelector('input')
        if (c && c.checked !== want) await click(c, 400)
      }
      // magic items, bought from the unit's own menu (one pick each: the panel is rebuilt after each)
      for (const id of spec.items || []) {
        const sel = await until(() => document.querySelector('.unit-row .choices.items:not(.champ) select'))
        const o = [...sel.options].find(x => x.value === id)
        if (!o) throw new Error(`film: no magic item ${id} for ${e.name}`)
        await say(`${e.name} buys ${o.textContent.replace(/\s*\*$/, '')}.`)
        await setValue(sel, id, 900)
      }
      await wait(300)
    }
    const used = $('.points-used')?.textContent
    const legal = /A legal army/.test(document.querySelector('.checks-panel')?.textContent || '')
    await say(`${L.name}: ${used} of ${F.points} points${legal ? ', a legal army' : ''}. Save.`, 1500)
    await click($('.validate-btn.go'), 900)
    await click(buttonText('.top-bar', /^Back$/), 900)
  }
}
