// THE DICE: the one random source in the game. Never Math.random() anywhere else: a seeded
// game has to replay identically or a surprising Melee Outcome can't be reproduced.
// Exports createRng (the seeded generator), d6, d3, rollDice, sumDice, scatterDie, rollAgainst,
// reroll, scriptedRng (for tests), watchRolls and announceTotal (so the screen can show every roll).
// In this game the rules engine has its own copy (src/rules/dice.js); this one is used by
// shared/battleMusic.js for its shuffle. The dice are described in rules/core/01-the-game-and-the-dice.md.
//
// mulberry32 is a small, fast 32-bit PRNG.

export function createRng (seed) {
  if (!Number.isInteger(seed)) {
    throw new Error(`the random seed must be a whole number, got ${seed}`)
  }
  let a = seed >>> 0
  return function next () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Every roll uses an ordinary six-sided die (a D6). D3 and the Scatter dice below are the
// only other dice the game asks for, and both are derived from a D6.
export function d6 (rng) {
  return Math.floor(rng() * 6) + 1
}

// A SCRIPTED SOURCE for tests and the view's "load the dice" tool: it replaces where the
// numbers come from and nothing else, so every roll is still announced as normal.
// `faces` is a list of D6 faces, 1-6. Each call hands back the middle of that face's
// slot, (face - 0.5) / 6, which d6() reads as exactly that face. Exhausted, it returns
// fallbackRng(), so the game carries on from the seeded stream. `.remaining()` is the
// count of scripted values left.
// Other dice read the same value: d3() is ceil(face / 2), so 1,2 -> 1, 3,4 -> 2, 5,6 -> 3.
// scatterDie() takes one entry as its D6 (5 or 6 = HIT) and, on an arrow,
// a SECOND entry for the angle, rng() * 2 * PI = (face - 0.5) / 6 * 360 degrees, i.e.
// face 1 = 30, 2 = 90, 3 = 150, 4 = 210, 5 = 270, 6 = 330 degrees.
export function scriptedRng (faces, fallbackRng) {
  if (!Array.isArray(faces)) throw new Error('scriptedRng needs a list of D6 faces')
  if (typeof fallbackRng !== 'function') throw new Error('scriptedRng needs a fallback rng')
  faces.forEach((face, i) => {
    if (!Number.isInteger(face) || face < 1 || face > 6) {
      throw new Error(`scripted face must be a whole number 1-6, got ${face} at entry ${i}`)
    }
  })
  const queue = faces.slice()
  let at = 0
  const next = () => (at < queue.length ? (queue[at++] - 0.5) / 6 : fallbackRng())
  next.remaining = () => queue.length - at
  return next
}

// A D3: a D6 halved, rounded up, so 1-2 = 1, 3-4 = 2, 5-6 = 3.
export function d3 (rng) {
  return Math.ceil(d6(rng) / 2)
}

// n dice at once, returned as the individual results — never pre-summed, because
// the to-hit and to-wound rules care about each die, not the total. Rolls that do
// want a total (2D6, 3D6) use sumDice below.
export function rollDice (rng, n) {
  const dice = []
  for (let i = 0; i < n; i++) dice.push(d6(rng))
  return dice
}

// n dice added up: 2D6 gives 2 to 12.
// Used by Leadership and Morale tests, which are 2D6.
export function sumDice (rng, n) {
  const dice = rollDice(rng, n)
  return { dice, total: dice.reduce((a, b) => a + b, 0) }
}

// The Scatter dice, rolled with a D6: 5 or 6 is a HIT, 1 to 4 an arrow (the shot scatters).
// This reports the die, whether it hit and, on an arrow, a direction.
export function scatterDie (rng) {
  const die = d6(rng)
  const hit = die >= 5
  // The real die has four arrow faces and two HIT faces, and the arrow points
  // wherever the die happened to land — there is nothing on the die that picks one
  // of four compass directions. So an arrow face carries a direction taken from the
  // same seeded stream, which is what makes a scatter replay identically.
  const angle = hit ? null : rng() * Math.PI * 2
  return {
    die,
    hit,
    angle,
    direction: hit ? null : { x: Math.cos(angle), y: Math.sin(angle) },
    text: hit ? `scatter dice: HIT` : `scatter dice: arrow at ${(angle * 180 / Math.PI).toFixed(0)} degrees`
  }
}

// A test against a target number, reported so the arithmetic is visible on screen.
//
// `needed` is the number the die must reach. A modified target of 1 or less would
// make every die pass automatically, which no roll in the game is allowed to do, so
// the floor is 2: a natural 1 always fails. The floor is applied here, once, rather
// than in every to-hit and to-wound table that computes a modified target.
//
// Each die is returned as its own record so a re-roll can identify exactly which
// dice it may touch: a die may only ever be re-rolled once, whatever allows the
// re-roll, and a bare count could not enforce that.
export function rollAgainst (rng, n, needed,
  { direction = 'atLeast', label = null, weapon = null, by = null, round = null } = {}) {
  if (!Number.isInteger(needed)) {
    throw new Error(`a roll needs a whole target number, got ${needed}`)
  }
  const target = direction === 'atLeast' ? Math.max(2, needed) : needed
  const dice = rollDice(rng, n).map(value => ({
    value,
    passed: direction === 'atLeast' ? value >= target : value <= target,
    rerolled: false
  }))
  return describe(dice, target, direction, needed, label, weapon, by, round)
}

// Re-roll only the dice the caller names, and only dice that have never been
// re-rolled. The second score always stands, even when it is worse, so the new value
// replaces the old outright.
export function reroll (rng, result, shouldReroll) {
  const dice = result.dice.map(die => {
    if (die.rerolled || !shouldReroll(die)) return die
    const value = d6(rng)
    return {
      value,
      passed: result.direction === 'atLeast' ? value >= result.target : value <= result.target,
      rerolled: true,
      wasValue: die.value
    }
  })
  // A re-roll is the same test again, so it keeps the name the first roll was given,
  // and the weapon that threw it.
  return describe(dice, result.target, result.direction, result.needed, result.label,
    result.weapon, result.by, result.round)
}

// Every result carries the comparison direction and a finished sentence, so the
// log panel prints what the engine decided instead of guessing which way to read
// the number. A 2+ save and a Leadership test read in opposite directions.
function describe (dice, target, direction, needed, label = null, weapon = null,
  by = null, round = null) {
  const passes = dice.filter(die => die.passed).length
  const comparison = direction === 'atLeast' ? `${target}+` : `${target} or under`
  const rolled = dice.map(die => (die.rerolled ? `${die.wasValue}→${die.value}` : `${die.value}`))
  const result = {
    dice,
    target,
    needed,
    direction,
    // WHAT THE ROLL IS FOR, in the rules' own terms: "to hit", "Armour Roll",
    // "Morale check". Rules language, not a caption: re-rolls and Morale checks are
    // named tests, and the board is not the only thing that wants to
    // say which one just happened. Null when a caller has not named it.
    label,
    // WHICH WEAPON THREW THESE DICE, by name: 'crossbow', 'handgun'. A name and nothing
    // else: no colour, no category, no position. What the board makes of it is the
    // board's business.
    // Null for every roll no weapon threw — a Leadership test, a difficult terrain test.
    weapon,
    // WHO THREW THEM: { side, unitId }, or null for a roll that belongs to nobody in
    // particular. Two facts the engine already has, and neither is presentation — what
    // the board does with them is the board's business. It lets a close combat show both
    // sides' dice at once: models at the same Initiative strike at the same time, so
    // their rolls are shown side by side rather than one after another.
    by,
    // WHICH SIMULTANEOUS EXCHANGE this roll belongs to — one number per Initiative step,
    // counted by the caller. Rolls sharing a round happened at the same moment in the
    // fight; null means the roll stands alone, which is every roll outside a close
    // combat.
    round,
    passes,
    failures: dice.length - passes,
    text: `rolled ${rolled.join(', ')} — needed ${comparison} — ${passes} passed, ${dice.length - passes} failed`
  }
  announce(result)
  return result
}

// EVERY ROLL IN THE GAME PASSES THROUGH describe(), so one observer here sees all of
// them and not a single call site has to change. It is handed NUMBERS — the dice, the
// target, the direction, the name of the test — and never a position or a colour, so
// the engine still knows nothing about the view.
//
// Two things it must never do: it must not touch the
// random sequence, because a seeded game has to replay identically whether anything is
// watching or not; and a watcher that throws must not take the roll down with it, because
// a broken animation must never become a broken game.
const watchers = new Set()

export function watchRolls (fn) {
  watchers.add(fn)
  return () => watchers.delete(fn)
}

// A roll that is NOT a per-die test against a target, such as the 2D6 of a Leadership or
// Morale check. They have a total rather than
// a count of passes, so they cannot go through describe(); they are announced by hand,
// in the same shape, so one watcher covers every roll in the game.
// `passedEach` gives each die its own pass or fail, for a throw that is several tests at
// once. `lines` is a
// list of finished sentences, one per result, for the tray to show beside the dice.
export function announceTotal ({ dice, total, needed, passed, label, weapon = null,
  direction = 'atMost', text, by = null, round = null, passedEach = null, lines = null }) {
  announce({
    lines,
    dice: dice.map((value, i) => ({ value, passed: passedEach ? passedEach[i] === true : passed, rerolled: false })),
    target: needed,
    by,
    round,
    needed,
    direction,
    label,
    weapon,
    total,
    passes: passedEach ? passedEach.filter(Boolean).length : passed ? dice.length : 0,
    failures: passedEach ? passedEach.filter(one => !one).length : passed ? 0 : dice.length,
    text
  })
}

function announce (result) {
  for (const watcher of watchers) {
    try {
      watcher(result)
    } catch {
      // Deliberately swallowed. The roll has already been made and is already correct.
    }
  }
}
