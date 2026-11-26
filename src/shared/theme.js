// THE PLAYER'S DISPLAY AND SOUND SETTINGS, kept in the browser's localStorage: light/dark, the
// accent colours, layouts, dice display, music switches and more. Each setting is a list of
// choices with a getter, a setter and (for looks) an apply that puts a class on <html>.
// This game reads only a few of them (menuMusicOn, battleMusicOn); the rest are carried with the
// shared code and have no screen here.
//
// The storage keys share one prefix, so another app served from the same origin cannot
// overwrite them.

const THEME_KEY = '40k3.theme'
const ACCENT_KEY = '40k3.accent'
const CHROME_KEY = '40k3.uiStyle'
const HUD_STYLE_KEY = '40k3.hudStyle'
const EDGE_KEY = '40k3.panelEdge'
const FONT_KEY = '40k3.fontSet'
const FELT_KEY = '40k3.felt'
const DICE_KEY = '40k3.diceStyle'
const DICE_SPEED_KEY = '40k3.diceSpeed'
const DICE_HOLD_KEY = '40k3.diceHold'
const SHOT_ANIM_KEY = '40k3.shotAnimation'
const HIT_STAR_KEY = '40k3.hitStars'
const GRID_KEY = '40k3.gridLines'
const MOUNT_KEY = '40k3.gunMounts'
const TERRAIN_EDGE_KEY = '40k3.terrainEdges'
const COVER_LINE_KEY = '40k3.coverLines'
const WIND_KEY = '40k3.wind'
const TARGET_KEY = '40k3.targetHighlight'
// Options > Ordnance hits every hull under it: off by default, so only the target is hit.
// On, a house rule: any vehicle partly under an ordnance marker is hit, friend or foe.
const ORDNANCE_HULLS_KEY = '40k3.ordnanceAllHulls'
// Options > Remove casualties automatically: ON by default. The owner may choose who falls;
// on, the game chooses for him (plain troopers first). Off, he clicks each one.
const AUTO_CASUALTIES_KEY = '40k3.autoCasualties'
const CINEMATIC_KEY = '40k3.cinematic'
const SOUND_KEY = '40k3.sound'
const GUN_SOUND_KEY = '40k3.gunSound'
const DOOR_SOUND_KEY = '40k3.doorSound'
const ARMY_BANNER_KEY = '40k3.armyBanner'
const ARMY_COLOURS_KEY = '40k3.armyColours'
const RESOLUTION_KEY = '40k3.resolution'
const MENU_MUSIC_KEY = '40k3.menuMusic'
const BATTLE_MUSIC_KEY = '40k3.battleMusic'
const SETUP_LAYOUT_KEY = '40k3.setupLayout'
const DRAWER_LAYOUT_KEY = '40k3.drawerLayout'
const SETTINGS_LAYOUT_KEY = '40k3.settingsLayout'
// No prefix: the builder has always kept its choice under this name, and renaming it would
// forget what a player already chose.
const BUILDER_LAYOUT_KEY = 'army-builder-layout'
const SETUP_ENTRANCE_KEY = '40k3.setupEntrance'
const SETUP_TURN_KEY = '40k3.setupEntranceTurn'
const MOVE_GLIDE_KEY = '40k3.moveGlide'
// A NEW KEY for the three-way choice, so the new default reaches a browser
// that ticked or unticked the old two-way box: '40k3.blastCasualties' is no longer read.
const BLAST_CASUALTY_KEY = '40k3.blastRule'

// The accent colours. Each needs a `html.scan-<id>` block in the page's stylesheet giving it
// its two rgb triples, and a `.swatch.<id>` there giving the picker its dot.
export const ACCENTS = [
  'gold', 'blue', 'green', 'pink',
  'crimson', 'amber', 'teal', 'violet', 'steel'
]

export function applyTheme () {
  const light = localStorage.getItem(THEME_KEY) === 'light'
  document.documentElement.classList.toggle('light', light)
  updateThemeButtons()
}

export function toggleTheme () {
  const light = document.documentElement.classList.contains('light')
  localStorage.setItem(THEME_KEY, light ? 'dark' : 'light')
  applyTheme()
}

function updateThemeButtons () {
  for (const button of document.querySelectorAll('.theme-btn')) label(button)
}

function label (button) {
  button.textContent = document.documentElement.classList.contains('light') ? 'Dark mode' : 'Light mode'
}

// One light/dark button, for a screen that has a top bar to put it in. It is
// labelled here and not only by applyTheme(), because applyTheme() runs at
// start-up — before any of these exist — and a button with no text is a button
// nobody can find.
export function themeButton () {
  const button = document.createElement('button')
  button.className = 'theme-btn'
  button.addEventListener('click', toggleTheme)
  label(button)
  return button
}

export function accent () {
  const stored = localStorage.getItem(ACCENT_KEY)
  return ACCENTS.includes(stored) ? stored : 'gold'
}

export function applyAccent () {
  const chosen = accent()
  for (const one of ACCENTS) document.documentElement.classList.toggle(`scan-${one}`, one === chosen)
  for (const swatch of document.querySelectorAll('.swatch')) {
    swatch.classList.toggle('active', swatch.dataset.accent === chosen)
  }
}

export function setAccent (colour) {
  if (!ACCENTS.includes(colour)) return
  localStorage.setItem(ACCENT_KEY, colour)
  applyAccent()
}

// The light/dark button and the four swatches, wired, for any screen that
// wants them. Returns the element so the caller can place it.
export function themeControls () {
  const wrap = document.createElement('div')
  wrap.className = 'ss-controls'

  const swatches = document.createElement('div')
  swatches.className = 'swatches'
  for (const colour of ACCENTS) {
    const button = document.createElement('button')
    button.className = `swatch ${colour}`
    button.dataset.accent = colour
    button.title = colour[0].toUpperCase() + colour.slice(1)
    button.classList.toggle('active', colour === accent())
    button.addEventListener('click', () => setAccent(colour))
    swatches.append(button)
  }

  wrap.append(swatches, themeButton())
  return wrap
}

// FIVE WHOLE LAYOUTS, not five colour schemes: two of them have no side column at all.
// The stylesheet lays out the HUD grid for each one and the page assumes nothing
// about where any panel goes. A layout only sets the --panel-* and grid rules, so it
// composes with light/dark and with all four accents rather than fighting them.
export const CHROMES = [
  // `skeleton` is where the panels go (rail, float or bar) and `mirror` puts a
  // rail on the left. The X layouts have neither: each lays its own grid out.
  { id: 'glass', label: 'Glass HUD', note: 'Undocked corner panels, board edge to edge' },
  { id: 'd-lectern', label: 'D4 Lectern', note: 'A reading desk on the left: the log a printed page, the unit its stat card', skeleton: 'rail', mirror: true },
  { id: 'd-banner', label: 'D6 Banner', note: 'The turn on a red standard at the top', skeleton: 'float' },
  { id: 'd-spotlight', label: 'D13 Spotlight', note: 'A warm light on the table, the edges dark', skeleton: 'float' },
  // X1 sets its own grid, with no shared arrangement and no shared dress.
  { id: 'x-throne', label: 'X1 Throne', note: 'The bar stands up as a column on the left; the log a strip under the table' }
]

export function chrome () {
  const stored = localStorage.getItem(CHROME_KEY)
  return CHROMES.some(one => one.id === stored) ? stored : 'glass'
}

export function applyChrome () {
  // THE NOTCHED BEVEL STYLE LAYS THE BATTLE SCREEN OUT ITSELF, so while it
  // is on, none of the layout classes below are put on <html>: the five layouts then have nothing
  // to fight it with, and choosing Glass puts the chosen layout straight back.
  const bevel = hudStyle() === 'bevel'
  const chosen = bevel ? null : chrome()
  const html = document.documentElement
  for (const one of CHROMES) html.classList.toggle(`ui-${one.id}`, one.id === chosen)
  // A Diorama layout also carries the dress they share and the arrangement it is built on.
  const picked = CHROMES.find(one => one.id === chosen)
  html.classList.toggle('ui-diorama', Boolean(picked?.skeleton))
  for (const skeleton of ['rail', 'float', 'bar']) html.classList.toggle(`ui-skel-${skeleton}`, picked?.skeleton === skeleton)
  html.classList.toggle('ui-mirror', Boolean(picked?.mirror))
  html.classList.toggle('hud-bevel', bevel)
}

// BATTLE SCREEN STYLE: the whole look of the
// battle screen. Notched bevel is the default; Glass is the older HUD and keeps its five layouts.
// Storage is wrapped in try/catch because a browser with storage blocked must still draw a screen.
export const HUD_STYLES = [
  { id: 'bevel', label: 'Notched bevel', note: 'Gunmetal plates with cut corners and crimson trim: turn and phase stepper on the left, roll log in a drawer on the right, big dice at the bottom, End phase as its own button' },
  { id: 'glass', label: 'Glass', note: 'The older HUD: blurred glass panels, with the five layouts under Layout' }
]

export function hudStyle () {
  try {
    const stored = localStorage.getItem(HUD_STYLE_KEY)
    return HUD_STYLES.some(one => one.id === stored) ? stored : 'bevel'
  } catch { return 'bevel' }
}

export function setHudStyle (id) {
  if (!HUD_STYLES.some(one => one.id === id)) return
  try { localStorage.setItem(HUD_STYLE_KEY, id) } catch { /* storage blocked: the choice lasts until reload */ }
  applyChrome()
}

export function setChrome (id) {
  if (!CHROMES.some(one => one.id === id)) return
  localStorage.setItem(CHROME_KEY, id)
  applyChrome()
}

// ---- the three APPEARANCE settings -----------------------------------------
//
// Each is the same shape as the accent above: a list, a getter that falls back to the
// first entry, a setter that stores and applies, and an apply that puts a class on
// <html>. A settings screen builds a row of buttons from each list; the page's CSS reads
// the classes. None of them is a rule of the game.

// HOW A PANEL'S EDGE IS DRAWN. Glass HUD's own edge is two corner brackets; the others are choices.
export const PANEL_EDGES = [
  { id: 'corners', label: 'Two corners', note: 'A bracket at the top left and the bottom right' },
  { id: 'all', label: 'Four corners', note: 'A bracket on every corner' },
  { id: 'hairline', label: 'Hairline', note: 'A thin line the whole way round' },
  { id: 'double', label: 'Double hairline', note: 'Two thin lines, two pixels apart' },
  { id: 'glow', label: 'Glow', note: 'No hard edge; the panel fades out' },
  { id: 'rule', label: 'Top rule', note: 'One accent line across the top' },
  { id: 'none', label: 'None', note: 'The glass alone, no edge at all' }
]

// THE TYPE. The three families are the tokens every screen already uses: a display face,
// a label face and a body face. A set swaps all three together, so they stay a pairing.
export const FONT_SETS = [
  { id: 'printed', label: 'Printed', note: 'Bebas Neue and Barlow — the printed look' },
  { id: 'system', label: 'System', note: 'Whatever this machine prefers' },
  { id: 'mono', label: 'Terminal', note: 'Monospace throughout' },
  { id: 'serif', label: 'Serif', note: 'A book face for the body text' }
]

// THE FELT. `around` is the space beyond the table's edge, which PixiJS clears each
// frame; `grid` is the one-foot grid drawn on the surface. No rule refers to any of them.
export const FELTS = [
  { id: 'grass', label: 'Grass', felt: '#3b4a35', grid: '#4d5c46', around: '#14161a' },
  { id: 'desert', label: 'Desert', felt: '#8a7448', grid: '#9c855a', around: '#1c1a14' },
  { id: 'ash', label: 'Ash waste', felt: '#4a4741', grid: '#5c5952', around: '#141414' },
  { id: 'snow', label: 'Snow', felt: '#b9c2c9', grid: '#a5aeb6', around: '#1a1e22' },
  { id: 'mars', label: 'Mars', felt: '#7a4030', grid: '#8d5040', around: '#1e1210' },
  { id: 'void', label: 'Void', felt: '#1b2030', grid: '#2a3145', around: '#08090d' }
]

// HOW A ROLL IS SHOWN. None of these decides
// anything: the engine has already rolled and resolved by the time the dice appear, and
// the log still prints every roll whichever of the seven is chosen — including the last,
// which shows nothing at all.
export const DICE_STYLES = [
  { id: 'cinematic', label: 'Cinematic', note: 'One big die a beat, close up' },
  { id: 'table', label: 'On the table', note: 'Dice land on the felt where the shooting is' },
  // the same throw with the die as a cube that tumbles in the air and lands with the rolled
  // face up, offered beside the flat one rather than instead of it.
  { id: 'table3d', label: 'On the table in 3D', note: 'The same throw, with dice that tumble as cubes' },
  { id: 'strip', label: 'Result strip', note: 'The whole roll in a line, no tumble' },
  { id: 'threshold', label: 'Threshold bar', note: 'Dice on a 1-6 scale with the target drawn through' },
  { id: 'floating', label: 'Floating numbers', note: 'The numbers rise over the unit and fade' },
  { id: 'tally', label: 'Tally', note: 'Grouped by face with counts; readable at twenty dice' },
  { id: 'none', label: 'Log only', note: 'No dice on screen. What it did before' }
]

// How long a roll takes. This is what carries a twenty-dice volley: nothing is hidden and
// nothing is capped — Instant simply puts them all on screen together.
export const DICE_SPEEDS = [
  { id: 'quick', label: 'Quick', note: 'A short beat', ms: 420 },
  { id: 'instant', label: 'Instant', note: 'Everything at once', ms: 90 },
  { id: 'cinematic', label: 'Cinematic', note: 'Let them tumble', ms: 1100 }
]

// HOW LONG THE DICE STAY. Clearing after their own beat is right while a volley is playing
// and wrong the moment it stops: the numbers that decided the shot would leave the screen
// before the player had read them, so the last rolls can be kept open.
//
// None of these changes a roll or holds the game up. The queue plays exactly as it did;
// this only decides what is left on screen once it has drained, and the next roll always
// clears it.
export const DICE_HOLDS = [
  { id: 'fade', label: 'Fade away', note: 'Each roll clears after its own beat' },
  { id: 'last', label: 'Keep the last roll', note: 'The final roll stays until the next one' },
  { id: 'volley', label: 'Keep the whole volley', note: 'Every roll of the attack stays, stacked' }
]

// THE FLASHES AND ROUNDS THAT FLY FROM THE FIRER TO THE TARGET.
// On by default. It decides nothing either way; the dice and the log carry
// the whole shot.
export const SHOT_ANIMATIONS = [
  { id: 'on', label: 'On', note: 'A flash for each shot, a round for each hit, in the weapon\'s own art' },
  { id: 'off', label: 'Off', note: 'No flashes or rounds. The dice and the log carry the shot' }
]

// THE HITS, MARKED ON THE MEN: a yellow star over a target model
// for each hit, a smaller red one for each unsaved wound. Unlike the tracers above, this
// one HOLDS THE GAME UP for the length of its pass — the casualty rings wait for it — so
// it is the setting a player is most likely to want off. It is on by default.
export const HIT_STARS = [
  { id: 'on', label: 'On', note: 'A star per hit, a red one per unsaved wound, shown only with Shot animation off: with it on, the shots and the close combat blows are drawn instead' },
  { id: 'off', label: 'Off', note: 'Straight from the dice to the casualties' }
]

// THE ONE-FOOT GRID ON THE FELT (src/view/board.js drawTable). A drawing aid and nothing
// else — no rule measures from it — so it may be turned off. On by default.
export const GRID_LINES = [
  { id: 'on', label: 'On', note: 'A line every 12"' },
  { id: 'off', label: 'Off', note: 'Plain felt' }
]

// THE YELLOW DOT ON A HULL FOR EACH GUN MOUNTING, where its line of fire is traced from.
// The gun pips name the guns, so the dots are off unless wanted for checking a range or a
// line of sight.
export const GUN_MOUNTS = [
  { id: 'off', label: 'Off', note: 'The pips name the guns' },
  { id: 'on', label: 'On', note: 'A yellow dot where each gun is mounted, for checking ranges' }
]

// THE MAIN MENU'S RADAR, HEARD: a warb as the scanner sweeps and a ping
// as it crosses each blip. On by default.
// Nothing else in the game makes a sound.
// THE BATTLE SETUP'S LOOK. The Diorama: the two players' cards either side of the real map,
// every setting in one console along the bottom. The classic screen stays as an option.
export const SETUP_LAYOUTS = [
  { id: 'diorama', label: 'Diorama', note: 'Battle: the players either side of the map. Army Lists: saved and ready-made lists either side of the army' },
  { id: 'classic', label: 'Classic', note: 'The form on the left and a column of lists per player' }
]

// THE ARMY DRAWER'S LOOK. The Diorama dresses the same three columns — the entries, the canvas, the tools —
// in the iron and brass of the battle setup, with the canvas on a lit stage. Classic stays.
export const DRAWER_LAYOUTS = [
  { id: 'diorama', label: 'Diorama', note: 'Iron and brass, the canvas on a lit stage' },
  { id: 'classic', label: 'Classic', note: 'The drawer as it was' }
]

// THE ARMY BUILDER'S LOOK. Classic comes first, and is what a browser that has never chosen gets,
// so the test harnesses keep finding the sidebar they click. The Lectern
// is the units in a ribbon, the printed entry or the Tabletop on the
// left, the controls in the middle, the checks on the right.
export const BUILDER_LAYOUTS = [
  { id: 'classic', label: 'Classic', note: 'The sidebar of units, the panel and the checks' },
  { id: 'lectern', label: 'Lectern', note: 'The units in a ribbon, the printed page or the Tabletop beside the controls' }
]

// THE SETTINGS PAGE'S OWN LOOK: the
// Diorama lays each section on an iron plate of its own, side by side; Classic is one card.
export const SETTINGS_LAYOUTS = [
  { id: 'diorama', label: 'Diorama', note: 'Each section on an iron plate of its own, side by side' },
  { id: 'classic', label: 'Classic', note: 'One card, the sections one under another' }
]

// HOW THE DIORAMA ARRIVES. The screen arrives by Flip in, Drop or Sweep in, in turn, and the
// blast doors are the way OUT: they close over it when To battle is pressed and open on the
// table. Off turns both off.
export const SETUP_ENTRANCES = [
  { id: 'rotate', label: 'Rotate', note: 'Flip in, Drop, Sweep in — the next one each time the screen opens; blast doors close over it at To battle and open on the table' },
  { id: 'off', label: 'Off', note: 'The screen appears at once, and the battle with no doors' }
]
const ENTRANCE_ROTATION = ['flip', 'drop', 'sweep']

export const MENU_SOUND = [
  { id: 'on', label: 'On', note: 'A warb on each sweep, a ping on each contact' },
  { id: 'off', label: 'Off', note: 'The menu is silent' }
]

// THE START SCREEN'S MUSIC (shared/menuMusic.js, and this game's ui/music.js). Its own setting,
// not the radar's: a player who turned the radar's warb and pings off has not turned off the music.
export const MENU_MUSIC = [
  { id: 'on', label: 'On', note: 'Alien StruggleMain, then Alien Struggle at half volume' },
  { id: 'off', label: 'Off', note: 'The menu is silent' }
]

// THE BATTLE'S MUSIC (shared/battleMusic.js): the battle screen folder's songs in a shuffled loop.
export const BATTLE_MUSIC = [
  { id: 'on', label: 'On', note: 'The battle screen tracks, shuffled, on the choose-a-battle screen' },
  { id: 'off', label: 'Off', note: 'The choose-a-battle screen is silent' }
]

// HOW MANY PIXELS THE TABLE IS DRAWN WITH. The PixiJS canvases (the board and the intro) draw at this many pixels per screen pixel; the page around
// them is the browser's and is not affected. 'standard' is what the game always drew, and stays
// the default.
export const RESOLUTIONS = [
  { id: 'standard', label: 'Standard', note: 'One drawn pixel per screen pixel, as the game has always drawn' },
  { id: 'sharp', label: 'Sharp', note: 'At your screen\'s full density (up to twice as many pixels each way): crisper on a high-density screen, heavier on the graphics card' },
  { id: 'low', label: 'Low', note: 'Three-quarters of the pixels each way: softer, lighter on the graphics card and memory' }
]
export function resolution () { return pick(RESOLUTIONS, localStorage.getItem(RESOLUTION_KEY)) }
// The number PixiJS is given as its `resolution`.
export function renderResolution () {
  const id = resolution()
  if (id === 'sharp') return Math.min(2, Math.max(1, window.devicePixelRatio || 1))
  if (id === 'low') return 0.75
  return 1
}
// Stored, and announced, so a canvas already on the page redraws at the new density at once.
export function setResolution (id) {
  if (!RESOLUTIONS.some(one => one.id === id)) return
  localStorage.setItem(RESOLUTION_KEY, id)
  window.dispatchEvent(new Event('40k3:resolution'))
}

// THE ARMY'S LOOK ON THE ARMY LISTS SCREEN AND THE BUILDER. Two switches, both on
// unless turned off: the banner behind the page, and the page's panels in the army's colours. Off,
// the page is the spotlit iron and brass it was before.
export const ARMY_BANNER = [
  { id: 'on', label: 'On', note: 'Each army\'s emblem on its own colours' },
  { id: 'off', label: 'Off', note: 'The spotlit iron background' }
]
export function armyBanner () { return pick(ARMY_BANNER, localStorage.getItem(ARMY_BANNER_KEY)) }
export function armyBannerOn () { return armyBanner() === 'on' }
export function setArmyBanner (id) {
  if (!ARMY_BANNER.some(one => one.id === id)) return
  localStorage.setItem(ARMY_BANNER_KEY, id)
}
export const ARMY_COLOURS = [
  { id: 'on', label: 'On', note: 'Each army\'s own colours' },
  { id: 'off', label: 'Off', note: 'Iron and brass for every army' }
]
export function armyColours () { return pick(ARMY_COLOURS, localStorage.getItem(ARMY_COLOURS_KEY)) }
export function armyColoursOn () { return armyColours() === 'on' }
export function setArmyColours (id) {
  if (!ARMY_COLOURS.some(one => one.id === id)) return
  localStorage.setItem(ARMY_COLOURS_KEY, id)
}

// THE BLAST DOORS' SOUND.
export const DOOR_SOUND = [
  { id: 'on', label: 'On', note: 'Hydraulics, a clang as they meet, the bolts, and the seal letting go' },
  { id: 'off', label: 'Off', note: 'The doors are silent' }
]
export function doorSound () { return pick(DOOR_SOUND, localStorage.getItem(DOOR_SOUND_KEY)) }
export function doorSoundOn () { return doorSound() === 'on' }
export function setDoorSound (id) {
  if (!DOOR_SOUND.some(one => one.id === id)) return
  localStorage.setItem(DOOR_SOUND_KEY, id)
}

// THE GUNS ON THE TABLE: a sound for each shot.
export const GUN_SOUND = [
  { id: 'on', label: 'On', note: 'A shot for each man who fires' },
  { id: 'off', label: 'Off', note: 'The guns are silent' }
]

// HOW A MODEL GETS TO WHERE IT WAS SENT: a jump, or a walk at a steady pace. The rules move
// it the instant the move is committed either way — this only decides whether the picture
// jumps there or walks there, and a walk makes it obvious WHICH models moved and how far,
// which a jump never did.
export const MOVE_GLIDES = [
  { id: 'walk', label: 'Walk there', note: 'Models slide to where they were sent' },
  { id: 'jump', label: 'Straight there', note: 'They appear at the destination at once' }
]

// WHO A BLAST MARKER'S CASUALTIES COME FROM. A HOUSE RULE, and it departs from the book.
//
// As printed, the defender may then move the incoming marker, and casualties come only from the
// models under it. 'beneath' is the printed rule, kept whole. 'firer' keeps the casualties under
// the marker but the defender never moves it; it is the default. An older third option
// ("casualties from anyone in range") was removed: a saved 'any' falls back to 'firer' (see pick()).
//
// In BOTH, the firer places every marker before any dice are rolled, and a marker whose die
// misses is taken away (as printed, the roll comes first and a marker is placed only for a hit).
export const BLAST_CASUALTIES = [
  { id: 'firer', label: 'Firer places it, no move', note: 'The firer puts the marker over whoever he likes in the target unit, leaders and heavy weapons included. The defender may not move it. Casualties come from under it. Every marker goes down BEFORE the roll; a miss takes it away (a house rule).' },
  { id: 'beneath', label: 'The printed rule', note: 'The firer places the marker, then the defender may move it so long as it covers as many models and stays in range and sight. Casualties come only from under it. The firer places every marker BEFORE the roll (a house rule); the defender moves the ones that hit, after it.' }
]

function pick (list, stored) {
  return list.some(one => one.id === stored) ? stored : list[0].id
}

export function panelEdge () { return pick(PANEL_EDGES, localStorage.getItem(EDGE_KEY)) }
export function fontSet () { return pick(FONT_SETS, localStorage.getItem(FONT_KEY)) }
export function felt () { return pick(FELTS, localStorage.getItem(FELT_KEY)) }
export function diceStyle () { return pick(DICE_STYLES, localStorage.getItem(DICE_KEY)) }
export function diceSpeed () { return pick(DICE_SPEEDS, localStorage.getItem(DICE_SPEED_KEY)) }
export function diceHold () { return pick(DICE_HOLDS, localStorage.getItem(DICE_HOLD_KEY)) }
export function shotAnimation () { return pick(SHOT_ANIMATIONS, localStorage.getItem(SHOT_ANIM_KEY)) }
export function moveGlide () { return pick(MOVE_GLIDES, localStorage.getItem(MOVE_GLIDE_KEY)) }
export function modelsWalk () { return moveGlide() === 'walk' }

export function setMoveGlide (id) {
  if (!MOVE_GLIDES.some(one => one.id === id)) return
  localStorage.setItem(MOVE_GLIDE_KEY, id)
}
export function shotsAnimated () { return shotAnimation() === 'on' }

export function setupLayout () { return pick(SETUP_LAYOUTS, localStorage.getItem(SETUP_LAYOUT_KEY)) }
export function setSetupLayout (id) {
  if (!SETUP_LAYOUTS.some(one => one.id === id)) return
  localStorage.setItem(SETUP_LAYOUT_KEY, id)
}
export function builderLayout () { return pick(BUILDER_LAYOUTS, localStorage.getItem(BUILDER_LAYOUT_KEY)) }
export function setBuilderLayout (id) {
  if (!BUILDER_LAYOUTS.some(one => one.id === id)) return
  localStorage.setItem(BUILDER_LAYOUT_KEY, id)
}
export function settingsLayout () { return pick(SETTINGS_LAYOUTS, localStorage.getItem(SETTINGS_LAYOUT_KEY)) }
export function setSettingsLayout (id) {
  if (!SETTINGS_LAYOUTS.some(one => one.id === id)) return
  localStorage.setItem(SETTINGS_LAYOUT_KEY, id)
}
export function drawerLayout () { return pick(DRAWER_LAYOUTS, localStorage.getItem(DRAWER_LAYOUT_KEY)) }
export function setDrawerLayout (id) {
  if (!DRAWER_LAYOUTS.some(one => one.id === id)) return
  localStorage.setItem(DRAWER_LAYOUT_KEY, id)
}
export function setupEntrance () { return pick(SETUP_ENTRANCES, localStorage.getItem(SETUP_ENTRANCE_KEY)) }
export function setSetupEntrance (id) {
  if (!SETUP_ENTRANCES.some(one => one.id === id)) return
  localStorage.setItem(SETUP_ENTRANCE_KEY, id)
}
// The entrance to play on THIS opening, or null, and the rotation moved on one — so every
// opening of the screen gets the next of the three, across reloads.
export function nextSetupEntrance () {
  if (setupEntrance() === 'off') return null
  const turn = Number(localStorage.getItem(SETUP_TURN_KEY)) || 0
  localStorage.setItem(SETUP_TURN_KEY, String((turn + 1) % ENTRANCE_ROTATION.length))
  return ENTRANCE_ROTATION[turn % ENTRANCE_ROTATION.length]
}

export function menuSound () { return pick(MENU_SOUND, localStorage.getItem(SOUND_KEY)) }
export function menuSoundOn () { return menuSound() === 'on' }

export function setMenuSound (id) {
  if (!MENU_SOUND.some(one => one.id === id)) return
  localStorage.setItem(SOUND_KEY, id)
}

export function menuMusic () { return pick(MENU_MUSIC, localStorage.getItem(MENU_MUSIC_KEY)) }
export function menuMusicOn () { return menuMusic() === 'on' }
export function setMenuMusic (id) {
  if (!MENU_MUSIC.some(one => one.id === id)) return
  localStorage.setItem(MENU_MUSIC_KEY, id)
}

export function battleMusic () { return pick(BATTLE_MUSIC, localStorage.getItem(BATTLE_MUSIC_KEY)) }
export function battleMusicOn () { return battleMusic() === 'on' }
export function setBattleMusic (id) {
  if (!BATTLE_MUSIC.some(one => one.id === id)) return
  localStorage.setItem(BATTLE_MUSIC_KEY, id)
}

export function gunSound () { return pick(GUN_SOUND, localStorage.getItem(GUN_SOUND_KEY)) }
export function gunSoundOn () { return gunSound() === 'on' }
export function setGunSound (id) {
  if (!GUN_SOUND.some(one => one.id === id)) return
  localStorage.setItem(GUN_SOUND_KEY, id)
}

export function blastCasualties () { return pick(BLAST_CASUALTIES, localStorage.getItem(BLAST_CASUALTY_KEY)) }
// A saved 'any' (the removed "casualties from anyone in range" option) is not in the list, so pick() falls back to 'firer'.
// Only the printed rule lets the defender move an incoming marker.
export function blastDefenderMoves () { return blastCasualties() === 'beneath' }

export function setBlastCasualties (id) {
  if (!BLAST_CASUALTIES.some(one => one.id === id)) return
  localStorage.setItem(BLAST_CASUALTY_KEY, id)
}

export function hitStarsSetting () { return pick(HIT_STARS, localStorage.getItem(HIT_STAR_KEY)) }
export function hitStarsShown () { return hitStarsSetting() === 'on' }

export function setHitStars (id) {
  if (!HIT_STARS.some(one => one.id === id)) return
  localStorage.setItem(HIT_STAR_KEY, id)
}

export function gridLinesSetting () { return pick(GRID_LINES, localStorage.getItem(GRID_KEY)) }

// THE TERRAIN'S LOOK. Pictures and lines only: no rule reads any of it. A terrain layer may
// listen for 'terrain-look-changed'.
//   - How a piece meets the board: two blended looks, as a setting.
//   - The cover line round each piece: off (the default), faint or always full. The hover
//     readout still names the cover whatever this is.
//   - The wind in the trees, palms, scrub and loose grass: on or off.
export const TERRAIN_EDGES = [
  { id: 'scatter', label: 'Blended + scatter', note: 'A ragged edge into the board, with loose grass, pebbles and bushes spilling past it' },
  { id: 'blend', label: 'Blended', note: 'A ragged edge into the board and a faint trodden ring, nothing past it' }
]
export const COVER_LINES = [
  { id: 'off', label: 'Off', note: 'No line; hover over a piece to read its cover' },
  { id: 'faint', label: 'Faint', note: 'A faint line, in full while the mouse is over the piece' },
  { id: 'full', label: 'Always full', note: 'The line coloured by its cover save, always' }
]
export const WINDS = [
  { id: 'breeze', label: 'Breeze', note: 'Trees, palms, scrub and grass sway gently' },
  { id: 'strong', label: 'Strong wind', note: 'They bend and toss, and the gusts roll across the board' },
  { id: 'off', label: 'Still', note: 'Nothing moves' }
]
const terrainLookChanged = () => window.dispatchEvent(new Event('terrain-look-changed'))
export function terrainEdges () { return pick(TERRAIN_EDGES, localStorage.getItem(TERRAIN_EDGE_KEY)) }
export function setTerrainEdges (id) {
  if (!TERRAIN_EDGES.some(one => one.id === id)) return
  localStorage.setItem(TERRAIN_EDGE_KEY, id)
  terrainLookChanged()
}
export function coverLines () { return pick(COVER_LINES, localStorage.getItem(COVER_LINE_KEY)) }
export function setCoverLines (id) {
  if (!COVER_LINES.some(one => one.id === id)) return
  localStorage.setItem(COVER_LINE_KEY, id)
  terrainLookChanged()
}
export function wind () { return pick(WINDS, localStorage.getItem(WIND_KEY)) }
export function setWind (id) {
  if (!WINDS.some(one => one.id === id)) return
  localStorage.setItem(WIND_KEY, id)
  terrainLookChanged()
}

// THE UNIT ABOUT TO BE SHOT, ringed in the Shooting phase. On unless switched off in Options.
// THE CINEMATIC ZOOM: the board flies in
// on the firer and his target, or on both sides of an assault, and back out when it is over.
export const CINEMATIC = [
  { id: 'on', label: 'On', note: 'Fly in on each shot and assault, and back out after' },
  { id: 'off', label: 'Off', note: 'The board stays where you left it' }
]
export function cinematicSetting () { return pick(CINEMATIC, localStorage.getItem(CINEMATIC_KEY)) }
export function cinematicOn () { return cinematicSetting() === 'on' }
export function setCinematic (id) {
  if (!CINEMATIC.some(one => one.id === id)) return
  localStorage.setItem(CINEMATIC_KEY, id)
}

export function targetHighlightShown () { return localStorage.getItem(TARGET_KEY) !== 'off' }
export function setTargetHighlight (on) { localStorage.setItem(TARGET_KEY, on ? 'on' : 'off') }

export function ordnanceHitsAllHulls () { return localStorage.getItem(ORDNANCE_HULLS_KEY) === 'on' }
export function setOrdnanceHitsAllHulls (on) { localStorage.setItem(ORDNANCE_HULLS_KEY, on ? 'on' : 'off') }

export function autoCasualtiesOn () { return localStorage.getItem(AUTO_CASUALTIES_KEY) !== 'off' }
export function setAutoCasualties (on) { localStorage.setItem(AUTO_CASUALTIES_KEY, on ? 'on' : 'off') }

export function gunMountsShown () { return pick(GUN_MOUNTS, localStorage.getItem(MOUNT_KEY)) === 'on' }
export function gunMountsSetting () { return pick(GUN_MOUNTS, localStorage.getItem(MOUNT_KEY)) }
export function setGunMounts (id) {
  if (!GUN_MOUNTS.some(one => one.id === id)) return
  localStorage.setItem(MOUNT_KEY, id)
}

export function setGridLines (id) {
  if (!GRID_LINES.some(one => one.id === id)) return
  localStorage.setItem(GRID_KEY, id)
  applyFelt()
}

export function setShotAnimation (id) {
  if (!SHOT_ANIMATIONS.some(one => one.id === id)) return
  localStorage.setItem(SHOT_ANIM_KEY, id)
}

export function setDiceStyle (id) {
  if (!DICE_STYLES.some(one => one.id === id)) return
  localStorage.setItem(DICE_KEY, id)
}

export function setDiceSpeed (id) {
  if (!DICE_SPEEDS.some(one => one.id === id)) return
  localStorage.setItem(DICE_SPEED_KEY, id)
}

export function setDiceHold (id) {
  if (!DICE_HOLDS.some(one => one.id === id)) return
  localStorage.setItem(DICE_HOLD_KEY, id)
}

export function applyPanelEdge () {
  const chosen = panelEdge()
  for (const one of PANEL_EDGES) document.documentElement.classList.toggle(`edge-${one.id}`, one.id === chosen)
}

export function applyFontSet () {
  const chosen = fontSet()
  for (const one of FONT_SETS) document.documentElement.classList.toggle(`font-${one.id}`, one.id === chosen)
}

export function setPanelEdge (id) {
  if (!PANEL_EDGES.some(one => one.id === id)) return
  localStorage.setItem(EDGE_KEY, id)
  applyPanelEdge()
}

export function setFontSet (id) {
  if (!FONT_SETS.some(one => one.id === id)) return
  localStorage.setItem(FONT_KEY, id)
  applyFontSet()
}

// The felt is painted by PixiJS, not by CSS, so this one hands the colours to a listener
// rather than putting a class on <html>. The page hands it the board's setSurface.
let paintFelt = null
export function feltPaintedBy (handler) {
  paintFelt = handler
  applyFelt()
}

export function applyFelt () {
  const chosen = FELTS.find(one => one.id === felt()) ?? FELTS[0]
  paintFelt?.({ id: chosen.id, felt: chosen.felt, grid: chosen.grid, around: chosen.around, showGrid: gridLinesSetting() === 'on' })
}

export function setFelt (id) {
  if (!FELTS.some(one => one.id === id)) return
  localStorage.setItem(FELT_KEY, id)
  applyFelt()
}

// Called once at start-up, before any screen is drawn, so the page never
// flashes the wrong colours.
export function initTheme () {
  applyTheme()
  applyAccent()
  applyChrome()
  applyPanelEdge()
  applyFontSet()
}
