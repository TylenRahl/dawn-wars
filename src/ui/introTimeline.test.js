// The intro's cues and moves (introTimeline.js), checked without a screen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CUES, END, F, netPoint, unfoldAt, shipAt, cameraAt, LAND, CUBE_CENTRE, sceneFade, walkAt, throneAt, CORRIDOR, reelAt, reelsAt, tableAt, REEL_STOPS, flashAt, chosenAt, REELS, FIRST_STOP, shipScreenAt, spaceAt, cubeView } from './introTimeline.js'

const near = (a, b, e = 1e-6) => Math.abs(a - b) < e

test('the cues run in order and end with the song', () => {
  const order = ['cubeFrom', 'unfoldFrom', 'unfolded', 'title', 'shipDrops', 'shipInSlot', 'cruise', 'landingFrom', 'landed', 'walkFrom', 'gate', 'throneFrom', 'goodInPlace', 'ballFrom', 'ballBursts', 'energy', 'reelsIn', 'reelsStop', 'tableFrom', 'clash', 'meet', 'whiteOut', 'flyAgain', 'jets', 'folded', 'jetOff', 'shipGone', 'buttons']
  for (let i = 1; i < order.length; i++) assert.ok(CUES[order[i]] > CUES[order[i - 1]], `${order[i]} after ${order[i - 1]}`)
  assert.ok(END > 147.6, 'the intro outlasts Imperio Antiguo (147.6 s)')
})

test('the set times: unpacked by 9, landed by 51', () => {
  assert.equal(unfoldAt(6.9), 0)
  assert.equal(unfoldAt(CUES.unfolded), 1)
  const s = shipAt(CUES.landed)
  assert.ok(near(s.x, LAND[0], 1e-3) && near(s.y, LAND[1], 1e-3), `at the landing ground: ${s.x}, ${s.y}`)
  assert.equal(s.alt, 0)
  assert.ok(near(cameraAt(CUES.unfolded).pitch, Math.PI / 2), 'looking straight down when it has opened')
})

test('folded, the net is a closed cube of side F round its middle', () => {
  const pts = [[F + 1, 3 * F + 1], [10, 3.5 * F], [3 * F - 10, 3.5 * F], [1.5 * F, 2.5 * F], [1.5 * F, 1.5 * F], [1.5 * F, 0.5 * F]]
  for (const [x, y] of pts) {
    const p = netPoint(x, y, 0)
    const d = Math.max(...p.map((v, i) => Math.abs(v - CUBE_CENTRE[i])))
    assert.ok(near(d, F / 2, 1e-6), `(${x}, ${y}) lies on the cube's surface: ${p}`)
  }
  assert.equal(netPoint(10, 10, 0), null, 'a corner of the 3 by 4 is not a face')
  assert.deepEqual(netPoint(100, 30, 1), [100, 30, 0], 'flat when unfolded')
})

test('the ship flies north, over the sea and into the snow', () => {
  let y = Infinity
  for (let t = CUES.shipInSlot; t <= CUES.landed; t += 0.5) { const s = shipAt(t); assert.ok(s.y <= y + 1e-9); y = s.y }
  const sea = shipAt(27).y
  assert.ok(sea > 2 * F && sea < 3 * F, `over the sea row at 27 s: ${sea}`)
  assert.ok(shipAt(42).y < 2 * F, 'past the sea by 42 s')
})

test('the heroes reach the gate, take their side, and the energy fills the screen at 1:10', () => {
  assert.ok(walkAt(CUES.gate + 0.9).along >= CORRIDOR, 'through the gate')
  assert.equal(sceneFade(CUES.throneFrom + 1).walk, 0)
  assert.equal(sceneFade(CUES.throneFrom + 1).throne, 1)
  const placed = throneAt(CUES.goodInPlace)
  assert.equal(placed.aside, 1); assert.equal(placed.turn, 1)
  assert.ok(throneAt(CUES.energy).ball > 1.3, 'the ball is wider than the screen')
  assert.equal(throneAt(CUES.energy).white, 1)
  assert.ok(throneAt(CUES.ballFrom - 0.1).ball === 0, 'no ball before the king gathers it')
})

test('the eight reels stop alternately, evil then good, from 1:15 to 1:30; the table fills and clashes at 1:40', () => {
  const order = []
  for (let r = 0; r < REELS; r++) for (const side of [0, 1]) order.push(REEL_STOPS[side][r])
  assert.equal(order.length, 8)
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], 'alternately, one at a time')
  assert.ok(near(order[0], 75), 'the first stops at 1:15')
  assert.ok(near(order[7], CUES.reelsStop), 'the last stops at 1:30')
  assert.ok(order[0] > CUES.reelsIn + 3, 'a few seconds of spinning first')
  for (const side of [0, 1]) for (let r = 0; r < REELS; r++) {
    const ts = REEL_STOPS[side][r]
    assert.ok(near(reelAt(ts, r, 40, side), 40), `reel ${side}/${r} on its symbol when it stops`)
    let p = -Infinity
    for (let t = 71; t <= ts; t += 0.05) { const q = reelAt(t, r, 40, side); assert.ok(q >= p - 1e-9, 'never runs backwards before stopping'); p = q }
    const a = reelAt(ts - 1.6 - 1e-6, r, 40, side), b = reelAt(ts - 1.6 + 1e-6, r, 40, side)
    assert.ok(Math.abs(a - b) < 1e-3, 'no jump where the spin meets the slowing')
    assert.equal(flashAt(ts, side, r), 1); assert.equal(flashAt(ts + 0.7, side, r), 0)
  }
  assert.equal(chosenAt(CUES.reelsStop + 0.4, 1), 1)
  assert.equal(reelsAt(80).show, 1)
  assert.equal(reelsAt(CUES.tableFrom + 1).show, 0)
  assert.equal(tableAt(CUES.clash).unit(7), 1, 'every unit on the table before the clash')
  assert.equal(tableAt(CUES.clash).charge, 0)
  assert.equal(tableAt(CUES.meet).charge, 1)
  assert.equal(tableAt(CUES.whiteOut).white, 1)
})

test('folded by 2:16, the ship gone to the right by 2:25, stars only from the fold', () => {
  assert.equal(unfoldAt(CUES.jets), 1, 'the world still flat at 2:00')
  assert.equal(unfoldAt(CUES.folded), 0, 'a cube again at 2:16')
  assert.ok(shipScreenAt(CUES.jetOff).x < 0.01, 'still in the middle at 2:21')
  assert.ok(shipScreenAt(CUES.shipGone).x >= 0.9, 'off the right edge by 2:25')
  assert.equal(spaceAt(5), 0, 'the start is black')
  assert.equal(spaceAt(CUES.folded), 1)
  assert.ok(cubeView(3) && !cubeView(60) && cubeView(CUES.folded))
  assert.ok(cameraAt(CUES.jetOff + 1).dist > cameraAt(CUES.folded).dist * 5, 'the cube flies off into the distance')
})
