// Channelling, the optional rule for the Eight Threads: each Wizard's pool of Channelling dice.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { castSpell, channelSpell, magnifyRange, spellTargets } from './magic.js'
import { effects as spellEffects } from './spells.js'
import { SPELLS } from '../data/spells.js'

test('each Wizard rolls a pool of Channelling dice by its Level, only when the rule is in use', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const g = createGame({ lists: DEFAULT_LISTS, seed, terrain: false, channelling: true })
    for (const w of g.units.filter(u => u.wizard)) {
      const [lo, hi] = { 1: [1, 3], 2: [2, 4], 3: [2, 6], 4: [3, 7] }[w.wizard.level]
      assert.ok(w.wizard.channel >= lo && w.wizard.channel <= hi, `${w.name} L${w.wizard.level}: ${w.wizard.channel}`)
    }
    assert.match(g.log.map(l => l.text).join('\n'), /rolls its Channelling dice/)
  }
  const off = createGame({ lists: DEFAULT_LISTS, seed: 1, terrain: false })
  assert.ok(off.units.filter(u => u.wizard).every(u => u.wizard.channel === 0))
})

test('a Channelling die re-rolls a spell (never into another it knows), and magnifies a range', () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 4, terrain: false, channelling: true })
  const w = g.units.find(u => u.wizard && u.wizard.channel > 0)
  w.wizard.channel = 3
  const before = w.wizard.spells[0]
  assert.equal(channelSpell(g, w, before), true)
  assert.equal(w.wizard.channel, 2)
  assert.equal(new Set(w.wizard.spells).size, w.wizard.spells.length)
  const r = magnifyRange(g, w)
  assert.ok(r >= 1 && r <= 6)
  assert.equal(w.wizard.rangeBonus, r)
  assert.equal(w.wizard.channel, 1)
})

test('a channelled Wizardly dispel rolls three dice and discards the lowest; magnifying reaches further', async () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 6, terrain: false, channelling: true })
  const mage = g.units.find(u => u.entryId === 'master-mage')
  const shaman = g.units.find(u => u.entryId === 'rukka-head-case')
  Object.assign(mage, { placed: true, pos: { x: 36, y: 30 }, facing: -Math.PI / 2 })
  Object.assign(shaman, { placed: true, pos: { x: 36, y: 20 }, facing: Math.PI / 2 })
  startBattle(g, 0); beginTurn(g) // (units not deployed by now are out of the battle)
  shaman.wizard.channel = 3
  const self = mage.wizard.spells.find(x => /self/i.test(SPELLS[x].range)) || mage.wizard.spells[0]
  // cast until something is cast and the dispel question is asked; always choose the channelled dispel
  let asked = null
  for (let i = 0; i < 30 && !asked; i++) {
    mage.wizard.castThisTurn = []; mage.wizard.attempts = 0; mage.wizard.noMoreThisTurn = false
    await castSpell(g, mage, self, mage, async (q, a) => {
      const ch = a.find(([t]) => /channelling: 3D6/.test(t))
      if (ch) { asked = q; return ch[1] }
      return a[a.length - 1][1]
    }, spellEffects)
  }
  assert.ok(asked, 'the channelled dispel was offered')
  assert.match(g.log.map(l => l.text).join('\n'), /discard the lowest/)
  assert.equal(shaman.wizard.channel, 2)
  // out of Dispel range by 3": the magnify choice is offered
  shaman.pos = { x: 36, y: 30 - 18 - 3 - 0.9 }
  let offered = false
  for (let i = 0; i < 30 && !offered; i++) {
    mage.wizard.castThisTurn = []; mage.wizard.attempts = 0; mage.wizard.noMoreThisTurn = false
    await castSpell(g, mage, self, mage, async (q, a) => { if (a.some(([t]) => /magnify its Dispel range/.test(t))) offered = true; return a[a.length - 1][1] }, spellEffects)
  }
  assert.ok(offered)
  // a magnified spell range lets a farther target be chosen
  const s = SPELLS[mage.wizard.spells.find(x => /^\d+"/.test(SPELLS[x].range) && SPELLS[x].category !== 'Enchantment' && SPELLS[x].category !== 'Conveyance') || mage.wizard.spells[0]]
  if (/^\d+"/.test(s.range)) {
    const R = Number(s.range.match(/\d+/)[0])
    shaman.status.engaged = false
    shaman.pos = { x: 36, y: 30 - R - 2 }
    const before = spellTargets(g, mage, s).includes(shaman)
    mage.wizard.rangeBonus = 6
    assert.equal(before, false)
    assert.equal(spellTargets(g, mage, s).includes(shaman), true)
  }
})
