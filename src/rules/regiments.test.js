// Regiments and detachments: forming a detachment, deploying it with its regiment, and its support.
// Run with npm test (node:test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LISTS } from './testLists.js'
import { createGame, startBattle } from './game.js'
import { beginTurn } from './turn.js'
import { unitByNames, checkList } from './roster.js'
import { leadershipFor } from './leadership.js'
import { hasRule } from './units.js'
import { supporters, supportOptions, supportingAction, supportChargeTargets, supportingCharge } from './regiments.js'
import { engage } from './charge.js'

const E = 'concord-realm'

test('the list rules: 5 to half the regiment, no command group, two at most, a regiment that can have them', () => {
  const base = DEFAULT_LISTS[0]
  const ok = checkList(base).problems
  assert.deepEqual(ok, [])
  const big = { ...base, points: 3000, units: [...base.units, unitByNames(E, 'march-troops', 20, { key: 'k9' }), unitByNames(E, 'march-missile-troops', 11, { detachmentOf: 'k9' })] }
  assert.ok(checkList(big).problems.some(p => /5 to 10 models/.test(p)))
  const cmd = { ...base, points: 3000, units: [...base.units, unitByNames(E, 'march-troops', 20, { key: 'k9' }), unitByNames(E, 'march-troops', 5, { detachmentOf: 'k9', command: ['Musician'] })] }
  assert.ok(checkList(cmd).problems.some(p => /no command group/.test(p)))
  const three = { ...base, points: 4000, units: [...base.units, unitByNames(E, 'march-troops', 20, { key: 'k9' }), ...[1, 2, 3].map(() => unitByNames(E, 'march-troops', 5, { detachmentOf: 'k9' }))] }
  assert.ok(checkList(three).problems.some(p => /at most two detachments/.test(p)))
  const gs = { ...base, points: 3000, units: [...base.units, unitByNames(E, 'pistoliers', 5, { key: 'k9' }), unitByNames(E, 'march-troops', 5, { detachmentOf: 'k9' })] }
  assert.ok(checkList(gs).problems.some(p => /cannot be accompanied by detachments/.test(p)))
})

const battle = () => {
  const g = createGame({ lists: DEFAULT_LISTS, seed: 7, terrain: false })
  const reg = g.units.find(u => u.entryId === 'march-troops' && u.detachments?.length)
  const det = reg.detachments[0]
  const rukkas = g.units.find(u => u.entryId === 'rukka-mob')
  Object.assign(reg, { placed: true, pos: { x: 36, y: 38 }, facing: -Math.PI / 2 })
  Object.assign(det, { placed: true, pos: { x: 44, y: 38 }, facing: -Math.PI / 2 })
  Object.assign(rukkas, { placed: true, pos: { x: 36, y: 20 }, facing: Math.PI / 2 })
  for (const u of g.units.filter(u => u.isGeneral)) Object.assign(u, { placed: true, pos: { x: 5, y: 47 } })
  startBattle(g, 1); beginTurn(g)
  return { g, reg, det, rukkas }
}

test("a detachment within 3 inches uses its regiment's Leadership and its Stubborn or Hatred", () => {
  const { g, reg, det } = battle()
  assert.match(det.name, /detachment/)
  for (const m of det.models) m.profile = { ...m.profile, Ld: 5 } // so the regiment's 7 is higher
  const near = leadershipFor(g, det)
  assert.equal(near.value, 7)
  assert.match(near.from || '', /Regimental Leadership/)
  reg.special.add('Stubborn')
  assert.equal(hasRule(det, 'Stubborn'), true)
  det.pos = { x: 60, y: 38 }
  assert.equal(hasRule(det, 'Stubborn'), false)
  assert.notEqual(leadershipFor(g, det).from, near.from)
})

test('Supporting Fire stands and shoots; a Supporting Charge goes in at the end of the Charge Moves', async () => {
  const { g, reg, det, rukkas } = battle()
  assert.deepEqual(supporters(g, reg), [det])
  assert.deepEqual(supportOptions(g, det, rukkas), ['fire', 'charge', 'none'])
  await supportingAction(g, det, reg, rukkas, 'fire')
  assert.match(g.log.map(l => l.text).join('\n'), /SUPPORTING FIRE|stands idly by/)
  assert.deepEqual(supporters(g, reg), []) // one Supporting Action a turn
  // a second turn: it declares a Supporting Charge; the Rukkas reach its regiment
  g.round++
  await supportingAction(g, det, reg, rukkas, 'charge')
  rukkas.pos = { x: 36, y: 38 }; rukkas.facing = Math.PI / 2; rukkas.status.charged = true; rukkas.status.declaredCharge = { target: reg.id, arc: 'front' }
  engage(g, rukkas, reg, 'front')
  assert.deepEqual(supportChargeTargets(g, det), [rukkas])
  const r = supportingCharge(g, det, rukkas)
  assert.match(g.log.map(l => l.text).join('\n'), /SUPPORTING CHARGE at Rukka Mob|cannot make its Supporting Charge/)
  assert.ok(r)
})
