// Bound spells carried in magic items: they are offered, cast and dispelled like other spells.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { boundCastable, castBound, castable } from './magic.js'
import { effects as spellEffects } from './spells.js'

const E = 'concord-realm'
const game = (items, seed = 3) => {
  const lists = DEFAULT_LISTS.map(l => l.army !== E ? l : { ...l, units: l.units.map(u => u.entryId === 'general-of-the-realm' ? { ...u, items } : u) })
  const g = createGame({ lists, seed, terrain: false })
  const gen = g.units.find(u => u.entryId === 'general-of-the-realm')
  const rukkas = g.units.find(u => u.entryId === 'rukka-mob')
  Object.assign(gen, { placed: true, pos: { x: 36, y: 30 }, facing: -Math.PI / 2 })
  Object.assign(rukkas, { placed: true, pos: { x: 36, y: 14 }, facing: Math.PI / 2 })
  startBattle(g, 0); beginTurn(g)
  return { g, gen, rukkas }
}

test('a Bound spell: 2D6 + Power Level, in its phase, once a phase, without making its bearer a Wizard', async () => {
  const { g, gen, rukkas } = game(['ruby-ring-of-ruin'])
  assert.equal(castable(g, gen).length, 0)
  g.sub = 'conjuration'
  assert.equal(boundCastable(g, gen).length, 0) // Fireball is a Magic Missile: the Shooting phase
  g.sub = 'shoot'
  const [b] = boundCastable(g, gen)
  assert.equal(b.slug, 'fireball')
  assert.equal(b.power, 1)
  await castBound(g, gen, b, rukkas, async (q, a) => a[a.length - 1][1], spellEffects)
  assert.match(g.log.map(l => l.text).join('\n'), /from its Ruby Ring of Ruin \(Bound spell, casting value 8\+, at Rukka Mob\): Casting roll \d\+\d \+ 1 \(Power Level\) = \d+/)
  assert.equal(boundCastable(g, gen).length, 0) // one a phase
})

test('the Ring of Tarn is single use; the Ring of Doom may cost Toughness', async () => {
  const { g, gen } = game(['ring-of-tarn'])
  g.sub = 'conjuration'
  const [b] = boundCastable(g, gen)
  assert.equal(b.slug, 'oaken-shield')
  await castBound(g, gen, b, gen, async (q, a) => a[a.length - 1][1], spellEffects)
  g.sub = 'shoot'; g.sub = 'conjuration'; gen.status.boundPhase = null
  assert.equal(boundCastable(g, gen).length, 0)
  let lost = false
  for (let seed = 1; seed <= 25 && !lost; seed++) {
    const { g: g2, gen: c, rukkas } = game(['ring-of-doom'], seed)
    g2.sub = 'shoot'
    const [d] = boundCastable(g2, c)
    const T = c.models[0].profile.T
    const r = await castBound(g2, c, d, rukkas, async (q, a) => a[a.length - 1][1], spellEffects)
    if (r.cast && c.models[0].profile.T === T - 1) lost = true
  }
  assert.ok(lost, 'no seed cost the bearer Toughness')
})

test('Magic Resistance on the target lowers a Bound spell too', async () => {
  const { g, gen, rukkas } = game(['ruby-ring-of-ruin'])
  rukkas.special.add('Magic Resistance (-2)')
  g.sub = 'shoot'
  const [b] = boundCastable(g, gen)
  await castBound(g, gen, b, rukkas, async (q, a) => a[a.length - 1][1], spellEffects)
  assert.match(g.log.map(l => l.text).join('\n'), /\+ 1 \(Power Level\) - 2 Magic Resistance = /)
})
