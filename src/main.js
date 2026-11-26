// Dawn Wars, Broken Past: the entry script of index.html. Exports nothing; it switches between the menu, the army
// lists, the battle setup and the battle itself, and starts the music and the intro.
// The rules are in src/rules (no rendering); the table is drawn by src/view/board.js.

import { showLists, allLists } from './ui/lists.js'
import { showSetup } from './ui/setup.js'
import { createGame } from './rules/game.js'
import { startBattleScreen } from './ui/battle.js'
import { showTutorial } from './ui/tutorial.js'
import { menuMusic, listsMusic, setupMusic, battleMusic, introSong } from './ui/music.js'
import { playIntro, introWanted } from './ui/intro.js'
import { loadCustomMaps } from './ui/customMapsStore.js'
import { showNewNames } from './ui/shownNames.js'

// every name the player sees in its Dawn Wars form (src/rules/displayNames.js), from the first paint
showNewNames()

// the player's own maps (made in map-editor.html) join the named ones in rules/maps.js MAPS
loadCustomMaps()

const $ = id => document.getElementById(id)
const show = id => { for (const s of ['menu', 'lists', 'setup', 'help', 'battle']) $(s).hidden = s !== id }

// The music follows the screens (ui/music.js): Imperio Antiguo then its Minor on the menu, the
// builder's songs in Army Lists, the battle screen deck on the setup screen, silence in battle.
function menu () {
  show('menu')
  menuMusic()
}
$('m-lists').onclick = () => { show('lists'); listsMusic(); showLists({ onBack: menu }) }
$('m-battle').onclick = () => setup()
// How to Play: the rules in plain words and the buttons that do them (ui/tutorial.js)
$('m-help').onclick = () => { show('help'); showTutorial($('help'), { onBack: menu }) }

// the Battle setup screen (ui/setup.js)
function setup () {
  loadCustomMaps() // (a map saved in the editor in another tab since the page opened)
  show('setup')
  setupMusic()
  showSetup($('setup'), {
    onBack: menu,
    onStart: opts => {
      const game = createGame(opts)
      show('battle')
      battleMusic()
      startBattleScreen(game, { onLeave: menu })
    }
  })
}

// ?battle=default skips the menus: the two default lists, seed 1 (for the headless harness).
// &blue=<army id> / &red=<army id> swaps in that army's built-in list for a side;
// &bluelist=<name> / &redlist=<name> picks that built-in list by its exact name (a test list: harnesses).
const q = new URLSearchParams(location.search)
// no intro will play: the menu (hidden from the first paint by index.html's .ow-intro) is usable at once
if (q.get('battle') === 'default' || !introWanted()) $('menu').classList.remove('dw-intro')
// ?film: the test match video (ui/film.js) drives the page from the menu; no intro
if (q.has('film')) $('menu').classList.remove('dw-intro')
if (q.has('film')) {
  menu()
  import('./ui/film.js').then(m => m.runFilm({ q })).catch(e => { console.error('film', e); window.__filmError = String(e?.stack || e) })
} else if (q.get('battle') === 'default') {
  const lists = allLists()
  // (the tests' fixture lists, rules/testLists.js, loaded only when a harness names one)
  if (q.get('bluelist') || q.get('redlist')) {
    const t = await import('./rules/testLists.js')
    lists.push(...t.DEFAULT_LISTS, ...t.MORE_LISTS)
  }
  const pick = (k, d) => (q.get(k + 'list') && lists.find(l => l.builtIn && l.name === q.get(k + 'list'))) || (q.get(k) && lists.find(l => l.builtIn && l.army === q.get(k))) || d
  const game = createGame({ lists: [pick('blue', lists[0]), pick('red', lists[1])], seed: +(q.get('seed') || 1), terrain: q.get('terrain') !== '0', map: q.get('map') || null, channelling: q.get('channelling') === '1', arcane: q.get('arcane') === '1' })
  show('battle')
  startBattleScreen(game, { onLeave: menu })
} else {
  menu()
  // the intro, every time the page opens, timed to Imperio Antiguo
  if (introWanted()) playIntro($('menu'), { music: introSong() })
}
