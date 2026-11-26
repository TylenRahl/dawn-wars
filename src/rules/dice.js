// The game's only source of randomness: a seeded generator (createRng) and the dice built on it (D6, D3, 2D6,
// artillery and scatter dice, Leadership tests). Never use Math.random() anywhere else: a seeded game must replay
// identically, or a surprising result can't be reproduced. Used by nearly every rules module and the dice strip
// on the battle screen (ui/diceStrip.js, through watchRolls).
// The generator is mulberry32; the algorithm is ours, not part of the rules.

export function createRng (seed) {
  if (!Number.isInteger(seed)) throw new Error(`the random seed must be a whole number, got ${seed}`)
  let a = seed >>> 0
  const next = function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // the state, so a saved game can carry on with the same dice
  next.state = () => a
  next.restore = s => { a = s >>> 0 }
  return next
}

// WATCHING THE DICE, for the dice strip on the battle screen
// (src/ui/diceStrip.js). A watcher is told about each roll AFTER it is made: the faces,
// and the target where the roll knows one. It cannot change a result, and watching draws no
// extra number from the random source, so a seeded game replays the same with or without it.
// A roll made of other rolls (2D6 for Leadership is rollDice is d6) is reported once, whole.
const watchers = new Set()
let depth = 0
export function watchRolls (fn) {
  watchers.add(fn)
  return () => watchers.delete(fn)
}
function report (roll) {
  if (depth > 0) return
  for (const fn of watchers) { try { fn(roll) } catch (e) { console.error(e) } }
}
function whole (make, describe) {
  depth++
  let out
  try { out = make() } finally { depth-- }
  if (watchers.size) report(describe(out))
  return out
}

// D6: the regular six-sided dice.
export function d6 (rng) {
  const v = Math.floor(rng() * 6) + 1
  if (watchers.size) report({ kind: 'd6', dice: [v] })
  return v
}

// D6, "D3": roll a D6 and halve it, rounding up.
export function d3 (rng) {
  return whole(() => Math.ceil(d6(rng) / 2), v => ({ kind: 'd3', dice: [v] }))
}

// One D3 or D6 (a 'D3' is a D6 halved, rounded up).
export const dN = (rng, sides) => sides === 3 ? d3(rng) : d6(rng)
export function rollDice (rng, n) {
  return whole(() => {
    const dice = []
    for (let i = 0; i < n; i++) dice.push(d6(rng))
    return dice
  }, dice => ({ kind: 'd6', dice }))
}

export function sumDice (rng, n) {
  return whole(() => {
    const dice = rollDice(rng, n)
    return { dice, total: dice.reduce((a, b) => a + b, 0) }
  }, r => ({ kind: 'sum', dice: r.dice, total: r.total }))
}

// Artillery and Scatter dice: the Artillery dice is marked 2, 4, 6, 8, 10 and Misfire.
export const ARTILLERY_FACES = [2, 4, 6, 8, 10, 'misfire']
export function artilleryDie (rng) {
  return whole(() => ARTILLERY_FACES[d6(rng) - 1], v => ({ kind: 'artillery', dice: [v] }))
}

// Artillery and Scatter dice: the Scatter dice shows arrows and Hit! faces. The rules do not say how many of each:
// TWO Hit! faces of six is ASSUMED here, as on the usual scatter dice. The arrow
// is taken as any direction, an angle in degrees (0 = straight up the table).
export function scatterDie (rng) {
  return whole(() => {
    const face = d6(rng)
    const hit = face <= 2
    return { face, hit, angle: hit ? null : Math.floor(rng() * 360) }
  }, r => ({ kind: 'scatter', dice: [r.hit ? 'hit' : 'arrow'], angle: r.angle }))
}

// A test against a target number: what was rolled, what was needed, whether it passed.
// "Natural 1 always fails" and "natural 6 always passes" are per-roll rules and are applied by
// the caller that knows which applies (to hit, to wound, saves).
export function rollTarget (rng, n, need) {
  return whole(() => {
    const dice = rollDice(rng, n)
    return { dice, need, passes: dice.filter(d => d >= need).length }
  }, r => ({ kind: 'target', dice: r.dice, need }))
}

// A Leadership test: 2D6, passed on a total at or under the value; a natural 12 always fails
// and a natural 2 always passes.
// Leadership tests
export function testLeadership (rng, ld) {
  return whole(() => {
    const { dice, total } = sumDice(rng, 2)
    return { dice, total, need: ld, passed: total === 2 || (total !== 12 && total <= ld) }
  }, r => ({ kind: 'leadership', dice: r.dice, total: r.total, need: ld, passed: r.passed }))
}
