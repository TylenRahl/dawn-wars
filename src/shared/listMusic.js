// THE ARMY BUILDER'S MUSIC: a few songs played round and round while the builder is open, each
// at a volume matched to the menu's song. Exports createListMusic({ tracks, lufs, menuLufs, menuVolume }),
// tracksOf(glob), CROSSFADE and a default player for sound_screen/build_list/. src/ui/music.js uses
// createListMusic and tracksOf with this game's own songs.
//
// Coming in, the menu's song sinks to silence while the first track rises over CROSSFADE seconds;
// going out, the reverse. The menu music setting turns this off with the menus' own song.
//
// THE SAME LEVEL AS THE MENU'S SONG. Each track's volume is the menu song's volume scaled by
// the difference in loudness, measured with ffmpeg's ebur128 filter (integrated loudness, LUFS):
// Alien Struggle -16.3, Steady Foundation -15.6, Unresolved Loop -16.2. A track added
// later and not measured plays at the menu's volume as it is. Every track then plays at
// LIST_LEVEL of that matched level (0.6, about 4.4 dB down), a little quieter than the menu.
//
// AFTER THE MENU'S SONG ENDS: start's `after` holds the first track back until the menu's song has
// played out; leaving the builder first cancels the wait.
//
// Decoration. It decides nothing and reads no game state.
import { menuMusicOn } from './theme.js'
import { QUIET_VOLUME } from './menuMusic.js'

const FILES = import.meta.glob('../../sound_screen/build_list/*.mp3', { query: '?url', import: 'default', eager: true })

const MENU_LUFS = -16.3 // Alien Struggle.mp3
const LUFS = { 'Steady Foundation.mp3': -15.6, 'Unresolved Loop.mp3': -16.2 }
export const CROSSFADE = 5 // seconds: "slowly"
const LIST_LEVEL = 0.6

// The tracks of a Vite glob (path -> url), in file-name order.
export function tracksOf (files) {
  return Object.entries(files).sort(([a], [b]) => a.localeCompare(b))
    .map(([path, url]) => ({ name: path.split('/').pop(), url }))
}

// AN ARMY BUILDER'S MUSIC: `tracks` round and round, each at the volume that
// sounds as loud as the menu's song at `menuVolume` (its loudness `menuLufs`, each track's in
// `lufs`), times LIST_LEVEL.
export function createListMusic ({ tracks, lufs = {}, menuLufs, menuVolume }) {
  // The volume that sounds as loud as the menu's song at menuVolume.
  const levelFor = name => {
    const loudness = lufs[name]
    if (loudness === undefined) return menuVolume * LIST_LEVEL
    return Math.min(1, menuVolume * LIST_LEVEL * 10 ** ((menuLufs - loudness) / 20))
  }

  let playing = null // { stop() } while the lists' music is running, or waiting to

  // Starts the music, or leaves it playing if it already is. `after(fn)`, when given, calls fn
  // when the music may start and returns a function that cancels the wait.
  function start ({ after = null } = {}) {
    if (playing) return
    if (!menuMusicOn() || tracks.length === 0 || typeof Audio === 'undefined') return
    let left = false
    let music = null
    let cancelWait = null
    playing = { stop () { left = true; cancelWait?.(); music?.stop() } }
    const go = () => { cancelWait = null; if (!left) music = play() }
    if (after) cancelWait = after(go)
    else go()
  }

  function play () {
    let n = 0
    let first = true
    let ramp = null
    let stopped = false
    const audio = new Audio()

    // squared on the way up and the way down, as every fade in menuMusic.js
    function rampTo (target, seconds, then = null) {
      if (ramp !== null) clearInterval(ramp)
      const from = audio.volume
      const t0 = performance.now()
      ramp = setInterval(() => {
        const f = Math.min(1, (performance.now() - t0) / 1000 / seconds)
        audio.volume = target >= from ? from + (target - from) * f * f : target + (from - target) * (1 - f) * (1 - f)
        if (f >= 1) { clearInterval(ramp); ramp = null; then?.() }
      }, 50)
    }

    function next () {
      if (stopped) return
      const track = tracks[n % tracks.length]
      n++
      audio.src = track.url
      audio.volume = first ? 0 : levelFor(track.name)
      audio.play().then(() => {
        if (first) { first = false; rampTo(levelFor(track.name), CROSSFADE) }
      }).catch(() => setTimeout(next, 1000))
    }
    audio.addEventListener('ended', next)
    next()

    function halt () {
      if (ramp !== null) clearInterval(ramp)
      audio.removeEventListener('ended', next)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }

    return {
      // out over CROSSFADE, under the menu's song coming back
      stop () {
        if (stopped) return
        stopped = true
        if (audio.paused) halt()
        else rampTo(0, CROSSFADE, halt)
      }
    }
  }

  // True when there was music to stop.
  function stop () {
    const was = playing !== null
    playing?.stop()
    playing = null
    return was
  }

  return { start, stop, levelFor }
}

// The default player: sound_screen/build_list/, matched to Alien Struggle at QUIET_VOLUME.
const LIST = createListMusic({ tracks: tracksOf(FILES), lufs: LUFS, menuLufs: MENU_LUFS, menuVolume: QUIET_VOLUME })
export const levelFor = LIST.levelFor
export const startListMusic = LIST.start
export const stopListMusic = LIST.stop
