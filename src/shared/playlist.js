// THE MUSIC'S SHUFFLE. Exports shuffled(), used by shared/battleMusic.js. Kept apart so node can
// test it: that file lists its tracks with a Vite glob, which node cannot read.

// A fresh order of `tracks` (Fisher-Yates with the caller's own generator), never starting
// with `last`, so a new deck never repeats the song the old one ended on.
export function shuffled (tracks, random, last = null) {
  const deck = [...tracks]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  if (deck.length > 1 && deck[0] === last) [deck[0], deck[1]] = [deck[1], deck[0]]
  return deck
}
