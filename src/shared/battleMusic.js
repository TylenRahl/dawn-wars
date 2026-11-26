// MUSIC AS A SHUFFLED LOOP. Exports createShuffledMusic({ tracks, volume }), which src/ui/music.js uses for
// the battle setup screen, and startBattleMusic / stopBattleMusic for the tracks in sound_screen/battle screen/.
//
// Every .mp3 in sound_screen/battle screen/ is picked up by the glob below, so a track
// dropped into that folder joins the loop at the next build or dev reload with no code change.
//
// THE ORDER IS A SHUFFLED DECK, not a dice roll per track: every track plays once before any
// plays again, and a new deck never starts with the track the last one ended on, so the same
// song is never heard twice in a row. The shuffle uses its OWN generator (createRng seeded
// from the clock), never the game's seeded source: which song plays next must not move a
// single die.
//
// WHERE IT PLAYS: on the choose-a-battle screen, stopping when the battle begins or the menu's song
// takes over. The first track rises from silence over a few seconds, the way the menu's does.
// The battle music setting (theme.js battleMusicOn) turns it off.
//
// Decoration. It decides nothing and reads no game state.
import { createRng } from './dice.js'
import { battleMusicOn } from './theme.js'
import { shuffled } from './playlist.js'

const TRACKS = Object.values(import.meta.glob('../../sound_screen/battle screen/*.mp3', { query: '?url', import: 'default', eager: true }))
export const VOLUME = 0.3
const FADE_IN = 4 // seconds for the first track to rise from silence

// A CHOOSE-A-BATTLE SCREEN'S MUSIC: `tracks` (urls) as a shuffled deck at `volume`.
export function createShuffledMusic ({ tracks, volume = VOLUME }) {
  let playing = null // { audio, stop() } while the music is running

  // Starts the music, or leaves it playing if it already is (coming back to the choose-a-battle
  // screen from a battle's setup keeps the song it had).
  function start () {
    if (playing) return
    if (!battleMusicOn() || tracks.length === 0 || typeof Audio === 'undefined') return
    const random = createRng(Date.now() % 2147483647)
    let deck = []
    let last = null
    let first = true
    let fade = null
    let stopped = false
    const audio = new Audio()

    function next () {
      if (stopped) return
      if (deck.length === 0) deck = shuffled(tracks, random, last)
      last = deck.shift()
      audio.src = last
      audio.volume = first ? 0 : volume
      audio.play().then(() => {
        if (!first) return
        first = false
        // squared, as the menu's: a straight line in volume sounds like it arrives at once
        fade = setInterval(() => {
          const f = Math.min(1, audio.currentTime / FADE_IN)
          audio.volume = volume * f * f
          if (f >= 1) { clearInterval(fade); fade = null }
        }, 50)
      }).catch(() => {
        // Refused (no click on the page yet, or a file that will not play): try the next
        // track rather than fall silent for good.
        setTimeout(next, 1000)
      })
    }
    audio.addEventListener('ended', next)
    next()

    playing = {
      audio,
      stop () {
        stopped = true
        if (fade !== null) clearInterval(fade)
        audio.removeEventListener('ended', next)
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }
    }
  }

  function stop () {
    playing?.stop()
    playing = null
  }

  return { start, stop }
}

// The default deck: sound_screen/battle screen/.
const BATTLE = createShuffledMusic({ tracks: TRACKS })
export const startBattleMusic = BATTLE.start
export const stopBattleMusic = BATTLE.stop
