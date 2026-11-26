// THE GAME'S MUSIC, screen by screen. Exports menuMusic, listsMusic, setupMusic, battleMusic and
// introSong, called by src/main.js as the screens change (introSong's clock times ui/intro.js).
//
// The files are in sound_screen/dawnwars/, one folder per screen, and the players come from
// src/shared (listMusic.js, battleMusic.js):
//   - startscreen/: IMPERIO ANTIGUO plays first, every time the page opens, rising from silence
//     over FADE_IN. When it ends, or when Army Lists is clicked, it gives way to IMPERIO ANTIGUO
//     MINOR, which loops at half the volume. Back on the menu the Minor plays on.
//   - build list/: clicking Army Lists lets the Minor play out to its end, then these tracks loop,
//     matched in loudness, until the builder is left, when the Minor comes back.
//   - battle screen/: the Battle button's setup screen, a shuffled deck. It stops when the battle
//     begins; the battle itself is silent.
//   - battle/: not played.
// The menu music setting (shared/theme.js menuMusicOn) turns these off.
//
// NO SOUND BEFORE A CLICK OR A KEY. A browser refuses a song until the page has been clicked or a
// key pressed; if the song is refused it starts on the first press.
//
// Decoration. It decides nothing and reads no game state.
// The songs are NOT in the repository (see TRACKS.md in each sound_screen folder and CREDITS.md). The two start-screen
// songs are looked up by file name, so the menu is silent until someone puts them back (listed just below).
// SONGS FOR sound_screen/dawnwars/startscreen/ (not in the repository; see TRACKS.md there): file name, music video track, start time
//   Imperio Antiguo.mp3   track 03 (03:03)
//   Imperio AntiguoMinor.mp3   track 04 (06:09)
// (end of the list)
const START = import.meta.glob('../../sound_screen/dawnwars/startscreen/*.mp3', { query: '?url', import: 'default', eager: true })
const named = file => Object.entries(START).find(([path]) => path.endsWith('/' + file))?.[1] ?? null
const mainUrl = named('Imperio Antiguo.mp3')
const minorUrl = named('Imperio AntiguoMinor.mp3')
import { menuMusicOn } from '../shared/theme.js'
import { createListMusic, tracksOf } from '../shared/listMusic.js'
import { createShuffledMusic } from '../shared/battleMusic.js'

// LOUDNESS (ffmpeg ebur128, integrated LUFS): both Imperio Antiguos -15.4, Wandering Path and War
// Council -15.3; the shared players' reference song (Alien Struggle) -16.3. So each plays a little
// under the reference level (0.6, and half of it), to sound as loud.
const MENU_LUFS = -15.4
const MATCH = 10 ** ((-16.3 - MENU_LUFS) / 20)
const VOLUME = 0.6 * MATCH
const QUIET_VOLUME = VOLUME * 0.5
const FADE_IN = 10 // seconds: the first play builds up
const CROSSFADE = 3 // seconds: Imperio Antiguo into the Minor

const LIST = createListMusic({
  // SONGS FOR sound_screen/dawnwars/build list/ (not in the repository; see TRACKS.md there): file name, music video track, start time
  //   Wandering Path.mp3   track 18 (35:33)
  //   War Council.mp3   track 19 (39:15)
  // (end of the list)
  tracks: tracksOf(import.meta.glob('../../sound_screen/dawnwars/build list/*.mp3', { query: '?url', import: 'default', eager: true })),
  lufs: { 'Wandering Path.mp3': -15.3, 'War Council.mp3': -15.3 },
  menuLufs: MENU_LUFS,
  menuVolume: QUIET_VOLUME
})
const SETUP = createShuffledMusic({
  // SONGS FOR sound_screen/dawnwars/battle screen/ (not in the repository; see TRACKS.md there): file name, music video track, start time
  //   Choose Your Hero.mp3   track 20 (41:30)
  //   deadly tournament.mp3   track 21 (42:46)
  //   Fridge Fiasco.mp3   track 22 (44:29)
  //   Sands of Honor.mp3   track 23 (44:48)
  //   Tavern Loop.mp3   track 24 (46:20)
  // (end of the list)
  tracks: Object.values(import.meta.glob('../../sound_screen/dawnwars/battle screen/*.mp3', { query: '?url', import: 'default', eager: true }))
})

// One song: an audio element with a squared fade (the ear hears loudness roughly that way) and,
// if the browser refuses it, a second try on the first press.
function song (url, { loop = false, onEnd = null } = {}) {
  const audio = new Audio(url)
  audio.loop = loop
  audio.volume = 0
  let ramp = null
  let stopped = false
  let then = null
  const retry = () => { removeRetry(); begin() }
  const removeRetry = () => {
    document.removeEventListener('pointerdown', retry)
    document.removeEventListener('keydown', retry)
  }
  let target = 0
  let seconds = CROSSFADE
  function rampTo (level, over, done = null) {
    if (ramp !== null) clearInterval(ramp)
    const from = audio.volume
    const t0 = performance.now()
    ramp = setInterval(() => {
      const f = Math.min(1, (performance.now() - t0) / 1000 / over)
      audio.volume = level >= from ? from + (level - from) * f * f : level + (from - level) * (1 - f) * (1 - f)
      if (f >= 1) { clearInterval(ramp); ramp = null; done?.() }
    }, 50)
  }
  function begin () {
    if (stopped) return
    audio.play().then(() => rampTo(target, seconds)).catch(() => {
      document.addEventListener('pointerdown', retry, { once: true })
      document.addEventListener('keydown', retry, { once: true })
    })
  }
  audio.addEventListener('ended', () => {
    if (stopped) return
    const fn = then ?? onEnd
    then = null
    self.stop()
    fn?.()
  })
  const self = {
    // start at `level`, rising over `over` seconds
    play (level, over) { target = level; seconds = over; begin() },
    level (level, over = CROSSFADE) { target = level; if (!audio.paused) rampTo(level, over) },
    // play on to the end instead of looping, then fn (the builder's wait)
    finishThen (fn) { if (audio.paused || stopped) return false; then = fn; audio.loop = false; return true },
    keepLooping () { then = null; audio.loop = loop },
    fadeOut (over = CROSSFADE) { removeRetry(); rampTo(0, over, () => self.stop()) },
    stop () {
      stopped = true
      removeRetry()
      if (ramp !== null) clearInterval(ramp)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    },
    stopped: () => stopped,
    // the song's own clock, for the intro: null unless it is playing
    time: () => (stopped || audio.paused) ? null : audio.currentTime,
    seek (s) { try { audio.currentTime = s } catch {} }
  }
  return self
}

let main = null   // Imperio Antiguo, its one play since the page opened
let minor = null  // Imperio Antiguo Minor, looping at half
let mainHeard = false
let cancelListWait = null

// The Minor at half, rising over CROSSFADE; Imperio Antiguo, if it is still on, fading out under it.
function toMinor () {
  if (main && !main.stopped()) main.fadeOut(CROSSFADE)
  main = null
  if (!menuMusicOn() || typeof Audio === 'undefined' || !minorUrl) return
  if (minor && !minor.stopped()) { minor.level(QUIET_VOLUME); return }
  minor = song(minorUrl, { loop: true })
  minor.play(QUIET_VOLUME, CROSSFADE)
}

// The menu. The first visit since the page opened: Imperio Antiguo, once through, then the Minor.
// Every later visit (back from the lists, the setup screen or a battle): the Minor.
export function menuMusic () {
  stopSetupMusic()
  leaveListMusic()
  if (!mainHeard && menuMusicOn() && typeof Audio !== 'undefined' && mainUrl) {
    mainHeard = true
    main = song(mainUrl, { onEnd: () => { main = null; toMinor() } })
    main.play(VOLUME, FADE_IN)
    return
  }
  if (!main) toMinor()
}

// IMPERIO ANTIGUO'S CLOCK, for the page's intro (ui/intro.js), which is timed to it: on() whether
// it is meant to play at all, time() its second while it plays, heard() once it has started
// (a browser may refuse it until the first press), seek() to start the intro part-way.
let mainStarted = false
export function introSong () {
  return {
    on: () => menuMusicOn() && typeof Audio !== 'undefined' && !!mainUrl,
    time: () => { const t = main?.time() ?? null; if (t !== null && t > 0) mainStarted = true; return mainStarted ? t : null },
    heard: () => mainStarted,
    seek: s => main?.seek(s)
  }
}

// Army Lists: Imperio Antiguo gives way to the Minor, which plays out, then the builder's songs.
export function listsMusic () {
  stopSetupMusic()
  toMinor()
  // (a Minor the browser has not let start yet is stopped too, or the first press would start it under the builder's songs)
  const go = () => { cancelListWait = null; minor?.stop(); minor = null; LIST.start() }
  if (minor && !minor.stopped() && minor.finishThen(go)) {
    const mine = minor
    cancelListWait = () => mine.keepLooping()
  } else go()
}

// Out of the builder: its songs fade while the Minor comes back up.
function leaveListMusic () {
  cancelListWait?.()
  cancelListWait = null
  LIST.stop()
}

// The Battle button's setup screen: the menu's songs stop and the battle screen deck plays.
export function setupMusic () {
  leaveListMusic()
  stopMenuSongs()
  SETUP.start()
}

function stopSetupMusic () { SETUP.stop() }

function stopMenuSongs () {
  main?.stop(); main = null
  minor?.stop(); minor = null
}

// The battle: silence.
export function battleMusic () {
  leaveListMusic()
  stopMenuSongs()
  stopSetupMusic()
}
