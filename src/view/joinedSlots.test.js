// A joined character drawn in its unit's front rank, the model it displaced at the back (view/joinedSlots.js;
// the rule is in rules/core/08-characters-and-command-groups.md).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fieldUnit, modelSlots } from '../rules/units.js'
import { unitByNames } from '../rules/roster.js'
import { DEFAULT_LISTS } from '../rules/testLists.js'
import { equip } from '../rules/damage.js'
import { join } from '../rules/joining.js'
import { slotsWithJoined } from './joinedSlots.js'

const isCmd = s => ['champion', 'standard', 'musician'].includes(s.model.role)

const E = 'concord-realm'
const setUp = (mount) => {
  const host = fieldUnit(E, DEFAULT_LISTS[0].units.find(u => u.entryId === 'march-troops'), 0)
  equip(host)
  Object.assign(host, { placed: true, pos: { x: 36, y: 40 }, facing: -Math.PI / 2, files: 5 })
  const gen = fieldUnit(E, unitByNames(E, 'general-of-the-realm', 1, mount ? { mount } : {}), 0)
  equip(gen)
  Object.assign(gen, { placed: true, pos: { x: 10, y: 10 }, facing: 0 })
  return { host, gen, game: { units: [host, gen], log: [], listeners: [] } }
}

test('the general stands in the front rank, beside the command, and one trooper goes to the back', () => {
  const { host, gen, game } = setUp()
  const before = modelSlots(host)
  const r = join(game, gen, host, { deploying: true })
  assert.ok(r.ok, r.reason)
  const slots = slotsWithJoined(host)
  assert.equal(slots.length, before.length + 1)
  const g = slots.find(s => s.unit === gen)
  assert.equal(g.rank, 0)
  // the command group keeps its front-rank places
  for (const s of slots.filter(isCmd)) assert.equal(s.rank, 0)
  // next to the command group
  const cmdFiles = slots.filter(isCmd).map(s => s.file)
  assert.ok(Math.min(...cmdFiles.map(f => Math.abs(f - g.file))) === 1, `general at file ${g.file}, command at ${cmdFiles}`)
  // the displaced trooper is in the last rank
  const last = Math.max(...slots.map(s => s.rank))
  const frontTroopersBefore = before.filter(s => s.rank === 0 && !isCmd(s)).map(s => s.model)
  const moved = frontTroopersBefore.find(m => slots.find(s => s.model === m).rank !== 0)
  assert.ok(moved, 'one front trooper moved')
  assert.equal(slots.find(s => s.model === moved).rank, last)
  // no two models on one spot
  const spots = new Set(slots.map(s => `${s.at.x.toFixed(2)},${s.at.y.toFixed(2)}`))
  assert.equal(spots.size, slots.length)
})

test('with nobody joined it is the unit as the rules lay it out', () => {
  const { host } = setUp()
  assert.deepEqual(slotsWithJoined(host).map(s => s.at), modelSlots(host).map(s => s.at))
})
